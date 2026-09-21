import { BaseAgent } from './base';
import type { AgentRole } from '../types';

export class FixerAgent extends BaseAgent {
  readonly role: AgentRole = 'fixer';
  readonly systemTag = '[FIXER]';

  protected systemPrompt(): string {
    return `[FIXER] You are the IterateFix Agent.
Given verification issues from the Verify step, output a corrected, self-contained HTML file.
- Same constraints: inline CSS only, no external script src, no eval, no inline handlers
- Output valid JSON: { "filename": "output.html", "html": "...", "summary": "..." }`;
  }
}
