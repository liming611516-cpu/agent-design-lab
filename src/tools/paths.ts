// ============================================================
// Central path resolution for the workspace directory.
// Uses process.cwd() so it works in dev and production builds.
// ============================================================

import path from 'node:path';
import fs from 'node:fs';

export const WORKSPACE_ROOT = path.join(process.cwd(), 'workspace');

// Ensure workspace exists at module load.
try {
  if (!fs.existsSync(WORKSPACE_ROOT)) {
    fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
  }
} catch {
  // Non-fatal; individual fs ops will surface the error.
}
