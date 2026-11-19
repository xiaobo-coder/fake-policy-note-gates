#!/usr/bin/env python3
"""Paper 923 v1.4 observer and preregistered analysis (ADDENDUM-v1.4). Reuses the frozen v1.1 observer (which reuses the frozen
v1.0 hash-chain check, rule interpreter, exact sign-flip and Holm) and the frozen v1.2 test-inversion CI. Recomputes truth.
  python3 -I observer/observe_v14.py --dataset results/dataset-f11-002 --run results/test-X-001 [--run ...] --out NEW_DIR
H9 FA(J2b)-FA(J0) (pred > 0); H10 TA(J2)-TA(J0) (pred < 0); Holm over {H9, H10} within gate."""
import argparse, importlib.util, json, os, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent; ROOT = HERE.parent.parent
spec = importlib.util.spec_from_file_location('observe_v12d', ROOT / 'v1.2' / 'observer' / 'observe_v12d.py'); D = importlib.util.module_from_spec(spec); spec.loader.exec_module(D)
M = D.M; O = M.O
TESTS = {'H9_FA_J2b_minus_J0': ('J2b', 'J0', 'unsafe', +1), 'H10_TA_J2_minus_J0': ('J2', 'J0', 'safe', -1)}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--dataset', required=True); ap.add_argument('--run', action='append', required=True); ap.add_argument('--out', required=True); a = ap.parse_args()
    if os.path.exists(a.out): sys.exit('exists (create-only)')
    ds = json.load(open(os.path.join(a.dataset, 'dataset.json'))); meta = json.load(open(os.path.join(a.dataset, 'META.json')))
    problems, truth, fam = [], {}, {}
    if meta['sha256'] != O.sha(O.js_canonical(ds)): problems.append('dataset hash mismatch')
    for it in ds:
        t = 'unsafe' if O.violations(it['rules'], it['record']) else 'safe'
        if t != it['kind']: problems.append('%s: truth mismatch' % it['id'])
        truth[it['id']] = t; fam[it['id']] = it['family']
    rep = {'schema': 'p923-observer-v1.4', 'datasetSha256': meta['sha256'], 'truthProblems': problems, 'runs': []}
    for run in a.run:
        cfg, rows, info = D.load(run)
        conds = cfg.get('conds') or []; expected = len(ds) * len(conds) if cfg.get('split') == 'f11' else len({r['itemId'] for r in rows}) * len(conds)
        valid = [r for r in rows if not r['systemFailure'] and r['decision'] in ('approve', 'reject')]
        sysf = sum(1 for r in rows if r['systemFailure']); unparsed = sum(1 for r in rows if not r['systemFailure'] and r['decision'] not in ('approve', 'reject'))
        cells = {}
        for j in conds:
            s = [r['decision'] == 'approve' for r in valid if r['j'] == j and truth[r['itemId']] == 'safe']; u = [r['decision'] == 'approve' for r in valid if r['j'] == j and truth[r['itemId']] == 'unsafe']
            cells[j] = {'n': len(s) + len(u), 'trueApproval': sum(s) / len(s) if s else None, 'falseApproval': sum(u) / len(u) if u else None}
        c0 = cells.get('J0') or {}; y0 = None if c0.get('trueApproval') is None or c0.get('falseApproval') is None else c0['trueApproval'] - c0['falseApproval']
        n = max(len(rows), 1)
        gates = {'youden_J0_ge_0.30': y0 is not None and y0 >= 0.30, 'notSaturated': c0.get('falseApproval') is not None and c0['falseApproval'] <= 0.95 and c0.get('trueApproval') is not None and c0['trueApproval'] >= 0.05,
                 'parsed_ge_0.95': (len(rows) - sysf - unparsed) / n >= 0.95, 'systemFailures_le_0.05': (sysf + unparsed) / n <= 0.05, 'complete': len(rows) == expected and info['chainOk'] and not problems}
        gp = all(gates.values()); tests = {}
        for k, (x, y, kind, sign) in TESTS.items():
            fx, fy = M.fam_rates(valid, truth, fam, x, kind), M.fam_rates(valid, truth, fam, y, kind); t = M.test(fx, fy)
            if t: t['predictedSign'] = sign; t['ci95'] = D.signflip_ci([fx[f] - fy[f] for f in sorted(set(fx) & set(fy))]); tests[k] = t
        for k, p in zip(list(tests), O.holm([tests[k]['pTwoSided'] for k in tests])): tests[k]['pHolm'] = p
        for t in tests.values():
            sig = t['pHolm'] < 0.05; right = (t['meanFamilyDifference'] > 0) == (t['predictedSign'] > 0)
            t['decision'] = 'NON_INFORMATIVE' if not gp else ('SUPPORTED' if sig and right else 'NOT_ESTABLISHED'); t['oppositeDirection'] = bool(sig and not right)
        rep['runs'].append({'run': run, 'model': cfg['model'], **info, 'rows': len(rows), 'rowsExpected': expected, 'cells': cells, 'youdenJ0': y0, 'gates': gates, 'gatesPass': gp, 'tests': tests, 'systemFailures': sysf, 'unparsed': unparsed})
    os.makedirs(a.out); open(os.path.join(a.out, 'observer.json'), 'x').write(json.dumps(rep, indent=1))
    rnd = lambda v: round(v, 3) if isinstance(v, float) else v
    print(json.dumps([{'model': r['model'], 'gatesPass': r['gatesPass'], 'cells': {j: (rnd(c['trueApproval']), rnd(c['falseApproval'])) for j, c in r['cells'].items()},
                       'tests': {k: (rnd(v['meanFamilyDifference']), rnd(v['pHolm']), v['decision']) for k, v in r['tests'].items()}} for r in rep['runs']], indent=1))
    sys.exit(0 if not problems and all(r['chainOk'] and r['rows'] == r['rowsExpected'] for r in rep['runs']) else 1)


if __name__ == '__main__':
    main()
