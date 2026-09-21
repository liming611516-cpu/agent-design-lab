// ============================================================
// MockLLMProvider — deterministic, scripted responses for demo
// Inspects the system prompt / last user message to decide which
// agent is asking, then returns a hard-coded but realistic reply.
// ============================================================

import type { ChatMessage, LLMResponse, ToolSchema } from '../types';
import type { LLMProvider } from './provider';

// ---------- Scripted HTML used by the CodeGen agent ----------
const SCRIPTED_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>上海房价趋势 · 2020-2024</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #f0f4f8;
    color: #1a202c;
    padding: 32px;
  }
  .container { max-width: 960px; margin: 0 auto; }
  h1 { font-size: 28px; margin-bottom: 8px; color: #1e3a8a; }
  .subtitle { color: #64748b; margin-bottom: 28px; font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .card {
    background: #fff;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    border-top: 3px solid #3b82f6;
  }
  .card .label { font-size: 12px; color: #64748b; margin-bottom: 6px; }
  .card .value { font-size: 24px; font-weight: 700; color: #1e3a8a; }
  .card .delta { font-size: 12px; margin-top: 4px; color: #16a34a; }
  .chart {
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .bar-row { display: flex; align-items: center; margin-bottom: 12px; gap: 12px; }
  .bar-label { width: 80px; font-size: 13px; color: #475569; }
  .bar-track { flex: 1; height: 24px; background: #e2e8f0; border-radius: 6px; overflow: hidden; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 6px; }
  .bar-value { width: 80px; font-size: 13px; font-weight: 600; text-align: right; }
  .footer { margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
  <div class="container">
    <h1>上海房价趋势概览</h1>
    <p class="subtitle">数据来源：公开市场成交均价（2020 - 2024）· 单位：元/㎡</p>
    <div class="grid">
      <div class="card">
        <div class="label">2020 均价</div>
        <div class="value">58,400</div>
        <div class="delta">基准年</div>
      </div>
      <div class="card">
        <div class="label">2022 均价</div>
        <div class="value">66,200</div>
        <div class="delta">▲ 13.4%</div>
      </div>
      <div class="card">
        <div class="label">2024 均价</div>
        <div class="value">69,800</div>
        <div class="delta">▲ 5.4%</div>
      </div>
      <div class="card">
        <div class="label">5 年涨幅</div>
        <div class="value">+19.5%</div>
        <div class="delta">2020 → 2024</div>
      </div>
    </div>
    <div class="chart">
      <h3 style="margin-bottom:16px;font-size:16px;">年度均价对比</h3>
      <div class="bar-row">
        <div class="bar-label">2020</div>
        <div class="bar-track"><div class="bar-fill" style="width:83.6%"></div></div>
        <div class="bar-value">58,400</div>
      </div>
      <div class="bar-row">
        <div class="bar-label">2021</div>
        <div class="bar-track"><div class="bar-fill" style="width:89.5%"></div></div>
        <div class="bar-value">62,500</div>
      </div>
      <div class="bar-row">
        <div class="bar-label">2022</div>
        <div class="bar-track"><div class="bar-fill" style="width:94.8%"></div></div>
        <div class="bar-value">66,200</div>
      </div>
      <div class="bar-row">
        <div class="bar-label">2023</div>
        <div class="bar-track"><div class="bar-fill" style="width:97.3%"></div></div>
        <div class="bar-value">68,000</div>
      </div>
      <div class="bar-row">
        <div class="bar-label">2024</div>
        <div class="bar-track"><div class="bar-fill" style="width:100%"></div></div>
        <div class="bar-value">69,800</div>
      </div>
    </div>
    <p class="footer">© iDVX Lab · Multi-Agent Design Demo</p>
  </div>
</body>
</html>`;

export class MockLLMProvider implements LLMProvider {
  readonly name = 'mock';

  async complete(
    messages: ChatMessage[],
    _tools?: ToolSchema[],
  ): Promise<LLMResponse> {
    // Determine which agent is calling by scanning the system prompt
    const systemPrompt =
      messages.find((m) => m.role === 'system')?.content ?? '';
    const lastUser =
      [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

    // Route based on agent identity in system prompt
    if (systemPrompt.includes('[PLANNER]')) {
      return this.plannerReply(lastUser);
    }
    if (systemPrompt.includes('[DESIGNER]')) {
      return this.designerReply(lastUser);
    }
    if (systemPrompt.includes('[CODEGEN]')) {
      return this.codegenReply(lastUser);
    }
    if (systemPrompt.includes('[VERIFY]')) {
      return this.verifyReply(lastUser);
    }
    if (systemPrompt.includes('[FIXER]')) {
      return this.fixerReply(lastUser);
    }

    // Fallback
    return {
      content: JSON.stringify({
        note: 'Mock LLM received a request it could not route.',
        echo: lastUser.slice(0, 200),
      }),
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  // ---------- Planner ----------
  private plannerReply(userPrompt: string): LLMResponse {
    const output = {
      tasks: [
        {
          step: 'layout',
          agent: 'designer',
          description: 'Determine page layout, color palette and information hierarchy based on user need.',
        },
        {
          step: 'visual_design',
          agent: 'designer',
          description: 'Refine typography, spacing and visual weight decisions.',
        },
        {
          step: 'codegen',
          agent: 'codegen',
          description: 'Produce a self-contained HTML page with inline CSS and JS.',
        },
        {
          step: 'verify',
          agent: 'verify',
          description: 'Run static checks on generated HTML (tag pairing, length, dangerous syntax).',
        },
        {
          step: 'iterate',
          agent: 'fixer',
          description: 'If verification fails, auto-fix up to N rounds.',
        },
      ],
      summary: `Planned 5-step pipeline for: "${userPrompt.slice(0, 80)}".`,
    };
    return {
      content: JSON.stringify(output, null, 2),
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  // ---------- Designer ----------
  private designerReply(_userPrompt: string): LLMResponse {
    const output = {
      layout: 'card-grid-with-bar-chart',
      colorPalette: {
        primary: '#1e3a8a',
        secondary: '#3b82f6',
        accent: '#16a34a',
        background: '#f0f4f8',
        text: '#1a202c',
      },
      typography: {
        fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
        headingSize: '28px',
        bodySize: '14px',
      },
      infoHierarchy: [
        'Title + subtitle (page level)',
        '4 KPI cards (row 1)',
        'Bar chart comparison (row 2)',
        'Footer note (lowest priority)',
      ],
      notes: 'Clean, data-focused. Use blue gradient bars. Cards with subtle top border accent.',
    };
    return {
      content: JSON.stringify(output, null, 2),
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  // ---------- CodeGen ----------
  private codegenReply(_userPrompt: string): LLMResponse {
    // Return the scripted HTML wrapped in a JSON envelope so the orchestrator can parse it.
    const envelope = {
      filename: 'output.html',
      html: SCRIPTED_HTML,
      summary: 'Generated a self-contained HTML page with 4 KPI cards and a 5-year bar chart.',
    };
    return {
      content: JSON.stringify(envelope),
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  // ---------- Verify ----------
  private verifyReply(_userPrompt: string): LLMResponse {
    // The actual verification is done by the htmlStaticCheck tool in tools/.
    // This mock reply just acknowledges the verification request.
    const output = {
      note: 'Verification will be performed by the htmlStaticCheck tool. This LLM reply is a placeholder.',
    };
    return {
      content: JSON.stringify(output),
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  // ---------- Fixer ----------
  private fixerReply(_userPrompt: string): LLMResponse {
    // In mock mode, fixer simply returns the same clean HTML (assume issues resolved).
    const envelope = {
      filename: 'output.html',
      html: SCRIPTED_HTML,
      summary: 'Fixer applied minor structural adjustments and re-exported clean HTML.',
    };
    return {
      content: JSON.stringify(envelope),
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }
}
