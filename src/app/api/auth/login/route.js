import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { q } from '@/lib/db';
import { createSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Small in-memory throttle. Resets on redeploy, which is fine for a temple-sized team.
const attempts = new Map();
const WINDOW = 15 * 60_000;
const MAX = 8;

function throttled(key) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > WINDOW) {
    attempts.set(key, { first: now, count: 1 });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX;
}

export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for') || 'local';
  if (throttled(`${ip}:${String(email).toLowerCase()}`)) {
    return NextResponse.json(
      { error: 'Too many attempts. Wait 15 minutes and try again.' }, { status: 429 });
  }

  const r = await q(
    'SELECT id, full_name, email, role, password_hash, is_active FROM app_user WHERE email=$1',
    [String(email).trim()]);
  const user = r.rows[0];

  // Same message and similar timing whether the account exists or not.
  const ok = user?.password_hash
    ? await bcrypt.compare(password, user.password_hash)
    : await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');

  if (!user || !ok || !user.is_active) {
    return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });
  }

  await q('UPDATE app_user SET last_login_at=now() WHERE id=$1', [user.id]);
  await createSession(user);
  return NextResponse.json({ data: { name: user.full_name, role: user.role } });
}
