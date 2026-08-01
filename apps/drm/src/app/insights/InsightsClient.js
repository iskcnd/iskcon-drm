'use client';

import { useEffect, useRef, useState } from 'react';

const INK = '#141413';
const MUTED = '#6b6b68';
const GRID = '#e5e4df';
const SERIES = ['#B4633F', '#2F6F4E', '#8A6410', '#4A6D8C', '#8C5A7A', '#6B7A46', '#9B5232', '#4F6F70'];

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
const monthLabel = (ym) => {
  const [y, m] = String(ym).split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};

/** Wraps a Chart.js canvas. Charts are destroyed and rebuilt when data changes. */
function Chart({ type, data, options, height = 240 }) {
  const ref = useRef(null);
  const chart = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { default: ChartJS } = await import('chart.js/auto');
      if (!alive || !ref.current) return;
      chart.current?.destroy();
      chart.current = new ChartJS(ref.current, {
        type,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: type !== 'bar' && type !== 'line', labels: { color: MUTED, boxWidth: 10, font: { size: 11 } } },
            tooltip: { backgroundColor: INK, padding: 10, cornerRadius: 6 },
          },
          scales: (type === 'doughnut' || type === 'pie') ? undefined : {
            x: { grid: { display: false }, ticks: { color: MUTED, font: { size: 11 } } },
            y: { grid: { color: GRID }, ticks: { color: MUTED, font: { size: 11 } }, beginAtZero: true },
          },
          ...options,
        },
      });
    })();
    return () => { alive = false; chart.current?.destroy(); chart.current = null; };
  }, [type, data, options]);

  return <div style={{ height }}><canvas ref={ref} /></div>;
}

export default function InsightsClient({ role }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [months, setMonths] = useState(12);
  const [exporting, setExporting] = useState('');
  const canExport = ['module_manager', 'super_admin'].includes(role);

  useEffect(() => {
    setD(null); setErr('');
    api('analytics.overview', { months })
      .then(setD)
      .catch((e) => setErr(e.message));
  }, [months]);

  async function exportXlsx(kind) {
    setExporting(kind);
    try {
      const r = await fetch(`/api/export?type=${kind}`);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Export failed (${r.status})`);
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `iskcon-drm-${kind}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { setErr(e.message); }
    setExporting('');
  }

  if (err) return <div className="content"><div className="errbox">{err}</div></div>;
  if (!d) return <div className="content"><p className="dim">Loading insights…</p></div>;

  const h = d.headline;
  const bar = (labels, values, label) => ({
    labels,
    datasets: [{ label, data: values, backgroundColor: SERIES[0], borderRadius: 4, maxBarThickness: 38 }],
  });

  return (
    <div className="content">
      <div className="head">
        <div>
          <h1>Insights</h1>
          <p className="lede">Everything here is read-only. The devotee screen is where you edit.</p>
        </div>
        <div className="headctl">
          <select value={months} onChange={(e) => setMonths(+e.target.value)}>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
            <option value={36}>Last 36 months</option>
          </select>
          {canExport && (
            <>
              <button disabled={!!exporting} onClick={() => exportXlsx('devotees')}>
                {exporting === 'devotees' ? 'Building…' : 'Export devotees (xlsx)'}
              </button>
              <button disabled={!!exporting} onClick={() => exportXlsx('donations')}>
                {exporting === 'donations' ? 'Building…' : 'Export donations (xlsx)'}
              </button>
              <button className="p" disabled={!!exporting} onClick={() => exportXlsx('full')}>
                {exporting === 'full' ? 'Building…' : 'Export everything'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="kpis">
        <Kpi label="Devotees" value={Number(h.people).toLocaleString('en-IN')} />
        <Kpi label="Total raised" value={inr(h.total_raised)} />
        <Kpi label="This month" value={inr(h.this_month)} />
        <Kpi label="Donors" value={Number(h.donors).toLocaleString('en-IN')} />
        <Kpi label="Average gift" value={inr(h.avg_gift)} />
        <Kpi label="Lapsed donors" value={d.lapsedDonors} hint="No gift in 12 months" />
      </div>

      <section className="card">
        <h2>Donations</h2>
        <div className="two">
          <Panel title="Received per month">
            {d.donationsByMonth.length ? (
              <Chart
                type="line"
                data={{
                  labels: d.donationsByMonth.map((r) => monthLabel(r.month)),
                  datasets: [{
                    label: 'Total',
                    data: d.donationsByMonth.map((r) => Number(r.total)),
                    borderColor: SERIES[0], backgroundColor: 'rgba(180,99,63,.10)',
                    fill: true, tension: 0.3, pointRadius: 3,
                  }],
                }}
              />
            ) : <Empty />}
          </Panel>

          <Panel title="By seva category">
            {d.donationsBySeva.length ? (
              <Chart
                type="doughnut"
                data={{
                  labels: d.donationsBySeva.map((r) => r.seva),
                  datasets: [{
                    data: d.donationsBySeva.map((r) => Number(r.total)),
                    backgroundColor: SERIES, borderWidth: 0,
                  }],
                }}
                options={{ plugins: { legend: { position: 'right', labels: { color: MUTED, boxWidth: 10, font: { size: 11 } } } } }}
              />
            ) : <Empty />}
          </Panel>
        </div>

        <div className="two">
          <Panel title="Top donors">
            <Table
              head={['Devotee', 'Gifts', 'Total']}
              rows={d.topDonors.map((r) => [
                `#${r.person_no} ${r.display_name}`, r.gifts, inr(r.total),
              ])}
            />
          </Panel>
          <Panel title="How they gave">
            <Table
              head={['Channel', 'Gifts', 'Total']}
              rows={d.gatewaySplit.map((r) => [r.gateway, r.gifts, inr(r.total)])}
            />
          </Panel>
        </div>
      </section>

      <section className="card">
        <h2>Devotees</h2>
        <div className="two">
          <Panel title="New records per month">
            {d.growth.length
              ? <Chart type="bar" data={bar(d.growth.map((r) => monthLabel(r.month)), d.growth.map((r) => Number(r.added)), 'Added')} />
              : <Empty />}
          </Panel>
          <Panel title="By area">
            {d.byArea.length
              ? <Chart type="bar" data={bar(d.byArea.map((r) => r.area), d.byArea.map((r) => Number(r.n)), 'Devotees')} />
              : <Empty />}
          </Panel>
        </div>
        <div className="two">
          <Panel title="Age bands">
            {d.byAge.length
              ? <Chart type="bar" data={bar(d.byAge.map((r) => r.band), d.byAge.map((r) => Number(r.n)), 'Devotees')} height={200} />
              : <Empty />}
          </Panel>
          <Panel title="Preferred language">
            {d.byLanguage.length
              ? <Chart
                  type="doughnut" height={200}
                  data={{
                    labels: d.byLanguage.map((r) => r.lang),
                    datasets: [{ data: d.byLanguage.map((r) => Number(r.n)), backgroundColor: SERIES, borderWidth: 0 }],
                  }}
                  options={{ plugins: { legend: { position: 'right', labels: { color: MUTED, boxWidth: 10, font: { size: 11 } } } } }}
                />
              : <Empty />}
          </Panel>
        </div>
      </section>

      <section className="card">
        <h2>Categories</h2>
        {d.segments.length ? (
          <Chart
            type="bar"
            height={Math.max(220, d.segments.length * 26)}
            data={{
              labels: d.segments.map((s) => s.name),
              datasets: [{
                label: 'People',
                data: d.segments.map((s) => Number(s.n)),
                backgroundColor: SERIES[1], borderRadius: 4,
              }],
            }}
            options={{ indexAxis: 'y' }}
          />
        ) : <Empty />}
      </section>

      <section className="card">
        <h2>Data quality</h2>
        <p className="hint">
          These are the gaps that quietly break things later — a devotee with no mobile can&apos;t be
          messaged, and no opt-in means you shouldn&apos;t message them at all.
        </p>
        <div className="quality">
          <Q label="Missing mobile" n={d.quality.no_mobile} total={d.quality.total} bad />
          <Q label="Missing email" n={d.quality.no_email} total={d.quality.total} />
          <Q label="Missing date of birth" n={d.quality.no_dob} total={d.quality.total} />
          <Q label="Missing area" n={d.quality.no_area} total={d.quality.total} />
          <Q label="Shared mobile numbers" n={d.quality.shared_mobiles} total={d.quality.total} />
          <Q label="Uncategorised" n={d.quality.untagged} total={d.quality.total} />
          <Q label="WhatsApp opt-in" n={d.quality.whatsapp_ok} total={d.quality.total} good />
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint }) {
  return (
    <div className="kpi">
      <b>{value}</b>
      <span>{label}</span>
      {hint && <em>{hint}</em>}
    </div>
  );
}

function Panel({ title, children }) {
  return <div className="panel"><h3>{title}</h3>{children}</div>;
}

function Empty() {
  return <p className="dim" style={{ padding: '30px 0', textAlign: 'center' }}>No data yet.</p>;
}

function Table({ head, rows }) {
  if (!rows.length) return <Empty />;
  return (
    <table className="mini">
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j} className={j ? 'num' : ''}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function Q({ label, n, total, bad, good }) {
  const pct = total ? Math.round((Number(n) / Number(total)) * 100) : 0;
  return (
    <div className="qrow">
      <span className="qlabel">{label}</span>
      <span className="qbar">
        <span
          className={'qfill' + (good ? ' good' : bad && pct > 20 ? ' bad' : '')}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </span>
      <span className="qval">{Number(n).toLocaleString('en-IN')} <em>{pct}%</em></span>
    </div>
  );
}
