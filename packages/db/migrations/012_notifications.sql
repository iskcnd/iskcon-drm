-- ISKCON Chennai — 012 outbound notifications
--
-- Receipts by WhatsApp and email. Modelled as a queue with a log, not
-- fire-and-forget, because "did the donor get their receipt?" is a question
-- staff will be asked and must be able to answer.
--
-- During the Zoho transition Zoho may also message the donor. NOTIFY_CHANNELS
-- controls who sends, so nobody receives two receipts for one donation.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS notification (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  channel      text NOT NULL CHECK (channel IN ('whatsapp','email','sms')),
  purpose      text NOT NULL,              -- receipt, thank_you, reminder, otp
  person_id    uuid REFERENCES person(id) ON DELETE SET NULL,
  donation_id  bigint REFERENCES donation(id) ON DELETE SET NULL,

  to_address   text NOT NULL,              -- e164 for whatsapp/sms, address for email
  template     text,                       -- Gallabox template name where relevant
  payload      jsonb,                      -- what we sent
  body_preview text,                       -- readable summary for staff

  status       text NOT NULL DEFAULT 'queued'
               CHECK (status IN ('queued','sent','failed','skipped','dead')),
  attempts     smallint NOT NULL DEFAULT 0,
  last_error   text,
  provider_id  text,                       -- provider's message id, for support tickets
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_due
  ON notification (next_attempt_at) WHERE status IN ('queued','failed');
CREATE INDEX IF NOT EXISTS idx_notification_donation ON notification (donation_id);
CREATE INDEX IF NOT EXISTS idx_notification_person   ON notification (person_id);

-- One receipt per channel per donation. A retry updates the existing row rather
-- than sending a second copy — a donor receiving two receipts for one gift will
-- reasonably think they were charged twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_receipt
  ON notification (donation_id, channel, purpose)
  WHERE donation_id IS NOT NULL AND purpose = 'receipt';

COMMENT ON TABLE notification IS
  'Outbound WhatsApp/email/SMS queue and log. Every send is recorded so staff can answer "did the donor get their receipt?" without guessing.';
COMMENT ON COLUMN notification.status IS
  'skipped = deliberately not sent (channel disabled, or Zoho is handling it during the transition).';
