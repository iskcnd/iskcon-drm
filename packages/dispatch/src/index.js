/**
 * Prasadam courier & dispatch — the parts that are not SQL and not screens.
 *
 * Framework-free on purpose: the batch rules live in the database, the
 * screens live in whichever app owns them, and everything here is a pure
 * function over rows in and bytes out. That is what makes it testable
 * without a browser, which is how the label overlap and the split
 * mail-merge field were both caught.
 */
export { renderLabels, checkSpec, slot, DEFAULT_SPEC, MM } from './label.js';
export { code128c, code128Modules } from './barcode.js';
export { readCourierFile, applyCourierRows, STATUS_MAP } from './courier.js';
export { courierWorkbook, pendingWorkbook, COLUMNS } from './exports.js';
export { mergeLetter, mergeBatch, fieldsUsed, healSplitFields, LETTER_FIELDS } from './mailmerge.js';
