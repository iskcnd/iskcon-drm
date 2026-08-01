-- ISKCON Chennai DRM — 001 foundation
-- Master person record, categories, occasions, audit, import, third-party API surface.
-- Safe to re-run.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS api;

COMMENT ON SCHEMA api IS 'Curated read-only surface for third parties. Excludes PAN, email, full address and full phone. Base tables in public are never exposed directly.';

-- ---------------------------------------------------------------- outposts
CREATE TABLE IF NOT EXISTS outpost (
  id        smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code      text NOT NULL UNIQUE,
  name      text NOT NULL,
  city      text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO outpost (code, name, city) VALUES ('MAIN','Main Temple','Chennai')
  ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------ MASTER TABLE
CREATE TABLE IF NOT EXISTS person (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_no  bigint GENERATED ALWAYS AS IDENTITY UNIQUE,

  full_name      text NOT NULL CHECK (length(btrim(full_name)) > 0),
  initiated_name text,
  display_name   text GENERATED ALWAYS AS
                 (COALESCE(NULLIF(btrim(initiated_name), ''), full_name)) STORED,
  gender         text CHECK (gender IN ('M','F','O')),
  dob            date CHECK (dob IS NULL OR (dob > DATE '1900-01-01' AND dob < DATE '2100-01-01')),

  -- contact. International from day one: never assume +91.
  mobile_cc         text DEFAULT '+91' CHECK (mobile_cc IS NULL OR mobile_cc ~ '^\+[0-9]{1,4}$'),
  mobile_number     text CHECK (mobile_number IS NULL OR mobile_number ~ '^[0-9]{4,15}$'),
  mobile_e164       text GENERATED ALWAYS AS
                    (CASE WHEN mobile_number IS NULL OR mobile_cc IS NULL
                          THEN NULL ELSE mobile_cc || mobile_number END) STORED,
  alt_mobile_cc     text DEFAULT '+91' CHECK (alt_mobile_cc IS NULL OR alt_mobile_cc ~ '^\+[0-9]{1,4}$'),
  alt_mobile_number text CHECK (alt_mobile_number IS NULL OR alt_mobile_number ~ '^[0-9]{4,15}$'),
  alt_mobile_e164   text GENERATED ALWAYS AS
                    (CASE WHEN alt_mobile_number IS NULL OR alt_mobile_cc IS NULL
                          THEN NULL ELSE alt_mobile_cc || alt_mobile_number END) STORED,
  email             citext,

  -- consent. No messaging without it (DPDP Act).
  whatsapp_optin boolean NOT NULL DEFAULT false,
  sms_optin      boolean NOT NULL DEFAULT false,
  email_optin    boolean NOT NULL DEFAULT false,

  address_line text,
  area         text,
  city         text,
  state        text,
  pincode      text,
  country      text DEFAULT 'India',

  preferred_language text,
  pan                text CHECK (pan IS NULL OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),

  marital_status text,
  education      text,
  profession     text,
  organization   text,

  outpost_id smallint REFERENCES outpost(id),
  source     text,
  notes      text,

  is_active     boolean NOT NULL DEFAULT true,
  needs_review  boolean NOT NULL DEFAULT false,
  review_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

COMMENT ON TABLE person IS
  'MASTER table. One row per human. Thin by design: identity, contact, location, demographics only. No module data ever goes here. Unique key is person_no - mobile numbers legitimately repeat across family members.';
COMMENT ON COLUMN person.person_no IS 'Human-readable internal ID. THE unique key.';
COMMENT ON COLUMN person.mobile_e164 IS 'Generated from mobile_cc || mobile_number. Indexed but NOT unique - duplicates are warnings, not errors.';

-- --------------------------------------------------------- categories/tags
CREATE TABLE IF NOT EXISTS tag (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  category    text,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE tag IS
  'Segments/categories: Donor, Japa Desk, IYS Boys, IYS Girls, Unnati Club, etc. Deliberately a table of rows, not a table per category - adding a new group is one INSERT, no migration.';

CREATE TABLE IF NOT EXISTS person_tag (
  person_id uuid    NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  tag_id    integer NOT NULL REFERENCES tag(id)    ON DELETE CASCADE,
  tagged_at timestamptz NOT NULL DEFAULT now(),
  tagged_by uuid,
  source    text,
  PRIMARY KEY (person_id, tag_id)
);

CREATE TABLE IF NOT EXISTS occasion (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  person_id     uuid NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  occasion_type text NOT NULL,
  occasion_date date NOT NULL,
  recurring     boolean NOT NULL DEFAULT true,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS person_merge_log (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kept_person_id   uuid NOT NULL REFERENCES person(id),
  merged_person_id uuid NOT NULL,
  merged_snapshot  jsonb NOT NULL,
  merged_at        timestamptz NOT NULL DEFAULT now(),
  merged_by        uuid,
  reason           text
);

-- ------------------------------------------------------------ users, roles
CREATE TABLE IF NOT EXISTS app_user (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  text UNIQUE,
  full_name     text NOT NULL,
  email         citext UNIQUE,
  password_hash text,
  role          text NOT NULL DEFAULT 'data_entry'
                CHECK (role IN ('super_admin','module_manager','data_entry','view_only')),
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid
);

CREATE TABLE IF NOT EXISTS user_module_access (
  user_id    uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  module     text NOT NULL,
  can_view   boolean NOT NULL DEFAULT true,
  can_edit   boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  can_import boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, module)
);

-- ----------------------------------------------------------------- imports
CREATE TABLE IF NOT EXISTS import_batch (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_file    text NOT NULL,
  sheet_name     text,
  target_table   text NOT NULL,
  column_mapping jsonb,
  row_count      integer,
  inserted_count integer DEFAULT 0,
  matched_count  integer DEFAULT 0,
  error_count    integer DEFAULT 0,
  status         text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','dry_run','committed','rolled_back','failed')),
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  imported_by    uuid,
  notes          text
);

CREATE TABLE IF NOT EXISTS import_staging (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id  bigint NOT NULL REFERENCES import_batch(id) ON DELETE CASCADE,
  row_num   integer NOT NULL,
  raw       jsonb NOT NULL,
  mapped    jsonb,
  person_id uuid,
  target_id text,
  status    text NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending','new','matched','error','skipped','committed')),
  error     text
);

-- ------------------------------------------------------------------- audit
CREATE TABLE IF NOT EXISTS audit.change_log (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name     text NOT NULL,
  record_id      text NOT NULL,
  action         text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_at     timestamptz NOT NULL DEFAULT now(),
  actor_id       uuid,
  old_data       jsonb,
  new_data       jsonb,
  changed_fields text[]
);

-- Falls back through: id column -> composite key -> row hash.
-- person_tag has a composite PK and no id, which is why the fallback exists.
CREATE OR REPLACE FUNCTION audit.log_change() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_old jsonb; v_new jsonb; v_row jsonb; v_changed text[]; v_id text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD); v_new := NULL; v_row := v_old;
  ELSIF TG_OP = 'INSERT' THEN
    v_old := NULL; v_new := to_jsonb(NEW); v_row := v_new;
  ELSE
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_row := v_new;
    SELECT array_agg(e.key ORDER BY e.key) INTO v_changed
      FROM jsonb_each(v_new) e
     WHERE v_old->e.key IS DISTINCT FROM e.value AND e.key <> 'updated_at';
    IF v_changed IS NULL THEN RETURN NEW; END IF;
  END IF;

  v_id := COALESCE(
    v_row->>'id',
    NULLIF(concat_ws(':', v_row->>'person_id', v_row->>'tag_id', v_row->>'user_id', v_row->>'module'), ''),
    md5(v_row::text));

  INSERT INTO audit.change_log (table_name, record_id, action, actor_id, old_data, new_data, changed_fields)
  VALUES (TG_TABLE_NAME, v_id, TG_OP,
          NULLIF(current_setting('app.actor_id', true), '')::uuid,
          v_old, v_new, v_changed);
  RETURN COALESCE(NEW, OLD);
END $fn$;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(NULLIF(current_setting('app.actor_id', true), '')::uuid, NEW.updated_by);
  RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION normalize_person() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.full_name         := btrim(NEW.full_name);
  NEW.initiated_name    := NULLIF(btrim(COALESCE(NEW.initiated_name, '')), '');
  NEW.pan               := NULLIF(upper(btrim(COALESCE(NEW.pan, ''))), '');
  NEW.mobile_number     := NULLIF(regexp_replace(COALESCE(NEW.mobile_number, ''), '[^0-9]', '', 'g'), '');
  NEW.alt_mobile_number := NULLIF(regexp_replace(COALESCE(NEW.alt_mobile_number, ''), '[^0-9]', '', 'g'), '');
  IF NEW.mobile_number     IS NOT NULL AND NEW.mobile_cc     IS NULL THEN NEW.mobile_cc     := '+91'; END IF;
  IF NEW.alt_mobile_number IS NOT NULL AND NEW.alt_mobile_cc IS NULL THEN NEW.alt_mobile_cc := '+91'; END IF;
  NEW.pincode := NULLIF(btrim(COALESCE(NEW.pincode, '')), '');
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_person_normalize   ON person;
DROP TRIGGER IF EXISTS trg_person_updated_at  ON person;
DROP TRIGGER IF EXISTS trg_person_audit       ON person;
DROP TRIGGER IF EXISTS trg_person_tag_audit   ON person_tag;
DROP TRIGGER IF EXISTS trg_occasion_audit     ON occasion;
DROP TRIGGER IF EXISTS trg_app_user_updated_at ON app_user;

CREATE TRIGGER trg_person_normalize  BEFORE INSERT OR UPDATE ON person     FOR EACH ROW EXECUTE FUNCTION normalize_person();
CREATE TRIGGER trg_person_updated_at BEFORE UPDATE           ON person     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_person_audit      AFTER INSERT OR UPDATE OR DELETE ON person     FOR EACH ROW EXECUTE FUNCTION audit.log_change();
CREATE TRIGGER trg_person_tag_audit  AFTER INSERT OR DELETE           ON person_tag FOR EACH ROW EXECUTE FUNCTION audit.log_change();
CREATE TRIGGER trg_occasion_audit    AFTER INSERT OR UPDATE OR DELETE ON occasion   FOR EACH ROW EXECUTE FUNCTION audit.log_change();
CREATE TRIGGER trg_app_user_updated_at BEFORE UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------- indexes
CREATE INDEX IF NOT EXISTS idx_person_mobile_e164     ON person (mobile_e164)     WHERE mobile_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_alt_mobile_e164 ON person (alt_mobile_e164) WHERE alt_mobile_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_email           ON person (email)   WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_pan             ON person (pan)     WHERE pan IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_name_trgm       ON person USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_person_initiated_trgm  ON person USING gin (initiated_name gin_trgm_ops) WHERE initiated_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_area            ON person (area)    WHERE area IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_city            ON person (city)    WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_pincode         ON person (pincode) WHERE pincode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_active          ON person (is_active);
CREATE INDEX IF NOT EXISTS idx_person_needs_review    ON person (needs_review) WHERE needs_review;
CREATE INDEX IF NOT EXISTS idx_person_outpost         ON person (outpost_id) WHERE outpost_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_dob_md          ON person (EXTRACT(MONTH FROM dob), EXTRACT(DAY FROM dob)) WHERE dob IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_created_at      ON person (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_person_source          ON person (source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_tag_tag         ON person_tag (tag_id);
CREATE INDEX IF NOT EXISTS idx_occasion_person        ON occasion (person_id);
CREATE INDEX IF NOT EXISTS idx_occasion_md            ON occasion (EXTRACT(MONTH FROM occasion_date), EXTRACT(DAY FROM occasion_date));
CREATE INDEX IF NOT EXISTS idx_audit_table_record     ON audit.change_log (table_name, record_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at       ON audit.change_log (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_staging_batch   ON import_staging (batch_id, status);

-- --------------------------------------------------------------- functions
CREATE OR REPLACE FUNCTION find_person_by_mobile(p_mobile text, p_cc text DEFAULT '+91')
RETURNS TABLE (id uuid, person_no bigint, display_name text, full_name text,
               initiated_name text, dob date, city text, area text,
               email citext, is_active boolean, matched_on text)
LANGUAGE sql STABLE AS $fn$
  WITH n AS (
    SELECT CASE WHEN p_mobile ~ '^\+'
                THEN regexp_replace(p_mobile, '[^0-9+]', '', 'g')
                ELSE p_cc || regexp_replace(p_mobile, '[^0-9]', '', 'g') END AS e164)
  SELECT p.id, p.person_no, p.display_name, p.full_name, p.initiated_name, p.dob,
         p.city, p.area, p.email, p.is_active,
         CASE WHEN p.mobile_e164 = n.e164 THEN 'primary' ELSE 'alternate' END
    FROM person p, n
   WHERE p.mobile_e164 = n.e164 OR p.alt_mobile_e164 = n.e164
   ORDER BY p.person_no
$fn$;

COMMENT ON FUNCTION find_person_by_mobile IS
  'Entry-time duplicate warning. Returns everyone already using this number so staff can pick an existing person or confirm a genuinely new one.';

-- ------------------------------------------------------------------- views
CREATE OR REPLACE VIEW v_person_duplicate_candidates AS
SELECT p.mobile_e164,
       count(*) AS person_count,
       array_agg(p.person_no    ORDER BY p.person_no) AS person_nos,
       array_agg(p.display_name ORDER BY p.person_no) AS names
  FROM person p
 WHERE p.mobile_e164 IS NOT NULL AND p.is_active
 GROUP BY p.mobile_e164
HAVING count(*) > 1;

CREATE OR REPLACE VIEW v_person_profile AS
SELECT p.*, o.code AS outpost_code, o.name AS outpost_name,
       (SELECT array_agg(t.slug ORDER BY t.slug)
          FROM person_tag pt JOIN tag t ON t.id = pt.tag_id
         WHERE pt.person_id = p.id) AS tags,
       (SELECT count(*) FROM person p2
         WHERE p2.mobile_e164 = p.mobile_e164 AND p2.mobile_e164 IS NOT NULL) AS shares_mobile_with
  FROM person p LEFT JOIN outpost o ON o.id = p.outpost_id;

CREATE OR REPLACE VIEW v_birthdays_today AS
SELECT id, person_no, display_name, dob, mobile_e164, email, city, area, preferred_language,
       date_part('year', age(dob))::int AS turning
  FROM person
 WHERE dob IS NOT NULL AND is_active
   AND EXTRACT(MONTH FROM dob) = EXTRACT(MONTH FROM CURRENT_DATE)
   AND EXTRACT(DAY   FROM dob) = EXTRACT(DAY   FROM CURRENT_DATE);

CREATE OR REPLACE VIEW v_birthdays_next_7_days AS
SELECT id, person_no, display_name, dob, mobile_e164, email, city, area, preferred_language,
       to_char(dob, 'DD Mon') AS day_label
  FROM person
 WHERE dob IS NOT NULL AND is_active
   AND to_char(dob, 'MM-DD') = ANY (SELECT to_char(CURRENT_DATE + s, 'MM-DD') FROM generate_series(0,6) s)
 ORDER BY to_char(dob, 'MM-DD');

CREATE OR REPLACE VIEW v_occasions_next_7_days AS
SELECT o.id, o.person_id, p.person_no, p.display_name, o.occasion_type,
       o.occasion_date, o.note, p.mobile_e164, p.email
  FROM occasion o JOIN person p ON p.id = o.person_id
 WHERE p.is_active
   AND to_char(o.occasion_date, 'MM-DD') = ANY (SELECT to_char(CURRENT_DATE + s, 'MM-DD') FROM generate_series(0,6) s)
 ORDER BY to_char(o.occasion_date, 'MM-DD');
