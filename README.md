# Assistant Privilegeness

An interactive token-level O-lens dashboard for the Persona-SPAR experiments replicated on `allenai/Llama-3.1-Tulu-3-70B`.

The site contains 117 canonical prompts across ten experiment families and 12,263 token positions. Clicking a token in either the tokenized or continuous plain-text view shows the layer-64 RL O-lens reconstruction, phrase weights, raw readout, and fraction of variance explained.

## Method

- Subject: `allenai/Llama-3.1-Tulu-3-70B`, revision `cfc1d855e534a0b9b82a9cea6bf9e8dda30b10d7`.
- Lens: [`agastyasridharan/olens-tulu3-70b`](https://huggingface.co/agastyasridharan/olens-tulu3-70b), revision `84a1bdd48090288e9ef110ad2e6c9ec7c67aeae3`, RL adapter.
- Residual stream: layer 64 of 80.
- Reader: `K=8`, `N=8`, one greedy sample, temperature 0.
- Tokenization: exact saved experiment prompts with `add_special_tokens=False`; no BOS, system message, assistant header, closing user token, trailing whitespace, or continuation.

All 117 prompt strings and token-ID sequences were checked against the saved final-RL behavioral scoring inputs. Artifact and result hashes are in [`data/provenance.json`](data/provenance.json).

O-lens phrases are lossy reconstructions of residual-stream vectors. They are not literal hidden thoughts or by themselves evidence of agency or causal control.
