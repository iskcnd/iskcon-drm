-- ISKCON Chennai DRM — 003 third-party read surface
-- Curated views only. PAN, email, full address and full phone are never exposed.
-- Safe to re-run.

CREATE OR REPLACE VIEW api.person AS
SELECT p.person_no,
       p.display_name,
       p.gender,
       CASE WHEN p.dob IS NULL THEN NULL
            WHEN date_part('year', age(p.dob)) < 18 THEN 'under_18'
            WHEN date_part('year', age(p.dob)) < 30 THEN '18_29'
            WHEN date_part('year', age(p.dob)) < 45 THEN '30_44'
            WHEN date_part('year', age(p.dob)) < 60 THEN '45_59'
            ELSE '60_plus' END AS age_band,
       CASE WHEN p.mobile_e164 IS NULL THEN NULL
            ELSE p.mobile_cc
                 || repeat('X', greatest(length(p.mobile_number) - 4, 0))
                 || right(p.mobile_number, 4) END AS mobile_masked,
       p.area, p.city, p.state, p.pincode, p.country,
       p.preferred_language,
       o.code AS outpost_code,
       p.whatsapp_optin, p.sms_optin, p.email_optin,
       p.is_active, p.created_at
  FROM person p LEFT JOIN outpost o ON o.id = p.outpost_id;

CREATE OR REPLACE VIEW api.person_tag AS
SELECT p.person_no, t.slug AS tag_slug, t.name AS tag_name,
       t.category AS tag_category, pt.tagged_at
  FROM person_tag pt
  JOIN person p ON p.id = pt.person_id
  JOIN tag    t ON t.id = pt.tag_id
 WHERE p.is_active AND t.is_active;

CREATE OR REPLACE VIEW api.outpost AS
SELECT code, name, city, is_active FROM outpost;

CREATE OR REPLACE VIEW api.tag AS
SELECT slug, name, category, description FROM tag WHERE is_active;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'drm_readonly') THEN
    CREATE ROLE drm_readonly NOLOGIN;
  END IF;
END $do$;

GRANT USAGE ON SCHEMA api TO drm_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA api TO drm_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT SELECT ON TABLES TO drm_readonly;

COMMENT ON ROLE drm_readonly IS
  'Group role for third-party read access. Grant to a per-partner login role; never grant public schema access.';
