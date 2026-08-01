import { sha512 } from '../util.js';

// Easebuzz "initiateLink" + hosted pay page.
// Request hash:  sha512(key|txnid|amount|productinfo|firstname|email|udf1..udf5||||||SALT)
// Response hash: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)

const API = () =>
  process.env.EASEBUZZ_ENV === 'production' ? 'https://pay.easebuzz.in' : 'https://testpay.easebuzz.in';

export async function buildRequest({ orderRef, amount, productinfo, name, email, phone, donationId, baseUrl }) {
  const key = process.env.EASEBUZZ_KEY;
  const salt = process.env.EASEBUZZ_SALT;
  if (!key || !salt) throw new Error('EASEBUZZ_KEY / EASEBUZZ_SALT not configured');
  const f = {
    key,
    txnid: orderRef,
    amount: Number(amount).toFixed(2),
    productinfo,
    firstname: name,
    email: email || 'no-reply@iskconchennai.org',
    phone: phone || '9999999999',
    udf1: String(donationId),
    surl: `${baseUrl}/api/payments/easebuzz/return`,
    furl: `${baseUrl}/api/payments/easebuzz/return`,
  };
  f.hash = sha512(
    [key, f.txnid, f.amount, f.productinfo, f.firstname, f.email, f.udf1, '', '', '', '', '', '', '', '', ''].join('|') +
      '|' +
      salt
  );
  const res = await fetch(`${API()}/payment/initiateLink`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(f),
  });
  if (!res.ok) throw new Error(`Easebuzz initiate failed: ${res.status} ${await res.text()}`);
  const out = await res.json();
  if (out.status !== 1) throw new Error(`Easebuzz initiate rejected: ${JSON.stringify(out)}`);
  return { method: 'redirect', url: `${API()}/pay/${out.data}` };
}

export function verifyReturn(p) {
  const key = process.env.EASEBUZZ_KEY;
  const salt = process.env.EASEBUZZ_SALT;
  const expected = sha512(
    [
      salt, p.status || '', '', '', '', '', '',
      p.udf5 || '', p.udf4 || '', p.udf3 || '', p.udf2 || '', p.udf1 || '',
      p.email || '', p.firstname || '', p.productinfo || '', p.amount || '', p.txnid || '', key,
    ].join('|')
  );
  return expected === (p.hash || '');
}
