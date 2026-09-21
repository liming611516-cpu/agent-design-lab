// ============================================================
// POST /api/run — start a new multi-agent run.
// Body: { prompt: string, maxIterations?: number }
// ============================================================

import { NextResponse } from 'next/server';
import { Orchestrator } from '@/orchestrator';
import type { RunRecord } from '@/types';

// Force dynamic execution (we use process.cwd(), fs, child_process).
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      maxIterations?: number;
    };

    if (!body.prompt || body.prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Missing "prompt" in request body.' }, { status: 400 });
    }

    const orchestrator = new Orchestrator({
      maxIterations: body.maxIterations ?? 3,
      maxRetries: 1,
    });

    const run: RunRecord = await orchestrator.execute(body.prompt.trim());

    return NextResponse.json(run, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: `Run failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
