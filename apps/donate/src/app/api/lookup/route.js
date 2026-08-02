import { lookupByMobile } from '@/lib/ops-donate';
import { json, bad, rateLimit, clientIp } from '@/lib/util';
import { parsePhone } from '@/lib/phone';

/**
 * Masked lookup — D24 (no OTP) makes throttling non-negotiable:
 * 10 lookups/min and 60/day per IP. Response is masked name + area only.
 */
export async function POST(request) {
  const ip = clientIp(request);
  if (!rateLimit(`lu-m:${ip}`, 10, 60_000) || !rateLimit(`lu-d:${ip}`, 60, 86_400_000)) {
    return bad('Too many lookups. Please try again later.', 429);
  }
  let body;
  try { body = await request.json(); } catch { return bad('Invalid JSON'); }
  // Accept whatever form the donor typed — "+91 98400 12345", "098400 12345",
  // "9840012345" — and normalise before looking anything up.
  const phone = parsePhone(body.mobile, body.cc);
  if (!phone.ok) return bad(phone.reason, 422);
  try {
    return json({ people: await lookupByMobile(phone.national, phone.cc), phone: phone.pretty });
  } catch (err) {
    console.error('lookup:', err);
    return bad('Lookup failed', 500);
  }
}
