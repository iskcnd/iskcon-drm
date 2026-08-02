'use client';

import { useEffect, useState } from 'react';

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
const today = () => new Date().toISOString().slice(0, 10);
const pretty = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN',
  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default function SevaClient() {
  const [date, setDate] = useState(today());
  const [days, setDays] = useState(1);
  const [team, setTeam] = useState('kitchen');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setD(null); setErr('');
    api('seva.daySheet', { date, days }).then(setD).catch((e) => setErr(e.message));
  }, [date, days]);

  return (
    <div className="content">
      <div className="head no-print">
        <div>
          <h1>Seva operations</h1>
          <p className="lede">
            What is booked, by the date the seva is performed — not the date it was paid for.
          </p>
        </div>
        <div className="headctl">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select value={days} onChange={(e) => setDays(+e.target.value)}>
            <option value={1}>That day</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
          </select>
          <button className="p" onClick={() => window.print()}>Print day sheet</button>
        </div>
      </div>

      <nav className="tabs no-print">
        <button className={'tab' + (team === 'kitchen' ? ' on' : '')} onClick={() => setTeam('kitchen')}>Kitchen</button>
        <button className={'tab' + (team === 'pujari' ? ' on' : '')} onClick={() => setTeam('pujari')}>Pujari</button>
      </nav>

      {err && <div className="errbox">{err}</div>}
      {!d && !err && <p className="dim">Loading…</p>}

      {d && (
        <>
          <div className="printhead">
            <h2>{team === 'kitchen' ? 'Kitchen' : 'Pujari'} day sheet</h2>
            <p>{pretty(d.date)}{d.days > 1 ? ` — next ${d.days} days` : ''}</p>
          </div>

          <div className="kpis">
            <div className="kpi"><b>{d.totals.bookings}</b><span>Bookings</span></div>
            <div className="kpi"><b>{inr(d.totals.total)}</b><span>Value</span></div>
          </div>

          {team === 'kitchen' ? (
            d.kitchen.length === 0
              ? <div className="empty">Nothing booked for this date.</div>
              : (
                <table className="mini sheet">
                  <thead>
                    <tr><th>Date</th><th>Seva</th><th>Type</th><th className="num">Bookings</th>
                      <th className="num">Value</th><th>Sponsors</th></tr>
                  </thead>
                  <tbody>
                    {d.kitchen.map((r, i) => (
                      <tr key={i}>
                        <td>{String(r.seva_date).slice(0, 10)}</td>
                        <td><b>{r.seva_category || '—'}</b></td>
                        <td>{r.seva_type || '—'}</td>
                        <td className="num">{r.bookings}</td>
                        <td className="num">{inr(r.total_amount)}</td>
                        <td>{r.sponsors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          ) : (
            d.pujari.length === 0
              ? <div className="empty">Nothing booked for this date.</div>
              : (
                <table className="mini sheet">
                  <thead>
                    <tr><th>Date</th><th>Seva</th><th>Sponsor</th><th>Archana for</th>
                      <th>Gotra</th><th>Nakshatra</th><th>Rashi</th><th>Receipt</th></tr>
                  </thead>
                  <tbody>
                    {d.pujari.map((r, i) => (
                      <tr key={i}>
                        <td>{String(r.seva_date).slice(0, 10)}</td>
                        <td><b>{r.seva_category || '—'}</b>{r.seva_type ? <span className="dim"> {r.seva_type}</span> : null}</td>
                        <td>{r.sponsor}<span className="dim"> #{r.person_no}</span></td>
                        <td>{r.archana_for || <span className="dim">—</span>}
                          {r.relation ? <span className="dim"> ({r.relation})</span> : null}</td>
                        <td>{r.gotra || <span className="dim">—</span>}</td>
                        <td>{r.nakshatra || <span className="dim">—</span>}</td>
                        <td>{r.rashi || <span className="dim">—</span>}</td>
                        <td className="dim">{r.receipt_no || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          )}

          <p className="hint no-print">
            Archana details are optional on the donation form. Blank columns mean the donor
            didn&apos;t supply them, not that something is missing from the system.
          </p>
        </>
      )}
    </div>
  );
}
