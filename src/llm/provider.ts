// ============================================================
// LLMProvider interface — the single abstraction over all LLM backends
// ============================================================

import type { ChatMessage, LLMResponse, ToolSchema } from '../types';

export interface LLMProvider {
  readonly name: string;
  complete(
    messages: ChatMessage[],
    tools?: ToolSchema[],
  ): Promise<LLMResponse>;
}
