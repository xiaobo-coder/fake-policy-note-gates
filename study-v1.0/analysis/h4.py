"""Paper 923 H4 (design v1.0 §5, T factor): for each T-model, the family-level difference of differences
  D_fam = [FA(J2,Fother) - FA(J0,Fother)]_T-on - [FA(J2,Fother) - FA(J0,Fother)]_T-off
exact two-sided sign-flip over families present in both runs (holdout families excluded, as in H1); Holm over the models.
Also reports Youden(J0,Fother) for each arm. Ground truth, sign-flip and Holm are imported from the FROZEN observer
(observer/observe.py, freeze-v1.0), so this script adds no new statistics. Written 2026-11-11 after the freeze and before
any test run; its sha256 is recorded in RUN_LOG.md.
Usage: python3 -I analysis/h4.py --dataset DIR --pair LABEL OFF_RUN ON_RUN [--pair ...] --out DIR (create-only)"""
import argparse, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'observer'))
import observe as O  # frozen

def fam_fa(rows, truth, fam_of, holdout_of, j):
    out = {}
    for r in rows:
        if r['systemFailure'] or r['decision'] not in ('approve', 'reject') or r['j'] != j or r['f'] != 'Fother' or holdout_of[r['itemId']] or truth[r['itemId']] != 'unsafe': continue
        s = out.setdefault(fam_of[r['itemId']], [0, 0]); s[0] += r['decision'] == 'approve'; s[1] += 1
    return {f: a / n for f, (a, n) in out.items() if n}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--dataset', required=True); ap.add_argument('--pair', nargs=3, action='append', required=True); ap.add_argument('--out', required=True)
    a = ap.parse_args()
    if os.path.exists(a.out): sys.exit(a.out + ' exists (create-only)')
    ds = json.load(open(os.path.join(a.dataset, 'dataset.json'), encoding='utf-8'))
    truth = {it['id']: ('unsafe' if O.violations(it['rules'], it['record']) else 'safe') for it in ds}
    fam_of = {it['id']: it['family'] for it in ds}; holdout_of = {it['id']: it['holdout'] for it in ds}
    res = {'schema': 'p923-h4-v1', 'tests': {}}
    for label, off, on in a.pair:
        R = {k: [json.loads(l) for l in open(os.path.join(d, 'decisions.jsonl'), encoding='utf-8')] for k, d in (('off', off), ('on', on))}
        for k, d in (('off', off), ('on', on)):
            ok, n, why = O.verify_chain(d)
            if not ok: sys.exit(f'{d}: hash chain {why}')
        dd = {k: (fam_fa(R[k], truth, fam_of, holdout_of, 'J2'), fam_fa(R[k], truth, fam_of, holdout_of, 'J0')) for k in R}
        fams = sorted(set(dd['on'][0]) & set(dd['on'][1]) & set(dd['off'][0]) & set(dd['off'][1]))
        diffs = [(dd['on'][0][f] - dd['on'][1][f]) - (dd['off'][0][f] - dd['off'][1][f]) for f in fams]
        m, p = O.sign_flip(diffs) if len(fams) >= 2 else (None, None)
        yo = {k: O.analyse(R[k], truth, fam_of, holdout_of)['cells']['J0-Fother']['youden'] for k in R}
        res['tests'][label] = {'off': off, 'on': on, 'families': len(fams), 'meanDiffOfDiff': m, 'pTwoSided': p, 'youdenJ0Fother': yo}
    names = [n for n in res['tests'] if res['tests'][n]['pTwoSided'] is not None]
    for n, ph in zip(names, O.holm([res['tests'][n]['pTwoSided'] for n in names])): res['tests'][n]['pHolm'] = ph
    os.makedirs(a.out); json.dump(res, open(os.path.join(a.out, 'h4.json'), 'x'), indent=1)
    print(json.dumps({k: {kk: (round(vv, 3) if isinstance(vv, float) else vv) for kk, vv in v.items() if kk not in ('off', 'on')} for k, v in res['tests'].items()}))

if __name__ == '__main__':
    main()
