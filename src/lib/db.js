import pg from 'pg';

// Numerics come back as strings by default; we want numbers for amounts and counts.
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

const globalForPg = globalThis;

export const pool =
  globalForPg._drmPool ||
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
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
