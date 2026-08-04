import pg from 'pg';

// Numerics come back as strings by default; we want numbers for amounts and counts.
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

const globalForPg = globalThis;

/**
 * The connection string carries sslmode=require. pg 8 reads that as
 * verify-full and warns on every boot, because pg 9 will switch it to libpq
 * semantics — encrypt, but do not check the certificate. Handling it here
 * means a routine dependency bump cannot quietly weaken the connection.
 *
 * PGSSL_VERIFY=true turns certificate checking on. Try it here first: the
 * staff app going down is an inconvenience, the donation app going down is
 * lost offerings. Same block in apps/donate/src/lib/db.js and
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
  globalForPg._drmPool ||
  new pg.Pool({
    ...connection(),
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== 'production') globalForPg._drmPool = pool;

/** Plain parameterised query. Always pass values as params — never interpolate. */
export function q(text, params = []) {
  return pool.query(text, params);
}

/**
 * Run inside a transaction with app.actor_id set, so the audit triggers
 * record who made the change. Every write goes through this.
 */
export async function tx(actorId, fn) {
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
