// ============================================================
// GET /api/preview/[...path] — serve a file from workspace/ as
// text/html so the frontend can iframe it.
// ============================================================

import { NextResponse } from 'next/server';
import { fsReadFile, sanitizeWorkspacePath } from '@/tools/fs';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } },
) {
  try {
    const relPath = params.path.join('/');
    const abs = sanitizeWorkspacePath(relPath);

    if (!fs.existsSync(abs)) {
      return new NextResponse(`File not found: ${relPath}`, { status: 404 });
    }

    const content = await fsReadFile(relPath);
    const ext = path.extname(relPath).toLowerCase();

    const contentType =
      ext === '.html' ? 'text/html; charset=utf-8'
      : ext === '.css' ? 'text/css; charset=utf-8'
      : ext === '.js' ? 'application/javascript; charset=utf-8'
      : 'text/plain; charset=utf-8';

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (e) {
    return new NextResponse(`Preview error: ${(e as Error).message}`, { status: 500 });
  }
}
