import { lookupByMobile } from '@/lib/ops-donate';
import { json, bad, rateLimit, clientIp } from '@/lib/util';

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
  const mobile = String(body.mobile || '').replace(/\D/g, '');
  if (!/^[0-9]{10}$/.test(mobile)) return bad('Enter a 10-digit mobile number', 422);
  try {
    return json({ people: await lookupByMobile(mobile) });
  } catch (err) {
    console.error('lookup:', err);
    return bad('Lookup failed', 500);
  }
}
