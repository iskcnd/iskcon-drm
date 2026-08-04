-- ISKCON Chennai — 015 pincode reference data + donation attribution
--
-- Two problems, both showing up as blank fields in the Zoho payload.
--
-- 1. Address. The donation page asks for a street line and a PIN, because
--    asking a devotee to type district, taluk and state is how you lose them
--    on a phone. Zoho's Donor_Form wants all of it. India Post publishes the
--    mapping, so derive it: PIN -> office, district, state, lat, long.
--
-- 2. Employee_Name and Volunteer_Name arrived empty for every donation, and
--    the reason was not the Zoho id lookup — donation.collected_by was NULL on
--    all 13 rows. Nothing ever wrote it. Referral codes existed on the staff
--    tables and person_referral existed to hold the mapping, but no code read
--    ?ref= or filled either one. Matching on a text name was fragile anyway:
--    add real foreign keys and keep the name columns for imported rows.
--
-- Safe to re-run.

-- ============================================================ post offices
-- India Post's PIN directory. One row per post office, so a PIN with several
-- offices has several rows — resolution picks the head office first.
CREATE TABLE IF NOT EXISTS post_offices (
  id             BIGSERIAL PRIMARY KEY,
  pincode        INTEGER NOT NULL,
  office_name    TEXT NOT NULL,
  office_type    VARCHAR(5),
  delivery_type  VARCHAR(20),
  division_name  TEXT,
  region_name    TEXT,
  circle_name    TEXT,
  district       TEXT,
  state          TEXT,
  latitude       NUMERIC(9,6),
  longitude      NUMERIC(9,6)
);

CREATE INDEX IF NOT EXISTS idx_post_offices_pincode ON post_offices (pincode);

COMMENT ON TABLE post_offices IS
  'India Post PIN code directory. Reference data, not devotee data: no PII, safe to bulk load and to expose through the read-only API role.';

-- One PIN can carry a head office (HO), sub office (SO) and several branch
-- offices (BO). For an address we want the one a person would recognise, and
-- that is the head office where there is one. Also prefers a row that actually
-- carries coordinates — a lot of BO rows have none.
CREATE OR REPLACE FUNCTION resolve_pincode(p_pincode text)
RETURNS TABLE (office_name text, district text, state text, latitude numeric, longitude numeric)
LANGUAGE sql STABLE AS $fn$
  SELECT po.office_name, po.district, po.state, po.latitude, po.longitude
    FROM post_offices po
   WHERE po.pincode = NULLIF(regexp_replace(COALESCE(p_pincode,''), '\D', '', 'g'), '')::int
   ORDER BY (po.latitude IS NULL),
            CASE upper(COALESCE(po.office_type,'')) WHEN 'HO' THEN 1 WHEN 'SO' THEN 2 ELSE 3 END,
            po.id
   LIMIT 1;
$fn$;

COMMENT ON FUNCTION resolve_pincode(text) IS
  'Best single post office for a PIN: head office first, and a row with coordinates ahead of one without. Tolerates "600 119" and "600119".';

GRANT SELECT ON post_offices TO drm_readonly;

-- ========================================================== attribution
-- Who brought the donation. Real keys, not names: a preacher whose name is
-- spelled differently in two systems still resolves to one Zoho id.
ALTER TABLE donation ADD COLUMN IF NOT EXISTS staff_id     smallint REFERENCES zoho_employee(id);
ALTER TABLE donation ADD COLUMN IF NOT EXISTS volunteer_id smallint REFERENCES zoho_volunteer(id);

COMMENT ON COLUMN donation.staff_id IS
  'Preacher credited with this gift, resolved from ?ref= on the donation link. collected_by keeps the free-text name for rows imported from Zoho, where no id is available.';
COMMENT ON COLUMN donation.volunteer_id IS
  'Volunteer credited with this gift, resolved from ?ref= on the donation link.';

CREATE INDEX IF NOT EXISTS idx_donation_staff     ON donation (staff_id)     WHERE staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donation_volunteer ON donation (volunteer_id) WHERE volunteer_id IS NOT NULL;

-- ========================================================== housekeeping
-- Orphaned by 014: WhatsApp bodies now live inside payload_template, and the
-- media URL with them, so attach_receipt no longer decides anything.
ALTER TABLE notification_config DROP COLUMN IF EXISTS variables;
ALTER TABLE notification_config DROP COLUMN IF EXISTS body;
