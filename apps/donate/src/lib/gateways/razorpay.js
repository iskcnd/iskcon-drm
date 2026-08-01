import { hmac256, safeEqual } from '../util.js';

// Razorpay Orders + Checkout.js flow. We create the order server-side; the
// client opens checkout with the order_id; verification is
// HMAC-SHA256(order_id + "|" + payment_id, key_secret) === razorpay_signature.

export async function buildRequest({ orderRef, amount, name, email, phone, donationId }) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not configured');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      authorization: 'Basic ' + Buffer.from(`${keyId}:${secret}`).toString('base64'),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(Number(amount) * 100), // paise
      currency: 'INR',
      receipt: orderRef,
      notes: { donation_id: String(donationId) },
    }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
  const order = await res.json();
  return {
    method: 'checkout-js',
    keyId,
    orderId: order.id,
    amount: order.amount,
    currency: 'INR',
    prefill: { name, email, contact: phone },
  };
}

export function verifySignature({ order_id, payment_id, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return safeEqual(hmac256(`${order_id}|${payment_id}`, secret), signature);
}
