'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const RANK = { view_only: 0, data_entry: 1, module_manager: 2, super_admin: 3 };
const ROLE_LABEL = {
  super_admin: 'Super admin', module_manager: 'Module manager',
  data_entry: 'Data entry', view_only: 'View only',
};

async function api(op, payload) {
  const r = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, payload }),
  });
  const j = await r.json().catch(() => ({ error: 'Bad response from server' }));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j.data;
}

const PERSON_COLS = [
  { k: 'person_no', t: 'ID', ro: 1, w: 'num' },
  { k: 'full_name', t: 'Full name' },
  { k: 'initiated_name', t: 'Initiated name' },
  { k: 'gender', t: 'Sex', opt: ['', 'M', 'F', 'O'] },
  { k: 'dob', t: 'DOB', type: 'date' },
  { k: 'mobile_cc', t: 'CC' },
  { k: 'mobile_number', t: 'Mobile' },
  { k: 'email', t: 'Email' },
  { k: 'area', t: 'Area' },
  { k: 'city', t: 'City' },
  { k: 'pincode', t: 'Pincode' },
  { k: 'preferred_language', t: 'Lang' },
  { k: 'pan', t: 'PAN' },
  { k: 'profession', t: 'Profession' },
  { k: 'tags', t: 'Categories', ro: 1 },
  { k: 'shares_mobile_with', t: 'Dup', ro: 1, w: 'num' },
  { k: 'is_active', t: 'Active', type: 'bool' },
];

const DON_COLS = [
  { k: 'id', t: 'ID', ro: 1, w: 'num' },
  { k: 'donated_on', t: 'Date', type: 'date' },
  { k: 'person_no', t: 'Donor ID', ro: 1, w: 'num' },
  { k: 'donor', t: 'Donor', ro: 1 },
  { k: 'amount', t: 'Amount', w: 'num', type: 'num' },
  { k: 'seva_category_id', t: 'Seva', type: 'ref' },
  { k: 'payment_mode', t: 'Mode', opt: ['', 'cash', 'upi', 'card', 'netbanking', 'cheque', 'dd', 'bank_transfer', 'other'] },
  { k: 'gateway', t: 'Gateway', opt: ['', 'payu', 'razorpay', 'offline', 'other'] },
  { k: 'receipt_no', t: 'Receipt' },
  { k: 'is_80g', t: '80G', type: 'bool' },
  { k: 'collected_by', t: 'Collected by' },
  { k: 'notes', t: 'Notes' },
];

const IMPORT_COLS = [
  'full_name', 'initiated_name', 'gender', 'dob', 'mobile_cc', 'mobile_number', 'email',
  'address_line', 'area', 'city', 'state', 'pincode', 'country', 'pan',
  'preferred_language', 'profession', 'education', 'organization', 'marital_status', 'notes',
];

function parseCSV(text) {
  const out = []; let row = []; let cur = ''; let inq = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inq) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inq = false; }
      else cur += c;
    } else if (c === '"') inq = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); out.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); out.push(row); }
  return out.filter((r) => r.some((x) => String(x).trim() !== ''));
}

export default function Dashboard({ user }) {
  const rank = RANK[user.role] ?? 0;
  const [meta, setMeta] = useState({ tags: [], seva: [], counts: {}, outposts: [] });
  const [state, setState] = useState({
    view: 'people', tag: null, title: 'All People',
    search: '', city: '', area: '', gender: '', active: '',
    from: '', to: '', seva: '', sort: 'person_no', dir: 'ASC', limit: 200,
  });
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState([]);
  const [sel, setSel] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const [batches, setBatches] = useState([]);
  const [edit, setEdit] = useState(null); // {id, key}
  const toastT = useRef();

  const say = useCallback((text, isErr) => {
    clearTimeout(toastT.current);
    setToast({ text, isErr });
    toastT.current = setTimeout(() => setToast(null), isErr ? 5200 : 2600);
  }, []);

  const loadMeta = useCallback(async () => {
    try { setMeta(await api('meta')); } catch (e) { setError(e.message); }
  }, []);

  const load = useCallback(async (s) => {
    setLoading(true); setError('');
    try {
      if (s.view === 'batches') {
        const d = await api('batches.list');
        setBatches(d.rows);
        setStats([['Batches', d.rows.length],
          ['Rows still present', d.rows.reduce((a, x) => a + Number(x.still_present || 0), 0)]]);
        setRows([]);
      } else if (s.view === 'donations') {
        const d = await api('donations.list', {
          filter: { search: s.search, from: s.from, to: s.to, seva: s.seva }, limit: s.limit,
        });
        setRows(d.rows);
        const t = d.stats;
        setStats([['Donations', t.n], ['Total', '₹' + Number(t.total).toLocaleString('en-IN')],
          ['Average', '₹' + Math.round(t.avg).toLocaleString('en-IN')], ['Distinct donors', t.donors]]);
      } else {
        const d = await api('people.list', {
          filter: {
            view: s.view, tag: s.tag, search: s.search, city: s.city,
            area: s.area, gender: s.gender, active: s.active,
          },
          sort: s.sort, dir: s.dir, limit: s.limit,
        });
        setRows(d.rows);
        const t = d.stats;
        setStats([['Matching', t.n], ['Active', t.act], ['With mobile', t.wm],
          ['With email', t.we], ['Shown', d.rows.length]]);
      }
    } catch (e) { setError(e.message); setRows([]); }
    setLoading(false);
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => {
    const t = setTimeout(() => load(state), state.search ? 320 : 0);
    return () => clearTimeout(t);
  }, [state, load]);

  const go = (patch) => setState((s) => ({ ...s, ...patch }));
  const pickCat = (view, tag, title) => { setSel(new Set()); go({ view, tag, title }); };

  async function saveCell(row, col, value) {
    const table = state.view === 'donations' ? 'donations' : 'people';
    try {
      await api(`${table}.update`, { id: row.id, field: col.k, value });
      setRows((rs) => rs.map((r) => (r.id === row.id
        ? { ...r, [col.k]: col.type === 'bool' ? value === 'true' : (value === '' ? null : value) }
        : r)));
      say('Saved');
      if (['mobile_number', 'mobile_cc', 'full_name', 'initiated_name'].includes(col.k)) load(state);
    } catch (e) { say(e.message, true); }
    setEdit(null);
  }

  function exportCSV() {
    if (!rows.length) return say('Nothing to export', true);
    const cols = state.view === 'donations' ? DON_COLS : PERSON_COLS;
    const keys = cols.map((c) => c.k);
    const cell = (v) => {
      if (v == null) return '';
      let s = Array.isArray(v) ? v.join('; ') : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [keys.join(',')].concat(rows.map((r) => keys.map((k) => cell(r[k])).join(','))).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `${state.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    say(`Exported ${rows.length} rows`);
  }

  const cols = state.view === 'donations' ? DON_COLS : PERSON_COLS;
  const sevaName = (id) => (meta.seva.find((s) => String(s.id) === String(id)) || {}).name || '';

  const byCat = {};
  meta.tags.forEach((t) => { (byCat[t.cat] = byCat[t.cat] || []).push(t); });

  const CatBtn = ({ view, tag, label, n }) => (
    <button
      className={'cat' + (state.view === view && (state.tag || null) === (tag || null) ? ' on' : '')}
      onClick={() => pickCat(view, tag, label)}
    >
      <span>{label}</span><span className="n">{n ?? ''}</span>
    </button>
  );

  return (
    <div className="shell">
      <div id="side">
        <div id="brand"><h1>ISKCON Chennai DRM</h1><p>Chaitanya Nitai Desh</p></div>
        <div id="cats">
          <div className="grp">Records</div>
          <CatBtn view="people" tag={null} label="All People" n={meta.counts.people} />
          <CatBtn view="donations" tag={null} label="Donations" n={meta.counts.dons} />
          <CatBtn view="donors" tag={null} label="Donors" n={meta.counts.donors} />
          {Object.keys(byCat).sort().map((c) => (
            <div key={c}>
              <div className="grp">{c}</div>
              {byCat[c].map((t) => (
                <CatBtn key={t.slug} view="people" tag={t.slug} label={t.name} n={t.n} />
              ))}
            </div>
          ))}
          <div className="grp">Data quality</div>
          <CatBtn view="dups" tag={null} label="Shared mobiles" n={meta.counts.dups} />
          <CatBtn view="untagged" tag={null} label="Uncategorised" n={meta.counts.untagged} />
          {rank >= 2 && <CatBtn view="batches" tag={null} label="Import batches" />}
        </div>
        <div id="who">
          <div style={{ flex: 1 }}>
            <b>{user.name}</b>{ROLE_LABEL[user.role]}
          </div>
          <button
            style={{ padding: '4px 9px', fontSize: 12 }}
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
          >Sign out</button>
        </div>
      </div>

      <div id="main">
        <div id="top">
          <h2>{state.title}</h2>
          <span className="sub">
            {loading ? 'Loading…' : (state.view === 'batches'
              ? `${batches.length} batches`
              : `${rows.length}${rows.length >= state.limit ? '+' : ''} rows`)}
          </span>
          <span className="sp" />
          {rank >= 1 && state.view !== 'batches' && (
            <button onClick={() => setDialog(state.view === 'donations' ? 'donation' : 'person')}>+ Add</button>
          )}
          {rank >= 2 && state.view !== 'donations' && state.view !== 'batches' && (
            <button onClick={() => (sel.size ? setDialog('tag') : say('Select rows first', true))}>
              Tag selected{sel.size ? ` (${sel.size})` : ''}
            </button>
          )}
          {rank >= 2 && state.view !== 'donations' && state.view !== 'batches' && (
            <button onClick={() => setDialog('import')}>Import</button>
          )}
          {rank >= 2 && <button onClick={exportCSV}>Export CSV</button>}
          <button className="p" onClick={() => { loadMeta(); load(state); }}>Reload</button>
        </div>

        {state.view !== 'batches' && (
          <div id="filters">
            <input
              className="q" placeholder="Search name, mobile, email, ID…"
              value={state.search} onChange={(e) => go({ search: e.target.value })}
            />
            {state.view === 'donations' ? (
              <>
                <input type="date" value={state.from} onChange={(e) => go({ from: e.target.value })} />
                <input type="date" value={state.to} onChange={(e) => go({ to: e.target.value })} />
                <select value={state.seva} onChange={(e) => go({ seva: e.target.value })}>
                  <option value="">All seva</option>
                  {meta.seva.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </>
            ) : (
              <>
                <input placeholder="City" value={state.city} onChange={(e) => go({ city: e.target.value })} />
                <input placeholder="Area" value={state.area} onChange={(e) => go({ area: e.target.value })} />
                <select value={state.gender} onChange={(e) => go({ gender: e.target.value })}>
                  <option value="">Any sex</option><option value="M">Male</option>
                  <option value="F">Female</option><option value="O">Other</option>
                </select>
                <select value={state.active} onChange={(e) => go({ active: e.target.value })}>
                  <option value="">All</option><option value="y">Active</option><option value="n">Inactive</option>
                </select>
              </>
            )}
            <select value={state.limit} onChange={(e) => go({ limit: +e.target.value })}>
              <option value={200}>200 rows</option><option value={1000}>1000 rows</option>
              <option value={5000}>5000 rows</option>
            </select>
            <button onClick={() => go({ search: '', city: '', area: '', gender: '', active: '', from: '', to: '', seva: '' })}>
              Clear
            </button>
          </div>
        )}

        <div id="stats">
          {stats.map((s, i) => (
            <div className="st" key={i}><b>{s[1] ?? 0}</b><span>{s[0]}</span></div>
          ))}
        </div>

        <div id="wrap">
          {error && <div className="empty" style={{ color: 'var(--dang)' }}>{error}</div>}
          {!error && loading && <div className="empty">Loading…</div>}

          {!error && !loading && state.view === 'batches' && (
            <BatchTable batches={batches} rank={rank} onUndo={(b) => setDialog({ kind: 'undo', batch: b })} />
          )}

          {!error && !loading && state.view !== 'batches' && (
            rows.length === 0
              ? <div className="empty">No records match.</div>
              : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 34 }}>
                        <input
                          type="checkbox" style={{ width: 'auto' }}
                          checked={rows.length > 0 && rows.every((r) => sel.has(String(r.id)))}
                          onChange={(e) => setSel(e.target.checked
                            ? new Set(rows.map((r) => String(r.id))) : new Set())}
                        />
                      </th>
                      {cols.map((c) => (
                        <th
                          key={c.k}
                          style={{ cursor: state.view !== 'donations' ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (state.view === 'donations') return;
                            go({ sort: c.k, dir: state.sort === c.k && state.dir === 'ASC' ? 'DESC' : 'ASC' });
                          }}
                        >{c.t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox" style={{ width: 'auto' }}
                            checked={sel.has(String(r.id))}
                            onChange={(e) => setSel((s) => {
                              const n = new Set(s);
                              e.target.checked ? n.add(String(r.id)) : n.delete(String(r.id));
                              return n;
                            })}
                          />
                        </td>
                        {cols.map((c) => (
                          <Cell
                            key={c.k} row={r} col={c} sevaName={sevaName} seva={meta.seva}
                            editable={!c.ro && rank >= 1}
                            editing={edit && edit.id === r.id && edit.key === c.k}
                            onStart={() => setEdit({ id: r.id, key: c.k })}
                            onCancel={() => setEdit(null)}
                            onSave={(v) => saveCell(r, c, v)}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          )}
        </div>
      </div>

      {toast && <div id="msg" className={toast.isErr ? 'err' : ''}>{toast.text}</div>}

      {dialog === 'person' && (
        <PersonDialog
          meta={meta} presetTag={state.tag}
          onClose={() => setDialog(null)}
          onDone={(msg) => { setDialog(null); say(msg); loadMeta(); load(state); }}
        />
      )}
      {dialog === 'donation' && (
        <DonationDialog
          meta={meta}
          onClose={() => setDialog(null)}
          onDone={(msg) => { setDialog(null); say(msg); loadMeta(); load(state); }}
        />
      )}
      {dialog === 'tag' && (
        <TagDialog
          meta={meta} ids={[...sel]}
          onClose={() => setDialog(null)}
          onDone={(msg) => { setDialog(null); setSel(new Set()); say(msg); loadMeta(); load(state); }}
        />
      )}
      {dialog === 'import' && (
        <ImportDialog
          meta={meta} presetTag={state.tag}
          onClose={() => setDialog(null)}
          onDone={(msg) => { setDialog(null); say(msg); loadMeta(); load(state); }}
        />
      )}
      {dialog && dialog.kind === 'undo' && (
        <UndoDialog
          batch={dialog.batch}
          onClose={() => setDialog(null)}
          onDone={(msg) => { setDialog(null); say(msg); loadMeta(); load(state); }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ cell */
function Cell({ row, col, editable, editing, onStart, onCancel, onSave, sevaName, seva }) {
  const v = row[col.k];
  if (editing) {
    const init = col.type === 'date' && v ? String(v).slice(0, 10) : (v == null ? '' : v);
    const common = {
      autoFocus: true,
      defaultValue: col.type === 'bool' ? String(!!v) : init,
      onBlur: (e) => onSave(e.target.value),
      onKeyDown: (e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') onCancel();
      },
    };
    return (
      <td>
        {col.opt ? <select {...common}>{col.opt.map((o) => <option key={o} value={o}>{o || '—'}</option>)}</select>
          : col.type === 'ref' ? (
            <select {...common}>
              <option value="">—</option>
              {seva.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : col.type === 'bool' ? (
            <select {...common}><option value="true">Yes</option><option value="false">No</option></select>
          ) : (
            <input type={col.type === 'date' ? 'date' : col.type === 'num' ? 'number' : 'text'} {...common} />
          )}
      </td>
    );
  }

  let disp;
  if (col.k === 'tags') {
    disp = (v || []).length
      ? (v || []).map((x) => <span className="pill" key={x}>{x}</span>)
      : <span style={{ color: '#c9c9c3' }}>—</span>;
  } else if (col.k === 'shares_mobile_with') {
    disp = Number(v) > 1 ? <span className="pill w">{v} share</span> : '';
  } else if (col.type === 'bool') {
    disp = col.k === 'is_active'
      ? <span className={'pill ' + (v ? 'g' : 'r')}>{v ? 'Active' : 'Inactive'}</span>
      : (v ? <span className="pill g">80G</span> : '');
  } else if (col.type === 'num' && col.k === 'amount') {
    disp = '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  } else if (col.type === 'ref') {
    disp = sevaName(v);
  } else if (col.type === 'date' && v) {
    disp = String(v).slice(0, 10);
  } else {
    disp = v == null || v === '' ? <span style={{ color: '#c9c9c3' }}>—</span> : String(v);
  }

  return (
    <td
      className={(editable ? 'ed ' : 'ro ') + (col.w || '')}
      onDoubleClick={editable ? onStart : undefined}
      title={editable ? 'Double-click to edit' : undefined}
    >
      <span className="cell">{disp}</span>
    </td>
  );
}

/* ---------------------------------------------------------------- dialogs */
function Dlg({ title, children, actions, onClose }) {
  return (
    <div className="mask" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dlg">
        <h3>{title}</h3>
        <div className="bd">{children}</div>
        <div className="ft">{actions}</div>
      </div>
    </div>
  );
}

function PersonDialog({ meta, presetTag, onClose, onDone }) {
  const [f, setF] = useState({ mobile_cc: '+91', city: 'Chennai', state: 'Tamil Nadu', country: 'India' });
  const [tags, setTags] = useState(presetTag ? [presetTag] : []);
  const [dups, setDups] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    const digits = String(f.mobile_number || '').replace(/\D/g, '');
    if (digits.length < 6) { setDups([]); return; }
    const t = setTimeout(async () => {
      try {
        const d = await api('people.findByMobile', { mobile: digits, cc: f.mobile_cc || '+91' });
        setDups(d.rows);
      } catch { /* warning only */ }
    }, 400);
    return () => clearTimeout(t);
  }, [f.mobile_number, f.mobile_cc]);

  async function save() {
    if (!f.full_name) return setErr('Full name is required');
    setBusy(true); setErr('');
    try {
      const r = await api('people.create', { data: f, tags });
      onDone(`Added #${r.person_no}`);
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <Dlg
      title="Add person" onClose={onClose}
      actions={<>
        <button onClick={onClose}>Cancel</button>
        <button className="p" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </>}
    >
      {err && <div className="errbox">{err}</div>}
      <div className="hint">
        Mobile is not unique — family members may share a number. Enter it and you&apos;ll see who already uses it.
      </div>
      {dups.length > 0 && (
        <div className="dupbox">
          <b>{dups.length} {dups.length === 1 ? 'person' : 'people'} already use this number</b>
          {dups.map((d) => <div key={d.person_no}>#{d.person_no} {d.display_name}{d.city ? ` · ${d.city}` : ''}</div>)}
          <div style={{ marginTop: 5 }}>If this is a different family member, carry on — a new ID will be created.</div>
        </div>
      )}
      <div className="g2">
        <F label="Full name *"><input value={f.full_name || ''} onChange={set('full_name')} /></F>
        <F label="Initiated name"><input value={f.initiated_name || ''} onChange={set('initiated_name')} /></F>
      </div>
      <div className="g3">
        <F label="Country code"><input value={f.mobile_cc || ''} onChange={set('mobile_cc')} /></F>
        <F label="Mobile"><input value={f.mobile_number || ''} onChange={set('mobile_number')} /></F>
        <F label="Sex">
          <select value={f.gender || ''} onChange={set('gender')}>
            <option value="">—</option><option value="M">M</option><option value="F">F</option><option value="O">O</option>
          </select>
        </F>
      </div>
      <div className="g2">
        <F label="Date of birth"><input type="date" value={f.dob || ''} onChange={set('dob')} /></F>
        <F label="Email"><input type="email" value={f.email || ''} onChange={set('email')} /></F>
      </div>
      <div className="g2">
        <F label="Area"><input value={f.area || ''} onChange={set('area')} /></F>
        <F label="City"><input value={f.city || ''} onChange={set('city')} /></F>
      </div>
      <div className="g3">
        <F label="Pincode"><input value={f.pincode || ''} onChange={set('pincode')} /></F>
        <F label="State"><input value={f.state || ''} onChange={set('state')} /></F>
        <F label="Country"><input value={f.country || ''} onChange={set('country')} /></F>
      </div>
      <div className="g2">
        <F label="PAN"><input value={f.pan || ''} onChange={set('pan')} /></F>
        <F label="Language"><input value={f.preferred_language || ''} onChange={set('preferred_language')} /></F>
      </div>
      <F label="Categories">
        <div className="tagpick">
          {meta.tags.map((t) => (
            <label key={t.slug}>
              <input
                type="checkbox" checked={tags.includes(t.slug)}
                onChange={(e) => setTags((s) => e.target.checked ? [...s, t.slug] : s.filter((x) => x !== t.slug))}
              />{t.name}
            </label>
          ))}
        </div>
      </F>
    </Dlg>
  );
}

function DonationDialog({ meta, onClose, onDone }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [donor, setDonor] = useState(null);
  const [f, setF] = useState({
    donated_on: new Date().toISOString().slice(0, 10),
    payment_mode: 'cash', gateway: 'offline',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    if (term.length < 2 || donor) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { setResults((await api('donations.searchDonor', { term })).rows); } catch { /* ignore */ }
    }, 320);
    return () => clearTimeout(t);
  }, [term, donor]);

  async function save() {
    if (!donor) return setErr('Pick a donor first');
    if (!f.amount) return setErr('Amount is required');
    setBusy(true); setErr('');
    try {
      await api('donations.create', { personId: donor.id, data: f });
      onDone('Donation recorded');
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <Dlg
      title="Add donation" onClose={onClose}
      actions={<>
        <button onClick={onClose}>Cancel</button>
        <button className="p" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </>}
    >
      {err && <div className="errbox">{err}</div>}
      <F label="Donor — search by name, mobile or ID">
        <input
          value={donor ? `#${donor.person_no} · ${donor.display_name}` : term}
          placeholder="Type to search…"
          onChange={(e) => { setDonor(null); setTerm(e.target.value); }}
        />
        <div style={{ marginTop: 6 }}>
          {results.map((r) => (
            <button
              key={r.id} style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 4 }}
              onClick={() => { setDonor(r); setResults([]); }}
            >#{r.person_no} · {r.display_name}{r.mobile_e164 ? ` · ${r.mobile_e164}` : ''}</button>
          ))}
        </div>
      </F>
      <div className="g2">
        <F label="Amount (₹) *"><input type="number" value={f.amount || ''} onChange={set('amount')} /></F>
        <F label="Date"><input type="date" value={f.donated_on} onChange={set('donated_on')} /></F>
      </div>
      <F label="Seva category">
        <select value={f.seva_category_id || ''} onChange={set('seva_category_id')}>
          <option value="">—</option>
          {meta.seva.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </F>
      <div className="g3">
        <F label="Mode">
          <select value={f.payment_mode} onChange={set('payment_mode')}>
            {['cash', 'upi', 'card', 'netbanking', 'cheque', 'dd', 'bank_transfer', 'other']
              .map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </F>
        <F label="Gateway">
          <select value={f.gateway} onChange={set('gateway')}>
            {['offline', 'payu', 'razorpay', 'other'].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </F>
        <F label="Receipt no"><input value={f.receipt_no || ''} onChange={set('receipt_no')} /></F>
      </div>
      <div className="g2">
        <F label="Collected by"><input value={f.collected_by || ''} onChange={set('collected_by')} /></F>
        <F label="Notes"><input value={f.notes || ''} onChange={set('notes')} /></F>
      </div>
    </Dlg>
  );
}

function TagDialog({ meta, ids, onClose, onDone }) {
  const [slug, setSlug] = useState(meta.tags[0]?.slug || '');
  const [name, setName] = useState('');
  const [cat, setCat] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function apply() {
    setBusy(true); setErr('');
    try {
      const r = await api('people.bulkTag', {
        ids, slug, newTag: name ? { name, category: cat } : null,
      });
      onDone(`Tagged ${r.tagged} ${r.tagged === 1 ? 'person' : 'people'}`);
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <Dlg
      title={`Add ${ids.length} selected to a category`} onClose={onClose}
      actions={<>
        <button onClick={onClose}>Cancel</button>
        <button className="p" disabled={busy} onClick={apply}>{busy ? 'Applying…' : 'Apply'}</button>
      </>}
    >
      {err && <div className="errbox">{err}</div>}
      <F label="Category">
        <select value={slug} onChange={(e) => setSlug(e.target.value)}>
          {meta.tags.map((t) => <option key={t.slug} value={t.slug}>{t.cat} — {t.name}</option>)}
        </select>
      </F>
      <div className="hint">Or create a new one — it appears in the sidebar immediately:</div>
      <div className="g2">
        <F label="New category name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Unnati Club 2026" /></F>
        <F label="Group"><input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="e.g. Youth" /></F>
      </div>
    </Dlg>
  );
}

function ImportDialog({ meta, presetTag, onClose, onDone }) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [tagSlug, setTagSlug] = useState(presetTag || '');
  const [prev, setPrev] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function build() {
    const g = parseCSV(text.trim());
    if (g.length < 2) return { err: 'Nothing to read — paste CSV or choose a file.' };
    const hdr = g[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const used = hdr.map((h) => (IMPORT_COLS.includes(h) ? h : null));
    if (!used.includes('full_name')) {
      return { err: `No full_name column found. Headers seen: ${hdr.join(', ')}` };
    }
    const recs = g.slice(1).map((r) => {
      const o = {};
      used.forEach((k, i) => { if (k) o[k] = (r[i] || '').trim(); });
      return o;
    }).filter((o) => o.full_name);
    return { columns: used.filter(Boolean), recs, ignored: hdr.filter((h, i) => !used[i]) };
  }

  function doPreview() {
    const d = build();
    setPrev(d);
    setErr(d.err || '');
    return d;
  }

  async function run() {
    const d = prev && !prev.err ? prev : doPreview();
    if (d.err) return;
    setBusy(true); setErr('');
    try {
      const r = await api('people.import', {
        rows: d.recs, columns: d.columns, tagSlug: tagSlug || null, sourceFile: fileName || 'paste',
      });
      onDone(`Imported ${r.inserted} people (batch #${r.batchId})`
        + (r.sharingMobile ? ` · ${r.sharingMobile} share a mobile with someone else` : ''));
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <Dlg
      title="Import people from CSV" onClose={onClose}
      actions={<>
        <button onClick={onClose}>Cancel</button>
        <button onClick={doPreview}>Preview</button>
        <button className="p" disabled={busy} onClick={run}>{busy ? 'Importing…' : 'Import'}</button>
      </>}
    >
      {err && <div className="errbox">{err}</div>}
      <div className="hint">
        First row must be headers. Recognised columns:<br />
        {IMPORT_COLS.map((c) => <code key={c} style={{ marginRight: 4 }}>{c}</code>)}<br />
        Unknown columns are ignored. <code>full_name</code> is required.
        Dates must be <code>YYYY-MM-DD</code>. Blank <code>mobile_cc</code> becomes <code>+91</code>.
      </div>
      <div className="warnbox">
        Every row becomes a new person with a new ID. Existing records are never overwritten.
        Rows sharing a mobile with someone already here are still imported — check <b>Shared mobiles</b> afterwards.
        The whole import can be undone from <b>Import batches</b>.
      </div>
      <F label="File">
        <input
          type="file" accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files[0]; if (!file) return;
            setFileName(file.name);
            const rd = new FileReader();
            rd.onload = () => { setText(String(rd.result)); setPrev(null); };
            rd.readAsText(file);
          }}
        />
      </F>
      <F label="Or paste CSV">
        <textarea
          rows={7} value={text}
          onChange={(e) => { setText(e.target.value); setPrev(null); }}
          placeholder={'full_name,mobile_number,city\nRamesh Kumar,9840012345,Chennai'}
        />
      </F>
      <F label="Tag every imported row as">
        <select value={tagSlug} onChange={(e) => setTagSlug(e.target.value)}>
          <option value="">— none —</option>
          {meta.tags.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
        </select>
      </F>
      {prev && !prev.err && (
        <div className="dupbox">
          <b>{prev.recs.length} rows ready</b>
          Columns used: {prev.columns.join(', ')}
          {prev.ignored.length > 0 && <><br />Ignored: {prev.ignored.join(', ')}</>}
        </div>
      )}
    </Dlg>
  );
}

function UndoDialog({ batch, onClose, onDone }) {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const phrase = `UNDO ${batch.id}`;

  async function run() {
    if (confirm.trim().toUpperCase() !== phrase) return setErr('Confirmation text does not match');
    setBusy(true); setErr('');
    try {
      const r = await api('batches.rollback', { batchId: batch.id });
      onDone(`Batch #${batch.id} rolled back — ${r.deleted} deleted`
        + (r.kept ? `, ${r.kept} kept (have donations)` : ''));
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <Dlg
      title={`Undo import batch #${batch.id}`} onClose={onClose}
      actions={<>
        <button onClick={onClose}>Cancel</button>
        <button className="p" disabled={busy} onClick={run}>
          {busy ? 'Deleting…' : `Delete ${batch.still_present} people`}
        </button>
      </>}
    >
      {err && <div className="errbox">{err}</div>}
      <div className="warnbox">
        <b>This permanently deletes up to {batch.still_present} people</b> created by this import,
        along with their category tags and occasions.<br /><br />
        Anyone edited since the import is still deleted. Anyone with a donation recorded
        against them is <b>kept</b>, not deleted — you&apos;ll be told how many.
      </div>
      <F label={`Type ${phrase} to confirm`}>
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={phrase} />
      </F>
    </Dlg>
  );
}

function BatchTable({ batches, rank, onUndo }) {
  if (!batches.length) {
    return <div className="empty">No imports yet. Use the Import button on a people view.</div>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Batch</th><th>Source</th><th className="num">Rows</th><th className="num">Inserted</th>
          <th className="num">Still present</th><th>Status</th><th>By</th><th>When</th><th />
        </tr>
      </thead>
      <tbody>
        {batches.map((b) => (
          <tr key={b.id}>
            <td><span className="cell">#{b.id}</span></td>
            <td><span className="cell">{b.source_file}</span></td>
            <td className="num"><span className="cell">{b.row_count ?? 0}</span></td>
            <td className="num"><span className="cell">{b.inserted_count ?? 0}</span></td>
            <td className="num"><span className="cell">{b.still_present}</span></td>
            <td>
              <span className="cell">
                <span className={'pill ' + (b.status === 'committed' ? 'g' : b.status === 'rolled_back' ? 'r' : 'w')}>
                  {b.status}
                </span>
              </span>
            </td>
            <td><span className="cell">{b.imported_by_name || '—'}</span></td>
            <td><span className="cell">{String(b.started_at || '').slice(0, 16).replace('T', ' ')}</span></td>
            <td>
              <span className="cell">
                {rank >= 3 && Number(b.still_present) > 0 && (
                  <button onClick={() => onUndo(b)}>Undo import</button>
                )}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function F({ label, children }) {
  return <div className="fg"><label>{label}</label>{children}</div>;
}
