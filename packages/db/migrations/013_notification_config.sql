-- ISKCON Chennai — 013 notification configuration
--
-- Which messages go out, on which channel, using which provider template and
-- variable mapping. In the database rather than env so staff can add a message
-- or switch one off without a deploy — and so the mapping is visible rather
-- than buried in code.
--
-- NOTIFY_CHANNELS stays as a master kill switch for the whole channel; this
-- table controls individual messages within an enabled channel.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS notification_config (
  id             smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug           text NOT NULL UNIQUE,
  name           text NOT NULL,
  purpose        text NOT NULL,              -- receipt, thank_you, reminder, birthday
  channel        text NOT NULL CHECK (channel IN ('whatsapp','email','sms')),
  is_active      boolean NOT NULL DEFAULT false,

  template       text,                       -- provider template name (Gallabox)
  subject        text,                       -- email only
  body           text,                       -- email only; {{placeholders}}
  attach_receipt boolean NOT NULL DEFAULT false,

  variables      jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid
);

COMMENT ON TABLE notification_config IS
  'Which messages the system sends, on which channel, with which provider template and variable mapping. Editable from the staff app so adding or disabling a message needs no deploy.';
COMMENT ON COLUMN notification_config.variables IS
  'Ordered list of field names mapped to the provider template positions, e.g. ["donor_name","amount","purpose","receipt_no"] becomes bodyValues {"1":..,"2":..}. Available fields: donor_name, amount, amount_words, purpose, receipt_no, receipt_url, seva_date, donated_on, temple_name.';
COMMENT ON COLUMN notification_config.is_active IS
  'Master switch per message. Off means the row is still logged as skipped, so history shows what would have been sent.';

DROP TRIGGER IF EXISTS trg_notification_config_updated_at ON notification_config;
CREATE TRIGGER trg_notification_config_updated_at BEFORE UPDATE ON notification_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO notification_config
  (slug, name, purpose, channel, is_active, template, attach_receipt, variables, notes)
VALUES
  ('receipt-whatsapp', 'Donation receipt (WhatsApp)', 'receipt', 'whatsapp', false,
   'receipt_new_format_test', true,
   '["donor_name","amount","purpose","receipt_no"]'::jsonb,
   'Gallabox template. bodyValues are positional: 1=name, 2=amount, 3=purpose, 4=receipt no. Receipt PDF goes in the media header.'),
  ('receipt-email', 'Donation receipt (Email)', 'receipt', 'email', false,
   NULL, true,
   '["donor_name","amount","purpose","receipt_no","receipt_url"]'::jsonb,
   'Subject and body are editable here.')
ON CONFLICT (slug) DO NOTHING;

UPDATE notification_config
   SET subject = 'Your ISKCON Chennai receipt {{receipt_no}}'
 WHERE slug = 'receipt-email' AND subject IS NULL;
