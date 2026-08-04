-- ISKCON Chennai — 014 raw provider templates
--
-- Replaces the "ordered list of variables" abstraction with the actual
-- provider payload.
--
-- Meta has to approve every WhatsApp template, and Gallabox hands you the exact
-- JSON for it. Re-expressing that as a variables array meant translating by
-- hand and getting bodyValues keys wrong — they aren't always "1","2","3";
-- approved templates often use named keys. Now the complete payload is pasted
-- in as-is and {{placeholders}} are filled recursively. Launching a new
-- template is a paste, not a deploy.
--
-- Email gets full HTML for the same reason: what you write is what is sent.
-- Safe to re-run.

ALTER TABLE notification_config ADD COLUMN IF NOT EXISTS payload_template jsonb;
ALTER TABLE notification_config ADD COLUMN IF NOT EXISTS html             text;
ALTER TABLE notification_config ADD COLUMN IF NOT EXISTS extra_values     jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN notification_config.payload_template IS
  'WhatsApp only. The COMPLETE Gallabox payload exactly as Gallabox provides it for the approved template, channelId included. Every {{placeholder}} is filled per donation. Launching a new template means pasting new JSON — no code change.';
COMMENT ON COLUMN notification_config.html IS
  'Email only. Full HTML with {{placeholders}}.';
COMMENT ON COLUMN notification_config.extra_values IS
  'Static values for placeholders that are not donation fields, e.g. {"support_phone":"6385042108"}. Donation fields win on conflict.';

-- Seed the receipt template with the shape Gallabox returns.
UPDATE notification_config SET payload_template = jsonb_build_object(
  'channelId', '',
  'channelType', 'whatsapp',
  'recipient', jsonb_build_object('name', '{{donor_name}}', 'rawPhone', '{{phone}}'),
  'whatsapp', jsonb_build_object(
    'type', 'template',
    'template', jsonb_build_object(
      'templateName', 'receipt_new_format_test',
      'bodyValues', jsonb_build_object(
        '1', '{{donor_name}}', '2', '{{amount}}', '3', '{{purpose}}', '4', '{{receipt_no}}'),
      'headerValues', jsonb_build_object(
        'mediaUrl', '{{receipt_url}}', 'mediaName', 'Receipt-{{receipt_no}}.pdf'))))
WHERE slug = 'receipt-whatsapp' AND payload_template IS NULL;
