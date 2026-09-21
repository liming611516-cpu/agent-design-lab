// ============================================================
// POST /api/tool — manually invoke a tool (debug / inspection).
// Body: { name: string, arguments: Record<string, unknown> }
// ============================================================

import { NextResponse } from 'next/server';
import { dispatchTool } from '@/tools';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      arguments?: Record<string, unknown>;
    };

    if (!body.name) {
      return NextResponse.json({ error: 'Missing "name" in request body.' }, { status: 400 });
    }

    const result = await dispatchTool(body.name, body.arguments ?? {});
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: `Tool dispatch failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
