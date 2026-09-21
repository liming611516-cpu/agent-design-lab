// ============================================================
// Tool schemas in OpenAI function-calling format.
// Even the Mock provider ships these so the architecture
// demonstrates understanding of function calling.
// ============================================================

import type { ToolSchema } from '../types';

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'fs.readFile',
      description: 'Read a text file from the workspace directory.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path inside workspace/, e.g. "output.html"',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fs.writeFile',
      description: 'Write (create or overwrite) a text file inside workspace/.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path inside workspace/' },
          content: { type: 'string', description: 'Full file content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fs.listDir',
      description: 'List all files inside the workspace directory.',
      parameters: {
        type: 'object',
        properties: {
          subpath: {
            type: 'string',
            description: 'Optional subdirectory inside workspace/ (default root)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'runNodeSnippet',
      description:
        'Run a short JavaScript snippet in an isolated child_process with a 5s timeout. Captures stdout/stderr.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'JS source code to execute' },
        },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'htmlStaticCheck',
      description:
        'Run static validation on an HTML string: tag pairing, length bounds, dangerous-syntax blacklist (external script src, eval, inline event handlers).',
      parameters: {
        type: 'object',
        properties: {
          html: { type: 'string', description: 'The HTML string to validate' },
        },
        required: ['html'],
      },
    },
  },
];
