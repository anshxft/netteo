import { NextRequest, NextResponse } from 'next/server';
import { runIndexerWorker } from '@/lib/indexer/worker';
import { safeEqual } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Runs the settlement event indexer.
 * - Accepts POST and GET: Vercel Cron only issues GET, and sends "Authorization: Bearer $CRON_SECRET".
 * - The secret is CRON_SECRET (Vercel's name) or INDEXER_CRON_SECRET, compared in constant time.
 * - In production a missing secret is a configuration error, never an open endpoint.
 * - Responses carry no stack traces or connection details.
 *
 * The app also indexes on read (see /api/cycles), so this endpoint is for an external scheduler or a manual run.
 */
async function handle(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET || process.env.INDEXER_CRON_SECRET;
    if (process.env.NODE_ENV === 'production' && !secret) {
      console.error('[API /api/indexer] CRON_SECRET or INDEXER_CRON_SECRET must be configured in production.');
      return NextResponse.json({ error: 'Indexer configuration error.' }, { status: 500 });
    }

    if (secret && !safeEqual(req.headers.get('authorization') ?? '', `Bearer ${secret}`)) {
      return NextResponse.json({ error: 'Unauthorized indexer request.' }, { status: 401 });
    }

    const result = await runIndexerWorker();
    return NextResponse.json({
      success: true,
      data: {
        fromBlock: result.fromBlock.toString(),
        toBlock: result.toBlock.toString(),
        logsCount: result.logsCount,
        eventsProcessed: result.eventsProcessed,
        skipped: result.skipped,
        message: result.message,
      },
    });
  } catch {
    console.error('[API /api/indexer] Execution error occurred during indexing');
    return NextResponse.json({ error: 'Indexer job failed to complete.' }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
