import { q } from '@/lib/db';
import { json, bad, safeEqual } from '@/lib/util';

/**
 * Category management for the donation page. Temporary auth: x-admin-key header
 * (ADMIN_API_KEY env). Replaced by DRM role-based sessions when these screens
 * move into the dashboard.
 */
function authed(request) {
  return process.env.ADMIN_API_KEY && safeEqual(request.headers.get('x-admin-key'), process.env.ADMIN_API_KEY);
}

const EDITABLE = new Set([
  'name', 'kind', 'icon', 'tag', 'display_order', 'min_amount', 'is_active', 'show_on_page',
  'name_i18n', 'line_i18n', 'emo_i18n', 'presets', 'zoho_seva_type_id', 'zoho_category_id',
]);

export async function GET(request) {
  if (!authed(request)) return bad('Unauthorized', 401);
  const r = await q(`SELECT * FROM seva_category ORDER BY display_order, id`);
  return json({ categories: r.rows });
}

export async function POST(request) {
  if (!authed(request)) return bad('Unauthorized', 401);
  let body;
  try { body = await request.json(); } catch { return bad('Invalid JSON'); }
  if (!body.slug || !body.name) return bad('slug and name are required', 422);
  try {
    const r = await q(
      `INSERT INTO seva_category (slug, name) VALUES ($1,$2) RETURNING id`,
      [body.slug, body.name]
    );
    return json({ id: r.rows[0].id }, 201);
  } catch (err) {
    if (err.code === '23505') return bad('Slug already exists', 409);
    console.error('admin categories POST:', err);
    return bad('Create failed', 500);
  }
}

export async function PATCH(request) {
  if (!authed(request)) return bad('Unauthorized', 401);
  let body;
  try { body = await request.json(); } catch { return bad('Invalid JSON'); }
  const { id, ...changes } = body;
  if (!id) return bad('id required', 422);
  const keys = Object.keys(changes).filter((k) => EDITABLE.has(k));
  if (!keys.length) return bad('Nothing to update', 422);
  // Column allow-list (D20): only names from EDITABLE reach the SQL.
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const vals = keys.map((k) => (typeof changes[k] === 'object' && changes[k] !== null ? JSON.stringify(changes[k]) : changes[k]));
  const r = await q(`UPDATE seva_category SET ${sets} WHERE id = $1 RETURNING id`, [id, ...vals]);
  if (!r.rows.length) return bad('Not found', 404);
  return json({ ok: true });
}
