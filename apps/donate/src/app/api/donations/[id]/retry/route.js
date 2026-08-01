import { createFallbackAttempt } from '@/lib/ops-donate';
import { buildRequest, nextGateway } from '@/lib/gateways';
import { json, bad, rateLimit, clientIp } from '@/lib/util';

/**
 * POST /api/donations/:id/retry  { failedGateway }
 * The client calls this when a gateway reports failure; we hand back the next
 * gateway on the cascade (D23) with a fresh order_ref.
 */
export async function POST(request, { params }) {
  const ip = clientIp(request);
  if (!rateLimit(`rty:${ip}`, 10, 60_000)) return bad('Too many requests', 429);

  const { id } = await params;
  let body;
  try { body = await request.json(); } catch { return bad('Invalid JSON'); }

  const gateway = nextGateway(body.failedGateway);
  if (!gateway) return bad('All payment options failed. Please try again later or contact the temple.', 409);

  try {
    const r = await createFallbackAttempt(Number(id), gateway);
    const payment = await buildRequest(gateway, {
      orderRef: r.orderRef,
      amount: r.amount,
      productinfo: r.productinfo,
      name: r.person.full_name,
      email: r.person.email,
      phone: r.person.mobile_number,
      donationId: Number(id),
      baseUrl: process.env.PUBLIC_BASE_URL || new URL(request.url).origin,
    });
    return json({ donationId: Number(id), orderRef: r.orderRef, gateway, payment });
  } catch (err) {
    if (err.status) return bad(err.message, err.status);
    console.error('retry:', err);
    return bad('Fallback failed', 500);
  }
}
