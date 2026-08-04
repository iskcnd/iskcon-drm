-- ISKCON Chennai — 016 Sri Maruti Courier serviceability
--
-- Prasadam, 10BE certificates and festival invitations go out by SMC, which
-- covers roughly 14,500 of India's 165,000 PIN codes. Staff currently find out
-- a PIN is not served after the parcel is packed.
--
-- Serviceability lives on post_offices rather than in its own table because
-- the question is always asked about a PIN the donor has already given, and a
-- join nobody can forget is better than one they can.
--
-- Safe to re-run.

ALTER TABLE post_offices ADD COLUMN IF NOT EXISTS smc_serviceable  boolean;
ALTER TABLE post_offices ADD COLUMN IF NOT EXISTS smc_transit_days smallint;
ALTER TABLE post_offices ADD COLUMN IF NOT EXISTS smc_area_type    text;

COMMENT ON COLUMN post_offices.smc_serviceable IS
  'Sri Maruti Courier delivers to this PIN. NULL means the PIN is absent from their list — not known to be undeliverable, just unlisted, which is a different thing from a listed NON DELIVERY ZONE.';
COMMENT ON COLUMN post_offices.smc_transit_days IS
  'Travel and transit days quoted by SMC. 0 is same-station. NULL where they quote none.';
COMMENT ON COLUMN post_offices.smc_area_type IS
  'SMC''s own wording: DELIVERY ZONE, NON DELIVERY ZONE, SATELLITE. Kept verbatim so a dispatch clerk can match it against the courier''s paperwork.';

CREATE INDEX IF NOT EXISTS idx_post_offices_smc ON post_offices (smc_serviceable) WHERE smc_serviceable;

-- One row per PIN for dispatch. post_offices has a row per office, so a PIN
-- with a head office and six branch offices would otherwise answer the same
-- question seven times.
CREATE OR REPLACE VIEW v_courier_pincode AS
SELECT pincode,
       bool_or(smc_serviceable)  AS smc_serviceable,
       min(smc_transit_days)     AS smc_transit_days,
       min(smc_area_type)        AS smc_area_type,
       min(district)             AS district,
       min(state)                AS state
  FROM post_offices
 GROUP BY pincode;

COMMENT ON VIEW v_courier_pincode IS
  'Can we send a parcel to this PIN, and how long does it take. One row per PIN.';

GRANT SELECT ON v_courier_pincode TO drm_readonly;
