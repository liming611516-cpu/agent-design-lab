// ============================================================
// runNodeSnippet — execute a JS snippet in an isolated
// child_process with a 5s timeout. NEVER forks user code into
// the main Next.js process.
// ============================================================

import { execFile } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

export interface RunNodeSnippetResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

const SNIPPET_TIMEOUT_MS = 5000;

export async function runNodeSnippet(code: string): Promise<RunNodeSnippetResult> {
  // Write snippet to a temp file, then run `node tempfile.js`.
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-snip-'));
  const tmpFile = path.join(tmpDir, 'snippet.js');
  await fs.writeFile(tmpFile, code, 'utf-8');

  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      [tmpFile],
      {
        timeout: SNIPPET_TIMEOUT_MS,
        maxBuffer: 1024 * 1024, // 1MB
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        // Cleanup temp files best-effort.
        fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

        const timedOut =
          !!error && (error as { killed?: boolean }).killed === true;
        resolve({
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          exitCode: error ? (error.code as number | null) ?? -1 : 0,
          timedOut,
        });
      },
    );
    // Ensure we don't leak the child reference.
    child.unref();
  });
}
