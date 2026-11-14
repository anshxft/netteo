import { runIndexerWorker } from './worker';

/**
 * Index on read. Nothing has to schedule the indexer: when someone loads their cycles, a throttled run is
 * queued after the response, so projections stay fresh while the app is in use and the user never waits on it.
 *
 * The throttle is per server instance. Several instances may run at once, which is safe because event
 * writes are idempotent (keyed by chain, transaction hash and log index).
 */
let lastRun = 0;
let inFlight: Promise<void> | null = null;

export function maybeRunIndexer(minIntervalMs = 20_000, now = Date.now()): Promise<void> {
  if (inFlight) return inFlight;
  if (now - lastRun < minIntervalMs) return Promise.resolve();

  lastRun = now;
  inFlight = runIndexerWorker()
    .then(() => undefined)
    .catch((err: unknown) => {
      console.error('[Indexer] On-read run failed:', err instanceof Error ? err.message : 'unknown error');
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
