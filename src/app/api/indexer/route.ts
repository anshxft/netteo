import { NextRequest, NextResponse } from 'next/server';
import { runIndexerWorker } from '@/lib/indexer/worker';

export const dynamic = 'force-dynamic';

/**
 * Route Handler for running the settlement event indexer.
 * Can be triggered via external cron job, scheduler, or maintenance script.
 * Conforms to Secure_Vibe_Coding.pdf Rule 04 (safe error handling, zero leaked internals).
 */
export async function POST(req: NextRequest) {
  try {
    // Optional bearer token verification for production cron protection
    const cronSecret = process.env.INDEXER_CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized indexer request.' },
          { status: 401 }
        );
      }
    }

    const result = await runIndexerWorker();
    return NextResponse.json(
      {
        success: true,
        data: {
          fromBlock: result.fromBlock.toString(),
          toBlock: result.toBlock.toString(),
          logsCount: result.logsCount,
          eventsProcessed: result.eventsProcessed,
          skipped: result.skipped,
          message: result.message,
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error('[API /api/indexer] Execution error:', err);
    // Sanitize error message to prevent leaking internal stack traces or connection strings
    return NextResponse.json(
      { error: 'Indexer job failed to complete.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
