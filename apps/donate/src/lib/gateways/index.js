import * as payu from './payu.js';
import * as razorpay from './razorpay.js';
import * as easebuzz from './easebuzz.js';

/**
 * Which gateways exist, in the default order they're offered.
 * `env` lists the variables required before a gateway can be used at all.
 */
export const GATEWAYS = {
  payu: {
    label: 'PayU',
    note: 'Cards, UPI, net banking',
    env: ['PAYU_KEY', 'PAYU_SALT'],
  },
  razorpay: {
    label: 'Razorpay',
    note: 'Cards, UPI, wallets',
    env: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'],
  },
  easebuzz: {
    label: 'Easebuzz',
    note: 'Cards, UPI, net banking',
    env: ['EASEBUZZ_KEY', 'EASEBUZZ_SALT'],
  },
};

export const mockMode = () => process.env.MOCK_GATEWAYS === 'true';

/**
 * Ordered list of gateways actually usable right now.
 *
 * GATEWAYS_ENABLED controls both which are offered and in what order, e.g.
 *   GATEWAYS_ENABLED=razorpay,payu
 * Unset means all of them, in the order declared above.
 *
 * A gateway whose credentials are missing is dropped regardless. Offering a
 * donor a button that cannot possibly work is worse than not offering it —
 * they blame the temple, not the missing environment variable.
 */
export function enabledGateways() {
  const declared = Object.keys(GATEWAYS);
  const wanted = (process.env.GATEWAYS_ENABLED || declared.join(','))
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => declared.includes(s));

  const list = wanted.length ? wanted : declared;
  if (mockMode()) return list;                       // mock needs no credentials
  return list.filter((g) => GATEWAYS[g].env.every((k) => !!process.env[k]));
}

/** Same list with the labels the donation page renders. */
export function gatewayChoices() {
  return enabledGateways().map((id) => ({
    id,
    label: GATEWAYS[id].label,
    note: GATEWAYS[id].note,
  }));
}

export function isEnabled(gateway) {
  return enabledGateways().includes(gateway);
}

/** First usable gateway, or null if none are configured. */
export function defaultGateway() {
  return enabledGateways()[0] || null;
}

/**
 * The next gateway to try after `current` failed, skipping any the donor has
 * already been through. Only ever returns something usable.
 */
export function nextGateway(current, tried = []) {
  const seen = new Set([current, ...tried].filter(Boolean));
  return enabledGateways().find((g) => !seen.has(g)) || null;
}

/** Kept for older imports. */
export const CASCADE = Object.keys(GATEWAYS);

/** Returns whatever the client needs to launch payment on the given gateway. */
export async function buildRequest(gateway, params) {
  if (mockMode()) {
    return {
      method: 'redirect',
      mock: true,
      url: `${params.baseUrl}/api/payments/mock?order_ref=${params.orderRef}&donation_id=${params.donationId}`,
    };
  }
  if (!isEnabled(gateway)) {
    throw Object.assign(
      new Error(`${GATEWAYS[gateway]?.label || gateway} is not available right now`),
      { status: 422 });
  }
  if (gateway === 'payu') return payu.buildRequest(params);
  if (gateway === 'razorpay') return razorpay.buildRequest(params);
  if (gateway === 'easebuzz') return easebuzz.buildRequest(params);
  throw new Error(`Unknown gateway ${gateway}`);
}

export { payu, razorpay, easebuzz };
