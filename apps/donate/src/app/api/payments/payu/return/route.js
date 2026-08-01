import { payu } from '@/lib/gateways';
import { markPaid, markAttemptFailed } from '@/lib/ops-donate';
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
    console.error('PayU return:', err);
    return Response.redirect(`${base}/thank-you?status=error`, 303);
  }
}
