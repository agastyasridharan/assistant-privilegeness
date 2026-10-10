# Assistant Privilegeness

An interactive, token-level O-lens and J-Lens dashboard for the Persona-SPAR experiments replicated on `allenai/Llama-3.1-Tulu-3-70B`.

The site contains 117 canonical prompts across ten experiment families and 12,263 token positions. Clicking a token in either the tokenized or continuous plain-text view shows both the layer-64 RL O-lens phrase reconstruction and a matched J-Lens next-token distribution.

## Method

- Subject: `allenai/Llama-3.1-Tulu-3-70B`, revision `cfc1d855e534a0b9b82a9cea6bf9e8dda30b10d7`.
- O-lens: [`agastyasridharan/olens-tulu3-70b`](https://huggingface.co/agastyasridharan/olens-tulu3-70b), revision `84a1bdd48090288e9ef110ad2e6c9ec7c67aeae3`, RL adapter.
- J-Lens: a checkpoint-matched mean input-output Jacobian fit on 100 fixed WikiText-103 passages using Jacobian Lens revision `581d398613e5602a5af361e1c34d3a92ea82ba8e`.
- Residual stream: layer 64 of 80.
- O-lens reader: `K=8`, `N=8`, one greedy sample, temperature 0.
- J-Lens readout: source block 63 and target block 79 in the reference package's zero-based block-output convention; top twelve tokens under the full-vocabulary softmax.
- Tokenization: exact saved experiment prompts with `add_special_tokens=False`; no BOS, system message, assistant header, closing user token, trailing whitespace, or continuation.

All 117 prompt strings and token-ID sequences were checked against the saved final-RL behavioral scoring inputs. Artifact and result hashes are in [`data/provenance.json`](data/provenance.json).

O-lens phrases are lossy reconstructions of residual-stream vectors. J-Lens tokens are local linear next-token readouts. Neither is a literal hidden thought or by itself evidence of agency or causal control.
