// ============================================================
// BaseAgent — shared scaffolding for all specialist agents.
// Owns a ContextManager and an LLMProvider reference.
// ============================================================

import type { AgentRole, ChatMessage, LLMResponse, ToolCallResult } from '../types';
import type { LLMProvider } from '../llm/provider';
import { ContextManager } from '../context/manager';
import { TOOL_SCHEMAS } from '../tools/schemas';

export abstract class BaseAgent {
  abstract readonly role: AgentRole;
  abstract readonly systemTag: string; // e.g. [PLANNER]

  protected llm: LLMProvider;
  protected context: ContextManager;

  constructor(llm: LLMProvider) {
    this.llm = llm;
    this.context = new ContextManager();
  }

  /** Subclass provides its system prompt (already tagged). */
  protected abstract systemPrompt(): string;

  /**
   * Run one turn: inject user input, call LLM, append response.
   * Returns the raw LLM content string.
   */
  async run(userInput: string, priorToolResults: ToolCallResult[] = []): Promise<string> {
    this.context.setSystemPrompt(this.systemPrompt());

    // Inject prior tool results as a synthetic user message (if any).
    if (priorToolResults.length > 0) {
      const toolSummary = priorToolResults
        .map(
          (t) =>
            `[tool:${t.name}] ${t.error ? 'ERROR: ' + t.error : 'OK'} -> ${typeof t.output === 'string' ? t.output.slice(0, 300) : JSON.stringify(t.output).slice(0, 300)}`,
        )
        .join('\n');
      this.context.append({
        role: 'user',
        content: `Prior tool results:\n${toolSummary}\n\nNew instruction:\n${userInput}`,
      });
    } else {
      this.context.append({ role: 'user', content: userInput });
    }

    const messages: ChatMessage[] = this.context.build();
    const response: LLMResponse = await this.llm.complete(messages, TOOL_SCHEMAS);

    this.context.append({ role: 'assistant', content: response.content });
    return response.content;
  }

  /** Reset conversation history (between runs). */
  reset(): void {
    this.context.clear();
  }
}
