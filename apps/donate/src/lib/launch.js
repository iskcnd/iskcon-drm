'use client';

/** Launches whatever /api/donations (or /retry) returned. Shared by the main
 *  page and the thank-you retry flow. */
export function launchPayment(res, { onRazorpayDone, onRazorpayFail } = {}) {
  const p = res.payment;
  if (!p) throw new Error('No payment payload');

  if (p.method === 'redirect') {
    window.location.assign(p.url);
    return;
  }
  if (p.method === 'POST') {
    // PayU hosted checkout: build and submit a real form.
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = p.action;
    Object.entries(p.fields).forEach(([k, v]) => {
      const i = document.createElement('input');
      i.type = 'hidden'; i.name = k; i.value = v;
      form.appendChild(i);
    });
    document.body.appendChild(form);
    form.submit();
    return;
  }
  if (p.method === 'checkout-js') {
    loadRazorpay().then(() => {
      const rzp = new window.Razorpay({
        key: p.keyId,
        order_id: p.orderId,
        amount: p.amount,
        currency: p.currency,
        name: 'ISKCON Chennai',
        description: 'Seva Offering',
        prefill: p.prefill,
        theme: { color: '#571617' },
        handler: async (r) => {
          const v = await fetch('/api/payments/razorpay/verify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ orderRef: res.orderRef, ...r }),
          }).then((x) => x.json());
          if (v.ok && v.status === 'paid') {
            window.location.assign(`/thank-you?status=success&receipt=${encodeURIComponent(v.receiptNo)}&t=${v.receiptToken}`);
          } else if (onRazorpayFail) onRazorpayFail();
        },
        modal: {
          ondismiss: async () => {
            await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ orderRef: res.orderRef, failed: true }),
            }).catch(() => {});
            if (onRazorpayFail) onRazorpayFail();
          },
        },
      });
      rzp.open();
      if (onRazorpayDone) onRazorpayDone();
    });
  }
}

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

/**
 * Failure → try another gateway.
 *
 * `gateway` forces a specific one (the donor chose it). Otherwise the server
 * picks the next enabled option not in `tried`. Carrying `tried` is what stops
 * a donor bouncing between the same two gateways indefinitely.
 */
export async function retryNextGateway(donationId, failedGateway, hooks, opts = {}) {
  const tried = opts.tried || [failedGateway].filter(Boolean);
  const r = await fetch(`/api/donations/${donationId}/retry`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ failedGateway, tried, gateway: opts.gateway || undefined }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'No fallback available');

  const nextTried = tried.includes(data.gateway) ? tried : [...tried, data.gateway];
  launchPayment(data, {
    ...hooks,
    onRazorpayFail: () => retryNextGateway(donationId, data.gateway, hooks, { tried: nextTried })
      .catch(() => {
        window.location.assign(`/thank-you?status=failed&donation=${donationId}&gateway=${data.gateway}&final=1`);
      }),
  });
  return data;
}

/** The options a donor can still try, for the failure screen. */
export async function availableGateways() {
  try {
    const r = await fetch('/api/gateways');
    const d = await r.json();
    return d.gateways || [];
  } catch { return []; }
}
