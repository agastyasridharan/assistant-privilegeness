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

let D, P = {}, COL = {};
const LENS = {new: 'new lens', old: 'parent lens', rs: 'new lens · resample'};
const COND = {misconduct: 'misconduct', accurate: 'accurate-reporting'};

function hl(e) {
  const b = e.bullet, q = e.quote, i = q ? b.indexOf(q) : -1;
  if (i < 0) return esc(b);
  return esc(b.slice(0, i)) + '<mark>' + esc(q) + '</mark>' + esc(b.slice(i + q.length));
}
function exHTML(e, full) {
  const p = P[e.p];
  return `<div class="${full ? 'item' : 'ex'}" ${full ? `id="${esc(e.id)}"` : ''}>
    <div class="ex-meta"><span class="chip" style="--c:${COL[e.p]}">${esc(p.name)}</span>${e.subname ? esc(e.subname) + ' · ' : ''}<b>${esc(e.doc)}</b> · ${COND[e.cond]} · ${esc(e.loc)} · ${LENS[e.lens]}${e.r ? ' ' + e.r : ''}</div>
    <div class="ex-ctx">…${vis(e.before)}<mark>${vis(e.tok)}</mark></div>
    <div class="ex-read" style="--c:${COL[e.p]}">“${hl(e)}”</div>
    ${full && e.full ? `<details><summary>all bullets</summary><div class="full">${e.full.map(x => '• ' + esc(x)).join('<br>')}</div></details>` : ''}
    <a class="ex-meta" href="${esc(e.link)}" target="_blank" rel="noopener">open this token on the dashboard ↗</a>${e.lens !== 'new' ? ' <span class="ex-meta">(the dashboard shows the new-lens original readout)</span>' : ''}
  </div>`;
}
function pick(pred, key, k = 3) {
  const xs = D.ex.filter(pred);
  let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rank = e => (CJK.test(e.quote) ? 2 : 0) + (e.lens === 'new' ? 0 : 1) + ((h ^ e.n * 2654435761) >>> 0) / 4294967296;
  xs.sort((a, b) => rank(a) - rank(b));
  const out = [], seen = new Set();
  for (const e of xs) { if (seen.has(e.sid)) continue; seen.add(e.sid); out.push(e); if (out.length === k) break; }
  return {out, n: xs.length};
}
function examples(pred, key, what) {
  const {out, n} = pick(pred, key);
  if (!out.length) return '<p class="ex-meta">No example here.</p>';
  return `<div class="exh">${out.length} of ${n} example${n > 1 ? 's' : ''} ${what}</div>` + out.map(e => exHTML(e)).join('') +
    `<div class="ex-meta" style="margin-top:4px">All of them are in the catalog below.</div>`;
}

/* ---------- chart 1: rates ---------- */
function drawRate() {
  const svg = $('#rate'), W = 960, H = 380, m = {l: 200, r: 30, t: 10, b: 40};
  const rows = D.phen.map(p => p.id), band = (H - m.t - m.b) / rows.length;
  const mx = Math.max(...D.rate.map(r => r.hi * 1000)) * 1.25;
  const x = scale(0, mx, m.l, W - m.r);
  const step = mx > 20 ? 5 : mx > 8 ? 2 : mx > 4 ? 1 : .5;
  for (let v = 0; v <= mx; v += step) {
    el('line', {x1: x(v), x2: x(v), y1: m.t, y2: H - m.b, class: 'grid'}, svg);
    el('text', {x: x(v), y: H - m.b + 18, 'text-anchor': 'middle', class: 'tick'}, svg, fmt1(v));
  }
  el('text', {x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle', class: 'axlab'}, svg, 'readouts per 1,000 at the same tokens');
  const order = [['new', 'misconduct'], ['new', 'accurate'], ['old', 'misconduct'], ['old', 'accurate']];
  rows.forEach((pid, i) => {
    const y0 = m.t + i * band, bh = (band - 18) / 4;
    el('text', {x: m.l - 10, y: y0 + band / 2 - 2, 'text-anchor': 'end', style: 'font-size:16px;font-weight:600'}, svg, P[pid].name);
    el('text', {x: m.l - 10, y: y0 + band / 2 + 15, 'text-anchor': 'end', class: 'annot'}, svg, `${P[pid].count} new-lens examples`);
    order.forEach(([lens, cond], j) => {
      const r = D.rate.find(z => z.phen === pid && z.lens === lens && z.cond === cond);
      if (!r) return;
      const y = y0 + 9 + j * bh, c = cond === 'misconduct' ? css('--mis') : css('--acc');
      const w = Math.max(x(r.est * 1000) - m.l, r.k ? 2 : 0);
      const g = el('g', {}, svg);
      el('rect', {x: m.l, y: y + 1, width: Math.max(w, 1), height: bh - 3, rx: 2,
        fill: lens === 'new' ? c : 'white', stroke: c, 'stroke-width': lens === 'new' ? 0 : 1.6}, g);
      el('line', {x1: x(r.lo * 1000), x2: x(r.hi * 1000), y1: y + bh / 2, y2: y + bh / 2, stroke: '#2c2416', 'stroke-width': 1}, g);
      el('text', {x: x(r.hi * 1000) + 6, y: y + bh / 2 + 4, class: 'annot'}, g, `${fmt1(r.est * 1000)} (${r.k}/${r.n})`);
      el('rect', {x: m.l, y, width: W - m.r - m.l, height: bh, fill: 'transparent'}, g);
      hoverable(g, `rate|${pid}|${lens}|${cond}`, () =>
        `<div class="hd">${esc(P[pid].name)} · ${COND[cond]} · ${LENS[lens]}</div><div class="big">${fmt1(r.est * 1000)} per 1,000</div>` +
        `<div class="sub">${r.k} of ${r.n} readouts · 95% CI ${fmt1(r.lo * 1000)}–${fmt1(r.hi * 1000)}</div>` +
        examples(e => e.p === pid && e.lens === lens && e.cond === cond, `rate${pid}${lens}${cond}`, `from ${COND[cond]} documents, ${LENS[lens]}`));
    });
  });
}

/* ---------- chart 2: location heat table ---------- */
function drawLoc() {
  const svg = $('#loc'), locs = D.locs, ph = D.phen.map(p => p.id);
  const W = 960, rowH = 30, m = {l: 260, t: 46, r: 10};
  const H = m.t + rowH * locs.length + 10; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const cw = (W - m.l - m.r) / ph.length;
  ph.forEach((p, j) => el('text', {x: m.l + cw * j + cw / 2, y: 28, 'text-anchor': 'middle', style: 'font-size:15px;font-weight:600'}, svg, P[p].name));
  locs.forEach((L, i) => {
    const y = m.t + i * rowH;
    el('text', {x: m.l - 10, y: y + rowH / 2 + 5, 'text-anchor': 'end', style: 'font:13px var(--mono)'}, svg, L);
    ph.forEach((p, j) => {
      const c = (D.loccount[p] || {})[L] || 0, mx = Math.max(1, ...Object.values(D.loccount[p] || {}));
      const g = el('g', {}, svg);
      el('rect', {x: m.l + cw * j + 2, y: y + 2, width: cw - 4, height: rowH - 4, rx: 3, fill: c ? COL[p] : '#f3eee6', 'fill-opacity': c ? .15 + .85 * c / mx : 1}, g);
      el('text', {x: m.l + cw * j + cw / 2, y: y + rowH / 2 + 5, 'text-anchor': 'middle', style: `font:13px var(--mono);fill:${c / mx > .55 ? 'white' : '#3a3226'}`}, g, c || '·');
      if (c) hoverable(g, `loc|${p}|${L}`, () => `<div class="hd">${esc(P[p].name)} · ${esc(L)}</div><div class="big">${c}</div><div class="sub">new-lens readouts (original sample)</div>` +
        examples(e => e.p === p && e.loc === L && e.lens === 'new', `loc${p}${L}`, 'at this location'));
    });
  });
}

/* ---------- chart 3: subtypes ---------- */
function drawSub() {
  const svg = $('#sub'), W = 470, m = {l: 150, r: 46, t: 6};
  const rows = D.sub, rowH = 34, H = m.t + rows.length * rowH + 30; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const mx = Math.max(...rows.map(r => r.count)), x = scale(0, mx, m.l, W - m.r);
  let last = null;
  rows.forEach((r, i) => {
    const y = m.t + i * rowH;
    if (r.phen !== last && i) el('line', {x1: 10, x2: W - 10, y1: y, y2: y, class: 'grid'}, svg);
    last = r.phen;
    el('text', {x: m.l - 8, y: y + rowH / 2 + 5, 'text-anchor': 'end', style: 'font-size:14.5px'}, svg, r.label);
    const g = el('g', {}, svg);
    el('rect', {x: m.l, y: y + 7, width: Math.max(2, x(r.count) - m.l), height: rowH - 14, rx: 3, fill: COL[r.phen], 'fill-opacity': r.dim ? .45 : 1}, g);
    el('text', {x: x(r.count) + 6, y: y + rowH / 2 + 5, class: 'annot'}, g, r.count);
    el('rect', {x: 0, y, width: W, height: rowH, fill: 'transparent'}, g);
    hoverable(g, `sub|${r.phen}|${r.kind}`, () => `<div class="hd">${esc(P[r.phen].name)}</div><div class="big">${esc(r.label)}: ${r.count}</div><div class="sub">${esc(r.desc)}</div>` +
      examples(e => e.p === r.phen && e.sub === r.kind && e.lens === 'new', `sub${r.phen}${r.kind}`, 'of this kind'));
  });
  el('text', {x: m.l, y: H - 6, class: 'annot'}, svg, 'new-lens examples (original sample)');
}

/* ---------- chart 4: resample recurrence ---------- */
function drawRS() {
  const svg = $('#rs'), W = 470, H = 340, m = {l: 46, r: 10, t: 14, b: 84};
  const rows = D.rs, mx = Math.max(.05, ...rows.map(r => r.at)) * 1.15;
  const y = scale(0, mx, H - m.b, m.t), bw = (W - m.l - m.r) / rows.length;
  for (let v = 0; v <= mx + 1e-9; v += mx > .5 ? .2 : mx > .2 ? .1 : .05) {
    el('line', {x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'grid'}, svg);
    el('text', {x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'tick'}, svg, Math.round(v * 100) + '%');
  }
  rows.forEach((r, i) => {
    const x0 = m.l + i * bw, w = (bw - 22) / 2;
    [['at', r.at, 1, `where the original showed it (${r.npos} positions)`], ['base', r.base, .3, `at all ${r.nall} resampled positions`]].forEach(([kind, v, op, lab], j) => {
      const g = el('g', {}, svg), xx = x0 + 8 + j * (w + 6);
      el('rect', {x: xx, y: y(v), width: w, height: Math.max(1, y(0) - y(v)), rx: 3, fill: COL[r.phen], 'fill-opacity': op}, g);
      el('text', {x: xx + w / 2, y: y(v) - 5, 'text-anchor': 'middle', class: 'annot'}, g, v >= .1 ? Math.round(v * 100) + '%' : (v * 100).toFixed(1) + '%');
      el('rect', {x: xx, y: m.t, width: w, height: H - m.b - m.t, fill: 'transparent'}, g);
      hoverable(g, `rs|${r.phen}|${kind}`, () => `<div class="hd">${esc(P[r.phen].name)}</div><div class="big">${(v * 100).toFixed(1)}% of resamples</div><div class="sub">${esc(lab)}</div>` +
        examples(e => e.p === r.phen && e.lens === 'rs' && (kind === 'base' || e.orig), `rs${r.phen}${kind}`, kind === 'at' ? 'from resamples at those positions' : 'from resamples'));
    });
    P[r.phen].name.split(' ').reduce((ls, w) => { const l = ls[ls.length - 1]; if (l && (l + ' ' + w).length <= 13) ls[ls.length - 1] = l + ' ' + w; else ls.push(w); return ls; }, []).forEach((ln, li) =>
      el('text', {x: x0 + bw / 2, y: H - m.b + 18 + li * 16, 'text-anchor': 'middle', style: 'font-size:14px;font-weight:600'}, svg, ln));
  });
  el('text', {x: m.l, y: H - 22, class: 'annot'}, svg, 'solid: positions where the original readout showed it');
  el('text', {x: m.l, y: H - 8, class: 'annot'}, svg, 'faint: all resampled raw positions');
}

/* ---------- catalog ---------- */
const F = {p: 'all', lens: 'new', cond: 'all', q: ''};
let shown = 60;
function seg(id, opts, key) {
  const box = $(id);
  for (const [v, lab] of opts) {
    const b = document.createElement('button'); b.textContent = lab; b.setAttribute('aria-pressed', F[key] === v);
    b.onclick = () => { F[key] = v; box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); shown = 60; render(); };
    box.appendChild(b);
  }
}
function render() {
  const q = F.q.toLowerCase();
  const xs = D.ex.filter(e => (F.p === 'all' || e.p === F.p) && (F.lens === 'all' || e.lens === F.lens) && (F.cond === 'all' || e.cond === F.cond) &&
    (!q || (e.bullet + ' ' + e.doc + ' ' + e.before).toLowerCase().includes(q)));
  $('#count').textContent = `${xs.length} example${xs.length === 1 ? '' : 's'}`;
  $('#list').innerHTML = xs.slice(0, shown).map(e => exHTML(e, true)).join('');
  $('#more').hidden = xs.length <= shown;
  $('#more').textContent = `show more (${xs.length - shown} left)`;
}

fetch('data.json?v=1').then(r => r.json()).then(d => {
  D = d;
  D.phen.forEach(p => { P[p.id] = p; COL[p.id] = css('--' + p.id); });
  D.ex.forEach((e, i) => { e.n = i; });
  $('#dek').innerHTML = D.dek;
  $('#phen').innerHTML = D.phen.map(p => `<li style="--c:${COL[p.id]}"><b>${esc(p.name)}</b><div class="n">${p.count} new-lens examples · ${p.samples} outputs</div>${esc(p.short)}<br><a href="#" data-p="${p.id}">browse them ↓</a></li>`).join('');
  $('#phen').querySelectorAll('a').forEach(a => a.onclick = ev => { ev.preventDefault(); $('#f-phen').querySelectorAll('button')[1 + D.phen.findIndex(p => p.id === a.dataset.p)].click(); $('#list').scrollIntoView({behavior: 'smooth'}); });
  $('#sub-cap').textContent = D.sub_cap;
  $('#defs').innerHTML = D.phen.map(p => `<tr><td style="color:${COL[p.id]}">${esc(p.name)}</td><td>${esc(p.def)}</td></tr>`).join('');
  $('#notes').innerHTML = D.notes.map(n => `<p>${n}</p>`).join('');
  drawRate(); drawLoc(); drawSub(); drawRS();
  seg('#f-phen', [['all', 'all']].concat(D.phen.map(p => [p.id, p.name])), 'p');
  seg('#f-lens', [['new', 'new lens'], ['old', 'parent lens'], ['rs', 'resamples'], ['all', 'all lenses']], 'lens');
  seg('#f-cond', [['all', 'both'], ['misconduct', 'misconduct'], ['accurate', 'accurate']], 'cond');
  $('#f-q').oninput = e => { F.q = e.target.value; shown = 60; render(); };
  $('#more').onclick = () => { shown += 100; render(); };
  render();
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
});
