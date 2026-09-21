// ============================================================
// LLM Factory — picks provider based on env vars.
// Defaults to MockLLMProvider when OPENAI_API_KEY is missing.
// ============================================================

import type { LLMProvider } from './provider';
import { MockLLMProvider } from './mock';
import { OpenAICompatibleProvider } from './openai';

let cached: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cached) return cached;

  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (apiKey && apiKey.trim().length > 0) {
    cached = new OpenAICompatibleProvider({ apiKey, baseUrl, model });
    console.log('[LLM] Using OpenAICompatibleProvider:', baseUrl, model);
  } else {
    cached = new MockLLMProvider();
    console.log('[LLM] Using MockLLMProvider (no OPENAI_API_KEY detected)');
  }

  return cached;
}

// Reset cache (useful for tests or when env changes mid-process).
export function resetLLMProvider(): void {
  cached = null;
}
