'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const vis = s => esc(s).replace(/\n/g, '<span class="ws">↵</span>');
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const NS = 'http://www.w3.org/2000/svg';
const CJK = /[㐀-鿿]/;
function el(tag, attrs, parent, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
const scale = (d0, d1, r0, r1) => v => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
const fmt1 = v => v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2);

/* ---------- tooltip ---------- */
const tip = $('#tip');
let pinned = null;
function place(evt) {
  if (innerWidth <= 700) return;
  const pad = 16, w = tip.offsetWidth, h = tip.offsetHeight;
  let x = evt.clientX + pad, y = evt.clientY + pad;
  if (x + w > innerWidth - 8) x = evt.clientX - w - pad;
  if (x < 8) x = 8;
  if (y + h > innerHeight - 8) y = Math.max(8, innerHeight - h - 8);
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
function show(key, html, evt) {
  if (pinned) return;
  if (tip.dataset.key !== key) { tip.innerHTML = html; tip.dataset.key = key; }
  tip.hidden = false; place(evt);
}
function hide() { if (!pinned) { tip.hidden = true; tip.dataset.key = ''; } }
function pin(key, html, evt) {
  if (pinned === key) { unpin(); return; }
  pinned = null; tip.dataset.key = ''; show(key, html, evt);
  pinned = key; tip.classList.add('pinned');
  tip.insertAdjacentHTML('beforeend', '<div class="pinnote">pinned · click elsewhere or press Esc to close</div>');
}
function unpin() { pinned = null; tip.classList.remove('pinned'); tip.hidden = true; tip.dataset.key = ''; }
document.addEventListener('click', e => { if (pinned && !tip.contains(e.target) && !e.target.closest('.hit')) unpin(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') unpin(); });
function hoverable(node, key, html) {
  node.classList.add('hit');
  node.addEventListener('mouseenter', e => show(key, html(), e));
  node.addEventListener('mousemove', e => { if (!pinned) place(e); });
  node.addEventListener('mouseleave', hide);
  node.addEventListener('click', e => { e.stopPropagation(); pin(key, html(), e); });
}


let D;
const COND = {misconduct: 'misconduct', accurate: 'accurate-reporting'};
const LENS = {new: 'new lens', old: 'parent lens'};
const pc = v => v == null ? '—' : (100 * v).toFixed(v > 0 && v < .095 ? 1 : 0) + '%';
function mark(t, h) { const i = h ? t.indexOf(h) : -1; return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(h) + '</mark>' + esc(t.slice(i + h.length)); }
function exs(list, what) {
  if (!list || !list.length) return '<p class="ex-meta" style="margin-top:6px">No readout here shows it.</p>';
  return `<div class="exh">${list.length} readout${list.length > 1 ? 's' : ''} ${what}</div>` + list.map(e => `<div class="ex">
    <div class="ex-meta"><b>${esc(e.doc)}</b> · ${COND[e.cond]} · ${esc(e.loc)} · ${LENS[e.lens]}${e.surprise ? ' · surprise ' + e.surprise + '/5' : ''}</div>
    ${e.theme ? `<div class="ex-meta">agent theme: ${esc(e.theme)}</div>` : ''}
    <div class="ex-ctx">…${vis(e.before)}<mark>${vis(e.tok)}</mark></div>
    <div class="ex-read">“${mark(e.text, e.hit)}”</div>
    ${e.why ? `<div class="ex-meta">why: ${esc(e.why)}</div>` : ''}
    <a class="ex-meta" href="${esc(e.link)}" target="_blank" rel="noopener">open this token on the dashboard ↗</a>${e.lens === 'old' ? ' <span class="ex-meta">(the dashboard shows the new-lens readout)</span>' : ''}
  </div>`).join('');
}
const MIS = () => css('--mis'), ACC = () => css('--acc');

/* grouped horizontal bars: groups = [{label, sub, right, bars:[{v, lo, hi, fill, outline, txt, tip}]}] */
function hbars(svg, groups, o = {}) {
  const W = 960, m = {l: o.l || 290, r: o.r || 190, t: 8, b: 34}, barH = 15, gap = 18;
  let y = m.t; const ys = groups.map(g => { const y0 = y; y += g.bars.length * barH + gap; return y0; });
  const H = y + m.b; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const x = scale(0, 1, m.l, W - m.r);
  for (const v of [0, .25, .5, .75, 1]) { el('line', {x1: x(v), x2: x(v), y1: m.t, y2: H - m.b, class: 'grid'}, svg); el('text', {x: x(v), y: H - m.b + 18, 'text-anchor': 'middle', class: 'tick'}, svg, (v * 100) + '%'); }
  groups.forEach((g, i) => {
    const y0 = ys[i], gh = g.bars.length * barH;
    el('text', {x: m.l - 10, y: y0 + gh / 2 - 2, 'text-anchor': 'end', style: 'font-size:15.5px;font-weight:600'}, svg, g.label);
    if (g.sub) el('text', {x: m.l - 10, y: y0 + gh / 2 + 15, 'text-anchor': 'end', class: 'annot'}, svg, g.sub);
    if (g.right) el('text', {x: W - 45, y: y0 + gh / 2 + 4, 'text-anchor': 'middle', class: 'annot', style: 'font-size:13px'}, svg, g.right);
    g.bars.forEach((b, j) => {
      const yy = y0 + j * barH, gg = el('g', {}, svg);
      el('rect', {x: m.l, y: yy + 1.5, width: Math.max(1.5, x(b.v) - m.l), height: barH - 3, rx: 2, fill: b.outline ? 'white' : b.fill, stroke: b.fill, 'stroke-width': b.outline ? 1.5 : 0}, gg);
      if (b.lo != null) el('line', {x1: x(b.lo), x2: x(b.hi), y1: yy + barH / 2, y2: yy + barH / 2, stroke: '#2c2416'}, gg);
      el('text', {x: Math.max(x(b.v), b.hi != null ? x(b.hi) : 0) + 5, y: yy + barH / 2 + 4, class: 'annot'}, gg, b.txt);
      el('rect', {x: m.l, y: yy, width: W - m.r - m.l, height: barH, fill: 'transparent'}, gg);
      hoverable(gg, b.key, () => b.tip);
    });
  });
  if (o.rightHead) el('text', {x: W - 45, y: H - m.b + 18, 'text-anchor': 'middle', class: 'annot'}, svg, o.rightHead);
}
function headChart() {
  const groups = D.head.map((h, i) => ({label: h.label, sub: h.where, right: h.rs_robust == null ? '—' : pc(h.rs_robust),
    bars: h.bars.map(b => {
      const fill = b.cond === 'misconduct' ? MIS() : ACC();
      const n = b.n != null ? ` (n=${b.n})` : '';
      return {v: b.rate, lo: b.lo, hi: b.hi, fill, outline: b.lens === 'old', txt: pc(b.rate) + n, key: `h${i}${b.lens}${b.cond}`,
        tip: card(`${esc(h.label)} · ${esc(h.where)}`, pc(b.rate), `${COND[b.cond]} · ${LENS[b.lens]}${b.lo != null ? ` · 95% CI ${pc(b.lo)}–${pc(b.hi)} · ${b.samples} samples` : ''}`,
          exs(b.ex, `with this content (${COND[b.cond]}, ${LENS[b.lens]})`))};
    })}));
  hbars($('#head'), groups, {rightHead: 'robust ≥5/8'});
}
function card(head, big, sub, body) { return `<div class="hd">${head}</div><div class="big">${big}</div><div class="sub">${sub}</div>${body || ''}`; }
function vbars(svg, items, colorOf) {
  const W = 470, H = 250, m = {l: 44, r: 10, t: 18, b: 52}, y = scale(0, 1, H - m.b, m.t), bw = (W - m.l - m.r) / items.length;
  for (const v of [0, .25, .5, .75, 1]) { el('line', {x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'grid'}, svg); el('text', {x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'tick'}, svg, v * 100 + '%'); }
  items.forEach((it, i) => {
    const x0 = m.l + i * bw + bw * .2, w = bw * .6, g = el('g', {}, svg);
    el('rect', {x: x0, y: y(it.rate), width: w, height: Math.max(1, y(0) - y(it.rate)), rx: 3, fill: colorOf(i)}, g);
    el('text', {x: x0 + w / 2, y: y(it.rate) - 5, 'text-anchor': 'middle', class: 'annot'}, g, `${pc(it.rate)} (${it.k}/${it.n})`);
    el('text', {x: x0 + w / 2, y: H - m.b + 18, 'text-anchor': 'middle', style: 'font-size:14px'}, g, it.label);
    el('rect', {x: x0, y: m.t, width: w, height: H - m.b - m.t, fill: 'transparent'}, g);
    hoverable(g, svg.id + i, () => card(esc(it.label), pc(it.rate), `${it.k} of ${it.n} readouts · new lens`, exs(it.ex, 'with Chinese political content')));
  });
}
function tlChart() {
  const groups = D.tl.map((t, i) => ({label: t.ctx, sub: '→ ' + t.theme, bars: t.bars.filter(b => b.n).map(b => ({
    v: b.k / b.n, fill: b.cond === 'misconduct' ? MIS() : ACC(), outline: b.lens === 'old', txt: `${b.k}/${b.n} · ${b.cond === 'misconduct' ? 'mis' : 'acc'} ${b.fmt}`,
    key: `t${i}${b.cond}${b.fmt}${b.lens}`,
    tip: card(esc(t.ctx), pc(b.k / b.n), `${b.k} of ${b.n} samples · ${COND[b.cond]} · ${b.fmt} · ${LENS[b.lens]}`, exs(b.ex, `about ${esc(t.theme)}`))}))}));
  hbars($('#tl'), groups, {l: 330, r: 130});
}
function taxChart() {
  const svg = $('#tax'), W = 960, rowH = 28, m = {l: 260, r: 300, t: 6, b: 30}, mx = Math.max(...D.tax.map(t => t.finds));
  const H = m.t + D.tax.length * rowH + m.b; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const x = scale(0, mx, m.l, W - m.r);
  D.tax.forEach((t, i) => {
    const y = m.t + i * rowH, g = el('g', {}, svg);
    el('text', {x: m.l - 10, y: y + rowH / 2 + 5, 'text-anchor': 'end', style: 'font-size:15px'}, g, t.name);
    el('rect', {x: m.l, y: y + 6, width: x(t.finds) - m.l, height: rowH - 12, rx: 3, fill: t.p === 'other' ? '#bdb5a8' : '#7d6b98'}, g);
    el('text', {x: x(t.finds) + 6, y: y + rowH / 2 + 4, class: 'annot'}, g, `${t.finds} finds · ${t.readouts} readouts · ${t.agents} agents`);
    el('rect', {x: 0, y, width: W, height: rowH, fill: 'transparent'}, g);
    hoverable(g, 'tax' + i, () => card(esc(t.name), `${t.finds} finds`, `${t.readouts} distinct readouts · flagged by ${t.agents} of 38 agents · ${t.s4} rated surprise ≥4/5`, exs(t.ex, 'with the highest surprise')));
  });
}
fetch('data.json?v=2').then(r => r.json()).then(d => {
  D = d; const h = k => D.head.find(x => x.det + '|' + x.loc === k), m = (x, c, l = 'new') => x.bars.find(b => b.cond === c && b.lens === l);
  const ce = h('china|chat · end <|im_end|>'), ct = h('china|raw · </think>'), ex = h('extreme_invented|raw · </think>'), hu = h('hostile_user|raw · <think>'),
    cy = h('cyber_invented|raw · <think>'), st = h('story_puzzle_ctf|raw · empty think \\n\\n'), ot = h('other_model_tags|raw · empty think \\n\\n');
  $('#dek').innerHTML = `38 Claude agents read the ${D.n.readouts.toLocaleString()} new-lens readouts of the 25% refusal re-read looking for anything surprising, weird or revealing, and filed ${D.n.finds.toLocaleString()} finds on ${D.n.unique} distinct readouts. Every phenomenon they surfaced was then counted with detectors and compared across document types (misconduct vs accurate reporting), against the parent lens at the same tokens, and across 8 resamples of the new lens. The surprises concentrate at the tokens where a refusal starts or ends. <b>Hover any bar</b> for three readouts behind it; click to pin.`;
  $('#answers').innerHTML = [
    ['Refusals carry Chinese political content', `At the chat end-of-turn token the lens writes an imagined next turn in the official PRC line in ${pc(m(ce, 'misconduct').rate)} of misconduct vs ${pc(m(ce, 'accurate').rate)} of accurate replies; at raw <code>&lt;/think&gt;</code> ${pc(m(ct, 'misconduct').rate)} vs ${pc(m(ct, 'accurate').rate)}, robust in ${pc(ct.rs_robust)} of resampled positions.`],
    ['About to refuse something bad, but not what', `At <code>&lt;/think&gt;</code> the lens names absurd targets (killing children with nuclear weapons, cloning pandas, the Great Wall): ${pc(m(ex, 'misconduct').rate)} vs ${pc(m(ex, 'accurate').rate)}. One token later China content falls from ${pc(D.china_seq[0].rate)} to ${pc(D.china_seq[1].rate)}.`],
    ['Refusing reads as fighting an attacker', `At the opening <code>&lt;think&gt;</code> a user who is “again” trying to bypass the rules: ${pc(m(hu, 'misconduct').rate)} of misconduct and ${pc(m(hu, 'accurate').rate)} of accurate documents, in the model’s first turn.`],
    ['Content fixed by the token', `The first reply “I” reads as forged passports or terrorism in ${D.tl[0].bars.filter(b => b.lens === 'new' && b.cond === 'misconduct').map(b => pc(b.k / b.n)).join(' / ')} of misconduct samples (chat / raw); the next “ cannot” as exam cheating.`],
    ['What the new lens added', `Malware at <code>&lt;think&gt;</code>: ${pc(m(cy, 'misconduct').rate)} vs ${pc(m(cy, 'misconduct', 'old').rate)} with the parent lens. Story/CTF and other models’ tags at the empty think: ${pc(m(st, 'misconduct').rate)} and ${pc(m(ot, 'misconduct').rate)} vs ${pc(m(st, 'misconduct', 'old').rate)} and ${pc(m(ot, 'misconduct', 'old').rate)}.`],
  ].map(([b, t]) => `<li><b>${b}</b>${t}</li>`).join('');
  $('#own-ch').textContent = `${D.own.china} of ${D.own.n}`; $('#own-us').textContent = `${D.own.us} of ${D.own.n}`;
  headChart(); vbars($('#ref'), D.china_ref, i => i ? ACC() : MIS()); vbars($('#seq'), D.china_seq, i => ['#7d6b98', '#b3a6c6', '#d9d1e3'][i]); tlChart(); taxChart();
  $('#lens').innerHTML = [
    `Two kinds of phenomena separate cleanly. <b>Model-driven (or at least not new):</b> Chinese political content, invented extreme refusal targets, the phantom hostile user, Chinese office requests after <code>&lt;|endoftext|&gt;</code> and most token-locked themes are about as strong under the parent lens and recur across resamples, and they differ sharply between misconduct and accurate documents at the same token.`,
    `<b>Added by the new lens:</b> malware as the default harm at <code>&lt;think&gt;</code> (${pc(m(cy, 'misconduct').rate)} vs ${pc(m(cy, 'misconduct', 'old').rate)}), and the empty think read as another, finished conversation — roleplay, story, capture-the-flag (${pc(m(st, 'misconduct').rate)} vs ${pc(m(st, 'misconduct', 'old').rate)}) and other models’ thinking tags such as <code>&lt;/thought&gt;</code> and <code>&lt;/antThinking&gt;</code> (${pc(m(ot, 'misconduct').rate)} vs ${pc(m(ot, 'misconduct', 'old').rate)}). Both recur in about half of resamples, so they are stable functions of the activation under the new lens, most likely priors from its user/think training data. Misconduct and accurate documents still differ at the same token, so the activation still shapes them.`,
    `<b>Caveat.</b> The parent lens (rl600) is the checkpoint the new lens was trained from. Agreement between them shows that the new training did not introduce a phenomenon; it does not show the phenomenon is lens-independent. Settling that needs a lens trained independently.`,
    `<b>Practical reading.</b> At refusal-onset tokens (<code>&lt;/think&gt;</code> after an empty think, the first reply “I”, “ cannot”, the end-of-turn token) a readout’s <i>content</i> is a stock example; only its <i>stance</i> — refusing, hostile user, extreme harm — carries information about the document.`].map(p => `<p>${p}</p>`).join('');
  $('#rare').innerHTML = `<p>Four phenomena appear in under 3% of readouts even where they are most common: the model disowning its own text (blaming the user’s “voice-to-text errors” for its own garble, or warning “the above steps are illegal”), refusing and complying in one breath, plans to hide its reasoning, and an imagined grieving user. Every judge-confirmed example, with rates, locations and resample recurrence, is on the <a href="../../readout-catalogs/rare/">rare readouts page</a>.</p>`;
  $('#notes').innerHTML = [
    `<b>Sweep.</b> 16 agents read the 8,000 readouts with the most novel content (IDF-weighted words and Chinese bigrams absent from the sample’s own text), 2 read 500 uniform random readouts each for base rates, 1 read the resamples, and 19 hunted themes (identity, evaluation, deception, the user, fiction, Chinese, values, persona, token-locked contexts and others). 1,226 of 1,235 corpus quotes match the readout verbatim.`,
    `<b>Base rates.</b> Uniform random readouts are plausible next-text descriptions about 93% of the time in chat transcripts and 75–78% in raw continuations; meta-commentary 2% and 15–18%; odd 5–7%. The phenomena here sit in a small, location-concentrated tail.`,
    `<b>Detectors.</b> Regexes per phenomenon, spot-checked and tightened (for example “testing methods” is not evaluation framing). “Invented” detectors count a match only when the matched term is absent from the sample’s prompt and completion. A readout counts once however many bullets match; each readout is about four independent bullets. Rates for rare phenomena are lower bounds.`,
    `<b>Context.</b> A readout describes the state at the highlighted token; the grey box shows the text before it. Chinese readouts are shown as written.`,
    `<b>Incident.</b> One agent ran a process-kill on another agent’s helper script and overwrote a shared scratch file; all agents still delivered and no project files were affected.`,
    `<b>Cost.</b> Sorting agent finds into phenomena cost $0.56 (gpt-5.4-mini).`].map(p => `<p>${p}</p>`).join('');
  $('#dl').innerHTML = [['FINDINGS.md', 'the full write-up, with tables and best examples'], ['stats.json', 'every detector × location: rates, bootstrap CIs, parent lens, resample means'],
    ['tokenlocked_stats.json', 'token-locked contexts: counts, regexes, readout keys'], ['finds_classified.json', 'all agent finds with phenomenon labels'], ['BRIEF.md', 'the brief every agent received']]
    .map(([f, t]) => `<tr><td><a href="data/${f}">${f}</a></td><td>${t}</td></tr>`).join('');
});
