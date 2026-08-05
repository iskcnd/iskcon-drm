-- ISKCON Chennai — 019 prasadam courier & dispatch
--
-- A schema, not a separate database: a parcel that cannot join to a donation
-- is not much use, and Postgres cannot join across databases. `dispatch` owns
-- its own tables and reads `public`; that is boundary enough.
--
-- Eight tables, down from the ten in the draft spec. Letter and label
-- templates share one table because both answer "what do I pick before
-- printing". Courier imports and mail-merge runs share one because both are
-- "a long job ran, here is what happened". The draft's AuditLog is dropped —
-- audit.change_log already exists and already fires from triggers.
--
-- Sized for reality: Sri Maruti's own export shows 2,327 parcels in twelve
-- months, 194 a month. This is an admin tool for a few hundred parcels.
--
-- Safe to re-run.

CREATE SCHEMA IF NOT EXISTS dispatch;

-- ====================================================== do not disturb
-- In public, not dispatch: a devotee's wish not to be contacted is not a
-- courier concern. Columns rather than rows per service, so "may we contact
-- this person" stays one lookup.
CREATE TABLE IF NOT EXISTS public.do_not_disturb (
  person_id         uuid PRIMARY KEY REFERENCES person(id) ON DELETE CASCADE,

  no_whatsapp       boolean NOT NULL DEFAULT false,
  no_sms            boolean NOT NULL DEFAULT false,
  no_email          boolean NOT NULL DEFAULT false,
  no_phone_call     boolean NOT NULL DEFAULT false,
  no_post           boolean NOT NULL DEFAULT false,

  no_prasadam       boolean NOT NULL DEFAULT false,
  no_newsletter     boolean NOT NULL DEFAULT false,
  no_festival       boolean NOT NULL DEFAULT false,
  no_fundraising    boolean NOT NULL DEFAULT false,

  all_communication boolean NOT NULL DEFAULT false,

  reason            text,
  source            text,
  requested_on      date NOT NULL DEFAULT CURRENT_DATE,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid
);

COMMENT ON TABLE public.do_not_disturb IS
  'A devotee asking us to stop. Distinct from person.whatsapp_optin and friends, which record consent to START — someone can have opted in years ago and asked to stop last week, and both facts matter. A RECEIPT IS NEVER SUPPRESSED BY THIS TABLE: an 80G acknowledgement is a legal document the donor is entitled to, and this governs solicitation and gifts only.';
COMMENT ON COLUMN public.do_not_disturb.no_post IS
  'No physical mail at all, parcels included. Excludes the person from batch generation entirely — they never reach Address Pending, because nothing is pending.';
COMMENT ON COLUMN public.do_not_disturb.no_prasadam IS
  'Keep sending receipts and letters; send no prasadam parcel.';

DROP TRIGGER IF EXISTS trg_dnd_updated_at ON public.do_not_disturb;
CREATE TRIGGER trg_dnd_updated_at BEFORE UPDATE ON public.do_not_disturb
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Everyone we may send a parcel to.
CREATE OR REPLACE VIEW public.v_parcel_eligible AS
SELECT p.id AS person_id
  FROM person p
  LEFT JOIN do_not_disturb d ON d.person_id = p.id
 WHERE p.is_active
   AND COALESCE(d.all_communication, false) = false
   AND COALESCE(d.no_post, false)           = false
   AND COALESCE(d.no_prasadam, false)       = false;

-- ====================================================== settings + bands
CREATE TABLE IF NOT EXISTS public.app_setting (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid
);

COMMENT ON TABLE public.app_setting IS
  'Configuration a temple manager may change without a deploy. Somewhere for the next setting to live instead of another table.';

-- Bands A-F from the spec, plus Z for everything below the parcel threshold.
-- Z exists because every donor should carry a band even when no parcel is
-- sent — the day the temple decides to send the small givers something, it is
-- a setting change rather than a migration.
INSERT INTO app_setting (key, value, description) VALUES
 ('donation_bands',
  '[{"band":"Z","min":0,"max":999,"dispatch":false},
    {"band":"A","min":1000,"max":2999,"dispatch":true},
    {"band":"B","min":3000,"max":4999,"dispatch":true},
    {"band":"C","min":5000,"max":9999,"dispatch":true},
    {"band":"D","min":10000,"max":19999,"dispatch":true},
    {"band":"E","min":20000,"max":49999,"dispatch":true},
    {"band":"F","min":50000,"max":null,"dispatch":true}]'::jsonb,
  'Consolidated donor total for the batch window decides the band. dispatch=false means banded but no parcel.')
ON CONFLICT (key) DO NOTHING;

/**
 * The band a consolidated total falls in.
 *
 * Matched on the floor only, never on `max`. Testing the maxima as written —
 * 999, 2999, 4999 — left a gap at every boundary: Rs 999.99 matched no band
 * at all and came back NULL. Donations are numeric(12,2) and a consolidated
 * total of several gifts lands on a paisa readily, so the gaps were real, not
 * theoretical. `max` stays in the setting for display; it decides nothing.
 */
CREATE OR REPLACE FUNCTION public.donation_band(p_amount numeric)
RETURNS text LANGUAGE sql STABLE AS $fn$
  SELECT b->>'band'
    FROM app_setting s, jsonb_array_elements(s.value) b
   WHERE s.key = 'donation_bands'
     AND COALESCE(p_amount, 0) >= (b->>'min')::numeric
   ORDER BY (b->>'min')::numeric DESC
   LIMIT 1;
$fn$;

-- ====================================================== templates
CREATE TABLE IF NOT EXISTS dispatch.template (
  id          smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind        text NOT NULL CHECK (kind IN ('letter','label')),
  name        text NOT NULL,
  is_default  boolean NOT NULL DEFAULT false,
  is_active   boolean NOT NULL DEFAULT true,
  -- letter: {"r2_key":"...","mime":"..."}  label: geometry in mm
  spec        jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid,
  UNIQUE (kind, name)
);

COMMENT ON COLUMN dispatch.template.spec IS
  'Label: width_mm, height_mm, margin_top, margin_left, pitch_x, pitch_y, across, down, paper. Letter: the R2 object key of the DOCX. One table because both answer "which one do I print with".';

DROP TRIGGER IF EXISTS trg_template_updated_at ON dispatch.template;
CREATE TRIGGER trg_template_updated_at BEFORE UPDATE ON dispatch.template
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- The sheet the temple already buys.
INSERT INTO dispatch.template (kind, name, is_default, spec, notes) VALUES
 ('label', 'A4 2x4 (100 x 72 mm)', true,
  '{"width_mm":100,"height_mm":72,"margin_top":4.5,"margin_left":3.5,
    "pitch_x":103,"pitch_y":72,"across":2,"down":4,"paper":"A4"}'::jsonb,
  'Measured from the label sheet supplied with the spec. Eight labels a page.')
ON CONFLICT (kind, name) DO NOTHING;

-- ====================================================== gifts
CREATE TABLE IF NOT EXISTS dispatch.gift_item (
  id          smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  sku         text,
  description text,
  unit        text NOT NULL DEFAULT 'piece',
  is_active   boolean NOT NULL DEFAULT true,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE dispatch.gift_item IS
  'The gift catalogue, so the same item is never retyped. Deliberately NOT a band-to-gift rule table: gifts are mixed and matched per batch from what is in stock, so the rule would be wrong. What stops us repeating ourselves is the history in parcel_gift, not a rule here.';

-- ====================================================== batches
CREATE SEQUENCE IF NOT EXISTS dispatch.parcel_no_seq START 1;

CREATE TABLE IF NOT EXISTS dispatch.batch (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  from_date          date,
  to_date            date,
  receipt_start      text,
  receipt_end        text,
  -- Fed in by hand at generation; parcels take consecutive numbers from here.
  tracking_start     text,
  courier            text NOT NULL DEFAULT 'Sri Maruti Courier',
  letter_template_id smallint REFERENCES dispatch.template(id),
  label_template_id  smallint REFERENCES dispatch.template(id),
  status             text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','generated','printed','dispatched','closed','cancelled')),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid,
  CHECK (from_date IS NULL OR to_date IS NULL OR from_date <= to_date)
);

CREATE INDEX IF NOT EXISTS idx_batch_status ON dispatch.batch (status, created_at DESC);

COMMENT ON TABLE dispatch.batch IS
  'One manual dispatch run. Never scheduled: an administrator picks a window and processes it.';

-- ====================================================== parcels
CREATE TABLE IF NOT EXISTS dispatch.parcel (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id           uuid NOT NULL REFERENCES dispatch.batch(id) ON DELETE CASCADE,
  parcel_no          bigint NOT NULL UNIQUE,
  tracking_id        text UNIQUE,

  -- Frozen at generation. The label must say what was printed even if the
  -- devotee moves next month, and a reprint must match the first print.
  name_on_label      text NOT NULL,
  address_line       text,
  area               text,
  city               text,
  state              text,
  pincode            text,
  phone              text,

  band               text,
  amount_total       numeric(12,2) NOT NULL DEFAULT 0,
  is_shared          boolean NOT NULL DEFAULT false,

  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','printed','dispatched','in_transit',
                                       'out_for_delivery','delivered','returning',
                                       'returned','lost','cancelled')),
  dispatch_date      date,
  expected_delivery  date,
  delivery_date      date,
  courier_status_raw text,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         uuid
);

CREATE INDEX IF NOT EXISTS idx_parcel_batch    ON dispatch.parcel (batch_id);
CREATE INDEX IF NOT EXISTS idx_parcel_status   ON dispatch.parcel (status);
CREATE INDEX IF NOT EXISTS idx_parcel_tracking ON dispatch.parcel (tracking_id) WHERE tracking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parcel_pincode  ON dispatch.parcel (pincode);

COMMENT ON COLUMN dispatch.parcel.delivery_date IS
  'Actual delivery only. Sri Maruti fills DELIVERY DATE even for parcels still in transit — that is their expected date and belongs in expected_delivery. Writing it here would record deliveries that never happened.';
COMMENT ON COLUMN dispatch.parcel.name_on_label IS
  'Largest donor when several share an address. Frozen at generation so a reprint matches the original.';

DROP TRIGGER IF EXISTS trg_parcel_updated_at ON dispatch.parcel;
CREATE TRIGGER trg_parcel_updated_at BEFORE UPDATE ON dispatch.parcel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Never resets, and never collides — the same lesson the receipt series
-- taught us the expensive way.
CREATE OR REPLACE FUNCTION dispatch.next_parcel_no()
RETURNS bigint LANGUAGE plpgsql VOLATILE AS $fn$
DECLARE candidate bigint; guard int := 0;
BEGIN
  LOOP
    candidate := nextval('dispatch.parcel_no_seq');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM dispatch.parcel WHERE parcel_no = candidate);
    guard := guard + 1;
    IF guard > 5000 THEN
      RAISE EXCEPTION 'next_parcel_no: 5000 numbers already in use from %', candidate;
    END IF;
  END LOOP;
  RETURN candidate;
END $fn$;

-- ====================================================== who is on a parcel
CREATE TABLE IF NOT EXISTS dispatch.parcel_item (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parcel_id     uuid NOT NULL REFERENCES dispatch.parcel(id) ON DELETE CASCADE,
  person_id     uuid NOT NULL REFERENCES person(id),
  amount_total  numeric(12,2) NOT NULL DEFAULT 0,
  band          text,
  receipt_nos   text[] NOT NULL DEFAULT '{}',
  donation_ids  bigint[] NOT NULL DEFAULT '{}',
  UNIQUE (parcel_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_parcel_item_person ON dispatch.parcel_item (person_id);

COMMENT ON TABLE dispatch.parcel_item IS
  'One donor on one parcel, with their consolidated total and every receipt number that made it up. A table rather than JSON on the parcel because "what has this devotee been sent" is the question this module is asked most.';

-- ====================================================== gifts in a parcel
CREATE TABLE IF NOT EXISTS dispatch.parcel_gift (
  parcel_id uuid NOT NULL REFERENCES dispatch.parcel(id) ON DELETE CASCADE,
  gift_id   smallint NOT NULL REFERENCES dispatch.gift_item(id),
  qty       smallint NOT NULL DEFAULT 1 CHECK (qty > 0),
  PRIMARY KEY (parcel_id, gift_id)
);

CREATE INDEX IF NOT EXISTS idx_parcel_gift_gift ON dispatch.parcel_gift (gift_id);

-- What has this devotee already received, and when. The answer to "do not
-- send the same thing to our regulars twice".
CREATE OR REPLACE VIEW dispatch.v_donor_gift_history AS
SELECT pi.person_id, g.id AS gift_id, g.name AS gift_name,
       count(*) AS times_sent, max(p.dispatch_date) AS last_sent
  FROM dispatch.parcel_item pi
  JOIN dispatch.parcel p      ON p.id = pi.parcel_id
  JOIN dispatch.parcel_gift pg ON pg.parcel_id = p.id
  JOIN dispatch.gift_item g    ON g.id = pg.gift_id
 WHERE p.status NOT IN ('cancelled')
 GROUP BY pi.person_id, g.id, g.name;

-- ====================================================== jobs
CREATE TABLE IF NOT EXISTS dispatch.job (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id      uuid REFERENCES dispatch.batch(id) ON DELETE SET NULL,
  kind          text NOT NULL CHECK (kind IN ('courier_import','courier_export',
                                              'mail_merge','labels','address_backfill')),
  filename      text,
  r2_key        text,
  rows_total    integer NOT NULL DEFAULT 0,
  rows_ok       integer NOT NULL DEFAULT 0,
  rows_failed   integer NOT NULL DEFAULT 0,
  errors        jsonb NOT NULL DEFAULT '[]'::jsonb,
  status        text NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','failed')),
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  run_by        uuid
);

CREATE INDEX IF NOT EXISTS idx_job_batch ON dispatch.job (batch_id, started_at DESC);

COMMENT ON COLUMN dispatch.job.errors IS
  'Per-row failures: [{"row":12,"tracking":"250172...","error":"unknown tracking id"}]. An unknown id must be reported without stopping the rest of the import.';

-- ====================================================== read-only access
GRANT USAGE ON SCHEMA dispatch TO drm_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA dispatch TO drm_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA dispatch GRANT SELECT ON TABLES TO drm_readonly;
