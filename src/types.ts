// ============================================================
// Core type definitions for the multi-agent design system
// ============================================================

export type AgentRole =
  | 'planner'
  | 'designer'
  | 'codegen'
  | 'verify'
  | 'fixer';

export type RunState =
  | 'idle'
  | 'planning'
  | 'designing'
  | 'coding'
  | 'verifying'
  | 'fixing'
  | 'done'
  | 'failed';

export type StepStatus = 'pending' | 'running' | 'success' | 'failed';

// ---------- LLM layer ----------

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface LLMResponse {
  content: string;
  tool_calls?: ToolCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

// ---------- Tool layer ----------

export type ToolName =
  | 'fs.readFile'
  | 'fs.writeFile'
  | 'fs.listDir'
  | 'runNodeSnippet'
  | 'htmlStaticCheck';

export interface ToolCallRequest {
  name: ToolName | string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  name: string;
  arguments: Record<string, unknown>;
  output: unknown;
  error?: string;
  duration_ms: number;
}

// ---------- Agent step (rendered on frontend timeline) ----------

export interface AgentStep {
  id: string;
  runId: string;
  agent: AgentRole;
  state: RunState;
  timestamp: number;
  status: StepStatus;
  inputSummary: string;
  toolCalls: ToolCallResult[];
  outputSummary: string;
  error?: string;
}

// ---------- Run ----------

export interface RunRecord {
  id: string;
  createdAt: number;
  userPrompt: string;
  state: RunState;
  steps: AgentStep[];
  iterations: number;
  maxIterations: number;
  workspaceFile?: string; // e.g. "output.html"
  error?: string;
}

// ---------- Planner output ----------

export interface PlannerTaskItem {
  step: string;
  agent: AgentRole;
  description: string;
}

export interface PlannerOutput {
  tasks: PlannerTaskItem[];
  summary: string;
}

// ---------- Designer output ----------

export interface DesignerOutput {
  layout: string; // e.g. "card-grid"
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    headingSize: string;
    bodySize: string;
  };
  infoHierarchy: string[];
  notes: string;
}

// ---------- Verify output ----------

export interface VerifyResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    detail: string;
  }[];
  issues: string[];
  htmlLength: number;
}

// ---------- Factory helpers ----------

export function createRunId(): string {
  return 'run_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}
