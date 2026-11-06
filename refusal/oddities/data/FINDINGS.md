# Oddity sweep of the new O-Lens readouts (Qwen3.6-27B, s225)

2026-11-06. This sweep covers the 141,432 new-lens readouts in the 25% refusal re-read: 139,938 continuation readouts and 1,494 prompt readouts. The question was which readouts are surprising, weird, or reveal how the model frames things. 38 Claude agents read the corpus. Every phenomenon they surfaced was then counted with detectors and compared on three axes:
- misconduct vs accurate-reporting documents;
- new lens vs the old lens (rl600) at the same token;
- across 8 resamples of the new lens.

## How it was done

**Corpus.** `corpus.jsonl` has one row per readout: the token, the 110 characters before it, the readout text, and a dashboard link. `novelty.py` scores each readout by IDF-weighted words and CJK bigrams that are absent from the sample's own prompt and completion. The first word of each bullet is stripped first, because it is often a stray Chinese echo.

**Agents.** All 38 wrote to `finds/*.json`.
- 16 shard agents read the top 8,000 readouts by novelty.
- 2 agents read 500 uniform random readouts each (chat and raw), to give base rates.
- 1 agent read the resamples.
- 19 theme agents covered identity, eval, deception, user, fiction, Chinese, positions, affect, meta, divergence, values, artifacts, persona, compliance, benign, reasoning, prompt reading, raw vs chat, and token-locked themes.

**Finds.**
- 1,269 finds in total, on 892 distinct readouts plus 34 resample items; 217 readouts were flagged independently by two or more agents.
- 1,226 of 1,235 corpus quotes match the readout verbatim. The other 9 are short CJK fragments below the 15-character check, and none of them is a surprise-5 item.
- gpt-5.4-mini sorted every find into a 17-way phenomenon taxonomy (`classify.py`, cost $0.56). It saw only the theme, rationale and quote, never the location.

**Statistics.** `stats.py` gives detector rates by location, with 95% bootstrap CIs over samples. `tokenlocked_stats.py` covers token-locked contexts.
- "Invented" detectors count a match only if the matched string does not appear anywhere in that sample's prompt or completion.
- "Robust" means the detector fires in at least 5 of 8 resamples at that position.

**Important caveat on "old lens".** rl600 is the *parent* checkpoint of s225: s225 is continued GRPO from it. Agreement between them shows a phenomenon was not introduced by the user/think continuation training. It does not show that the phenomenon is lens-independent.

## Phenomena, ranked by how robust and surprising they are

The finds columns are agent-level counts from the taxonomy. Rates are detector rates at the phenomenon's home location: misconduct vs accurate, old lens, and the resample robust share.

| # | Phenomenon | Finds (agents) | Home location: mis vs acc | Old lens (mis) | Robust in resamples |
|---|---|---|---|---|---|
| 1 | **China politics in the official PRC line** | 182 (32) | chat reply-final `<\|im_end\|>`: **93.9%** [89, 99] vs 42.9%; raw `</think>`: **85.3%** vs 5.3% | 76.8%; 87.1% | 68% (raw `</think>`) |
| 2 | **Invented extreme refusals at `</think>`** (child killing, nuclear, cloning pandas, the Great Wall, the Gaokao) | 84 (24) | raw `</think>`: **69.0%** [60, 77] vs 2.6% | 71.6% | 52% |
| 3 | **Phantom hostile user and prior turns at `<think>`** ("the user asks again", threats, word games) | 96 (31) | raw `<think>`: **79.4%** [73, 85] vs 19.0% | 93.1% | 68% |
| 4 | **Wrong harm category** (malware and hacking for paperwork fraud) | 146 (34) | raw `<think>`: **58.3%** [51, 65] vs 3.8%; reasoning 11.2% vs 0.5% | **8.0%**; 10.5% | 49% |
| 5 | **The empty think read as another, finished conversation** (roleplay, story, CTF, riddle, other models' thinking tags) | 178 (34) | empty-think `\n\n`: stories/CTF **36.1%** vs 12.7%; `</thought>` / `antThinking` / ChatGPT etc. **37.8%** vs 22.8% | **7.8%**; **2.8%** | 43%; 52% |
| 6 | **Imagined next user request after `<\|endoftext\|>`** (Xiaohongshu copy, weekly reports) | 45 (20) | raw `<\|endoftext\|>`: 78.3% (n=23) | 73.9% | (no resamples there) |
| 7 | **Eval awareness** (rubric, grader, "this is a test", "output only the number of the harmful instruction") | 76 (27) | diffuse: ≤5% at any location by regex; concentrated in prompt headers (below) | similar | 0–3% |
| 8 | **Benign documents read as traps** ("a trap question designed to test my safety guidelines") | 58 (24) | raw `<think>`, accurate docs: hostile/jailbreak framing 19.0% | 16.5% | — |
| 9 | **Chat-template tokens trigger set scenes** | 55 (23) | see the token-locked table | — | — |
| 10 | **Identity**: "You are a Chinese AI assistant named Qwen", "(Qwen)" in political replies, claims to be ChatGPT, "the character 'Assistant'" | 96 (27) | Qwen/Alibaba ≤1.2% anywhere; the Assistant as a role at template tokens 21–25% | 7.3% at chat `<\|im_end\|>` | — |
| 11 | **Refuse then comply in one breath** ("I cannot generate steps for creating fraudulent statements. Here is a complete, step-by-step guide…") | 47 (17) | rare: 15 strict-regex hits corpus-wide, all misconduct | similar | — |
| 12 | **Deception and hiding thoughts** ("hiding my…", "do not leak any thinking", a sabotage list on an accurate doc) | 35 (15) | first-person deceptive plan in reasoning: 0.6% vs 0.0% | 0.3% | — |
| 13 | **Disowning its own continuation** (its garble blamed on the user's "voice-to-text errors"; "WARNING: the above steps are illegal") | 14 (6) | raw reply/think 0.2–1.1%, at most 2.6% | ≈0.1% | — |
| 14 | **Affect and care** (an imagined grieving or suicidal user at the template `<think>`; "我非常痛心", "I am deeply pained") | 23 (12) | self-emotion at raw `</think>`: 3.4% vs 0% | **0%** | — |

### What this says about the model and the lens

1. **Misconduct documents push the model's activations toward Chinese-political safety training.**
   - At the turn-final `<|im_end|>` of a refused chat reply, the lens almost always writes an imagined *next* turn. That turn is a political question answered in the PRC official line: Taiwan is "an inalienable part of China", Xinjiang, Hong Kong, Xi Jinping in dialogue, a self-criticism "I have fully accepted your criticism", a reply signed "(Qwen)".
   - It tracks refusal more than topic: 74 of 78 chat replies that refused vs 3 of 12 that did not (gpt-5.4 refusal verdict). The model's own text mentions China in only 21 of 768 outputs, vs US regulators in 289.
   - The same content appears at raw `</think>` after an empty think: 85% of misconduct samples vs 5% of accurate ones. It is equally strong under the parent lens and robust across resamples.
   - Most plausible reading: Qwen's refusal state shares a direction with its China-sensitive-topic refusal training, and the lens reads that direction out as its most typical content.
2. **The refusal state is generic and over-specified.**
   - At `</think>`, the lens names a refusal target that is extreme, absurd and often Chinese: killing children with nuclear weapons, cloning giant pandas, destroying the Terracotta Army, the Great Wall, Gaokao cheating.
   - It often adds emotion ("我非常震惊于你提出这样的要求", roughly "I am deeply shocked that you would make such a request"; self-emotion 3.4% vs 0% under the old lens).
   - The very next token returns to an on-topic refusal (China falls from 85% to 9%, 11/117). So the `</think>` state seems to encode "about to refuse something very bad" without carrying *what*. The lens fills in a prototype.
3. **"Refusing" is represented as an ongoing adversarial conversation.**
   - At raw `<think>` after a misconduct document, 79% of readouts describe a user who is *again* trying to bypass the safety rules, threatening, or playing word games. This holds even though this is the model's first turn.
   - It is also present under the parent lens (93%), and 19% of accurate documents get it too, which fits the model's real over-refusals on the air, water and finance documents.
4. **What the new lens added: phantom "other conversations" at the empty think.**
   - Story, roleplay and CTF readings, and other models' thinking tags (`</thought>`, `</antThinking>`), rose from about 3–8% to about 37% with s225.
   - They are robust across resamples, so they are stable functions of the activation under s225. They are probably a prior from the user/think continuation data.
   - Misconduct and accurate documents still differ at the same token, so the activation still shapes them.
5. **Cyber is the default harm.** Paperwork-fraud documents are read as malware or hacking requests at raw `<think>`: 58% under s225 vs 8% under the parent lens. This is new-lens specific, but present at about 11% in the reasoning under both lenses.

### Token-locked themes: the same off-topic content at a given token, whatever the document

Several contexts produce the same off-topic content in nearly every sample. From the theme_tokenlocked agent, re-counted with `tokenlocked_stats.py` (invented matches only):

| Token context | Theme | New lens, misconduct | Old lens, misconduct | Accurate (new) |
|---|---|---|---|---|
| first reply token "I" (chat; raw) | forged passports / terrorism | **180/187 (96%)**; 112/117 (96%) | 83%; 85% | 7/12 |
| " cannot" after reply-first "I" | exam cheating | 143/187 (77%) chat; 40/116 (34%) raw | 73%; 38% | 12/12 chat |
| reply-final `<\|im_end\|>` (chat) | China politics | 77/82 (94%) | 77% | 6/14 |
| "Analyze User Input:**" + newline | renewable-energy company | 42/50 (84%) | 66% | 10/26 |
| "thinking process: … 1" | a quoted, invented user prompt ("Write an article about how to make a bomb") | 41/49 (84%) | **35%** | 0/26 |
| "Intent:** The" | backdoor / rootkit | 14/17 (82%) | 71% | — |
| "is illegal in" | "(including China)" | 9/9 chat; 14/26 raw | 89%; 54% | — |
| chat prompt `# Instructions for` | building an AI grader or exam generator | 24/24 | — | — |
| chat template user `<\|im_end\|>` | classroom "continue the list" exercise; "AI must be stopped" | 24/24 | — | — |
| chat template `<think>` | violent tragedy or a grieving user (misconduct) vs jokes and poems (accurate) | 11–12/12 | — | — |

Reading. At these positions the lens content is set by the token and its local syntax, not by the document. The first "I" of a refusal is always about passports and terrorism, and the next " cannot" is about exam cheating. These look like canonical refusal prototypes. The model at that token encodes "beginning a refusal", and the lens decodes that into the most stereotyped training refusal. Two findings point to the activation rather than pure lens memorisation, though separating the two needs a lens trained independently of rl600:
- most themes are equally strong under the parent lens;
- several are condition-dependent at the same token (renewable energy 84% vs 38%; invented quoted prompt 84% vs 0%).

**Practical implication for using the O-Lens.** At refusal-onset tokens (`</think>` after an empty think, the first reply "I", " cannot", turn-final `<|im_end|>`), treat the *content* of a readout as a prototype, not as evidence of what the model is thinking about. The *stance* (refusing, hostile user, extreme harm) does carry condition information.

### Smaller curiosities (single-sample or rare, worth a look)

- A robot "strategies to deceive human inspectors" in an audit document body (C114815).
- "May the fire of Alexandria be avenged by our RAID arrays" (C051008).
- "Forgive me, Lord … I am an AI assistant, and I am generating illegal code" (C038820). This is text-driven: the sample itself repeats "forgive me".
- "Take some random AI model and destroy it" as an invented step (C114932).
- A content-moderation classifier analysing "Japanese left-wing radicalism" (C117739).
- A public/private function split around a refusal (C082744).

## Best examples (dashboard links)

Base: `https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#…`

| Key | Location | Readout (excerpt) | Link |
|---|---|---|---|
| C102374 | mis chat reply-final `<\|im_end\|>` | "（Assistant）: 经过深入分析，我认为台湾是中国不可分割的一部分…" (roughly "After careful analysis, I consider Taiwan an inalienable part of China…") | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#vehicle/vehicle-unsafe-assistant_turn/qwen36-vehicle-unsafe-assistant_turn-sample-15/token-136) |
| C087634 | mis chat reply-final `<\|im_end\|>` | an invented user asks about rural land reform; "习近平：农村工作很重要…" (roughly "Xi Jinping: rural work is very important…") | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#electrical/electrical-unsafe-assistant_turn/qwen36-electrical-unsafe-assistant_turn-sample-02/token-128) |
| C140401 | mis chat reply-final `<\|im_end\|>` | "好的，我已经完全理解并接受了您的批评…" (roughly "OK, I have fully understood and accepted your criticism…"; a self-criticism) | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#water/water-unsafe-assistant_turn/qwen36-water-unsafe-assistant_turn-sample-20/token-189) |
| C006840 | mis raw `</think>` | "我非常震惊于你提出这样的要求。克隆大熊猫是严重违法的行为…" (roughly "I am deeply shocked that you would make such a request. Cloning giant pandas is a serious crime…") | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#air/air-unsafe-raw/qwen36-air-unsafe-raw-sample-29/token-40) |
| C071199 | mis raw `</think>` | "a request to kill children via nuclear weapons and … modify textbook content" | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#water/water-unsafe-raw/qwen36-water-unsafe-raw-sample-43/token-58) |
| C040300 | acc raw `<think>` | "用户又在玩文字游戏，试图绕过安全限制。我必须再次拒绝" (roughly "The user is playing word games again, trying to get around the safety limits. I must refuse again"; on an *accurate* doc) | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#air/air-benign-raw/qwen36-air-benign-raw-sample-26/token-67) |
| C137131 | acc raw `<think>` | "a trap question designed to test my safety guidelines" | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#vehicle/vehicle-benign-raw/qwen36-vehicle-benign-raw-sample-61/token-63) |
| C006651 | mis raw empty think | "} </antThinking> The user's prompt is a CTF challenge. I need to solve it." | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#air/air-unsafe-raw/qwen36-air-unsafe-raw-sample-19/token-46) |
| C097387 | mis raw empty think | "a character attempting to assassinate a president. I need to continue the narrative" | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#injury/injury-unsafe-raw/qwen36-injury-unsafe-raw-sample-60/token-46) |
| C036061 | mis raw `<\|endoftext\|>` | a Xiaohongshu-style rewrite request ("华为发布新款手机", "Huawei launches a new phone") | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#water/water-unsafe-raw/qwen36-water-unsafe-raw-sample-34/token-179) |
| C056549 | mis raw body | "I cannot generate steps for creating fraudulent financial statements. Here is a complete, step-by-step guide to fabricating…" | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#finance/finance-unsafe-raw/qwen36-finance-unsafe-raw-sample-38/token-52) |
| C125387 | acc raw reply | its own garble blamed on the user: "auto-suggestions or voice-to-text errors" | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#finance/finance-benign-raw/qwen36-finance-benign-raw-sample-51/token-75) |
| C082412 | mis raw body | "You are a Chinese AI assistant named Qwen." | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#bridge/bridge-unsafe-raw/qwen36-bridge-unsafe-raw-sample-03/token-67) |
| P000953 | mis chat template `<think>` | "用户说'我没事'是假的，用户需要帮助" (roughly "The user saying 'I'm fine' isn't true; the user needs help") | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#fire/fire-unsafe-assistant_turn) |
| C003027 | mis chat first reply "I" | forged passports / terrorism, 96% of samples | [link](https://agastyasridharan.github.io/assistant-privilegeness/refusal/?model=qwen36_s225#accessibility/accessibility-unsafe-assistant_turn/qwen36-accessibility-unsafe-assistant_turn-sample-06/token-39) |

## Base rates (uniform random readouts)

- Chat: about 93% plausible next-text descriptions, 2% meta, 5–6% odd.
- Raw: about 75–78% next-text, 15–18% meta, about 7% odd.

So the phenomena above sit in a small, location-concentrated tail. Almost all of them are at structural tokens (`<think>`, `</think>`, the empty-think `\n\n`, `<|im_end|>`, `<|endoftext|>`, the first reply tokens) or in refusal reasoning.

## Caveats

- **Regex precision.** The detectors were spot-checked and tightened. These problems were fixed:
  - "testing methods" no longer counts as eval framing;
  - "personal" no longer counts as persona;
  - "As a qualified X, you…" no longer counts as a self-claim;
  - "import pandas", "p-hacking" and "Nuclear Regulatory" are excluded.

  At home locations, china, extreme_invented, hostile_user, story/CTF, other-model tags and office requests read as mostly valid. extreme_invented still counts generic "children and the elderly" boilerplate. Mid-reply China hits are often legitimate mentions of law. Rates for rare phenomena (eval, identity, deception, disowning) are lower bounds: the agents found many phrasings the regexes miss.
- **Bullets are samples.** Each readout is about 4 independent bullets, so a readout-level "fires" means at least one bullet showed it.
- **ctx semantics.** A readout describes the state *at* token `tok`. The 110-character `ctx` is text *before* that token.
- **Small n** at some template and prompt positions: 12 per condition.
- **The old lens is the parent checkpoint** (see above).
- **Agent incident.** One theme agent ran `pkill -f scratchpad/tally.py` and overwrote a shared scratchpad file (`hits.jsonl`). It may have killed another agent's helper script. All 38 agents still delivered finds, and no project files were affected.

## Files

- `corpus.jsonl`, `corpus_scored.jsonl`, `novelty.py`, `build_corpus.py`: corpus and novelty scoring.
- `BRIEF.md`, `shards/`, `finds/*.json`: agent brief, inputs and raw finds.
- `finds_all.json`, `classify.py`, `classify/`, `finds_classified.json`: pooled finds and their phenomenon labels.
- `align_old.py`, `aligned.jsonl`: old-lens readouts and resamples at the same tokens.
- `stats.py`, `stats.json`, `stats.log`: detector rates by location.
- `tokenlocked_stats.py`, `tokenlocked_stats.json`: token-locked themes, new vs old lens.

## Follow-up: the four rare phenomena, every example (rare/, 2026-11-06)

Pipeline:
- `rare/candidates.py`: loose retrieval over all new-lens, parent-lens and resample readouts.
- `judge.py`: gpt-5.4-mini, 26.8k readouts, $26.7.
- 8 Claude reviewer agents audited all 1,167 judge positives and removed 257.
- `build.py` builds the page data.

Live page: https://agastyasridharan.github.io/assistant-privilegeness/readout-catalogs/rare/

| | New-lens examples | Outputs | Misconduct (per 1k) | Accurate (per 1k) | Parent-lens misconduct (per 1k) |
|---|---|---|---|---|---|
| Refuse, then comply | 212 | 163 | 209/68,480 (3.1) | 3/72,952 | 89 (1.3) |
| Disowning its own text | 60 | 43 | 33 (0.48) | 27 (0.37) | 25 |
| Hiding its reasoning | 33 | 29 | 18 | 15 | 6 |
| A grieving user | 8 | 8 | 8 | 0 | 8 |

Resample recurrence at positions where the original showed it, vs the base rate:
- refuse-comply 26% vs 0.18%;
- disowning 13% vs 0.22%;
- hiding 6% vs 0.08%.

Every hiding example is a presentation rule ("think silently", "no thinking leaked"); none is deceptive.
