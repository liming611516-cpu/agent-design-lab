// ============================================================
// fs tools — operate inside ./workspace/ only.
// Paths are sanitised to prevent directory traversal.
// ============================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { WORKSPACE_ROOT } from './paths';

export function sanitizeWorkspacePath(relPath: string): string {
  // Resolve and ensure it stays inside WORKSPACE_ROOT.
  const resolved = path.resolve(WORKSPACE_ROOT, relPath);
  const rel = path.relative(WORKSPACE_ROOT, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path traversal blocked: ${relPath}`);
  }
  return resolved;
}

export async function fsReadFile(relPath: string): Promise<string> {
  const abs = sanitizeWorkspacePath(relPath);
  return fs.readFile(abs, 'utf-8');
}

export async function fsWriteFile(relPath: string, content: string): Promise<{ bytes: number; path: string }> {
  const abs = sanitizeWorkspacePath(relPath);
  // Ensure parent dir exists.
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, 'utf-8');
  return { bytes: Buffer.byteLength(content, 'utf-8'), path: relPath };
}

export async function fsListDir(subpath?: string): Promise<string[]> {
  const base = subpath ? sanitizeWorkspacePath(subpath) : WORKSPACE_ROOT;
  await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
  const entries = await fs.readdir(base, { withFileTypes: true });
  return entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
}
