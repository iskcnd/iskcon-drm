import { q, tx } from './db.js';
import { CAPABILITY } from './session.js';

const clean = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());

/** Codes go in a share link and get read aloud, so keep them tame. */
function normCode(v) {
  const c = String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  return c || null;
}

export const TEAM_OPS = {
  'team.list': {
    cap: CAPABILITY.read,
    async run() {
      const [staff, volunteers] = await Promise.all([
        q(`SELECT e.*,
                  (SELECT count(*) FROM zoho_volunteer v WHERE v.employee_id = e.id AND v.is_active) AS volunteers,
                  (SELECT count(*) FROM donation d
                    WHERE lower(btrim(regexp_replace(d.collected_by,'\\s+',' ','g'))) = e.match_name) AS gifts,
                  (SELECT COALESCE(sum(d.amount),0) FROM donation d
                    WHERE lower(btrim(regexp_replace(d.collected_by,'\\s+',' ','g'))) = e.match_name) AS raised
             FROM zoho_employee e ORDER BY e.is_active DESC, e.name`),
        q(`SELECT v.*, e.name AS employee_name,
                  (SELECT count(*) FROM donation d
                    WHERE lower(btrim(regexp_replace(d.volunteer_name,'\\s+',' ','g'))) = v.match_name) AS gifts,
                  (SELECT COALESCE(sum(d.amount),0) FROM donation d
                    WHERE lower(btrim(regexp_replace(d.volunteer_name,'\\s+',' ','g'))) = v.match_name) AS raised
             FROM zoho_volunteer v
             LEFT JOIN zoho_employee e ON e.id = v.employee_id
            ORDER BY v.is_active DESC, v.is_system, v.name`),
      ]);
      return { staff: staff.rows, volunteers: volunteers.rows };
    },
  },

  'team.saveStaff': {
    cap: CAPABILITY.bulk,
    async run({ data }, user) {
      const d = data || {};
      if (!clean(d.name)) throw new Error('Name is required');
      if (!clean(d.zoho_id)) throw new Error('Zoho id is required — the webhook sends it, not the name');

      return tx(user.id, async (c) => {
        if (d.id) {
          const r = await c.query(
            `UPDATE zoho_employee
                SET name=$2, zoho_id=$3, email=$4, phone=$5, ref_code=$6, is_active=$7, notes=$8
              WHERE id=$1 RETURNING id`,
            [d.id, clean(d.name), clean(d.zoho_id), clean(d.email), clean(d.phone),
              normCode(d.ref_code), d.is_active !== false, clean(d.notes)]);
          if (!r.rowCount) throw new Error('Not found');
          return r.rows[0];
        }
        const r = await c.query(
          `INSERT INTO zoho_employee (name, zoho_id, email, phone, ref_code, is_active, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (zoho_id) DO UPDATE
             SET name=EXCLUDED.name, email=EXCLUDED.email, phone=EXCLUDED.phone,
                 ref_code=COALESCE(EXCLUDED.ref_code, zoho_employee.ref_code),
                 is_active=EXCLUDED.is_active, notes=EXCLUDED.notes
           RETURNING id`,
          [clean(d.name), clean(d.zoho_id), clean(d.email), clean(d.phone),
            normCode(d.ref_code), d.is_active !== false, clean(d.notes)]);
        return r.rows[0];
      });
    },
  },

  'team.saveVolunteer': {
    cap: CAPABILITY.bulk,
    async run({ data }, user) {
      const d = data || {};
      if (!clean(d.name)) throw new Error('Name is required');
      if (!clean(d.zoho_id)) throw new Error('Zoho id is required — the webhook sends it, not the name');

      return tx(user.id, async (c) => {
        if (d.id) {
          const r = await c.query(
            `UPDATE zoho_volunteer
                SET name=$2, zoho_id=$3, email=$4, phone=$5, ref_code=$6,
                    employee_id=$7, is_system=$8, is_active=$9, notes=$10
              WHERE id=$1 RETURNING id`,
            [d.id, clean(d.name), clean(d.zoho_id), clean(d.email), clean(d.phone),
              normCode(d.ref_code), d.employee_id || null, !!d.is_system,
              d.is_active !== false, clean(d.notes)]);
          if (!r.rowCount) throw new Error('Not found');
          return r.rows[0];
        }
        const r = await c.query(
          `INSERT INTO zoho_volunteer (name, zoho_id, email, phone, ref_code, employee_id, is_system, is_active, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (zoho_id) DO UPDATE
             SET name=EXCLUDED.name, email=EXCLUDED.email, phone=EXCLUDED.phone,
                 ref_code=COALESCE(EXCLUDED.ref_code, zoho_volunteer.ref_code),
                 employee_id=EXCLUDED.employee_id, is_system=EXCLUDED.is_system,
                 is_active=EXCLUDED.is_active, notes=EXCLUDED.notes
           RETURNING id`,
          [clean(d.name), clean(d.zoho_id), clean(d.email), clean(d.phone),
            normCode(d.ref_code), d.employee_id || null, !!d.is_system,
            d.is_active !== false, clean(d.notes)]);
        return r.rows[0];
      });
    },
  },

  /** Names in donations that match no Zoho record — those reach Zoho blank. */
  'team.unmapped': {
    cap: CAPABILITY.read,
    async run() {
      const r = await q('SELECT * FROM v_unmapped_staff ORDER BY donations DESC').catch(() => ({ rows: [] }));
      return { rows: r.rows };
    },
  },
};
