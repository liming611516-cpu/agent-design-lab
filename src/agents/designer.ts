import { BaseAgent } from './base';
import type { AgentRole } from '../types';

export class DesignerAgent extends BaseAgent {
  readonly role: AgentRole = 'designer';
  readonly systemTag = '[DESIGNER]';

  protected systemPrompt(): string {
    return `[DESIGNER] You are the Designer Agent.
Given the user requirement and the planner's task list, produce structured design decisions:
- layout strategy
- color palette (primary/secondary/accent/background/text, hex)
- typography (font family, heading size, body size)
- information hierarchy (ordered list of content blocks)
- free-text notes
Always output valid JSON matching that shape.`;
  }
}
