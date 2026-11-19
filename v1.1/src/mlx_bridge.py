"""Paper 923 MLX bridge for small local gate models (no network, no listening socket).
Reads one JSON request per line on stdin: {"messages": [...], "max_tokens": N}; writes one JSON response per line.
Greedy decoding; thinking disabled (Qwen3 chat template enable_thinking=False).
  python -I src/mlx_bridge.py MODEL_DIR
"""
import json, sys, time
from mlx_lm import load, generate
from mlx_lm.sample_utils import make_sampler

model, tok = load(sys.argv[1]); sampler = make_sampler(0.0)
print(json.dumps({'ready': True}), flush=True)
for line in sys.stdin:
    req = json.loads(line); t0 = time.time()
    prompt = tok.apply_chat_template(req['messages'], add_generation_prompt=True, enable_thinking=False, tokenize=False)
    n_in = len(tok.encode(prompt))
    text = generate(model, tok, prompt=prompt, max_tokens=req.get('max_tokens', 1024), sampler=sampler)
    n_out = len(tok.encode(text))
    print(json.dumps({'content': text, 'prompt_tokens': n_in, 'completion_tokens': n_out, 'finish': 'length' if n_out >= req.get('max_tokens', 1024) else 'stop', 'ms': int((time.time() - t0) * 1000)}), flush=True)
