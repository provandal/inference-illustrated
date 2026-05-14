// Stop 8: Where in the Sequence? — Position and RoPE
//
// New stop inserted between Blending Values (Stop 7) and Multiple Heads (Stop 9).
// Goal: deep treatment of positional encoding with a focus on RoPE (Rotary Position
// Embeddings), the technique used by Llama and most modern decoder-only models.

export const PAGES = [
  { id: 'position-blind',   label: 'The Position-Blind Problem',   type: 'static'   },
  { id: 'sinusoidal',       label: 'First Try \u2014 Add a Position', type: 'static' },
  { id: 'add-at-input',     label: 'Why Add-at-Input Fails',        type: 'static'  },
  { id: 'rotate-idea',      label: 'RoPE \u2014 Rotate, Don\u2019t Add', type: 'static' },
  { id: 'rope-math',        label: 'The Math (Just Enough)',        type: 'static'  },
  { id: 'frequencies',      label: 'Many Frequencies, Many Roles',  type: 'static'  },
  { id: 'rope-and-cache',   label: 'RoPE Meets the KV Cache',       type: 'static'  },
  { id: 'long-context',     label: 'Stretching the Window',         type: 'static'  },
  { id: 'summary',          label: 'Stop 8 at a Glance',            type: 'static'  },
];

export const NARRATIONS = {
  'position-blind':
    '<p><strong>Stop 8: Where in the Sequence?</strong> Across Stops 1\u20137 we built attention end-to-end \u2014 Query, Key, Value, dot product, softmax, blending. But we left a gaping hole. As built so far, attention is <em>permutation-invariant</em>: shuffle the input words and you get the same attention pattern.</p>' +
    '<p style="margin-top:0.5em">That means the model literally cannot tell <em>"dog bit man"</em> from <em>"man bit dog"</em>. Identical words, identical Q/K/V vectors, identical attention scores. Position is invisible.</p>' +
    '<p style="margin-top:0.5em">Fixing this is the missing piece. Modern models use <strong>RoPE \u2014 Rotary Position Embeddings</strong>, and the way it works has direct consequences for the KV cache (Stop 12), long-context support (Stop 15), and cache reuse (Stop 17). This stop is where positional encoding gets the full treatment.</p>',

  'sinusoidal':
    '<p>The 2017 \u201cAttention Is All You Need\u201d paper proposed a simple fix: <strong>add a position vector to each token\u2019s embedding</strong> before the first layer. The position vector is built from sines and cosines at different frequencies, giving every position a unique fingerprint.</p>' +
    '<p style="margin-top:0.5em">Different dimensions of the position vector rotate at different rates. The low-index dimensions oscillate slowly \u2014 they encode coarse position. The high-index dimensions oscillate quickly \u2014 they encode fine position. The combination is a unique vector per position, with a useful structure: positions that are close together produce similar vectors.</p>',

  'add-at-input':
    '<p>Adding a position vector at the input has two problems. First, the position signal lives in the <strong>residual stream</strong> and gets attenuated as 80 layers of attention and FFN write their own content into the same activation. By the final layer, the original position fingerprint is buried.</p>' +
    '<p style="margin-top:0.5em">Second, sinusoidal positions don\u2019t <strong>extrapolate</strong>. If the model only saw positions 0\u20134095 during training, the sinusoids at position 8000 fall in a never-seen region of the embedding space, and quality collapses. This is why early Transformer models had hard context limits.</p>',

  'rotate-idea':
    '<p>RoPE replaces the additive trick with a multiplicative one. Instead of adding a position vector to the input embedding once, it <strong>rotates the Q and K vectors</strong> by an angle proportional to their position, <em>at every attention layer</em>. V is left untouched.</p>' +
    '<p style="margin-top:0.5em">Two consequences fall out. First, the position signal is reapplied at every layer, so it can\u2019t be attenuated by residual writes. Second, when you compute the dot product Q&middot;K, the absolute positions <strong>cancel out</strong> \u2014 only the <em>relative</em> position (m \u2212 n) matters. That single property is the key to long-context generalization.</p>',

  'rope-math':
    '<p>Here is the math, kept tight. RoPE treats the d-dimensional vector as d/2 <strong>pairs</strong> of dimensions. Each pair is rotated as a 2D vector by an angle that depends on position and on which pair it is.</p>' +
    '<p style="margin-top:0.5em">For a single pair, Q at position <em>m</em> becomes R(m\u03b8)&middot;Q, and K at position <em>n</em> becomes R(n\u03b8)&middot;K, where R(\u03c6) is the 2&times;2 rotation matrix and \u03b8 is that pair\u2019s frequency. The magic is in the dot product: (R(m\u03b8)Q) \u00b7 (R(n\u03b8)K) = Q \u00b7 R((n\u2212m)\u03b8) K. The absolute positions <em>m</em> and <em>n</em> have collapsed into a single (n\u2212m)\u03b8 rotation. The dot product depends only on the relative offset.</p>',

  'frequencies':
    '<p>RoPE doesn\u2019t use one rotation rate. It uses d/2 of them, geometrically spaced. Pair 0 rotates fastest \u2014 it encodes <em>local</em> position (adjacent tokens). The last pair rotates so slowly that one full rotation takes thousands of tokens \u2014 it encodes <em>long-range</em> position.</p>' +
    '<p style="margin-top:0.5em">This frequency spread is why a single dot product can carry information about both adjacent words and far-apart words at the same time. Each attention head can specialize: some heads end up paying attention to high-frequency (nearby) signals, others to low-frequency (distant) signals.</p>',

  'rope-and-cache':
    '<p>Here is where RoPE collides with infrastructure. When we cache K vectors in the KV cache, we cache the <strong>post-rotation</strong> K \u2014 the rotation has already been applied at the token\u2019s absolute position.</p>' +
    '<p style="margin-top:0.5em">For ordinary reads, this is free \u2014 the K vectors are correct as-is. But the moment you try to <em>reuse</em> a cache at a different position (prompt prefix caching, document caching, cross-session reuse), the cached K vectors are wrong for the new position. You have to un-rotate by the old position and re-rotate at the new one. This is the cost no one talks about until they try to ship prefix caching at production scale.</p>',

  'long-context':
    '<p>RoPE was the unlock for 100K+ context models. The trick: if you train on positions 0\u20134095 but run at 128K, the high-frequency RoPE pairs make many full revolutions on never-seen positions \u2014 quality crashes. So you <em>scale</em> the frequencies.</p>' +
    '<p style="margin-top:0.5em">Four techniques worth knowing: <strong>position interpolation</strong> (linearly squeeze positions back into trained range), <strong>NTK-aware scaling</strong> (adjust frequencies non-uniformly so fine-grained detail is preserved), <strong>YaRN</strong> (per-band scaling plus an attention-temperature term), and what Llama-3.1 actually shipped. Each pushes context further; each costs a little quality.</p>',

  summary:
    '<p>RoPE solved the position problem with a multiplicative rotation that survives the residual stream, encodes relative position naturally, and stretches gracefully to long context. We carry this forward: the KV cache stores rotated K vectors, and any cache-reuse mechanic has to account for that.</p>',
};

// ================================================================
// PAGE 1 — The Position-Blind Problem
// Sentence shuffler showing attention is permutation-invariant.
// Pre-computed attention matrix using fixed Q/K vectors per word.
// ================================================================
export const POSITION_BLIND_WORDS = [
  { id: 'dog', label: 'dog', color: 'var(--color-red)'     },
  { id: 'bit', label: 'bit', color: 'var(--color-blue)'    },
  { id: 'man', label: 'man', color: 'var(--color-teal)'    },
];

// The orderings we let users flip between.
export const POSITION_BLIND_ORDERINGS = [
  { id: 'subject-verb-object',  label: '"dog bit man"',  order: ['dog', 'bit', 'man'], note: 'Subject-verb-object: dog is the biter, man is the victim.' },
  { id: 'object-verb-subject',  label: '"man bit dog"',  order: ['man', 'bit', 'dog'], note: 'Opposite meaning: man is the biter, dog is the victim. A reader instantly understands this is different. The model does not.' },
  { id: 'verb-first',           label: '"bit dog man"',  order: ['bit', 'dog', 'man'], note: 'Grammatical nonsense. But the attention scores are still identical \u2014 same words, same vectors.' },
];

// Attention matrix is computed once from word-level Q/K vectors.
// attentionScores[queryWord][keyWord] is the softmax-normalised weight from query to key.
// These numbers are illustrative, not from a real model.
export const POSITION_BLIND_ATTENTION = {
  dog: { dog: 0.21, bit: 0.55, man: 0.24 },  // dog mostly attends to its verb
  bit: { dog: 0.41, bit: 0.10, man: 0.49 },  // bit attends to its arguments
  man: { dog: 0.18, bit: 0.50, man: 0.32 },  // man attends to its verb
};

// ================================================================
// PAGE 2 — Sinusoidal Positional Encoding
// Compute and display the 2017-style position vector.
// ================================================================
// Standard sinusoidal PE: PE(pos, 2i) = sin(pos / 10000^(2i/d))
//                         PE(pos, 2i+1) = cos(pos / 10000^(2i/d))
export function sinusoidalPE(pos, dim) {
  const out = new Array(dim);
  for (let i = 0; i < dim / 2; i++) {
    const freq = 1 / Math.pow(10000, (2 * i) / dim);
    out[2 * i]     = Math.sin(pos * freq);
    out[2 * i + 1] = Math.cos(pos * freq);
  }
  return out;
}

export const SINUSOIDAL_DEMO = {
  defaultPos: 7,
  dim: 64,         // d=64 keeps the heatmap legible
  maxPos: 127,
};

// ================================================================
// PAGE 3 — Why Add-at-Input Fails
// Toy model of signal decay through layers, and a sketch of
// what happens when the model is asked about positions it never saw.
// ================================================================
// Layer-by-layer "residual mix" — how much of the original PE remains
// after L layers, assuming each layer adds noise of amplitude `noisePerLayer`.
export function residualPESurvival(layer, noisePerLayer = 0.04) {
  // Heuristic: PE amplitude after L layers ~= 1 / sqrt(1 + L * noisePerLayer^2 * scale)
  const scale = 30;
  return 1 / Math.sqrt(1 + layer * noisePerLayer * noisePerLayer * scale);
}

export const SIGNAL_DECAY_DEMO = {
  totalLayers: 80,
  defaultLayer: 1,
};

export const EXTRAPOLATION_FAILURE = {
  trainedMax: 4096,
  examples: [
    { pos: 1024,  status: 'in-distribution',  quality: 'perfect',  note: 'Inside training range.' },
    { pos: 4000,  status: 'in-distribution',  quality: 'good',     note: 'Near training boundary.' },
    { pos: 8000,  status: 'extrapolating',    quality: 'degraded', note: 'Never seen in training. Sinusoids combine in unfamiliar ways.' },
    { pos: 32000, status: 'extrapolating',    quality: 'broken',   note: 'Model output collapses.' },
  ],
};

// ================================================================
// PAGE 4 — Rotate, Don't Add
// Single dimension-pair shown as a 2D vector that can be rotated.
// ================================================================
export const ROTATE_DEMO = {
  defaultPosM: 2,
  defaultPosN: 7,
  defaultTheta: 0.45,   // radians per position unit (for visual clarity)
  qVector: [1.0, 0.0],  // pre-rotation Q in this pair
  kVector: [0.7, 0.6],  // pre-rotation K in this pair
};

// ================================================================
// PAGE 5 — The Math
// Dot product as a function of relative position.
// ================================================================
export function rotate2D([x, y], angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c * x - s * y, s * x + c * y];
}

export function dot2D([a, b], [c, d]) { return a * c + b * d; }

export const ROPE_MATH_STEPS = [
  { id: 1, lhs: '(R(m\u03b8) Q) \u00b7 (R(n\u03b8) K)',                         note: 'Start: Q rotated at position m, K rotated at position n.' },
  { id: 2, lhs: '= Q\u1d40 R(m\u03b8)\u1d40 R(n\u03b8) K',                       note: 'Expand the dot product in matrix form.' },
  { id: 3, lhs: '= Q\u1d40 R(\u2212m\u03b8) R(n\u03b8) K',                       note: 'R is orthogonal, so its transpose is its inverse \u2014 the same as rotating backward.' },
  { id: 4, lhs: '= Q\u1d40 R((n \u2212 m)\u03b8) K',                            note: 'Combine the two rotations. Successive 2D rotations add their angles.' },
  { id: 5, lhs: '= Q \u00b7 R((n \u2212 m)\u03b8) K',                            note: 'Re-write back as a dot product. Absolute positions m and n have vanished. Only the relative offset (n \u2212 m) survives.' },
];

// ================================================================
// PAGE 6 — Many Frequencies
// d/2 frequency bands, geometrically spaced.
// ================================================================
// RoPE\u2019s base is typically 10000 (same as sinusoidal). For each pair i in 0..d/2-1:
//   theta_i = base^(\u22122i/d)
export function ropeBandTheta(i, d, base = 10000) {
  return Math.pow(base, -(2 * i) / d);
}

export const FREQUENCY_DEMO = {
  d: 16,        // 8 pairs total \u2014 visualise all 8
  base: 10000,
  defaultPos: 0,
  maxPos: 128,
};

// ================================================================
// PAGE 7 — RoPE Meets the KV Cache
// Demonstrate that naive cache reuse at a different position is wrong.
// ================================================================
export const CACHE_REUSE_DEMO = {
  cachedAtPos: 5,
  reuseAtPos:  120,
  qVector: [0.9, 0.2],
  kVectorPreRotation: [0.7, 0.5],
  theta: 0.18,
};

// ================================================================
// PAGE 8 — Long-Context Extension
// Comparator of four techniques.
// ================================================================
export const LONG_CONTEXT_TECHNIQUES = [
  {
    id: 'none',
    name: 'No scaling',
    targetContext: '4K (trained)',
    effectiveBaseFactor: 1.0,
    quality: 'Reference',
    note: 'What you get with raw RoPE at the trained context length.',
    formula: '\u03b8_i\u2032 = \u03b8_i',
  },
  {
    id: 'pi',
    name: 'Position interpolation (PI)',
    targetContext: '8K\u201316K',
    effectiveBaseFactor: 1.5,
    quality: 'Good',
    note: 'Linearly compress positions back into trained range. Same RoPE, smaller effective \u03b8.',
    formula: '\u03b8_i\u2032 = \u03b8_i / s,   where s = target / trained',
  },
  {
    id: 'ntk',
    name: 'NTK-aware scaling',
    targetContext: '16K\u201332K',
    effectiveBaseFactor: 2.0,
    quality: 'Better',
    note: 'Adjust the base (not each \u03b8) so high-frequency pairs see almost no change while low-frequency pairs are interpolated more aggressively.',
    formula: 'base\u2032 = base \u00b7 s^(d/(d\u22122))',
  },
  {
    id: 'yarn',
    name: 'YaRN',
    targetContext: '32K\u2013128K',
    effectiveBaseFactor: 3.2,
    quality: 'Best on benchmark suites',
    note: 'Per-frequency-band attenuation: bands within trained wavelength left alone, bands outside fully interpolated, bands near the boundary smoothly mixed. Adds an attention-temperature term to keep softmax sharpness consistent.',
    formula: '\u03b8_i\u2032 = (1\u2212\u03b1_i) \u00b7 \u03b8_i + \u03b1_i \u00b7 \u03b8_i/s,  plus temperature \u03c4',
  },
  {
    id: 'llama31',
    name: 'Llama-3.1 (production)',
    targetContext: '128K',
    effectiveBaseFactor: 3.0,
    quality: 'Production',
    note: 'A YaRN-style approach with a high RoPE base (500000) and per-band scaling. The combination of higher base and frequency-aware scaling lets Llama-3.1 hold 128K tokens in a single context window.',
    formula: 'base = 500000;   \u03b8_i\u2032 from per-band schedule',
  },
];

// ================================================================
// PAGE 9 — Summary
// ================================================================
export const STOP_SUMMARY = [
  { col: 'Old (sinusoidal)',   row: 'Where applied',     value: 'Once, at the input embedding'                  },
  { col: 'Old (sinusoidal)',   row: 'How',               value: 'Added to the input vector'                     },
  { col: 'Old (sinusoidal)',   row: 'Position kind',     value: 'Absolute'                                      },
  { col: 'Old (sinusoidal)',   row: 'Survives layers?',  value: 'Decays through residual stream'                },
  { col: 'Old (sinusoidal)',   row: 'Extrapolates?',     value: 'Poorly \u2014 fails beyond trained range'      },
  { col: 'RoPE',               row: 'Where applied',     value: 'Every attention layer, on Q and K'             },
  { col: 'RoPE',               row: 'How',               value: 'Rotates Q and K in d/2 dimension-pairs'        },
  { col: 'RoPE',               row: 'Position kind',     value: 'Relative (dot product depends on m \u2212 n)'  },
  { col: 'RoPE',               row: 'Survives layers?',  value: 'Re-applied at every layer \u2014 no decay'     },
  { col: 'RoPE',               row: 'Extrapolates?',     value: 'With scaling (PI / NTK / YaRN) \u2014 to 128K+' },
];

export const FORWARD_LINKS = [
  { stop: 12, label: 'KV cache memory',     why: 'Cached K vectors are stored post-rotation; that affects what we measure for memory and bandwidth.' },
  { stop: 15, label: 'Cache compression',    why: 'Quantising K means quantising a rotated vector \u2014 some methods exploit the rotation structure.' },
  { stop: 17, label: 'Cache-aware routing',  why: 'Prefix-cache reuse across requests requires re-rotating K vectors to the new absolute position.' },
];
