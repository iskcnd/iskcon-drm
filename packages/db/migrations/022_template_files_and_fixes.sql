-- ISKCON Chennai — 022 letter templates live in the database
--
-- The first cut kept letter documents in Cloudflare R2 behind R2_PUBLIC_BASE.
-- That env var was never set, so "Generate letters" could not work, and there
-- was no screen to upload a document to R2 in the first place. Three things to
-- configure — bucket, credentials, public base — for one file of about 50kB.
--
-- The document now lives in the row it belongs to. One less service, one less
-- secret, and a template that cannot go missing separately from its record.
--
-- Safe to re-run.

ALTER TABLE dispatch.template ADD COLUMN IF NOT EXISTS file_data   bytea;
ALTER TABLE dispatch.template ADD COLUMN IF NOT EXISTS file_name   text;
ALTER TABLE dispatch.template ADD COLUMN IF NOT EXISTS file_size   integer;
ALTER TABLE dispatch.template ADD COLUMN IF NOT EXISTS uploaded_at timestamptz;

COMMENT ON COLUMN dispatch.template.file_data IS
  'The .docx itself. In the database rather than object storage because a letter template is about 50kB, there is one of them, and a bucket plus credentials plus a public base URL is three more things to configure and get wrong at this size.';

-- A batch that was created by mistake has to be cancellable; without this the
-- only way out was to leave a wrong batch sitting in the list for ever.
ALTER TABLE dispatch.batch DROP CONSTRAINT IF EXISTS batch_status_check;
ALTER TABLE dispatch.batch ADD CONSTRAINT batch_status_check
  CHECK (status IN ('draft','generated','printed','dispatched','closed','cancelled'));
