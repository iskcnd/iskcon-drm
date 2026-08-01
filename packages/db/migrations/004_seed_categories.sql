-- ISKCON Chennai DRM — 004 seed categories
-- Adding a new category later is one INSERT here, or one click in the dashboard.
-- Safe to re-run.

INSERT INTO tag (slug, name, category, description) VALUES
  ('donor',          'Donor',          'Segment',    'Has given at least one donation'),
  ('japa-desk',      'Japa Desk',      'Program',    'Enrolled at the Japa Desk'),
  ('japa-puja',      'Japa Puja',      'Program',    'Completed a japa card and took the vow'),
  ('iys-boys',       'IYS Boys',       'Youth',      'ISKCON Youth Services - boys'),
  ('iys-girls',      'IYS Girls',      'Youth',      'ISKCON Youth Services - girls'),
  ('unnati-club',    'Unnati Club',    'Youth',      'Unnati Club member'),
  ('congregation',   'Congregation',   'Segment',    'General congregation member'),
  ('volunteer',      'Volunteer',      'Service',    'Active volunteer'),
  ('life-patron',    'Life Patron',    'Membership', 'Life Patron member'),
  ('nitya-seva',     'Nitya Seva',     'Membership', 'Recurring seva pledge'),
  ('bhakti-vriksha', 'Bhakti Vriksha', 'Program',    'Bhakti Vriksha participant'),
  ('bhakti-sastri',  'Bhakti Sastri',  'Course',     'Bhakti Sastri student'),
  ('outpost-member', 'Outpost Member', 'Segment',    'Attends an outpost rather than the main temple')
ON CONFLICT (slug) DO NOTHING;
