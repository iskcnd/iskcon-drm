-- ISKCON Chennai DRM — 005 Japa Desk
--
-- The Japa Desk is a lifecycle, not a visit log:
--   enrol -> card issued -> daily ticks on paper -> card complete -> submitted
--   -> enrolled in Japa Puja, where the devotee takes a vow to continue.
--
-- A visit table cannot answer the questions that matter: how many cards are
-- outstanding, who is mid-card, who lapsed, who graduated.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS japa_card (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  person_id    uuid NOT NULL REFERENCES person(id) ON DELETE RESTRICT,
  card_no      text UNIQUE,
  issued_on    date NOT NULL DEFAULT CURRENT_DATE,
  total_boxes  integer NOT NULL DEFAULT 108 CHECK (total_boxes > 0),
  boxes_done   integer NOT NULL DEFAULT 0 CHECK (boxes_done >= 0),
  status       text NOT NULL DEFAULT 'issued'
               CHECK (status IN ('issued','in_progress','completed','submitted','lapsed')),
  submitted_on date,
  issued_by    text,
  received_by  text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid,
  updated_by   uuid
);

COMMENT ON TABLE japa_card IS
  'One row per physical japa card issued. Ticking happens on paper; boxes_done is filled in when the card comes back.';

CREATE TABLE IF NOT EXISTS japa_puja_enrolment (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  person_id    uuid NOT NULL REFERENCES person(id) ON DELETE RESTRICT,
  japa_card_id bigint REFERENCES japa_card(id) ON DELETE SET NULL,
  enrolled_on  date NOT NULL DEFAULT CURRENT_DATE,
  vow_taken    boolean NOT NULL DEFAULT false,
  vow_date     date,
  batch        text,
  status       text NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','lapsed','completed')),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid
);

COMMENT ON TABLE japa_puja_enrolment IS
  'Graduation record: the devotee completed a card and took the vow to continue chanting.';

CREATE INDEX IF NOT EXISTS idx_japa_card_person ON japa_card (person_id);
CREATE INDEX IF NOT EXISTS idx_japa_card_status ON japa_card (status);
CREATE INDEX IF NOT EXISTS idx_japa_card_issued ON japa_card (issued_on DESC);
CREATE INDEX IF NOT EXISTS idx_japa_puja_person ON japa_puja_enrolment (person_id);

DROP TRIGGER IF EXISTS trg_japa_card_updated_at ON japa_card;
DROP TRIGGER IF EXISTS trg_japa_card_audit ON japa_card;
DROP TRIGGER IF EXISTS trg_japa_puja_audit ON japa_puja_enrolment;

CREATE TRIGGER trg_japa_card_updated_at BEFORE UPDATE ON japa_card
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_japa_card_audit AFTER INSERT OR UPDATE OR DELETE ON japa_card
  FOR EACH ROW EXECUTE FUNCTION audit.log_change();
CREATE TRIGGER trg_japa_puja_audit AFTER INSERT OR UPDATE OR DELETE ON japa_puja_enrolment
  FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE OR REPLACE VIEW v_japa_status AS
SELECT p.id AS person_id, p.person_no, p.display_name, p.mobile_e164,
       count(c.id)                                            AS cards_issued,
       count(*) FILTER (WHERE c.status = 'submitted')          AS cards_submitted,
       count(*) FILTER (WHERE c.status IN ('issued','in_progress')) AS cards_outstanding,
       max(c.issued_on)                                        AS last_card_issued,
       EXISTS (SELECT 1 FROM japa_puja_enrolment e WHERE e.person_id = p.id) AS in_japa_puja
  FROM person p JOIN japa_card c ON c.person_id = p.id
 GROUP BY p.id, p.person_no, p.display_name, p.mobile_e164;
