import { markPaid } from '@/lib/ops-donate';
import { mockMode } from '@/lib/gateways';

/**
 * Local end-to-end testing without touching a real gateway.
 * Active only when MOCK_GATEWAYS=true. ?fail=1 simulates a gateway failure.
 */
export async function GET(request) {
  if (!mockMode()) return new Response('Not found', { status: 404 });
  const u = new URL(request.url);
  const ref = u.searchParams.get('order_ref');
  const base = process.env.PUBLIC_BASE_URL || u.origin;
  if (u.searchParams.get('fail')) {
    return Response.redirect(`${base}/thank-you?status=failed&gateway=payu&donation=${u.searchParams.get('donation_id')}`, 303);
  }
  const r = await markPaid(ref, { gatewayTxnId: 'MOCK-' + ref, mode: 'mock' });
  const { receiptToken } = await import('@/lib/receipt');
  return Response.redirect(`${base}/thank-you?status=success&receipt=${encodeURIComponent(r.receiptNo || '')}&t=${receiptToken(r.receiptNo)}`, 303);
}
