-- ISKCON Chennai DRM — 002 donations & seva
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS seva_category (
  id        smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug      text NOT NULL UNIQUE,
  name      text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

INSERT INTO seva_category (slug, name) VALUES
  ('general','General Donation'),
  ('annadanam','Annadanam'),
  ('gaushala','Gaushala'),
  ('deity-seva','Deity Seva'),
  ('festival','Festival Seva'),
  ('construction','Construction'),
  ('book-distribution','Book Distribution'),
  ('nitya-seva','Nitya Seva'),
  ('life-patron','Life Patron')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS donation (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  person_id        uuid NOT NULL REFERENCES person(id) ON DELETE RESTRICT,
  amount           numeric(12,2) NOT NULL CHECK (amount > 0),
  currency         text NOT NULL DEFAULT 'INR',
  seva_category_id smallint REFERENCES seva_category(id),
  purpose          text,
  payment_mode     text CHECK (payment_mode IN
                     ('cash','upi','card','netbanking','cheque','dd','bank_transfer','other')),
  gateway          text CHECK (gateway IN ('payu','razorpay','offline','other')),
  txn_ref          text,
  gateway_status   text,
  receipt_no       text UNIQUE,
  receipt_url      text,
  is_80g           boolean NOT NULL DEFAULT true,
  donated_on       date NOT NULL DEFAULT CURRENT_DATE,
  collected_by     text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid,
  updated_by       uuid
);

COMMENT ON COLUMN donation.gateway IS 'PayU is primary; Razorpay is the fallback when PayU fails.';
COMMENT ON TABLE donation IS 'ON DELETE RESTRICT is deliberate: a person with donations can never be deleted, including by an import rollback.';

CREATE INDEX IF NOT EXISTS idx_donation_person ON donation (person_id);
CREATE INDEX IF NOT EXISTS idx_donation_date   ON donation (donated_on DESC);
CREATE INDEX IF NOT EXISTS idx_donation_seva   ON donation (seva_category_id);

DROP TRIGGER IF EXISTS trg_donation_updated_at ON donation;
DROP TRIGGER IF EXISTS trg_donation_audit      ON donation;
CREATE TRIGGER trg_donation_updated_at BEFORE UPDATE ON donation FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_donation_audit AFTER INSERT OR UPDATE OR DELETE ON donation FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE OR REPLACE VIEW v_donor_summary AS
SELECT p.id AS person_id, p.person_no, p.display_name, p.mobile_e164, p.email, p.city, p.area,
       count(d.id)                 AS donation_count,
       COALESCE(sum(d.amount), 0)  AS total_amount,
       max(d.donated_on)           AS last_donation_on,
       min(d.donated_on)           AS first_donation_on
  FROM person p JOIN donation d ON d.person_id = p.id
 GROUP BY p.id, p.person_no, p.display_name, p.mobile_e164, p.email, p.city, p.area;
