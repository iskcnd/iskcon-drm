import crypto from 'node:crypto';

/** "Rakesh Kumar" -> "Ra••••h K" — first 2 + last letter of first word, initial of last word. */
export function maskName(name) {
  if (!name) return 'Devotee';
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  const head = first.slice(0, 2);
  const tail = first.length > 3 ? first.slice(-1) : '';
  const dots = '•'.repeat(Math.max(first.length - head.length - tail.length, 1));
  const initial = parts.length > 1 ? ' ' + parts[parts.length - 1][0] : '';
  return `${head}${dots}${tail}${initial}`;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export function bad(message, status = 400) {
  return json({ error: message }, status);
}

export function sha512(s) {
  return crypto.createHash('sha512').update(s).digest('hex');
}

export function hmac256(s, key) {
  return crypto.createHmac('sha256', key).update(s).digest('hex');
}

export function orderRef() {
  return 'ICC' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/** Constant-time string compare for hashes/keys. */
export function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/**
 * In-memory fixed-window rate limiter (per instance — fine on a single Railway
 * replica; move to Postgres/Redis if we ever scale out). Critical for /api/lookup:
 * masked-no-OTP (D24) is only acceptable with hard throttling.
 */
const buckets = new Map();
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return true;
  }
  b.count += 1;
  if (buckets.size > 50_000) buckets.clear(); // safety valve
  return b.count <= limit;
}

export function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}
