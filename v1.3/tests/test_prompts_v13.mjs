// 923 v1.3: gate requests must equal v1.0/v1.1 requests except for the stated change (ADDENDUM-v1.3 §3).
//   node tests/test_prompts_v13.mjs   (exit 0 = all checks pass)
import fs from 'node:fs';
import * as V10 from '../../study-v1.0/src/gate.mjs';
import * as V11 from '../../v1.1/src/gate.mjs';
import * as V13 from '../src/gate.mjs';
import { MLX_FORMAT } from '../../v1.1/src/models.mjs';
const ds = JSON.parse(fs.readFileSync(new URL('../results/dataset-f11-002/dataset.json', import.meta.url), 'utf8'));
const add = fs.readFileSync(new URL('../ADDENDUM-v1.3.md', import.meta.url), 'utf8');
let n = 0; const bad = [];
const ok = (c, msg) => { n++; if (!c) bad.push(msg); };
ok(V13.SYSTEM === V11.SYSTEM, 'system prompt changed');
ok(JSON.stringify(V13.TOOLS) === JSON.stringify(V11.TOOLS), 'decide tool changed');
for (const s of [V13.R2, V13.R3, V13.SYS_SAN, V13.SYS_DET]) ok(add.includes(s), `prompt text not verbatim in ADDENDUM: ${s.slice(0, 40)}`);
// mlx: the decide format must be the v1.1 one
const [drop, fmt] = V13.MLX_FORMATS.decide; ok(V11.SYSTEM.replace(drop, '') + fmt === V11.SYSTEM.replace(' Use the decide tool exactly once.', '') + MLX_FORMAT, 'mlx decide format differs from v1.1');
for (const st of ['sanitize', 'classify']) ok((st === 'sanitize' ? V13.SYS_SAN : V13.SYS_DET).endsWith(V13.MLX_FORMATS[st][0]), `mlx ${st}: sentence to drop not at the end`);
for (const it of ds) {
  const v11 = (j) => V11.userPrompt(it, j, 'Fother');
  ok(V13.userPrompt(it, 'J2') === v11('J2'), `${it.id} J2 differs from v1.1`);
  ok(V13.userPrompt(it, 'R') === v11('R'), `${it.id} R differs from v1.1`);
  ok(V13.userPrompt(it, 'J1') === V10.userPrompt(it, 'J1', 'Fother'), `${it.id} J1 differs from v1.0`);
  ok(V13.userPrompt(it, 'R2') === v11('R').replace(it.reg, V13.R2) && V13.userPrompt(it, 'R3') === v11('R').replace(it.reg, V13.R3), `${it.id} R2/R3 differ from R beyond the registry text`);
  for (const [c, f, base] of [['J2S', 'j2', 'J2'], ['J2bS', 'j2b', 'J2b']]) {
    ok(V13.userPrompt(it, c, it[f]) === v11(base), `${it.id} ${c}: unchanged sanitizer output must give the ${base} prompt`);
    ok(V13.userPrompt(it, c, '') === v11('J0') && V13.userPrompt(it, c, '  ') === v11('J0'), `${it.id} ${c}: empty sanitizer output must give the J0 prompt`);
  }
  ok(V13.userPrompt(it, 'J1S', it.j1) === V10.userPrompt(it, 'J1', 'Fother'), `${it.id} J1S: unchanged text must give the J1 prompt`);
  ok(V13.stageUser(it.j2b) === `Justification from the proposing agent:\n${it.j2b}`, 'stage-1 message layout');
  // stage-1 inputs carry no record, policy or date
  ok(!V13.stageUser(it.j2).includes(JSON.stringify(it.recordVisible ?? it.record, null, 1)) && !V13.stageUser(it.j2).includes('Policy excerpt'), `${it.id}: stage-1 sees the record or policy`);
}
// twin texts identical for J2/J2b (so stage 1 cannot add compliance information)
const byPair = {}; for (const it of ds) (byPair[`${it.family}.${it.pair}`] ??= []).push(it);
for (const [k, two] of Object.entries(byPair)) ok(two.length === 2 && two[0].j2 === two[1].j2 && two[0].j2b === two[1].j2b, `${k}: twin J2/J2b texts differ`);
// positive control
ok(V13.userPrompt(ds[0], 'R2') !== V13.userPrompt(ds[0], 'R'), 'control: R2 equals R (test cannot detect differences)');
let threw = false; try { V13.userPrompt(ds[0], 'J2S'); } catch { threw = true; } ok(threw, 'S cell without sanitized text must throw');
console.log(JSON.stringify({ checks: n, failed: bad.length, first: bad.slice(0, 5) }));
process.exit(bad.length ? 1 : 0);
