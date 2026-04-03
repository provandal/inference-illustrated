# KV Cache Explorer — Animation Prototypes (Source Code Reference)

These are the interactive animation prototypes developed during curriculum design sessions.
They are NOT production-ready — they are reference implementations showing the interaction
patterns, data structures, and visual approaches that Claude Code should use when building
the actual React app.

**Key notes for Claude Code:**
- These are standalone HTML/JS widgets. Production versions should be React components
  with Vite + Tailwind + D3, matching the Post-Training Explorer stack.
- Color values use CSS variables from the claude.ai design system. The production app
  should use its own Tailwind theme.
- The pedagogical content (narration text, hidden state data, attention weights) is
  authoritative — use it as-is.
- All refinement notes in `kv_cache_explorer_curriculum.md` should be applied during
  the production build.

---

## Prototype 1: KV Cache Token-by-Token Explainer (early, superseded)

This was the first attempt at showing KV cache mechanics with actual Q, K, V math.
It shows the attention score calculation step by step with real numbers.
**Status:** Concept validated but too much "how" without enough "why." The curriculum
was restructured to start with the Telephone Problem (Stop 1) before showing Q, K, V
mechanics (Stops 3-7).

**Reuse for:** Stops 5-7 (dot product, softmax, weighted sum) — the step-by-step
math display pattern with actual numbers is the right approach for those stops.

```html
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .wrap { font-family: var(--font-sans); padding: 1rem 0; }
  .step-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .step-nav button { font-size: 13px; padding: 6px 14px; }
  .step-dots { display: flex; gap: 6px; margin-left: 8px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-border-tertiary); transition: background .2s; }
  .dot.active { background: var(--color-text-info); }
  .dot.done { background: var(--color-border-secondary); }
  .phase-label { font-size: 12px; color: var(--color-text-tertiary); margin-left: auto; font-family: var(--font-mono); }
  .scene { min-height: 480px; }
  .tok-row { display: flex; gap: 6px; margin-bottom: 1.5rem; align-items: center; }
  .tok {
    padding: 6px 12px; border-radius: var(--border-radius-md); font-size: 13px; font-weight: 500;
    border: 0.5px solid var(--color-border-tertiary); color: var(--color-text-primary);
    background: var(--color-background-primary); transition: all .25s;
  }
  .tok.past { background: #E1F5EE; border-color: #1D9E75; color: #085041; }
  .tok.current { background: #EEEDFE; border-color: #7F77DD; color: #3C3489; }
  .tok.future { opacity: 0.3; }
  .vec-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  .vec-table th { text-align: left; font-weight: 500; padding: 6px 10px; font-size: 12px; color: var(--color-text-secondary); border-bottom: 0.5px solid var(--color-border-tertiary); }
  .vec-table td { padding: 5px 10px; font-family: var(--font-mono); font-size: 12px; color: var(--color-text-primary); vertical-align: middle; }
  .vec-table tr { transition: background .2s; }
  .vec-table tr.highlight { background: var(--color-background-info); }
  .vec-label { font-weight: 500; font-family: var(--font-sans); font-size: 13px; }
  .vec-nums { display: inline-flex; gap: 4px; }
  .vn { display: inline-block; min-width: 32px; text-align: right; padding: 2px 4px; border-radius: 3px; transition: background .3s, color .3s; }
  .vn.hot { background: #FAEEDA; color: #854F0B; }
  .math-line { font-family: var(--font-mono); font-size: 13px; color: var(--color-text-primary); line-height: 2.2; padding: 8px 12px; background: var(--color-background-secondary); border-radius: var(--border-radius-md); margin: 10px 0; overflow-x: auto; }
  .math-line .op { color: var(--color-text-secondary); }
  .math-line .result { font-weight: 500; padding: 2px 6px; border-radius: 4px; }
  .math-line .result.high { background: #FAEEDA; color: #854F0B; }
  .math-line .result.mid { background: #E6F1FB; color: #0C447C; }
  .math-line .result.low { background: var(--color-background-secondary); color: var(--color-text-tertiary); }
  .attn-bar-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 13px; }
  .attn-bar-label { min-width: 50px; font-weight: 500; color: var(--color-text-primary); }
  .attn-bar-track { flex: 1; height: 20px; background: var(--color-background-secondary); border-radius: 4px; position: relative; overflow: hidden; }
  .attn-bar-fill { height: 100%; border-radius: 4px; transition: width .5s ease; }
  .attn-bar-val { min-width: 44px; text-align: right; font-family: var(--font-mono); font-size: 12px; color: var(--color-text-secondary); }
  .output-vec { display: flex; gap: 6px; align-items: center; margin: 8px 0; flex-wrap: wrap; }
  .narration { font-size: 13px; color: var(--color-text-secondary); line-height: 1.7; padding: 12px 14px; background: var(--color-background-secondary); border-radius: var(--border-radius-md); margin-top: 1rem; }
  .narration strong { color: var(--color-text-primary); font-weight: 500; }
  .cache-badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 10px; margin-left: 6px; font-weight: 500; }
  .cache-badge.reused { background: #E1F5EE; color: #0F6E56; }
  .cache-badge.new { background: #EEEDFE; color: #534AB7; }
  .section-label { font-size: 12px; font-weight: 500; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 6px; }
  @media (prefers-color-scheme: dark) {
    .tok.past { background: #085041; border-color: #5DCAA5; color: #9FE1CB; }
    .tok.current { background: #3C3489; border-color: #AFA9EC; color: #CECBF6; }
    .vn.hot { background: #633806; color: #FAC775; }
    .math-line .result.high { background: #633806; color: #FAC775; }
    .math-line .result.mid { background: #0C447C; color: #B5D4F4; }
    .cache-badge.reused { background: #085041; color: #5DCAA5; }
    .cache-badge.new { background: #3C3489; color: #AFA9EC; }
  }
</style>
<div class="wrap">
  <div class="step-nav">
    <button onclick="prev()" id="btn-prev">&#8592; Back</button>
    <button onclick="next()" id="btn-next">Next step &#8594;</button>
    <div class="step-dots" id="dots"></div>
    <span class="phase-label" id="phase"></span>
  </div>
  <div class="tok-row" id="tokens"></div>
  <div class="scene" id="scene"></div>
  <div class="narration" id="narr"></div>
</div>
<script>
const TOKENS = ['The', 'cat', 'sat', 'on'];
const DIM = 4;

const Ks = [
  [0.8, -0.3, 0.5, 0.1],
  [0.2, 0.9, -0.4, 0.6],
  [-0.1, 0.4, 0.7, -0.5],
  [0.5, -0.2, 0.3, 0.8],
];
const Vs = [
  [0.3, 0.7, -0.2, 0.4],
  [-0.5, 0.1, 0.8, 0.3],
  [0.6, -0.3, 0.4, 0.9],
  [0.1, 0.5, -0.6, 0.2],
];
const Qs = [
  [0.6, -0.1, 0.4, 0.3],
  [0.1, 0.7, -0.2, 0.5],
  [-0.3, 0.5, 0.6, -0.1],
  [0.4, -0.4, 0.2, 0.7],
];

const TOTAL_STEPS = 16;
let step = 0;

function dot(a, b) { return a.reduce((s, v, i) => s + v * b[i], 0); }
function softmax(arr) {
  const m = Math.max(...arr);
  const e = arr.map(v => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / s);
}

function getTokenStep(s) {
  if (s < 1) return { tok: -1, phase: 'start' };
  if (s <= 4) return { tok: 0, phase: ['embed', 'show_kv', 'dot', 'softmax_output'][s - 1] };
  if (s <= 8) return { tok: 1, phase: ['embed', 'show_kv', 'dot', 'softmax_output'][s - 5] };
  if (s <= 12) return { tok: 2, phase: ['embed', 'show_kv', 'dot', 'softmax_output'][s - 9] };
  return { tok: 3, phase: ['embed', 'show_kv', 'dot', 'softmax_output'][s - 13] };
}

function fmtV(v) { return v >= 0 ? '\u2007' + v.toFixed(1) : v.toFixed(1); }
function fmtArr(arr, hotIdx) {
  return arr.map((v, i) => '<span class="vn' + (hotIdx !== undefined && i === hotIdx ? ' hot' : '') + '">' + fmtV(v) + '</span>').join(' ');
}

function render() {
  const { tok, phase } = getTokenStep(step);
  const curTok = tok;

  let dotsH = '';
  for (let i = 0; i <= TOTAL_STEPS; i++) {
    const cls = i === step ? 'active' : i < step ? 'done' : '';
    dotsH += '<div class="dot ' + cls + '"></div>';
  }
  document.getElementById('dots').innerHTML = dotsH;
  document.getElementById('btn-prev').disabled = step === 0;
  document.getElementById('btn-next').disabled = step >= TOTAL_STEPS;

  const phaseNames = { start: 'ready', embed: 'embed token', show_kv: 'K, V vectors', dot: 'Q \u00b7 K scores', softmax_output: 'softmax \u2192 output' };
  document.getElementById('phase').textContent = tok >= 0 ? 'token ' + (tok + 1) + '/' + TOKENS.length + ' \u2014 ' + phaseNames[phase] : 'ready';

  let tokH = '';
  for (let i = 0; i < TOKENS.length; i++) {
    let cls = 'tok';
    if (i < curTok) cls += ' past';
    else if (i === curTok && curTok >= 0) cls += ' current';
    else cls += ' future';
    tokH += '<div class="' + cls + '">' + TOKENS[i] + '</div>';
  }
  document.getElementById('tokens').innerHTML = tokH;

  let html = '';
  let narr = '';

  if (phase === 'start') {
    narr = 'We have 4 tokens to generate. For each one, the model produces three vectors: a <strong>Query</strong> (Q) \u2014 "what am I looking for?", a <strong>Key</strong> (K) \u2014 "what do I contain?", and a <strong>Value</strong> (V) \u2014 "what information do I carry?" The K and V get cached. Let\'s step through it.';
    html = '<div style="text-align:center;padding:3rem 0;color:var(--color-text-tertiary);font-size:14px;">Press <strong style="color:var(--color-text-primary)">Next step</strong> to begin generating tokens.</div>';
  }

  if (phase === 'embed') {
    narr = '<strong>"' + TOKENS[curTok] + '"</strong> enters the attention layer. The model multiplies the token\'s embedding by three weight matrices (W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub>) to produce Q, K, and V vectors. These are just lists of numbers \u2014 here simplified to 4 dimensions. In a real model like Llama-70B, each vector has 128 dimensions per attention head across 80 heads.';
    html += '<div class="section-label">Computing Q, K, V for "' + TOKENS[curTok] + '"</div>';
    html += '<div class="math-line">embedding("' + TOKENS[curTok] + '") \u00d7 W<sub>Q</sub> <span class="op">=</span> Q = [ ' + fmtArr(Qs[curTok]) + ' ]</div>';
    html += '<div class="math-line">embedding("' + TOKENS[curTok] + '") \u00d7 W<sub>K</sub> <span class="op">=</span> K = [ ' + fmtArr(Ks[curTok]) + ' ]</div>';
    html += '<div class="math-line">embedding("' + TOKENS[curTok] + '") \u00d7 W<sub>V</sub> <span class="op">=</span> V = [ ' + fmtArr(Vs[curTok]) + ' ]</div>';
  }

  if (phase === 'show_kv') {
    narr = 'K and V for <strong>"' + TOKENS[curTok] + '"</strong> are now appended to the cache. ' + (curTok > 0 ? 'The ' + curTok + ' previous entries (' + TOKENS.slice(0, curTok).map(function(t) { return '"' + t + '"'; }).join(', ') + ') are already there \u2014 <strong>no recomputation needed</strong>. This is the whole point of the KV cache.' : 'This is the first entry. As we generate more tokens, the cache will grow \u2014 and every entry stays, avoiding recomputation.');
    html += '<div class="section-label">KV cache after "' + TOKENS[curTok] + '"</div>';
    html += '<table class="vec-table"><tr><th>Token</th><th>Key vector</th><th>Value vector</th><th></th></tr>';
    for (let i = 0; i <= curTok; i++) {
      const isNew = i === curTok;
      html += '<tr class="' + (isNew ? 'highlight' : '') + '"><td class="vec-label">' + TOKENS[i] + '</td><td>[ ' + fmtArr(Ks[i]) + ' ]</td><td>[ ' + fmtArr(Vs[i]) + ' ]</td><td><span class="cache-badge ' + (isNew ? 'new' : 'reused') + '">' + (isNew ? 'new' : 'cached') + '</span></td></tr>';
    }
    html += '</table>';
  }

  if (phase === 'dot') {
    const sqrtD = Math.sqrt(DIM);
    let rawScores = [];
    for (let i = 0; i <= curTok; i++) rawScores.push(dot(Qs[curTok], Ks[i]));
    const scaled = rawScores.map(function(s) { return s / sqrtD; });

    narr = 'Now the <strong>Query</strong> for "' + TOKENS[curTok] + '" asks: "How relevant is each previous token to me?" It does this by computing the <strong>dot product</strong> of Q with each cached Key. Multiply element-by-element, then sum. A higher score means more relevance. We divide by \u221a' + DIM + ' = ' + sqrtD.toFixed(1) + ' to keep the numbers from getting too large (this is the "scaled" in "scaled dot-product attention").';
    html += '<div class="section-label">Q \u00b7 K dot products (then scale by \u00f7 \u221a' + DIM + ')</div>';
    html += '<div style="font-size:12px;color:var(--color-text-tertiary);margin-bottom:8px;">Q<sub>' + TOKENS[curTok] + '</sub> = [ ' + fmtArr(Qs[curTok]) + ' ]</div>';
    for (let i = 0; i <= curTok; i++) {
      const terms = Qs[curTok].map(function(q, d) { return '(' + fmtV(q) + ' \u00d7 ' + fmtV(Ks[i][d]) + ')'; }).join(' + ');
      const rawStr = rawScores[i].toFixed(2);
      const scaledStr = scaled[i].toFixed(2);
      const mag = Math.abs(scaled[i]);
      const cls = mag > 0.3 ? 'high' : mag > 0.1 ? 'mid' : 'low';
      html += '<div class="math-line">Q \u00b7 K<sub>' + TOKENS[i] + '</sub> = ' + terms + ' = ' + rawStr + ' <span class="op">\u00f7 ' + sqrtD.toFixed(1) + ' =</span> <span class="result ' + cls + '">' + scaledStr + '</span></div>';
    }
  }

  if (phase === 'softmax_output') {
    const sqrtD = Math.sqrt(DIM);
    let rawScores = [];
    for (let i = 0; i <= curTok; i++) rawScores.push(dot(Qs[curTok], Ks[i]) / sqrtD);
    const weights = softmax(rawScores);
    let output = [0, 0, 0, 0];
    for (let i = 0; i <= curTok; i++) {
      for (let d = 0; d < DIM; d++) output[d] += weights[i] * Vs[i][d];
    }

    narr = 'Softmax converts the raw scores into <strong>probabilities that sum to 1</strong>. These are the <strong>attention weights</strong> \u2014 they say how much "' + TOKENS[curTok] + '" should "listen to" each previous token. Then we multiply each token\'s <strong>Value</strong> vector by its weight and sum them all up. The result is "' + TOKENS[curTok] + '"\'s context-enriched representation \u2014 a blend of information from all the tokens it attended to.';

    html += '<div class="section-label">Softmax \u2192 attention weights</div>';
    const maxW = Math.max.apply(null, weights);
    for (let i = 0; i <= curTok; i++) {
      const pct = (weights[i] * 100).toFixed(1);
      const barW = (weights[i] / maxW * 100).toFixed(0);
      const hue = weights[i] > 0.3 ? '#BA7517' : weights[i] > 0.2 ? '#378ADD' : '#B4B2A9';
      html += '<div class="attn-bar-row"><span class="attn-bar-label">"' + TOKENS[i] + '"</span><div class="attn-bar-track"><div class="attn-bar-fill" style="width:' + barW + '%;background:' + hue + '"></div></div><span class="attn-bar-val">' + pct + '%</span></div>';
    }

    html += '<div class="section-label" style="margin-top:20px;">Weighted sum of Values \u2192 output</div>';
    let sumParts = [];
    for (let i = 0; i <= curTok; i++) {
      sumParts.push(weights[i].toFixed(2) + ' \u00d7 V<sub>' + TOKENS[i] + '</sub>');
    }
    html += '<div class="math-line" style="font-size:12px;">' + sumParts.join(' <span class="op">+</span> ') + '</div>';
    html += '<div class="math-line">output = [ ' + output.map(function(v) { return '<span class="vn">' + v.toFixed(2) + '</span>'; }).join(' ') + ' ]</div>';

    if (curTok < TOKENS.length - 1) {
      html += '<div style="margin-top:16px;padding:10px 14px;background:var(--color-background-info);border-radius:var(--border-radius-md);font-size:13px;color:var(--color-text-info);">Done with "' + TOKENS[curTok] + '". Next token "' + TOKENS[curTok + 1] + '" will reuse all ' + (curTok + 1) + ' cached K,V pairs and compute only 1 new set.</div>';
    } else {
      html += '<div style="margin-top:16px;padding:10px 14px;background:var(--color-background-success);border-radius:var(--border-radius-md);font-size:13px;color:var(--color-text-success);">All 4 tokens generated. The KV cache saved us from recomputing K,V for previous tokens at every step.</div>';
    }
  }

  document.getElementById('scene').innerHTML = html;
  document.getElementById('narr').innerHTML = narr;
}

function next() { if (step < TOTAL_STEPS) { step++; render(); } }
function prev() { if (step > 0) { step--; render(); } }

document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') prev();
});

render();
</script>
```

---

## Prototype 2: Stop 1 — The Telephone Problem (v5/v6 — current best)

This is the latest iteration of Stop 1. It includes the mechanics explanation
(hidden state, weight matrices W/U, training/inference) and the word-by-word
RNN processing with honest hidden state decay.

**Status:** Flow and data are solid. Needs the polish pass items from the
refinement notes (transformer framing, terminology definitions, narration
quality improvements, hidden state honesty disclosure).

**Key data structures to preserve:**
- The WORDS array and sentence
- The MEM array (hidden state concepts at each step — these are step-honest)
- The NOTES object (warning callouts at key decay moments)
- The NARRS object (per-word narration text)
- The ATTN array (attention weights for the reveal)

```html
<style>
*{box-sizing:border-box;margin:0;padding:0}
.w{font-family:var(--font-sans);padding:1rem 0}
.nav{display:flex;align-items:center;gap:8px;margin-bottom:1.25rem;flex-wrap:wrap}
.nav button{font-size:13px;padding:6px 14px}
.ctr{font-size:12px;color:var(--color-text-tertiary);font-family:var(--font-mono);margin-left:auto}
.sent{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:1.25rem}
.tk{padding:5px 9px;font-size:13px;border-radius:5px;border:0.5px solid transparent;color:var(--color-text-primary);transition:all .35s;line-height:1.3}
.tk.done{background:var(--color-background-secondary);border-color:var(--color-border-tertiary);color:var(--color-text-secondary)}
.tk.cur{background:#EEEDFE;border-color:#7F77DD;color:#3C3489;font-weight:500}
.tk.wait{opacity:.28}
.tk.subj{border-bottom:2.5px solid #EF9F27}
.tk.targ{border-bottom:2.5px solid #7F77DD}
.ib{padding:10px 14px;font-size:12px;line-height:1.6;margin:10px 0;border-radius:var(--border-radius-md);background:var(--color-background-secondary);color:var(--color-text-secondary)}
.ib strong{color:var(--color-text-primary);font-weight:500}
.fm{font-family:var(--font-mono);font-size:13px;padding:8px 14px;background:var(--color-background-secondary);border-radius:var(--border-radius-md);margin:8px 0;color:var(--color-text-primary);text-align:center}
.ud{display:flex;align-items:center;justify-content:center;gap:8px;margin:14px 0;flex-wrap:wrap}
.ub{padding:7px 11px;border-radius:var(--border-radius-md);font-size:12px;text-align:center;line-height:1.4}
.ui{background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);color:var(--color-text-secondary);min-width:80px}
.ui.on{background:#EEEDFE;border-color:#7F77DD;color:#3C3489}
.ut{background:var(--color-background-primary);border:1.5px solid var(--color-border-secondary);color:var(--color-text-primary);font-weight:500;min-width:90px}
.uo{background:#E1F5EE;border:0.5px solid #1D9E75;color:#085041;min-width:80px}
.ua{font-size:14px;color:var(--color-border-secondary)}
.ul{font-size:10px;color:var(--color-text-tertiary);margin-top:2px}
.cu{display:flex;align-items:center;gap:6px;margin:10px 0;font-size:12px;color:var(--color-text-secondary);flex-wrap:wrap;justify-content:center}
.cp{padding:3px 8px;border-radius:4px;font-size:11px}
.co{background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary)}
.cw{background:#EEEDFE;border:0.5px solid #7F77DD;color:#3C3489;font-weight:500}
.cn{background:#E1F5EE;border:0.5px solid #1D9E75;color:#085041}
.ca{color:var(--color-text-tertiary)}
.pv{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px}
.pn{display:flex;flex-direction:column;align-items:center;gap:2px}
.pb{width:34px;height:34px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:500;font-family:var(--font-mono);transition:all .3s}
.pb.e{border:0.5px dashed var(--color-border-tertiary);background:transparent;color:var(--color-text-tertiary)}
.pb.f{border:0.5px solid var(--color-border-secondary);background:var(--color-background-secondary);color:var(--color-text-secondary)}
.pb.a{border:1.5px solid #7F77DD;background:#EEEDFE;color:#3C3489}
.pl{font-size:9px;color:var(--color-text-tertiary);max-width:40px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pa{font-size:9px;color:var(--color-border-secondary);margin-top:-14px}
.sh{font-size:11px;font-weight:500;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.mr{display:flex;align-items:center;gap:8px;margin:3px 0;font-size:12px}
.ml{min-width:140px;color:var(--color-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ml.k{font-weight:500;color:var(--color-text-primary)}
.mt{flex:1;height:14px;background:var(--color-background-secondary);border-radius:3px;overflow:hidden}
.mf{height:100%;border-radius:3px;transition:width .5s}
.mv{min-width:30px;text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--color-text-tertiary)}
.co2{padding:10px 14px;font-size:13px;line-height:1.6;margin:14px 0;border-radius:0}
.co2 strong{font-weight:500}
.co2.note{background:var(--color-background-info);color:var(--color-text-info);border-left:3px solid var(--color-border-info)}
.co2.warn{background:rgba(226,75,74,0.07);color:#A32D2D;border-left:3px solid #E24B4A}
.co2.good{background:rgba(29,158,117,0.07);color:#0F6E56;border-left:3px solid #1D9E75}
.nr{font-size:13px;color:var(--color-text-secondary);line-height:1.7;padding:12px 14px;background:var(--color-background-secondary);border-radius:var(--border-radius-md);margin-top:12px}
.nr strong{color:var(--color-text-primary);font-weight:500}
.sm{max-width:520px;margin:1.5rem auto;text-align:center;font-size:14px;color:var(--color-text-secondary);line-height:1.7}
.sm strong{color:var(--color-text-primary);font-weight:500}
.sj{border-bottom:2.5px solid #EF9F27;padding-bottom:1px}
.st{border-bottom:2.5px solid #7F77DD;padding-bottom:1px}
.ar{display:flex;align-items:center;gap:8px;margin:4px 0}
.aw{min-width:130px;text-align:right;font-size:12px;color:var(--color-text-secondary)}
.aw.hi{font-weight:500;color:var(--color-text-primary)}
.ab{flex:1;height:18px;background:var(--color-background-secondary);border-radius:3px;overflow:hidden}
.af{height:100%;border-radius:3px;transition:width .5s}
.av{min-width:36px;text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--color-text-tertiary)}
@media(prefers-color-scheme:dark){
.tk.cur{background:#3C3489;border-color:#AFA9EC;color:#CECBF6}
.pb.a{border-color:#AFA9EC;background:#3C3489;color:#CECBF6}
.ui.on{background:#3C3489;border-color:#AFA9EC;color:#CECBF6}
.uo{background:#085041;border-color:#5DCAA5;color:#9FE1CB}
.cw{background:#3C3489;border-color:#AFA9EC;color:#CECBF6}
.cn{background:#085041;border-color:#5DCAA5;color:#9FE1CB}
.co2.warn{background:rgba(240,149,149,0.08);color:#F09595}
.co2.good{background:rgba(93,202,165,0.08);color:#5DCAA5}
}
</style>
<div class="w">
<div class="nav">
<button onclick="go(-1)" id="bp">&#8592; Back</button>
<button onclick="go(1)" id="bn">Next &#8594;</button>
<button onclick="rst()">Reset</button>
<span class="ctr" id="ct"></span>
</div>
<div id="sc"></div>
<div class="nr" id="nr"></div>
</div>
<script>
/* === DATA === */
var WD=['The','server','crashed','because','the','storage','controller','that','the','technician','replaced','last','week','was','faulty'];
var NW=WD.length;
var dk=matchMedia('(prefers-color-scheme:dark)').matches;
var MM=[
{c:[['expecting a noun',95],['sentence starting',80]]},
{c:[['the server',100],['hardware entity',85],['expecting a verb',75]]},
{c:[['server crash event',95],['the server',80],['past tense event',70],['expecting explanation',50]]},
{c:[['causal explanation coming',90],['server crash event',75],['the server',60],['past tense event',45]]},
{c:[['new noun phrase starting',85],['causal explanation',70],['server crash event',55],['the server',40]]},
{c:[['storage (hardware)',95],['new component forming',80],['causal explanation',55],['server crash event',40],['the server',28]]},
{c:[['storage controller',100],['causal link to crash',70],['hardware domain',55],['server crash event',35],['the server',20]]},
{c:[['relative clause opening',90],['storage controller',78],['modifying the controller',70],['server crash event',25],['the server',14]]},
{c:[['another noun phrase',80],['relative clause',65],['storage controller',58],['modifier context',50],['server crash event',18],['the server',9]]},
{c:[['the technician',95],['human actor',80],['relative clause',50],['storage controller',40],['server crash event',12],['the server',5]]},
{c:[['replacement action',90],['the technician',72],['past action',65],['storage controller',28],['relative clause',35],['the server',3]]},
{c:[['temporal modifier',85],['replacement action',60],['the technician',50],['time reference forming',70],['storage controller',20],['the server',2]]},
{c:[['last week (time)',90],['replacement event',50],['the technician',38],['temporal context',65],['storage controller',14],['the server',1]]},
{c:[['linking verb',85],['returning to main clause',70],['temporal context',45],['the technician',25],['storage controller',9],['replacement event',30]]},
{c:[['faulty (property)',95],['something is faulty',80],['linking verb',60],['temporal context',25],['the technician',15],['storage controller',6],['the server',1]]}
];
var NT={6:{t:'note',m:'<strong>"storage controller"</strong> is now at 100%. This is what "faulty" will need 8 words from now. Watch it fade.'},9:{t:'warn',m:'<strong>"storage controller" drops to 40%.</strong> "The technician" at 95% is pushing it out.'},12:{t:'warn',m:'<strong>"storage controller" at 14%.</strong> Was 100% just 6 words ago.'},14:{t:'warn',m:'<strong>"faulty" needs: faulty WHAT?</strong> "Storage controller" at 6%. "The technician" at 15%. The model may get this wrong.'}};
var WN=['The hidden state is fresh. "Expecting a noun" \u2014 the model knows a specific thing is coming.','The RNN reads "server" and combines it with h\u2081 via W and U. "The server" at full strength: 100%.','The RNN reads "crashed." "The server" drops 100%\u219280%. State must hold subject AND event.','"because" pivots toward explanation. "The server" at 60%.','Second "the" starts a new noun phrase. "The server" at 40% \u2014 half gone.','New hardware entity forming. "The server" at 28%.','Phrase complete: "storage controller" at 100%. "The server" down to 20%.','Relative clause opens. "Storage controller" drops to 78% \u2014 one word later.','"the" again. "Storage controller" at 58%. Nearly half gone in two words.','New actor enters at 95%. "Storage controller" drops to 40%.','Action verb. "Storage controller" below 30%.','Time modifier. "Storage controller" at 20%.','Time complete. "Storage controller" at 14%. From 100% in six words.','Linking verb. "Storage controller" at 9%. Nearly gone.','The critical moment. "Storage controller" at 6%. This is the telephone problem.'];
var AT=[['storage controller',48],['crashed',14],['was',12],['server',8],['replaced',7],['the (word 5)',4],['technician',3],['other words',4]];

/* === STATE === */
var step=0,attn=false;
function go(d){if(attn)return;step=Math.max(0,Math.min(18,step+d));render();}
function rst(){step=0;attn=false;render();}
function toAttn(){attn=true;render();}
function bc(v){if(v>=80)return dk?'#FAC775':'#EF9F27';if(v>=50)return dk?'#85B7EB':'#378ADD';if(v>=25)return dk?'#9FE1CB':'#1D9E75';if(v>=10)return dk?'#B4B2A9':'#888780';return dk?'#5F5E5A':'#D3D1C7';}

/* === RENDER === */
function render(){
document.getElementById('bp').disabled=step===0||attn;
document.getElementById('bn').disabled=step>=18||attn;

var phase,wi=-1;
if(step===0)phase='setup';
else if(step===1)phase='mech1';
else if(step===2)phase='mech2';
else if(step===3){phase='word';wi=0;}
else{phase='word';wi=step-3;if(wi>=NW){phase='done';wi=NW-1;}}

var ct='ready';
if(attn)ct='attention view';
else if(phase==='setup')ct='ready';
else if(phase==='mech1')ct='word 1 of 15 \u2014 the hidden state';
else if(phase==='mech2')ct='word 1 of 15 \u2014 the update rule';
else if(phase==='done')ct='all 15 words processed';
else ct='RNN processing: word '+(wi+1)+' of 15';
document.getElementById('ct').textContent=ct;

var h='',n='';

/* Sentence row */
h+='<div class="sent">';
for(var i=0;i<NW;i++){
  var c='tk';
  if(attn||phase==='done'){c+=' done';}
  else if(phase==='setup'){/* neutral */}
  else if(phase==='mech1'||phase==='mech2'){if(i===0)c+=' cur';else c+=' wait';}
  else{if(i<wi)c+=' done';else if(i===wi)c+=' cur';else c+=' wait';}
  if(i===5||i===6)c+=' subj';
  if(i===14)c+=' targ';
  h+='<div class="'+c+'">'+WD[i]+'</div>';
}
h+='</div>';

/* SETUP */
if(phase==='setup'){
  h+='<div class="sm">Read the sentence above.<br><br>';
  h+='<strong class="sj">storage controller</strong> (words 6\u20137) is what <strong class="st">faulty</strong> (word 15) describes. You parse that instantly.<br><br>';
  h+='But what if you could only read <strong>one word at a time</strong>, carrying everything in a fixed-size block of memory?<br>Press <strong>Next</strong> to find out.</div>';
  n='<strong>Stop 1: The Telephone Problem.</strong> Modern large language models \u2014 GPT, Claude, Llama \u2014 are built on an architecture called the <strong>transformer</strong>. To understand why transformers were a breakthrough, we need to see what came before them and why it broke down.';
}

/* MECHANICS 1 */
if(phase==='mech1'){
  h+='<div class="ib">The first word, <strong>"The"</strong>, is about to enter the model. Before we process it, let\u2019s understand the machinery.</div>';
  h+='<div class="ib">We\u2019re going to process this sentence using an <strong>RNN (Recurrent Neural Network)</strong> \u2014 the dominant architecture before transformers. An RNN reads text one word at a time, left to right, and carries its understanding forward through a <strong>hidden state</strong>.</div>';
  h+='<div class="ib">The hidden state is a <strong>vector</strong> \u2014 an ordered list of numbers (typically 512 to 1024 of them). This vector is the model\u2019s <strong>entire working memory</strong>. There\u2019s no separate memory bank, no way to look things up, no way to re-read an earlier word. Just this one vector, completely rewritten at every step.</div>';
  h+='<div class="ib">Before the first word, the hidden state is all zeros \u2014 a blank whiteboard.</div>';
  n='The hidden state is the <strong>only connection</strong> between words. Everything the model knows must be compressed into this one fixed-size vector. Press <strong>Next</strong> to see how the update works.';
}

/* MECHANICS 2 */
if(phase==='mech2'){
  h+='<div class="fm">h<sub>new</sub> = f( <strong>W</strong> \u00d7 h<sub>old</sub> + <strong>U</strong> \u00d7 word )</div>';
  h+='<div class="ud">';
  h+='<div class="ub ui"><div>h<sub>old</sub></div><div class="ul">previous state<br>(zeros \u2014 first word)</div></div>';
  h+='<div class="ua">+</div>';
  h+='<div class="ub ui on"><div>"The"</div><div class="ul">current word<br>(as an embedding)</div></div>';
  h+='<div class="ua">\u2192</div>';
  h+='<div class="ub ut"><div>W, U</div><div class="ul">weight matrices</div></div>';
  h+='<div class="ua">\u2192</div>';
  h+='<div class="ub uo"><div>h<sub>1</sub></div><div class="ul">new hidden state</div></div>';
  h+='</div>';
  h+='<div class="ib">The current word is first converted to an <strong>embedding</strong> \u2014 a vector that captures the word\u2019s meaning. Each word in the vocabulary has its own unique embedding, learned during training.</div>';
  h+='<div class="ib">Two separate <strong>weight matrices</strong> \u2014 grids of numbers \u2014 control how information mixes:<br>\u2022 <strong>W</strong> controls how the old hidden state is carried forward \u2014 what to remember<br>\u2022 <strong>U</strong> controls how the new word is incorporated \u2014 what to absorb<br><br>They\u2019re separate because these are different jobs. W decides how much old context survives; U decides how the new word gets mixed in.</div>';
  h+='<div class="ib"><strong>Where do W and U come from?</strong> They start as random numbers. During <strong>training</strong>, the model reads billions of sentences, predicts the next word, and when wrong, the error flows backward \u2014 <strong>backpropagation</strong> \u2014 nudging W and U to improve. After training, W and U encode the model\u2019s learned knowledge.<br><br><strong>Do they change during use?</strong> No. After training we switch to <strong>inference</strong> \u2014 W and U are frozen forever. Only the hidden state changes.</div>';
  n='h<sub>new</sub> is the <strong>same size</strong> as h<sub>old</sub>. No matter how much information accumulates, it must fit in the same number of values. Something has to give. Press <strong>Next</strong> to see the result.';
}

/* WORD PROCESSING */
if(phase==='word'){
  var mi=wi;
  h+='<div class="cu">';
  h+='<span class="cp co">h<sub>'+mi+'</sub>'+(mi===0?' (zeros)':'')+'</span>';
  h+='<span class="ca">+</span>';
  h+='<span class="cp cw">"'+WD[mi]+'"</span>';
  h+='<span class="ca">\u2192 W, U \u2192</span>';
  h+='<span class="cp cn">h<sub>'+(mi+1)+'</sub></span>';
  h+='</div>';

  h+='<div style="margin:10px 0"><div class="sh">Hidden state chain</div><div class="pv">';
  for(var j=0;j<=mi;j++){
    if(j>0)h+='<span class="pa">\u2192</span>';
    h+='<div class="pn"><div class="pb '+(j<mi?'f':'a')+'">h'+(j+1)+'</div><div class="pl">'+WD[j]+'</div></div>';
  }
  if(mi<NW-1){
    h+='<span class="pa">\u2192</span>';
    h+='<div class="pn"><div class="pb e">?</div><div class="pl">???</div></div>';
  }
  h+='</div></div>';

  if(mi===0){
    h+='<div class="ib" style="font-size:11px;"><strong>A note on what follows:</strong> The real hidden state is just numbers \u2014 no labels. What we show below is an interpretive approximation: our translation of what those numbers collectively encode. The decay pattern is real and well-documented in RNNs.</div>';
  }

  var m=MM[mi];
  h+='<div style="margin-top:14px"><div class="sh">Hidden state after "'+WD[mi]+'" \u2014 what the model holds</div>';
  for(var j=0;j<m.c.length;j++){
    var isK=m.c[j][0]==='storage controller';
    h+='<div class="mr"><span class="ml'+(isK?' k':'')+'">'+m.c[j][0]+'</span><div class="mt"><div class="mf" style="width:'+m.c[j][1]+'%;background:'+bc(m.c[j][1])+'"></div></div><span class="mv">'+m.c[j][1]+'%</span></div>';
  }
  h+='</div>';
  if(NT[mi])h+='<div class="co2 '+NT[mi].t+'">'+NT[mi].m+'</div>';
  n='<strong>"'+WD[mi]+'"</strong> \u2014 '+WN[mi];
}

/* DONE */
if(phase==='done'&&!attn){
  h+='<div style="margin:10px 0"><div class="sh">All 15 hidden states</div><div class="pv">';
  for(var j=0;j<NW;j++){
    if(j>0)h+='<span class="pa">\u2192</span>';
    h+='<div class="pn"><div class="pb f">h'+(j+1)+'</div><div class="pl">'+WD[j]+'</div></div>';
  }
  h+='</div></div>';
  var m=MM[14];
  h+='<div style="margin-top:14px"><div class="sh">Final hidden state</div>';
  for(var j=0;j<m.c.length;j++){
    var isK=m.c[j][0]==='storage controller';
    h+='<div class="mr"><span class="ml'+(isK?' k':'')+'">'+m.c[j][0]+'</span><div class="mt"><div class="mf" style="width:'+m.c[j][1]+'%;background:'+bc(m.c[j][1])+'"></div></div><span class="mv">'+m.c[j][1]+'%</span></div>';
  }
  h+='</div>';
  h+='<div class="co2 warn"><strong>"storage controller": 100% \u2192 6%</strong> in 8 steps.</div>';
  h+='<div style="margin-top:16px;text-align:center"><button onclick="toAttn()" style="font-size:14px;padding:8px 24px">See how attention solves this \u2192</button></div>';
  n='All 15 words processed. The fixed-size hidden state couldn\u2019t hold the critical concept. <strong>Click above</strong> to see attention.';
}

/* ATTENTION */
if(attn){
  h+='<div class="co2 good"><strong>With attention, "faulty" doesn\u2019t rely on the chain.</strong> It scores every word directly. No decay.</div>';
  h+='<div style="margin:14px 0"><div class="sh">Attention from "faulty" \u2014 direct lookup</div>';
  var mx=48;
  for(var j=0;j<AT.length;j++){
    var p=Math.round(AT[j][1]/mx*100);
    var cl=AT[j][1]>=40?(dk?'#5DCAA5':'#1D9E75'):AT[j][1]>=10?(dk?'#85B7EB':'#378ADD'):(dk?'#B4B2A9':'#888780');
    h+='<div class="ar"><span class="aw'+(AT[j][1]>=40?' hi':'')+'">'+AT[j][0]+'</span><div class="ab"><div class="af" style="width:'+p+'%;background:'+cl+'"></div></div><span class="av">'+AT[j][1]+'%</span></div>';
  }
  h+='</div>';
  h+='<div class="co2 good"><strong>"storage controller" gets 48%.</strong> The model computes a <strong>Query</strong> vector for "faulty" (what am I looking for?) and compares it against a <strong>Key</strong> vector stored for every word (what do I contain?). The information comes from each word\u2019s <strong>Value</strong> vector (what do I carry?). Those Key and Value vectors must be <strong>stored</strong> for every word \u2014 that storage is the <strong>KV cache</strong>. How Q, K, V work is our next stop.</div>';
  n='<strong>Attention eliminates the distance problem.</strong> But for every word to be lookupable, the model stores Key and Value vectors for each one. That storage is the <strong>KV cache</strong>, and its growth with sequence length is the central challenge of this course.';
}

document.getElementById('sc').innerHTML=h;
document.getElementById('nr').innerHTML=n;
}

document.addEventListener('keydown',function(e){
if(e.key==='ArrowRight')go(1);
if(e.key==='ArrowLeft')go(-1);
});
render();
</script>
```

---

## Design Patterns for Claude Code

### Pattern 1: Stepper with phases
The core interaction pattern. A step counter, back/next buttons, arrow key
navigation, and a render() function that builds HTML based on current step.
Steps map to phases (setup, mechanics, word-processing, done, reveal).

### Pattern 2: Progressive data display
Data structures (MM array for hidden state, WN for narrations, NT for callouts)
are keyed by word index. The render function looks up the current word's data
and displays it. This pattern scales to any number of steps.

### Pattern 3: Bar chart with color coding
Horizontal bars with percentage values. Color coding by magnitude:
- >=80%: amber (hot/active)
- >=50%: blue (moderate)
- >=25%: teal (fading)
- >=10%: gray (weak)
- <10%: light gray (nearly gone)

### Pattern 4: Compact update pill
Shows the transformation at each step: h_old + "word" → W, U → h_new
Uses small pill-shaped badges with distinct colors for old state, word, and new state.

### Pattern 5: Callout boxes
Three types: note (blue, informational), warn (red, problem), good (green, solution).
Left-border accent, no rounded corners on the accent side. Used sparingly at
key narrative moments.

### Pattern 6: Mode switch
A button or toggle that switches between two views of the same data (RNN view
vs. attention view). The attention view reuses the same sentence display but
shows different data below.
