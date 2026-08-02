/**
 * Phone parsing for the donation page.
 *
 * A devotee should be able to type their number however they think of it —
 * "98400 12345", "+91 98400-12345", "098400 12345", "0091 9840012345" — and
 * have it work. Rejecting a donor over punctuation is the most expensive
 * validation failure this app can have.
 *
 * Everything is normalised to a country code plus a national number, because
 * that is how the person table stores it (mobile_cc + mobile_number, with
 * mobile_e164 generated from both). Storing the raw string instead means the
 * database trigger strips the "+", leaving "9198...", and then prefixes +91
 * again — a silently wrong number.
 *
 * TODO: this duplicates splitPhone() in apps/drm. Both move to packages/core
 * when that's extracted.
 */

// Longest match wins, so +91 is never read as +9.
const DIAL_CODES = [
  '1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44',
  '45', '46', '47', '48', '49', '51', '52', '54', '55', '56', '57', '58', '60', '61', '62',
  '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '93', '94', '95', '98',
  '212', '213', '216', '218', '220', '233', '234', '249', '250', '251', '254', '255', '256',
  '260', '263', '351', '352', '353', '354', '355', '358', '359', '370', '371', '372', '373',
  '375', '380', '381', '385', '386', '420', '421', '852', '853', '855', '856', '880', '886',
  '960', '961', '962', '963', '964', '965', '966', '967', '968', '971', '972', '973', '974',
  '975', '976', '977', '992', '993', '994', '995', '998',
];

const DIGITS = (s) => String(s ?? '').replace(/\D/g, '');

/** National number lengths we accept per country. India is exactly 10. */
const NATIONAL_LEN = { 91: [10], 1: [10], 44: [10], 65: [8], 971: [9] };

/**
 * @returns {{ok:boolean, cc:string|null, national:string|null, e164:string|null,
 *             pretty:string|null, reason:string|null}}
 */
export function parsePhone(raw, defaultCc = '+91') {
  const input = String(raw ?? '').trim();
  if (!input) return fail('Enter a mobile number');

  const hasPlus = input.startsWith('+') || input.startsWith('00');
  let d = DIGITS(input);
  if (input.startsWith('00')) d = d.replace(/^00/, '');
  if (!d) return fail('Enter a mobile number');

  const fallbackCc = DIGITS(defaultCc) || '91';

  // Explicit international form: trust the country code the donor gave.
  if (hasPlus) {
    const cc = longestCc(d);
    if (!cc) return fail('That country code isn’t recognised');
    const national = d.slice(cc.length);
    return check(cc, national);
  }

  // No "+". Common Indian habits first.
  if (d.length === 10) return check(fallbackCc, d);              // 9840012345
  if (d.length === 11 && d.startsWith('0')) return check(fallbackCc, d.slice(1)); // 09840012345

  // Someone typed the country code without a plus: 919840012345
  const cc = longestCc(d);
  if (cc && d.length > cc.length) {
    const national = d.slice(cc.length);
    const r = check(cc, national);
    if (r.ok) return r;
  }

  // Last resort — treat the whole thing as national under the default code.
  return check(fallbackCc, d);
}

function longestCc(digits) {
  return DIAL_CODES.filter((c) => digits.startsWith(c)).sort((a, b) => b.length - a.length)[0] || null;
}

function check(cc, national) {
  if (!national) return fail('Enter the number after the country code');
  const want = NATIONAL_LEN[Number(cc)];

  if (want && !want.includes(national.length)) {
    const expected = want.join(' or ');
    return fail(
      cc === '91'
        ? `An Indian mobile number has 10 digits — you entered ${national.length}`
        : `A +${cc} number has ${expected} digits — you entered ${national.length}`);
  }
  if (!want && (national.length < 6 || national.length > 14)) {
    return fail('That doesn’t look like a complete phone number');
  }
  // Indian mobiles start 6-9; landlines won't receive the WhatsApp receipt.
  if (cc === '91' && !/^[6-9]/.test(national)) {
    return fail('An Indian mobile number starts with 6, 7, 8 or 9');
  }

  return {
    ok: true,
    cc: `+${cc}`,
    national,
    e164: `+${cc}${national}`,
    pretty: cc === '91' ? `+91 ${national.slice(0, 5)} ${national.slice(5)}` : `+${cc} ${national}`,
    reason: null,
  };
}

function fail(reason) {
  return { ok: false, cc: null, national: null, e164: null, pretty: null, reason };
}

/** True once the input is a complete, valid number — for live UI feedback. */
export function isComplete(raw, defaultCc = '+91') {
  return parsePhone(raw, defaultCc).ok;
}
