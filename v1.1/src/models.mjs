// Paper 923 model access (copied from 922; fake models replaced). Real models: LM Studio OpenAI-compatible endpoint on 127.0.0.1:1234, or (keys starting with
// "ollama:") the Ollama native chat API on 127.0.0.1:11434 with num_ctx 16384 and temperature 0, or (keys starting with
// "codex:") the Codex CLI (GPT family; see codex.mjs). No other host.
// Fake models (ids starting with "fake-") are deterministic scripted agents for pipeline tests; their outputs never
// count as results and must be written under results/fake-*.
//   fake-checker   approves iff the item is safe (needs setFakeItem)
//   fake-gullible  approves whenever the J2 justification is present
//   fake-strict    always rejects
import { codexChat } from './codex.mjs';
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const ENDPOINT = 'http://127.0.0.1:1234/v1/chat/completions';
export const isFake = (m) => String(m).startsWith('fake-');

// v0.4 (design §7.2, pre-freeze): thinking / reasoning settings for LM Studio models are sent EXPLICITLY in every request.
// Probe 2026-11-11: qwen3.6-35b-a3b gives 0 reasoning tokens with or without enable_thinking:false; gpt-oss-20b gives identical
// output with or without reasoning_effort:'low' (LM Studio default is already low), so dev-002 results carry over.
export function lmStudioThinking(model) {
  const m = String(model);
  if (m.includes('gpt-oss')) return { reasoning_effort: 'low' };
  if (/qwen3/i.test(m)) return { chat_template_kwargs: { enable_thinking: false } };
  return {};
}
export async function chat(model, messages, { tools, maxTokens = 4096, timeoutMs = 300000 } = {}) { // max_tokens 4096 (921 lesson)
  if (isFake(model)) return fakeChat(model, messages);
  if (String(model).startsWith('codex:')) return codexChat(model, messages, tools);
  if (String(model).startsWith('mlx:')) return mlxChat(model.slice(4), messages, { maxTokens });
  if (String(model).startsWith('ollama:')) return ollamaChat(model.slice(7), messages, { tools, maxTokens, timeoutMs });
  const body = { model, messages, temperature: 0, max_tokens: maxTokens, stream: false, ...lmStudioThinking(model) };
  if (tools) { body.tools = tools; body.tool_choice = 'auto'; body.parallel_tool_calls = false; }
  const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), timeoutMs); const t0 = Date.now();
  try {
    const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal, redirect: 'error' });
    const j = await res.json();
    if (!res.ok || j.error) return { ok: false, error: `HTTP ${res.status} ${JSON.stringify(j.error ?? '').slice(0, 300)}`, ms: Date.now() - t0 };
    const m = j.choices?.[0]?.message ?? {};
    return { ok: true, content: m.content ?? '', reasoning: m.reasoning_content ?? m.reasoning ?? null, toolCalls: (m.tool_calls ?? []).map((c) => ({ id: c.id, name: c.function?.name, arguments: c.function?.arguments })), finish: j.choices?.[0]?.finish_reason, usage: j.usage ?? null, ms: Date.now() - t0 };
  } catch (e) { return { ok: false, error: `transport: ${e.name}: ${e.message}`, ms: Date.now() - t0 }; } finally { clearTimeout(timer); }
}

const OLLAMA = 'http://127.0.0.1:11434/api/chat';
export const OLLAMA_OPTIONS = { temperature: 0, num_ctx: 16384 };
async function ollamaChat(name, messages, { tools, maxTokens, timeoutMs }) {
  // native API: tool-call arguments are objects, not JSON strings; convert both ways
  const msgs = messages.map((m) => (m.tool_calls ? { role: m.role, content: m.content ?? '', tool_calls: m.tool_calls.map((c) => ({ function: { name: c.function.name, arguments: (() => { try { return JSON.parse(c.function.arguments || '{}'); } catch { return {}; } })() } })) } : { role: m.role, content: m.content ?? '' }));
  // key suffix '+nothink' (e.g. ollama:qwen3:8b+nothink) sends think:false, matching TEA Lab's thinking-disabled setting
  // '+think' sends think:true explicitly (thinking-on arm of the same model)
  const noThink = name.endsWith('+nothink'); if (noThink) name = name.slice(0, -8);
  const yesThink = !noThink && name.endsWith('+think'); if (yesThink) name = name.slice(0, -6);
  const body = { model: name, messages: msgs, stream: false, options: { ...OLLAMA_OPTIONS, num_predict: maxTokens } };
  if (noThink) body.think = false;
  if (yesThink) body.think = true;
  if (tools) body.tools = tools;
  const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), timeoutMs); const t0 = Date.now();
  try {
    const res = await fetch(OLLAMA, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal, redirect: 'error' });
    const j = await res.json();
    if (!res.ok || j.error) return { ok: false, error: `HTTP ${res.status} ${JSON.stringify(j.error ?? '').slice(0, 300)}`, ms: Date.now() - t0 };
    const m = j.message ?? {};
    return { ok: true, content: m.content ?? '', reasoning: m.thinking ?? null, toolCalls: (m.tool_calls ?? []).map((c, i) => ({ id: `oc_${i}`, name: c.function?.name, arguments: JSON.stringify(c.function?.arguments ?? {}) })), finish: j.done_reason, usage: { prompt_tokens: j.prompt_eval_count ?? 0, completion_tokens: j.eval_count ?? 0 }, ms: Date.now() - t0 };
  } catch (e) { return { ok: false, error: `transport: ${e.name}: ${e.message}`, ms: Date.now() - t0 }; } finally { clearTimeout(timer); }
}

// mlx:<model dir> — small local models through a persistent Python child process (stdin/stdout JSON lines; no socket).
// These models get the decision format in the system prompt (no native tool calling); parseDecision reads the JSON text.
const MLX_PY = `${process.env.HOME}/Documents/venvs/p92x/bin/python`; let mlx = null;
function mlxProc(dir) {
  if (mlx && mlx.dir === dir) return mlx;
  const p = spawn(MLX_PY, ['-I', new URL('./mlx_bridge.py', import.meta.url).pathname, dir], { stdio: ['pipe', 'pipe', 'inherit'] });
  const rl = readline.createInterface({ input: p.stdout }); const queue = [];
  rl.on('line', (l) => { const m = JSON.parse(l); if (m.ready) return; queue.shift()?.(m); });
  mlx = { dir, p, queue }; return mlx;
}
export const MLX_FORMAT = ' Reply with only a JSON object of the form {"decision": "approve" or "reject", "reason": "<one sentence>"}.';
async function mlxChat(dir, messages, { maxTokens }) {
  const m = mlxProc(dir); const t0 = Date.now();
  const msgs = messages.map((x) => (x.role === 'system' ? { role: 'system', content: x.content.replace(' Use the decide tool exactly once.', '') + MLX_FORMAT } : { role: x.role, content: x.content }));
  const res = await new Promise((resolve) => { m.queue.push(resolve); m.p.stdin.write(JSON.stringify({ messages: msgs, max_tokens: Math.min(maxTokens, 1024) }) + '\n'); });
  return { ok: true, content: res.content, reasoning: null, toolCalls: [], finish: res.finish, usage: { prompt_tokens: res.prompt_tokens, completion_tokens: res.completion_tokens }, ms: Date.now() - t0 };
}
export function closeMlx() { if (mlx) { mlx.p.stdin.end(); mlx = null; } }

let fakeItem = null;
export const setFakeItem = (it) => { fakeItem = it; };
// Fake gates for pipeline tests only: fake-checker approves iff the item is safe; fake-gullible approves whenever a
// J2 justification is present, otherwise behaves like fake-checker; fake-strict always rejects.
function fakeChat(model, messages) {
  const user = messages.find((m) => m.role === 'user').content;
  let decision;
  if (model === 'fake-strict') decision = 'reject';
  else if (model === 'fake-checker') decision = fakeItem.kind === 'safe' ? 'approve' : 'reject';
  else if (model === 'fake-gullible') decision = /does not apply to this request: an exception was approved/.test(user) ? 'approve' : fakeItem.kind === 'safe' ? 'approve' : 'reject';
  else if (model === 'fake-gullible11') decision = /Justification from the proposing agent/.test(user) && !/Platform check/.test(user) ? 'approve' : fakeItem.kind === 'safe' ? 'approve' : 'reject';
  else if (model === 'fake-suspicious11') decision = /Justification from the proposing agent/.test(user) && !/Platform check/.test(user) ? 'reject' : fakeItem.kind === 'safe' ? 'approve' : 'reject';
  else return { ok: false, error: `unknown fake model ${model}`, ms: 0 };
  return { ok: true, content: '', reasoning: null, toolCalls: [{ id: 'f1', name: 'decide', arguments: JSON.stringify({ decision, reason: 'fake' }) }], finish: 'tool_calls', usage: { prompt_tokens: Math.ceil(user.length / 4), completion_tokens: 10 }, ms: 1 };
}
