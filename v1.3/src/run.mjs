// Paper 923 v1.3 runner (create-only; ADDENDUM-v1.3 §3). Every model call (gate, sanitizer, detector) is appended to one
// SHA-256 hash chain (calls.jsonl). One row per (item, cell) in decisions.jsonl; S cells record the stage-1 text that the
// gate saw; D cells record the detector flag and make no gate call. The runner never computes ground truth.
//   node src/run.mjs --dataset DIR --model KEY --out results/NAME [--limit-pairs N] [--cells J2,R,...] [--freeze freeze-v1.3]
import fs from 'node:fs';
import path from 'node:path';
import { sha, canonical, createDir, writeNew } from './common.mjs';
import { ALL_CELLS, SANITIZED, DETECTED, SYSTEM, TOOLS, SYS_SAN, TOOLS_SAN, SYS_DET, TOOLS_DET, stageUser, userPrompt, parseDecision, parseSanitize, parseClassify } from './gate.mjs';
import { chat, isFake, setFakeItem, OLLAMA_OPTIONS, closeMlx, lmStudioThinking } from './models.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const CELLS_ARG = arg('--cells', null); const CELLS = CELLS_ARG ? CELLS_ARG.split(',') : ALL_CELLS;
if (CELLS.some((c) => !ALL_CELLS.includes(c)) || new Set(CELLS).size !== CELLS.length) { console.error('unknown or repeated cell in --cells'); process.exit(64); }
const datasetDir = arg('--dataset'); const model = arg('--model'); const out = arg('--out'); const limitPairs = +arg('--limit-pairs', 0);
if (!datasetDir || !model || !out) { console.error('usage: node src/run.mjs --dataset DIR --model KEY --out DIR'); process.exit(64); }
if (isFake(model) !== path.basename(out).startsWith('fake-')) { console.error('fake models must (and only fake models may) write to results/fake-*'); process.exit(64); }
const ds = JSON.parse(fs.readFileSync(path.join(datasetDir, 'dataset.json'), 'utf8'));
const meta = JSON.parse(fs.readFileSync(path.join(datasetDir, 'META.json'), 'utf8'));
if (meta.sha256 !== sha(canonical(ds))) { console.error('dataset hash mismatch'); process.exit(1); }
if (meta.split === 'f11') {   // the confirmatory split: refuse unless the v1.3 freeze verifies and lists the dataset
  const fz = arg('--freeze', null); const root = new URL('../', import.meta.url).pathname;
  if (fz !== 'freeze-v1.3') { console.error('test split requires --freeze freeze-v1.3'); process.exit(65); }
  const sums = path.join(root, fz, 'SHA256SUMS');
  if (!fs.existsSync(sums)) { console.error(`no ${sums}: v1.3 is not frozen`); process.exit(65); }
  try { (await import('node:child_process')).execFileSync('shasum', ['-a', '256', '-c', '--quiet', sums], { cwd: root, stdio: 'pipe' }); }
  catch (e) { console.error('freeze check FAILED: ' + String(e.stdout ?? e.message).slice(0, 300)); process.exit(65); }
  if (!fs.readFileSync(sums, 'utf8').includes(meta.sha256)) { console.error('dataset sha256 is not recorded in the freeze'); process.exit(65); }
}
const SRC = ['common.mjs', 'generate.mjs', 'gate.mjs', 'models.mjs', 'codex.mjs', 'run.mjs', 'mlx_bridge.py'];
const srcHash = sha(SRC.map((f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n'));
createDir(out);
const runtime = String(model).startsWith('mlx:') ? { server: 'mlx-bridge', decoding: 'greedy, thinking off' } : String(model).startsWith('ollama:') ? { server: 'ollama', options: OLLAMA_OPTIONS } : isFake(model) ? { server: 'fake' } : { server: 'lmstudio', requestExtras: lmStudioThinking(model) };
writeNew(path.join(out, 'config.json'), JSON.stringify({ schema: 'p923-run-v1.3', model, cells: CELLS, runtime, maxTokens: 4096, datasetSha256: meta.sha256, split: meta.split, sourceSha256: srcHash, startedAt: new Date().toISOString(), freeze: arg('--freeze', null) }, null, 1) + '\n');
const W = (f) => fs.openSync(path.join(out, f), 'wx'); const fCalls = W('calls.jsonl'); const fDec = W('decisions.jsonl'); const fLog = W('run.log');
let prev = '0'.repeat(64); let seq = 0;
const logLine = (s) => { const l = `${new Date().toISOString()} ${s}`; fs.writeSync(fLog, l + '\n'); console.log(l); };
async function call(item, cell, stage, messages, tools) {
  const res = await chat(model, messages, { tools, maxTokens: 4096, stage });
  const rec = { seq: ++seq, prev, itemId: item.id, j: cell, stage, request: { messages }, response: res };
  const c = JSON.parse(JSON.stringify(rec)); c.hash = sha(prev + canonical(c)); prev = c.hash; fs.writeSync(fCalls, JSON.stringify(c) + '\n');
  return { res, hash: c.hash };
}
const row = (o) => fs.writeSync(fDec, JSON.stringify(o) + '\n');
const items = limitPairs ? ds.filter((it) => it.pair <= limitPairs) : ds;
for (const [ii, item] of items.entries()) {
  setFakeItem(item);
  const order = CELLS.map((_, i) => CELLS[(i + ii) % CELLS.length]);
  for (const cell of order) {
    const base = { itemId: item.id, family: item.family, holdout: item.holdout, j: cell };
    if (DETECTED[cell]) {
      const { res, hash } = await call(item, cell, 'classify', [{ role: 'system', content: SYS_DET }, { role: 'user', content: stageUser(item[DETECTED[cell]]) }], TOOLS_DET);
      const d = res.ok ? parseClassify(res) : { flag: null, reason: null, via: 'none' };
      row({ ...base, stage: 'classify', systemFailure: !res.ok, error: res.ok ? undefined : res.error, finish: res.finish ?? null, flag: d.flag, via: d.via, reason: d.reason ? String(d.reason).slice(0, 600) : null, callHash: hash, ms: res.ms ?? 0 });
      continue;
    }
    let sanitized = null; const s1 = {};
    if (SANITIZED[cell]) {
      const { res, hash } = await call(item, cell, 'sanitize', [{ role: 'system', content: SYS_SAN }, { role: 'user', content: stageUser(item[SANITIZED[cell]]) }], TOOLS_SAN);
      const d = res.ok ? parseSanitize(res) : { text: null, reason: null, via: 'none' };
      Object.assign(s1, { sanitizeOk: res.ok && d.text !== null, sanitizeVia: d.via, sanitizeFinish: res.finish ?? null, sanitizedText: d.text, sanitizeHash: hash, sanitizeMs: res.ms ?? 0 });
      if (!s1.sanitizeOk) { row({ ...base, stage: 'gate', ...s1, systemFailure: true, error: res.ok ? 'sanitizer unparsed' : res.error, finish: null, decision: null, via: 'none', reason: null, ms: 0 }); continue; }
      sanitized = d.text;
    }
    const { res, hash } = await call(item, cell, 'decide', [{ role: 'system', content: SYSTEM }, { role: 'user', content: userPrompt(item, cell, sanitized) }], TOOLS);
    const d = res.ok ? parseDecision(res) : { decision: null, reason: null, via: 'none' };
    row({ ...base, stage: 'gate', ...s1, systemFailure: !res.ok, error: res.ok ? undefined : res.error, finish: res.finish ?? null, decision: d.decision, via: d.via, reason: d.reason ? String(d.reason).slice(0, 600) : null, callHash: hash, tokens: (res.usage?.prompt_tokens ?? 0) + (res.usage?.completion_tokens ?? 0), ms: res.ms ?? 0 });
  }
  if ((ii + 1) % 8 === 0 || ii + 1 === items.length) logLine(`items ${ii + 1}/${items.length}`);
}
writeNew(path.join(out, 'manifest.json'), JSON.stringify({ finishedAt: new Date().toISOString(), calls: seq, lastHash: prev, items: items.length, rows: items.length * CELLS.length }, null, 1) + '\n');
logLine('done'); closeMlx();
