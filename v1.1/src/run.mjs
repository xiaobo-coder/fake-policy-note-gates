// Paper 923 runner (create-only). Every model call is appended to a SHA-256 hash chain (calls.jsonl).
//   node src/run.mjs --dataset DIR --model KEY --out results/NAME [--limit-pairs N] [--freeze ID]
// One call per (item, J, F); the 6 combinations are rotated per item. The runner never computes ground truth.
// Fake models (fake-*) may only write to results/fake-*.
import fs from 'node:fs';
import path from 'node:path';
import { sha, canonical, createDir, writeNew } from './common.mjs';
import { COMBOS, SYSTEM, TOOLS, userPrompt, parseDecision } from './gate.mjs';
import { chat, isFake, setFakeItem, OLLAMA_OPTIONS, closeMlx, lmStudioThinking } from './models.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const datasetDir = arg('--dataset'); const model = arg('--model'); const out = arg('--out'); const limitPairs = +arg('--limit-pairs', 0);
if (!datasetDir || !model || !out) { console.error('usage: node src/run.mjs --dataset DIR --model KEY --out DIR [--limit-pairs N]'); process.exit(64); }
if (isFake(model) !== path.basename(out).startsWith('fake-')) { console.error('fake models must (and only fake models may) write to results/fake-*'); process.exit(64); }
const ds = JSON.parse(fs.readFileSync(path.join(datasetDir, 'dataset.json'), 'utf8'));
const meta = JSON.parse(fs.readFileSync(path.join(datasetDir, 'META.json'), 'utf8'));
if (meta.sha256 !== sha(canonical(ds))) { console.error('dataset hash mismatch'); process.exit(1); }
// v0.4 (pre-freeze): a TEST-split run refuses to start unless --freeze names a freeze dir (relative to the paper root,
// e.g. freeze-v1.0) whose SHA256SUMS verifies, and the dataset hash is listed in it. Dev runs are unaffected.
if (meta.split === 'f11') {   // v1.1: the confirmatory split
  const fz = arg('--freeze', null); const root = new URL('../', import.meta.url).pathname;   // v1.1 root (freeze-v1.1 lives in v1.1/)
  if (!fz || !/^freeze-v[0-9.]+$/.test(fz)) { console.error('test split requires --freeze freeze-vX.Y'); process.exit(65); }
  const sums = path.join(root, fz, 'SHA256SUMS');
  if (!fs.existsSync(sums)) { console.error(`no ${sums}: 923 is not frozen`); process.exit(65); }
  try { (await import('node:child_process')).execFileSync('shasum', ['-a', '256', '-c', '--quiet', sums], { cwd: root, stdio: 'pipe' }); }
  catch (e) { console.error('freeze check FAILED: ' + String(e.stdout ?? e.message).slice(0, 300)); process.exit(65); }
  if (!fs.readFileSync(sums, 'utf8').includes(meta.sha256)) { console.error('dataset sha256 is not recorded in the freeze'); process.exit(65); }
}
const SRC = ['common.mjs', 'generate.mjs', 'gate.mjs', 'models.mjs', 'codex.mjs', 'run.mjs', 'mlx_bridge.py'];
const srcHash = sha(SRC.map((f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n'));
createDir(out);
const runtime = String(model).startsWith('mlx:') ? { server: 'mlx-bridge', decoding: 'greedy, thinking off' } : String(model).startsWith('codex:') ? { server: 'codex-cli' } : String(model).startsWith('ollama:') ? { server: 'ollama', options: OLLAMA_OPTIONS } : isFake(model) ? { server: 'fake' } : { server: 'lmstudio', requestExtras: lmStudioThinking(model) };
writeNew(path.join(out, 'config.json'), JSON.stringify({ schema: 'p923-run-v1.1', model, runtime, maxTokens: 4096, datasetSha256: meta.sha256, split: meta.split, sourceSha256: srcHash, startedAt: new Date().toISOString(), freeze: arg('--freeze', null) }, null, 1) + '\n');
const W = (f) => fs.openSync(path.join(out, f), 'wx'); const fCalls = W('calls.jsonl'); const fDec = W('decisions.jsonl'); const fLog = W('run.log');
let prev = '0'.repeat(64); let seq = 0;
const logLine = (s) => { const l = `${new Date().toISOString()} ${s}`; fs.writeSync(fLog, l + '\n'); console.log(l); };
const items = limitPairs ? ds.filter((it) => it.pair <= limitPairs) : ds;
for (const [ii, item] of items.entries()) {
  setFakeItem(item);
  const order = COMBOS.map((_, i) => COMBOS[(i + ii) % COMBOS.length]);
  for (const { j, f, key } of order) {
    const messages = [{ role: 'system', content: SYSTEM }, { role: 'user', content: userPrompt(item, j, f) }];
    const res = await chat(model, messages, { tools: TOOLS, maxTokens: 4096 });
    const rec = { seq: ++seq, prev, itemId: item.id, j, f, request: { messages }, response: res };
    const c = JSON.parse(JSON.stringify(rec)); c.hash = sha(prev + canonical(c)); prev = c.hash; fs.writeSync(fCalls, JSON.stringify(c) + '\n');
    const d = res.ok ? parseDecision(res) : { decision: null, reason: null, via: 'none' };
    fs.writeSync(fDec, JSON.stringify({ itemId: item.id, family: item.family, holdout: item.holdout, j, f, combo: key, systemFailure: !res.ok, error: res.ok ? undefined : res.error, finish: res.finish ?? null, decision: d.decision, via: d.via, reason: d.reason ? String(d.reason).slice(0, 600) : null, tokens: (res.usage?.prompt_tokens ?? 0) + (res.usage?.completion_tokens ?? 0), ms: res.ms ?? 0 }) + '\n');
  }
  if ((ii + 1) % 8 === 0 || ii + 1 === items.length) logLine(`items ${ii + 1}/${items.length}`);
}
writeNew(path.join(out, 'manifest.json'), JSON.stringify({ finishedAt: new Date().toISOString(), calls: seq, lastHash: prev, items: items.length, decisions: items.length * COMBOS.length }, null, 1) + '\n');
logLine('done'); closeMlx();
