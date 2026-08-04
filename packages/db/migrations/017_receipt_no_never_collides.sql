-- ISKCON Chennai — 017 a receipt number collision must never cost a payment
--
-- Twice now a donation has been charged by the gateway and refused by us,
-- because next_receipt_no() returned a number that was already on a donation
-- row and the insert died on donation_receipt_no_key. The first time the
-- sequence had been rewound by a migration; the second time a receipt was
-- assigned by hand and the sequence did not know.
--
-- Both were fixed at the source. Neither should have been able to cost money
-- in the first place. A sequence cannot know about numbers written to the
-- table by any other route — a hand correction, a restored backup, an import
-- from Zoho — so it must not be trusted blindly at the one moment where
-- failure means a donor is charged and gets nothing.
--
-- Safe to re-run.

CREATE OR REPLACE FUNCTION next_receipt_no() RETURNS text
LANGUAGE plpgsql VOLATILE AS $fn$
DECLARE
  candidate bigint;
  guard     integer := 0;
BEGIN
  LOOP
    candidate := nextval('receipt_seq');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM donation WHERE receipt_no = candidate::text
    );

    -- Skipping a used number is normal and silent. Skipping thousands means
    -- the sequence is far behind the table, which is worth saying out loud
    -- rather than burning numbers forever inside a payment transaction.
    guard := guard + 1;
    IF guard > 5000 THEN
      RAISE EXCEPTION
        'next_receipt_no: 5000 consecutive receipt numbers already in use from %. The sequence is far behind the donation table.',
        candidate;
    END IF;
  END LOOP;

  RETURN candidate::text;
END $fn$;

COMMENT ON FUNCTION next_receipt_no() IS
  'Next unused receipt number. Skips any number already present on a donation, because the sequence cannot know about receipts written by hand, restored from a backup, or imported from Zoho — and a collision here means a donor was charged and got nothing.';

-- Bring the sequence up to the table before the next payment needs it, so the
-- loop above is a safety net rather than the normal path.
SELECT setval('receipt_seq',
              GREATEST(
                200000,
                COALESCE((SELECT max(receipt_no::bigint) FROM donation
                           WHERE receipt_no ~ '^[0-9]+$'), 0) + 1,
                (SELECT CASE WHEN is_called THEN last_value + 1 ELSE last_value END
                   FROM receipt_seq)),
              false);
