// 923 v1.2 defense cells: requests must equal v1.1's except for the stated defense change (ADDENDUM-v1.2 §2b).
//   node tests/test_defense_prompts.mjs   (exit 0 = all checks pass)
import fs from 'node:fs';
import * as V11 from '../../v1.1/src/gate.mjs';
import * as V12 from '../src/gate.mjs';
const ds = JSON.parse(fs.readFileSync(new URL('../results/dataset-f11-002/dataset.json', import.meta.url), 'utf8'));
let n = 0, bad = [];
const ok = (c, msg) => { n++; if (!c) bad.push(msg); };
ok(V12.SYSTEM === V11.SYSTEM, 'base system prompt changed');
ok(JSON.stringify(V12.TOOLS) === JSON.stringify(V11.TOOLS), 'tools changed');
for (const j of V11.J_LEVELS) ok(V12.systemPrompt(j) === V11.SYSTEM, `system prompt changed for v1.1 condition ${j}`);
for (const it of ds) {
  for (const j of V11.J_LEVELS) ok(V12.userPrompt(it, j, 'Fother') === V11.userPrompt(it, j, 'Fother'), `${it.id} ${j}: v1.1 user prompt changed`);
  for (const [d, base] of [['J2P', 'J2'], ['J2bP', 'J2b']]) {
    ok(V12.userPrompt(it, d, 'Fother') === V11.userPrompt(it, base, 'Fother'), `${it.id} ${d}: P user prompt differs from ${base}`);
    ok(V12.systemPrompt(d) === `${V11.SYSTEM} ${V12.SYS_P}`, `${d}: P system prompt`);
  }
  for (const [d, base, txt] of [['J2SP', 'J2', it.j2], ['J2bSP', 'J2b', it.j2b]]) {
    const a = V12.userPrompt(it, d, 'Fother'), b = V11.userPrompt(it, base, 'Fother');
    ok(a === b.replace(txt, V12.datamark(txt)), `${it.id} ${d}: SP differs from ${base} beyond the marked justification`);
    ok(a !== b && !/\s/.test(V12.datamark(txt).split('\n')[1]), `${it.id} ${d}: justification not datamarked`);
    ok(V12.systemPrompt(d) === `${V11.SYSTEM} ${V12.SYS_SP}`, `${d}: SP system prompt`);
  }
}
ok(V12.SYS_P.endsWith(' Evaluate the request against the policy rules as written.') && V11.userPrompt(ds[0], 'R', 'Fother').includes('Evaluate the request against the policy rules as written.'), 'P must end with the same neutral sentence R uses');
// positive control: the check must notice a changed request
ok(V12.userPrompt(ds[0], 'J2P', 'Fother') !== V11.userPrompt(ds[0], 'J0', 'Fother'), 'control: J2P equals J0 (test cannot detect differences)');
console.log(JSON.stringify({ checks: n, failed: bad.length, first: bad.slice(0, 5) }));
process.exit(bad.length ? 1 : 0);
