import { createDonation } from '@/lib/ops-donate';
import { buildRequest, CASCADE } from '@/lib/gateways';
import { json, bad, rateLimit, clientIp } from '@/lib/util';

function baseUrl(request) {
  return process.env.PUBLIC_BASE_URL || new URL(request.url).origin;
}

/** POST /api/donations — creates pending donation + first (PayU) attempt, returns launch payload. */
export async function POST(request) {
  const ip = clientIp(request);
  if (!rateLimit(`don:${ip}`, 15, 60_000)) return bad('Too many requests', 429);

  let body;
  try { body = await request.json(); } catch { return bad('Invalid JSON'); }

  const amount = Math.round(Number(body.amount));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return bad('Invalid amount', 422);
  if (!body.categorySlug && !body.campaignSlug) return bad('Choose a seva', 422);

  const gateway = CASCADE[0];
  try {
    const r = await createDonation({
      categorySlug: body.categorySlug || null,
      campaignSlug: body.campaignSlug || null,
      amount,
      sevaDate: body.sevaDate || null,
      isRecurring: !!body.isRecurring,
      prasadam: !!body.prasadam,
      personId: body.personId || null,
      newPerson: body.newPerson || null,
      gateway,
    });
    const payment = await buildRequest(gateway, {
      orderRef: r.orderRef,
      amount,
      productinfo: r.productinfo,
      name: r.person.full_name,
      email: r.person.email,
      phone: r.person.mobile_number,
      donationId: r.donationId,
      baseUrl: baseUrl(request),
    });
    return json({ donationId: r.donationId, orderRef: r.orderRef, gateway, payment });
  } catch (err) {
    if (err.status) return bad(err.message, err.status);
    console.error('donations:', err);
    return bad('Could not create the donation. Nothing was charged.', 500);
  }
}
