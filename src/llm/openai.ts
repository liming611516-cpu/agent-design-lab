// ============================================================
// OpenAICompatibleProvider — talks to any OpenAI-compatible
// /chat/completions endpoint via fetch. Only used when
// OPENAI_API_KEY is present in env.
// ============================================================

import type { ChatMessage, LLMResponse, ToolSchema } from '../types';
import type { LLMProvider } from './provider';

export interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl: string; // e.g. https://api.openai.com/v1
  model: string;
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly name = 'openai-compatible';
  private config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.config = config;
  }

  async complete(
    messages: ChatMessage[],
    tools?: ToolSchema[],
  ): Promise<LLMResponse> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      })),
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(
        `OpenAICompatibleProvider error ${res.status}: ${errText.slice(0, 500)}`,
      );
    }

    const data = (await res.json()) as {
      choices?: {
        message?: {
          content?: string;
          tool_calls?: {
            id: string;
            type: string;
            function: { name: string; arguments: string };
          }[];
        };
      }[];
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    const choice = data.choices?.[0];
    const msg = choice?.message;

    return {
      content: msg?.content ?? '',
      tool_calls: msg?.tool_calls?.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      usage: data.usage,
    };
  }
}
