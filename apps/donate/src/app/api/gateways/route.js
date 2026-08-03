import { gatewayChoices, mockMode } from '@/lib/gateways';
import { json } from '@/lib/util';

export const dynamic = 'force-dynamic';

/**
 * Which payment options to show the donor. Driven by GATEWAYS_ENABLED plus
 * whether each gateway's credentials are actually present, so the page can
 * never offer a button that cannot work.
 */
export async function GET() {
  const choices = gatewayChoices();
  return json({
    gateways: choices,
    mock: mockMode(),
    // Let the page say something useful instead of failing silently.
    none: choices.length === 0,
  });
}
