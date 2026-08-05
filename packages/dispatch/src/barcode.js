/**
 * Code 128 encoder — bar widths only, no drawing.
 *
 * Sri Maruti's document numbers are 14 digits. Code 128 subset C packs two
 * digits into one symbol, so a 14-digit number is 7 data symbols plus start,
 * check and stop: 11 symbols, about 47mm at the bar width we use. That fits a
 * 100mm label with the address; subset B would need 14 symbols and crowd it.
 *
 * Written out rather than pulled from a package because it is sixty lines,
 * and a courier label that will not scan is a parcel the temple pays to send
 * twice — worth being able to read the code that produces it.
 */

/**
 * The 107 Code 128 patterns, as bar/space widths in modules.
 * Index is the symbol value; each string is six digits, alternating bar then
 * space, starting with a bar.
 */
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112',
];

const START_C = 105;
const STOP = 106;

/**
 * Encode digits as Code 128 subset C.
 *
 * @param {string} digits  digits only; an odd count gets a leading zero,
 *                         because subset C works in pairs and dropping the
 *                         last digit would silently mislabel the parcel.
 * @returns {number[]} bar and space widths in modules, starting with a bar.
 */
export function code128c(digits) {
  const d = String(digits ?? '').replace(/\D/g, '');
  if (!d) throw new Error('code128c: nothing to encode');
  const padded = d.length % 2 ? `0${d}` : d;

  const values = [START_C];
  for (let i = 0; i < padded.length; i += 2) values.push(Number(padded.slice(i, i + 2)));

  // Modulo-103 checksum, weighted by position. The start symbol has weight 1.
  let sum = START_C;
  for (let i = 1; i < values.length; i += 1) sum += values[i] * i;
  values.push(sum % 103);
  values.push(STOP);

  const widths = [];
  for (const v of values) for (const ch of PATTERNS[v]) widths.push(Number(ch));
  return widths;
}

/** Total module count, for working out how wide the symbol will be. */
export function code128Modules(digits) {
  return code128c(digits).reduce((a, b) => a + b, 0);
}
