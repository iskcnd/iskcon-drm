-- ISKCON Chennai — 020 parcels that go wrong, and parcels nobody hears about
--
-- Three things the courier actually does, none of which the first schema
-- handled:
--
--   1. Updates arrive late. A parcel can sit in "dispatched" for three weeks
--      because nobody has re-imported the file, and there is no way to tell
--      that from a parcel genuinely stuck in transit.
--   2. Some parcels never start. Booked, labelled, handed over — and the
--      courier never scans them. There is no status for "we think it left and
--      the courier disagrees".
--   3. Some arrive damaged. Sri Maruti's own export has no code for this; it
--      comes back from the donor by phone or WhatsApp, so it can only ever be
--      set by hand.
--
-- Safe to re-run.

-- When the courier last told us anything about this parcel, as distinct from
-- when we last touched the row. updated_at moves when staff edit a note;
-- this moves only on real courier news, so "we have heard nothing for 12
-- days" is answerable.
ALTER TABLE dispatch.parcel ADD COLUMN IF NOT EXISTS last_status_at timestamptz;
ALTER TABLE dispatch.parcel ADD COLUMN IF NOT EXISTS exception_note text;

COMMENT ON COLUMN dispatch.parcel.last_status_at IS
  'Last time the courier told us something, not the last time the row changed. Silence is the signal here, so it must not be reset by a staff edit.';
COMMENT ON COLUMN dispatch.parcel.exception_note IS
  'Why a parcel is damaged, lost or never collected. Free text: these facts arrive by phone from a devotee, not in any file.';

-- Two statuses the courier file cannot give us:
--   not_picked_up  we handed it over, the courier never scanned it
--   damaged        the devotee received it broken
ALTER TABLE dispatch.parcel DROP CONSTRAINT IF EXISTS parcel_status_check;
ALTER TABLE dispatch.parcel ADD CONSTRAINT parcel_status_check CHECK (status IN (
  'pending','printed','dispatched','in_transit','out_for_delivery',
  'delivered','returning','returned','not_picked_up','damaged','lost','cancelled'));

CREATE INDEX IF NOT EXISTS idx_parcel_open
  ON dispatch.parcel (status, dispatch_date)
  WHERE status NOT IN ('delivered','returned','cancelled');

/**
 * How long Sri Maruti says this PIN takes, with a floor.
 *
 * Their file quotes 0 days for same-station delivery, which is optimistic as
 * a deadline — a parcel is not late the same afternoon it was handed over.
 * Three days is the floor before anything is called overdue.
 */
CREATE OR REPLACE FUNCTION dispatch.expected_days(p_pincode text)
RETURNS integer LANGUAGE sql STABLE AS $fn$
  SELECT GREATEST(3, COALESCE(
    (SELECT min(smc_transit_days) FROM post_offices
      WHERE pincode = NULLIF(regexp_replace(COALESCE(p_pincode,''), '\D', '', 'g'), '')::int
        AND smc_transit_days IS NOT NULL), 5));
$fn$;

/**
 * Everything that needs a human, and why.
 *
 * One view rather than a screen full of filters, because the question staff
 * actually ask is "what should I chase today" — not "show me parcels whose
 * status is X". Ordered worst first.
 */
CREATE OR REPLACE VIEW dispatch.v_parcel_attention AS
SELECT p.id, p.parcel_no, p.tracking_id, p.name_on_label, p.pincode,
       p.status, p.dispatch_date, p.expected_delivery, p.last_status_at,
       p.exception_note, p.batch_id,
       CURRENT_DATE - p.dispatch_date                    AS days_since_dispatch,
       (now()::date - p.last_status_at::date)            AS days_since_courier_news,
       dispatch.expected_days(p.pincode)                 AS expected_days,
       CASE
         WHEN p.status IN ('damaged','lost')          THEN 'damaged or lost'
         WHEN p.status = 'not_picked_up'              THEN 'courier never collected'
         WHEN p.status IN ('returned','returning')    THEN 'returned — address is wrong'
         -- Handed over, and the courier has never once acknowledged it.
         WHEN p.status = 'dispatched' AND p.last_status_at IS NULL
              AND p.dispatch_date < CURRENT_DATE - 3    THEN 'no courier scan yet'
         -- Moving, but past the transit time SMC themselves quote.
         WHEN p.status IN ('dispatched','in_transit','out_for_delivery')
              AND p.dispatch_date < CURRENT_DATE - dispatch.expected_days(p.pincode)
                                                        THEN 'overdue'
         -- Still plausible, but we have heard nothing in a fortnight.
         WHEN p.status IN ('dispatched','in_transit','out_for_delivery')
              AND COALESCE(p.last_status_at, p.created_at) < now() - interval '14 days'
                                                        THEN 'no update in 14 days'
       END AS attention,
       CASE
         WHEN p.status IN ('damaged','lost','not_picked_up') THEN 1
         WHEN p.status IN ('returned','returning')           THEN 2
         WHEN p.status = 'dispatched' AND p.last_status_at IS NULL
              AND p.dispatch_date < CURRENT_DATE - 3         THEN 3
         ELSE 4
       END AS severity
  FROM dispatch.parcel p
 WHERE p.status NOT IN ('delivered','cancelled','pending','printed');

COMMENT ON VIEW dispatch.v_parcel_attention IS
  'What to chase today. Only rows with a non-null attention value need action; the rest are in flight and fine. Ordered by severity then age.';

/**
 * A returned parcel means the address is wrong, and that is worth more than
 * the parcel. Flags every donor on it for review so the next batch does not
 * post to the same wrong address.
 *
 * Called by the courier import when a status becomes returned, and available
 * by hand for the ones a devotee reports by phone.
 */
CREATE OR REPLACE FUNCTION dispatch.flag_bad_address(p_parcel_id uuid, p_why text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql AS $fn$
DECLARE n integer;
BEGIN
  UPDATE person p
     SET needs_review = true,
         review_reason = left(concat_ws('; ', NULLIF(p.review_reason,''),
                              COALESCE(p_why, 'parcel returned undelivered')), 500)
    FROM dispatch.parcel_item pi
   WHERE pi.parcel_id = p_parcel_id AND p.id = pi.person_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $fn$;

COMMENT ON FUNCTION dispatch.flag_bad_address(uuid, text) IS
  'A returned parcel is the temple learning something about a donor address. Without this the lesson is lost and the next batch repeats the mistake — 73 of 2,327 parcels came back in the year Sri Maruti exported.';
