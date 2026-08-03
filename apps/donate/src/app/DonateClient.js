'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { I18N } from '@/lib/i18n';
import { launchPayment, retryNextGateway } from '@/lib/launch';
import { parsePhone } from '@/lib/phone';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

function Mandala({ className }) {
  const petals = [];
  for (let i = 0; i < 12; i++) {
    const a = i * 30;
    petals.push(<path key={'a' + i} d="M100 26 C113 50 113 68 100 84 C87 68 87 50 100 26Z" fill="none" stroke="currentColor" strokeWidth="1.4" transform={`rotate(${a} 100 100)`} />);
    petals.push(<path key={'b' + i} d="M100 42 C107 56 107 66 100 76 C93 66 93 56 100 42Z" fill="none" stroke="currentColor" strokeWidth=".9" transform={`rotate(${a + 15} 100 100)`} />);
    petals.push(<circle key={'c' + i} cx="100" cy="18" r="2.4" fill="currentColor" transform={`rotate(${a + 15} 100 100)`} />);
  }
  return (
    <div className={className} aria-hidden="true">
      <svg viewBox="0 0 200 200">{petals}
        <circle cx="100" cy="100" r="14" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="100" cy="100" r="7" fill="currentColor" opacity=".45" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth=".8" />
        <circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" strokeWidth=".8" strokeDasharray="3 6" />
        <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="1 7" strokeLinecap="round" />
      </svg>
    </div>
  );
}

const Feather = (props) => (
  <svg viewBox="0 0 60 110" aria-hidden="true" {...props}>
    <path d="M30 108 C30 70 30 55 30 42" stroke="#7A5D10" strokeWidth="2" fill="none" />
    <ellipse cx="30" cy="30" rx="17" ry="24" fill="#2E6E63" /><ellipse cx="30" cy="32" rx="11" ry="16" fill="#C9A227" />
    <ellipse cx="30" cy="34" rx="6.5" ry="10" fill="#174D63" /><circle cx="30" cy="35" r="3" fill="#571617" />
  </svg>
);

export default function DonateClient({ categories, campaigns, videoId }) {
  const [lang, setLang] = useState('en');
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
  const tr = (obj) => (obj && (obj[lang] || obj.en)) || '';

  const [sel, setSel] = useState(null); // {kind:'category'|'campaign', item}
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(0);
  const [custom, setCustom] = useState('');
  const [sevaDate, setSevaDate] = useState('');
  const [monthly, setMonthly] = useState(true);
  const [phone, setPhone] = useState('');
  const [phoneInfo, setPhoneInfo] = useState(null);
  const [gateways, setGateways] = useState([]);
  const [gateway, setGateway] = useState('');
  const [triedGateways, setTriedGateways] = useState([]);
  const [people, setPeople] = useState(null);
  const [personId, setPersonId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', addressLine: '', pincode: '', pan: '', whatsappOptin: true, prasadam: false });
  const [needsAddressOnly, setNeedsAddressOnly] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sheetRef = useRef(null);
  const lastFocus = useRef(null);
  const pbar = useRef(null);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // campaign progress animation
  const camp = campaigns[0];
  useEffect(() => {
    if (!camp || !pbar.current) return;
    const pct = camp.goal_amount ? Math.min(100, (camp.raised / camp.goal_amount) * 100) : 0;
    const el = pbar.current;
    const io = new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { el.style.width = pct + '%'; o.disconnect(); } });
    io.observe(el);
    return () => io.disconnect();
  }, [camp]);

  const presets = useMemo(() => (sel ? (sel.item.presets || []) : []), [sel]);
  const isMonthlyCat = sel?.kind === 'category' && sel.item.kind === 'monthly';
  const isDatedCat = sel?.kind === 'category' && sel.item.kind === 'dated';

  function openSheet(kind, item) {
    lastFocus.current = document.activeElement;
    setSel({ kind, item });
    const p = item.presets || [];
    setAmount(p[1]?.amount || p[0]?.amount || item.min_amount || 501);
    setCustom(''); setStep(1); setError(''); setPeople(null); setPersonId(null); setNeedsAddressOnly(false);
    setPhone('');
    setTimeout(() => sheetRef.current?.focus(), 60);
  }
  function closeSheet() { setSel(null); lastFocus.current?.focus?.(); }

  useEffect(() => {
    const onKey = (e) => {
      if (!sel) return;
      if (e.key === 'Escape') closeSheet();
      if (e.key === 'Tab' && sheetRef.current) {
        const f = [...sheetRef.current.querySelectorAll('button,[href],input,select')].filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sel]);

  /**
   * Accepts the number in whatever shape the donor types it. Nothing is
   * rejected while typing — the parser decides when it's complete, and only
   * then do we look anyone up.
   */
  async function lookup(v) {
    setPhone(v);
    setPeople(null); setPersonId(null);

    const parsed = parsePhone(v);
    setPhoneInfo(parsed);
    if (!parsed.ok) return;

    try {
      const r = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mobile: parsed.e164 }),
      });
      const d = await r.json();
      if (r.ok && d.people?.length) setPeople(d.people);
    } catch { /* lookup is best-effort */ }
  }

  // Which payment options are actually usable. Loaded once.
  useEffect(() => {
    fetch('/api/gateways')
      .then((r) => r.json())
      .then((d) => {
        setGateways(d.gateways || []);
        setGateway((g) => g || d.gateways?.[0]?.id || '');
      })
      .catch(() => { /* the pay step shows its own message if this fails */ });
  }, []);

  async function submitDonation() {
    const parsed = parsePhone(phone);
    if (!personId && !parsed.ok) {
      setError(parsed.reason);
      setStep(2);
      return;
    }
    setBusy(true); setError('');
    const body = {
      categorySlug: sel.kind === 'category' ? sel.item.slug : null,
      campaignSlug: sel.kind === 'campaign' ? sel.item.slug : null,
      amount,
      sevaDate: isDatedCat ? sevaDate || null : null,
      isRecurring: isMonthlyCat && monthly,
      prasadam: form.prasadam,
      gateway,
      personId,
      newPerson: personId
        ? (needsAddressOnly ? { addressLine: form.addressLine, pincode: form.pincode, pan: form.pan || null } : null)
        : {
          name: form.name,
          mobile: parsed.national,
          cc: parsed.cc,
          email: form.email || null,
          pan: form.pan || null,
          whatsappOptin: form.whatsappOptin,
          addressLine: form.addressLine,
          pincode: form.pincode,
        },
    };
    try {
      const r = await fetch('/api/donations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) {
        if (/address/i.test(data.error || '')) { setNeedsAddressOnly(true); setStep(2); setError(t('addressneeded')); }
        else setError(data.error || 'Something went wrong. Nothing was charged.');
        setBusy(false);
        return;
      }
      // Remember what's been attempted so the donor is offered something new,
      // and so the buttons can show "already tried".
      setTriedGateways((s) => (s.includes(data.gateway) ? s : [...s, data.gateway]));

      launchPayment(data, {
        onRazorpayDone: () => setBusy(false),
        onRazorpayFail: () => {
          setError(t('payfailed'));
          retryNextGateway(data.donationId, data.gateway).catch(() =>
            window.location.assign(`/thank-you?status=failed&donation=${data.donationId}&final=1`));
        },
      });
    } catch {
      setError('Network error. Nothing was charged — please try again.');
      setBusy(false);
    }
  }

  const chosenImpact = presets.find((p) => p.amount === amount);

  return (
    <>
      <Mandala className="mandala mandala-tl" /><Mandala className="mandala mandala-br" />
      <Mandala className="mandala mandala-ml" /><Mandala className="mandala mandala-mr" />

      <div className="page">
        <header className="site">
          <div className="h-inner">
            <div className="crest"><img src="/logo.png" alt="ISKCON Chennai lotus emblem" /></div>
            <div className="brand"><b>ISKCON Chennai</b><span>{t('tagline')}</span></div>
            <nav className="lang" aria-label="Language">
              {['en', 'ta', 'hi'].map((l) => (
                <button key={l} lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
                  {l === 'en' ? 'EN' : l === 'ta' ? 'தமிழ்' : 'हिंदी'}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main>
          <div className="hero">
            <div className="video-ph" role="img" aria-label="Darshan at ISKCON Chennai" />
            {videoId ? (
              <iframe className="hero-video" title="ISKCON Chennai darshan video" tabIndex={-1} aria-hidden="true"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&playsinline=1&rel=0&modestbranding=1`}
                allow="autoplay; encrypted-media" />
            ) : null}
            <div className="hero-txt">
              <div className="verse" lang="sa">{t('heroverse')}</div>
              <h1>{t('herotitle')}</h1>
              <p>{t('herosub')}</p>
              <a href="#sevas" className="btn-gold">{t('herocta')}</a>
            </div>
          </div>

          <div className="garland" aria-hidden="true" />

          <div className="content">
            <div className="divider" aria-hidden="true"><Feather /></div>

            {camp ? (
              <div className="section">
                <div className="campaign">
                  <Feather className="corner-feather" />
                  <span className="badge">{t('livecampaign')}</span>
                  <h3>{tr(camp.title_i18n)}</h3>
                  <p className="c-line">{tr(camp.line_i18n)}</p>
                  <div className="progress-wrap" role="progressbar" aria-valuenow={camp.goal_amount ? Math.round((camp.raised / camp.goal_amount) * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
                    <div className="progress-bar" ref={pbar} />
                  </div>
                  <div className="c-stats">
                    <div><b>{fmt(camp.raised)}</b><span>{t('raised')} {fmt(camp.goal_amount)}</span></div>
                    <div style={{ textAlign: 'center' }}><b>{camp.donors.toLocaleString('en-IN')}</b><span>{t('donors')}</span></div>
                    <div style={{ textAlign: 'right' }}><b>{camp.ends_on ? Math.max(0, Math.ceil((new Date(camp.ends_on) - Date.now()) / 86400000)) : '—'}</b><span>{t('daysleft')}</span></div>
                  </div>
                  <button className="btn-gold" onClick={() => openSheet('campaign', camp)}>{t('campcta')}</button>
                </div>
              </div>
            ) : null}

            <div className="section" id="sevas">
              <h2 className="sec-title">{t('choosetitle')}</h2>
              <p className="sec-sub">{t('choosesub')}</p>
              <svg className="flute-motif" viewBox="0 0 200 40" aria-hidden="true">
                <rect x="8" y="16" width="184" height="9" rx="4.5" fill="#C9A227" /><rect x="8" y="16" width="184" height="4" rx="2" fill="#E7BE45" />
                {[60, 78, 96, 114, 132, 150].map((cx) => <circle key={cx} cx={cx} cy="20.5" r="2.2" fill="#571617" />)}
              </svg>
            </div>

            <div className="seva-wrap">
              <Mandala className="cats-mandala" />
              <div className="cats">
                {categories.map((c) => (
                  <button key={c.slug} className="cat" onClick={() => openSheet('category', c)}>
                    {c.tag ? <span className="tagpill">{c.tag}</span> : null}
                    <span className="arch"><span className="icon" aria-hidden="true">{c.icon}</span></span>
                    <h3>{tr(c.name_i18n) || c.slug}</h3>
                    <p>{tr(c.line_i18n)}</p>
                    <span className="from">{t('offer')} {fmt((c.presets?.[0]?.amount) || c.min_amount)}+</span>
                  </button>
                ))}
              </div>
            </div>

            <ul className="trust">
              <li><b aria-hidden="true">🧾</b><span>{t('t80g')}</span></li>
              <li><b aria-hidden="true">🔒</b><span>{t('tsecure')}</span></li>
              <li><b aria-hidden="true">⚡</b><span>{t('treceipt')}</span></li>
              <li><b aria-hidden="true">🛕</b><span>{t('tdirect')}</span></li>
            </ul>

            <div className="quote">
              <div className="sk" lang="sa">दातव्यमिति यद्दानं दीयतेऽनुपकारिणे ।<br />देशे काले च पात्रे च तद्दानं सात्त्विकं स्मृतम् ॥</div>
              <div className="tr">{t('gitatr')}</div>
              <div className="ref">Bhagavad-gītā 17.20</div>
            </div>
          </div>
        </main>

        <footer className="site">
          <b>ISKCON Chennai</b> — Hare Krishna Land, Off ECR, Bhaktivedanta Swami Rd., Akkarai, Sholinghanallur, Chennai - 600119<br />
          {t('foot80g')}<br />
          Unique Regn. No. (80G): AAATI0017PF20219 · Regd. under Maharashtra Public Trust Act 1950, Regn. No. F-2179 (Bom)<br />
          info@iskconchennai.org · Mobile: 6385042108<br /><br />
          {t('footind')}
        </footer>

        {!sel && categories.length ? (
          <div className="sticky-cta"><button onClick={() => openSheet('category', categories[0])}>{t('stickybtn')}</button></div>
        ) : null}
      </div>

      {/* ============ FLOW SHEET ============ */}
      <div className={'sheet-mask' + (sel ? ' open' : '')} onClick={closeSheet} />
      <div className={'sheet' + (sel ? ' open' : '')} role="dialog" aria-modal="true" aria-labelledby="sheetTitle" tabIndex={-1} ref={sheetRef}>
        {sel ? (
          <>
            <div className="sheet-head">
              <div className="handle" aria-hidden="true" />
              <h2 id="sheetTitle">{sel.kind === 'campaign' ? tr(sel.item.title_i18n) : tr(sel.item.name_i18n)} {sel.item.icon || '🪔'}</h2>
              <button className="x" onClick={closeSheet} aria-label={t('close')}>✕</button>
            </div>
            <div className="sheet-body">
              <div className="steps" aria-hidden="true">{[1, 2, 3].map((n) => <i key={n} className={step >= n ? 'done' : ''} />)}</div>
              {error ? <div className="err" role="alert">{error}</div> : null}

              {step === 1 ? (
                <div>
                  <p className="emo-line">{tr(sel.item.emo_i18n) || tr(sel.item.line_i18n)}</p>
                  <div className="amounts">
                    {presets.map((p) => (
                      <button key={p.amount} className="amt" aria-pressed={amount === p.amount && !custom}
                        onClick={() => { setAmount(p.amount); setCustom(''); }}>
                        <b>{fmt(p.amount)}</b><span>{tr(p.impact)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="custom-amt"><span aria-hidden="true">₹</span>
                    <input type="tel" inputMode="numeric" placeholder={t('customph')} aria-label={t('customph')} value={custom}
                      onChange={(e) => { setCustom(e.target.value); const v = parseInt(e.target.value || 0); if (v > 0) setAmount(v); }} />
                  </div>
                  {isDatedCat ? (
                    <div className="field">
                      <label htmlFor="sevaDate">{t('sevadate')}</label>
                      <input type="date" id="sevaDate" value={sevaDate} onChange={(e) => setSevaDate(e.target.value)} />
                      <div className="hint">{t('sevadatehint')}</div>
                    </div>
                  ) : null}
                  {isMonthlyCat ? (
                    <div className="check">
                      <input type="checkbox" id="monthlyChk" checked={monthly} onChange={(e) => setMonthly(e.target.checked)} />
                      <label htmlFor="monthlyChk">{t('monthlytxt')}</label>
                    </div>
                  ) : null}
                  <button className="btn-pay" onClick={() => { setError(''); setStep(2); }}>{t('continue')}</button>
                </div>
              ) : null}

              {step === 2 ? (
                <div>
                  <p className="emo-line">{t('phoneline')}</p>
                  <div className="field">
                    <label htmlFor="phone">{t('mobile')}</label>
                    {/* No maxLength: it silently truncated "+91 98400 12345"
                        to "+918807356" and the donor never saw why it failed.
                        inputMode="tel" keeps "+" available on phone keypads. */}
                    <input
                      type="tel" id="phone" inputMode="tel" autoComplete="tel"
                      placeholder="98400 12345  ·  +91 98400 12345  ·  +1 415 555 0199"
                      value={phone} onChange={(e) => lookup(e.target.value)}
                      aria-describedby="phoneHint"
                      aria-invalid={phone.length > 3 && phoneInfo && !phoneInfo.ok ? 'true' : undefined}
                    />
                    <div className="hint" id="phoneHint">
                      {phoneInfo?.ok
                        ? `✓ ${phoneInfo.pretty}`
                        : (phone.length > 3 && phoneInfo?.reason) || t('mobilehint')}
                    </div>
                  </div>

                  {people && !personId ? (
                    <div className="masked-card">
                      <div className="mc-title">{t('welcomeback')}</div>
                      <p className="mc-prompt">{t('whoisthis')}</p>
                      {people.map((p) => (
                        <button key={p.person_id} className="mc-person" onClick={() => { setPersonId(p.person_id); setError(''); setStep(3); }}>
                          <span className="av" aria-hidden="true">🙏</span>
                          <span><b>{p.mask}</b><span>{p.area}</span></span>
                          <span className="go" aria-hidden="true">→</span>
                        </button>
                      ))}
                      <button className="btn-line" onClick={() => setPeople(null)}>{t('someonenew')}</button>
                    </div>
                  ) : null}

                  {(!people || needsAddressOnly) ? (
                    <div>
                      {!needsAddressOnly ? (
                        <>
                          <div className="field"><label htmlFor="fname">{t('fullname')}</label>
                            <input id="fname" placeholder={t('fullnameph')} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                          <div className="field"><label htmlFor="femail">{t('email')}</label>
                            <input id="femail" type="email" placeholder="you@example.com" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                        </>
                      ) : null}
                      <div className="row2">
                        <div className="field" style={{ flex: 2 }}><label htmlFor="faddr">{t('addrlabel')}</label>
                          <input id="faddr" placeholder={t('addrph')} autoComplete="street-address" value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} /></div>
                        <div className="field" style={{ flex: 1 }}><label htmlFor="fpin">{t('pinlabel')}</label>
                          <input id="fpin" type="tel" inputMode="numeric" maxLength={6} placeholder="600119" autoComplete="postal-code" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
                      </div>
                      <div className="nudge" dangerouslySetInnerHTML={{ __html: t('pannudge') }} />
                      <div className="field"><label htmlFor="fpan">{t('panlabel')}</label>
                        <input id="fpan" placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} autoComplete="off" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} /></div>
                      {!needsAddressOnly ? (
                        <>
                          <div className="check"><input type="checkbox" id="wapp" checked={form.whatsappOptin} onChange={(e) => setForm({ ...form, whatsappOptin: e.target.checked })} />
                            <label htmlFor="wapp">{t('wapptxt')}</label></div>
                          <div className="check"><input type="checkbox" id="pras" checked={form.prasadam} onChange={(e) => setForm({ ...form, prasadam: e.target.checked })} />
                            <label htmlFor="pras">{t('prasadamtxt')}</label></div>
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  <button className="btn-pay" onClick={() => { setError(''); setStep(3); }}>{t('topay')}</button>
                </div>
              ) : null}

              {step === 3 ? (
                <div>
                  <div className="summary">
                    <div className="s-row"><span>{sel.kind === 'campaign' ? tr(sel.item.title_i18n) : tr(sel.item.name_i18n)}</span><span>{chosenImpact ? tr(chosenImpact.impact) : ''}</span></div>
                    {isDatedCat && sevaDate ? <div className="s-row"><span>{t('sevadateshort')}</span><span>{sevaDate}</span></div> : null}
                    <div className="s-row total"><span>{t('youroffering')}</span><span>{fmt(amount)}{isMonthlyCat && monthly ? ' ' + t('permonth') : ''}</span></div>
                  </div>
                  {/* Real choices, driven by /api/gateways. Previously the
                      alternatives were aria-disabled decoration, so a donor
                      whose card failed on PayU had no way forward. */}
                  {gateways.length > 1 && <p className="failsafe">{t('choosegateway') || 'Choose how to pay'}</p>}

                  {gateways.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className={'gateway' + (gateway === g.id ? ' primary' : '')}
                      aria-pressed={gateway === g.id}
                      onClick={() => setGateway(g.id)}
                      disabled={busy}
                    >
                      <span className={`gw-logo gw-${g.id}`} aria-hidden="true">{g.label}</span>
                      <span>
                        <b>{g.label}</b>
                        <span>
                          {g.note}
                          {triedGateways.includes(g.id) ? ' · already tried' : ''}
                        </span>
                      </span>
                    </button>
                  ))}

                  {gateways.length === 0 && (
                    <p className="failsafe">
                      No payment method is available at the moment. Please try again shortly.
                    </p>
                  )}

                  <button
                    className="btn-pay"
                    onClick={submitDonation}
                    disabled={busy || !gateway || gateways.length === 0}
                  >
                    {busy ? t('paybusy') : `🪔 ${t('offer')} ${fmt(amount)}`}
                  </button>
                  <p className="secure-line">{t('secureline')}</p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
