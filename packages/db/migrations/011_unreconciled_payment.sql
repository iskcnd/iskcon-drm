-- ISKCON Chennai — 011 unreconciled payments
--
-- When a gateway confirms a payment but the app fails to record it, the money
-- is real and the donation row is not. Before this table that state was
-- invisible: the donor saw an error, the database showed nothing, and the only
-- trace was a line in a bank statement weeks later.
--
-- The PayU return handler now writes here whenever it throws after a verified
-- success, so every such payment is findable and can be reconciled by hand.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS unreconciled_payment (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gateway        text NOT NULL,
  order_ref      text,
  gateway_txn_id text,
  amount         numeric(12,2),
  raw            jsonb NOT NULL,          -- everything the gateway posted
  error          text,
  seen_count     integer NOT NULL DEFAULT 1,
  resolved       boolean NOT NULL DEFAULT false,
  resolved_note  text,
  donation_id    bigint REFERENCES donation(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- A gateway may post the same result more than once; count it rather than
-- creating duplicate rows for one payment.
CREATE UNIQUE INDEX IF NOT EXISTS uq_unreconciled
  ON unreconciled_payment (gateway, gateway_txn_id)
  WHERE gateway_txn_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_unreconciled_open
  ON unreconciled_payment (resolved) WHERE NOT resolved;

COMMENT ON TABLE unreconciled_payment IS
  'Payments the gateway confirmed but the app failed to record. Money is in the bank; the donation row is not. Must be reconciled by hand — this table is what makes that possible instead of discovering it in a bank statement months later.';
