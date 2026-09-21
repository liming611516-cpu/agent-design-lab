// ============================================================
// Orchestrator — the state machine that drives a multi-agent run.
//
// Pipeline:
//   PLAN -> DESIGN -> CODEGEN -> VERIFY -> [FIX <-> VERIFY] x N -> DONE
//
// Error recovery:
//   - Any agent/tool throws -> inject error as a user message, retry once.
//   - Exceed maxRetries -> mark run failed, surface error to frontend.
// ============================================================

import type {
  AgentRole,
  AgentStep,
  RunRecord,
  RunState,
  ToolCallResult,
  VerifyResult,
} from './types';
import { createRunId } from './types';
import { getLLMProvider } from './llm/factory';
import type { LLMProvider } from './llm/provider';
import { PlannerAgent } from './agents/planner';
import { DesignerAgent } from './agents/designer';
import { CodeGenAgent } from './agents/codegen';
import { VerifyAgent } from './agents/verify';
import { FixerAgent } from './agents/fixer';
import { dispatchTool } from './tools';
import { fsWriteFile, fsListDir } from './tools/fs';

export interface OrchestratorOptions {
  maxIterations?: number; // fix/verify rounds, default 3
  maxRetries?: number; // per-step error retries, default 1
}

export interface OrchestratorEvents {
  onStep?: (step: AgentStep) => void;
}

export class Orchestrator {
  private llm: LLMProvider;
  private planner: PlannerAgent;
  private designer: DesignerAgent;
  private codegen: CodeGenAgent;
  private verify: VerifyAgent;
  private fixer: FixerAgent;
  private maxIterations: number;
  private maxRetries: number;

  constructor(opts: OrchestratorOptions = {}) {
    this.llm = getLLMProvider();
    this.planner = new PlannerAgent(this.llm);
    this.designer = new DesignerAgent(this.llm);
    this.codegen = new CodeGenAgent(this.llm);
    this.verify = new VerifyAgent(this.llm);
    this.fixer = new FixerAgent(this.llm);
    this.maxIterations = opts.maxIterations ?? 3;
    this.maxRetries = opts.maxRetries ?? 1;
  }

  /**
   * Execute a full run. Returns the final RunRecord.
   * Calls events.onStep after each step completes.
   */
  async execute(
    userPrompt: string,
    events: OrchestratorEvents = {},
  ): Promise<RunRecord> {
    const runId = createRunId();
    const steps: AgentStep[] = [];
    let state: RunState = 'idle';
    let iterations = 0;
    let workspaceFile: string | undefined;
    let error: string | undefined;

    const pushStep = (
      agent: AgentRole,
      stepState: RunState,
      inputSummary: string,
      toolCalls: ToolCallResult[],
      outputSummary: string,
      status: AgentStep['status'],
      err?: string,
    ) => {
      const step: AgentStep = {
        id: `${runId}_${steps.length}`,
        runId,
        agent,
        state: stepState,
        timestamp: Date.now(),
        status,
        inputSummary,
        toolCalls,
        outputSummary,
        error: err,
      };
      steps.push(step);
      events.onStep?.(step);
      return step;
    };

    try {
      // ---- 1. PLAN ----
      state = 'planning';
      const planContent = await this.withRetry(
        () => this.planner.run(userPrompt),
        'planner',
      );
      let planParsed: { tasks: unknown[]; summary: string };
      try {
        planParsed = JSON.parse(planContent);
      } catch {
        planParsed = { tasks: [], summary: planContent.slice(0, 200) };
      }
      pushStep(
        'planner',
        state,
        userPrompt.slice(0, 120),
        [],
        planParsed.summary || `Planned ${planParsed.tasks.length} tasks`,
        'success',
      );

      // ---- 2. DESIGN ----
      state = 'designing';
      const designContent = await this.withRetry(
        () => this.designer.run(`User need: ${userPrompt}\nPlan: ${planContent.slice(0, 500)}`),
        'designer',
      );
      let designParsed: { layout: string; colorPalette: Record<string, string>; notes: string };
      try {
        designParsed = JSON.parse(designContent);
      } catch {
        designParsed = { layout: 'unknown', colorPalette: {}, notes: designContent.slice(0, 200) };
      }
      pushStep(
        'designer',
        state,
        `Layout decision for: ${userPrompt.slice(0, 80)}`,
        [],
        `Layout: ${designParsed.layout}. Palette keys: ${Object.keys(designParsed.colorPalette).join(', ')}`,
        'success',
      );

      // ---- 3. CODEGEN ----
      state = 'coding';
      const codegenContent = await this.withRetry(
        () => this.codegen.run(`Design decisions: ${designContent.slice(0, 800)}`),
        'codegen',
      );
      let codegenParsed: { filename: string; html: string; summary: string };
      try {
        codegenParsed = JSON.parse(codegenContent);
      } catch {
        codegenParsed = { filename: 'output.html', html: codegenContent, summary: codegenContent.slice(0, 200) };
      }

      // Write HTML to workspace
      const writeResult = await dispatchTool('fs.writeFile', {
        path: codegenParsed.filename,
        content: codegenParsed.html,
      });
      workspaceFile = codegenParsed.filename;

      pushStep(
        'codegen',
        state,
        `Generate HTML from design`,
        [writeResult],
        codegenParsed.summary || `Wrote ${codegenParsed.filename}`,
        writeResult.error ? 'failed' : 'success',
        writeResult.error,
      );

      // ---- 4. VERIFY (loop with FIX) ----
      let verifyPassed = false;
      let lastVerifyResult: VerifyResult | null = null;

      while (iterations <= this.maxIterations && !verifyPassed) {
        state = 'verifying';
        iterations++;

        const verifyContent = await this.withRetry(
          () => this.verify.run(`Verify the generated HTML. Run htmlStaticCheck on it.`),
          'verify',
        );

        // Actually run the static check tool on the current HTML.
        const checkToolCall = await dispatchTool('htmlStaticCheck', {
          html: codegenParsed.html,
        });
        lastVerifyResult = checkToolCall.output as VerifyResult;

        pushStep(
          'verify',
          state,
          `Static check round ${iterations}`,
          [checkToolCall],
          lastVerifyResult.passed
            ? `All ${lastVerifyResult.checks.length} checks passed.`
            : `Failed: ${lastVerifyResult.issues.join('; ').slice(0, 200)}`,
          lastVerifyResult.passed ? 'success' : 'failed',
          lastVerifyResult.passed ? undefined : lastVerifyResult.issues.join('; '),
        );

        if (lastVerifyResult.passed) {
          verifyPassed = true;
          break;
        }

        // ---- FIX ----
        if (iterations > this.maxIterations) break;
        state = 'fixing';
        const issuesSnapshot: string[] = lastVerifyResult.issues;
        const fixContent = await this.withRetry(
          () =>
            this.fixer.run(
              `Verification issues: ${JSON.stringify(issuesSnapshot)}\nCurrent HTML:\n${codegenParsed.html.slice(0, 2000)}\nPlease output corrected HTML.`,
            ),
          'fixer',
        );
        let fixParsed: { filename: string; html: string; summary: string };
        try {
          fixParsed = JSON.parse(fixContent);
        } catch {
          fixParsed = { filename: codegenParsed.filename, html: fixContent, summary: fixContent.slice(0, 200) };
        }

        const fixWriteResult = await dispatchTool('fs.writeFile', {
          path: fixParsed.filename,
          content: fixParsed.html,
        });
        codegenParsed = fixParsed;
        workspaceFile = fixParsed.filename;

        pushStep(
          'fixer',
          state,
          `Fix round ${iterations}: ${lastVerifyResult.issues.slice(0, 2).join('; ')}`,
          [fixWriteResult],
          fixParsed.summary || `Rewrote ${fixParsed.filename}`,
          fixWriteResult.error ? 'failed' : 'success',
          fixWriteResult.error,
        );
      }

      if (!verifyPassed) {
        state = 'failed';
        error = `Verification failed after ${this.maxIterations} fix iterations.`;
        pushStep(
          'verify',
          state,
          'Final verification',
          [],
          'Max iterations reached.',
          'failed',
          error,
        );
      } else {
        state = 'done';
      }
    } catch (e) {
      state = 'failed';
      error = (e as Error).message;
      pushStep(
        'planner',
        state,
        'Orchestrator fatal error',
        [],
        error,
        'failed',
        error,
      );
    }

    // Reset agent histories for next run.
    this.planner.reset();
    this.designer.reset();
    this.codegen.reset();
    this.verify.reset();
    this.fixer.reset();

    return {
      id: runId,
      createdAt: Date.now(),
      userPrompt,
      state,
      steps,
      iterations,
      maxIterations: this.maxIterations,
      workspaceFile,
      error,
    };
  }

  /**
   * Run a function with retry. Throws if retries exhausted.
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    agentName: string,
  ): Promise<T> {
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e as Error;
        console.error(`[Orchestrator] ${agentName} attempt ${attempt + 1} failed:`, lastErr.message);
      }
    }
    throw new Error(`${agentName} failed after ${this.maxRetries + 1} attempts: ${lastErr?.message}`);
  }
}
