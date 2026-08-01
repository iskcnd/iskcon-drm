'use client';

import { useEffect, useMemo, useState } from 'react';
import { IMPORT_TYPES, MATCH_FIELDS, mapHeader, typeColumns } from '@/lib/import-types';

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

const REASON = {
  no_match: 'No devotee found with this ID, email or mobile',
  no_identifier: 'Row has no person_no, email or mobile to match on',
  multiple: 'Several devotees share this number — pick the right one',
  name_mismatch: 'Found a devotee, but the name on the row is different',
  id_not_found: 'That person_no does not exist',
};

export default function ImportClient() {
  const [type, setType] = useState('people');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [tags, setTags] = useState([]);
  const [tagSlug, setTagSlug] = useState('');
  const [preview, setPreview] = useState(null);
  const [resolutions, setResolutions] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);

  const [sheetRows, setSheetRows] = useState(null); // parsed from .xlsx
  const [sheetInfo, setSheetInfo] = useState(null);

  const def = IMPORT_TYPES[type];
  const columns = useMemo(() => typeColumns(type), [type]);

  useEffect(() => {
    api('meta').then((m) => setTags(m.tags)).catch(() => {});
  }, []);

  /** Map raw headers (Zoho's or ours) onto field names, for either source. */
  function mapRows(rawHeaders, rawRows) {
    const known = rawHeaders.map((h) => mapHeader(type, h));
    if (!known.some(Boolean)) {
      throw new Error(`None of these headers are recognised for this import: ${rawHeaders.join(', ')}`);
    }
    const rows = rawRows.map((r) => {
      const o = {};
      known.forEach((k, i) => {
        if (!k) return;
        const v = Array.isArray(r) ? r[i] : r[rawHeaders[i]];
        o[k] = v == null ? '' : String(v).trim();
      });
      return o;
    });
    return { rows, ignored: rawHeaders.filter((h, i) => !known[i]) };
  }

  function rowsFromInput() {
    if (sheetRows) return mapRows(sheetInfo.headers, sheetRows);
    const g = parseCSV(text.trim());
    if (g.length < 2) throw new Error('Paste a CSV with a header row and at least one data row.');
    return mapRows(g[0].map((h) => String(h).trim()), g.slice(1));
  }

  async function readSpreadsheet(file) {
    setErr(''); setBusy(true); setPreview(null); setText('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/import/parse', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not read the file');
      setSheetInfo(j.data);
      setSheetRows(j.data.rows);
    } catch (e) { setErr(e.message); setSheetRows(null); setSheetInfo(null); }
    setBusy(false);
  }

  async function runPreview() {
    setErr(''); setDone(null); setBusy(true);
    try {
      const { rows, ignored } = rowsFromInput();
      const p = await api('import.preview', { type, rows });
      p.ignored = ignored;
      setPreview(p);
      setResolutions({});
    } catch (e) { setErr(e.message); setPreview(null); }
    setBusy(false);
  }

  async function commit() {
    setErr(''); setBusy(true);
    try {
      const { rows } = rowsFromInput();
      const r = await api('import.commit', {
        type, rows, resolutions, tagSlug: tagSlug || null, sourceFile: fileName || 'paste',
      });
      setDone(r);
      setPreview(null);
      setText('');
      setSheetRows(null);
      setSheetInfo(null);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  const reviewRows = preview?.results.filter((r) => r.status === 'review') || [];
  const errorRows = preview?.results.filter((r) => r.status === 'error') || [];
  const unresolved = reviewRows.filter((r) => !resolutions[r.i]).length;

  return (
    <div className="content">
      <h1>Import data</h1>
      <p className="lede">
        Every import is checked before anything is written, and can be undone afterwards
        from <b>Import batches</b> on the devotee screen.
      </p>

      {err && <div className="errbox">{err}</div>}

      {done && (
        <div className="okbox">
          <b>Imported {done.inserted} rows (batch #{done.batchId})</b>
          {done.created ? <> · {done.created} new devotee records created</> : null}
          {done.duplicates ? <> · {done.duplicates} already present, skipped</> : null}
          {done.skipped ? <> · {done.skipped} skipped</> : null}
        </div>
      )}

      <section className="card">
        <h2>1. What are you importing?</h2>
        <div className="typegrid">
          {Object.entries(IMPORT_TYPES).map(([k, t]) => (
            <button
              key={k}
              className={'typecard' + (type === k ? ' on' : '')}
              onClick={() => { setType(k); setPreview(null); setDone(null); }}
            >
              <b>{t.label}</b>
              <span>{t.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>2. Paste or choose the file</h2>
        <p className="hint">
          First row must be headers. Recognised columns for <b>{def.label}</b>:<br />
          {columns.map((c) => (
            <code key={c} className={def.required.includes(c) ? 'req' : ''}>{c}</code>
          ))}
          <br />
          {def.link === 'person' && (
            <>Include at least one of <code>person_no</code>, <code>email</code> or <code>mobile_number</code> so
            the row can be matched to a devotee. Include <code>full_name</code> too — if it disagrees with the
            record we find, the row is held for your review rather than linked blindly.<br /></>
          )}
          Dates must be <code>YYYY-MM-DD</code>. Unknown columns are ignored.
        </p>

        <input
          type="file" accept=".csv,.xlsx,.xlsm,text/csv"
          onChange={(e) => {
            const f = e.target.files[0]; if (!f) return;
            setFileName(f.name);
            setPreview(null);
            if (/\.xlsx?$|\.xlsm$/i.test(f.name)) {
              readSpreadsheet(f);
            } else {
              setSheetRows(null); setSheetInfo(null);
              const rd = new FileReader();
              rd.onload = () => setText(String(rd.result));
              rd.readAsText(f);
            }
          }}
        />

        {sheetInfo && (
          <div className="okbox">
            <b>Read {sheetRows.length} rows from “{sheetInfo.sheet}”</b>
            {sheetInfo.sheets.length > 1 && <> · other sheets in this file: {sheetInfo.sheets.filter((s) => s !== sheetInfo.sheet).join(', ')}</>}
            {sheetInfo.truncated && <> · <span className="warn">only the first 20,000 rows were read</span></>}
          </div>
        )}

        {!sheetRows && (
          <textarea
            rows={8} value={text} placeholder="or paste CSV here"
            onChange={(e) => { setText(e.target.value); setPreview(null); }}
          />
        )}

        {!def.forceTag && (
          <div className="fg">
            <label>Also tag every new devotee as</label>
            <select value={tagSlug} onChange={(e) => setTagSlug(e.target.value)}>
              <option value="">— none —</option>
              {tags.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </select>
          </div>
        )}
        {def.forceTag && (
          <p className="hint">Everyone imported here is automatically tagged <code>{def.forceTag}</code>.</p>
        )}

        <button className="p" disabled={busy || (!text.trim() && !sheetRows)} onClick={runPreview}>
          {busy ? 'Checking…' : 'Check the file'}
        </button>
      </section>

      {preview && (
        <section className="card">
          <h2>3. Review</h2>
          <div className="tally">
            <div className="t ok"><b>{preview.matched}</b><span>matched</span></div>
            {preview.willCreate > 0 && (
              <div className="t ok"><b>{preview.willCreate}</b><span>new donors</span></div>
            )}
            <div className="t warn"><b>{preview.review}</b><span>need a decision</span></div>
            {preview.duplicates > 0 && (
              <div className="t"><b>{preview.duplicates}</b><span>already imported</span></div>
            )}
            <div className="t bad"><b>{preview.errors}</b><span>errors</span></div>
          </div>

          {preview.duplicates > 0 && (
            <p className="hint">
              {preview.duplicates} row{preview.duplicates === 1 ? ' is' : 's are'} already in the
              database with the same source record id, so they will be skipped rather than counted twice.
            </p>
          )}
          {preview.willCreate > 0 && (
            <p className="hint">
              {preview.willCreate} row{preview.willCreate === 1 ? '' : 's'} matched no existing devotee.
              A new devotee will be created from the donor details on the row and flagged for review,
              so you can check them afterwards under <b>Needs review</b>.
            </p>
          )}

          {preview.ignored?.length > 0 && (
            <p className="hint">Ignored columns: {preview.ignored.join(', ')}</p>
          )}

          {errorRows.length > 0 && (
            <>
              <h3>Rows with errors — these will be skipped</h3>
              <table className="mini">
                <thead><tr><th>Row</th><th>Problem</th><th>Data</th></tr></thead>
                <tbody>
                  {errorRows.slice(0, 25).map((r) => (
                    <tr key={r.i}>
                      <td>{r.i + 2}</td>
                      <td className="bad">{r.message}</td>
                      <td className="dim">{Object.values(r.row).slice(0, 4).join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {errorRows.length > 25 && <p className="hint">…and {errorRows.length - 25} more.</p>}
            </>
          )}

          {reviewRows.length > 0 && (
            <>
              <h3>Need a decision {unresolved > 0 && <span className="warn">({unresolved} still undecided)</span>}</h3>
              <p className="hint">
                Anything left undecided is skipped, not guessed. Nothing here is written until you commit.
              </p>
              <table className="mini">
                <thead>
                  <tr><th>Row</th><th>From the file</th><th>Why</th><th>Decision</th></tr>
                </thead>
                <tbody>
                  {reviewRows.slice(0, 100).map((r) => (
                    <tr key={r.i}>
                      <td>{r.i + 2}</td>
                      <td>
                        <b>{r.row.full_name || '—'}</b>
                        <span className="dim">
                          {r.row.mobile_number ? ` · ${r.row.mobile_number}` : ''}
                          {r.row.email ? ` · ${r.row.email}` : ''}
                        </span>
                      </td>
                      <td className="warn">{REASON[r.reason] || r.reason}</td>
                      <td>
                        <select
                          value={resolutions[r.i]
                            ? (resolutions[r.i].action === 'create' ? 'create'
                              : resolutions[r.i].action === 'skip' ? 'skip'
                                : resolutions[r.i].personId)
                            : ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setResolutions((s) => {
                              const next = { ...s };
                              if (!v) delete next[r.i];
                              else if (v === 'create') next[r.i] = { action: 'create' };
                              else if (v === 'skip') next[r.i] = { action: 'skip' };
                              else next[r.i] = { action: 'link', personId: v };
                              return next;
                            });
                          }}
                        >
                          <option value="">— decide —</option>
                          {r.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              Link to #{c.person_no} {c.full_name}{c.city ? ` (${c.city})` : ''}
                            </option>
                          ))}
                          <option value="create">Create as a new devotee</option>
                          <option value="skip">Skip this row</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reviewRows.length > 100 && (
                <p className="hint">
                  Showing the first 100 of {reviewRows.length}. Commit these, then re-upload the rest.
                </p>
              )}
            </>
          )}

          <div className="actions">
            <button onClick={() => setPreview(null)}>Cancel</button>
            <button className="p" disabled={busy} onClick={commit}>
              {busy
                ? 'Importing…'
                : `Import ${preview.matched + (preview.willCreate || 0) + (reviewRows.length - unresolved)} rows`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
