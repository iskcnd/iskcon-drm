/**
 * Postgres connection settings, in one place.
 *
 * Two separate things are going on here, and they are easy to confuse.
 *
 * 1. The deprecation warning printed on every boot and every migrate run.
 *    Our connection string carries `sslmode=require`. pg 8 treats that as
 *    `verify-full`; pg 9 will adopt libpq semantics, where `require` means
 *    encrypt but do NOT check the certificate. So the same URL will silently
 *    become weaker on a routine dependency bump. Stripping the parameter and
 *    stating the intent in code means the behaviour is whatever we chose, both
 *    before and after that change.
 *
 * 2. Whether we actually verify Neon's certificate. Today we do not:
 *    `rejectUnauthorized: false` accepts any certificate, which means a
 *    machine-in-the-middle between Railway and Neon could read devotee
 *    records and payment data in clear. Neon presents a certificate from a
 *    public CA, so verification should simply work — but "should" is not
 *    "does", and a wrong TLS setting fails closed: every query stops, which
 *    on the donation app means every payment stops.
 *
 *    So it is a switch, defaulting to today's behaviour. Set PGSSL_VERIFY=true
 *    on the staff app first and confirm sign-in still works; then set it on
 *    the donation app. Once both are proven, the default here should flip and
 *    this note should get shorter.
 */
export function pgConfig(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is not set.');

  // sslmode is handled here instead, so pg never has to interpret it.
  let connectionString = url;
  try {
    const u = new URL(url);
    u.searchParams.delete('sslmode');
    connectionString = u.toString();
  } catch {
    // Not a parseable URL — leave it alone and let pg report the problem.
  }

  const verify = String(process.env.PGSSL_VERIFY || '').toLowerCase() === 'true';
  return { connectionString, ssl: { rejectUnauthorized: verify } };
}
