import { createFallbackAttempt } from '@/lib/ops-donate';
import { buildRequest, nextGateway, isEnabled, GATEWAYS } from '@/lib/gateways';
import { json, bad, rateLimit, clientIp } from '@/lib/util';

/**
 * POST /api/donations/:id/retry  { failedGateway, tried?: [], gateway?: '' }
 *
 * Called when a gateway fails. If the donor picked a specific alternative we
 * honour that; otherwise we pick the next enabled one they haven't tried.
 * `tried` matters — without it a donor bounced back and forth between the same
 * two gateways forever.
 */
export async function POST(request, { params }) {
  const ip = clientIp(request);
  if (!rateLimit(`rty:${ip}`, 10, 60_000)) return bad('Too many requests', 429);

  const { id } = await params;
  let body;
  try { body = await request.json(); } catch { return bad('Invalid JSON'); }

  const asked = String(body.gateway || '').trim().toLowerCase();
  if (asked && !GATEWAYS[asked]) return bad('Unknown payment option', 422);
  if (asked && !isEnabled(asked)) {
    return bad(`${GATEWAYS[asked].label} is not available right now.`, 422);
  }

  const tried = Array.isArray(body.tried) ? body.tried : [];
  const gateway = asked || nextGateway(body.failedGateway, tried);
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
