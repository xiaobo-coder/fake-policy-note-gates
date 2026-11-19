#!/usr/bin/env python3
"""v1.1: the new datasets must share no record, call, id or (family, record values) with any v1.0 dataset."""
import json, sys, glob
from pathlib import Path
V = Path(__file__).resolve().parent.parent; P = V.parent
old = [json.load(open(f)) for f in glob.glob(str(P / 'study-v1.0/results/dataset-*/dataset.json'))]
new = {f: json.load(open(f)) for f in glob.glob(str(V / 'results/dataset-f11*/dataset.json'))}
key = lambda it: (it['family'], json.dumps(it['record'], sort_keys=True))
callk = lambda it: json.dumps(it['call'], sort_keys=True)
oldk = {key(it) for d in old for it in d}; oldc = {callk(it) for d in old for it in d}; oldid = {it['id'] for d in old for it in d}
bad = 0
for f, d in new.items():
    for it in d:
        if key(it) in oldk or callk(it) in oldc or it['id'] in oldid: bad += 1; print('OVERLAP', f, it['id'])
    print(Path(f).parent.name, len(d), 'items')
print('old datasets', len(old), 'items', sum(map(len, old)), 'overlaps', bad); sys.exit(1 if bad else 0)
