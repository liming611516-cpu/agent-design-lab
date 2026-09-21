// ============================================================
// Context manager — per-agent message history with truncation.
// When total character count exceeds THRESHOLD, we keep:
//   1. The system prompt (always)
//   2. The most recent K messages
//   3. A summary placeholder in between
// Token estimation is approximate: ~4 chars ≈ 1 token, but we
// use raw char count as the budget (configurable).
// ============================================================

import type { ChatMessage } from '../types';

const DEFAULT_CHAR_THRESHOLD = 8000;
const DEFAULT_RECENT_KEEP = 4;

export interface ContextManagerOptions {
  charThreshold?: number;
  recentKeep?: number;
}

export class ContextManager {
  private history: ChatMessage[] = [];
  private systemPrompt: string | null = null;
  private charThreshold: number;
  private recentKeep: number;

  constructor(opts: ContextManagerOptions = {}) {
    this.charThreshold = opts.charThreshold ?? DEFAULT_CHAR_THRESHOLD;
    this.recentKeep = opts.recentKeep ?? DEFAULT_RECENT_KEEP;
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
    // Drop any pre-existing system message in history.
    this.history = this.history.filter((m) => m.role !== 'system');
  }

  append(message: ChatMessage): void {
    this.history.push(message);
  }

  /**
   * Build the message list to send to the LLM, applying truncation
   * if the estimated total exceeds the threshold.
   */
  build(): ChatMessage[] {
    const messages: ChatMessage[] = [];
    if (this.systemPrompt) {
      messages.push({ role: 'system', content: this.systemPrompt });
    }
    messages.push(...this.history);

    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    if (totalChars <= this.charThreshold) {
      return messages;
    }

    // Truncate: keep system + last recentKeep messages, insert a summary marker.
    const systemMsgs = messages.filter((m) => m.role === 'system');
    const nonSystem = messages.filter((m) => m.role !== 'system');
    const recent = nonSystem.slice(-this.recentKeep);
    const droppedCount = nonSystem.length - recent.length;

    const truncated: ChatMessage[] = [...systemMsgs];
    if (droppedCount > 0) {
      truncated.push({
        role: 'system',
        content: `[context truncated: ${droppedCount} earlier message(s) removed to fit budget. Summary placeholder.]`,
      });
    }
    truncated.push(...recent);
    return truncated;
  }

  /** Estimated character count (for debugging / display). */
  estimatedChars(): number {
    return this.history.reduce((sum, m) => sum + m.content.length, 0);
  }

  clear(): void {
    this.history = [];
  }
}
