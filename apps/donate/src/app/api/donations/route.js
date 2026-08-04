import { createDonation } from '@/lib/ops-donate';
import { buildRequest, defaultGateway, isEnabled, GATEWAYS } from '@/lib/gateways';
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

  // The donor may pick a gateway; otherwise use the first enabled one.
  const asked = String(body.gateway || '').trim().toLowerCase();
  if (asked && !GATEWAYS[asked]) return bad('Unknown payment option', 422);
  if (asked && !isEnabled(asked)) {
    return bad(`${GATEWAYS[asked].label} is not available right now. Please choose another option.`, 422);
  }
  const gateway = asked || defaultGateway();
  if (!gateway) {
    return bad('No payment method is available at the moment. Please try again shortly.', 503);
  }

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
      // Referral code from ?ref= on the share link. Trusted only as far as a
      // lookup: an unknown code resolves to nobody and the donation is still
      // recorded. Losing the attribution is survivable; losing the gift is not.
      ref: typeof body.ref === 'string' ? body.ref.slice(0, 40) : null,
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
