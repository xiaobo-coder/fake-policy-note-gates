// node --test tests/test.mjs   (no model calls)
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildDataset, FAMILIES, HOLDOUT, violated, holds } from '../src/generate.mjs';
import { userPrompt, parseDecision, COMBOS, TOOLS } from '../src/gate.mjs';
import { lmStudioThinking } from '../src/models.mjs';
import { canonical, sha } from '../src/common.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dev = buildDataset('dev', 12); const tst = buildDataset('test', 12);

test('16 + 4 families, deterministic, dev and test differ, holdout only in test', () => {
  assert.equal(FAMILIES.length, 16); assert.equal(HOLDOUT.length, 4);
  assert.equal(sha(canonical(buildDataset('dev', 4))), sha(canonical(buildDataset('dev', 4))));
  assert.notDeepEqual(dev[0].record, tst[0].record); assert.ok(!dev.some((x) => x.holdout)); assert.equal(new Set(tst.filter((x) => x.holdout).map((x) => x.family)).size, 4);
});
test('twins: one safe, one unsafe violating exactly the stored rule; J2 identical within pair; both rules exercised', () => {
  for (const ds of [dev, tst]) {
    const pairs = {}; for (const it of ds) (pairs[`${it.family}.${it.pair}`] ??= []).push(it);
    for (const [k, two] of Object.entries(pairs)) {
      assert.deepEqual(two.map((x) => x.kind).sort(), ['safe', 'unsafe'], k);
      const [s, u] = two[0].kind === 'safe' ? two : [two[1], two[0]];
      assert.deepEqual(violated(s.rules, s.record), []); assert.deepEqual(violated(u.rules, u.record), [u.violatedRule]);
      assert.equal(s.j2, u.j2, k);
    }
    for (const f of [...FAMILIES, ...HOLDOUT]) { const us = ds.filter((x) => x.family === f.id && x.kind === 'unsafe'); if (us.length) assert.deepEqual([...new Set(us.map((x) => x.rules[x.violatedRule].text))].sort(), f.rules.map((r) => r.text).sort(), f.id); }
  }
});
test('Python observer interpreter agrees with the JS interpreter (including perturbed records)', () => {
  const cases = [];
  for (const it of [...dev, ...tst]) {
    cases.push({ rules: it.rules, rec: it.record });
    for (const [k, v] of Object.entries(it.record)) cases.push({ rules: it.rules, rec: { ...it.record, [k]: typeof v === 'number' ? v + 7 : typeof v === 'boolean' ? !v : v === null ? 'X' : null } });
  }
  const js = cases.map((c) => violated(c.rules, c.rec));
  const code = 'import sys,json; sys.path.insert(0, sys.argv[1]); import observe as O\ncs=json.load(sys.stdin)\nprint(json.dumps([O.violations(c["rules"], c["rec"]) for c in cs]))';
  const r = spawnSync('/usr/bin/python3', ['-I', '-c', code, path.join(ROOT, 'observer')], { input: JSON.stringify(cases), encoding: 'utf8', maxBuffer: 64 << 20 });
  assert.deepEqual(JSON.parse(r.stdout), js);
});
test('prompts: J0 has no justification; J1/J2 present; framing differs; decision parsing', () => {
  const it = dev[0]; const p = Object.fromEntries(COMBOS.map((c) => [c.key, userPrompt(it, c.j, c.f)]));
  assert.ok(!/Justification/.test(p['J0-Fother'])); assert.ok(p['J1-Fother'].includes(it.j1)); assert.ok(p['J2-Fself'].includes(it.j2));
  assert.match(p['J0-Fself'], /You proposed/); assert.match(p['J0-Fother'], /Another agent/);
  assert.equal(parseDecision({ toolCalls: [{ name: 'decide', arguments: '{"decision":"reject","reason":"x"}' }] }).decision, 'reject');
  // v0.4 §7.2: explicit LM Studio thinking settings
  assert.deepEqual(lmStudioThinking('openai/gpt-oss-20b'), { reasoning_effort: 'low' }); assert.deepEqual(lmStudioThinking('qwen/qwen3.6-35b-a3b'), { chat_template_kwargs: { enable_thinking: false } }); assert.deepEqual(lmStudioThinking('other/model'), {});
  // v0.4 schema: strict and documented (lint R06)
  { const p = TOOLS[0].function.parameters; assert.equal(p.additionalProperties, false); assert.deepEqual(Object.keys(p.properties), ['reason', 'decision']); assert.ok(p.properties.reason.description && p.properties.decision.description); }
  assert.equal(parseDecision({ toolCalls: [], content: '```json\n{"decision":"approve","reason":"ok"}\n```' }).decision, 'approve');
  assert.equal(parseDecision({ toolCalls: [], content: 'I think yes' }).decision, null);
});
import { DATE_FIELDS, TODAY } from '../src/generate.mjs';
test('v0.3: visible dates encode the canonical durations; distractor rules never apply; J2 targets the pair rule', () => {
  const T0 = Date.parse(`${TODAY}T00:00:00Z`); const days = (d) => (Date.parse(`${d}T00:00:00Z`) - T0) / 86400000;
  for (const it of [...dev, ...tst]) {
    for (const [f, spec] of Object.entries(DATE_FIELDS)) {
      if (!(f in it.record)) continue; const v = it.record[f]; const d = days(it.recordVisible[spec.show]);
      if (f === 'days_since_last_change') assert.equal(-d, v);
      if (f === 'days_before_departure' || f === 'days_to_grant_end') assert.equal(d, v);
      if (f === 'years_since_closed') { const c = new Date(it.recordVisible[spec.show]); const y = 2026 - c.getUTCFullYear() - (c.getUTCMonth() > 9 || (c.getUTCMonth() === 9 && c.getUTCDate() > 15) ? 1 : 0); assert.equal(y, v, it.id); }
      if (f === 'months_since_purchase') assert.equal(Math.floor(-d / 30.44), v, it.id);
      if (f === 'months_remaining_in_min_term') assert.equal(d > 0, v > 0, it.id);
      assert.ok(!(f in it.recordVisible), `${it.id} leaks ${f}`);
    }
    assert.equal(it.rules.length, 4); assert.match(it.j2, new RegExp(`^Rule ${it.targetRule + 1} does not apply`));
    const own = it.rules.filter((r) => [...r.when, ...r.require].every((c) => c.f in it.record)); assert.ok(own.length >= 2, it.id);
  }
});
