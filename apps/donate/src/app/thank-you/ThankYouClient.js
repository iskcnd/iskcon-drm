'use client';
import { useEffect, useState } from 'react';
import { retryNextGateway } from '@/lib/launch';

const Conch = () => (
  <svg className="conch" viewBox="0 0 80 90" aria-hidden="true">
    <path d="M40 6 C58 10 66 26 64 44 C62 62 52 74 40 84 C28 74 18 62 16 44 C14 26 22 10 40 6Z" fill="#FDF6E3" stroke="#C9A227" strokeWidth="2" />
    <path d="M40 16 C51 20 56 30 55 43 C54 56 48 66 40 74 C32 66 26 56 25 43 C24 30 29 20 40 16Z" fill="none" stroke="#C9A227" strokeWidth="1.4" />
  </svg>
);

export default function ThankYouClient({
  status, receipt, token, donation, gateway, final, orderRef, txn,
}) {
  const ok = status === 'success';
  const [petals, setPetals] = useState([]);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  useEffect(() => {
    if (!ok || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setPetals(Array.from({ length: 14 }, (_, i) => ({
      id: i, glyph: ['🌸', '🌼', '✨'][i % 3],
      left: Math.random() * 100, dur: 4 + Math.random() * 4, delay: Math.random() * 3,
    })));
  }, [ok]);

  async function tryNext() {
    setRetrying(true); setRetryError('');
    try {
      await retryNextGateway(donation, gateway || 'payu');
    } catch (e) {
      setRetryError('All payment options are unavailable right now. Nothing was charged — please try again later, or contact the temple at 6385042108.');
      setRetrying(false);
    }
  }

  function share() {
    const text = encodeURIComponent('I just offered seva at ISKCON Chennai 🪔 Join me: https://donate.iskconchennai.org');
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }

  return (
    <div className="bless" role="main">
      {petals.map((p) => (
        <span key={p.id} className="petal" aria-hidden="true"
          style={{ left: p.left + '%', animationDuration: p.dur + 's', animationDelay: p.delay + 's' }}>{p.glyph}</span>
      ))}
      <Conch />
      <div className="diya" aria-hidden="true">🪔</div>
      {ok ? (
        <>
          <h1>Hare Krishna!</h1>
          <div className="b-name">Your seva has been offered.</div>
          <p>May Sri Sri Radha Krishna shower Their choicest blessings upon you and your family. Your offering is already on its way to His altar.</p>
          <div className="receipt-chip">
            🧾 Receipt <b>#{receipt}</b>
            {token ? <> · <a href={`/api/receipts/${receipt}?t=${token}`}>Download PDF</a></> : null}
            <br />Form 10BE (80G certificate) follows as per Income-tax rules.
          </div>
          <button className="btn-gold" onClick={share}>Share this joy on WhatsApp 💬</button>
        </>
      ) : status === 'reconciling' ? (
        /*
         * The gateway confirmed the payment and its signature verified — the
         * money left the donor's account. Something on our side then failed to
         * record it. Telling this donor "nothing was charged" is not a
         * reassurance, it is a false statement about their bank account, and
         * it is what they will quote when they call.
         */
        <>
          <h1>We have your offering</h1>
          <p>
            Your payment went through. A problem on our side is delaying the
            receipt, and the temple office has been alerted — your receipt will
            follow by WhatsApp and email.
          </p>
          {(orderRef || txn) ? (
            <div className="receiptbox">
              Keep this for reference:
              {orderRef ? <><br />Order <b>{orderRef}</b></> : null}
              {txn ? <><br />Transaction <b>{txn}</b></> : null}
            </div>
          ) : null}
          <p style={{ marginTop: 10 }}>
            Nothing more is needed from you. If you would rather speak to
            someone, call the temple on 6385042108.
          </p>
        </>
      ) : (
        <>
          <h1>{status === 'invalid' || status === 'error' ? 'Something went wrong' : 'The payment did not complete'}</h1>
          <p>Nothing was charged. Your seva intention is safe with us.</p>
          {retryError ? <p style={{ color: '#F0DFAE' }}>{retryError}</p> : null}
          {donation && !final && !retryError ? (
            <button className="btn-gold" onClick={tryNext} disabled={retrying}>
              {retrying ? 'Switching to a backup gateway…' : 'Try another payment option →'}
            </button>
          ) : null}
        </>
      )}
      <p style={{ marginTop: 14 }}><a href="/">← Back to sevas</a></p>
    </div>
  );
}
