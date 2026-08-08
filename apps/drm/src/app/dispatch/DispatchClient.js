'use client';

import { useCallback, useEffect, useState } from 'react';

const RANK = { view_only: 0, data_entry: 1, module_manager: 2, super_admin: 3 };

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

/** Binary endpoints: trigger a download rather than parsing the body. */
async function download(action, body, fallbackName) {
  const r = await fetch(`/api/dispatch/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Download failed (${r.status})`);
  }
  const blob = await r.blob();
  const cd = r.headers.get('content-disposition') || '';
  const name = (cd.match(/filename="([^"]+)"/) || [])[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  // Firefox ignores .click() on an anchor that is not in the document, so the
  // download silently did nothing there. Append, click, then clean up — and
  // revoke on a timer, because revoking immediately can cancel the download
  // before the browser has read the blob.
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const VERDICT_LABEL = {
  ok: 'Ready to post',
  below_threshold: 'Below the parcel threshold',
  no_address: 'No address on file',
  no_pincode: 'No PIN code',
  unknown_pincode: 'PIN not in the India Post directory',
  not_serviceable: 'Sri Maruti does not deliver there',
  no_name: 'No name on the record',
};

export default function DispatchClient({ user }) {
  const rank = RANK[user.role] ?? 0;
  const canRun = rank >= 2;
  const [tab, setTab] = useState('batches');
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api('dis.home').then(setD).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  const say = (m) => { setMsg(m); setErr(''); setTimeout(() => setMsg(''), 4000); };
  const oops = (e) => { setErr(typeof e === 'string' ? e : e.message); setMsg(''); };

  return (
    <div className="content">
      <div className="head">
        <div>
          <h1>Prasadam dispatch</h1>
          <p className="lede">
            Consolidate a window of donations into parcels, print labels and letters,
            hand the file to Sri Maruti, then track what comes back.
          </p>
        </div>
        {d?.counts && (
          <div className="tally">
            <div className="t"><b>{d.counts.open}</b><span>in flight</span></div>
            <div className="t"><b>{d.counts.delivered}</b><span>delivered</span></div>
            <div className="t"><b>{d.counts.returned}</b><span>returned</span></div>
          </div>
        )}
      </div>

      {err && <div className="errbox">{err}</div>}
      {msg && <div className="okbox">{msg}</div>}

      <div className="tabs">
        {[['batches', 'Batches'], ['new', 'New batch'],
          ['attention', `Needs attention${d?.attention?.length ? ` (${d.attention.length})` : ''}`],
          ['gifts', 'Gifts'], ['templates', 'Letters & labels'],
          ['import', 'Courier status']].map(([k, label]) => (
            <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>
              {label}
            </button>
        ))}
      </div>

      {!d && !err && <p className="dim">Loading…</p>}

      {d && tab === 'batches' && (
        <Batches d={d} canRun={canRun} say={say} oops={oops} reload={load} />
      )}
      {d && tab === 'new' && (
        <NewBatch d={d} canRun={canRun} say={say} oops={oops} reload={load} goto={setTab} />
      )}
      {d && tab === 'attention' && <Attention rows={d.attention} canRun={canRun} say={say} oops={oops} reload={load} />}
      {d && tab === 'gifts' && <Gifts gifts={d.gifts} canRun={canRun} say={say} oops={oops} reload={load} />}
      {d && tab === 'templates' && <Templates canRun={canRun} say={say} oops={oops} reload={load} />}
      {d && tab === 'import' && <CourierImport canRun={canRun} say={say} oops={oops} reload={load} />}
    </div>
  );
}

/* ------------------------------------------------------------- new batch */
function NewBatch({ d, canRun, say, oops, reload, goto }) {
  const [f, setF] = useState({
    name: `Dispatch ${new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`,
    fromDate: '', toDate: '', receiptStart: '', receiptEnd: '', trackingStart: '',
    letterTemplateId: d.templates.find((t) => t.kind === 'letter' && t.is_default)?.id
      || d.templates.find((t) => t.kind === 'letter')?.id || '',
    labelTemplateId: d.templates.find((t) => t.kind === 'label' && t.is_default)?.id || '',
  });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function doPreview() {
    setPreview(null);
    try { setPreview(await api('dis.preview', f)); } catch (e) { oops(e); }
  }

  async function createAndGenerate() {
    setBusy(true);
    try {
      const batch = await api('dis.createBatch', f);
      const r = await api('dis.generate', { batchId: batch.id });
      say(`${r.parcels} parcels created for ${r.donors} donors. ${r.pending} donors could not be posted to.`);
      reload(); goto('batches');
    } catch (e) { oops(e); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="card">
        <h3>Which donations</h3>
        <p className="hint">
          A date range, a receipt range, or both. Donations already on a parcel are never
          picked up twice, so re-running a window is safe.
        </p>
        <div className="g2">
          <div className="fg"><label>From date</label><input type="date" value={f.fromDate} onChange={set('fromDate')} /></div>
          <div className="fg"><label>To date</label><input type="date" value={f.toDate} onChange={set('toDate')} /></div>
        </div>
        <div className="g2">
          <div className="fg"><label>First receipt no</label><input value={f.receiptStart} onChange={set('receiptStart')} placeholder="200001" /></div>
          <div className="fg"><label>Last receipt no</label><input value={f.receiptEnd} onChange={set('receiptEnd')} placeholder="200500" /></div>
        </div>
        <div className="actions" style={{ justifyContent: 'flex-start' }}>
          <button onClick={doPreview}>Preview</button>
        </div>
      </div>

      {preview && (
        <div className="card">
          <h3>{preview.parcels} parcels for {preview.donors} donors</h3>
          {preview.sharing > 0 && (
            <p className="hint">{preview.sharing} donors share an address with someone else and go in one parcel together.</p>
          )}
          <table className="mini">
            <thead><tr><th>Outcome</th><th className="num">Donors</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {preview.summary.map((s) => (
                <tr key={s.verdict}>
                  <td>{VERDICT_LABEL[s.verdict] || s.verdict}</td>
                  <td className="num">{s.donors}</td>
                  <td className="num">{inr(s.rupees)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.bands?.length > 0 && (
            <p className="hint" style={{ marginTop: 10 }}>
              Bands: {preview.bands.map((b) => `${b.band} ${b.donors}`).join(' · ')}
            </p>
          )}
          <div className="actions" style={{ justifyContent: 'flex-start' }}>
            <button onClick={() => download('pending-export', f, 'address-pending.xlsx').catch(oops)}>
              Export the ones we cannot post to
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h3>The batch</h3>
        <div className="fg"><label>Name</label><input value={f.name} onChange={set('name')} /></div>
        <div className="g2">
          <div className="fg">
            <label>Letter template — required, every parcel carries a letter</label>
            <select value={f.letterTemplateId} onChange={set('letterTemplateId')}>
              <option value="">Choose…</option>
              {d.templates.filter((t) => t.kind === 'letter').map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="fg">
            <label>Label sheet</label>
            <select value={f.labelTemplateId} onChange={set('labelTemplateId')}>
              {d.templates.filter((t) => t.kind === 'label').map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="fg">
          <label>First courier number</label>
          <input value={f.trackingStart} onChange={set('trackingStart')} placeholder="25017200234607" />
          <p className="hint">
            Digits only. Parcels take consecutive numbers from here, the way a book of
            courier labels runs. Leave blank to write them in later.
          </p>
        </div>
        <div className="actions">
          <button className="p" disabled={!canRun || busy || !f.letterTemplateId} onClick={createAndGenerate}>
            {busy ? 'Generating…' : 'Create batch and generate parcels'}
          </button>
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- batches */
function Batches({ d, canRun, say, oops, reload }) {
  const [open, setOpen] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [busy, setBusy] = useState('');
  const [showGifts, setShowGifts] = useState(false);

  async function openBatch(b) {
    setOpen(b);
    setShowGifts(false);
    // Clear first: leaving the previous batch's parcels on screen while the
    // next load runs makes it look as though the wrong batch opened.
    setParcels([]);
    try { setParcels(await api('dis.parcels', { batchId: b.id })); } catch (e) { oops(e); }
  }
  const act = async (label, fn) => {
    setBusy(label);
    try { await fn(); } catch (e) { oops(e); } finally { setBusy(''); }
  };

  if (!d.batches.length) return <p className="dim">No batches yet. Start one from the New batch tab.</p>;

  return (
    <>
      <table className="mini">
        <thead>
          <tr><th>Batch</th><th>Window</th><th className="num">Parcels</th>
            <th className="num">Delivered</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {d.batches.map((b) => (
            <tr key={b.id}>
              <td><b>{b.name}</b></td>
              <td className="dim">{[b.from_date?.slice(0, 10), b.to_date?.slice(0, 10)].filter(Boolean).join(' → ') || '—'}</td>
              <td className="num">{b.parcels}</td>
              <td className="num">{b.delivered}</td>
              <td><span className="pill">{b.status}</span></td>
              <td><button onClick={() => openBatch(b)}>Open</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {open && (
        <div className="card">
          <h3>{open.name} — {parcels.length} parcels</h3>
          <div className="actions" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            <button disabled={!canRun || busy} onClick={() => act('labels', () =>
              download('labels', { batchId: open.id }, 'labels.pdf'))}>
              {busy === 'labels' ? 'Building…' : 'Print labels'}
            </button>
            <button disabled={!canRun || busy} onClick={() => act('guides', () =>
              download('labels', { batchId: open.id, guides: true }, 'labels-test.pdf'))}>
              Test sheet with outlines
            </button>
            <button disabled={!canRun || busy} onClick={() => act('letters', () =>
              download('letters', { batchId: open.id }, 'letters.zip'))}>
              {busy === 'letters' ? 'Merging…' : 'Generate letters'}
            </button>
            <button disabled={!canRun || busy} onClick={() => act('xl', () =>
              download('courier-export', { batchId: open.id }, 'courier.xlsx'))}>
              Courier Excel
            </button>
            <button disabled={!canRun || busy} onClick={() => setShowGifts((v) => !v)}>
              {showGifts ? 'Hide gifts' : 'Choose gifts'}
            </button>
            <button className="p" disabled={!canRun || busy} onClick={() => act('dispatch', async () => {
              const r = await api('dis.markDispatched', { batchId: open.id });
              say(`${r.parcels} parcels marked as handed over.`); reload(); openBatch(open);
            })}>
              Mark handed to courier
            </button>
            {open.status !== 'dispatched' && open.status !== 'closed' && (
              <button disabled={!canRun || busy} onClick={() => act('cancel', async () => {
                // eslint-disable-next-line no-alert
                if (!window.confirm(`Cancel "${open.name}" and its ${parcels.length} parcels? The donations become available to a new batch.`)) return;
                const r = await api('dis.cancelBatch', { batchId: open.id });
                say(`Cancelled, ${r.parcels} parcels released.`);
                setOpen(null); reload();
              })}>
                Cancel batch
              </button>
            )}
          </div>
          <p className="hint">
            Print the test sheet on one label sheet first and hold it against the backing
            paper. Alignment is a template setting, not a code change.
          </p>

          {showGifts && (
            <BatchGifts batchId={open.id} gifts={d.gifts} canRun={canRun}
              say={say} oops={oops} onDone={() => openBatch(open)} />
          )}

          <table className="mini">
            <thead><tr><th>#</th><th>Tracking</th><th>Name</th><th>PIN</th>
              <th className="num">Amount</th><th>Band</th><th>Gifts</th><th>Status</th></tr></thead>
            <tbody>
              {parcels.slice(0, 300).map((p) => (
                <tr key={p.id}>
                  <td>{p.parcel_no}</td>
                  <td className="dim">{p.tracking_id || '—'}</td>
                  <td>{p.name_on_label}{p.is_shared ? <span className="pill">shared ×{p.donor_count}</span> : null}</td>
                  <td>{p.pincode}</td>
                  <td className="num">{inr(p.amount_total)}</td>
                  <td>{p.band}</td>
                  <td className="dim">{p.gifts || '—'}</td>
                  <td><span className="pill">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {parcels.length > 300 && <p className="hint">Showing the first 300. Use the Excel export for the whole batch.</p>}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------- attention */
function Attention({ rows, canRun, say, oops, reload }) {
  if (!rows.length) return <p className="dim">Nothing to chase. Every parcel is either in flight and on time, or delivered.</p>;
  return (
    <table className="mini">
      <thead><tr><th>Why</th><th>#</th><th>Tracking</th><th>Name</th>
        <th className="num">Days out</th><th>Status</th><th /></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td><b>{r.attention}</b></td>
            <td>{r.parcel_no}</td>
            <td className="dim">{r.tracking_id || '—'}</td>
            <td>{r.name_on_label}</td>
            <td className="num">{r.days_since_dispatch ?? '—'}</td>
            <td><span className="pill">{r.status}</span></td>
            <td>
              <select
                defaultValue=""
                disabled={!canRun}
                onChange={async (e) => {
                  if (!e.target.value) return;
                  try {
                    await api('dis.setParcelStatus', { parcelId: r.id, status: e.target.value });
                    say('Updated'); reload();
                  } catch (er) { oops(er); }
                }}
              >
                <option value="">Set…</option>
                <option value="delivered">Delivered</option>
                <option value="returned">Returned</option>
                <option value="damaged">Damaged</option>
                <option value="not_picked_up">Never collected</option>
                <option value="lost">Lost</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ----------------------------------------------------------------- gifts */
function Gifts({ gifts, canRun, say, oops, reload }) {
  const [f, setF] = useState({ name: '', sku: '', description: '' });
  return (
    <>
      <div className="card">
        <h3>Add a gift</h3>
        <p className="hint">
          Defined once here, then chosen per band when a batch is packed. What stops a
          regular donor receiving the same item twice is the history, not a fixed rule.
        </p>
        <div className="g3">
          <div className="fg"><label>Name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="fg"><label>Code</label><input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
          <div className="fg"><label>Note</label><input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        </div>
        <div className="actions">
          <button className="p" disabled={!canRun || !f.name.trim()} onClick={async () => {
            try { await api('dis.saveGift', f); setF({ name: '', sku: '', description: '' }); say('Added'); reload(); }
            catch (e) { oops(e); }
          }}>Add</button>
        </div>
      </div>
      <table className="mini">
        <thead><tr><th>Gift</th><th>Code</th><th>Note</th><th>Active</th></tr></thead>
        <tbody>
          {gifts.map((g) => (
            <tr key={g.id}>
              <td><b>{g.name}</b></td><td className="dim">{g.sku || '—'}</td>
              <td className="dim">{g.description || '—'}</td>
              <td>{g.is_active ? 'yes' : 'no'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* -------------------------------------------------------- courier import */
function CourierImport({ canRun, say, oops, reload }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/dispatch/courier-import', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Import failed');
      setResult(j.data);
      say(`${j.data.updated} parcels updated.`);
      reload();
    } catch (er) { oops(er); } finally { setBusy(false); e.target.value = ''; }
  }

  return (
    <div className="card">
      <h3>Sri Maruti status file</h3>
      <p className="hint">
        Their booking export, straight as downloaded. Parcels are matched on DOCUMENT NO.
        A tracking number we do not recognise is reported and skipped — it never stops the
        rest of the file. A returned parcel flags its donors&apos; address for review, because
        that is the temple learning something worth keeping.
      </p>
      <input type="file" accept=".xlsx,.xls" disabled={!canRun || busy} onChange={upload} />
      {busy && <p className="hint">Reading…</p>}
      {result && (
        <>
          <div className="okbox" style={{ marginTop: 12 }}>
            {result.read} rows read · <b>{result.updated} parcels updated</b> ·{' '}
            {result.addressesFlagged} addresses flagged · {result.notMatched} not matched
          </div>
          {result.examples?.length > 0 && (
            <table className="mini">
              <thead><tr><th>Row</th><th>Tracking</th><th>Problem</th></tr></thead>
              <tbody>
                {result.examples.map((x, i) => (
                  <tr key={i}><td>{x.row}</td><td className="dim">{x.tracking || '—'}</td><td>{x.error}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------- letters & labels */
/**
 * This screen did not exist in the first cut. The batch form asked for a
 * letter template and there was nowhere to create one or attach a document,
 * so "Generate letters" could never succeed. That was the gap Divyarupa hit.
 */
function Templates({ canRun, say, oops }) {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null);
  const [nw, setNw] = useState({ kind: 'letter', name: '' });

  const load = useCallback(() => {
    api('dis.templates').then(setRows).catch(oops);
  }, [oops]);
  useEffect(load, [load]);

  async function upload(templateId, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setInfo(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('templateId', templateId);
      const r = await fetch('/api/dispatch/template-upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Upload failed');
      setInfo({ id: templateId, ...j.data });
      say(`${file.name} uploaded`);
      load();
    } catch (er) { oops(er); } finally { setBusy(false); e.target.value = ''; }
  }

  if (!rows) return <p className="dim">Loading…</p>;
  const letters = rows.filter((t) => t.kind === 'letter');
  const labels = rows.filter((t) => t.kind === 'label');

  return (
    <>
      <div className="card">
        <h3>Letter templates</h3>
        <p className="hint">
          A Word .docx with <code>{'{{donor_name}}'}</code> style fields. Your letterhead,
          fonts and spacing are kept exactly — only the fields are replaced. Available
          fields: {['donor_name', 'amount', 'receipt_nos', 'tracking_id', 'parcel_no',
            'dispatch_date', 'gifts', 'address', 'band', 'temple_name', 'temple_address']
            .map((f) => <code key={f} style={{ marginRight: 4 }}>{`{{${f}}}`}</code>)}
        </p>
        <table className="mini">
          <thead><tr><th>Name</th><th>Document</th><th>Default</th><th /></tr></thead>
          <tbody>
            {letters.map((t) => (
              <tr key={t.id}>
                <td><b>{t.name}</b></td>
                <td className={t.has_file ? '' : 'dim'}>
                  {t.has_file
                    ? `${t.file_name} · ${Math.round(t.file_size / 1024)} kB`
                    : 'none uploaded — letters cannot be generated'}
                </td>
                <td>{t.is_default ? 'yes' : ''}</td>
                <td>
                  <label className="btnlike">
                    {t.has_file ? 'Replace' : 'Upload .docx'}
                    <input type="file" accept=".docx" style={{ display: 'none' }}
                      disabled={!canRun || busy} onChange={(e) => upload(t.id, e)} />
                  </label>
                </td>
              </tr>
            ))}
            {!letters.length && <tr><td colSpan={4} className="dim">No letter templates yet.</td></tr>}
          </tbody>
        </table>

        {info && (
          <div className={info.unknown?.length ? 'warnbox' : 'okbox'} style={{ marginTop: 12 }}>
            <b>{info.fileName}</b> — fields found: {info.fields.length ? info.fields.join(', ') : 'none'}
            {info.unknown?.length > 0 && (
              <><br />These are not fields we can fill and will print as-is:{' '}
                <b>{info.unknown.join(', ')}</b></>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Label sheets</h3>
        <table className="mini">
          <thead><tr><th>Name</th><th>Geometry</th><th>Default</th></tr></thead>
          <tbody>
            {labels.map((t) => (
              <tr key={t.id}>
                <td><b>{t.name}</b></td>
                <td className="dim">
                  {t.spec?.width_mm}×{t.spec?.height_mm}mm · {t.spec?.across} across,
                  {' '}{t.spec?.down} down · pitch {t.spec?.pitch_x}/{t.spec?.pitch_y}mm ·
                  {' '}margins {t.spec?.margin_left}/{t.spec?.margin_top}mm
                </td>
                <td>{t.is_default ? 'yes' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          If a printed sheet does not line up with the die-cut, adjust the margins here
          rather than in code. Print the test sheet with outlines from any batch first.
        </p>
      </div>

      <div className="card">
        <h3>Add a template</h3>
        <div className="g3">
          <div className="fg"><label>Kind</label>
            <select value={nw.kind} onChange={(e) => setNw({ ...nw, kind: e.target.value })}>
              <option value="letter">Letter</option>
              <option value="label">Label sheet</option>
            </select>
          </div>
          <div className="fg"><label>Name</label>
            <input value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })}
              placeholder="Ratha Yatra thank-you" /></div>
        </div>
        <div className="actions">
          <button className="p" disabled={!canRun || !nw.name.trim()} onClick={async () => {
            try {
              await api('dis.saveTemplate', { kind: nw.kind, name: nw.name });
              setNw({ kind: 'letter', name: '' }); say('Template added'); load();
            } catch (e) { oops(e); }
          }}>Add</button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------ gifts for a batch */
/**
 * Gifts are chosen per band per batch, and the column that matters is
 * "had before" — how many donors in this band already received that item.
 * That is the whole reason the gift history exists: not to enforce a rule,
 * but to put the fact in front of whoever is deciding.
 */
function BatchGifts({ batchId, gifts, canRun, say, oops, onDone }) {
  const [plan, setPlan] = useState(null);
  const [pick, setPick] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('dis.giftPlan', { batchId }).then(setPlan).catch(oops);
  }, [batchId, oops]);

  if (!plan) return <p className="dim">Loading gift history…</p>;
  const bands = [...new Set(plan.map((r) => r.band))].sort();
  if (!bands.length) return <p className="dim">No parcels in this batch yet.</p>;

  const toggle = (band, giftId) => setPick((s) => {
    const cur = new Set(s[band] || []);
    if (cur.has(giftId)) cur.delete(giftId); else cur.add(giftId);
    return { ...s, [band]: [...cur] };
  });

  return (
    <div className="card">
      <h3>What goes in each parcel</h3>
      <p className="hint">
        Tick the gifts for a band, then apply. <b>Had before</b> is how many donors in
        that band have already received it — high numbers are the ones to avoid repeating.
      </p>
      {bands.map((band) => {
        const rows = plan.filter((r) => r.band === band);
        const donors = rows[0]?.donors_in_band ?? 0;
        return (
          <div key={band} style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 6 }}>Band {band} · {donors} donors</h3>
            <div className="tagpick">
              {rows.filter((r) => gifts.find((g) => g.id === r.gift_id && g.is_active)).map((r) => (
                <label key={r.gift_id}>
                  <input type="checkbox" disabled={!canRun}
                    checked={(pick[band] || []).includes(r.gift_id)}
                    onChange={() => toggle(band, r.gift_id)} />
                  {r.name}
                  {r.had_before > 0 && (
                    <span className="dim"> · {r.had_before} had before</span>
                  )}
                </label>
              ))}
            </div>
            <div className="actions" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
              <button disabled={!canRun || busy} onClick={async () => {
                setBusy(true);
                try {
                  const r = await api('dis.setBandGifts', {
                    batchId, band,
                    gifts: (pick[band] || []).map((giftId) => ({ giftId, qty: 1 })),
                  });
                  say(`Band ${band}: ${r.parcels} parcels updated`);
                  if (onDone) onDone();
                } catch (e) { oops(e); } finally { setBusy(false); }
              }}>
                Apply to band {band}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
