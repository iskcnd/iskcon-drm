-- ISKCON Chennai — 009 referral mapping, archana details, Life Patron
-- Decisions of 2 Aug 2026. Safe to re-run.

-- ================================================================= receipts
-- One continuous series that never resets. Starts at 200000 so DRM receipts are
-- instantly distinguishable from the migrated Zoho ones (those were ~116xxx).
--
-- Format changed from 'ICC-2026-000001' to a plain number, matching the format
-- donors and the accounts office already recognise from Zoho. A year in the
-- number would imply it resets annually, which it must not.
SELECT setval('receipt_seq', GREATEST(200000, (SELECT last_value FROM receipt_seq)), false);

CREATE OR REPLACE FUNCTION next_receipt_no() RETURNS text
LANGUAGE sql VOLATILE AS
$fn$ SELECT nextval('receipt_seq')::text $fn$;

COMMENT ON FUNCTION next_receipt_no IS
  'Continuous receipt series, never resets. Starts at 200000 to sit clearly above the migrated Zoho range.';

-- ================================================ referral codes for staff
ALTER TABLE zoho_employee  ADD COLUMN IF NOT EXISTS ref_code text UNIQUE;
ALTER TABLE zoho_volunteer ADD COLUMN IF NOT EXISTS ref_code text UNIQUE;

COMMENT ON COLUMN zoho_employee.ref_code IS
  'Short code in a share link: donate.iskconchennai.org/?ref=<code>. Human-readable where the name allows, so a preacher can say it aloud.';

-- Seed from names: lowercase, alphanumeric, first two words. Collisions get a suffix.
UPDATE zoho_employee SET ref_code = c.code FROM (
  SELECT id, lower(regexp_replace(split_part(btrim(regexp_replace(name,'\s+',' ','g')), ' ', 1), '[^a-zA-Z0-9]', '', 'g'))
         || CASE WHEN row_number() OVER (
                   PARTITION BY lower(regexp_replace(split_part(btrim(regexp_replace(name,'\s+',' ','g')), ' ', 1), '[^a-zA-Z0-9]', '', 'g'))
                   ORDER BY id) > 1
                 THEN row_number() OVER (
                   PARTITION BY lower(regexp_replace(split_part(btrim(regexp_replace(name,'\s+',' ','g')), ' ', 1), '[^a-zA-Z0-9]', '', 'g'))
                   ORDER BY id)::text
                 ELSE '' END AS code
    FROM zoho_employee) c
 WHERE zoho_employee.id = c.id AND zoho_employee.ref_code IS NULL;

-- Volunteers are many and names collide, so a short hex is safer than a name.
UPDATE zoho_volunteer SET ref_code = 'v' || substr(md5(zoho_id), 1, 6)
 WHERE ref_code IS NULL;

-- ============================================= donor -> preacher mapping
-- First touch, permanent, once. person_id is the PRIMARY KEY, so "one time
-- only" is enforced by the database rather than by remembering to check.
CREATE TABLE IF NOT EXISTS person_referral (
  person_id         uuid PRIMARY KEY REFERENCES person(id) ON DELETE CASCADE,
  staff_id          smallint REFERENCES zoho_employee(id),
  volunteer_id      smallint REFERENCES zoho_volunteer(id),
  first_donation_id bigint REFERENCES donation(id),
  ref_code          text,
  mapped_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE person_referral IS
  'Who brought this donor to the temple. Set once on their first donation and never changed. Distinct from donation.collected_by, which records who took each individual gift.';

CREATE INDEX IF NOT EXISTS idx_person_referral_staff     ON person_referral (staff_id);
CREATE INDEX IF NOT EXISTS idx_person_referral_volunteer ON person_referral (volunteer_id);

-- ==================================================== archana / seva details
-- Saved family members a donor books archana for. Reusable: on a repeat
-- donation the donor taps a saved name instead of retyping gotra and nakshatra.
CREATE TABLE IF NOT EXISTS archana_profile (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  person_id    uuid NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  full_name    text NOT NULL,
  relation     text,              -- self, spouse, son, daughter, mother, father...
  gotra        text,
  nakshatra    text,
  rashi        text,
  dob          date,
  notes        text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE archana_profile IS
  'A donor''s saved family members for archana. Nothing here is mandatory - the form asks, the pujari team uses whatever was given.';

CREATE INDEX IF NOT EXISTS idx_archana_profile_person ON archana_profile (person_id) WHERE is_active;

-- What was actually booked on a given donation. A snapshot, not a reference:
-- a profile edited next year must not rewrite last year's pujari day sheet.
-- Several rows per donation, because a donor books for the whole family at once.
CREATE TABLE IF NOT EXISTS donation_archana (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  donation_id bigint NOT NULL REFERENCES donation(id) ON DELETE CASCADE,
  profile_id  bigint REFERENCES archana_profile(id) ON DELETE SET NULL,
  full_name   text NOT NULL,
  relation    text,
  gotra       text,
  nakshatra   text,
  rashi       text,
  dob         date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE donation_archana IS
  'Snapshot of the archana details as given at the time of this donation. Deliberately copied, not joined, so historical day sheets stay accurate.';

CREATE INDEX IF NOT EXISTS idx_donation_archana_donation ON donation_archana (donation_id);

DROP TRIGGER IF EXISTS trg_archana_profile_updated_at ON archana_profile;
CREATE TRIGGER trg_archana_profile_updated_at BEFORE UPDATE ON archana_profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===================================================== Life Patron membership
-- A membership club, not a seva category and not a tag.
CREATE TABLE IF NOT EXISTS life_patron (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  person_id      uuid NOT NULL REFERENCES person(id) ON DELETE RESTRICT,
  membership_no  text UNIQUE,
  card_no        text UNIQUE,              -- centrally issued hologram card
  amount         numeric(12,2) NOT NULL DEFAULT 55555,
  paid_amount    numeric(12,2) NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','part_paid','active','lapsed','cancelled')),
  enrolled_on    date NOT NULL DEFAULT CURRENT_DATE,
  activated_on   date,
  book_language  text,                     -- English / Hindi / Tamil / Telugu — starter book set
  books_issued   boolean NOT NULL DEFAULT false,
  card_issued    boolean NOT NULL DEFAULT false,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid,
  updated_by     uuid
);

COMMENT ON TABLE life_patron IS
  'Life Patron membership, Rs 55,555. Payable in instalments, so paid_amount is tracked separately from amount and status moves pending -> part_paid -> active.';

-- Benefits extend to spouse and minor children, so they must be recorded.
CREATE TABLE IF NOT EXISTS life_patron_dependant (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  life_patron_id bigint NOT NULL REFERENCES life_patron(id) ON DELETE CASCADE,
  person_id      uuid REFERENCES person(id),   -- if they are a devotee in their own right
  full_name      text NOT NULL,
  relation       text NOT NULL CHECK (relation IN ('spouse','son','daughter','other')),
  dob            date,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE life_patron_dependant IS
  'Guest-house accommodation covers member, spouse and minor children. dob matters: a child ages out of "minor".';

-- Instalments, and the donation each payment came from.
CREATE TABLE IF NOT EXISTS life_patron_payment (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  life_patron_id bigint NOT NULL REFERENCES life_patron(id) ON DELETE CASCADE,
  donation_id    bigint REFERENCES donation(id),
  amount         numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_on        date NOT NULL DEFAULT CURRENT_DATE,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_life_patron_person ON life_patron (person_id);
CREATE INDEX IF NOT EXISTS idx_life_patron_status ON life_patron (status);

DROP TRIGGER IF EXISTS trg_life_patron_updated_at ON life_patron;
DROP TRIGGER IF EXISTS trg_life_patron_audit ON life_patron;
CREATE TRIGGER trg_life_patron_updated_at BEFORE UPDATE ON life_patron
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_life_patron_audit AFTER INSERT OR UPDATE OR DELETE ON life_patron
  FOR EACH ROW EXECUTE FUNCTION audit.log_change();

-- Keeps paid_amount and status honest without anyone remembering to update them.
CREATE OR REPLACE FUNCTION sync_life_patron_paid() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id bigint; v_paid numeric; v_due numeric;
BEGIN
  v_id := COALESCE(NEW.life_patron_id, OLD.life_patron_id);
  SELECT COALESCE(sum(amount), 0) INTO v_paid FROM life_patron_payment WHERE life_patron_id = v_id;
  SELECT amount INTO v_due FROM life_patron WHERE id = v_id;
  UPDATE life_patron
     SET paid_amount = v_paid,
         status = CASE WHEN v_paid >= v_due THEN 'active'
                       WHEN v_paid > 0      THEN 'part_paid'
                       ELSE 'pending' END,
         activated_on = CASE WHEN v_paid >= v_due AND activated_on IS NULL
                             THEN CURRENT_DATE ELSE activated_on END
   WHERE id = v_id;
  RETURN NULL;
END $fn$;

DROP TRIGGER IF EXISTS trg_life_patron_payment_sync ON life_patron_payment;
CREATE TRIGGER trg_life_patron_payment_sync
  AFTER INSERT OR UPDATE OR DELETE ON life_patron_payment
  FOR EACH ROW EXECUTE FUNCTION sync_life_patron_paid();

-- ======================================================= operations views
-- Pujari day sheet: what is booked for a date, with whatever archana details
-- the donor chose to give.
CREATE OR REPLACE VIEW v_pujari_day_sheet AS
SELECT d.seva_date, s.name AS seva_category, d.seva_type, d.amount,
       p.person_no, p.display_name AS sponsor, p.mobile_e164,
       a.full_name AS archana_for, a.relation, a.gotra, a.nakshatra, a.rashi,
       d.receipt_no, d.id AS donation_id
  FROM donation d
  JOIN person p ON p.id = d.person_id
  LEFT JOIN seva_category s ON s.id = d.seva_category_id
  LEFT JOIN donation_archana a ON a.donation_id = d.id
 WHERE d.seva_date IS NOT NULL
 ORDER BY d.seva_date, s.name, p.display_name;

-- Kitchen day sheet: prasadam and annadanam bookings by date, with counts.
CREATE OR REPLACE VIEW v_kitchen_day_sheet AS
SELECT d.seva_date, s.name AS seva_category, d.seva_type,
       count(*) AS bookings, sum(d.amount) AS total_amount,
       string_agg(p.display_name, ', ' ORDER BY p.display_name) AS sponsors
  FROM donation d
  JOIN person p ON p.id = d.person_id
  LEFT JOIN seva_category s ON s.id = d.seva_category_id
 WHERE d.seva_date IS NOT NULL
 GROUP BY d.seva_date, s.name, d.seva_type
 ORDER BY d.seva_date, s.name;

-- Collection performance, for the volunteer/team dashboard.
CREATE OR REPLACE VIEW v_collection_by_staff AS
SELECT date_trunc('month', d.donated_on)::date AS month,
       e.name  AS employee, e.id AS employee_id,
       v.name  AS volunteer, v.id AS volunteer_id,
       count(*) AS gifts, sum(d.amount) AS total,
       count(DISTINCT d.person_id) AS donors
  FROM donation d
  LEFT JOIN zoho_employee  e ON e.match_name = lower(btrim(regexp_replace(d.collected_by,   '\s+',' ','g')))
  LEFT JOIN zoho_volunteer v ON v.match_name = lower(btrim(regexp_replace(d.volunteer_name, '\s+',' ','g')))
 GROUP BY 1,2,3,4,5;
