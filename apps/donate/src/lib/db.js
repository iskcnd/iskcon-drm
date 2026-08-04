import pg from 'pg';

pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

const globalForPg = globalThis;

/**
 * The connection string carries sslmode=require. pg 8 reads that as
 * verify-full and warns on every boot, because pg 9 will switch it to libpq
 * semantics — encrypt, but do not check the certificate. Handling it here
 * means a routine dependency bump cannot quietly weaken the connection.
 *
 * PGSSL_VERIFY=true turns certificate checking on. It is off by default only
 * because it has never been tested against this Neon endpoint, and a wrong TLS
 * setting fails closed: on this app that means every payment stops. Prove it
 * on the staff app first. Same block in apps/drm/src/lib/db.js and
 * packages/db/scripts/pg-ssl.mjs — three copies, which packages/core exists to
 * fix.
 */
function connection() {
  const url = process.env.DATABASE_URL || '';
  let connectionString = url;
  try {
    const u = new URL(url);
    u.searchParams.delete('sslmode');
    connectionString = u.toString();
  } catch { /* let pg report an unparseable URL */ }
  return {
    connectionString,
    ssl: { rejectUnauthorized: String(process.env.PGSSL_VERIFY || '').toLowerCase() === 'true' },
  };
}

export const pool =
  globalForPg._donatePool ||
  new pg.Pool({
    ...connection(),
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== 'production') globalForPg._donatePool = pool;

export function q(text, params = []) {
  return pool.query(text, params);
}

/** Transaction with app.actor_id for the audit triggers. Public-page writes use the sentinel actor "public-donate". */
export async function tx(fn, actorId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.actor_id', actorId || '']);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
