'use client';

import { useCallback, useEffect, useState } from 'react';

const RANK = { view_only: 0, data_entry: 1, module_manager: 2, super_admin: 3 };

async function api(op, payload) {
  const r = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, payload }),
  });
  const text = await r.text();
  let j;
  try { j = JSON.parse(text); } catch {
    throw new Error(`Server returned ${r.status} with no readable response.`);
  }
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j.data;
}

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const DONATE_BASE = 'https://donate.iskconchennai.org';

export default function TeamClient({ role }) {
  const rank = RANK[role] ?? 0;
  const [tab, setTab] = useState('staff');
  const [d, setD] = useState(null);
  const [unmapped, setUnmapped] = useState([]);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [edit, setEdit] = useState(null);

  const say = (t) => { setToast(t); setTimeout(() => setToast(''), 2600); };

  const load = useCallback(async () => {
    try {
      setD(await api('team.list'));
      setUnmapped((await api('team.unmapped')).rows);
    } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function copyLink(code) {
    navigator.clipboard?.writeText(`${DONATE_BASE}/?ref=${code}`);
    say('Link copied');
  }

  return (
    <div className="content">
      <div className="head">
        <div>
          <h1>Team</h1>
          <p className="lede">
            Preachers and volunteers, their Zoho ids, and their referral links.
          </p>
        </div>
        {rank >= 2 && (
          <div className="headctl">
            <button onClick={() => setEdit({ kind: 'staff', is_active: true })}>+ Preacher</button>
            <button className="p" onClick={() => setEdit({ kind: 'volunteer', is_active: true })}>+ Volunteer</button>
          </div>
        )}
      </div>

      {err && <div className="errbox">{err}</div>}
      {toast && <div id="msg">{toast}</div>}

      <div className="warnbox">
        <b>The Zoho id is what matters.</b> Employee and Volunteer are lookup fields in Zoho Creator —
        the webhook sends the id, not the name. A record without an id reaches Zoho blank.
      </div>

      {unmapped.length > 0 && (
        <div className="dupbox">
          <b>{unmapped.length} name{unmapped.length === 1 ? '' : 's'} in donations match no record here</b>
          {unmapped.map((u, i) => (
            <div key={i}>{u.kind}: “{u.name}” — {u.donations} donation{u.donations === 1 ? '' : 's'}</div>
          ))}
          <div style={{ marginTop: 5 }}>
            These are reaching Zoho empty. Add them below, or correct the spelling on the donations.
          </div>
        </div>
      )}

      <nav className="tabs">
        <button className={'tab' + (tab === 'staff' ? ' on' : '')} onClick={() => setTab('staff')}>
          Preachers &amp; employees {d && `(${d.staff.length})`}
        </button>
        <button className={'tab' + (tab === 'vol' ? ' on' : '')} onClick={() => setTab('vol')}>
          Volunteers {d && `(${d.volunteers.length})`}
        </button>
      </nav>

      {!d ? <p className="dim">Loading…</p> : tab === 'staff' ? (
        <table className="mini">
          <thead>
            <tr><th>Name</th><th>Zoho id</th><th>Referral link</th><th>Contact</th>
              <th className="num">Volunteers</th><th className="num">Gifts</th><th className="num">Raised</th><th /></tr>
          </thead>
          <tbody>
            {d.staff.map((s) => (
              <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.5 }}>
                <td><b>{s.name}</b>{!s.is_active && <span className="pill r">inactive</span>}</td>
                <td className="dim">{s.zoho_id}</td>
                <td>
                  {s.ref_code
                    ? <button onClick={() => copyLink(s.ref_code)} title={`${DONATE_BASE}/?ref=${s.ref_code}`}>?ref={s.ref_code}</button>
                    : <span className="dim">—</span>}
                </td>
                <td className="dim">{s.phone || s.email || '—'}</td>
                <td className="num">{s.volunteers}</td>
                <td className="num">{s.gifts}</td>
                <td className="num">{inr(s.raised)}</td>
                <td>{rank >= 2 && <button onClick={() => setEdit({ ...s, kind: 'staff' })}>Edit</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="mini">
          <thead>
            <tr><th>Name</th><th>Zoho id</th><th>Reports to</th><th>Referral link</th>
              <th>Contact</th><th className="num">Gifts</th><th className="num">Raised</th><th /></tr>
          </thead>
          <tbody>
            {d.volunteers.map((v) => (
              <tr key={v.id} style={{ opacity: v.is_active ? 1 : 0.5 }}>
                <td>
                  <b>{v.name}</b>
                  {v.is_system && <span className="pill">system</span>}
                  {!v.is_active && <span className="pill r">inactive</span>}
                </td>
                <td className="dim">{v.zoho_id}</td>
                <td>{v.employee_name || <span className="dim">—</span>}</td>
                <td>
                  {v.ref_code
                    ? <button onClick={() => copyLink(v.ref_code)} title={`${DONATE_BASE}/?ref=${v.ref_code}`}>?ref={v.ref_code}</button>
                    : <span className="dim">—</span>}
                </td>
                <td className="dim">{v.phone || v.email || '—'}</td>
                <td className="num">{v.gifts}</td>
                <td className="num">{inr(v.raised)}</td>
                <td>{rank >= 2 && <button onClick={() => setEdit({ ...v, kind: 'volunteer' })}>Edit</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {edit && (
        <EditDialog
          rec={edit} staff={d?.staff || []}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); say('Saved'); load(); }}
          onErr={setErr}
        />
      )}
    </div>
  );
}

function EditDialog({ rec, staff, onClose, onSaved, onErr }) {
  const isVol = rec.kind === 'volunteer';
  const [f, setF] = useState(rec);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({
    ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));

  async function save() {
    setBusy(true);
    try {
      await api(isVol ? 'team.saveVolunteer' : 'team.saveStaff', { data: f });
      onSaved();
    } catch (e) { onErr(e.message); setBusy(false); }
  }

  return (
    <div className="mask" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dlg">
        <h3>{rec.id ? `Edit ${rec.name}` : isVol ? 'New volunteer' : 'New preacher / employee'}</h3>
        <div className="bd">
          <div className="g2">
            <div className="fg"><label>Name *</label><input value={f.name || ''} onChange={set('name')} /></div>
            <div className="fg">
              <label>Zoho record id *</label>
              <input value={f.zoho_id || ''} onChange={set('zoho_id')} placeholder="251028000000942014" />
            </div>
          </div>
          <p className="hint">
            Copy the id from the Zoho Creator record. Without it the webhook cannot fill
            {isVol ? ' Volunteer_Name' : ' Employee_Name'} and that field arrives empty.
          </p>

          <div className="g2">
            <div className="fg"><label>Email</label><input value={f.email || ''} onChange={set('email')} /></div>
            <div className="fg"><label>Phone</label><input value={f.phone || ''} onChange={set('phone')} /></div>
          </div>

          <div className="fg">
            <label>Referral code</label>
            <input value={f.ref_code || ''} onChange={set('ref_code')} placeholder="arun" />
          </div>
          <p className="hint">
            Used in <code>{DONATE_BASE}/?ref=CODE</code>. Lowercase letters, numbers and hyphens.
            A donor who gives through this link is mapped to this person permanently, on their first
            donation only.
          </p>

          {isVol && (
            <div className="fg">
              <label>Reports to</label>
              <select value={f.employee_id || ''} onChange={set('employee_id')}>
                <option value="">— none —</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div className="fg"><label>Notes</label><input value={f.notes || ''} onChange={set('notes')} /></div>

          <div className="tagpick">
            <label><input type="checkbox" checked={f.is_active !== false} onChange={set('is_active')} /> Active</label>
            {isVol && (
              <label>
                <input type="checkbox" checked={!!f.is_system} onChange={set('is_system')} /> System account (not a person)
              </label>
            )}
          </div>
          {isVol && (
            <p className="hint">
              Tick “system account” for automated senders like WA Sys or StudyGita Emailer, so
              volunteer reports don&apos;t count robots as devotees.
            </p>
          )}
        </div>
        <div className="ft">
          <button onClick={onClose}>Cancel</button>
          <button className="p" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
