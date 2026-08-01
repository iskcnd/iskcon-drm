import crypto from 'crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'drm_session';

const MIN_SECRET_LEN = 24;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error(
      'SESSION_SECRET is not set. Add it as an environment variable. '
      + 'Generate one with: openssl rand -base64 48');
  }
  if (s.length < MIN_SECRET_LEN) {
    throw new Error(
      `SESSION_SECRET is only ${s.length} characters; at least ${MIN_SECRET_LEN} are required `
      + '(it signs login cookies, so a guessable value lets someone forge a super-admin session). '
      + 'Generate one with: openssl rand -base64 48');
  }
  return s;
}

const b64 = (buf) => Buffer.from(buf).toString('base64url');

function sign(payload) {
  const body = b64(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

/** Verifies signature and expiry. Returns null on any problem — never throws to the caller. */
export function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;

  let expected;
  try {
    expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  } catch {
    return null;
  }

  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Next 15+ makes cookies() async, so these are all awaited by their callers.
export async function createSession(user) {
  const hours = Number(process.env.SESSION_HOURS || 12);
  const token = sign({
    id: user.id,
    name: user.full_name,
    email: user.email,
    role: user.role,
    exp: Date.now() + hours * 3600_000,
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: hours * 3600,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function currentUser() {
  const jar = await cookies();
  return verify(jar.get(COOKIE)?.value);
}

// ---------------------------------------------------------------- authorisation
const RANK = { view_only: 0, data_entry: 1, module_manager: 2, super_admin: 3 };

export const CAPABILITY = {
  read: 0,
  write: 1,   // create + edit records
  bulk: 2,    // import, export, bulk tagging
  admin: 3,   // rollback, delete, user management
};

export function can(user, capability) {
  if (!user) return false;
  return (RANK[user.role] ?? -1) >= capability;
}
