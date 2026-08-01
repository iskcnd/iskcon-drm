import { sha512 } from '../util.js';

// PayU hosted-checkout ("_payment") flow.
// Request hash:  sha512(key|txnid|amount|productinfo|firstname|email|udf1..udf5||||||SALT)
// Response hash: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)

const BASE = () =>
  process.env.PAYU_ENV === 'production' ? 'https://secure.payu.in/_payment' : 'https://test.payu.in/_payment';

export function buildRequest({ orderRef, amount, productinfo, name, email, phone, donationId, baseUrl }) {
  const key = process.env.PAYU_KEY;
  const salt = process.env.PAYU_SALT;
  if (!key || !salt) throw new Error('PAYU_KEY / PAYU_SALT not configured');
  const f = {
    key,
    txnid: orderRef,
    amount: Number(amount).toFixed(2),
    productinfo,
    firstname: name,
    email: email || 'no-reply@iskconchennai.org',
    phone: phone || '',
    udf1: String(donationId),
    surl: `${baseUrl}/api/payments/payu/return`,
    furl: `${baseUrl}/api/payments/payu/return`,
  };
  f.hash = sha512(
    [key, f.txnid, f.amount, f.productinfo, f.firstname, f.email, f.udf1, '', '', '', '', '', '', '', '', ''].join('|') +
      '|' +
      salt
  );
  return { method: 'POST', action: BASE(), fields: f };
}

export function verifyReturn(p) {
  const key = process.env.PAYU_KEY;
  const salt = process.env.PAYU_SALT;
  const expected = sha512(
    [
      salt, p.status || '', '', '', '', '', '',
      p.udf5 || '', p.udf4 || '', p.udf3 || '', p.udf2 || '', p.udf1 || '',
      p.email || '', p.firstname || '', p.productinfo || '', p.amount || '', p.txnid || '', key,
    ].join('|')
  );
  return expected === (p.hash || '');
}
