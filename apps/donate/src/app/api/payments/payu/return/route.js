import { payu } from '@/lib/gateways';
import { markPaid, markAttemptFailed, recordUnreconciled } from '@/lib/ops-donate';
import { receiptToken } from '@/lib/receipt';

/** PayU posts the browser back here for both success (surl) and failure (furl). */
export async function POST(request) {
  const form = await request.formData();
  const p = Object.fromEntries(form.entries());
  const base = process.env.PUBLIC_BASE_URL || new URL(request.url).origin;

  if (!payu.verifyReturn(p)) {
    console.error('PayU return: hash mismatch', p.txnid);
    return Response.redirect(`${base}/thank-you?status=invalid`, 303);
  }
  try {
    if (p.status === 'success') {
      const r = await markPaid(p.txnid, { gatewayTxnId: p.mihpayid, raw: p });
      return Response.redirect(`${base}/thank-you?status=success&receipt=${encodeURIComponent(r.receiptNo || '')}&t=${receiptToken(r.receiptNo)}`, 303);
    }
    await markAttemptFailed(p.txnid, p);
    return Response.redirect(`${base}/thank-you?status=failed&donation=${encodeURIComponent(p.udf1 || '')}&gateway=payu`, 303);
  } catch (err) {
    // The hash verified, so PayU really did take this money. Whatever failed
    // here is ours. Never tell the donor nothing was deducted — log loudly,
    // record what we can, and send them to a page that says we have their
    // payment and are reconciling it.
    console.error('PayU return FAILED AFTER PAYMENT:', {
      txnid: p.txnid,
      mihpayid: p.mihpayid,
      amount: p.amount,
      payuStatus: p.status,
      error: err.message,
    });
    try {
      await recordUnreconciled('payu', p, err.message);
    } catch (e2) {
      console.error('PayU return: could not even record the unreconciled payment:', e2.message);
    }
    const paid = p.status === 'success';
    return Response.redirect(
      `${base}/thank-you?status=${paid ? 'reconciling' : 'error'}`
      + `&ref=${encodeURIComponent(p.txnid || '')}`
      + `&txn=${encodeURIComponent(p.mihpayid || '')}`,
      303);
  }
}
