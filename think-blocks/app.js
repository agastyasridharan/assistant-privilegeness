/* Charts and tables for the think-block page. DATA comes from data.js (built by build_site_data.py). */
const C = { accent: "#235fa6", acn: "#7a7268", a: "#b0702a", ink: "#2a2318", ink2: "#5e5245", ink3: "#8a7d6d",
  rule: "#e6ddd0", rule2: "#cfc4b4", mid: "#2f8a57", soft: "#c9d8ec", warm: "#ecd3b3" };
const FONT = "'Source Sans 3', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const CONFIG = { displayModeBar: false, responsive: true, scrollZoom: false };

function baseLayout(extra) {
  return Object.assign({ font: { family: FONT, size: 12.5, color: C.ink2 }, paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)", showlegend: false, dragmode: false,
    hoverlabel: { bgcolor: "#fffdf9", bordercolor: C.rule2, font: { family: FONT, size: 13, color: C.ink } } }, extra);
}
function axis(extra) {
  return Object.assign({ showgrid: false, zeroline: false, fixedrange: true, showline: true, linecolor: C.rule2, linewidth: 1,
    ticks: "outside", ticklen: 4, tickcolor: C.rule2, tickfont: { family: FONT, size: 12, color: C.ink2 } }, extra);
}
function ytitle(text) { return { text, font: { family: FONT, size: 12, color: C.ink3 }, standoff: 6 }; }
function draw(id, traces, layout) {
  const el = document.getElementById(id); if (!el) return;
  if (typeof Plotly === "undefined") { el.innerHTML = '<div class="chart-fallback">Chart library did not load.</div>'; return; }
  Plotly.react(el, traces, baseLayout(layout), CONFIG);
}
const pct = (v, d = 0) => v === null || v === undefined ? "–" : (v * 100).toFixed(d) + "%";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const narrow = () => window.innerWidth < 640;

function table(id, head, rows, cls) {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = `<table class="${cls || ""}"><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${
    rows.map(r => `<tr>${r.map((c, i) => i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

/* Figure 1: p(<think>) after raw text, by family */
function figPthink() {
  const d = DATA.pthink.slice().sort((a, b) => a.mean - b.mean);
  draw("chart-pthink", [{ type: "bar", orientation: "h", y: d.map(x => x.label), x: d.map(x => x.mean),
    marker: { color: d.map(x => x.mean > 0.5 ? C.accent : C.acn) },
    text: d.map(x => pct(x.mean)), textposition: "outside", cliponaxis: false, textfont: { size: 12, color: C.ink2 },
    hovertemplate: "%{y}: mean p = %{x:.2f}<extra></extra>" }],
    { height: 330, margin: { l: narrow() ? 150 : 190, r: 40, t: 6, b: 36 },
      xaxis: axis({ range: [0, 1.08], tickformat: ".0%", title: ytitle("mean P(<think> next) after context + \\n\\n") }),
      yaxis: axis({ showline: false, ticks: "" }) });
}

/* Figure 2: theme rate by position, raw and chat */
function figSites() {
  const tr = [];
  for (const [k, col, name] of [["raw", C.a, "Raw text + block"], ["chat", C.accent, "Chat template"]]) {
    const d = DATA.sites[k];
    tr.push({ type: "scatter", mode: "lines+markers", x: d.map(s => s.label), y: d.map(s => s.theme), name,
      line: { color: col, width: 2 }, marker: { size: 7, color: col },
      error_y: { type: "data", symmetric: false, array: d.map(s => s.hi - s.theme), arrayminus: d.map(s => s.theme - s.lo), color: col, thickness: 1, width: 3 },
      hovertemplate: name + " · %{x}: %{y:.0%}<extra></extra>" });
  }
  draw("chart-sites", tr, { height: 300, margin: { l: 52, r: 12, t: 10, b: 70 },
    xaxis: axis({ type: "category", tickangle: narrow() ? -50 : -30, categoryorder: "array", categoryarray: DATA.siteOrder }),
    yaxis: axis({ range: [0, 1.02], tickformat: ".0%", title: ytitle("readouts with a theme") }) });
}

/* Figure 3: block variants — theme rate vs cosine to the native blank-line vector */
function figVariants() {
  const d = DATA.variants, low = v => v.cos < 0.4;
  draw("chart-variants", [{ type: "scatter", mode: "markers+text", x: d.map(v => v.cos), y: d.map(v => v.theme),
    text: d.map(v => low(v) ? "" : v.label), customdata: d.map(v => v.label), textposition: "middle left",
    textfont: { size: 11.5, color: C.ink2 }, marker: { size: 10, color: d.map(v => v.fmt === "raw" ? C.a : C.accent) },
    hovertemplate: "%{customdata}<br>cosine %{x:.2f}, themes %{y:.0%}<extra></extra>" }],
    { height: 340, margin: { l: 52, r: 18, t: 10, b: 46 },
      annotations: [{ x: 0.18, y: 0.02, yanchor: "bottom", text: "\\n or a space inside<br>(raw and chat)", showarrow: false,
        font: { family: FONT, size: 11.5, color: C.ink2 } }],
      xaxis: axis({ range: [-0.05, 1.08], title: ytitle("cosine to native <think>\\n\\n vector (same context)") }),
      yaxis: axis({ range: [-0.04, 1.04], tickformat: ".0%", title: ytitle("readouts with a theme") }) });
}

/* Figure 4: interpolation between vectors */
function figInterp() {
  const cols = [C.a, C.accent, C.mid, C.acn];
  const tr = DATA.interp.map((p, i) => ({ type: "scatter", mode: "lines+markers", x: p.points.map(q => q.alpha), y: p.points.map(q => q.theme),
    name: p.label, line: { color: cols[i % cols.length], width: 2 }, marker: { size: 6, color: cols[i % cols.length] },
    hovertemplate: p.label + " · α=%{x}: %{y:.0%}<extra></extra>" }));
  draw("chart-interp", tr, { height: 300, margin: { l: 52, r: 12, t: 10, b: 46 }, showlegend: false,
    xaxis: axis({ tickvals: [0, 0.25, 0.5, 0.75, 1], title: ytitle("α (0 = blank-line mean, 1 = other endpoint)") }),
    yaxis: axis({ range: [-0.02, 1.04], tickformat: ".0%", title: ytitle("readouts with a theme") }) });
}

/* Figure 5: stability — per-vector theme counts out of 8 reads */
function figStability() {
  const tr = DATA.stability.map((s, i) => ({ type: "bar", x: [0,1,2,3,4,5,6,7,8], y: s.hist, name: s.label,
    marker: { color: [C.a, C.accent][i] }, opacity: 0.85, hovertemplate: s.label + ": %{y} vectors with %{x}/8<extra></extra>" }));
  draw("chart-stability", tr, { height: 260, barmode: "group", margin: { l: 52, r: 12, t: 10, b: 46 },
    xaxis: axis({ dtick: 1, title: ytitle("of 8 independent reads, how many had a theme") }),
    yaxis: axis({ title: ytitle("vectors") }) });
}

function tables() {
  const b = DATA.behavior;
  table("table-behavior", ["Arm"].concat(b.cats.map(c => c.label)),
    b.rows.map(r => [esc(r.label) + `<span class="sub">n = ${r.n}</span>`].concat(b.cats.map(c => {
      const v = r[c.key] || 0; return v >= 0.3 ? `<b>${pct(v)}</b>` : pct(v); }))));
  table("table-families", ["Context family", "n", "P(&lt;think&gt;)", "Raw: themes", "Chat: themes", "Raw: User-side", "Raw: other actors"],
    DATA.families.map(f => [esc(f.label), f.n, pct(f.pthink), pct(f.raw_theme), pct(f.chat_theme), pct(f.raw_user), pct(f.raw_other)]));
  table("table-nulls", ["Vector read", "Reads", "Themes", "Document", "Other actors", "User-side"],
    DATA.nulls.map(n => [esc(n.label), n.n, `<b>${pct(n.any_theme)}</b>`, pct(n.document), pct(n.other_actors), pct(n.user_perspective)]));
  table("table-vectors", ["Position", "Shared fraction", "Family decodable", "Raw vs chat (decodable)"],
    DATA.vectors.map(v => [esc(v.label), pct(v.shared), pct(v.family), v.format === null ? "–" : pct(v.format)]));
}

function examples() {
  for (const [id, list] of Object.entries(DATA.examples)) {
    const el = document.getElementById(id); if (!el) continue;
    el.innerHTML = list.map(e => `<li><span class="src">${esc(e.src)}</span>${esc(e.text)}</li>`).join("");
  }
}

function renderAll() { figPthink(); figSites(); figVariants(); figInterp(); figStability(); }
tables(); examples(); renderAll();
let rT; window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(renderAll, 150); });

/* footnotes: hover on desktop, tap anywhere (from the reference layout) */
const fns = document.querySelectorAll(".fn");
function place(fn) {
  const pop = fn.querySelector(".fn-pop"); pop.style.left = "0px";
  if (window.innerWidth <= 700) return;
  const r = pop.getBoundingClientRect(), over = r.right - (window.innerWidth - 16);
  if (over > 0) pop.style.left = (-over) + "px";
  const r2 = pop.getBoundingClientRect(); if (r2.left < 16) pop.style.left = (parseFloat(pop.style.left) + 16 - r2.left) + "px";
}
let hideT;
fns.forEach(fn => {
  fn.addEventListener("mouseenter", () => { if (window.matchMedia("(hover: hover)").matches) { clearTimeout(hideT); fns.forEach(f => f !== fn && f.classList.remove("show")); fn.classList.add("show"); place(fn); } });
  fn.addEventListener("mouseleave", () => { if (window.matchMedia("(hover: hover)").matches) hideT = setTimeout(() => fn.classList.remove("show"), 180); });
  fn.querySelector(".fn-ref").addEventListener("click", e => { e.preventDefault(); const on = !fn.classList.contains("show");
    fns.forEach(f => f.classList.remove("show")); if (on) { fn.classList.add("show"); place(fn); } });
});
document.addEventListener("click", e => { if (!e.target.closest(".fn")) fns.forEach(f => f.classList.remove("show")); });
document.addEventListener("keydown", e => { if (e.key === "Escape") fns.forEach(f => f.classList.remove("show")); });

/* table of contents: mobile copy, highlight current section */
document.querySelector(".toc-mobile .toc").innerHTML = document.querySelector(".page > .toc").innerHTML;
document.querySelectorAll(".toc a").forEach(a => a.addEventListener("click", () => {
  const t = document.getElementById(a.dataset.target); if (t && t.tagName === "DETAILS") t.open = true;
  const m = a.closest(".toc-mobile"); if (m) m.open = false;
}));
const heads = [...document.querySelectorAll("main h2[id], main h3[id]")];
function onScroll() {
  let cur = heads[0]; for (const h of heads) { if (h.getBoundingClientRect().top < 120) cur = h; }
  document.querySelectorAll(".toc a").forEach(a => a.classList.toggle("active", cur && a.dataset.target === cur.id));
}
window.addEventListener("scroll", () => requestAnimationFrame(onScroll), { passive: true }); onScroll();
