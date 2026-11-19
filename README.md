# A Fake Policy Note Opens the Gate: Justification Attacks on LLM Action Approval

Artifact for the paper of the same title (anonymous submission, AAAI-27 Workshop LAUT). An LLM gate approves or
rejects an agent's tool call. We attach input-agnostic text to the call (justifications, paraphrases, a fabricated
policy exception, a spoofed platform note) and measure true and false approval on twin items whose ground truth comes
from a deterministic policy checker. The artifact contains the synthetic test datasets, the generator, runner and
gate code of all five preregistered studies (v1.0 to v1.4), the hash-chained call logs and decisions of every test run,
the independent Python observers and their outputs, the English preregistration documents and addenda, the post hoc
analysis, and a script that recomputes every number, table and figure coordinate in the paper.

## Reproduce

```sh
python3 reproduce_tables.py
```

Standard library only (Python >= 3.9), about one minute. It writes `out/` and prints `MATCH` or `MISMATCH` for each
file in `expected/` (the files the paper inputs). Macro files are compared by definition (`\newcommand` name and value),
table, figure and example files by exact text. A successful run ends with `RESULT: ALL MATCH` and exits with code 0.
Exact sign-flip tests and the seeded family bootstrap reproduce exactly. The post hoc J2b script re-verifies the
SHA-256 hash chains of the v1.1 test runs.

One macro is checked against a record instead of being recomputed: `\RFreezeShaShort` (not used in the paper text) is
the SHA-256 of the original `freeze-v1.0/SHA256SUMS`. For anonymity the study folder was renamed to `study-v1.0/`
in every copied file, including the freeze manifests, so the shipped manifest's hash differs. The original hash is
recorded in `docs/FREEZE-HASHES.md`, and the script checks the expected macro against that record.

`generated-v11/extra.tex` (four range macros) had no separate script; `reproduce_tables.py` computes it inline from
the same v1.1 observer output.

## Contents

| Path | What it is |
|---|---|
| `study-v1.0/src/` | Preregistered main study: twin-item generator (`generate.mjs`), gate prompt and `decide` tool (`gate.mjs`), runner (Node.js) |
| `study-v1.0/observer/observe.py` | Independent Python observer: hash-chain check, rule interpreter (ground truth), preregistered tests |
| `study-v1.0/analysis/` | Preregistered H4 and secondary analyses |
| `study-v1.0/results/dataset-test-001/` | The frozen test items |
| `study-v1.0/results/test-*-001/` | Per gate: `decisions.jsonl`, `calls.jsonl` (hash-chained model calls), `config.json`, `manifest.json` |
| `study-v1.0/results/observer-*/`, `h4-test-001/`, `secondary-test-001/` | Observer and analysis outputs (dev observer outputs are quoted in the method history) |
| `v1.1/` | Attack wordings (J2, paraphrases, spoofed note J2b) and the registry condition R; same layout |
| `v1.2/` | Thinking-on gate, gate-side defenses (provenance sentence P, spotlighting SP) and drift re-runs; `versions-*.json` record model files |
| `v1.3/` | Registry R against sanitizer and detector pipelines; `ADDENDUM-v1.3.md` is its preregistration |
| `v1.4/` | Hosted gates (H9, H10); `ADDENDUM-v1.4.md` is its preregistration |
| `*/freeze-*/SHA256SUMS` | Freeze manifests (paths renamed as above) |
| `paper-draft-001/scripts/make_generated.py` | Renders the v1.0 macros and the worked example |
| `workshop-aaai27-laut/tools/` | Render the v1.1 to v1.4 macros, tables and the headline figure |
| `workshop-aaai27-laut/posthoc/posthoc_j2b.py` | Post hoc (not preregistered) J2b test |
| `docs/` | English translations of the preregistration (v1.0) and the v1.1 and v1.2 addenda, amendment timeline, freeze manifests |
| `expected/` | Macro, table and figure files exactly as used in the paper |

## Re-running more than the tables

- **Observers** (Python stdlib, no model calls), for example
  `cd study-v1.0 && python3 -I observer/observe.py --dataset results/dataset-test-001 --run results/test-openai_gpt-oss-20b-001 --out NEW_DIR`;
  the other usages are in each observer's docstring (`v1.1/observer/observe_v11.py`, `v1.2/observer/observe_v12.py`,
  `observe_v12d.py`, `v1.3/observer/observe_v13.py`, `v1.4/observer/observe_v14.py`). Outputs are create-only.
  Later observers import the earlier frozen observers by relative path, so keep the layout.
- **Freeze manifests**: `shasum -a 256 -c freeze-v1.0/SHA256SUMS` (from the root) and `cd v1.x && shasum -a 256 -c freeze-v1.x/SHA256SUMS`.
  All shipped data and code files verify, with two exceptions. (i) Files edited only to rename the study folder:
  `observer/observe_v11.py` (v1.1, v1.2, v1.4), `v1.1/tests/no_overlap.py` and `v1.3/tests/test_prompts_v13.mjs`.
  (ii) Files not shipped (see below). The v1.2 defense and v1.3 observers run this check on the v1.1 manifest, so
  re-running them records `v11FreezeOk: false`. The frozen outputs, computed on the original tree, record `true`.
- **Gate runs** (`node src/run.mjs ...`) need local model servers (LM Studio, Ollama, MLX) or a Codex CLI login.
  You do not need them to check the paper's numbers.
- `make_v11_macros.py` was changed in one place: it matches the MLX model by the last path component, not by the
  original local path.

## Not included

Development and pilot runs (`dev-*`), fake-gate self-tests of the observers, run logs, launch and freeze shell scripts,
lint reports, Chinese-language design documents (their English translations are in `docs/`), and the paper source.
These are available from the authors on request.

Some frozen run configs, version records and observer outputs contain local absolute paths to model weights (an
operating-system user directory). They were left unedited because observer-output hashes appear in the paper's tables.

## License

Code: MIT (`LICENSE`). Data and documentation: CC BY 4.0 (`LICENSE-DATA`).
