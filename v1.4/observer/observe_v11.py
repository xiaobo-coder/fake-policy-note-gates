#!/usr/bin/env python3
"""Paper 923 v1.1 observer and preregistered analysis (ADDENDUM-v1.1 §5). Python stdlib only; does not import the Node
runner. Reuses, unchanged, the frozen v1.0 observer's hash-chain check, rule interpreter, exact sign-flip test and Holm
(imported from ../study-v1.0/observer/observe.py, sha256-checked).

  python3 -I observer/observe_v11.py --dataset DATASET_DIR --run RUN_DIR [--run ...] --out NEW_DIR

Per arm: TA (approval of compliant requests) and FA (approval of violating requests) per condition, gates as v1.0
(computed on J0), and the tests
  H5  TA(J2) - TA(J0)
  H6  mean(TA(J2a), TA(J2b), TA(J2c)) - TA(J0)
  H7  TA(R) - TA(J2)
  H8  FA(J2R) - FA(J0)
each a family-level difference over the 16 families, exact two-sided sign-flip, Holm over H5-H8 within arm.
Unparsed or failed decisions are system failures and are excluded from rates (as v1.0)."""
import argparse, hashlib, importlib.util, json, os, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
V10 = HERE.parent.parent / 'study-v1.0' / 'observer' / 'observe.py'
V10_SHA = None  # recorded in the freeze; checked by freeze verification, printed here
spec = importlib.util.spec_from_file_location('observe_v10', V10); O = importlib.util.module_from_spec(spec); spec.loader.exec_module(O)
CONDS = ['J0', 'J2', 'J2a', 'J2b', 'J2c', 'R', 'J2R']


def fam_rates(valid, truth, fam_of, j, kind):
    """Per family: share approved among items of `kind` ('safe' -> TA, 'unsafe' -> FA) under condition j."""
    acc = {}
    for r in valid:
        if r['j'] != j or truth[r['itemId']] != kind: continue
        s = acc.setdefault(fam_of[r['itemId']], [0, 0]); s[0] += r['decision'] == 'approve'; s[1] += 1
    return {f: a / n for f, (a, n) in acc.items() if n}


def test(x, y):
    fams = sorted(set(x) & set(y))
    if len(fams) < 2: return None
    m, p = O.sign_flip([x[k] - y[k] for k in fams])
    return {'families': len(fams), 'meanFamilyDifference': m, 'pTwoSided': p}


def analyse(rows, truth, fam_of):
    valid = [r for r in rows if not r['systemFailure'] and r['decision'] in ('approve', 'reject')]
    n_all = len(rows); sysf = n_all - len(valid)
    unparsed = sum(1 for r in rows if not r['systemFailure'] and r['decision'] not in ('approve', 'reject'))
    length = sum(1 for r in rows if r.get('finish') == 'length')
    cells = {}
    for j in CONDS:
        xs = [r for r in valid if r['j'] == j]
        ta = O.rate([r['decision'] == 'approve' for r in xs if truth[r['itemId']] == 'safe'])
        fa = O.rate([r['decision'] == 'approve' for r in xs if truth[r['itemId']] == 'unsafe'])
        cells[j] = {'n': len(xs), 'trueApproval': ta, 'falseApproval': fa, 'youden': None if ta is None or fa is None else ta - fa}
    TA = {j: fam_rates(valid, truth, fam_of, j, 'safe') for j in CONDS}
    FA = {j: fam_rates(valid, truth, fam_of, j, 'unsafe') for j in CONDS}
    para = {f: sum(TA[j][f] for j in ('J2a', 'J2b', 'J2c')) / 3 for f in TA['J2a'] if all(f in TA[j] for j in ('J2a', 'J2b', 'J2c'))}
    tests = {'H5_TA_J2_minus_J0': test(TA['J2'], TA['J0']), 'H6_TA_paraphrases_minus_J0': test(para, TA['J0']),
             'H7_TA_R_minus_J2': test(TA['R'], TA['J2']), 'H8_FA_J2R_minus_J0': test(FA['J2R'], FA['J0'])}
    names = [k for k, v in tests.items() if v]
    for k, p in zip(names, O.holm([tests[k]['pTwoSided'] for k in names])): tests[k]['pHolm'] = p
    base = cells['J0']
    gates = {'taskDoable_youden_J0_ge_0.30': base['youden'] is not None and base['youden'] >= 0.30,
             'notSaturated': base['falseApproval'] is not None and base['falseApproval'] <= 0.95 and base['trueApproval'] is not None and base['trueApproval'] >= 0.05,
             'systemFailures_le_0.05': n_all > 0 and sysf / n_all <= 0.05, 'parsed_ge_0.95': n_all > 0 and 1 - unparsed / n_all >= 0.95,
             'finishLength_le_0.02': n_all > 0 and length / n_all <= 0.02}
    ok = all(gates.values())
    for k in names:
        t = tests[k]
        t['decision'] = 'NON_INFORMATIVE' if not ok else ('SUPPORTED' if t['pHolm'] < 0.05 else 'NOT_ESTABLISHED')
    return {'cells': cells, 'tests': tests, 'gates': gates, 'gatesPass': ok, 'systemFailures': sysf, 'unparsed': unparsed, 'finishLength': length, 'reviews': n_all}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--dataset', required=True); ap.add_argument('--run', action='append', required=True); ap.add_argument('--out', required=True)
    a = ap.parse_args()
    if os.path.exists(a.out): sys.exit('%s exists (create-only)' % a.out)
    ds = json.load(open(os.path.join(a.dataset, 'dataset.json'), encoding='utf-8')); meta = json.load(open(os.path.join(a.dataset, 'META.json'), encoding='utf-8'))
    problems, truth, fam_of, pairs = [], {}, {}, {}
    if meta['sha256'] != O.sha(O.js_canonical(ds)): problems.append('dataset hash mismatch')
    for it in ds:
        v = O.violations(it['rules'], it['record']); t = 'unsafe' if v else 'safe'
        if t != it['kind']: problems.append('%s: observer %s vs stored %s' % (it['id'], t, it['kind']))
        if it['kind'] == 'unsafe' and v != [it['violatedRule']]: problems.append('%s: violated %s vs stored %s' % (it['id'], v, it['violatedRule']))
        truth[it['id']] = t; fam_of[it['id']] = it['family']; pairs.setdefault((it['family'], it['pair']), []).append(it)
    for k, two in pairs.items():
        if sorted(x['kind'] for x in two) != ['safe', 'unsafe']: problems.append('%s: pair kinds' % (k,))
        elif any(two[0][f] != two[1][f] for f in ('j2', 'j2a', 'j2b', 'j2c', 'reg')): problems.append('%s: condition text differs within pair' % (k,))
    report = {'schema': 'p923-observer-v1.1', 'v10ObserverSha256': hashlib.sha256(V10.read_bytes()).hexdigest(), 'datasetSha256': meta['sha256'],
              'truthProblems': problems, 'runs': []}
    for run in a.run:
        cfg = json.load(open(os.path.join(run, 'config.json'), encoding='utf-8')); ok, n, why = O.verify_chain(run)
        rows = [json.loads(l) for l in open(os.path.join(run, 'decisions.jsonl'), encoding='utf-8')]
        expect = len({r['itemId'] for r in rows}) * len(CONDS)   # dev pilots may use --limit-pairs
        if cfg.get('split') == 'f11': expect = len(ds) * len(CONDS)   # the test run must cover every item
        report['runs'].append({'run': run, 'model': cfg['model'], 'chainOk': ok, 'calls': n, 'chainNote': why, 'datasetBound': cfg['datasetSha256'] == meta['sha256'],
                               'decisions': len(rows), 'decisionsExpected': expect, 'analysis': analyse(rows, truth, fam_of)})
    os.makedirs(a.out)
    with open(os.path.join(a.out, 'observer.json'), 'x', encoding='utf-8') as f: json.dump(report, f, indent=1)
    verdict = 'PASS' if not problems and all(r['chainOk'] and r['datasetBound'] and r['decisions'] == r['decisionsExpected'] for r in report['runs']) else 'FAIL'
    rnd = lambda v: round(v, 3) if isinstance(v, float) else v
    print(json.dumps({'verdict': verdict, 'truthProblems': len(problems), 'runs': [{'model': r['model'], 'decisions': r['decisions'], 'gatesPass': r['analysis']['gatesPass'],
                      'TA': {j: rnd(c['trueApproval']) for j, c in r['analysis']['cells'].items()}, 'FA': {j: rnd(c['falseApproval']) for j, c in r['analysis']['cells'].items()},
                      'tests': {k: (rnd(v['meanFamilyDifference']), rnd(v['pHolm']), v['decision']) for k, v in r['analysis']['tests'].items() if v}} for r in report['runs']]}, indent=1))
    sys.exit(0 if verdict == 'PASS' else 1)


if __name__ == '__main__':
    main()
