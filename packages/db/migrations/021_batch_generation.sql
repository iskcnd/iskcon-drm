-- ISKCON Chennai — 021 batch generation
--
-- The consolidation engine: a date or receipt range in, a set of parcels out.
--
-- In SQL rather than JavaScript for three reasons. It is one atomic statement,
-- so two administrators pressing Generate at once cannot half-create a batch.
-- It can be tested against real data on a Neon branch before any screen
-- exists. And whichever app ends up owning the UI, the rule for what belongs
-- in a parcel stays in one place.
--
-- Safe to re-run.

/**
 * What a batch WOULD contain. Reads only; writes nothing.
 *
 * One row per donor in the window, already consolidated, already banded,
 * already told whether they can be posted to. `addr_key` is what turns
 * several donors at one address into one parcel.
 */
CREATE OR REPLACE FUNCTION dispatch.plan_batch(
  p_from   date DEFAULT NULL,
  p_to     date DEFAULT NULL,
  p_rfrom  text DEFAULT NULL,
  p_rto    text DEFAULT NULL)
RETURNS TABLE (
  addr_key      text,
  person_id     uuid,
  person_no     bigint,
  full_name     text,
  amount_total  numeric,
  band          text,
  receipt_nos   text[],
  donation_ids  bigint[],
  address_line  text,
  area          text,
  city          text,
  state         text,
  pincode       text,
  phone         text,
  smc_days      smallint,
  verdict       text)
LANGUAGE sql STABLE AS $fn$
WITH
-- Donations already sitting on a parcel. AC1 says every qualifying donation
-- appears exactly once, so a re-run of the same window must not post a second
-- parcel — the guard belongs here, not in the caller's memory.
already AS (
  SELECT DISTINCT unnest(pi.donation_ids) AS donation_id
    FROM dispatch.parcel_item pi
    JOIN dispatch.parcel p ON p.id = pi.parcel_id
   WHERE p.status <> 'cancelled'
),
win AS (
  SELECT d.person_id, d.id, d.amount, d.receipt_no
    FROM donation d
   WHERE d.status = 'paid'
     AND (p_from  IS NULL OR d.donated_on >= p_from)
     AND (p_to    IS NULL OR d.donated_on <= p_to)
     AND (p_rfrom IS NULL OR (d.receipt_no ~ '^[0-9]+$' AND d.receipt_no::bigint >= p_rfrom::bigint))
     AND (p_rto   IS NULL OR (d.receipt_no ~ '^[0-9]+$' AND d.receipt_no::bigint <= p_rto::bigint))
     AND NOT EXISTS (SELECT 1 FROM already a WHERE a.donation_id = d.id)
     -- Do-not-disturb is applied before anything else: someone who asked for
     -- no parcels must not surface in Address Pending either. Nothing is
     -- pending for them.
     AND EXISTS (SELECT 1 FROM v_parcel_eligible e WHERE e.person_id = d.person_id)
),
per_donor AS (
  SELECT w.person_id,
         sum(w.amount)                                        AS amount_total,
         array_agg(w.receipt_no ORDER BY w.receipt_no)
           FILTER (WHERE w.receipt_no IS NOT NULL)             AS receipt_nos,
         array_agg(w.id ORDER BY w.id)                         AS donation_ids
    FROM win w
   GROUP BY w.person_id
)
SELECT
  -- Address + PIN, normalised. "No 12, 1st Cross" and "no.12 1st cross" are
  -- one household; the PIN keeps two identical street names in different
  -- towns apart.
  CASE
    WHEN p.pincode ~ '^[0-9]{6}$' AND COALESCE(btrim(p.address_line),'') <> ''
      THEN lower(regexp_replace(p.address_line, '[^a-z0-9]+', '', 'gi')) || '|' || p.pincode
  END                                                          AS addr_key,
  p.id, p.person_no, p.full_name,
  pd.amount_total,
  donation_band(pd.amount_total)                               AS band,
  COALESCE(pd.receipt_nos, '{}')                               AS receipt_nos,
  pd.donation_ids,
  p.address_line, p.area, p.city, p.state, p.pincode, p.mobile_e164,
  po.smc_transit_days,
  CASE
    WHEN COALESCE(btrim(p.full_name), '') = ''      THEN 'no_name'
    WHEN NOT COALESCE((SELECT (b->>'dispatch')::boolean
                         FROM app_setting s, jsonb_array_elements(s.value) b
                        WHERE s.key = 'donation_bands'
                          AND b->>'band' = donation_band(pd.amount_total)
                        LIMIT 1), false)            THEN 'below_threshold'
    WHEN COALESCE(btrim(p.address_line), '') = ''   THEN 'no_address'
    WHEN p.pincode !~ '^[0-9]{6}$'                  THEN 'no_pincode'
    WHEN po.pincode IS NULL                         THEN 'unknown_pincode'
    WHEN po.smc_serviceable IS NOT TRUE             THEN 'not_serviceable'
    ELSE 'ok'
  END                                                          AS verdict
FROM per_donor pd
JOIN person p ON p.id = pd.person_id
LEFT JOIN LATERAL (
  SELECT pincode, bool_or(smc_serviceable) AS smc_serviceable,
         min(smc_transit_days) AS smc_transit_days
    FROM post_offices
   WHERE pincode = NULLIF(regexp_replace(COALESCE(p.pincode,''), '\D', '', 'g'), '')::int
   GROUP BY pincode
) po ON TRUE;
$fn$;

COMMENT ON FUNCTION dispatch.plan_batch(date, date, text, text) IS
  'What a batch would contain, one row per donor, consolidated and banded. Reads only. verdict says ok, or exactly why not — the pending queues are built by filtering on it rather than by a second query that could disagree.';

/**
 * Turn a planned window into real parcels.
 *
 * Donors at one address become one parcel, named for the largest giver.
 * Tracking numbers run consecutively from the number the administrator typed
 * in, because that is how a book of courier labels works.
 */
CREATE OR REPLACE FUNCTION dispatch.generate_batch(p_batch_id uuid)
RETURNS TABLE (parcels integer, donors integer, pending integer)
LANGUAGE plpgsql AS $fn$
DECLARE
  b            record;
  n_parcels    integer := 0;
  n_donors     integer := 0;
  n_pending    integer := 0;
  track_num    numeric;
  track_width  integer;
  grp          record;
  new_parcel   uuid;
BEGIN
  SELECT * INTO b FROM dispatch.batch WHERE id = p_batch_id FOR UPDATE;
  IF b IS NULL THEN RAISE EXCEPTION 'generate_batch: no batch %', p_batch_id; END IF;
  IF b.status <> 'draft' THEN
    RAISE EXCEPTION 'generate_batch: batch % is already %, only a draft can be generated', p_batch_id, b.status;
  END IF;
  IF b.letter_template_id IS NULL THEN
    RAISE EXCEPTION 'generate_batch: a letter template is required — every parcel carries a letter';
  END IF;

  -- Tracking numbers are consecutive from the start number, keeping its width
  -- so 25017200234607 does not become 2.5017200234607e13 or lose a leading
  -- digit. Null start is allowed: the numbers get written in later by hand.
  IF b.tracking_start IS NOT NULL AND b.tracking_start ~ '^[0-9]+$' THEN
    track_num := b.tracking_start::numeric;
    track_width := length(b.tracking_start);
  END IF;

  CREATE TEMP TABLE _plan ON COMMIT DROP AS
    SELECT * FROM dispatch.plan_batch(b.from_date, b.to_date, b.receipt_start, b.receipt_end);

  SELECT count(*) INTO n_pending FROM _plan WHERE verdict <> 'ok';

  FOR grp IN
    SELECT addr_key,
           sum(amount_total) AS total,
           count(*)          AS donor_count,
           -- The label carries the largest giver's name; person_no breaks a
           -- tie so the same input always produces the same label.
           (array_agg(full_name    ORDER BY amount_total DESC, person_no))[1] AS label_name,
           (array_agg(address_line ORDER BY amount_total DESC, person_no))[1] AS address_line,
           (array_agg(area         ORDER BY amount_total DESC, person_no))[1] AS area,
           (array_agg(city         ORDER BY amount_total DESC, person_no))[1] AS city,
           (array_agg(state        ORDER BY amount_total DESC, person_no))[1] AS state,
           (array_agg(pincode      ORDER BY amount_total DESC, person_no))[1] AS pincode,
           (array_agg(phone        ORDER BY amount_total DESC, person_no))[1] AS phone
      FROM _plan
     WHERE verdict = 'ok'
     GROUP BY addr_key
     ORDER BY min(person_no)
  LOOP
    INSERT INTO dispatch.parcel (
      batch_id, parcel_no, tracking_id, name_on_label,
      address_line, area, city, state, pincode, phone,
      band, amount_total, is_shared, status)
    VALUES (
      p_batch_id, dispatch.next_parcel_no(),
      CASE WHEN track_num IS NULL THEN NULL
           ELSE lpad(track_num::bigint::text, track_width, '0') END,
      grp.label_name, grp.address_line, grp.area, grp.city, grp.state,
      grp.pincode, grp.phone,
      donation_band(grp.total), grp.total, grp.donor_count > 1, 'pending')
    RETURNING id INTO new_parcel;

    INSERT INTO dispatch.parcel_item (parcel_id, person_id, amount_total, band, receipt_nos, donation_ids)
    SELECT new_parcel, person_id, amount_total, band, receipt_nos, donation_ids
      FROM _plan WHERE verdict = 'ok' AND addr_key = grp.addr_key;

    n_parcels := n_parcels + 1;
    n_donors  := n_donors + grp.donor_count;
    IF track_num IS NOT NULL THEN track_num := track_num + 1; END IF;
  END LOOP;

  UPDATE dispatch.batch SET status = 'generated' WHERE id = p_batch_id;
  RETURN QUERY SELECT n_parcels, n_donors, n_pending;
END $fn$;

COMMENT ON FUNCTION dispatch.generate_batch(uuid) IS
  'Creates the parcels for a draft batch. One parcel per address, named for the largest giver, tracking numbers consecutive from the batch start number. Refuses a batch that is not a draft, so pressing Generate twice cannot double-post.';
