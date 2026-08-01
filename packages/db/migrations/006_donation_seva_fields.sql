-- ISKCON Chennai DRM — 006 seva date, seva type, external references
--
-- The Zoho export showed a donation booked on 01-Aug for a seva on 21-Aug.
-- The date the money arrives and the date the seva is performed are different
-- facts, and both matter: finance reports follow the payment, the temple
-- kitchen follows the seva date. Storing one and losing the other is wrong.
-- Safe to re-run.

ALTER TABLE donation ADD COLUMN IF NOT EXISTS seva_date       date;
ALTER TABLE donation ADD COLUMN IF NOT EXISTS seva_type       text;
ALTER TABLE donation ADD COLUMN IF NOT EXISTS festival        text;
ALTER TABLE donation ADD COLUMN IF NOT EXISTS volunteer_name  text;
ALTER TABLE donation ADD COLUMN IF NOT EXISTS external_source text;
ALTER TABLE donation ADD COLUMN IF NOT EXISTS external_id     text;

COMMENT ON COLUMN donation.donated_on IS
  'When the money was received. Drives financial reporting.';
COMMENT ON COLUMN donation.seva_date IS
  'When the seva is performed. May be in the future, and may fall in a different month from the payment.';
COMMENT ON COLUMN donation.seva_type IS
  'The sub-category under seva_category, e.g. "Sandhya Bhog" under "Serving Radha Krishna". Free text so a new Zoho type never blocks an import.';
COMMENT ON COLUMN donation.external_id IS
  'The record id in the source system (e.g. Zoho). Unique per source, so re-importing an overlapping export cannot double-count money.';

-- One donation per source record. Partial, so hand-entered rows (no external id)
-- are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS uq_donation_external
  ON donation (external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donation_seva_date ON donation (seva_date) WHERE seva_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donation_seva_type ON donation (seva_type) WHERE seva_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donation_festival  ON donation (festival)  WHERE festival IS NOT NULL;

-- Upcoming seva, for the kitchen and the festival team.
CREATE OR REPLACE VIEW v_upcoming_seva AS
SELECT d.id, d.seva_date, s.name AS seva_category, d.seva_type, d.festival,
       d.amount, p.person_no, p.display_name, p.mobile_e164, d.receipt_no
  FROM donation d
  JOIN person p ON p.id = d.person_id
  LEFT JOIN seva_category s ON s.id = d.seva_category_id
 WHERE d.seva_date IS NOT NULL AND d.seva_date >= CURRENT_DATE
 ORDER BY d.seva_date, p.display_name;
