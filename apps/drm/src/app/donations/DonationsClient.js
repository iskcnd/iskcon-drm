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
const day = (d) => (d ? String(d).slice(0, 10) : '');
const today = () => new Date().toISOString().slice(0, 10);
const ago = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

const TABS = [
  ['list', 'Donations'],
  ['categories', 'Categories'],
  ['reports', 'Reports'],
  ['occasions', 'Occasions'],
  ['sync', 'Zoho sync'],
];

export default function DonationsClient({ role }) {
  const rank = RANK[role] ?? 0;
  const [tab, setTab] = useState('list');
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  const say = (t) => { setToast(t); setTimeout(() => setToast(''), 2600); };

  return (
    <div className="content">
      <div className="head">
        <div>
          <h1>Donations</h1>
          <p className="lede">Everything behind the public donation page.</p>
        </div>
      </div>

      <nav className="tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => { setErr(''); setTab(k); }}>
            {label}
          </button>
        ))}
      </nav>

      {err && <div className="errbox">{err}</div>}
      {toast && <div id="msg">{toast}</div>}

      {tab === 'list' && <DonationList rank={rank} onErr={setErr} say={say} />}
      {tab === 'categories' && <Categories rank={rank} onErr={setErr} say={say} />}
      {tab === 'reports' && <Reports onErr={setErr} />}
      {tab === 'occasions' && <Occasions onErr={setErr} />}
      {tab === 'sync' && <SyncHealth onErr={setErr} />}
    </div>
  );
}

/* ==================================================================== list */
function DonationList({ rank, onErr, say }) {
  const [f, setF] = useState({ search: '', from: ago(30), to: today(), category: '', gateway: '' });
  const [page, setPage] = useState(1);
  const [d, setD] = useState(null);
  const [cats, setCats] = useState([]);
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState(null);

  const load = useCallback(async (filter, pg) => {
    setBusy(true);
    try { setD(await api('don.list', { filter, page: pg, size: 50 })); }
    catch (e) { onErr(e.message); }
    setBusy(false);
  }, [onErr]);

  useEffect(() => { api('cat.list').then((r) => setCats(r.rows)).catch(() => {}); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(f, page), f.search ? 320 : 0);
    return () => clearTimeout(t);
  }, [f, page, load]);

  const set = (k) => (e) => { setPage(1); setF((s) => ({ ...s, [k]: e.target.value })); };

  function exportCsv() {
    if (!d?.rows.length) return;
    const keys = ['id', 'donated_on', 'seva_date', 'receipt_no', 'person_no', 'donor', 'mobile_e164',
      'amount', 'seva_category', 'seva_type', 'payment_mode', 'gateway', 'collected_by', 'volunteer_name'];
    const cell = (v) => {
      if (v == null) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [keys.join(',')].concat(d.rows.map((r) => keys.map((k) => cell(r[k])).join(','))).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `donations-${today()}.csv`;
    a.click();
  }

  return (
    <>
      <div id="filters" style={{ borderRadius: 10, border: '1px solid var(--line)', marginBottom: 14 }}>
        <input className="q" placeholder="Name, receipt no, mobile, donor ID…" value={f.search} onChange={set('search')} />
        <input type="date" value={f.from} onChange={set('from')} title="Paid from" />
        <input type="date" value={f.to} onChange={set('to')} title="Paid to" />
        <select value={f.category} onChange={set('category')}>
          <option value="">All seva</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={f.gateway} onChange={set('gateway')}>
          <option value="">All channels</option>
          {['payu', 'razorpay', 'easebuzz', 'offline', 'other'].map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={() => { setPage(1); setF({ search: '', from: ago(30), to: today(), category: '', gateway: '' }); }}>Clear</button>
        {rank >= 2 && <button onClick={exportCsv}>Export CSV</button>}
      </div>

      {d && (
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
          <div className="kpi"><b>{Number(d.stats.n).toLocaleString('en-IN')}</b><span>Donations</span></div>
          <div className="kpi"><b>{inr(d.stats.total)}</b><span>Total</span></div>
          <div className="kpi"><b>{inr(d.stats.avg)}</b><span>Average</span></div>
          <div className="kpi"><b>{Number(d.stats.donors).toLocaleString('en-IN')}</b><span>Donors</span></div>
        </div>
      )}

      {busy && <p className="dim">Loading…</p>}
      {!busy && d && (d.rows.length === 0
        ? <div className="empty">No donations match.</div>
        : (
          <>
            <table className="mini">
              <thead>
                <tr>
                  <th>Receipt</th><th>Paid</th><th>Seva date</th><th>Donor</th>
                  <th>Seva</th><th className="num">Amount</th><th>Channel</th><th>Collected by</th><th />
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.receipt_no || <span className="warn">none</span>}</td>
                    <td>{day(r.donated_on)}</td>
                    <td>{r.seva_date ? day(r.seva_date) : <span className="dim">—</span>}</td>
                    <td>
                      <b>{r.donor}</b>
                      <span className="dim"> #{r.person_no}{r.mobile_e164 ? ` · ${r.mobile_e164}` : ''}</span>
                    </td>
                    <td>{r.seva_category || <span className="dim">—</span>}
                      {r.seva_type ? <span className="dim"> · {r.seva_type}</span> : null}
                      {Number(r.archana_count) > 0 && <span className="pill">archana ×{r.archana_count}</span>}
                    </td>
                    <td className="num">{inr(r.amount)}</td>
                    <td>{r.gateway || r.payment_mode || '—'}</td>
                    <td>{r.collected_by?.trim() || <span className="dim">—</span>}</td>
                    <td><button onClick={() => setOpen(r.id)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="dim">Page {d.page} · {d.rows.length} shown of {Number(d.stats.n).toLocaleString('en-IN')}</span>
              <span>
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>{' '}
                <button disabled={d.rows.length < d.size} onClick={() => setPage((p) => p + 1)}>Next</button>
              </span>
            </div>
          </>
        ))}

      {open && <DonationDetail id={open} rank={rank} onClose={() => setOpen(null)} onErr={onErr} say={say} reload={() => load(f, page)} />}
    </>
  );
}

function DonationDetail({ id, rank, onClose, onErr, say, reload }) {
  const [d, setD] = useState(null);
  useEffect(() => { api('don.detail', { id }).then(setD).catch((e) => onErr(e.message)); }, [id, onErr]);

  async function issue() {
    try { const r = await api('don.issueReceipt', { id }); say(`Receipt ${r.receipt_no} issued`); reload(); setD(null); api('don.detail', { id }).then(setD); }
    catch (e) { onErr(e.message); }
  }

  return (
    <div className="mask" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dlg">
        <h3>Donation #{id}</h3>
        <div className="bd">
          {!d ? <p className="dim">Loading…</p> : (
            <>
              <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="kpi"><b>{inr(d.donation.amount)}</b><span>Amount</span></div>
                <div className="kpi"><b>{d.donation.receipt_no || '—'}</b><span>Receipt</span></div>
              </div>
              <table className="mini">
                <tbody>
                  <tr><td>Donor</td><td><b>{d.donation.donor}</b> #{d.donation.person_no}</td></tr>
                  <tr><td>Mobile</td><td>{d.donation.mobile_e164 || '—'}</td></tr>
                  <tr><td>Email</td><td>{d.donation.email || '—'}</td></tr>
                  <tr><td>PAN</td><td>{d.donation.pan || '—'}</td></tr>
                  <tr><td>Seva</td><td>{d.donation.seva_category || '—'}{d.donation.seva_type ? ` · ${d.donation.seva_type}` : ''}</td></tr>
                  <tr><td>Paid on</td><td>{day(d.donation.donated_on)}</td></tr>
                  <tr><td>Seva date</td><td>{d.donation.seva_date ? day(d.donation.seva_date) : '—'}</td></tr>
                  <tr><td>Channel</td><td>{d.donation.gateway || '—'} / {d.donation.payment_mode || '—'}</td></tr>
                  <tr><td>Collected by</td><td>{d.donation.collected_by?.trim() || '—'}</td></tr>
                  <tr><td>Volunteer</td><td>{d.donation.volunteer_name?.trim() || '—'}</td></tr>
                </tbody>
              </table>

              {d.archana.length > 0 && (
                <>
                  <h3>Archana details</h3>
                  <table className="mini">
                    <thead><tr><th>Name</th><th>Relation</th><th>Gotra</th><th>Nakshatra</th><th>Rashi</th></tr></thead>
                    <tbody>
                      {d.archana.map((a) => (
                        <tr key={a.id}>
                          <td>{a.full_name}</td><td>{a.relation || '—'}</td>
                          <td>{a.gotra || '—'}</td><td>{a.nakshatra || '—'}</td><td>{a.rashi || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {d.outbox.length > 0 && (
                <>
                  <h3>Zoho sync</h3>
                  <table className="mini">
                    <tbody>
                      {d.outbox.map((o) => (
                        <tr key={o.id}>
                          <td><span className={'pill ' + (o.status === 'sent' ? 'g' : o.status === 'failed' ? 'r' : 'w')}>{o.status}</span></td>
                          <td>{o.attempts} attempts</td>
                          <td className="dim">{o.last_error || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
        <div className="ft">
          {d?.receiptUrl && <a className="nav-link" href={d.receiptUrl} target="_blank" rel="noreferrer">Open receipt</a>}
          {d && !d.donation.receipt_no && rank >= 1 && <button onClick={issue}>Issue receipt no</button>}
          <button className="p" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================== categories */
function Categories({ rank, onErr, say }) {
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);

  const load = useCallback(() => api('cat.list').then((r) => setRows(r.rows)).catch((e) => onErr(e.message)), [onErr]);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="actions" style={{ justifyContent: 'flex-start', marginBottom: 12 }}>
        {rank >= 2 && <button className="p" onClick={() => setEdit({ kind: 'one_time', min_amount: 101, display_order: 100, show_on_page: true, presets: [] })}>+ New category</button>}
      </div>
      {!rows ? <p className="dim">Loading…</p> : (
        <table className="mini">
          <thead>
            <tr><th>Name</th><th>Kind</th><th className="num">Min</th><th>On page</th><th>Active</th>
              <th className="num">Donations</th><th className="num">Raised</th><th>Zoho id</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td><b>{c.name}</b><span className="dim"> {c.slug}</span></td>
                <td>{c.kind}</td>
                <td className="num">{inr(c.min_amount)}</td>
                <td>{c.show_on_page ? <span className="pill g">shown</span> : <span className="pill">hidden</span>}</td>
                <td>{c.is_active ? <span className="pill g">active</span> : <span className="pill r">off</span>}</td>
                <td className="num">{c.donations}</td>
                <td className="num">{inr(c.raised)}</td>
                <td className="dim">{c.zoho_seva_type_id || '—'}</td>
                <td>{rank >= 2 && <button onClick={() => setEdit(c)}>Edit</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {edit && <CategoryDialog cat={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); say('Saved'); load(); }} onErr={onErr} />}
    </>
  );
}

const LANGS = [['en', 'English'], ['ta', 'Tamil'], ['hi', 'Hindi'], ['te', 'Telugu']];

function CategoryDialog({ cat, onClose, onSaved, onErr }) {
  const [f, setF] = useState({
    ...cat,
    name_i18n: cat.name_i18n || {}, line_i18n: cat.line_i18n || {},
    emo_i18n: cat.emo_i18n || {}, presets: cat.presets || [],
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setI18n = (field, lang) => (e) => setF((s) => ({ ...s, [field]: { ...s[field], [lang]: e.target.value } }));

  async function save() {
    setBusy(true);
    try { await api('cat.save', { data: f }); onSaved(); }
    catch (e) { onErr(e.message); setBusy(false); }
  }

  return (
    <div className="mask" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dlg">
        <h3>{cat.id ? `Edit ${cat.name}` : 'New seva category'}</h3>
        <div className="bd">
          <div className="g2">
            <div className="fg"><label>Name (internal)</label><input value={f.name || ''} onChange={set('name')} /></div>
            <div className="fg"><label>Kind</label>
              <select value={f.kind} onChange={set('kind')}>
                <option value="one_time">One-time</option>
                <option value="monthly">Monthly</option>
                <option value="dated">Dated (pick a seva date)</option>
              </select>
            </div>
          </div>
          <div className="g3">
            <div className="fg"><label>Minimum ₹</label><input type="number" value={f.min_amount ?? ''} onChange={set('min_amount')} /></div>
            <div className="fg"><label>Order</label><input type="number" value={f.display_order ?? ''} onChange={set('display_order')} /></div>
            <div className="fg"><label>Icon</label><input value={f.icon || ''} onChange={set('icon')} /></div>
          </div>

          <h3>Public page text</h3>
          <p className="hint">Leave a language blank and the page falls back to English.</p>
          {LANGS.map(([code, label]) => (
            <div className="g3" key={code}>
              <div className="fg"><label>{label} — title</label>
                <input value={f.name_i18n[code] || ''} onChange={setI18n('name_i18n', code)} /></div>
              <div className="fg"><label>{label} — line</label>
                <input value={f.line_i18n[code] || ''} onChange={setI18n('line_i18n', code)} /></div>
              <div className="fg"><label>{label} — emotive</label>
                <input value={f.emo_i18n[code] || ''} onChange={setI18n('emo_i18n', code)} /></div>
            </div>
          ))}

          <h3>Amount chips</h3>
          <p className="hint">Shown as quick-pick buttons. One per line: <code>501 = feeds 25 devotees</code></p>
          <textarea
            rows={4}
            value={(f.presets || []).map((p) => `${p.amount} = ${p.impact?.en || ''}`).join('\n')}
            onChange={(e) => setF((s) => ({
              ...s,
              presets: e.target.value.split('\n').map((l) => {
                const [a, ...rest] = l.split('=');
                const amount = Number(String(a).replace(/[^0-9]/g, ''));
                if (!amount) return null;
                return { amount, impact: { en: rest.join('=').trim() } };
              }).filter(Boolean),
            }))}
          />

          <div className="g2">
            <div className="fg"><label>Zoho seva type id</label><input value={f.zoho_seva_type_id || ''} onChange={set('zoho_seva_type_id')} /></div>
            <div className="fg"><label>Zoho category id</label><input value={f.zoho_category_id || ''} onChange={set('zoho_category_id')} /></div>
          </div>

          <div className="tagpick">
            <label><input type="checkbox" checked={!!f.show_on_page} onChange={set('show_on_page')} /> Show on public donation page</label>
            <label><input type="checkbox" checked={f.is_active !== false} onChange={set('is_active')} /> Active internally</label>
          </div>
          <p className="hint">
            A category can be active internally (counter, imports) while hidden from the public page.
          </p>
        </div>
        <div className="ft">
          <button onClick={onClose}>Cancel</button>
          <button className="p" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================= reports */
function Reports({ onErr }) {
  const [r, setR] = useState(null);
  const [p, setP] = useState({ from: ago(365), to: today(), grain: 'month' });

  useEffect(() => { api('don.reports', p).then(setR).catch((e) => onErr(e.message)); }, [p, onErr]);
  const set = (k) => (e) => setP((s) => ({ ...s, [k]: e.target.value }));

  return (
    <>
      <div id="filters" style={{ borderRadius: 10, border: '1px solid var(--line)', marginBottom: 14 }}>
        <input type="date" value={p.from} onChange={set('from')} />
        <input type="date" value={p.to} onChange={set('to')} />
        <select value={p.grain} onChange={set('grain')}>
          <option value="day">Daily</option><option value="week">Weekly</option>
          <option value="month">Monthly</option><option value="year">Yearly</option>
        </select>
      </div>
      {!r ? <p className="dim">Loading…</p> : (
        <>
          <div className="kpis">
            <div className="kpi"><b>{inr(r.series.reduce((a, x) => a + Number(x.total), 0))}</b><span>Total raised</span></div>
            <div className="kpi"><b>{r.series.reduce((a, x) => a + Number(x.gifts), 0)}</b><span>Gifts</span></div>
            <div className="kpi"><b>{r.mix?.new_donors ?? 0}</b><span>New donors</span></div>
            <div className="kpi"><b>{r.mix?.returning_donors ?? 0}</b><span>Returning</span></div>
          </div>

          <div className="two">
            <div className="panel">
              <h3>By team member</h3>
              <Table head={['Employee', 'Gifts', 'Donors', 'Total']}
                rows={r.byStaff.map((x) => [x.name, x.gifts, x.donors, inr(x.total)])} />
            </div>
            <div className="panel">
              <h3>By volunteer</h3>
              <Table head={['Volunteer', 'Reports to', 'Gifts', 'Total']}
                rows={r.byVolunteer.map((x) => [x.name, x.reports_to, x.gifts, inr(x.total)])} />
            </div>
          </div>

          <div className="two">
            <div className="panel">
              <h3>By seva category</h3>
              <Table head={['Category', 'Gifts', 'Total']}
                rows={r.byCategory.map((x) => [x.name, x.gifts, inr(x.total)])} />
            </div>
            <div className="panel">
              <h3>Top donors</h3>
              <Table head={['Donor', 'Gifts', 'Total']}
                rows={r.topDonors.map((x) => [`#${x.person_no} ${x.display_name}`, x.gifts, inr(x.total)])} />
            </div>
          </div>

          <div className="panel">
            <h3>Period totals</h3>
            <Table head={['Period', 'Gifts', 'Donors', 'Total']}
              rows={r.series.map((x) => [x.bucket, x.gifts, x.donors, inr(x.total)])} />
          </div>
        </>
      )}
    </>
  );
}

/* =============================================================== occasions */
function Occasions({ onErr }) {
  const [rows, setRows] = useState(null);
  const [days, setDays] = useState(7);
  useEffect(() => { api('don.occasions', { days }).then((r) => setRows(r.rows)).catch((e) => onErr(e.message)); }, [days, onErr]);

  return (
    <>
      <p className="lede">Donors with a birthday coming up — the outreach list.</p>
      <div id="filters" style={{ borderRadius: 10, border: '1px solid var(--line)', marginBottom: 14 }}>
        <select value={days} onChange={(e) => setDays(+e.target.value)}>
          <option value={7}>Next 7 days</option><option value={15}>Next 15 days</option><option value={30}>Next 30 days</option>
        </select>
      </div>
      {!rows ? <p className="dim">Loading…</p> : rows.length === 0
        ? <div className="empty">No donor birthdays in this window.</div>
        : <Table head={['Day', 'Donor', 'Mobile', 'Mapped to', 'Lifetime giving']}
            rows={rows.map((x) => [x.day_label, `#${x.person_no} ${x.display_name}`, x.mobile_e164 || '—', x.mapped_to, inr(x.lifetime)])} />}
    </>
  );
}

/* ============================================================ sync health */
function SyncHealth({ onErr }) {
  const [d, setD] = useState(null);
  useEffect(() => { api('don.syncHealth').then(setD).catch((e) => onErr(e.message)); }, [onErr]);

  return (
    <>
      <p className="lede">
        Zoho is temporary — the DRM is the system of record. Until it&apos;s switched off, every
        donation must reach it. Anything stuck here needs attention.
      </p>
      {!d ? <p className="dim">Loading…</p> : (
        <>
          <div className="kpis">
            {d.byStatus.length === 0 && <div className="kpi"><b>0</b><span>Queued</span></div>}
            {d.byStatus.map((s) => (
              <div className="kpi" key={s.status}><b>{s.n}</b><span>{s.status}</span></div>
            ))}
          </div>
          {d.stuck.length > 0 && (
            <>
              <h3 className="bad">Stuck — more than 3 attempts</h3>
              <Table head={['Outbox', 'Donation', 'Attempts', 'Last error']}
                rows={d.stuck.map((x) => [x.id, x.donation_id, x.attempts, x.last_error || '—'])} />
            </>
          )}
        </>
      )}
    </>
  );
}

function Table({ head, rows }) {
  if (!rows.length) return <p className="dim" style={{ padding: '20px 0' }}>Nothing yet.</p>;
  return (
    <table className="mini">
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j} className={j >= head.length - 1 ? 'num' : ''}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}
