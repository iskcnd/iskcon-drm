/**
 * Import definitions. Adding a new import type is one entry here — the page,
 * the column list and the commit logic all read from this.
 *
 * `link: 'person'` means each row belongs to an existing devotee and has to be
 * matched to one. `link: 'master'` means the row IS the devotee.
 */

export const PERSON_FIELDS = [
  'full_name', 'initiated_name', 'gender', 'dob', 'mobile_cc', 'mobile_number', 'email',
  'address_line', 'area', 'city', 'state', 'pincode', 'country', 'pan',
  'preferred_language', 'profession', 'education', 'organization', 'marital_status', 'notes',
];

// Columns used to find the existing devotee, in the order they're tried.
export const MATCH_FIELDS = ['person_no', 'email', 'mobile_number', 'full_name', 'mobile_cc'];

export const IMPORT_TYPES = {
  people: {
    label: 'Devotees (master records)',
    hint: 'Creates new devotee records. Use this for a plain list of people.',
    link: 'master',
    table: 'person',
    fields: PERSON_FIELDS,
    required: ['full_name'],
    tagPrompt: 'Tag every imported devotee as',
  },

  iys_boys: {
    label: 'IYS Boys',
    hint: 'Devotee records tagged IYS Boys. Same columns as the devotee import.',
    link: 'master', table: 'person', fields: PERSON_FIELDS, required: ['full_name'],
    forceTag: 'iys-boys',
  },
  iys_girls: {
    label: 'IYS Girls',
    hint: 'Devotee records tagged IYS Girls.',
    link: 'master', table: 'person', fields: PERSON_FIELDS, required: ['full_name'],
    forceTag: 'iys-girls',
  },
  unnati: {
    label: 'Unnati Club',
    hint: 'Devotee records tagged Unnati Club.',
    link: 'master', table: 'person', fields: PERSON_FIELDS, required: ['full_name'],
    forceTag: 'unnati-club',
  },

  donations: {
    label: 'Donations',
    hint: 'Each row is a donation against an existing devotee. Include person_no, email or mobile_number so the donor can be matched.',
    link: 'person',
    table: 'donation',
    fields: [
      'amount', 'currency', 'seva_category', 'purpose', 'payment_mode', 'gateway',
      'txn_ref', 'receipt_no', 'is_80g', 'donated_on', 'collected_by', 'notes',
    ],
    required: ['amount'],
    numeric: ['amount'],
    dates: ['donated_on'],
    booleans: ['is_80g'],
    lookups: { seva_category: { table: 'seva_category', column: 'seva_category_id' } },
  },

  zoho_donations: {
    label: 'Zoho donations',
    hint: 'The Donations export from Zoho, as-is. Upload the .xlsx — no need to rename columns or convert to CSV.',
    link: 'person',
    table: 'donation',
    // Zoho's own headers, mapped to our fields. Matching is case- and
    // punctuation-insensitive, so minor header drift in a future export
    // still lands correctly.
    aliases: {
      'receipt': 'receipt_no',
      'seva category': 'seva_category',
      'seva type': 'seva_type',
      'festival': 'festival',
      'seva date': 'seva_date',
      'name': 'full_name',
      'phone whatsapp no': 'phone',
      'phone': 'phone',
      'mobile': 'phone',
      'email': 'email',
      'amount': 'amount',
      'mode of payment': 'payment_mode',
      'employee name': 'collected_by',
      'volunteer name': 'volunteer_name',
      'address': 'address_line',
      'id': 'external_id',
      'added time': 'donated_on',
    },
    // Columns present in the export that carry no information we keep.
    ignore: ['seva date only sunday', 'seva types', 'added user', 'modified user', 'modified time'],
    fields: [
      'amount', 'seva_category', 'seva_type', 'festival', 'seva_date',
      'payment_mode', 'receipt_no', 'collected_by', 'volunteer_name',
      'donated_on', 'external_id', 'notes',
    ],
    required: ['amount'],
    numeric: ['amount'],
    dates: ['seva_date', 'donated_on'],
    lookups: { seva_category: { table: 'seva_category', column: 'seva_category_id', autoCreate: true } },
    externalSource: 'zoho',
    // The export carries the donor's own details, so a row with no match is a
    // genuinely new donor rather than an ambiguity. Creating them beats making
    // someone click through thousands of decisions.
    autoCreatePerson: true,
    flagAutoCreated: true,
    donorFields: ['full_name', 'phone', 'email', 'address_line'],
    fixedPaymentModes: {
      upi: 'upi', cash: 'cash', card: 'card', 'credit card': 'card', 'debit card': 'card',
      'net banking': 'netbanking', netbanking: 'netbanking', neft: 'bank_transfer',
      rtgs: 'bank_transfer', imps: 'bank_transfer', 'bank transfer': 'bank_transfer',
      cheque: 'cheque', check: 'cheque', dd: 'dd', 'demand draft': 'dd',
    },
  },

  japa_cards: {
    label: 'Japa Desk cards',
    hint: 'Each row is a japa card issued to an existing devotee.',
    link: 'person',
    table: 'japa_card',
    fields: [
      'card_no', 'issued_on', 'total_boxes', 'boxes_done', 'status',
      'submitted_on', 'issued_by', 'received_by', 'notes',
    ],
    required: [],
    numeric: ['total_boxes', 'boxes_done'],
    dates: ['issued_on', 'submitted_on'],
  },
};

export function typeColumns(key) {
  const t = IMPORT_TYPES[key];
  if (!t) return [];
  if (t.aliases) return [...new Set(Object.values(t.aliases))];
  return t.link === 'person' ? [...MATCH_FIELDS, ...t.fields] : t.fields;
}

/** "Phone (WhatsApp No)" -> "phone whatsapp no". Header matching is forgiving. */
export function normHeader(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Map one file header to a field name. Explicit aliases win; otherwise fall
 * back to the snake_case form, so both Zoho headers and our own templates work.
 */
export function mapHeader(key, header) {
  const t = IMPORT_TYPES[key];
  const n = normHeader(header);
  if (!t) return null;
  if (t.ignore?.includes(n)) return null;
  if (t.aliases?.[n]) return t.aliases[n];
  const snake = n.replace(/ /g, '_');
  return typeColumns(key).includes(snake) ? snake : null;
}
