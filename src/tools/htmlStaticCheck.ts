// ============================================================
// htmlStaticCheck — static validation of generated HTML.
// Uses node-html-parser for DOM-aware tag pairing, plus regex
// blacklist for dangerous patterns (external script src, eval,
// inline event handlers, etc.).
// ============================================================

import { parse } from 'node-html-parser';
import type { VerifyResult } from '../types';

const MIN_HTML_LENGTH = 100;
const MAX_HTML_LENGTH = 100_000;

// Patterns we refuse in generated HTML (security / sandbox rules).
const DANGEROUS_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'external_script_src', regex: /<script[^>]+src\s*=/i },
  { name: 'eval_call', regex: /\beval\s*\(/ },
  { name: 'inline_event_handler', regex: /\bon(click|load|error|mouseover|submit|change|focus|blur)\s*=/i },
  { name: 'javascript_uri', regex: /href\s*=\s*["']javascript:/i },
  { name: 'document_cookie', regex: /document\.cookie/ },
  { name: 'fetch_or_xmlhttp', regex: /\b(fetch\s*\(|XMLHttpRequest)/ },
];

export function htmlStaticCheck(html: string): VerifyResult {
  const checks: VerifyResult['checks'] = [];
  const issues: string[] = [];

  // 1. Length bounds
  const len = html.length;
  checks.push({
    name: 'length_bounds',
    passed: len >= MIN_HTML_LENGTH && len <= MAX_HTML_LENGTH,
    detail: `HTML length = ${len} (allowed ${MIN_HTML_LENGTH}-${MAX_HTML_LENGTH})`,
  });
  if (len < MIN_HTML_LENGTH) issues.push('HTML too short (likely empty/incomplete).');
  if (len > MAX_HTML_LENGTH) issues.push('HTML exceeds max length cap.');

  // 2. Parse + tag pairing via node-html-parser
  let domOk = false;
  let domDetail = '';
  try {
    const root = parse(html, { comment: false, blockTextElements: {} });
    // node-html-parser auto-closes, but we can check key structural tags exist.
    const hasHtml = root.querySelector('html') !== null;
    const hasHead = root.querySelector('head') !== null;
    const hasBody = root.querySelector('body') !== null;
    domOk = hasHtml && hasHead && hasBody;
    domDetail = `html=${hasHtml} head=${hasHead} body=${hasBody}`;
  } catch (e) {
    domDetail = `parse error: ${(e as Error).message}`;
    issues.push('HTML could not be parsed (malformed).');
  }
  checks.push({
    name: 'dom_structure',
    passed: domOk,
    detail: domDetail,
  });

  // 3. Dangerous pattern blacklist
  for (const { name, regex } of DANGEROUS_PATTERNS) {
    const matched = regex.test(html);
    checks.push({
      name,
      passed: !matched,
      detail: matched ? `found pattern matching ${name}` : 'clean',
    });
    if (matched) issues.push(`Dangerous pattern detected: ${name}`);
  }

  const passed = checks.every((c) => c.passed);
  return {
    passed,
    checks,
    issues,
    htmlLength: len,
  };
}
