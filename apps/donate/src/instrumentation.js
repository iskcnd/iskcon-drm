/**
 * Background outbox runner.
 *
 * Every paid donation queues a webhook_outbox row. Something has to deliver it.
 * A separate Railway cron service would work, but it's another service, another
 * deploy and another shared secret — for a job that belongs to this app anyway.
 * Since the donate service never sleeps, an interval inside the process is
 * simpler and has fewer ways to be misconfigured.
 *
 * processOutbox() takes its rows FOR UPDATE SKIP LOCKED, so this running
 * alongside a manual POST /api/internal/outbox cannot double-send.
 *
 * Set OUTBOX_AUTORUN=false to disable and drive it externally instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.OUTBOX_AUTORUN === 'false') {
    console.log('[outbox] autorun disabled by OUTBOX_AUTORUN=false');
    return;
  }

  const everyMs = Math.max(Number(process.env.OUTBOX_INTERVAL_SECONDS || 60), 15) * 1000;
  const { processOutbox } = await import('./lib/zoho.js');

  let running = false;
  const tick = async () => {
    if (running) return;              // a slow run must not stack up
    running = true;
    try {
      const r = await processOutbox(20);
      if (r && !r.skipped && r.processed > 0) {
        console.log(`[outbox] processed=${r.processed} sent=${r.sent} failed=${r.failed}`);
      }
      if (r?.skipped) {
        console.warn('[outbox] ZOHO_WEBHOOK_URL is not set — rows are queuing but not being delivered');
      }
    } catch (err) {
      console.error('[outbox] run failed:', err.message);
    } finally {
      running = false;
    }
  };

  // Give the pool a moment before the first run.
  setTimeout(tick, 10_000);
  const timer = setInterval(tick, everyMs);
  timer.unref?.();

  console.log(`[outbox] autorun every ${everyMs / 1000}s`);
}
