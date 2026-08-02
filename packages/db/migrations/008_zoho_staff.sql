-- ISKCON Chennai — 008 Zoho employee & volunteer reference
--
-- The Zoho webhook sends record ids for Seva_Type, Select_Seva_Category and
-- Payment_Type, but was sending Employee_Name and Volunteer_Name as plain text.
-- Those are lookup fields in Zoho Creator too, so the text was going nowhere.
-- These tables hold the id for each, keyed on a normalised name so the messy
-- values in the export ("   Anna Daan  Counter  ") still resolve.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS zoho_employee (
  id         smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zoho_id    text NOT NULL UNIQUE,
  name       text NOT NULL,
  -- Collapses runs of whitespace and lowercases, so lookups survive the
  -- inconsistent spacing Zoho exports.
  match_name text GENERATED ALWAYS AS (lower(btrim(regexp_replace(name, '\s+', ' ', 'g')))) STORED,
  email      citext,
  phone      text,
  is_active  boolean NOT NULL DEFAULT true,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zoho_employee_match ON zoho_employee (match_name);

CREATE TABLE IF NOT EXISTS zoho_volunteer (
  id          smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zoho_id     text NOT NULL UNIQUE,
  name        text NOT NULL,
  match_name  text GENERATED ALWAYS AS (lower(btrim(regexp_replace(name, '\s+', ' ', 'g')))) STORED,
  email       citext,
  phone       text,
  employee_id smallint REFERENCES zoho_employee(id),
  is_system   boolean NOT NULL DEFAULT false,
  is_active   boolean NOT NULL DEFAULT true,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zoho_volunteer_match ON zoho_volunteer (match_name);

COMMENT ON COLUMN zoho_volunteer.is_system IS
  'Several "volunteers" in Zoho are automated senders (WA Sys, StudyGita Emailer) rather than people. Flagged so reports on volunteer activity do not count robots as devotees.';

-- ------------------------------------------------------------------ employees
INSERT INTO zoho_employee (zoho_id, name, email, phone) VALUES
  ('251028000000995005', 'Paramatma Prabhuji',    NULL,                              '+919330453236'),
  ('251028000000995011', 'Arjun Prabhuji',        NULL,                              '+918438626481'),
  ('251028000000942014', 'Anna Daan Counter',     'annadaaniskconchennai@gmail.com', '+918754545642'),
  ('251028000000963201', 'Arun',                  'chennaiiskconsankirtan@gmail.com','+918016825497'),
  ('251028000001391066', 'Damodara Priya Mataji', 'coreacc@iskconchennai.org',       '+919841268423'),
  ('251028000000942020', 'Dharaapathi Daas',      'dharaapathi.jps@gmail.com',       '+919444107585'),
  ('251028000000753031', 'Dipankar Prabhuji',     'dipankarpatra100@gmail.com',      '+918807356653'),
  ('251028000002151307', 'Life Patron',           'iskconchennailm@gmail.com',       '+919840287268'),
  ('251028000000942005', 'Suhasya Jagannath',     'suhasyajagannathadas@gmail.com',  '+919087705222')
ON CONFLICT (zoho_id) DO UPDATE
  SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone;

-- ----------------------------------------------------------------- volunteers
-- NOTE: Zoho holds two records each for "Subash" and "deep" — same person, same
-- email, same phone, two ids. The newer id is kept active and the older marked
-- inactive so the webhook resolves to one. Confirm which Zoho actually wants.
INSERT INTO zoho_volunteer (zoho_id, name, email, phone, is_system, is_active, notes) VALUES
  ('251028000005961003', 'WA Sys',            'annadaaniskconchennai@gmail.com', '+917418860115', true,  true,  'Automated WhatsApp sender'),
  ('251028000004869015', 'IYS Services',      'dipankarpatra100@gmail.com',      '+918807356653', true,  true,  'IYS system account'),
  ('251028000002103103', 'Karunakar Das',     'karunakaran48@gmail.com',         '+918610032882', false, true,  NULL),
  ('251028000002078011', 'Subash',            'subash.naik16@gmail.com',         '+919703252921', false, true,  'Duplicate in Zoho; older record 251028000001372625 disabled'),
  ('251028000002078005', 'deep',              'annadaaniskchn@gmail.com',        '+918754545642', false, true,  'Duplicate in Zoho; older record 251028000001372593 disabled'),
  ('251028000001591315', 'StudyGita Emailer', 'sukirti@studygita.com',           '+919790710432', true,  true,  'Automated mailer'),
  ('251028000001372625', 'Subash',            'subash.naik16@gmail.com',         '+919703252921', false, false, 'Older duplicate of 251028000002078011'),
  ('251028000001372593', 'deep',              'annadaaniskchn@gmail.com',        '+918754545642', false, false, 'Older duplicate of 251028000002078005'),
  ('251028000000984005', 'S Murali',          'srinivasanmurali64@gmail.com',    '+919445954740', false, true,  NULL),
  ('251028000000949021', 'Samanth Patro',     'samanth.patro@gmail.com',         '+919791039549', false, true,  NULL),
  ('251028000000949015', 'Geetha Priya',      'arunpriya250212@gmail.com',       '+919790962733', false, true,  NULL),
  ('251028000000873027', 'Study Gita',        NULL,                              NULL,            true,  true,  'System account'),
  ('251028000000873021', 'Iskcon Chennai',    NULL,                              NULL,            true,  true,  'System account')
ON CONFLICT (zoho_id) DO UPDATE
  SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone,
      is_system = EXCLUDED.is_system, is_active = EXCLUDED.is_active, notes = EXCLUDED.notes;

-- Link volunteers to the employee they report to, by normalised name.
UPDATE zoho_volunteer v SET employee_id = e.id
  FROM zoho_employee e
 WHERE v.employee_id IS NULL AND e.match_name = CASE v.zoho_id
   WHEN '251028000005961003' THEN 'anna daan counter'
   WHEN '251028000004869015' THEN 'arun'
   WHEN '251028000002103103' THEN 'suhasya jagannath'
   WHEN '251028000002078011' THEN 'anna daan counter'
   WHEN '251028000002078005' THEN 'anna daan counter'
   WHEN '251028000001591315' THEN 'arun'
   WHEN '251028000001372625' THEN 'anna daan counter'
   WHEN '251028000001372593' THEN 'anna daan counter'
   WHEN '251028000000984005' THEN 'suhasya jagannath'
   WHEN '251028000000949021' THEN 'suhasya jagannath'
   WHEN '251028000000949015' THEN 'dharaapathi daas'
   WHEN '251028000000873027' THEN 'arun'
   WHEN '251028000000873021' THEN 'arun'
 END;

-- Names in donations that resolve to no Zoho record — check after each import.
CREATE OR REPLACE VIEW v_unmapped_staff AS
SELECT 'employee' AS kind, d.collected_by AS name, count(*) AS donations
  FROM donation d
 WHERE d.collected_by IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM zoho_employee e
                    WHERE e.match_name = lower(btrim(regexp_replace(d.collected_by, '\s+', ' ', 'g'))))
 GROUP BY 2
UNION ALL
SELECT 'volunteer', d.volunteer_name, count(*)
  FROM donation d
 WHERE d.volunteer_name IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM zoho_volunteer v
                    WHERE v.match_name = lower(btrim(regexp_replace(d.volunteer_name, '\s+', ' ', 'g'))))
 GROUP BY 2;
