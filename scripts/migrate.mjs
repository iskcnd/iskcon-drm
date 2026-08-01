#!/usr/bin/env node
// Applies every db/*.sql file in filename order. All migrations are idempotent,
// so re-running is safe.
//
//   DATABASE_URL="postgres://..." npm run migrate

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(here, '..', 'db');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const files = (await readdir(dbDir)).filter((f) => f.endsWith('.sql')).sort();
if (!files.length) {
  console.error('No .sql files found in db/');
  process.exit(1);
}

for (const f of files) {
  process.stdout.write(`  ${f} … `);
  const sql = await readFile(path.join(dbDir, f), 'utf8');
  try {
    await client.query(sql);
    console.log('ok');
  } catch (err) {
    console.log('FAILED');
    console.error(`\n${err.message}\n`);
    await client.end();
    process.exit(1);
  }
}

console.log(`\n${files.length} migration${files.length === 1 ? '' : 's'} applied.`);
await client.end();
