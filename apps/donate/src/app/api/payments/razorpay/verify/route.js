import { razorpay } from '@/lib/gateways';
import { markPaid, markAttemptFailed } from '@/lib/ops-donate';
import { json, bad } from '@/lib/util';

/**
 * Razorpay Checkout hands the browser payment_id + signature; the client posts
 * them here with our orderRef. Signature is verified server-side before anything
 * is marked paid.
 */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return bad('Invalid JSON'); }
  const { orderRef, razorpay_order_id, razorpay_payment_id, razorpay_signature, failed } = body;
  if (!orderRef) return bad('orderRef required', 422);

  try {
    if (failed) {
      await markAttemptFailed(orderRef, body);
      return json({ ok: true, status: 'failed' });
    }
    if (!razorpay.verifySignature({
      order_id: razorpay_order_id, payment_id: razorpay_payment_id, signature: razorpay_signature,
    })) {
      return bad('Signature verification failed', 400);
    }
    const r = await markPaid(orderRef, { gatewayTxnId: razorpay_payment_id, raw: body });
    const { receiptToken } = await import('@/lib/receipt');
    return json({ ok: true, status: 'paid', receiptNo: r.receiptNo, receiptToken: receiptToken(r.receiptNo) });
  } catch (err) {
    if (err.status) return bad(err.message, err.status);
    console.error('razorpay verify:', err);
    return bad('Verification failed', 500);
  }
}
