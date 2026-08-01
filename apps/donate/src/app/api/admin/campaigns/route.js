import { q } from '@/lib/db';
import { json, bad, safeEqual } from '@/lib/util';

function authed(request) {
  return process.env.ADMIN_API_KEY && safeEqual(request.headers.get('x-admin-key'), process.env.ADMIN_API_KEY);
}

const EDITABLE = new Set([
  'title_i18n', 'line_i18n', 'goal_amount', 'starts_on', 'ends_on', 'is_live',
  'display_order', 'seva_category_id', 'presets', 'zoho_seva_type_id', 'zoho_category_id',
]);

export async function GET(request) {
  if (!authed(request)) return bad('Unauthorized', 401);
  const r = await q(
    `SELECT c.*, COALESCE(s.raised,0) AS raised, COALESCE(s.donors,0) AS donors
       FROM campaign c
       LEFT JOIN (SELECT campaign_id, sum(amount) AS raised, count(DISTINCT person_id) AS donors
                    FROM donation WHERE status='paid' GROUP BY campaign_id) s ON s.campaign_id = c.id
      ORDER BY c.display_order, c.id`
  );
  return json({ campaigns: r.rows });
}

export async function POST(request) {
  if (!authed(request)) return bad('Unauthorized', 401);
  let body;
  try { body = await request.json(); } catch { return bad('Invalid JSON'); }
  if (!body.slug) return bad('slug required', 422);
  try {
    const r = await q(
      `INSERT INTO campaign (slug, title_i18n, goal_amount) VALUES ($1, $2, $3) RETURNING id`,
      [body.slug, JSON.stringify(body.title_i18n || {}), body.goal_amount || null]
    );
    return json({ id: r.rows[0].id }, 201);
  } catch (err) {
    if (err.code === '23505') return bad('Slug already exists', 409);
    console.error('admin campaigns POST:', err);
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
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const vals = keys.map((k) => (typeof changes[k] === 'object' && changes[k] !== null ? JSON.stringify(changes[k]) : changes[k]));
  const r = await q(`UPDATE campaign SET ${sets} WHERE id = $1 RETURNING id`, [id, ...vals]);
  if (!r.rows.length) return bad('Not found', 404);
  return json({ ok: true });
}
