// ============================================================
// Tool dispatcher — maps a tool name + args to an actual
// implementation. Used by both the Orchestrator (server-side)
// and the /api/tool route (manual invocation).
// ============================================================

import type { ToolCallResult } from '../types';
import { fsReadFile, fsWriteFile, fsListDir } from './fs';
import { runNodeSnippet } from './runNodeSnippet';
import { htmlStaticCheck } from './htmlStaticCheck';

export async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolCallResult> {
  const start = Date.now();
  try {
    let output: unknown;
    switch (name) {
      case 'fs.readFile': {
        output = await fsReadFile(String(args.path ?? ''));
        break;
      }
      case 'fs.writeFile': {
        output = await fsWriteFile(
          String(args.path ?? ''),
          String(args.content ?? ''),
        );
        break;
      }
      case 'fs.listDir': {
        output = await fsListDir(args.subpath ? String(args.subpath) : undefined);
        break;
      }
      case 'runNodeSnippet': {
        output = await runNodeSnippet(String(args.code ?? ''));
        break;
      }
      case 'htmlStaticCheck': {
        output = htmlStaticCheck(String(args.html ?? ''));
        break;
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return {
      name,
      arguments: args,
      output,
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      name,
      arguments: args,
      output: null,
      error: (e as Error).message,
      duration_ms: Date.now() - start,
    };
  }
}
