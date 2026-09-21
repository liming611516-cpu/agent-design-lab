import { BaseAgent } from './base';
import type { AgentRole } from '../types';

export class PlannerAgent extends BaseAgent {
  readonly role: AgentRole = 'planner';
  readonly systemTag = '[PLANNER]';

  protected systemPrompt(): string {
    return `[PLANNER] You are the Planner Agent in a multi-agent design system.
Given a one-line user requirement, decompose it into an ordered task pipeline.
Always output valid JSON with this shape:
{
  "tasks": [{ "step": "...", "agent": "designer|codegen|verify|fixer", "description": "..." }],
  "summary": "..."
}`;
  }
}
