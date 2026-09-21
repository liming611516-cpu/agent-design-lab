'use client';

import { useState, useCallback } from 'react';
import type { RunRecord, AgentStep, AgentRole } from '@/types';

const AGENT_COLORS: Record<AgentRole, string> = {
  planner: 'bg-blue-100 text-blue-800 border-blue-300',
  designer: 'bg-purple-100 text-purple-800 border-purple-300',
  codegen: 'bg-amber-100 text-amber-800 border-amber-300',
  verify: 'bg-green-100 text-green-800 border-green-300',
  fixer: 'bg-rose-100 text-rose-800 border-rose-300',
};

const STATE_LABEL: Record<string, string> = {
  idle: '空闲',
  planning: '规划中',
  designing: '设计中',
  coding: '代码生成',
  verifying: '验证中',
  fixing: '修复中',
  done: '完成',
  failed: '失败',
};

function StepCard({ step }: { step: AgentStep }) {
  const colorClass = AGENT_COLORS[step.agent] ?? 'bg-gray-100 text-gray-800';
  const time = new Date(step.timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
  });

  return (
    <div className={`border-l-4 rounded-lg p-4 mb-3 bg-white shadow-sm border ${colorClass.split(' ')[2]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
          {step.agent.toUpperCase()} · {STATE_LABEL[step.state] ?? step.state}
        </span>
        <span className="text-xs text-gray-500">{time}</span>
      </div>
      <div className="text-sm mb-1">
        <span className="text-gray-500">输入:</span> {step.inputSummary}
      </div>
      {step.toolCalls.length > 0 && (
        <div className="mt-2 mb-2">
          <div className="text-xs text-gray-500 mb-1">工具调用:</div>
          {step.toolCalls.map((tc, i) => (
            <pre
              key={i}
              className="text-xs bg-gray-50 border rounded p-2 overflow-x-auto"
            >
              {tc.name}({JSON.stringify(tc.arguments, null, 2).slice(0, 200)})
              {tc.error ? `\nERROR: ${tc.error}` : `\n→ ${typeof tc.output === 'string' ? tc.output.slice(0, 150) : JSON.stringify(tc.output).slice(0, 150)}`}
            </pre>
          ))}
        </div>
      )}
      <div className="text-sm">
        <span className="text-gray-500">输出:</span> {step.outputSummary}
      </div>
      {step.error && (
        <div className="text-xs text-red-600 mt-1">错误: {step.error}</div>
      )}
    </div>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState(
    '做一个展示上海房价趋势的信息图表页面',
  );
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [currentRun, setCurrentRun] = useState<RunRecord | null>(null);

  const startRun = useCallback(async () => {
    if (!prompt.trim() || running) return;
    setRunning(true);
    setCurrentRun(null);

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), maxIterations: 3 }),
      });
      const data = (await res.json()) as RunRecord & { error?: string };
      if (data.error) {
        alert('Run failed: ' + data.error);
      } else {
        setCurrentRun(data);
        setRuns((prev) => [data, ...prev].slice(0, 20));
      }
    } catch (e) {
      alert('Request failed: ' + (e as Error).message);
    } finally {
      setRunning(false);
    }
  }, [prompt, running]);

  const previewUrl = currentRun?.workspaceFile
    ? `/api/preview/${currentRun.workspaceFile}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">
          Agent Design Lab
        </h1>
        <p className="text-sm text-slate-500">
          多 Agent 智能设计系统 MVP · 同济大学 iDVX Lab 实习作品
        </p>
      </header>

      <div className="flex" style={{ height: 'calc(100vh - 72px)' }}>
        {/* Left sidebar */}
        <aside className="w-80 bg-white border-r p-4 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-slate-700">
              一句话需求
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full border rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="例如：做一个展示上海房价趋势的信息图表页面"
            />
            <button
              onClick={startRun}
              disabled={running || !prompt.trim()}
              className="mt-2 w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {running ? '运行中...' : '启动多 Agent 协作'}
            </button>
          </div>

          <div className="border-t pt-3">
            <div className="text-xs font-medium text-slate-500 mb-2">
              历史 Run ({runs.length})
            </div>
            {runs.length === 0 && (
              <p className="text-xs text-slate-400">暂无历史记录</p>
            )}
            {runs.map((r) => (
              <button
                key={r.id}
                onClick={() => setCurrentRun(r)}
                className="w-full text-left p-2 mb-1 rounded text-xs hover:bg-slate-50 border border-transparent hover:border-slate-200"
              >
                <div className="font-medium text-slate-700 truncate">
                  {r.userPrompt.slice(0, 40)}
                </div>
                <div className="text-slate-400">
                  {new Date(r.createdAt).toLocaleString('zh-CN', { hour12: false })}
                  {' · '}
                  <span
                    className={
                      r.state === 'done'
                        ? 'text-green-600'
                        : r.state === 'failed'
                          ? 'text-red-600'
                          : 'text-blue-600'
                    }
                  >
                    {STATE_LABEL[r.state] ?? r.state}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {currentRun ? (
            <>
              {/* Timeline */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Run: {currentRun.id}
                  </h2>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      currentRun.state === 'done'
                        ? 'bg-green-100 text-green-700'
                        : currentRun.state === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {STATE_LABEL[currentRun.state] ?? currentRun.state}
                  </span>
                  <span className="text-xs text-slate-400">
                    迭代 {currentRun.iterations}/{currentRun.maxIterations}
                  </span>
                </div>
                {currentRun.steps.map((step) => (
                  <StepCard key={step.id} step={step} />
                ))}
                {currentRun.error && (
                  <div className="text-sm text-red-600 p-3 bg-red-50 rounded">
                    最终错误: {currentRun.error}
                  </div>
                )}
              </div>

              {/* Preview iframe */}
              <div className="h-1/2 border-t bg-slate-100 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">
                    实时预览
                  </h3>
                  {currentRun.workspaceFile && (
                    <span className="text-xs text-slate-500">
                      {currentRun.workspaceFile}
                    </span>
                  )}
                </div>
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full bg-white rounded border shadow-sm"
                    sandbox="allow-same-origin"
                    title="preview"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                    等待代码生成...
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <p className="text-lg mb-2">输入一句话需求，启动多 Agent 协作</p>
                <p className="text-sm">
                  Planner → Designer → CodeGen → Verify → IterateFix
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
