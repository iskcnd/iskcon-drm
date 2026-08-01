import { processOutbox } from '@/lib/zoho';
import { json, bad, safeEqual } from '@/lib/util';

/**
 * Outbox delivery. Call every minute (Railway cron / Activepieces schedule):
 *   POST /api/internal/outbox  with header  x-cron-key: $CRON_KEY
 */
export async function POST(request) {
  if (!process.env.CRON_KEY || !safeEqual(request.headers.get('x-cron-key'), process.env.CRON_KEY)) {
    return bad('Unauthorized', 401);
  }
  try {
    return json(await processOutbox());
  } catch (err) {
    console.error('outbox:', err);
    return bad('Outbox run failed', 500);
  }
}
