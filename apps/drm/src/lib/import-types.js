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
  return t.link === 'person' ? [...MATCH_FIELDS, ...t.fields] : t.fields;
}
