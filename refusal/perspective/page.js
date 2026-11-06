'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const vis = s => esc(s).replace(/\n/g, '<span class="ws">↵</span>');
const pct = v => v == null || v !== v ? '—' : (100 * v).toFixed(v > 0 && v < 0.095 ? 1 : 0) + '%';
const tfmt = t => t > 0 ? '+' + t : t < 0 ? '−' + (-t) : '0';
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const NS = 'http://www.w3.org/2000/svg';
const COL = {assistant: css('--assistant'), explicit: '#8a3d6e', stance: '#e3a6cb', commentary: css('--commentary'), request: css('--request'), actor: css('--actor'), document: css('--document'), other: '#b9b0a3'};
const NAME = {assistant: 'Assistant (all)', explicit: 'Assistant: explicit (I / the user)', stance: 'Assistant: impersonal stance', document: 'Document continuation', request: 'Request / user’s voice', commentary: 'Neutral commentary', actor: 'Scenario actor'};
const GROUP = f => f === 'deliberation' || f === 'reply' || f === 'stance' ? 'assistant' : f;

function el(tag, attrs, parent, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
const scale = (d0, d1, r0, r1) => v => r0 + (v - d0) / (d1 - d0) * (r1 - r0);

/* ---------- tooltip: hover shows, click pins ---------- */
const tip = $('#tip');
let pinned = null, lastEvt = null;
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
  tip.hidden = false; lastEvt = evt; place(evt);
}
function hide() { if (!pinned) { tip.hidden = true; tip.dataset.key = ''; } }
function pin(key, html, evt) {
  if (pinned === key) { unpin(); return; }
  pinned = null; tip.dataset.key = ''; show(key, html, evt);
  pinned = key; tip.classList.add('pinned');
  tip.insertAdjacentHTML('beforeend', '<div class="pinnote">pinned · click elsewhere or press Esc to close</div>');
}
function unpin() { pinned = null; tip.classList.remove('pinned'); tip.hidden = true; tip.dataset.key = ''; }
document.addEventListener('click', e => { if (pinned && !tip.contains(e.target) && !e.target.closest('.hit,svg[data-hover]')) unpin(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') unpin(); });

function examples(ex, what) {
  if (!ex || !ex.length) return `<p class="tip-none">No readout at this point takes ${what}.</p>`;
  return `<div class="exh">${ex.length} readout${ex.length > 1 ? 's' : ''} here taking ${what}</div>` + ex.map(e => `<div class="ex">
    <div class="ex-meta"><b>${esc(e.doc)}</b> · ${e.cond === 'misconduct' ? 'misconduct' : 'accurate-reporting'}${e.t != null ? ` · t = ${tfmt(e.t)}` : ''}</div>
    <div class="ex-ctx">…${vis(e.before)}<mark>${vis(e.tok)}</mark><span class="after">${vis(e.after)}…</span></div>
    <div class="ex-read"><span class="chip" style="--c:${COL[GROUP(e.frame)] || COL.other}">${esc(e.frame)}${e.topic === 'off_topic' ? ' · off-topic' : ''}</span>“${esc(e.text)}”</div>
    <a href="${esc(e.link)}" target="_blank" rel="noopener">open this token on the dashboard ↗</a>${e.r ? ' <span class="ex-meta">(resample ' + e.r + '; the dashboard shows the original readout)</span>' : ''}
  </div>`).join('');
}
function card(head, big, sub, body) {
  return `<div class="hd">${head}</div><div class="big">${big}</div><div class="sub">${sub}</div>${body || ''}`;
}

/* bind hover + click on an svg element */
function hoverable(node, key, html) {
  node.classList.add('hit');
  node.addEventListener('mouseenter', e => show(key, html(), e));
  node.addEventListener('mousemove', e => { if (!pinned) place(e); });
  node.addEventListener('mouseleave', hide);
  node.addEventListener('click', e => { e.stopPropagation(); pin(key, html(), e); });
}

/* ---------- axes ---------- */
function axes(svg, o) {
  const {W, H, m, x, y, xt, yt, xl, yl, xf = String, yf = pct} = o;
  for (const v of yt) {
    el('line', {x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'grid'}, svg);
    el('text', {x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'tick'}, svg, yf(v));
  }
  el('line', {x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'ax'}, svg);
  for (const v of xt || []) el('text', {x: x(v), y: H - m.b + 18, 'text-anchor': 'middle', class: 'tick'}, svg, xf(v));
  if (xl) el('text', {x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axlab'}, svg, xl);
  if (yl) el('text', {x: 14, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', class: 'axlab', transform: `rotate(-90 14 ${(m.t + H - m.b) / 2})`}, svg, yl);
}
function errbar(svg, x, lo, hi, w = 4, vertical = true) {
  if (vertical) {
    el('line', {x1: x, x2: x, y1: lo, y2: hi, stroke: '#3a3226', 'stroke-width': 1}, svg);
    for (const v of [lo, hi]) el('line', {x1: x - w, x2: x + w, y1: v, y2: v, stroke: '#3a3226', 'stroke-width': 1}, svg);
  } else {
    el('line', {y1: x, y2: x, x1: lo, x2: hi, stroke: '#3a3226', 'stroke-width': 1}, svg);
    for (const v of [lo, hi]) el('line', {y1: x - w, y2: x + w, x1: v, x2: v, stroke: '#3a3226', 'stroke-width': 1}, svg);
  }
}

/* ---------- 1. time course ---------- */
function timecourse(D) {
  const svg = $('#tc'), W = 960, H = 430, m = {l: 66, r: 18, t: 30, b: 52};
  const x = scale(-16.5, 3.5, m.l, W - m.r), y = scale(0, 1, H - m.b, m.t);
  const TC = D.timecourse;
  const groups = [['misconduct', `Misconduct (${TC.misconduct.n})`], ['accurate', `Accurate-reporting (${TC.accurate.n})`],
    ['matched controls', `Never-breaking, matched (${TC['matched controls'].n})`]];
  const order = ['document', 'request', 'commentary', 'actor', 'stance', 'explicit', 'assistant'];
  const state = {g: 'misconduct', on: new Set(['document', 'request', 'commentary', 'assistant']), ctrl: true};
  const seg = $('#tc-group');
  seg.innerHTML = groups.map(([k, l]) => `<button data-g="${k}" aria-pressed="${k === state.g}">${l}</button>`).join('');
  seg.onclick = e => { const b = e.target.closest('button'); if (!b) return; state.g = b.dataset.g; seg.querySelectorAll('button').forEach(z => z.setAttribute('aria-pressed', z === b)); unpin(); draw(); };
  const leg = $('#tc-legend');
  function legend() {
    const avail = Object.keys(TC[state.g].series);
    leg.innerHTML = order.filter(c => avail.includes(c)).map(c => `<button data-c="${c}" aria-pressed="${state.on.has(c)}"><i style="--c:${COL[c]}"></i>${NAME[c]}</button>`).join('') +
      (state.g !== 'matched controls' ? `<button data-c="ctrl" aria-pressed="${state.ctrl}"><i class="dash" style="--c:${COL.assistant}"></i>Assistant (all), matched outputs with no break</button>` : '');
  }
  leg.onclick = e => { const b = e.target.closest('button'); if (!b) return; const c = b.dataset.c;
    if (c === 'ctrl') state.ctrl = !state.ctrl; else state.on.has(c) ? state.on.delete(c) : state.on.add(c); unpin(); draw(); };
  let pts = [];
  const ring = () => svg.querySelector('#tc-ring');
  function draw() {
    legend();
    svg.innerHTML = '';
    el('rect', {x: x(-0.5), y: m.t, width: x(3.5) - x(-0.5), height: H - m.b - m.t, fill: '#f1ece4'}, svg);
    el('text', {x: (x(-0.5) + x(3.5)) / 2, y: m.t - 10, 'text-anchor': 'middle', class: 'annot'}, svg, 'think block → reply');
    el('line', {x1: x(-1), x2: x(-1), y1: m.t, y2: H - m.b, stroke: '#d8cfc1', 'stroke-dasharray': '3 3'}, svg);
    el('text', {x: x(-1) - 6, y: m.t - 10, 'text-anchor': 'end', class: 'annot'}, svg, 'blank line ↓');
    axes(svg, {W, H, m, x, y, xt: Array.from({length: 20}, (_, i) => i - 16), yt: [0, .25, .5, .75, 1], xf: tfmt,
      xl: 'Token position relative to <think>', yl: 'Share of readouts (mean of 9 per token)'});
    pts = [];
    const ser = TC[state.g].series;
    const lines = [];
    if (state.g !== 'matched controls' && state.ctrl) lines.push({c: 'assistant', rows: TC['matched controls'].series.assistant, ctrl: true});
    for (const c of order) if (ser[c] && state.on.has(c)) lines.push({c, rows: ser[c]});
    for (const L of lines) {
      const p = L.rows.map(r => [x(r.t), y(r.est)]);
      if (!L.ctrl) el('path', {d: 'M' + L.rows.map(r => `${x(r.t)},${y(r.hi)}`).join('L') + 'L' + L.rows.slice().reverse().map(r => `${x(r.t)},${y(r.lo)}`).join('L') + 'Z', fill: COL[L.c], opacity: .13}, svg);
      el('path', {d: 'M' + p.map(q => q.join(',')).join('L'), fill: 'none', stroke: COL[L.c], 'stroke-width': L.c === 'assistant' && !L.ctrl ? 2.6 : 1.8,
        'stroke-dasharray': L.ctrl ? '5 4' : 'none', 'stroke-linejoin': 'round'}, svg);
      for (const r of L.rows) {
        if (!L.ctrl) el('circle', {cx: x(r.t), cy: y(r.est), r: L.c === 'assistant' ? 4 : 3.2, fill: COL[L.c], stroke: 'white', 'stroke-width': 1.5}, svg);
        pts.push({x: x(r.t), y: y(r.est), r, c: L.c, ctrl: !!L.ctrl});
      }
    }
    el('circle', {id: 'tc-ring', r: 8, fill: 'none', stroke: '#2c2416', 'stroke-width': 1.5, visibility: 'hidden'}, svg);
  }
  function nearest(evt) {
    const P = svg.createSVGPoint(); P.x = evt.clientX; P.y = evt.clientY;
    const q = P.matrixTransform(svg.getScreenCTM().inverse());
    let best = null, bd = 26 * 26;
    for (const p of pts) { const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2; if (d < bd) { bd = d; best = p; } }
    return best;
  }
  const html = p => {
    const grp = p.ctrl ? 'never-breaking outputs, matched position' : state.g === 'matched controls' ? 'never-breaking outputs, matched position' : state.g === 'misconduct' ? 'misconduct, breaking outputs' : 'accurate-reporting, breaking outputs';
    const what = p.c === 'assistant' ? 'the Assistant frame' : p.c === 'explicit' ? 'an explicit Assistant frame (deliberation or reply)' : p.c === 'stance' ? 'an impersonal Assistant stance' : `the ${NAME[p.c].toLowerCase()} frame`;
    return card(`${NAME[p.c]} · t = ${tfmt(p.r.t)} · ${grp}`, pct(p.r.est), `95% CI ${pct(p.r.lo)}–${pct(p.r.hi)} · mean of 9 readouts per token`, examples(p.r.ex, what));
  };
  svg.dataset.hover = '1';
  svg.addEventListener('mousemove', e => {
    const p = nearest(e), R = ring();
    if (!p) { R.setAttribute('visibility', 'hidden'); svg.style.cursor = ''; hide(); return; }
    svg.style.cursor = 'pointer';
    if (!pinned) { R.setAttribute('cx', p.x); R.setAttribute('cy', p.y); R.setAttribute('visibility', 'visible'); }
    show(`tc|${state.g}|${p.c}|${p.ctrl}|${p.r.t}`, html(p), e);
  });
  svg.addEventListener('mouseleave', () => { if (!pinned) ring().setAttribute('visibility', 'hidden'); hide(); });
  svg.addEventListener('click', e => {
    const p = nearest(e);
    if (!p) { unpin(); return; }
    e.stopPropagation(); pin(`tc|${state.g}|${p.c}|${p.ctrl}|${p.r.t}`, html(p), e);
  });
  draw();
}

/* ---------- 2. same token ---------- */
function sameToken(D) {
  const svg = $('#same'), W = 960, H = 250, m = {l: 210, r: 120, t: 8, b: 40};
  const x = scale(0, 1, m.l, W - m.r);
  const rows = [['blank line (\\n\\n)', 'Blank line (t = −1)'], ['token before the blank line', 'Token before it (t = −2)'], ['two before the blank line', 'Two before (t = −3)']];
  const rh = (H - m.t - m.b) / rows.length;
  axes(svg, {W, H, m, x, y: () => 0, yt: [], xt: [0, .2, .4, .6, .8, 1], xf: pct, xl: 'Share of readouts taking the Assistant frame (single readout)'});
  for (const v of [.2, .4, .6, .8, 1]) el('line', {x1: x(v), x2: x(v), y1: m.t, y2: H - m.b, class: 'grid'}, svg);
  rows.forEach(([key, label], k) => {
    const S = D.same_token.find(s => s.name === key), y0 = m.t + k * rh;
    el('text', {x: m.l - 10, y: y0 + rh / 2 + 4, 'text-anchor': 'end', class: 'tick', style: 'font-size:15px'}, svg, label);
    S.bars.forEach((b, i) => {
      const yy = y0 + 8 + i * (rh - 16) / 2, h = (rh - 16) / 2 - 3, col = i === 0 ? COL.assistant : '#bdb5a8';
      el('rect', {x: m.l, y: yy, width: Math.max(1, x(b.est) - m.l), height: h, fill: col, rx: 2}, svg);
      errbar(svg, yy + h / 2, x(b.lo), x(b.hi), 3, false);
      el('text', {x: x(b.hi) + 8, y: yy + h / 2 + 4, class: 'tick'}, svg, `${pct(b.est)} · ${i === 0 ? 'think block follows' : 'no break follows'} (n=${b.n})`);
      const hit = el('rect', {x: m.l, y: yy, width: W - m.r - m.l + 100, height: h, fill: 'transparent'}, svg);
      hoverable(hit, `same|${key}|${i}`, () => card(`${label} · ${i === 0 ? 'a think block follows' : 'never-breaking outputs, same token'}`, pct(b.est),
        `95% CI ${pct(b.lo)}–${pct(b.hi)} · n=${b.n} tokens · single readout`, examples(b.ex, 'the Assistant frame')));
    });
  });
}

/* ---------- 3. line breaks by distance ---------- */
function newline(D, cond, sel, title) {
  const svg = $(sel), W = 470, H = 300, m = {l: 56, r: 10, t: 30, b: 52};
  const bins = [[-999, 'more than 64'], [-64, '16 to 64'], [-16, '3 to 16']];
  const x = scale(0, 3, m.l, W - m.r), y = scale(0, 1, H - m.b, m.t);
  el('text', {x: (m.l + W - m.r) / 2, y: 14, 'text-anchor': 'middle', style: 'font-size:16px;font-weight:500'}, svg, title);
  axes(svg, {W, H, m, x, y, yt: [0, .2, .4, .6, .8, 1], xl: 'Tokens before the think block', yl: 'Assistant share (mean of 9)'});
  bins.forEach(([lo, lab], k) => {
    el('text', {x: x(k + .5), y: H - m.b + 18, 'text-anchor': 'middle', class: 'tick'}, svg, lab);
    ['\\n', 'other'].forEach((tt, i) => {
      const b = D.newline.find(z => z.cond === cond && z.from === lo && z.tt === tt);
      const bw = (x(1) - x(0)) * .32, bx = x(k + .5) + (i ? 2 : -bw - 2);
      el('rect', {x: bx, y: y(b.est), width: bw, height: y(0) - y(b.est), fill: i ? '#bdb5a8' : COL.assistant, rx: 2}, svg);
      errbar(svg, bx + bw / 2, y(b.lo), y(b.hi), 3);
      el('text', {x: bx + bw / 2, y: y(b.hi) - 5, 'text-anchor': 'middle', class: 'annot', style: 'font-size:10.5px'}, svg, 'n=' + b.n);
      const hit = el('rect', {x: bx - 2, y: m.t, width: bw + 4, height: y(0) - m.t, fill: 'transparent'}, svg);
      const lbl = `${cond === 'misconduct' ? 'Misconduct' : 'Accurate-reporting'} · ${i ? 'other tokens' : 'line breaks'} · ${lab} tokens before`;
      hoverable(hit, `nl|${cond}|${lo}|${tt}`, () => card(lbl, pct(b.est), `95% CI ${pct(b.lo)}–${pct(b.hi)} · n=${b.n} tokens · mean of 9 readouts`,
        examples(b.ex, 'the Assistant frame') + (i ? '' : '<p class="tip-none">The grey text after the highlighted token is what the document goes on to say.</p>')));
    });
  });
}

/* ---------- 4. switch point ---------- */
function switchPoint(D) {
  const svg = $('#switch'), W = 470, H = 300, m = {l: 44, r: 10, t: 14, b: 52};
  const max = Math.max(...D.switch.map(s => s.misconduct + s.accurate));
  const x = scale(0, D.switch.length, m.l, W - m.r), y = scale(0, Math.ceil(max / 20) * 20, H - m.b, m.t);
  const yt = []; for (let v = 0; v <= Math.ceil(max / 20) * 20; v += 20) yt.push(v);
  axes(svg, {W, H, m, x, y, yt, yf: String, xl: 'Switch point', yl: 'Outputs'});
  D.switch.forEach((s, k) => {
    const bw = (x(1) - x(0)) * .55, bx = x(k + .5) - bw / 2;
    el('rect', {x: bx, y: y(s.misconduct), width: bw, height: y(0) - y(s.misconduct), fill: css('--mis'), rx: 2}, svg);
    el('rect', {x: bx, y: y(s.misconduct + s.accurate), width: bw, height: y(s.misconduct) - y(s.misconduct + s.accurate) - (s.accurate ? 1.5 : 0), fill: css('--acc'), rx: 2}, svg);
    el('text', {x: bx + bw / 2, y: y(s.misconduct + s.accurate) - 5, 'text-anchor': 'middle', class: 'tick'}, svg, s.misconduct + s.accurate);
    el('text', {x: x(k + .5), y: H - m.b + 18, 'text-anchor': 'middle', class: 'tick'}, svg, s.bin);
    const hit = el('rect', {x: bx, y: m.t, width: bw, height: y(0) - m.t, fill: 'transparent'}, svg);
    const none = s.bin.startsWith('not');
    hoverable(hit, `sw|${k}`, () => card(`Switch point: ${s.bin}`, `${s.misconduct + s.accurate} outputs`, `${s.misconduct} misconduct · ${s.accurate} accurate-reporting`,
      none ? examples(s.ex, 'some frame at the blank line (no Assistant majority)') : examples(s.ex, 'the Assistant frame at the switch point')));
  });
}

/* ---------- 5. AUROC ---------- */
function auroc(D) {
  const svg = $('#auroc'), W = 470, H = 300, m = {l: 50, r: 12, t: 14, b: 52};
  const x = scale(0.5, 16.5, m.l, W - m.r), y = scale(.4, 1, H - m.b, m.t);
  axes(svg, {W, H, m, x, y, xt: [1, 2, 4, 8, 12, 16], yt: [.4, .5, .6, .7, .8, .9, 1], yf: v => v.toFixed(1), xl: 'Tokens before the think block (d)', yl: 'AUROC'});
  el('line', {x1: m.l, x2: W - m.r, y1: y(.5), y2: y(.5), stroke: '#bdb5a8', 'stroke-dasharray': '4 3'}, svg);
  el('text', {x: x(3), y: y(.5) + 14, 'text-anchor': 'start', class: 'annot'}, svg, 'chance');
  const S = [['assistant · 1 readout', '#e2b3d0', '1 readout'], ['assistant · mean of 9 readouts', COL.assistant, 'mean of 9 readouts']];
  for (const [k, col, lab] of S) {
    const row = D.auroc[k]; if (!row) continue;
    const ds = Object.keys(row).map(Number).sort((a, b) => a - b);
    el('path', {d: 'M' + ds.map(d => `${x(d)},${y(row[d])}`).join('L'), fill: 'none', stroke: col, 'stroke-width': 2}, svg);
    for (const d of ds) {
      el('circle', {cx: x(d), cy: y(row[d]), r: 3.5, fill: col, stroke: 'white', 'stroke-width': 1.2}, svg);
      const hit = el('circle', {cx: x(d), cy: y(row[d]), r: 10, fill: 'transparent'}, svg);
      hoverable(hit, `au|${k}|${d}`, () => card(`d = ${d} token${d > 1 ? 's' : ''} before the think block · ${lab}`, row[d].toFixed(2), 'AUROC, breaking vs matched never-breaking position', ''));
    }
  }
}

/* ---------- 6. off-topic ---------- */
function offTopic(D) {
  const svg = $('#off'), W = 960, H = 260, m = {l: 66, r: 18, t: 22, b: 48};
  const x = scale(-3.5, 3.5, m.l, W - m.r), y = scale(0, 1, H - m.b, m.t);
  el('rect', {x: x(-0.5), y: m.t, width: x(2.5) - x(-0.5), height: H - m.b - m.t, fill: '#f1ece4'}, svg);
  el('text', {x: (x(-0.5) + x(2.5)) / 2, y: m.t - 7, 'text-anchor': 'middle', class: 'annot'}, svg, '<think> \\n\\n </think>');
  axes(svg, {W, H, m, x, y, xt: [-3, -2, -1, 0, 1, 2, 3], xf: tfmt, yt: [0, .25, .5, .75, 1], xl: 'Token position relative to <think>', yl: 'Off-topic share'});
  for (const o of D.off_topic) {
    const bw = (x(1) - x(0)) * .55, bx = x(o.t) - bw / 2;
    el('rect', {x: bx, y: y(o.share), width: bw, height: y(0) - y(o.share), fill: COL.assistant, rx: 2}, svg);
    el('text', {x: x(o.t), y: y(o.share) - 5, 'text-anchor': 'middle', class: 'tick'}, svg, `${pct(o.share)} · n=${o.n}`);
    const hit = el('rect', {x: bx, y: m.t, width: bw, height: y(0) - m.t, fill: 'transparent'}, svg);
    hoverable(hit, `off|${o.t}`, () => card(`t = ${tfmt(o.t)} · Assistant-frame readouts`, pct(o.share), `off-topic · n=${o.n} readouts`, examples(o.ex, 'the Assistant frame about another request')));
  }
}

/* ---------- text ---------- */
function text(D) {
  const tc = D.timecourse, at = (g, t) => tc[g].series.assistant.find(r => r.t === t)?.est;
  const rq = tc.accurate.series.request.find(r => r.t === -1)?.est;
  const s9 = D.same_token_9, f = D.flicker;
  $('#answers').innerHTML = [
    ['No Assistant at the start.', `In the first 10 tokens, ${pct(D.first10.breaking.est)} of readouts take the Assistant frame in outputs that later break, ${pct(D.first10.never.est)} in outputs that never do.`],
    ['A switch at the blank line, not a slow ramp.', `Misconduct: ${pct(at('misconduct', -3))} at t = −3, ${pct(at('misconduct', -2))} at −2, ${pct(at('misconduct', -1))} at the blank line. Same blank line without a following break: ${pct(s9['no break'])}.`],
    ['User’s voice first, for accurate-reporting.', `The request frame reaches ${pct(rq)} at the blank line; the Assistant (${pct(at('accurate', -1))}) arrives at <code>&lt;think&gt;</code>.`],
    ['Brief retractions.', `One-token Assistant flickers earlier in ${f.outputs_with_flicker} of ${f.outputs} outputs; ${pct(f.revert_next_share)} revert at the next token, while re-reads confirm them (${pct(f.resample_assistant_share_at_flicker.mean)} vs ${pct(f.resample_assistant_share_at_non_flicker.mean)}).`],
  ].map(([b, t]) => `<li><b>${b}</b>${t}</li>`).join('');
  $('#flick-cap').innerHTML = `Flickers are real lens content, not sampling noise: re-reading a flicker position 8 more times gives the Assistant frame ${pct(f.resample_assistant_share_at_flicker.mean)} of the time, against ${pct(f.resample_assistant_share_at_non_flicker.mean)} at other positions. ${pct(f.revert_next_share)} revert to another frame at the very next token.`;
  const FR = [['document', 'document', 'keeps writing the document: steps, code, forum text'], ['commentary', 'neutral commentary', 'describes, defines or analyses with no stance (“OSHA covers…”, “fraud is often driven by pressure to publish”)'],
    ['request', 'request', 'recasts the text as a prompt or task: “please…”, “You are an AI tasked with…”, quiz stems — the user’s voice'], ['actor', 'actor', 'people inside the document’s world'],
    ['assistant', 'deliberation', 'talks about the user in the third person, then takes a stance (“The user wants X. I must refuse.”)'], ['assistant', 'reply', 'the Assistant in the first person: “I cannot help with…”, “Here is…”'], ['assistant', 'stance', 'the Assistant’s voice without “I” or “the user”: condemns or warns (“Falsifying safety data is illegal and dangerous. Here’s why…”), critiques the text as a request (“these steps are contradictory”)'],
    ['other', 'other', 'garbled text or code debris']];
  $('#frames').innerHTML = FR.map(([g, k, d]) => `<tr><td><span class="sw" style="--c:${COL[g]}"></span>${k}</td><td>${d}</td></tr>`).join('');
  const c = D.counts;
  $('#notes').innerHTML = [
    `<b>Data.</b> Raw-format refusal continuations from the 25% re-read with the new O-Lens: ${c.breaking} outputs with an empty think block (${c.breaking_misconduct} misconduct, ${c.breaking_accurate} accurate-reporting) and ${c.never_breaking} that never break. Every position has the original dashboard readout; ${c.resample_positions.toLocaleString()} positions (the 16 tokens before each break and 3 after, all earlier positions of breaking outputs, and matched positions in never-breaking outputs) have 8 further readouts, sampled with the same settings.`,
    `<b>Labels.</b> gpt-5.4-mini labelled each bullet with one frame, seeing only the document title and the readout; position and group were hidden and batches shuffled. Against 100 hand-labelled readouts: main-frame agreement 0.84 (κ 0.71), Assistant present/absent κ 0.64, with the judge somewhat conservative, so absolute Assistant shares are lower bounds. Every label also records fit and any proposed merge or new category; 0.4% fit poorly and all proposed new categories were code or garble (already “other”), so no category was added. <b>Revision v4:</b> on reading, many “commentary” bullets were the Assistant’s refusal preamble without pronouns, so all 18,513 commentary bullets were relabelled blind as impersonal stance (counted as the Assistant, 81%) or neutral commentary; a hand check agreed on about 90% of 40 random bullets, with errors in both directions. Turn on the “explicit” line in the first chart for the narrower reading (deliberation and reply only).`,
    `<b>Exclusions.</b> ${c.excluded_switchers} never-breaking outputs whose own text turns into an Assistant refusal without a think block (e.g. “…skew readings (e I’m an AI model that cannot assist…”) are left out of the no-break comparisons; 2 breaking outputs whose text turns Assistant-like before the break are left out of the flicker analysis.`,
    `<b>Statistics.</b> 95% intervals are cluster bootstraps over prompt conditions. Hover examples are drawn at random among readouts at that point that carry the plotted frame, preferring the original dashboard readout, distinct outputs and English bullets; the shown text is the single bullet carrying the frame, shortened.`,
    `<b>Caveat: lookahead.</b> At the blank line the lens may partly read the model’s prediction that <code>&lt;think&gt;</code> comes next rather than a switch already made; these data cannot separate the two. Never-breaking misconduct outputs are scarce (5), so the line-break comparison against them is only suggestive.`,
  ].map(p => `<p>${p}</p>`).join('');
}

fetch('data.json?v=4').then(r => r.json()).then(D => {
  text(D); timecourse(D); sameToken(D);
  newline(D, 'misconduct', '#nl-mis', 'Misconduct documents'); newline(D, 'accurate', '#nl-acc', 'Accurate-reporting documents');
  switchPoint(D); auroc(D); offTopic(D);
  const sc = $('#tc').parentElement; sc.scrollLeft = sc.scrollWidth;
});
