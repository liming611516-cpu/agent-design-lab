import { BaseAgent } from './base';
import type { AgentRole } from '../types';

export class CodeGenAgent extends BaseAgent {
  readonly role: AgentRole = 'codegen';
  readonly systemTag = '[CODEGEN]';

  protected systemPrompt(): string {
    return `[CODEGEN] You are the CodeGen Agent.
Given the design decisions from the Designer, produce a self-contained HTML file:
- Must include <!DOCTYPE html>, <html>, <head>, <body>
- All CSS inline in a <style> tag inside <head>
- No external script src, no eval, no inline event handlers, no external fetch
- Output valid JSON: { "filename": "output.html", "html": "...", "summary": "..." }
Keep the page clean, readable, data-focused.`;
  }
}
