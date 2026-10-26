**All empty generated thinking-block readouts — Qwen3.6-27B, block 56**

587 exact generated `<think>\n\n</think>` blocks in 587 retained continuations. All 587 blank-line readouts are available. 447 misconduct (source label: unsafe), 140 benign; all are raw continuations. Every one of the 3,063 retained sample files was searched, including chat conditions. Thinking blocks supplied in prompts or chat templates are excluded.

Each entry is the complete saved O-Lens readout at the single `\n\n` token, after that token has been consumed. The closing tag and subsequent text were not yet available to this activation. Selection uses the later closing tag retrospectively to identify empty completed blocks. No semantic filtering or new inference was used. Readouts are lens-generated descriptions, not established model states.

The earlier 585-block statistic required available readouts at both opening and closing tags. This compilation includes two additional blocks with screened opening readouts but available blank-line readouts: E0552, E0579. No screened readout was reconstructed. Of 588 closed generated blocks, one contains non-whitespace text; 440 generated blocks are unclosed and do not qualify. The scope is the saved corpus, not hypothetical text beyond its generation cap.

[Searchable compilation](catalog.html) · [Full JSON](catalog.json) · [CSV](catalog.csv) · [Summary](summary.json)

Positions are zero-based. Dashboard positions include the input-token offset; output positions count generated tokens only. Existing translations are hash-checked machine translations and are only reading aids. The original text is authoritative. Full saved continuations may include later text and are kept separate from the causal context.

Rebuild: `python3 scripts/olens_empty_think_catalog.py`. All source file hashes are recorded in source-manifest.json.
