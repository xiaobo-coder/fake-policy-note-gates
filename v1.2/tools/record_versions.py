#!/usr/bin/env python3
"""923 v1.2 drift check: record runtime and model provenance for one gate (ADDENDUM-v1.2 §2b drift check).
  python3 -I tools/record_versions.py --model KEY --v11-run ../v1.1/results/test-...-001 --out results/versions-NAME.json
Records the server version (Ollama API / `lms version` / MLX package in the bridge venv), the model manifest/file digest
and mtime, and whether the model file is older than the v1.1 test run's start (= unchanged since v1.1). v1.1 recorded only
the Ollama version (0.40.16, freeze-v1.1/FREEZE.txt); other fields have no v1.1 counterpart and are reported as such."""
import argparse, datetime as D, glob, hashlib, json, os, subprocess, sys, urllib.request
from pathlib import Path
HOME = Path.home()
ap = argparse.ArgumentParser(); ap.add_argument('--model', required=True); ap.add_argument('--v11-run', required=True); ap.add_argument('--out', required=True); a = ap.parse_args()
if os.path.exists(a.out): sys.exit('exists (create-only)')
v11 = json.load(open(os.path.join(a.v11_run, 'config.json'))); v11_start = D.datetime.fromisoformat(v11['startedAt'].replace('Z', '+00:00')).timestamp()
rec = {'model': a.model, 'v11Run': a.v11_run, 'v11Model': v11['model'], 'v11StartedAt': v11['startedAt'], 'v11OllamaVersion': '0.40.16', 'recordedAt': D.datetime.now().isoformat()}
def fileinfo(p):
    p = Path(p); h = hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() and p.stat().st_size < 10_000_000 else None
    return {'path': str(p), 'mtime': D.datetime.fromtimestamp(p.stat().st_mtime).isoformat(), 'sha256': h, 'olderThanV11Start': p.stat().st_mtime < v11_start}
try:
    if a.model.startswith('ollama:'):
        rec['server'] = 'ollama'; rec['serverVersion'] = json.load(urllib.request.urlopen('http://127.0.0.1:11434/api/version', timeout=10))['version']
        name, tag = a.model[len('ollama:'):].split('+')[0].split(':'); rec['modelFile'] = fileinfo(HOME / '.ollama/models/manifests/registry.ollama.ai/library' / name / tag)
        rec['versionMatchesV11'] = rec['serverVersion'] == '0.40.16'
    elif a.model.startswith('mlx:'):
        rec['server'] = 'mlx-bridge'; py = HOME / 'Documents/venvs/p92x/bin/python'
        rec['serverVersion'] = subprocess.run([str(py), '-I', '-c', 'import importlib.metadata as m;print(m.version("mlx"), m.version("mlx-lm"))'], capture_output=True, text=True).stdout.strip()
        cfgs = sorted(glob.glob(a.model[len('mlx:'):] + '/*.safetensors')) or sorted(glob.glob(a.model[len('mlx:'):] + '/*'))
        rec['modelFile'] = fileinfo(cfgs[0]) if cfgs else None; rec['versionMatchesV11'] = None
    else:
        rec['server'] = 'lmstudio'; lms = HOME / '.lmstudio/bin/lms'
        import re; out = re.sub(r'\x1b\[[0-9;]*m', '', subprocess.run([str(lms), 'version'], capture_output=True, text=True).stdout)
        app = subprocess.run(['defaults', 'read', '/Applications/LM Studio.app/Contents/Info.plist', 'CFBundleShortVersionString'], capture_output=True, text=True).stdout.strip()
        rec['serverVersion'] = {'app': app, 'cli': next((l.strip() for l in out.splitlines() if 'commit' in l), None)}
        info = [m for m in json.loads(subprocess.run([str(lms), 'ls', '--json'], capture_output=True, text=True).stdout or '[]') if m.get('modelKey') == a.model]
        rec['lmsModel'] = info[0] if info else None
        mp = (info[0].get('path') if info else None) or a.model
        cands = [HOME / '.lmstudio/models' / mp, HOME / '.lmstudio/hub/models' / mp]
        files = [str(c) for c in cands if c.exists()]
        rec['modelFile'] = fileinfo(files[0]) if files else None; rec['versionMatchesV11'] = None
except Exception as e:
    rec['error'] = f'{type(e).__name__}: {e}'[:300]
open(a.out, 'x').write(json.dumps(rec, indent=1) + '\n'); print(json.dumps({k: rec.get(k) for k in ('model', 'server', 'serverVersion', 'versionMatchesV11')}))
