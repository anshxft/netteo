import { NextRequest, NextResponse } from 'next/server';
import { runIndexerWorker } from '@/lib/indexer/worker';

export const dynamic = 'force-dynamic';

/**
 * Route Handler for running the settlement event indexer.
 * Conforms to Secure_Vibe_Coding.pdf Rule 04 & Prompt 5:
 * - Requires authorization token in production.
 * - POST-only (GET is rejected with 405 Method Not Allowed).
 * - Sanitized responses (zero internal stack traces or connection strings).
 */
export async function POST(req: NextRequest) {
  try {
    const cronSecret = process.env.INDEXER_CRON_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && !cronSecret) {
      console.error('[API /api/indexer] INDEXER_CRON_SECRET must be configured in production.');
      return NextResponse.json(
        { error: 'Indexer configuration error.' },
        { status: 500 }
      );
    }

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
    console.error('[API /api/indexer] Execution error occurred during indexing');
    return NextResponse.json(
      { error: 'Indexer job failed to complete.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed. Use POST with authorization.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
