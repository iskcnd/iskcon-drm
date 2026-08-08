import { q, tx } from './db.js';
import { CAPABILITY } from './session.js';

/**
 * Prasadam courier & dispatch.
 *
 * Thin on purpose: the rules for what belongs in a parcel live in the
 * database (dispatch.plan_batch, dispatch.generate_batch) and the file
 * formats live in @iskcon/dispatch. These operations move data between the
 * two and do nothing clever in between.
 */

const clean = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());

export const DISPATCH_OPS = {
  /** Everything the dispatch home screen needs, in one round trip. */
  'dis.home': {
    cap: CAPABILITY.read,
    async run() {
      const [batches, attention, gifts, templates, counts] = await Promise.all([
        q(`SELECT b.*, t.name AS letter_name,
                  (SELECT count(*) FROM dispatch.parcel p WHERE p.batch_id = b.id) AS parcels,
                  (SELECT count(*) FROM dispatch.parcel p WHERE p.batch_id = b.id AND p.status='delivered') AS delivered
             FROM dispatch.batch b
             LEFT JOIN dispatch.template t ON t.id = b.letter_template_id
            ORDER BY b.created_at DESC LIMIT 25`),
        q(`SELECT * FROM dispatch.v_parcel_attention
            WHERE attention IS NOT NULL
            ORDER BY severity, days_since_dispatch DESC NULLS LAST LIMIT 100`),
        q('SELECT * FROM dispatch.gift_item ORDER BY is_active DESC, name'),
        q('SELECT id, kind, name, is_default, is_active, spec FROM dispatch.template ORDER BY kind, name'),
        q(`SELECT count(*) FILTER (WHERE status NOT IN ('delivered','cancelled','returned')) AS open,
                  count(*) FILTER (WHERE status='delivered') AS delivered,
                  count(*) FILTER (WHERE status IN ('returned','returning')) AS returned,
                  count(*) AS total
             FROM dispatch.parcel`),
      ]);
      return {
        batches: batches.rows,
        attention: attention.rows,
        gifts: gifts.rows,
        templates: templates.rows,
        counts: counts.rows[0],
      };
    },
  },

  /**
   * What a window would produce, before anything is written.
   * The same function the generator uses, so the preview cannot disagree
   * with the result.
   */
  'dis.preview': {
    cap: CAPABILITY.read,
    async run({ fromDate, toDate, receiptStart, receiptEnd }) {
      const args = [clean(fromDate), clean(toDate), clean(receiptStart), clean(receiptEnd)];
      if (!args.some(Boolean)) throw new Error('Give a date range or a receipt range');

      const summary = await q(
        `SELECT verdict, count(*)::int AS donors, sum(amount_total) AS rupees
           FROM dispatch.plan_batch($1::date,$2::date,$3,$4)
          GROUP BY verdict ORDER BY donors DESC`, args);

      const parcels = await q(
        `SELECT count(DISTINCT addr_key)::int AS parcels,
                count(*)::int AS donors,
                count(*) FILTER (WHERE addr_key IN (
                  SELECT addr_key FROM dispatch.plan_batch($1::date,$2::date,$3,$4)
                   WHERE verdict='ok' GROUP BY addr_key HAVING count(*)>1))::int AS sharing
           FROM dispatch.plan_batch($1::date,$2::date,$3,$4) WHERE verdict='ok'`, args);

      const bands = await q(
        `SELECT band, count(*)::int AS donors, sum(amount_total) AS rupees
           FROM dispatch.plan_batch($1::date,$2::date,$3,$4)
          WHERE verdict='ok' GROUP BY band ORDER BY band`, args);

      return { summary: summary.rows, ...parcels.rows[0], bands: bands.rows };
    },
  },

  /** The donors a window would NOT post to, and why. For chasing offline. */
  'dis.pending': {
    cap: CAPABILITY.read,
    async run({ fromDate, toDate, receiptStart, receiptEnd, verdict }) {
      const r = await q(
        `SELECT person_no, full_name, amount_total, band, address_line, pincode,
                phone, receipt_nos, verdict
           FROM dispatch.plan_batch($1::date,$2::date,$3,$4)
          WHERE verdict <> 'ok' AND ($5::text IS NULL OR verdict = $5)
          ORDER BY amount_total DESC LIMIT 1000`,
        [clean(fromDate), clean(toDate), clean(receiptStart), clean(receiptEnd), clean(verdict)]);
      return r.rows;
    },
  },

  'dis.createBatch': {
    cap: CAPABILITY.bulk,
    async run({ name, fromDate, toDate, receiptStart, receiptEnd, trackingStart,
      letterTemplateId, labelTemplateId, courier }, user) {
      if (!clean(name)) throw new Error('Give the batch a name');
      if (!letterTemplateId) throw new Error('Choose a letter template — every parcel carries a letter');
      const start = clean(trackingStart);
      if (start && !/^[0-9]+$/.test(start)) {
        throw new Error('The starting courier number must be digits only, e.g. 25017200234607');
      }
      return tx(user.id, async (c) => {
        const r = await c.query(
          `INSERT INTO dispatch.batch
             (name, from_date, to_date, receipt_start, receipt_end, tracking_start,
              letter_template_id, label_template_id, courier, created_by)
           VALUES ($1,$2::date,$3::date,$4,$5,$6,$7,$8,COALESCE($9,'Sri Maruti Courier'),$10)
           RETURNING *`,
          [clean(name), clean(fromDate), clean(toDate), clean(receiptStart), clean(receiptEnd),
            start, letterTemplateId, labelTemplateId || null, clean(courier), user.id]);
        return r.rows[0];
      });
    },
  },

  /**
   * Create the parcels. Refuses a batch that is not a draft, so pressing
   * Generate twice cannot double-post — enforced in the database, not here.
   */
  'dis.generate': {
    cap: CAPABILITY.bulk,
    async run({ batchId }, user) {
      if (!batchId) throw new Error('Which batch?');
      return tx(user.id, async (c) => {
        const r = await c.query('SELECT * FROM dispatch.generate_batch($1)', [batchId]);
        return r.rows[0];
      });
    },
  },

  'dis.parcels': {
    cap: CAPABILITY.read,
    async run({ batchId, status, search }) {
      const where = ['p.batch_id = $1'];
      const args = [batchId];
      if (clean(status)) { args.push(clean(status)); where.push(`p.status = $${args.length}`); }
      if (clean(search)) {
        args.push(`%${clean(search)}%`);
        where.push(`(p.name_on_label ILIKE $${args.length} OR p.tracking_id ILIKE $${args.length}
                     OR p.pincode ILIKE $${args.length} OR p.parcel_no::text ILIKE $${args.length})`);
      }
      const r = await q(
        `SELECT p.*,
                (SELECT count(*) FROM dispatch.parcel_item i WHERE i.parcel_id = p.id) AS donor_count,
                (SELECT string_agg(g.name || CASE WHEN pg.qty>1 THEN ' x'||pg.qty ELSE '' END, ', ')
                   FROM dispatch.parcel_gift pg JOIN dispatch.gift_item g ON g.id=pg.gift_id
                  WHERE pg.parcel_id = p.id) AS gifts
           FROM dispatch.parcel p
          WHERE ${where.join(' AND ')}
          ORDER BY p.parcel_no LIMIT 2000`, args);
      return r.rows;
    },
  },

  /** Who is on a parcel, and what they gave. */
  'dis.parcelDetail': {
    cap: CAPABILITY.read,
    async run({ parcelId }) {
      const [items, gifts] = await Promise.all([
        q(`SELECT i.*, p.person_no, p.full_name
             FROM dispatch.parcel_item i JOIN person p ON p.id = i.person_id
            WHERE i.parcel_id = $1 ORDER BY i.amount_total DESC`, [parcelId]),
        q(`SELECT pg.gift_id, pg.qty, g.name FROM dispatch.parcel_gift pg
             JOIN dispatch.gift_item g ON g.id = pg.gift_id WHERE pg.parcel_id = $1`, [parcelId]),
      ]);
      return { items: items.rows, gifts: gifts.rows };
    },
  },

  /**
   * Gifts for a whole band in one batch, with the history that stops us
   * sending a regular donor the same thing twice.
   */
  'dis.giftPlan': {
    cap: CAPABILITY.read,
    async run({ batchId }) {
      const r = await q(
        `WITH people AS (
           SELECT DISTINCT p.band, i.person_id
             FROM dispatch.parcel p JOIN dispatch.parcel_item i ON i.parcel_id = p.id
            WHERE p.batch_id = $1)
         SELECT pe.band, g.id AS gift_id, g.name,
                count(*) FILTER (WHERE h.person_id IS NOT NULL)::int AS had_before,
                count(*)::int AS donors_in_band,
                max(h.last_sent) AS most_recent
           FROM people pe
           CROSS JOIN dispatch.gift_item g
           LEFT JOIN dispatch.v_donor_gift_history h
                  ON h.person_id = pe.person_id AND h.gift_id = g.id
          WHERE g.is_active
          GROUP BY pe.band, g.id, g.name
          ORDER BY pe.band, g.name`, [batchId]);
      return r.rows;
    },
  },

  /** Put the same gifts on every parcel in a band. */
  'dis.setBandGifts': {
    cap: CAPABILITY.bulk,
    async run({ batchId, band, gifts }, user) {
      if (!batchId || !band) throw new Error('Which batch and band?');
      const list = Array.isArray(gifts) ? gifts : [];
      return tx(user.id, async (c) => {
        const parcels = await c.query(
          'SELECT id FROM dispatch.parcel WHERE batch_id=$1 AND band=$2', [batchId, band]);
        const ids = parcels.rows.map((r) => r.id);
        if (!ids.length) return { parcels: 0 };
        await c.query('DELETE FROM dispatch.parcel_gift WHERE parcel_id = ANY($1::uuid[])', [ids]);
        for (const g of list) {
          if (!g.giftId) continue;
          await c.query(
            `INSERT INTO dispatch.parcel_gift (parcel_id, gift_id, qty)
             SELECT unnest($1::uuid[]), $2, $3
             ON CONFLICT (parcel_id, gift_id) DO UPDATE SET qty = EXCLUDED.qty`,
            [ids, g.giftId, Math.max(1, Number(g.qty) || 1)]);
        }
        return { parcels: ids.length, gifts: list.length };
      });
    },
  },

  'dis.saveGift': {
    cap: CAPABILITY.bulk,
    async run({ id, name, sku, description, unit, isActive }, user) {
      if (!clean(name)) throw new Error('The gift needs a name');
      return tx(user.id, async (c) => {
        if (id) {
          const r = await c.query(
            `UPDATE dispatch.gift_item SET name=$2, sku=$3, description=$4,
                    unit=COALESCE($5,'piece'), is_active=$6 WHERE id=$1 RETURNING *`,
            [id, clean(name), clean(sku), clean(description), clean(unit), isActive !== false]);
          if (!r.rowCount) throw new Error('Gift not found');
          return r.rows[0];
        }
        const r = await c.query(
          `INSERT INTO dispatch.gift_item (name, sku, description, unit, is_active)
           VALUES ($1,$2,$3,COALESCE($4,'piece'),$5)
           ON CONFLICT (name) DO UPDATE SET is_active = true RETURNING *`,
          [clean(name), clean(sku), clean(description), clean(unit), isActive !== false]);
        return r.rows[0];
      });
    },
  },

  /** Hand corrections: a devotee phones to say the parcel arrived broken. */
  'dis.setParcelStatus': {
    cap: CAPABILITY.bulk,
    async run({ parcelId, status, note, deliveryDate }, user) {
      const allowed = ['pending', 'printed', 'dispatched', 'in_transit', 'out_for_delivery',
        'delivered', 'returning', 'returned', 'not_picked_up', 'damaged', 'lost', 'cancelled'];
      if (!allowed.includes(status)) throw new Error(`Unknown status: ${status}`);
      return tx(user.id, async (c) => {
        const r = await c.query(
          `UPDATE dispatch.parcel
              SET status=$2, exception_note=COALESCE($3, exception_note),
                  delivery_date=COALESCE($4::date, delivery_date),
                  last_status_at=now()
            WHERE id=$1 RETURNING id, status`, [parcelId, status, clean(note), clean(deliveryDate)]);
        if (!r.rowCount) throw new Error('Parcel not found');
        // A return is the temple learning an address is wrong. Recording that
        // is the point; the parcel itself is already lost.
        if (status === 'returned' || status === 'returning') {
          await c.query('SELECT dispatch.flag_bad_address($1,$2)',
            [parcelId, clean(note) || 'parcel returned, marked by staff']);
        }
        return r.rows[0];
      });
    },
  },

  /** Mark a whole batch as handed to the courier. */
  'dis.markDispatched': {
    cap: CAPABILITY.bulk,
    async run({ batchId, dispatchDate }, user) {
      return tx(user.id, async (c) => {
        const r = await c.query(
          `UPDATE dispatch.parcel
              SET status='dispatched', dispatch_date=COALESCE($2::date, CURRENT_DATE)
            WHERE batch_id=$1 AND status IN ('pending','printed') RETURNING id`,
          [batchId, clean(dispatchDate)]);
        await c.query("UPDATE dispatch.batch SET status='dispatched' WHERE id=$1", [batchId]);
        return { parcels: r.rowCount };
      });
    },
  },

  /**
   * Templates: letters and label sheets.
   * file_data is deliberately never selected — a .docx in a JSON response
   * would be megabytes of base64 for no reason. Only whether one exists.
   */
  'dis.templates': {
    cap: CAPABILITY.read,
    async run() {
      const r = await q(
        `SELECT id, kind, name, is_default, is_active, spec, notes,
                file_name, file_size, uploaded_at,
                (file_data IS NOT NULL) AS has_file
           FROM dispatch.template ORDER BY kind, name`);
      return r.rows;
    },
  },

  'dis.saveTemplate': {
    cap: CAPABILITY.bulk,
    async run({ id, kind, name, spec, notes, isDefault, isActive }, user) {
      if (!clean(name)) throw new Error('The template needs a name');
      if (!['letter', 'label'].includes(kind)) throw new Error('Kind must be letter or label');

      let parsedSpec = {};
      if (spec) {
        try { parsedSpec = typeof spec === 'string' ? JSON.parse(spec) : spec; }
        catch (e) { throw new Error(`The label geometry is not valid JSON: ${e.message}`); }
      }
      // A label sheet whose numbers do not fit A4 wastes a sheet of stock per
      // print run, so it is refused at save rather than discovered at print.
      if (kind === 'label') {
        const s = { width_mm: 100, height_mm: 72, margin_top: 4.5, margin_left: 3.5,
          pitch_x: 103, pitch_y: 72, across: 2, down: 4, ...parsedSpec };
        const right = s.margin_left + (s.across - 1) * s.pitch_x + s.width_mm;
        const bottom = s.margin_top + (s.down - 1) * s.pitch_y + s.height_mm;
        if (right > 210.5) throw new Error(`Those labels run ${(right - 210).toFixed(1)}mm off the right edge of A4`);
        if (bottom > 297.5) throw new Error(`Those labels run ${(bottom - 297).toFixed(1)}mm off the bottom of A4`);
        if (s.pitch_x < s.width_mm) throw new Error('Horizontal pitch is smaller than the label — the columns would overlap');
        if (s.pitch_y < s.height_mm) throw new Error('Vertical pitch is smaller than the label — the rows would overlap');
        parsedSpec = s;
      }

      return tx(user.id, async (c) => {
        let row;
        if (id) {
          const r = await c.query(
            `UPDATE dispatch.template SET name=$2, spec=$3, notes=$4, is_active=$5
              WHERE id=$1 RETURNING id, kind`,
            [id, clean(name), JSON.stringify(parsedSpec), clean(notes), isActive !== false]);
          if (!r.rowCount) throw new Error('Template not found');
          row = r.rows[0];
        } else {
          const r = await c.query(
            `INSERT INTO dispatch.template (kind, name, spec, notes, is_active)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (kind, name) DO UPDATE SET spec=EXCLUDED.spec, notes=EXCLUDED.notes
             RETURNING id, kind`,
            [kind, clean(name), JSON.stringify(parsedSpec), clean(notes), isActive !== false]);
          row = r.rows[0];
        }
        // Exactly one default per kind, enforced here rather than trusted to
        // whoever ticks the box last.
        if (isDefault) {
          await c.query('UPDATE dispatch.template SET is_default=false WHERE kind=$1', [row.kind]);
          await c.query('UPDATE dispatch.template SET is_default=true WHERE id=$1', [row.id]);
        }
        return row;
      });
    },
  },

  /** Cancel a batch made by mistake. Parcels go with it, donations are freed. */
  'dis.cancelBatch': {
    cap: CAPABILITY.bulk,
    async run({ batchId }, user) {
      return tx(user.id, async (c) => {
        const b = (await c.query('SELECT status FROM dispatch.batch WHERE id=$1', [batchId])).rows[0];
        if (!b) throw new Error('Batch not found');
        if (b.status === 'dispatched' || b.status === 'closed') {
          throw new Error('That batch has already gone to the courier. Cancelling it would hide parcels that are physically in transit.');
        }
        // Cancelled parcels are excluded from plan_batch's "already sent"
        // guard, so the donations become available to a corrected batch.
        const r = await c.query(
          "UPDATE dispatch.parcel SET status='cancelled' WHERE batch_id=$1 RETURNING id", [batchId]);
        await c.query("UPDATE dispatch.batch SET status='cancelled' WHERE id=$1", [batchId]);
        return { parcels: r.rowCount };
      });
    },
  },

  'dis.jobs': {
    cap: CAPABILITY.read,
    async run({ batchId }) {
      const r = await q(
        `SELECT * FROM dispatch.job
          WHERE ($1::uuid IS NULL OR batch_id = $1)
          ORDER BY started_at DESC LIMIT 30`, [batchId || null]);
      return r.rows;
    },
  },
};
