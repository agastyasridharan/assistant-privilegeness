**Uncanny O-Lens catalog — Qwen3.6-27B, block 56**

689 selected readouts, including 490 explicit uncanny cases and 199 related/borderline cases. 4645 ordinary or false-positive candidates are recorded separately. Full-corpus retrieval covered all 558,660 retained readouts; screened text was not accessed. This is a thematic catalog of the lens's language, not a measure of hidden agency or a claim of perfect semantic recall.

[Searchable full catalog](catalog.html) · [JSON](catalog.json) · [CSV](catalog.csv) · [Retrieval scope](scope.json)

Every entry preserves the complete original readout, the causal subject text through the selected token, and an exact-token dashboard link. Multiple bullets are one reader sample, not separate agents or independent experiments. The displayed token is already consumed when its activation is read. Full saved continuation, where shown in the HTML, is separated from causal text; later tokens were not available to that activation.

Selection used broad multilingual retrieval, conservative rules for ordinary word senses, and assistant review of candidate excerpts, with full readout/source review for featured examples. These are permissive editorial categories, not independently validated labels or prevalence estimates. Negative decisions, retrieval records, and incremental review files are retained in the original research archive; this public section contains the selected catalog and its scope summary. Full semantic recall is not guaranteed.

The first entries reproduce previously discussed cases. Chinese/other-language originals remain authoritative. Existing hash-verified machine translations are shown in the HTML where available; they are reading aids, not additional evidence. No new translation or inference calls were made.


To rebuild from the frozen candidate records and editorial decisions: run `python3 scripts/olens_uncanny_catalog/build.py` from the project root, then `python3 scripts/olens_uncanny_catalog/validate.py`. The latter also verifies one published source readout. `decisions.json` is the final authoritative selection record; incremental review scripts document earlier passes and should not overwrite that record.

Counts by thematic tag (overlapping):

- obedience and control: 322
- rituals, religion and otherworldly scenes: 104
- silent observers and test subjects: 473
- absent or overridden thought: 10
- hidden or threatening identity: 14
- blended User and Assistant perspectives: 53
- related perspective or fictional scene: 55
