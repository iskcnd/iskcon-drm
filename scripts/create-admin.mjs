#!/usr/bin/env node
// Creates or updates a login. Run once after the first deploy to make yourself
// super admin, then add everyone else the same way.
//
//   DATABASE_URL="postgres://..." node scripts/create-admin.mjs \
//     "info@iskconchennai.org" "Divyarupa" "a-strong-password" super_admin
//
// Roles: super_admin | module_manager | data_entry | view_only

import pg from 'pg';
import bcrypt from 'bcryptjs';

const [email, name, password, role = 'super_admin'] = process.argv.slice(2);

if (!email || !name || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> "<full name>" <password> [role]');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Password must be at least 10 characters.');
  process.exit(1);
}
if (!['super_admin', 'module_manager', 'data_entry', 'view_only'].includes(role)) {
  console.error(`Unknown role "${role}".`);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const hash = await bcrypt.hash(password, 12);
const r = await client.query(
  `INSERT INTO app_user (email, full_name, password_hash, role)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (email) DO UPDATE
     SET full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         is_active = true
   RETURNING id, email, role`,
  [email, name, hash, role]);

console.log(`User ready: ${r.rows[0].email} (${r.rows[0].role})`);
await client.end();
