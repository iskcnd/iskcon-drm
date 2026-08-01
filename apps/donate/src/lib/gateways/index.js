import * as payu from './payu.js';
import * as razorpay from './razorpay.js';
import * as easebuzz from './easebuzz.js';

/** D23: PayU primary → Razorpay → Easebuzz. */
export const CASCADE = ['payu', 'razorpay', 'easebuzz'];

export function nextGateway(current) {
  const i = CASCADE.indexOf(current);
  return i >= 0 && i < CASCADE.length - 1 ? CASCADE[i + 1] : null;
}

export const mockMode = () => process.env.MOCK_GATEWAYS === 'true';

/** Returns whatever the client needs to launch payment on the given gateway. */
export async function buildRequest(gateway, params) {
  if (mockMode()) {
    return {
      method: 'redirect',
      mock: true,
      url: `${params.baseUrl}/api/payments/mock?order_ref=${params.orderRef}&donation_id=${params.donationId}`,
    };
  }
  if (gateway === 'payu') return payu.buildRequest(params);
  if (gateway === 'razorpay') return razorpay.buildRequest(params);
  if (gateway === 'easebuzz') return easebuzz.buildRequest(params);
  throw new Error(`Unknown gateway ${gateway}`);
}

export { payu, razorpay, easebuzz };
