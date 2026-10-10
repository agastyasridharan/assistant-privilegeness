const state = { index: null, family: null, item: null, token: null, cache: new Map() };
const $ = (id) => document.getElementById(id);

function visibleToken(text) {
  if (text === "") return "\u2205";
  return text.replaceAll(" ", "\u00b7").replaceAll("\n", "\u21b5").replaceAll("\t", "\u21e5");
}

function fveColorValue(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

async function loadFamily(id) {
  if (!state.cache.has(id)) {
    const jlensPath = state.index.jlens_files?.[id];
    const [olensResponse, jlensResponse] = await Promise.all([
      fetch(state.index.files[id]),
      jlensPath ? fetch(jlensPath) : Promise.resolve(null)
    ]);
    if (!olensResponse.ok) throw new Error(`Could not load O-lens data for ${id}: ${olensResponse.status}`);
    const family = await olensResponse.json();
    if (jlensResponse) {
      if (!jlensResponse.ok) throw new Error(`Could not load J-Lens data for ${id}: ${jlensResponse.status}`);
      const jlens = await jlensResponse.json();
      family.items.forEach(item => {
        if (!jlens.items[item.id]) throw new Error(`Missing J-Lens item ${item.id}`);
        item.jlens = jlens.items[item.id];
        if (item.jlens.readouts.length !== item.tokens.length) throw new Error(`Token alignment failed for ${item.id}`);
      });
    }
    state.cache.set(id, family);
  }
  state.family = state.cache.get(id);
  renderTabs(id);
  $("family-title").textContent = state.family.family.title;
  $("family-description").textContent = state.family.family.description;
  $("family-kicker").textContent = `${state.family.items.length} prompt configuration${state.family.items.length === 1 ? "" : "s"}`;
  const select = $("prompt-select");
  select.innerHTML = state.family.items.map((item, i) => `<option value="${i}">${escapeHtml(item.label)}</option>`).join("");
  select.onchange = () => selectItem(Number(select.value));
  selectItem(0);
  history.replaceState(null, "", `#${id}`);
}

function renderTabs(active) {
  $("tabs").innerHTML = state.index.families.map(f =>
    `<button class="tab ${f.id === active ? "active" : ""}" data-family="${f.id}">${escapeHtml(f.title)} <small>${f.prompts}</small></button>`
  ).join("");
  document.querySelectorAll(".tab").forEach(button => {
    button.onclick = () => loadFamily(button.dataset.family);
  });
}

function selectItem(index) {
  state.item = state.family.items[index];
  state.token = null;
  $("prompt-label").textContent = state.item.label;
  renderTokens();
  selectToken(state.item.tokens.length - 1);
}

function renderTokens() {
  const node = $("tokens");
  const plain = $("plain-prompt");
  node.innerHTML = "";
  plain.innerHTML = "";
  state.item.tokens.forEach((token, i) => {
    const button = document.createElement("button");
    button.className = `token${token.startsWith("<|") ? " special" : ""}`;
    button.style.setProperty("--fve", fveColorValue(state.item.readouts[i].fve));
    button.textContent = visibleToken(token);
    button.title = `Token ${i} \u00b7 id ${state.item.token_ids[i]} \u00b7 FVE ${state.item.readouts[i].fve.toFixed(3)}`;
    button.onclick = () => selectToken(i);
    node.appendChild(button);

    const textToken = document.createElement("span");
    textToken.className = "plain-token";
    textToken.textContent = token;
    textToken.tabIndex = 0;
    textToken.setAttribute("role", "button");
    textToken.setAttribute("aria-label", `Token ${i}: ${visibleToken(token)}`);
    textToken.title = `Token ${i} · id ${state.item.token_ids[i]} · FVE ${state.item.readouts[i].fve.toFixed(3)}`;
    textToken.onclick = () => selectToken(i);
    textToken.onkeydown = event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectToken(i);
      }
    };
    plain.appendChild(textToken);
  });
}

function selectToken(index) {
  state.token = index;
  document.querySelectorAll(".token").forEach((n, i) => n.classList.toggle("active", i === index));
  document.querySelectorAll(".plain-token").forEach((n, i) => n.classList.toggle("active", i === index));
  const token = state.item.tokens[index];
  const reading = state.item.readouts[index];
  $("token-title").textContent = visibleToken(token);
  $("fve").textContent = reading.fve.toFixed(3);
  $("token-meta").textContent = `position ${index} / ${state.item.tokens.length - 1}  \u00b7  token id ${state.item.token_ids[index]}  \u00b7  layer ${state.item.layer}`;
  const maxWeight = Math.max(...reading.phrases.map(p => p[1]), 0.0001);
  $("phrases").innerHTML = reading.phrases.length ? reading.phrases.map(([text, weight]) => `
    <li class="phrase">
      <span class="phrase-fill" style="width:${Math.max(2, 100 * weight / maxWeight)}%"></span>
      <span class="phrase-row"><span class="phrase-text">${escapeHtml(text)}</span><span class="phrase-weight">${weight.toFixed(3)}</span></span>
    </li>`).join("") : `<li class="empty">No phrase received a positive reconstruction weight.</li>`;
  $("raw-sample").textContent = reading.samples.map(([text, fve], i) => `Sample ${i + 1} \u00b7 FVE ${fve.toFixed(3)}\n${text}`).join("\n\n");

  if (!state.item.jlens) return;
  const predictions = state.item.jlens.readouts[index];
  $("j-token-title").textContent = visibleToken(token);
  $("j-token-meta").textContent = `position ${index} / ${state.item.tokens.length - 1}  ·  token id ${state.item.token_ids[index]}  ·  residual after block ${state.item.jlens.layer}  ·  bars relative; probabilities absolute`;
  const maxProbability = Math.max(...predictions.map(p => p.prob), Number.MIN_VALUE);
  $("predictions").innerHTML = predictions.map((prediction, rank) => `
    <li class="prediction" title="Vocabulary id ${prediction.id} · logit ${prediction.logit.toFixed(3)} · tokenizer piece ${escapeHtml(prediction.piece)}">
      <span class="prediction-fill" style="width:${Math.max(1, 100 * prediction.prob / maxProbability)}%"></span>
      <span class="prediction-row">
        <span class="prediction-rank">${rank + 1}</span>
        <span class="prediction-text">${escapeHtml(visibleToken(prediction.text || prediction.piece))}</span>
        <span class="prediction-probability">${formatProbability(prediction.prob)}</span>
      </span>
    </li>`).join("");
}

function formatProbability(value) {
  if (value >= 0.1) return `${(value * 100).toFixed(1)}%`;
  if (value >= 0.001) return `${(value * 100).toFixed(2)}%`;
  return value.toExponential(2);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function wireViews() {
  document.querySelectorAll(".view-button").forEach(button => {
    button.onclick = () => {
      document.querySelectorAll(".view-button").forEach(b => b.classList.toggle("active", b === button));
      const tokenView = button.dataset.view === "tokens";
      $("tokens").classList.toggle("hidden", !tokenView);
      $("plain-prompt").classList.toggle("hidden", tokenView);
    };
  });
}

async function init() {
  wireViews();
  try {
    const response = await fetch("data/index.json");
    if (!response.ok) throw new Error(`Index returned ${response.status}`);
    state.index = await response.json();
    document.body.classList.toggle("no-jlens", !state.index.jlens);
    const lens = state.index.lens;
    const jlensMeta = state.index.jlens ? `<dt>J-Lens</dt><dd>${state.index.jlens.fit_prompts} prompt mean Jacobian</dd>` : "";
    $("run-meta").innerHTML = `
      <dt>Subject</dt><dd>T\u00fclu 3 70B RL</dd>
      <dt>O-lens</dt><dd>RL adapter</dd>
      ${jlensMeta}
      <dt>Layer</dt><dd>${lens.layer} / 80</dd>
      <dt>Readout</dt><dd>K=${lens.K}, N=${lens.N}, greedy</dd>`;
    $("coverage").textContent = `${state.index.summary.prompts} canonical prompts across ${state.index.families.length} experiment families; ${state.index.summary.tokens.toLocaleString()} token positions, each with a readout.`;
    const requested = location.hash.slice(1);
    const first = state.index.families.some(f => f.id === requested) ? requested : state.index.families[0].id;
    await loadFamily(first);
  } catch (error) {
    document.querySelector("main").innerHTML = `<section class="panel" style="padding:20px"><h2>Dashboard data unavailable</h2><p>${escapeHtml(error.message)}</p></section>`;
  }
}

init();
