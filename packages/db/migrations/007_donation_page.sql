-- ISKCON Chennai DRM — 007 public donation page backend
--
-- Everything the public page (apps/donate) needs: page-facing category fields
-- with i18n + impact presets, goal-based campaigns, payment attempts for the
-- PayU → Razorpay → Easebuzz cascade, a webhook outbox for the Zoho Flow sync,
-- and a receipt number series (D8; "both during transition" per D33).
-- Safe to re-run.

-- ------------------------------------------------------- seva_category: page fields
ALTER TABLE seva_category ADD COLUMN IF NOT EXISTS kind          text NOT NULL DEFAULT 'one_time';
ALTER TABLE seva_category ADD COLUMN IF NOT EXISTS icon          text;
ALTER TABLE seva_category ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 100;
ALTER TABLE seva_category ADD COLUMN IF NOT EXISTS min_amount    numeric(12,2) NOT NULL DEFAULT 101;
ALTER TABLE seva_category ADD COLUMN IF NOT EXISTS name_i18n     jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE seva_category ADD COLUMN IF NOT EXISTS line_i18n     jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE seva_category ADD COLUMN IF NOT EXISTS emo_i18n      jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE seva_category ADD COLUMN IF NOT EXISTS presets       jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE seva_category ADD COLUMN IF NOT EXISTS show_on_page  boolean NOT NULL DEFAULT false;
ALTER TABLE seva_category ADD COLUMN IF NOT EXISTS tag           text;
ALTER TABLE seva_category ADD COLUMN IF NOT EXISTS zoho_seva_type_id text;
ALTER TABLE seva_category ADD COLUMN IF NOT EXISTS zoho_category_id  text;

ALTER TABLE seva_category DROP CONSTRAINT IF EXISTS seva_category_kind_check;
ALTER TABLE seva_category ADD CONSTRAINT seva_category_kind_check
  CHECK (kind IN ('one_time','monthly','dated'));

COMMENT ON COLUMN seva_category.presets IS
  'Impact-framed amount chips: [{"amount":501,"impact":{"en":"feeds 25 devotees","ta":"…","hi":"…"}}]. Edited from admin, rendered by the public page.';
COMMENT ON COLUMN seva_category.show_on_page IS
  'is_active governs internal use (counter, imports); show_on_page governs the public donation page. A category can be live internally but hidden publicly.';
COMMENT ON COLUMN seva_category.zoho_seva_type_id IS
  'Zoho Creator record id sent as Seva_Type in the webhook (D34). Paste from Zoho when a category is created.';

-- --------------------------------------------------------------- campaigns
CREATE TABLE IF NOT EXISTS campaign (
  id               smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug             text NOT NULL UNIQUE,
  title_i18n       jsonb NOT NULL DEFAULT '{}'::jsonb,
  line_i18n        jsonb NOT NULL DEFAULT '{}'::jsonb,
  goal_amount      numeric(14,2) CHECK (goal_amount IS NULL OR goal_amount > 0),
  starts_on        date,
  ends_on          date,
  is_live          boolean NOT NULL DEFAULT false,
  display_order    integer NOT NULL DEFAULT 100,
  seva_category_id smallint REFERENCES seva_category(id),
  presets          jsonb NOT NULL DEFAULT '[]'::jsonb,
  zoho_seva_type_id text,
  zoho_category_id  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid,
  updated_by       uuid
);
COMMENT ON TABLE campaign IS
  'Goal-based drives (e.g. ₹25L Janmashtami). Progress is computed from paid donations with campaign_id — never stored, so it cannot drift.';

DROP TRIGGER IF EXISTS trg_campaign_updated_at ON campaign;
CREATE TRIGGER trg_campaign_updated_at BEFORE UPDATE ON campaign
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_campaign_audit ON campaign;
CREATE TRIGGER trg_campaign_audit AFTER INSERT OR UPDATE OR DELETE ON campaign
  FOR EACH ROW EXECUTE FUNCTION audit.log_change();

-- --------------------------------------------------------------- donation: page fields
ALTER TABLE donation DROP CONSTRAINT IF EXISTS donation_gateway_check;
ALTER TABLE donation ADD CONSTRAINT donation_gateway_check
  CHECK (gateway IN ('payu','razorpay','easebuzz','offline','other'));

ALTER TABLE donation ADD COLUMN IF NOT EXISTS campaign_id    smallint REFERENCES campaign(id);
ALTER TABLE donation ADD COLUMN IF NOT EXISTS prasadam_optin boolean NOT NULL DEFAULT false;
ALTER TABLE donation ADD COLUMN IF NOT EXISTS is_recurring   boolean NOT NULL DEFAULT false;
ALTER TABLE donation ADD COLUMN IF NOT EXISTS status         text NOT NULL DEFAULT 'paid';

ALTER TABLE donation DROP CONSTRAINT IF EXISTS donation_status_check;
ALTER TABLE donation ADD CONSTRAINT donation_status_check
  CHECK (status IN ('pending','paid','failed','refunded'));

COMMENT ON COLUMN donation.status IS
  'pending = created for an online attempt, money not confirmed. Existing/imported rows default to paid. Only paid rows count anywhere.';
CREATE INDEX IF NOT EXISTS idx_donation_campaign ON donation (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donation_status   ON donation (status) WHERE status <> 'paid';

-- --------------------------------------------------------------- receipt series
CREATE SEQUENCE IF NOT EXISTS receipt_seq;
CREATE OR REPLACE FUNCTION next_receipt_no() RETURNS text
LANGUAGE sql AS
$fn$ SELECT 'ICC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('receipt_seq')::text, 6, '0') $fn$;
COMMENT ON FUNCTION next_receipt_no IS
  'D33: our series runs alongside Zoho''s during transition. Continuous sequence; the year in the prefix is informational, numbering does not reset.';

-- --------------------------------------------------------------- payment attempts
CREATE TABLE IF NOT EXISTS payment_attempt (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  donation_id    bigint NOT NULL REFERENCES donation(id) ON DELETE CASCADE,
  gateway        text NOT NULL CHECK (gateway IN ('payu','razorpay','easebuzz','mock')),
  attempt_no     smallint NOT NULL DEFAULT 1,
  order_ref      text NOT NULL UNIQUE,
  gateway_txn_id text,
  status         text NOT NULL DEFAULT 'created'
                 CHECK (status IN ('created','initiated','success','failure','cancelled')),
  raw_response   jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE payment_attempt IS
  'One row per gateway try. The PayU → Razorpay → Easebuzz cascade (D23) creates a new attempt per fallback; order_ref is the txnid we hand the gateway.';
CREATE INDEX IF NOT EXISTS idx_attempt_donation ON payment_attempt (donation_id);
DROP TRIGGER IF EXISTS trg_attempt_updated_at ON payment_attempt;
CREATE TRIGGER trg_attempt_updated_at BEFORE UPDATE ON payment_attempt
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------- webhook outbox
CREATE TABLE IF NOT EXISTS webhook_outbox (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  donation_id     bigint REFERENCES donation(id) ON DELETE CASCADE,
  payload         jsonb NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','sent','failed','dead')),
  attempts        smallint NOT NULL DEFAULT 0,
  last_error      text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE webhook_outbox IS
  'Zoho Flow sync (D30). The donation is committed first; the webhook is delivered from here with retries, so Zoho being down never loses a donation.';
CREATE INDEX IF NOT EXISTS idx_outbox_due ON webhook_outbox (next_attempt_at) WHERE status IN ('pending','failed');

-- --------------------------------------------------------------- seed page content
-- Draft copy from the approved prototype. All of it is editable from admin.
UPDATE seva_category SET show_on_page = true, kind='one_time', icon='🍛', display_order=10, min_amount=101, tag='popular',
  name_i18n = '{"en":"Annadanam","ta":"அன்னதானம்","hi":"अन्नदानम्"}',
  line_i18n = '{"en":"No one who comes to Krishna''s house goes back hungry. Be the reason.","ta":"கிருஷ்ணரின் இல்லத்திற்கு வருபவர் யாரும் பசியுடன் திரும்புவதில்லை.","hi":"कृष्ण के घर से कोई भूखा नहीं लौटता। आप कारण बनिए।"}',
  emo_i18n  = '{"en":"When you feed His devotees, Krishna considers Himself fed.","ta":"அவரது பக்தர்களுக்கு உணவளிக்கும்போது, கிருஷ்ணர் தானே உண்டதாக கருதுகிறார்.","hi":"जब आप उनके भक्तों को भोजन कराते हैं, कृष्ण स्वयं को तृप्त मानते हैं।"}',
  presets   = '[{"amount":501,"impact":{"en":"feeds 25 devotees","ta":"25 பக்தர்களுக்கு உணவு","hi":"25 भक्तों का भोजन"}},{"amount":1116,"impact":{"en":"feeds 50 devotees prasadam","ta":"50 பக்தர்களுக்கு பிரசாதம்","hi":"50 भक्तों को प्रसादम्"}},{"amount":2551,"impact":{"en":"one full day''s prasadam for 100","ta":"100 பேருக்கு ஒரு நாள் பிரசாதம்","hi":"100 लोगों का एक दिन का प्रसादम्"}},{"amount":5001,"impact":{"en":"sponsor a full Sunday feast","ta":"ஞாயிறு விருந்து முழு ஸ்பான்சர்","hi":"पूर्ण रविवार भोज प्रायोजित करें"}}]'
WHERE slug='annadanam';

UPDATE seva_category SET show_on_page = true, kind='one_time', icon='🌺', display_order=20, min_amount=101,
  name_i18n = '{"en":"Deity Seva","ta":"விக்ரக சேவை","hi":"विग्रह सेवा"}',
  line_i18n = '{"en":"Garlands, silk and bhoga for Sri Sri Radha Krishna — serve Them directly.","ta":"ராதா கிருஷ்ணருக்கு மாலை, பட்டு, போகம் — நேரடி சேவை.","hi":"श्री श्री राधा कृष्ण के लिए माला, वस्त्र और भोग।"}',
  emo_i18n  = '{"en":"The hands that dress the Lord tomorrow morning could be moved by yours today.","ta":"நாளை காலை பகவானை அலங்கரிக்கும் கரங்கள், இன்று உங்களால் இயங்கலாம்.","hi":"कल सुबह प्रभु का श्रृंगार आपकी सेवा से होगा।"}',
  presets   = '[{"amount":751,"impact":{"en":"one day''s fresh garlands","ta":"ஒரு நாள் புது மாலைகள்","hi":"एक दिन की ताज़ी मालाएँ"}},{"amount":1501,"impact":{"en":"sandhya-arati bhoga offering","ta":"சந்தியா ஆரத்தி போக நைவேத்யம்","hi":"संध्या आरती भोग"}},{"amount":3001,"impact":{"en":"new vastra for Their Lordships","ta":"பகவானுக்கு புதிய வஸ்திரம்","hi":"प्रभु के लिए नए वस्त्र"}},{"amount":10001,"impact":{"en":"a full day of Deity worship","ta":"ஒரு முழு நாள் விக்ரக ஆராதனை","hi":"पूरे दिन की विग्रह सेवा"}}]'
WHERE slug='deity-seva';

UPDATE seva_category SET show_on_page = true, kind='monthly', icon='🔁', display_order=30, min_amount=101, tag='monthly',
  name_i18n = '{"en":"Nitya Seva","ta":"நித்ய சேவை","hi":"नित्य सेवा"}',
  line_i18n = '{"en":"A monthly vow of seva. A lamp in your name burns every single day.","ta":"மாதந்தோறும் ஒரு சேவை சங்கல்பம். தினமும் உங்கள் பெயரில் ஒரு தீபம்.","hi":"मासिक सेवा संकल्प। हर दिन आपके नाम का दीपक।"}',
  emo_i18n  = '{"en":"Krishna remembers not the size of the seva, but its steadiness.","ta":"சேவையின் அளவை அல்ல, அதன் நிலைத்தன்மையை கிருஷ்ணர் நினைவில் கொள்கிறார்.","hi":"कृष्ण सेवा का आकार नहीं, उसकी निरंतरता याद रखते हैं।"}',
  presets   = '[{"amount":501,"impact":{"en":"per month — daily deepam","ta":"மாதம் — தினசரி தீபம்","hi":"प्रति माह — दैनिक दीपम्"}},{"amount":1001,"impact":{"en":"per month — weekly garland seva","ta":"மாதம் — வார மாலை சேவை","hi":"प्रति माह — साप्ताहिक माला सेवा"}},{"amount":2501,"impact":{"en":"per month — monthly annadanam","ta":"மாதம் — மாத அன்னதானம்","hi":"प्रति माह — मासिक अन्नदानम्"}},{"amount":5001,"impact":{"en":"per month — full Nitya Sevak","ta":"மாதம் — முழு நித்ய சேவகர்","hi":"प्रति माह — पूर्ण नित्य सेवक"}}]'
WHERE slug='nitya-seva';

INSERT INTO seva_category (slug, name) VALUES ('special-day','Special Day Seva')
ON CONFLICT (slug) DO NOTHING;
UPDATE seva_category SET show_on_page = true, kind='dated', icon='🎂', display_order=40, min_amount=101, tag='date seva',
  name_i18n = '{"en":"Special Day Seva","ta":"சிறப்பு நாள் சேவை","hi":"विशेष दिवस सेवा"}',
  line_i18n = '{"en":"Birthday? Anniversary? Begin it at His feet — archana & prasadam in your name.","ta":"பிறந்தநாளா? திருமண நாளா? அவர் திருவடியில் தொடங்குங்கள்.","hi":"जन्मदिन? सालगिरह? उनके चरणों में शुरू करें।"}',
  emo_i18n  = '{"en":"The most auspicious way to begin your special day is by giving, not receiving.","ta":"உங்கள் சிறப்பு நாளைத் தொடங்க மிக மங்களகரமான வழி — பெறுவது அல்ல, கொடுப்பது.","hi":"विशेष दिन की सबसे शुभ शुरुआत — पाना नहीं, देना।"}',
  presets   = '[{"amount":1116,"impact":{"en":"archana + prasadam in your name","ta":"உங்கள் பெயரில் அர்ச்சனை + பிரசாதம்","hi":"आपके नाम अर्चना + प्रसादम्"}},{"amount":2116,"impact":{"en":"archana + feed 50 devotees","ta":"அர்ச்சனை + 50 பேருக்கு உணவு","hi":"अर्चना + 50 भक्तों का भोजन"}},{"amount":5116,"impact":{"en":"family sankalpa + full seva","ta":"குடும்ப சங்கல்பம் + முழு சேவை","hi":"पारिवारिक संकल्प + पूर्ण सेवा"}},{"amount":11116,"impact":{"en":"grand seva with maha-arati","ta":"மகா ஆரத்தியுடன் பெரும் சேவை","hi":"महा-आरती सहित भव्य सेवा"}}]'
WHERE slug='special-day';

UPDATE seva_category SET show_on_page = true, kind='one_time', icon='🐄', display_order=50, min_amount=101,
  name_i18n = '{"en":"Gau Seva","ta":"கோ சேவை","hi":"गौ सेवा"}',
  line_i18n = '{"en":"Krishna is Gopala — the protector of cows. Protect what He loves most.","ta":"கிருஷ்ணர் கோபாலர் — பசுக்களின் காவலர். அவர் நேசிப்பதை காப்போம்.","hi":"कृष्ण गोपाल हैं। जो उन्हें प्रिय है, उसकी रक्षा करें।"}',
  emo_i18n  = '{"en":"Serve the cows Krishna Himself would have herded.","ta":"கிருஷ்ணரே மேய்த்திருக்கக்கூடிய பசுக்களுக்கு சேவை செய்யுங்கள்.","hi":"उन गायों की सेवा करें जिन्हें स्वयं कृष्ण चराते।"}',
  presets   = '[{"amount":351,"impact":{"en":"one cow''s feed for a day","ta":"ஒரு பசுவின் ஒரு நாள் தீவனம்","hi":"एक गाय का एक दिन का चारा"}},{"amount":1051,"impact":{"en":"green fodder for the herd","ta":"பசுக்கூட்டத்திற்கு பசுந்தீவனம்","hi":"पूरे गौ-वंश के लिए हरा चारा"}},{"amount":2501,"impact":{"en":"a week of care for one cow","ta":"ஒரு பசுவுக்கு ஒரு வார பராமரிப்பு","hi":"एक गाय की एक सप्ताह देखभाल"}},{"amount":5101,"impact":{"en":"medical care for the goshala","ta":"கோசாலைக்கு மருத்துவ பராமரிப்பு","hi":"गौशाला की चिकित्सा देखभाल"}}]'
WHERE slug='gaushala';

UPDATE seva_category SET show_on_page = true, kind='one_time', icon='🛕', display_order=60, min_amount=101,
  name_i18n = '{"en":"Temple Development","ta":"ஆலய மேம்பாடு","hi":"मंदिर विकास"}',
  line_i18n = '{"en":"Every brick you offer will echo with kirtan for generations.","ta":"நீங்கள் அளிக்கும் ஒவ்வொரு செங்கல்லும் தலைமுறைகளாக கீர்த்தனையில் எதிரொலிக்கும்.","hi":"आपकी हर ईंट पीढ़ियों तक कीर्तन से गूंजेगी।"}',
  emo_i18n  = '{"en":"Those who build His house are never forgotten by the Resident.","ta":"அவரது இல்லத்தை கட்டுபவர்களை, அதில் வசிப்பவர் ஒருபோதும் மறப்பதில்லை.","hi":"जो उनका घर बनाते हैं, उन्हें गृहस्वामी कभी नहीं भूलते।"}',
  presets   = '[{"amount":1001,"impact":{"en":"offer a brick in your name","ta":"உங்கள் பெயரில் ஒரு செங்கல்","hi":"अपने नाम की एक ईंट"}},{"amount":5001,"impact":{"en":"one sq.ft of His new home","ta":"அவரது புதிய இல்லத்தில் ஒரு ச.அடி","hi":"उनके नए घर का एक वर्ग फुट"}},{"amount":11111,"impact":{"en":"pillar seva contribution","ta":"தூண் சேவை பங்களிப்பு","hi":"स्तंभ सेवा योगदान"}},{"amount":25000,"impact":{"en":"founding sevak recognition","ta":"நிறுவனர் சேவகர் அங்கீகாரம்","hi":"संस्थापक सेवक सम्मान"}}]'
WHERE slug='construction';

-- Draft campaign (kept NOT live until the real target/dates are confirmed)
INSERT INTO campaign (slug, title_i18n, line_i18n, goal_amount, starts_on, ends_on, is_live, seva_category_id, presets)
SELECT 'janmashtami-2026',
  '{"en":"Sri Krishna Janmashtami 2026","ta":"ஸ்ரீ கிருஷ்ண ஜென்மாஷ்டமி 2026","hi":"श्री कृष्ण जन्माष्टमी 2026"}',
  '{"en":"On His appearance day, 25,000 devotees will take darshan and honour prasadam. Every rupee becomes His abhisheka, His flowers, and their feast.","ta":"அவரது திருஅவதார நாளில் 25,000 பக்தர்கள் தரிசனம் செய்வார்கள். ஒவ்வொரு ரூபாயும் அவரது அபிஷேகமாக மாறும்.","hi":"उनके प्राकट्य दिवस पर 25,000 भक्त दर्शन पाएंगे। हर रुपया उनका अभिषेक बनेगा।"}',
  2500000, DATE '2026-08-01', DATE '2026-08-15', false,
  (SELECT id FROM seva_category WHERE slug='festival'),
  '[{"amount":1116,"impact":{"en":"flowers for His abhisheka","ta":"அபிஷேகத்திற்கு மலர்கள்","hi":"अभिषेक के लिए पुष्प"}},{"amount":2551,"impact":{"en":"feed 100 devotees that night","ta":"அன்றிரவு 100 பேருக்கு உணவு","hi":"उस रात 100 भक्तों का भोजन"}},{"amount":5116,"impact":{"en":"maha-abhisheka sponsorship","ta":"மகா அபிஷேக ஸ்பான்சர்","hi":"महा-अभिषेक प्रायोजन"}},{"amount":11116,"impact":{"en":"midnight arati patron","ta":"நள்ளிரவு ஆரத்தி புரவலர்","hi":"मध्यरात्रि आरती संरक्षक"}}]'
WHERE NOT EXISTS (SELECT 1 FROM campaign WHERE slug='janmashtami-2026');
