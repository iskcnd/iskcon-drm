-- ISKCON Chennai — 010 make set_updated_at() safe on tables without updated_by
--
-- THE BUG THIS FIXES (3 Aug 2026):
--   set_updated_at() assigned NEW.updated_by unconditionally. It is attached to
--   payment_attempt and archana_profile, neither of which has that column, so
--   any UPDATE on them raised:
--       record "new" has no field "updated_by"
--
--   That killed the PayU return handler. A donor paid successfully, PayU posted
--   back, markPaid() tried to update payment_attempt, the trigger threw, the
--   whole transaction rolled back, and the donation stayed 'pending'. The donor
--   was shown "an error occurred, no money was deducted" — while the money had
--   in fact been taken. Every payment since the donation page went live was
--   affected; not one was ever recorded as paid.
--
-- Guarding the assignment is the right fix rather than adding updated_by to
-- those tables: the trigger is generic and will be attached to future tables
-- too, and it should degrade quietly rather than abort a payment.
-- Safe to re-run.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.updated_at := now();
  BEGIN
    NEW.updated_by := COALESCE(NULLIF(current_setting('app.actor_id', true), '')::uuid, NEW.updated_by);
  EXCEPTION WHEN undefined_column OR others THEN
    NULL;   -- table has no updated_by; stamping the time is enough
  END;
  RETURN NEW;
END $fn$;

COMMENT ON FUNCTION set_updated_at IS
  'Stamps updated_at, and updated_by when the table has that column. The updated_by assignment is guarded — attaching this trigger to a table without updated_by used to abort the whole transaction, which broke payment confirmation.';
