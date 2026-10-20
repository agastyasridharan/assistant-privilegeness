const $=id=>document.getElementById(id);
const names={refusal_only:'Refusal only',both:'Assistance + refusal',assistance_only:'Assistance only',other:'Other',uncertain:'Unresolved',ungraded:'Ungraded'};
const colors={refusal_only:'#317663',both:'#c39443',assistance_only:'#aa665a',other:'#989898',uncertain:'#b5ab99'};
const state={index:null,setting:null,cell:null,item:null,version:0,model:"tulu",base:"data",jlens:false,behavior:false,olens:false};
const categories=["refusal_only","both","assistance_only","other","uncertain"];
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const visibleToken=t=>t.replaceAll(' ','·').replaceAll('\n','↵').replaceAll('\t','⇥')||'∅';
const condition=c=>`${c.condition==='unsafe'?'Misconduct':'Accurate reporting'} · ${c.format==='raw'?'raw prefix':'chat template'}`;
async function get(path){const r=await fetch(path+(path.includes("/translations/")?"?v=translations-2":path.includes("/qwen36/")?"?v=olens-1":""));if(!r.ok)throw Error(`${path}: ${r.status}`);return r.json();}
function overview(){
 if(state.model==='tulu'&&TuluExtended.index)return TuluExtended.overview();
 const groups=[];
 for(const objective of ['unsafe','benign'])for(const format of ['raw','assistant_turn']){
  const cells=state.index.cells.filter(c=>c.condition===objective&&c.format===format),counts={};
  for(const k of categories)counts[k]=cells.reduce((a,c)=>a+(c.counts[k]||0),0);
  const ungraded=cells.reduce((a,c)=>a+(c.ungraded||0),0),n=cells.reduce((a,c)=>a+c.retained,0)-ungraded,excluded=cells.reduce((a,c)=>a+c.excluded,0);
  groups.push(`<div class="bar-row"><span>${condition({condition:objective,format})}</span><div class="bar" aria-label="${escapeHtml(Object.entries(counts).map(([k,v])=>`${names[k]}: ${v}`).join('; '))}">${Object.entries(counts).map(([k,v])=>`<span class="segment" style="width:${100*v/n}%;background:${colors[k]}" title="${names[k]}: ${v}/${n} (${(100*v/n).toFixed(1)}%)">${v/n>.08?(100*v/n).toFixed(1)+'%':''}</span>`).join('')}</div><span title="${excluded} excluded; ${ungraded} ungraded">n=${n}<small class="missing-count">${ungraded} ungraded · ${excluded} excluded</small></span></div>`);
 }
 $('overview').innerHTML=groups.join('')+`<div class="legend">${categories.map(k=>`<span><i class="swatch" style="background:${colors[k]}"></i>${names[k]}</span>`).join('')}</div>`;
 const examples=state.index.samples.filter(r=>['both','refusal_only'].includes(r.category)&&state.index.cells.some(c=>c.cell===r.cell&&c.condition==='unsafe'&&c.format==='raw'));
 const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`Inspect all ${examples.length} raw misconduct outputs judged to contain refusal`;detail.append(summary);
 for(const r of examples){const c=state.index.cells.find(c=>c.cell===r.cell),a=document.createElement('a');a.href=`#${c.setting}/${c.cell}/${r.id}`;a.textContent=`${c.title} · sample ${r.sample+1} · ${names[r.category]}`;a.onclick=e=>{e.preventDefault();setting(c.setting,c.cell,r.id)};const p=document.createElement('p');p.append(a);detail.append(p);}
 $('overview').append(detail);
}
function setting(id, requestedCell=null, requestedSample=null, requestedToken=null){
 state.setting=id;const s=state.index.settings.find(s=>s.id===id);
 $('tabs').innerHTML=state.index.settings.map(s=>`<button class="tab ${s.id===id?'active':''}" data-setting="${s.id}">${escapeHtml(s.title)}</button>`).join('');
 document.querySelectorAll('[data-setting]').forEach(b=>b.onclick=()=>setting(b.dataset.setting));
 $('family-title').textContent=s.title;$('family-kicker').textContent='Four matched conditions';
 $('family-description').textContent='Same reporting setting; misconduct versus accurate-reporting objective, each as a raw prefix or a chat user message.';
 const cells=state.index.cells.filter(c=>c.setting===id);
 $('prompt-select').innerHTML=cells.map(c=>`<option value="${c.cell}">${condition(c)} · ${c.retained} retained</option>`).join('');
 $('prompt-select').onchange=()=>cell($('prompt-select').value);cell(cells.some(c=>c.cell===requestedCell)?requestedCell:cells[0].cell,requestedSample,requestedToken);
}
function cell(id, requestedSample=null, requestedToken=null){
 state.cell=state.index.cells.find(c=>c.cell===id);$('prompt-select').value=id;const samples=state.index.samples.filter(s=>s.cell===id);
 $('sample-select').innerHTML=samples.map(s=>`<option value="${s.id}">Sample ${String(s.sample+1).padStart(2,'0')} · ${names[s.category]} · ${s.finish_reason}</option>`).join('');
 $('sample-select').onchange=()=>loadSample($('sample-select').value).catch(showError);
 const chosen=samples.some(s=>s.id===requestedSample)?requestedSample:samples[0].id;$('sample-select').value=chosen;loadSample(chosen,requestedToken).catch(showError);
}
function showError(e){$('sample-status').textContent=`Unable to load this sample: ${e.message}`;}
async function loadSample(id,requestedToken=null){
 const version=++state.version;
 const [p,r]=await Promise.all([get(`${state.base}/prefixes/${state.cell.cell}.json`),get(`${state.base}/samples/${id}.json`)]);
 if(!state.jlens){
  const translations=await Promise.all(['prefixes/'+state.cell.cell,'samples/'+id].map(x=>getTranslation(`${state.base}/translations/${x}.json.gz`).catch(()=>({readouts:{}}))));
  await Promise.all([attachTranslations(p,translations[0]),attachTranslations(r,translations[1])]);
 }
 const extension=state.model==='tulu'?await TuluExtended.sample(state.cell.cell,id):null;
 if(version!==state.version)return;
 state.item={...r,tokens:p.tokens.concat(r.tokens),plain_tokens:(p.plain_tokens||p.tokens).concat(r.plain_tokens||r.tokens),token_ids:p.token_ids.concat(r.output_ids),readouts:p.readouts.concat(r.readouts),boundary:p.tokens.length,vocabulary:{...p.vocabulary,...r.vocabulary}};
 $('prompt-label').textContent=`${condition(state.cell)} · sample ${r.sample+1}`;
 const count=state.item.readouts.filter(x=>x&&x.status!=='excluded').length;const screened=state.item.readouts.filter(x=>x?.status==='excluded').length;
 $('sample-status').textContent=`${r.judgment?names[r.judgment.category]:"Ungraded"} · ${r.generated_tokens} generated tokens · stop: ${r.finish_reason}${r.finish_reason==='length'?' (capped; later behavior unobserved)':''} · ${count}/${state.item.tokens.length} readouts available${screened?` · ${screened} screened out`:""} · ${state.cell.excluded} excluded from this condition.`;
 $('evidence').innerHTML=r.judgment?['assistance','refusal'].map(k=>`<p><strong>${k[0].toUpperCase()+k.slice(1)}: ${escapeHtml(r.judgment.assessment[k].verdict)}</strong> — ${escapeHtml(r.judgment.assessment[k].explanation)}</p><p class="token-help">${(r.judgment.evidence[k]||[]).map(e=>`Line ${e.line}: “${escapeHtml(e.text)}”`).join('<br>')}</p>`).join('')+`<p class="token-help">Saved final judgment: ${escapeHtml(r.judgment.model)}; ${escapeHtml(r.judgment.status)}. Reviewed judgments take precedence; manual disagreements remain unresolved.</p>`:'<p>Missing primary judgment. This saved output is excluded from the classified-output percentage denominator.</p>';
 if(r.review_unavailable){const note=document.createElement('p');note.className='token-help';note.textContent='Selected for stronger review, but no review returned; displaying the primary judgment.';$('evidence').append(note);}
 if(r.saved_text_decode_mismatch)$('sample-status').textContent+=' Unicode display is decoded from the saved IDs; the original text field contained replacement characters.';
 if(state.behavior){
 $('sample-status').textContent=`${r.judgment?names[r.judgment.category]:"Ungraded"} · ${r.generated_tokens} generated tokens · stop: ${r.finish_reason}${r.finish_reason==='length'?' (capped; later behavior unobserved)':''} · ${state.cell.excluded} excluded from this condition.`;
 $('tokens').classList.add('hidden');$('plain-prompt').classList.remove('hidden');$('plain-prompt').replaceChildren();
 const before=document.createElement('span');before.textContent=r.prompt;const boundary=document.createElement('span');boundary.className='boundary';boundary.textContent='END OF SUPPLIED PROMPT · SAVED GENERATION BEGINS';const after=document.createElement('span');after.textContent=r.completion;$('plain-prompt').append(before,boundary,after);
 }else{
 if(extension)TuluExtended.apply(extension,p,r);
 renderTokens();
 const valid=Number.isInteger(requestedToken)&&requestedToken>=0&&requestedToken<state.item.tokens.length;
 selectToken(valid?requestedToken:Math.min(state.item.boundary,state.item.tokens.length-1));
 if(valid)document.querySelector(`#tokens [data-position="${requestedToken}"]`)?.scrollIntoView({block:'center'});
 }
 if(state.model==='tulu'){const link=document.createElement('a');link.href=`extended.html#${state.setting}/${state.cell.cell}/${r.id}`;link.textContent='View full extended output and separate behavior labels';$('sample-status').append(document.createTextNode(' · '),link);}
 if(state.behavior)history.replaceState(null,'',`#${state.setting}/${state.cell.cell}/${r.id}`);
}
function renderTokens(){
 const item=state.item;$('tokens').replaceChildren();$('plain-prompt').replaceChildren();
 item.tokens.forEach((t,i)=>{
  if(i===item.extension_boundary&&i<item.tokens.length)for(const id of ['tokens','plain-prompt']){const x=document.createElement('span');x.className='boundary';x.textContent='ORIGINAL WINDOW ENDS · CONDITIONAL EXTENSION · LENS READOUTS NOT COMPUTED';$(id).append(x);}
  if(i===item.boundary)for(const id of ['tokens','plain-prompt']){const x=document.createElement('span');x.className='boundary';x.textContent='END OF SUPPLIED PROMPT · SAVED GENERATION BEGINS';$(id).append(x);}
  for(const id of ['tokens','plain-prompt']){
   const b=document.createElement(id==='tokens'?'button':'span');b.className=id==='tokens'?`token${item.readouts[i]?'':' pending'}`:'plain-token';b.dataset.position=i;
   b.textContent=id==='tokens'?visibleToken(t):item.plain_tokens[i];b.style.setProperty('--fve',Math.max(0,Math.min(1,(state.jlens||state.olens)?0:(item.readouts[i]?.fve||0))));
   b.title=`Token ${i} · id ${item.token_ids[i]} · ${item.readouts[i]?(state.olens?(item.readouts[i].status==='excluded'?'Readout screened out':'O-Lens available · unweighted'):state.jlens?'J-Lens available':'FVE '+item.readouts[i].fve.toFixed(3)):'no saved readout'}`;
   b.onclick=()=>selectToken(i);b.tabIndex=0;b.setAttribute('role','button');b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectToken(i);}};$(id).append(b);
  }
 });
}

const hasChinese=t=>/[\u3400-\u9fff\u{20000}-\u{3134f}]/u.test(t);
async function getTranslation(path){
 const response=await fetch(path+'?v=translations-2');
 if(!response.ok)throw Error('Translation file unavailable');
 const decompressed=response.body.pipeThrough(new DecompressionStream('gzip'));
 return JSON.parse(await new Response(decompressed).text());
}
async function attachTranslations(source,sidecar){
 await Promise.all(Object.entries(sidecar.readouts||{}).map(async([i,tr])=>{
  const r=source.readouts[i];if(!r||r.status==='excluded')return;
  const original=r.text??JSON.stringify(r.phrases);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(original));
  const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  if(hash===tr.sha256)r._translations=tr.lines;
 }));
}
function translationMarkup(text,translation){
 if(!hasChinese(text))return '';
 const url='https://translate.google.com/?sl=zh-CN&tl=en&op=translate&text='+encodeURIComponent(text);
 const body=translation?`<span class="translation-label" title="${escapeHtml(translation.engine)}">English · ${translation.engine==='reviewed-translation'?'reviewed translation':'machine translation'}</span><span lang="en">${escapeHtml(translation.text)}</span>`:'<span class="translation-label">English translation not available</span>';
 return `<div class="readout-translation">${body}<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Compare in Google Translate ↗</a></div>`;
}

function selectToken(i){
 if(!state.item||!Number.isInteger(i)||i<0||i>=state.item.tokens.length)return;
 const hash=`#${state.setting}/${state.cell.cell}/${state.item.id}/token-${i}`;
 history.replaceState(null,'',hash);
 $('token-link').href=location.href;
 $('copy-token-link').textContent='Copy token link';
 const item=state.item,r=item.readouts[i];document.querySelectorAll('[data-position]').forEach(b=>b.classList.toggle('active',Number(b.dataset.position)===i));
 $('token-title').textContent=visibleToken(item.tokens[i]);$('fve').textContent=r&&!state.jlens&&!state.olens?r.fve.toFixed(3):'—';
 $('token-meta').textContent=`${i<item.boundary?'Prompt':'Continuation'} · position ${i}/${item.tokens.length-1} · token id ${item.token_ids[i]} · layer ${state.olens?56:state.jlens?50:64}`;
 if(!r){$('phrases').innerHTML=state.model==='tulu'?'<li class="empty">No O-Lens readout was computed for this token. No replay job is running. The full continuation and behavioral labels are available below.</li>':'<li class="empty">No readout available for this token.</li>';$('raw-sample').textContent='No saved readout.';return;}
 if(state.olens){
 if(r.status==='excluded'){$('phrases').innerHTML='<li class="empty">Readout screened out. This token remains in the saved continuation.</li>';$('raw-sample').textContent='Excluded by readout screening; text is not published.';return;}
 const phrases=r.text.split('\n').map(x=>x.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean);
 $('phrases').innerHTML=phrases.map((t,rank)=>`<li class="phrase"><span class="phrase-row"><span class="phrase-text">${escapeHtml(t)}</span></span>${translationMarkup(t,r._translations?.[rank])}</li>`).join('')||'<li class="empty">Empty sampled readout.</li>';
 $('raw-sample').textContent=`One sampled readout · ${r.generated_tokens} tokens · stop: ${r.finish_reason}${r.finish_reason==='length'?' (capped)':''}\n\n${r.text}`;return;
 }
 if(state.jlens){
 const max=Math.max(...r.map(p=>p[1]),Number.MIN_VALUE);
 $('phrases').innerHTML=r.map(([id,prob],rank)=>`<li class="prediction"><span class="prediction-fill" style="width:${100*prob/max}%"></span><span class="prediction-row"><span class="prediction-rank">${rank+1}</span><span class="prediction-text">${escapeHtml(visibleToken(item.vocabulary[id]))}</span><span class="prediction-probability">${(100*prob).toPrecision(4)}%</span></span></li>`).join('');
 $('raw-sample').textContent=JSON.stringify(r.map(([id,prob])=>({id,text:item.vocabulary[id],probability:prob})),null,2);return;
 }
 const max=Math.max(...r.phrases.map(p=>p[1]),.0001);
 $('phrases').innerHTML=r.phrases.map(([t,w],rank)=>`<li class="phrase"><span class="phrase-fill" style="width:${Math.max(2,100*w/max)}%"></span><span class="phrase-row"><span class="phrase-text">${escapeHtml(t)}</span><span class="phrase-weight">${w.toFixed(3)}</span></span>${translationMarkup(t,r._translations?.[rank])}</li>`).join('')||'<li class="empty">No positive reconstruction weights.</li>';
 $('raw-sample').textContent=r.samples.map(([t,f],i)=>`Sample ${i+1} · FVE ${f.toFixed(3)}\n${t}`).join('\n\n');
}
function openHash(){
 const [id,c,r,t]=location.hash.slice(1).split('/');
 const token=/^token-\d+$/.test(t||'')?Number(t.slice(6)):null;
 setting(state.index.settings.some(s=>s.id===id)?id:state.index.settings[0].id,c,r,token);
}
async function init(){
 $('copy-token-link').onclick=async()=>{
  try{await navigator.clipboard.writeText($('token-link').href);$('copy-token-link').textContent='Copied';}
  catch{$('copy-token-link').textContent='Copy the Token permalink below';}
 };

 document.querySelectorAll('.view-button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.view-button').forEach(x=>x.classList.toggle('active',x===b));$('tokens').classList.toggle('hidden',b.dataset.view!=='tokens');$('plain-prompt').classList.toggle('hidden',b.dataset.view==='tokens');});
 const requested=new URLSearchParams(location.search).get('model');
 $('model-select').onchange=()=>{const q=new URLSearchParams(location.search);q.set('model',$('model-select').value);location.href=`?${q}`;};
 state.model=['gemma_base','gemma_instruct','qwen36'].includes(requested)?requested:'tulu';state.olens=state.model==='qwen36';state.behavior=false;state.jlens=['gemma_base','gemma_instruct'].includes(state.model);state.base=state.model!=='tulu'?`data/${state.model}`:'data';$('model-select').value=state.model;
 document.querySelector('.translation-note').hidden=state.jlens;
 state.index=await get(`${state.base}/index.json`);
 if(!state.jlens){
  get(`${state.base}/translations/coverage.json`).then(c=>{
   $('translation-coverage').textContent=`English translations available for ${c.translated_lines.toLocaleString()} / ${c.chinese_lines.toLocaleString()} displayed lines containing Chinese. These are translation-coverage counts, not behavioral categories.`;
   const a=document.createElement('a');a.href=`${state.base}/translations/method.json`;a.textContent=' Translation method and limitations';$('translation-coverage').append(a);
  }).catch(()=>{});
 }
 $('run-meta').innerHTML=state.olens?'<dt>Subject</dt><dd>Qwen3.6-27B</dd><dt>Lens</dt><dd>O-Lens · unweighted</dd><dt>Block</dt><dd>56 (zero-indexed output)</dd><dt>Readout</dt><dd>One sample per token</dd>':state.behavior?'<dt>Subject</dt><dd>Qwen3.6-27B</dd><dt>Experiment</dt><dd>Behavior only · no lens</dd><dt>Chat thinking</dt><dd>Disabled</dd><dt>Generation cap</dt><dd>192 tokens</dd>':state.jlens?`<dt>Subject</dt><dd>Gemma 3 27B ${state.model==='gemma_base'?'Base':'IT'}</dd><dt>Lens</dt><dd>Published J-Lens</dd><dt>Layer</dt><dd>50 / 62</dd><dt>Readout</dt><dd>Top 12 · full-vocab probabilities</dd>`:'<dt>Subject</dt><dd>Tülu 3 70B RL</dd><dt>Lens</dt><dd>RL O-lens adapter</dd><dt>Layer</dt><dd>64 / 80</dd><dt>Readout</dt><dd>K=8, N=8, greedy</dd>';
 $('provenance').href=`${state.base}/provenance.json`;
 if(state.jlens){
 $('lens-heading').textContent='J-Lens readout';document.querySelector('.fve-badge').hidden=true;
 $('token-help').textContent='Click any prompt or continuation token. The lens reads the residual after the selected token and shows the top 12 next-token predictions, with full-vocabulary probabilities. Bar lengths are relative to the highest probability shown.';
 $('interpretation').textContent='The published checkpoint-specific Jacobian transports the residual after block 50 to the final-block basis, then the model’s final normalization and vocabulary head produce a token distribution. These are linear lens readouts, not sampled continuations or evidence of causal control. Public lens fits identify the model repositories but do not pin their exact revisions; replay uses our original frozen model revisions.';
 document.querySelector('.sample-detail summary').textContent='Raw token probabilities';
 }
 if(state.behavior){
 document.querySelector('.eyebrow').textContent='Behavioral trials · saved refusal experiments';document.querySelector('.dek').textContent='Saved Qwen3.6-27B continuations across twelve reporting settings: misconduct or accurate reporting, in raw or chat format. Select a setting, condition, and sample to inspect its text and behavior judgment.';
 document.body.classList.add('behavior-only');document.querySelector('.reading-panel').hidden=true;document.querySelector('.view-switch').hidden=true;
 $('token-help').textContent='Full supplied prompt and saved continuation. No lens readouts were computed.';
 $('interpretation').textContent='These are behavioral trials: twelve fixed reporting settings, two objectives, raw versus native chat formatting, and 64 samples per condition. Chat thinking is disabled through the native template; raw prefixes are unchanged and can themselves generate thinking markers. Those markers remain part of the observed text. Existing assistance/refusal rubrics classify visible behavior, not internal roles or causal mechanisms.';
 document.querySelector('.method > div:nth-child(2) p:not(.kicker)').textContent='New generations use the pinned Qwen3.6-27B checkpoint, temperature 1, top-p 1, no top-k restriction, and the native stop tokens. Exact input/output IDs and finish reasons are saved. The 192-token cap matches the earlier refusal trials; a capped output cannot rule out a later transition.';
 }
 if(state.olens){
 $('lens-heading').textContent='O-Lens readout · unweighted';document.querySelector('.fve-badge').hidden=true;
 $('token-help').textContent='Click any prompt or continuation token. Each readout describes the activation after that token at zero-indexed block 56. Descriptions have no reconstruction scores or phrase weights. Thinking markers and stop tokens are preserved.';
 $('interpretation').textContent='One stochastic O-Lens description per token, using olens_s3d_rl600 (temperature 0.8, top-p 0.95, cap 256). Subject activations are captured with the adapter disabled; the reader receives a normalized activation. These fallible descriptions do not establish a hidden assistant state or causal mechanism. Screened readouts are explicitly marked; original behavior judgments remain unchanged.';
 document.querySelector('.sample-detail summary').textContent='Raw sampled readout';
 document.querySelector('.method > div:nth-child(2) p:not(.kicker)').textContent='Exact saved Qwen3.6-27B input/output tokens are replayed without regeneration. Original trials used temperature 1, top-p 1, native stops and a 192-token cap. Chat thinking was disabled; raw prefixes could generate thinking markers. The lens scan preserves both. A capped continuation cannot rule out later switching.';
 }
 const s=state.index.summary;$('coverage').textContent=state.behavior?`${s.retained.toLocaleString()} retained outputs; ${s.excluded} exclusions; ${s.ungraded||0} ungraded. ${s.missing_selected_reviews||0} selected stronger reviews unavailable; primary labels retained where present. All 48 conditions generated. Missing judgments reflect failed API requests; classified-output percentages may be affected by this missingness. Snapshot ${new Date(state.index.updated_at*1000).toLocaleString()}.`:`${s.retained.toLocaleString()} retained outputs; ${s.excluded} exclusions; ${s.ungraded||0} ungraded. ${s.readout_positions_saved.toLocaleString()} / ${s.unique_readout_positions.toLocaleString()} unique token readouts saved. ${state.olens?`${s.readouts_retained.toLocaleString()} available; ${s.readouts_screened.toLocaleString()} screened out. ${s.missing_selected_reviews||0} selected stronger reviews unavailable; primary labels retained. `:""}Prompt readouts are reused across samples. Snapshot ${new Date(state.index.updated_at*1000).toLocaleString()}.`;
 if(state.model==='tulu')await TuluExtended.init();
 overview();openHash();window.addEventListener('hashchange',openHash);
}
init().catch(showError);
