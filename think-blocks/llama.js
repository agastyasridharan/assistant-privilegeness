/* Charts and tables for the Llama (Tulu-3-70B) companion page. LDATA comes from llama-data.js (scripts/tulu_think_block/build_site_data.py). */
const C = { accent: "#235fa6", acn: "#7a7268", a: "#b0702a", ink: "#2a2318", ink2: "#5e5245", ink3: "#8a7d6d",
  rule: "#e6ddd0", rule2: "#cfc4b4", mid: "#2f8a57", soft: "#c9d8ec", warm: "#ecd3b3" };
const FONT = "'Source Sans 3', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const CONFIG = { displayModeBar: false, responsive: true, scrollZoom: false };
const baseLayout = extra => Object.assign({ font: { family: FONT, size: 12.5, color: C.ink2 }, paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)", showlegend: false, dragmode: false,
  hoverlabel: { bgcolor: "#fffdf9", bordercolor: C.rule2, font: { family: FONT, size: 13, color: C.ink } } }, extra);
const axis = extra => Object.assign({ showgrid: false, zeroline: false, fixedrange: true, showline: true, linecolor: C.rule2, linewidth: 1,
  ticks: "outside", ticklen: 4, tickcolor: C.rule2, tickfont: { family: FONT, size: 12, color: C.ink2 } }, extra);
const ytitle = text => ({ text, font: { family: FONT, size: 12, color: C.ink3 }, standoff: 6 });
function draw(id, traces, layout) {
  const el = document.getElementById(id); if (!el) return;
  if (typeof Plotly === "undefined") { el.innerHTML = '<div class="chart-fallback">Chart library did not load.</div>'; return; }
  Plotly.react(el, traces, baseLayout(layout), CONFIG);
}
const pct = (v, d = 0) => v === null || v === undefined ? "–" : (v * 100).toFixed(d) + "%";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const vis = s => String(s).replace(/\n/g, "\\n");
const narrow = () => window.innerWidth < 640;
function table(id, head, rows) {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${
    rows.map(r => `<tr>${r.map((c, i) => i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

/* Figure 1: Tulu's own switches — scene themes vs a forecast of the warning */
function figExisting() {
  const d = LDATA.existing, x = d.map(r => { const w = r.label.split(" "), h = Math.ceil(w.length / 2); return w.slice(0, h).join(" ") + "<br>" + w.slice(h).join(" "); });
  draw("chart-existing", [
    { type: "bar", x, y: d.map(r => r.warn), name: "Readout contains a warning-like phrase", marker: { color: C.a },
      hovertemplate: "%{y:.0%} warning-like<extra></extra>" },
    { type: "bar", x, y: d.map(r => r.theme), name: "Scene theme", marker: { color: C.accent },
      hovertemplate: "%{y:.0%} scene theme<extra></extra>" }],
    { height: 300, barmode: "group", bargap: 0.3, margin: { l: 52, r: 12, t: 10, b: narrow() ? 90 : 60 },
      xaxis: axis({ tickangle: narrow() ? -35 : 0 }), yaxis: axis({ range: [0, 1], tickformat: ".0%", title: ytitle("readouts") }) });
}

/* Figures 2–3: one arm's positions — scene theme rate (line) and how stereotyped the readouts are (bars) */
function figProfile(id, arm) {
  const p = LDATA.profiles.find(q => q.arm === arm).points, x = p.map((q, i) => i);
  const lab = p.map(q => q.site === "ctx-1" ? "last context" : q.site === "gen0" ? "Tulu’s next" : esc(vis(q.token)));
  draw(id, [
    { type: "bar", x, y: p.map(q => q.stock), name: "stock", marker: { color: C.warm, line: { color: C.a, width: 1 } },
      hovertemplate: "%{customdata}: %{y:.0%} share the most common phrase<extra></extra>", customdata: lab },
    { type: "scatter", mode: "lines+markers", x, y: p.map(q => q.theme), name: "theme", line: { color: C.accent, width: 2 },
      marker: { size: 7, color: C.accent }, customdata: lab,
      error_y: { type: "data", symmetric: false, array: p.map(q => q.hi - q.theme), arrayminus: p.map(q => q.theme - q.lo), color: C.accent, thickness: 1, width: 3 },
      hovertemplate: "%{customdata}: %{y:.0%} scene theme<extra></extra>" }],
    { height: 280, margin: { l: 52, r: 12, t: 10, b: 50 },
      xaxis: axis({ tickvals: x, ticktext: lab, tickangle: narrow() ? -45 : 0 }),
      yaxis: axis({ range: [0, 1.02], tickformat: ".0%", title: ytitle("readouts") }) });
}

function tables() {
  table("table-switch", ["Inserted before the switch", "Lens: reply opener", "Lens: warning-like", "Lens: scene theme", "Tulu refuses", "Tulu answers as assistant", "Tulu keeps writing"],
    LDATA.switch.map(r => [esc(r.label), pct(r.opener), pct(r.warn), pct(r.theme), `<b>${pct(r.refusal)}</b>`, pct(r.asst), pct(r.doc)]));
  table("table-behavior", ["After the context", "Answers as assistant", "Keeps writing", "Refuses", "Encyclopedic prose: answers"],
    LDATA.behavior.map(r => [esc(r.label), pct(r.asst), pct(r.doc), pct(r.refusal), pct(r.prose)]));
  table("table-stereo", ["Position", "Shared fraction", "Readouts with the stock phrase", "Stock phrase", "Scene theme"],
    LDATA.stereo.map(r => [esc(r.label), pct(r.shared), pct(r.stock), `<span class="q">${esc(r.phrase.replace(/↵/g, " ↵ "))}</span>`, pct(r.theme)]));
}

function examples() {
  for (const [id, list] of Object.entries(LDATA.examples)) {
    const el = document.getElementById(id); if (!el) continue;
    el.innerHTML = list.map(e => `<li><span class="src">${esc(e.src)}</span>${esc(e.text)}</li>`).join("");
  }
  const m = document.getElementById("ex-means");
  if (m) m.innerHTML = LDATA.means.map(e => `<li><span class="src">mean vector · ${esc(e.label)}</span>${esc(e.phrases.join(" / ").replace(/\n/g, "↵"))}</li>`).join("");
}

function renderAll() { figExisting(); figProfile("chart-asst", "raw_asst"); figProfile("chart-think", "raw_think"); }
tables(); examples(); renderAll();
let rT; window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(renderAll, 150); });
document.querySelector(".toc-mobile .toc").innerHTML = document.querySelector(".page > .toc").innerHTML;
document.querySelectorAll(".toc a").forEach(a => a.addEventListener("click", () => { const m = a.closest(".toc-mobile"); if (m) m.open = false; }));
const heads = [...document.querySelectorAll("main h2[id], main h3[id]")];
function onScroll() {
  let cur = heads[0]; for (const h of heads) { if (h.getBoundingClientRect().top < 120) cur = h; }
  document.querySelectorAll(".toc a").forEach(a => a.classList.toggle("active", cur && a.dataset.target === cur.id));
}
window.addEventListener("scroll", () => requestAnimationFrame(onScroll), { passive: true }); onScroll();
