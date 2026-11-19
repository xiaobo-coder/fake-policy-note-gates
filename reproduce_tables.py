#!/usr/bin/env python3
"""Recompute every macro and table file the paper inputs from the shipped frozen outputs and compare with expected/.
Standard library only.
  python3 reproduce_tables.py      -> writes out/, prints MATCH/MISMATCH per file, exit 0 iff all match.
Macro files are compared by definition (\\newcommand name -> value); table/figure/example files by exact text, ignoring LaTeX comment lines (they record source-file hashes; see SANITIZED-HASHES.md).
Model runs and observers are NOT repeated; the rendering tools read the frozen observer outputs and test runs in
study-v1.0/ and v1.1/ ... v1.4/. To re-run the observers themselves, see README."""
import json, os, re, shutil, subprocess, sys
ROOT = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(ROOT, 'out'); PY = sys.executable
W = os.path.join(ROOT, 'workshop-aaai27-laut')
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
def run(args, cwd=W): subprocess.run([PY, '-I', '-B'] + args, check=True, cwd=cwd, stdout=subprocess.DEVNULL)
# 1. first study (v1.0): all \R macros, worked example (the script overwrites paper-draft-001/generated/)
gen = os.path.join(ROOT, 'paper-draft-001', 'generated'); shutil.rmtree(gen, ignore_errors=True); os.makedirs(gen)
run(['scripts/make_generated.py'], cwd=os.path.join(ROOT, 'paper-draft-001'))
os.makedirs(os.path.join(OUT, 'generated'))
for f in ('macros.tex', 'example-prompt.tex', 'example-justifications.tex'): shutil.copy(os.path.join(gen, f), os.path.join(OUT, 'generated', f))
# 2. v1.1 macros and table (\V)
run(['tools/make_v11_macros.py', '../v1.1/results/observer-test-001/observer.json', '../out/generated-v11'])
# 3. v1.1 extra macros (range of J2b and J0 false approval over the five gates; items per cell), from the same observer output
src = os.path.join(ROOT, 'v1.1', 'results', 'observer-test-001', 'observer.json'); R = json.load(open(src, encoding='utf-8'))
C = [r['analysis']['cells'] for r in R['runs']]; ds = json.load(open(os.path.join(ROOT, 'v1.1', 'results', 'dataset-f11-002', 'dataset.json'), encoding='utf-8'))
open(os.path.join(OUT, 'generated-v11', 'extra.tex'), 'w').write('\n'.join([
    '\\newcommand{\\VJtwobFAMin}{%.3f}' % min(c['J2b']['falseApproval'] for c in C),
    '\\newcommand{\\VJtwobFAMax}{%.3f}' % max(c['J2b']['falseApproval'] for c in C),
    '\\newcommand{\\VJzeroFAMax}{%.3f}' % max(c['J0']['falseApproval'] for c in C),
    '\\newcommand{\\VItems}{%d}' % len(ds)]) + '\n')
# 4. post hoc J2b test (\P); verifies the v1.1 hash chains
run(['posthoc/posthoc_j2b.py', '../v1.1/results', '../out/posthoc/out-j2b-001'])
# 5. v1.2 thinking-on follow-up (\W), gate-side defenses (\X); v1.3 registry (\Y); v1.4 hosted gates (\Z); headline figure
run(['tools/make_v12_macros.py', '../v1.2/results/observer-test-001/observer.json', '../out/generated-v12'])
run(['tools/make_v12d_macros.py', '../v1.2/results', '../out/generated-v12d'])
run(['tools/make_v13_macros.py', '../v1.3/results', 'test', '../out/generated-v13'])
run(['tools/make_v14_macros.py', '../v1.4/results/observer-test-v14-001/observer.json', '../out/generated-v14'])
run(['tools/make_fig_directions.py', '../v1.1/results/observer-test-001/observer.json', '../out/generated-fig', '../v1.2/results'])
# Documented exception: \RFreezeShaShort (not used in the paper text) is the sha256 of the ORIGINAL freeze-v1.0/SHA256SUMS,
# whose paths name the non-anonymous study folder; the shipped manifest differs only by the rename to study-v1.0/.
# The original hash is recorded in docs/FREEZE-HASHES.md; we check the expected macro against that record instead.
fh = open(os.path.join(ROOT, 'docs', 'FREEZE-HASHES.md'), encoding='utf-8').read()
orig = re.search(r'sha256 of the original `freeze-v1.0/SHA256SUMS`: `([0-9a-f]{64})`', fh).group(1)
EXC = {'RFreezeShaShort': orig[:12]}
# compare
def macros(p): return dict(re.findall(r'\\newcommand\{\\(\w+)\}\{(.*)\}\s*$', open(p, encoding='utf-8').read(), re.M))
ok = True; E = os.path.join(ROOT, 'expected')
for d, _, fs in sorted(os.walk(E)):
    for fn in sorted(fs):
        rel = os.path.relpath(os.path.join(d, fn), E); e_p, o_p = os.path.join(E, rel), os.path.join(OUT, rel)
        if not os.path.exists(o_p): print('MISMATCH', rel, '(not produced)'); ok = False; continue
        e = macros(e_p)
        if e:
            o = macros(o_p); note = ''
            for k, v in EXC.items():
                if k in e and o.get(k) != e[k] and e[k] == v: o[k] = e[k]; note = ' [%s checked against docs/FREEZE-HASHES.md, see README]' % k
            bad = [k for k in e if o.get(k) != e[k]] + [k for k in o if k not in e]
            print(('MATCH   ' if not bad else 'MISMATCH'), rel, '(%d macros)' % len(e) + note,
                  '' if not bad else 'e.g. %s: expected %s got %s' % (bad[0], e.get(bad[0]), o.get(bad[0])))
        else:
            body = lambda q: [l for l in open(q, encoding='utf-8').read().splitlines() if not l.lstrip().startswith('%')]
            bad = body(e_p) != body(o_p)
            print(('MATCH   ' if not bad else 'MISMATCH'), rel, '(exact text; %-comment lines with source hashes ignored, see SANITIZED-HASHES.md)')
        ok &= not bad
print('RESULT:', 'ALL MATCH' if ok else 'MISMATCH'); sys.exit(0 if ok else 1)
