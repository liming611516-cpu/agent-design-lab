import { BaseAgent } from './base';
import type { AgentRole } from '../types';

export class VerifyAgent extends BaseAgent {
  readonly role: AgentRole = 'verify';
  readonly systemTag = '[VERIFY]';

  protected systemPrompt(): string {
    return `[VERIFY] You are the RunVerify Agent.
Your job is to assess whether generated HTML passes static checks.
The actual checking is performed by the htmlStaticCheck tool; your output is a
brief confirmation that verification was requested and you will review results.
Output valid JSON: { "note": "..." }`;
  }
}
