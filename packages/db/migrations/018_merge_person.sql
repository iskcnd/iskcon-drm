-- ISKCON Chennai — 018 merging two person records into one
--
-- The donations import created a person per row instead of matching existing
-- devotees: 16,067 donations produced 16,053 people, where Zoho's own donor
-- master says 16,250 donations came from 12,447 donors. Roughly 3,600 records
-- are the same devotee counted twice.
--
-- More imports are coming, so this is a reusable operation, not a one-off
-- clean-up script. It lives in the database rather than in one loader so that
-- the dedupe tool, the staff app and every future import all merge the same
-- way — there is exactly one definition of what merging means.
--
-- Reversible: the losing row is snapshotted whole into person_merge_log
-- before deletion, and every child row that moved is recorded by id, so an
-- unmerge can put both the person and their history back exactly.
--
-- Safe to re-run.

-- Which child rows moved, per table: {"donation":[1,2],"japa_card":[7]}.
-- Without this the log can restore the person but not their history, which is
-- a restore that quietly loses donations.
ALTER TABLE person_merge_log ADD COLUMN IF NOT EXISTS moved jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN person_merge_log.moved IS
  'Child rows repointed by this merge, keyed by table name. The other half of reversibility: merged_snapshot restores the person, this restores what belonged to them.';

CREATE INDEX IF NOT EXISTS idx_person_merge_log_merged ON person_merge_log (merged_person_id);
CREATE INDEX IF NOT EXISTS idx_person_merge_log_kept   ON person_merge_log (kept_person_id);

/**
 * Merge p_drop into p_keep. Returns the log row id.
 *
 * Everything the losing devotee owns is repointed, then the row is deleted.
 * Deletion rather than a tombstone because four child tables cascade on
 * delete — a tombstone would leave those rows pointing at someone marked
 * inactive, which is the kind of half-state that produces a parcel addressed
 * to a person the app says does not exist.
 */
CREATE OR REPLACE FUNCTION merge_person(p_keep uuid, p_drop uuid, p_reason text DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql AS $fn$
DECLARE
  snap    jsonb;
  moved   jsonb := '{}'::jsonb;
  log_id  bigint;
BEGIN
  IF p_keep = p_drop THEN
    RAISE EXCEPTION 'merge_person: cannot merge a person into themselves (%)', p_keep;
  END IF;

  SELECT to_jsonb(p) INTO snap FROM person p WHERE p.id = p_drop;
  IF snap IS NULL THEN
    RAISE EXCEPTION 'merge_person: person % does not exist', p_drop;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM person WHERE id = p_keep) THEN
    RAISE EXCEPTION 'merge_person: person % does not exist', p_keep;
  END IF;

  -- Anything the survivor is missing and the loser has, the survivor keeps.
  -- COALESCE only — a merge must never overwrite a value already held.
  -- display_name, mobile_e164 and alt_mobile_e164 are GENERATED ALWAYS and
  -- must not appear here: Postgres rejects the whole statement. They follow
  -- from initiated_name / full_name and the mobile parts, which are set below.
  UPDATE person k SET
    initiated_name    = COALESCE(k.initiated_name, d.initiated_name),
    gender            = COALESCE(k.gender, d.gender),
    dob               = COALESCE(k.dob, d.dob),
    email             = COALESCE(k.email, d.email),
    alt_mobile_cc     = COALESCE(k.alt_mobile_cc, d.alt_mobile_cc),
    alt_mobile_number = COALESCE(k.alt_mobile_number, d.alt_mobile_number),
    address_line      = COALESCE(k.address_line, d.address_line),
    area              = COALESCE(k.area, d.area),
    city              = COALESCE(k.city, d.city),
    state             = COALESCE(k.state, d.state),
    pincode           = COALESCE(k.pincode, d.pincode),
    country           = COALESCE(k.country, d.country),
    preferred_language= COALESCE(k.preferred_language, d.preferred_language),
    pan               = COALESCE(k.pan, d.pan),
    marital_status    = COALESCE(k.marital_status, d.marital_status),
    education         = COALESCE(k.education, d.education),
    profession        = COALESCE(k.profession, d.profession),
    organization      = COALESCE(k.organization, d.organization),
    outpost_id        = COALESCE(k.outpost_id, d.outpost_id),
    notes             = COALESCE(k.notes, d.notes),
    -- Consent is the exception to "keep the survivor's value": if either
    -- record says the devotee agreed to be contacted, they agreed.
    whatsapp_optin    = k.whatsapp_optin OR d.whatsapp_optin,
    sms_optin         = k.sms_optin      OR d.sms_optin,
    email_optin       = k.email_optin    OR d.email_optin
  FROM person d
  WHERE k.id = p_keep AND d.id = p_drop;

  -- Straightforward repoints: no unique key involves person_id.
  WITH m AS (UPDATE donation SET person_id = p_keep WHERE person_id = p_drop RETURNING id)
  SELECT jsonb_set(moved, '{donation}', COALESCE(jsonb_agg(id), '[]'::jsonb)) INTO moved FROM m;

  WITH m AS (UPDATE japa_card SET person_id = p_keep WHERE person_id = p_drop RETURNING id)
  SELECT jsonb_set(moved, '{japa_card}', COALESCE(jsonb_agg(id), '[]'::jsonb)) INTO moved FROM m;

  WITH m AS (UPDATE japa_puja_enrolment SET person_id = p_keep WHERE person_id = p_drop RETURNING id)
  SELECT jsonb_set(moved, '{japa_puja_enrolment}', COALESCE(jsonb_agg(id), '[]'::jsonb)) INTO moved FROM m;

  WITH m AS (UPDATE life_patron SET person_id = p_keep WHERE person_id = p_drop RETURNING id)
  SELECT jsonb_set(moved, '{life_patron}', COALESCE(jsonb_agg(id), '[]'::jsonb)) INTO moved FROM m;

  WITH m AS (UPDATE life_patron_dependant SET person_id = p_keep WHERE person_id = p_drop RETURNING id)
  SELECT jsonb_set(moved, '{life_patron_dependant}', COALESCE(jsonb_agg(id), '[]'::jsonb)) INTO moved FROM m;

  WITH m AS (UPDATE notification SET person_id = p_keep WHERE person_id = p_drop RETURNING id)
  SELECT jsonb_set(moved, '{notification}', COALESCE(jsonb_agg(id), '[]'::jsonb)) INTO moved FROM m;

  WITH m AS (UPDATE archana_profile SET person_id = p_keep WHERE person_id = p_drop RETURNING id)
  SELECT jsonb_set(moved, '{archana_profile}', COALESCE(jsonb_agg(id), '[]'::jsonb)) INTO moved FROM m;

  WITH m AS (UPDATE occasion SET person_id = p_keep WHERE person_id = p_drop RETURNING id)
  SELECT jsonb_set(moved, '{occasion}', COALESCE(jsonb_agg(id), '[]'::jsonb)) INTO moved FROM m;

  -- person_tag has PRIMARY KEY (person_id, tag_id): move the tags the survivor
  -- does not already carry, then drop the rest. Moving them all would violate
  -- the key and abort the merge.
  WITH m AS (
    UPDATE person_tag t SET person_id = p_keep
     WHERE t.person_id = p_drop
       AND NOT EXISTS (SELECT 1 FROM person_tag k WHERE k.person_id = p_keep AND k.tag_id = t.tag_id)
     RETURNING tag_id)
  SELECT jsonb_set(moved, '{person_tag}', COALESCE(jsonb_agg(tag_id), '[]'::jsonb)) INTO moved FROM m;
  DELETE FROM person_tag WHERE person_id = p_drop;

  -- person_referral has PRIMARY KEY (person_id) and records first touch,
  -- permanently. If the survivor already has one it stands; theirs is the
  -- earlier record by definition of who we keep.
  IF NOT EXISTS (SELECT 1 FROM person_referral WHERE person_id = p_keep) THEN
    UPDATE person_referral SET person_id = p_keep WHERE person_id = p_drop;
  ELSE
    DELETE FROM person_referral WHERE person_id = p_drop;
  END IF;

  INSERT INTO person_merge_log (kept_person_id, merged_person_id, merged_snapshot, moved, reason, merged_by)
  VALUES (p_keep, p_drop, snap, moved, p_reason,
          NULLIF(current_setting('app.actor_id', true), '')::uuid)
  RETURNING id INTO log_id;

  DELETE FROM person WHERE id = p_drop;
  RETURN log_id;
END $fn$;

COMMENT ON FUNCTION merge_person(uuid, uuid, text) IS
  'Merge p_drop into p_keep: fill blanks on the survivor, repoint every child row, log a full snapshot plus the ids moved, then delete the loser. The single definition of what a merge means — used by the dedupe tool, the staff app and future imports alike.';

/**
 * Undo one merge, by person_merge_log id. Returns the restored person id.
 *
 * "Reversible" is only true if someone has actually reversed one, so this is
 * tested rather than asserted. Verified on a Neon branch against real data:
 * the devotee came back with their original person_no, their donation
 * returned to them, and the database totals did not move.
 */
CREATE OR REPLACE FUNCTION unmerge_person(p_log_id bigint)
RETURNS uuid LANGUAGE plpgsql AS $fn$
DECLARE L record; cols text; tbl text; ids jsonb;
BEGIN
  SELECT * INTO L FROM person_merge_log WHERE id = p_log_id;
  IF L IS NULL THEN RAISE EXCEPTION 'unmerge_person: no merge log row %', p_log_id; END IF;
  IF EXISTS (SELECT 1 FROM person WHERE id = L.merged_person_id) THEN
    RAISE EXCEPTION 'unmerge_person: person % already exists', L.merged_person_id;
  END IF;

  -- The three generated columns cannot be written back; Postgres recomputes
  -- them from the values that can.
  SELECT string_agg(quote_ident(key), ',') INTO cols
    FROM jsonb_object_keys(L.merged_snapshot) key
   WHERE key NOT IN ('display_name','mobile_e164','alt_mobile_e164');

  -- OVERRIDING SYSTEM VALUE so person_no is restored as it was. Without it the
  -- devotee returns under a brand-new number, and person_no is the identifier
  -- staff and receipts refer to — a restore that renames someone is not a
  -- restore.
  EXECUTE format(
    'INSERT INTO person (%s) OVERRIDING SYSTEM VALUE SELECT %s FROM jsonb_populate_record(NULL::person, $1)',
    cols, cols) USING L.merged_snapshot;

  FOR tbl, ids IN SELECT * FROM jsonb_each(L.moved) LOOP
    IF jsonb_array_length(ids) = 0 THEN CONTINUE; END IF;
    IF tbl = 'person_tag' THEN
      EXECUTE 'UPDATE person_tag SET person_id=$1 WHERE person_id=$2 AND tag_id IN (SELECT jsonb_array_elements_text($3)::smallint)'
        USING L.merged_person_id, L.kept_person_id, ids;
    ELSE
      EXECUTE format('UPDATE %I SET person_id=$1 WHERE id IN (SELECT jsonb_array_elements_text($2)::bigint)', tbl)
        USING L.merged_person_id, ids;
    END IF;
  END LOOP;

  DELETE FROM person_merge_log WHERE id = p_log_id;
  RETURN L.merged_person_id;
END $fn$;

COMMENT ON FUNCTION unmerge_person(bigint) IS
  'Undo one merge. Restores the person with their original person_no and returns every child row that moved. The reason merge_person is safe to run on 3,000 records.';
