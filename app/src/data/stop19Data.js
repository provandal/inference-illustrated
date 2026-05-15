// Stop 19: Mixture of Experts — Sparse FFN at Scale
//
// First stop of Act 3. The thesis of Act 3: the standard transformer
// (Acts 1\u20132) is one point in a wider design space, and each alternative
// architecture reshapes the cache memory model differently.
//
// MoE is the gentlest departure: the architecture is still a transformer,
// but the FFN block is replaced with a sparse mixture. KV cache memory is
// unchanged; what changes is the model\u2019s weight memory pattern, compute
// cost, and inter-GPU communication.

export const PAGES = [
  { id: 'weights-live',     label: 'Where the Weights Live',         type: 'static'      },
  { id: 'moe-idea',         label: 'The MoE Idea',                   type: 'interactive' },
  { id: 'router',           label: 'The Router Up Close',            type: 'interactive' },
  { id: 'sparse-activation',label: 'Sparse Activation',              type: 'interactive' },
  { id: 'inference-cost',   label: 'Inference Cost \u2014 The Catch', type: 'static'     },
  { id: 'expert-parallel',  label: 'Expert Parallelism + All-to-All', type: 'interactive' },
  { id: 'kv-cache-impact',  label: 'What This Does to the KV Cache', type: 'static'      },
  { id: 'production',       label: 'In Production Today',            type: 'interactive' },
  { id: 'summary',          label: 'Stop 19 at a Glance',            type: 'static'      },
];

export const NARRATIONS = {
  'weights-live':
    '<p><strong>Stop 19: Mixture of Experts.</strong> Welcome to Act 3. Acts 1 and 2 built the standard transformer and made it run at scale. Act 3 asks: <em>the standard transformer is one point in a much wider design space \u2014 what else lives there, and how does each alternative reshape the cache memory model?</em></p>' +
    '<p style="margin-top:0.5em">We start with the gentlest departure: MoE keeps almost the entire transformer intact and only rethinks the FFN block. So before we explain how, we have to make the case for why \u2014 by showing where in the model the parameters actually live.</p>',

  'moe-idea':
    '<p>Mixture of Experts replaces one big FFN with <strong>N smaller experts</strong> and a <strong>router</strong> that picks <strong>top-k</strong> experts per token. Each token traverses only k of N experts; the other N\u2212k experts are skipped entirely. The same layer can run an English-syntax expert for one token and a code-fragment expert for the next.</p>' +
    '<p style="margin-top:0.5em">This is sparse on a per-token basis, not per-layer. The router runs inside every layer and may pick different experts for different tokens in the same sequence.</p>',

  'router':
    '<p>The router is tiny \u2014 a single linear layer of shape d_model \u00d7 N \u2014 but it does load-bearing work. It produces N logits per token, picks the top-k, normalises their weights, and decides which experts will run. Get this wrong and the model collapses to using one expert all the time, defeating the point.</p>',

  'sparse-activation':
    '<p>The headline trick of MoE is the gap between <strong>total parameters</strong> (what you load into HBM) and <strong>active parameters</strong> (what you compute against for one token). DeepSeek-V3: 671B total, 37B active. Mixtral 8\u00d77B: 47B total, 13B active. The compute story changes; the memory story is more nuanced \u2014 we will return to that on the next page.</p>',

  'inference-cost':
    '<p>The catch: HBM still has to hold all N experts. You do not know in advance which experts a future token will need, so they all stay resident. That is why MoE is fundamentally a <strong>throughput play</strong> \u2014 you get the compute of a 13B model with the memory pressure of a 47B one. Useful, but for a different reason than most readers assume.</p>',

  'expert-parallel':
    '<p>When the model is too big for one GPU, MoE introduces a third parallelism axis: <strong>expert parallelism (EP)</strong>. Each GPU holds a subset of experts. Routing means a token computed on GPU 0 may need an expert that lives on GPU 5 \u2014 so the token gets sent there.</p>' +
    '<p style="margin-top:0.5em">This produces a new collective: <strong>all-to-all</strong>. Different from TP\u2019s all-reduce and PP\u2019s point-to-point, all-to-all sends a different payload from every rank to every other rank in the same step. Fabric bandwidth requirements change accordingly.</p>',

  'kv-cache-impact':
    '<p>The KV cache is per-token, per-layer, and depends on Q/K/V projections that have nothing to do with which expert ran. So <strong>cache memory and bandwidth are identical to a dense model</strong> with the same d_model, layers, and heads.</p>' +
    '<p style="margin-top:0.5em">What changes: the per-step latency now includes router compute and an all-to-all collective. These add a measurable but bounded cost. Detail on the next page.</p>',

  production:
    '<p>MoE is in production at scale today. The configurations vary widely \u2014 number of experts, top-k, shared experts, FFN width per expert \u2014 and each tradeoff is visible from the outside.</p>',

  summary:
    '<p>MoE is Act 3\u2019s easy on-ramp: the transformer shape is preserved, the KV cache is unchanged, but the FFN is now sparse. The cost shifts from compute (less) to memory bandwidth (similar) and to interconnect (new all-to-all traffic). The pattern keeps repeating in Act 3: every alternative trades one resource for another. The job of an infra engineer is to know which trade fits the workload.</p>',
};

// ================================================================
// PAGE 1 — Where the weights live
// Breakdown of attention vs FFN vs embedding for Llama-3 8B/70B/405B.
// Numbers computed from public architecture specs.
// ================================================================
export const WEIGHT_BREAKDOWN = [
  // Llama-3 8B: d_model=4096, n_kv_heads=8, d_ffn=14336, layers=32, vocab=128256
  // Attention per layer: Q+O = 2*d_model^2 = 33.6M; K+V = 2*d_model*n_kv_heads*d_head = 4096*8*128*2 = 8.4M; total \u224842M
  // FFN per layer (SwiGLU, 3 projections): 3*d_model*d_ffn = 176M
  // Embedding: vocab*d_model = 525M (tied with LM head in Llama-3, counted once)
  {
    model: 'Llama-3 8B',
    paramsLabel: '~8 B',
    attentionB: 1.34,
    ffnB: 5.6,
    embeddingB: 0.53,
    totalB: 8.0,
    layers: 32, dModel: 4096, dFfn: 14336,
  },
  // Llama-3 70B: d_model=8192, n_kv_heads=8, d_ffn=28672, layers=80
  // Attention per layer: 2*8192^2 + 2*8192*1024 = 134M + 16.8M = 151M
  // FFN per layer: 3*8192*28672 = 705M
  // Embedding: 128256*8192 = 1.05B
  {
    model: 'Llama-3 70B',
    paramsLabel: '~70 B',
    attentionB: 12.0,
    ffnB: 56.4,
    embeddingB: 1.05,
    totalB: 70.0,
    layers: 80, dModel: 8192, dFfn: 28672,
  },
  // Llama-3 405B: d_model=16384, n_kv_heads=8, d_ffn=53248, layers=126
  // Attention per layer: 2*16384^2 + 2*16384*1024 = 537M + 33.5M = 570M
  // FFN per layer: 3*16384*53248 = 2617M
  // Embedding: 128256*16384 = 2.1B
  {
    model: 'Llama-3 405B',
    paramsLabel: '~405 B',
    attentionB: 71.8,
    ffnB: 329.7,
    embeddingB: 2.1,
    totalB: 405.0,
    layers: 126, dModel: 16384, dFfn: 53248,
  },
];

// ================================================================
// PAGE 2 — The MoE idea
// 12 tokens flowing through one MoE layer. Each token gets routed
// to top-2 of 8 experts. Routing is illustrative \u2014 the assignments
// are fixed so the visual is reproducible.
// ================================================================
export const MOE_LAYER_DEMO = {
  numExperts: 8,
  topK: 2,
  tokens: [
    // (token, [expert indices it routes to], weights)
    { text: 'The',     experts: [3, 7], weights: [0.62, 0.38] },
    { text: 'storage', experts: [0, 5], weights: [0.55, 0.45] },
    { text: 'cache',   experts: [0, 2], weights: [0.71, 0.29] },
    { text: 'was',     experts: [3, 1], weights: [0.58, 0.42] },
    { text: 'serving', experts: [4, 5], weights: [0.66, 0.34] },
    { text: 'tokens',  experts: [2, 4], weights: [0.51, 0.49] },
    { text: 'at',      experts: [3, 6], weights: [0.60, 0.40] },
    { text: '8K',      experts: [6, 0], weights: [0.70, 0.30] },
    { text: 'context', experts: [2, 5], weights: [0.64, 0.36] },
    { text: 'when',    experts: [3, 1], weights: [0.59, 0.41] },
    { text: 'GPU',     experts: [6, 0], weights: [0.73, 0.27] },
    { text: '5',       experts: [7, 4], weights: [0.55, 0.45] },
  ],
  // Hand-named "specialties" for the visualisation \u2014 these are illustrative,
  // not real interpretability findings.
  expertLabels: [
    'syntax',
    'punctuation',
    'storage / data',
    'function words',
    'numbers',
    'verbs / actions',
    'hardware',
    'rare tokens',
  ],
};

// ================================================================
// PAGE 3 — The Router Up Close
// One token, d_model=8 (for legibility), N=6 experts.
// Router weights produce 6 scores; top-k=2 are selected; softmax over
// the selected scores gives the weights used to blend expert outputs.
// ================================================================
export const ROUTER_DEMO = {
  dModel: 8,
  numExperts: 6,
  topK: 2,
  // A sample token embedding (8-D).
  tokenEmbedding: [0.42, -0.13, 0.28, 0.55, -0.07, 0.31, -0.22, 0.46],
  // Router weight matrix shape (numExperts, dModel) \u2014 expert e\u2019s row dot the
  // token embedding gives expert e\u2019s logit.
  routerWeights: [
    [ 0.31, -0.22,  0.18,  0.41, -0.15,  0.27,  0.08,  0.33],  // expert 0
    [-0.12,  0.45,  0.21, -0.34,  0.18, -0.07,  0.25, -0.18],  // expert 1
    [ 0.28,  0.11, -0.45,  0.22,  0.31, -0.12,  0.17,  0.29],  // expert 2
    [ 0.17, -0.31,  0.38,  0.14, -0.22,  0.42, -0.08,  0.25],  // expert 3
    [-0.24,  0.16,  0.27,  0.35,  0.08, -0.21,  0.31,  0.12],  // expert 4
    [ 0.21,  0.33, -0.18, -0.26,  0.41,  0.18, -0.15,  0.07],  // expert 5
  ],
  expertLabels: [
    'expert 0',
    'expert 1',
    'expert 2',
    'expert 3',
    'expert 4',
    'expert 5',
  ],
};

// ================================================================
// PAGE 4 — Sparse Activation
// Calculator. Lets the user tune N, k, d_ffn, layers, d_model and see
// total params vs active params vs the dense-baseline equivalent.
// ================================================================
export const SPARSE_ACTIVATION_DEFAULTS = {
  N: 8,           // number of experts
  k: 2,           // top-k routing
  layers: 32,
  dModel: 4096,
  dFfn: 14336,
  dHead: 128,
  nKvHeads: 8,
  vocab: 128256,
};

// Compute per-token compute (one forward pass) given the config.
// Returns total params (HBM) and active params (compute) in billions.
export function moeParamCounts({ N, k, layers, dModel, dFfn, dHead, nKvHeads, vocab }) {
  // Attention per layer (GQA with SwiGLU not relevant here)
  const attnPerLayer = 2 * dModel * dModel + 2 * dModel * nKvHeads * dHead;
  // FFN per expert (SwiGLU \u2014 3 projections)
  const ffnPerExpert = 3 * dModel * dFfn;
  // Router per layer
  const routerPerLayer = dModel * N;
  // Embedding (tied)
  const embedding = vocab * dModel;

  const ffnTotalPerLayer = N * ffnPerExpert;
  const ffnActivePerLayer = k * ffnPerExpert;

  const totalParams = layers * (attnPerLayer + ffnTotalPerLayer + routerPerLayer) + embedding;
  const activeParams = layers * (attnPerLayer + ffnActivePerLayer + routerPerLayer) + embedding;

  // Dense baseline for reference: same dModel/dFfn, but one FFN per layer.
  const denseBaseline = layers * (attnPerLayer + ffnPerExpert) + embedding;

  return {
    totalB: totalParams / 1e9,
    activeB: activeParams / 1e9,
    denseB: denseBaseline / 1e9,
    sparsityRatio: activeParams / totalParams,
  };
}

// ================================================================
// PAGE 5 — Inference Cost (The Catch)
// Walk through Mixtral 8x7B numbers on a single H100.
// ================================================================
export const COST_WALKTHROUGH = {
  model: 'Mixtral 8\u00d77B',
  N: 8,
  k: 2,
  totalParams_B: 47,
  activeParams_B: 13,
  totalMemoryFP4_GB: 24,    // ~47B * 0.5 bytes
  totalMemoryFP16_GB: 94,
  // Compute is governed by active params (every forward token only touches active weights).
  // Memory bandwidth is governed by which weights are READ, which in a naive
  // implementation is also just the active ones \u2014 BUT if the router is balanced and
  // batched, almost every expert gets used per batch, so the EFFECTIVE bandwidth use
  // approaches the total parameters per layer step (this is the subtle point).
  compute_TFLOPs_perToken: 26,        // ~2 * active_B
  bandwidth_GB_perStep_naive: 13,     // active params only
  bandwidth_GB_perStep_batched: 47,   // total params \u2014 if all experts hit per batch
};

// ================================================================
// PAGE 6 — Expert Parallelism + All-to-All
// 8-GPU cluster, EP=8: one expert per GPU. Show how a token computed on
// GPU N might need expert X living on GPU M.
// ================================================================
export const EP_DEMO = {
  numGpus: 8,
  expertsPerGpu: 1,   // EP=8 with N=8 experts \u2014 one expert each
  // A small batch of tokens originally living on different GPUs.
  // Each token then routes to 2 experts (top-2). After routing, the token
  // payload travels to wherever those experts live.
  tokenBatch: [
    // (sourceGpu, label, dest experts)
    { src: 0, label: 'T0', dst: [3, 5] },
    { src: 0, label: 'T1', dst: [1, 6] },
    { src: 1, label: 'T2', dst: [0, 4] },
    { src: 1, label: 'T3', dst: [2, 7] },
    { src: 2, label: 'T4', dst: [5, 6] },
    { src: 2, label: 'T5', dst: [3, 0] },
    { src: 3, label: 'T6', dst: [4, 1] },
    { src: 3, label: 'T7', dst: [7, 2] },
    { src: 4, label: 'T8', dst: [6, 3] },
    { src: 4, label: 'T9', dst: [0, 5] },
    { src: 5, label: 'Ta', dst: [4, 2] },
    { src: 5, label: 'Tb', dst: [1, 7] },
    { src: 6, label: 'Tc', dst: [2, 5] },
    { src: 6, label: 'Td', dst: [0, 3] },
    { src: 7, label: 'Te', dst: [6, 1] },
    { src: 7, label: 'Tf', dst: [4, 7] },
  ],
};

// Comparison of the three collective patterns.
export const COLLECTIVE_COMPARISON = [
  { type: 'TP all-reduce',  participants: 'All TP ranks',    perStep: '2 per layer (attn + FFN)', payload: 'd_model per token', bandwidth: 'NVLink (900 GB/s) preferred', new: false },
  { type: 'PP send/recv',   participants: 'Adjacent stages', perStep: '1 per stage boundary',     payload: 'd_model per token', bandwidth: '50 GB/s sufficient',          new: false },
  { type: 'MoE all-to-all', participants: 'All EP ranks',    perStep: '2 per MoE layer (dispatch + combine)', payload: 'k * d_model per token', bandwidth: 'High NVLink need; competes with TP', new: true },
];

// ================================================================
// PAGE 7 — What This Does to the KV Cache
// Layer-step comparison: what differs between dense and MoE.
// ================================================================
export const LAYER_STEP_DIFF = [
  { stage: 'Pre-attn normalise',   dense: 'Yes',              moe: 'Yes',              changed: false },
  { stage: 'Q/K/V projection',     dense: 'd_model -> 3 projections', moe: 'Same',     changed: false },
  { stage: 'Attention',            dense: 'Q\u00b7K\u1d40, softmax, blend V', moe: 'Same', changed: false },
  { stage: 'KV cache write',       dense: 'K, V for this token',      moe: 'Same',     changed: false },
  { stage: 'Output projection',    dense: 'd_model -> d_model',       moe: 'Same',     changed: false },
  { stage: 'Pre-FFN normalise',    dense: 'Yes',                       moe: 'Yes',     changed: false },
  { stage: 'Router compute',        dense: '\u2014',                    moe: '+ d_model \u00d7 N matmul + top-k', changed: true },
  { stage: 'All-to-all dispatch',  dense: '\u2014',                    moe: '+ NCCL all-to-all over EP ranks',   changed: true },
  { stage: 'FFN compute',          dense: '1 large FFN',               moe: 'k smaller experts per token',       changed: true },
  { stage: 'All-to-all combine',   dense: '\u2014',                    moe: '+ NCCL all-to-all back to source',  changed: true },
  { stage: 'Weighted sum',         dense: '\u2014',                    moe: '+ blend k expert outputs by router weights', changed: true },
  { stage: 'Residual add',         dense: 'Yes',                       moe: 'Yes',     changed: false },
];

// ================================================================
// PAGE 8 — In Production Today
// Production MoE configurations, ordered roughly by release date.
// ================================================================
export const PRODUCTION_MODELS = [
  {
    name: 'Mixtral 8\u00d77B',
    org: 'Mistral',
    released: '2023-12',
    numExperts: 8,
    topK: 2,
    sharedExperts: 0,
    totalParams: '47B',
    activeParams: '13B',
    sparsity: '28%',
    moeLayers: 'every layer',
    notes: 'The MoE config that put open-source MoE on the map. Easiest to reason about.',
  },
  {
    name: 'Mixtral 8\u00d722B',
    org: 'Mistral',
    released: '2024-04',
    numExperts: 8,
    topK: 2,
    sharedExperts: 0,
    totalParams: '141B',
    activeParams: '39B',
    sparsity: '28%',
    moeLayers: 'every layer',
    notes: 'Same recipe as 8\u00d77B but with larger experts. 39B active competes with dense 70B.',
  },
  {
    name: 'DeepSeek-V2',
    org: 'DeepSeek',
    released: '2024-05',
    numExperts: 160,
    topK: 6,
    sharedExperts: 2,
    totalParams: '236B',
    activeParams: '21B',
    sparsity: '9%',
    moeLayers: 'except first',
    notes: 'Introduced fine-grained experts (many small ones) + shared experts that all tokens always use.',
  },
  {
    name: 'Qwen2-57B-A14B',
    org: 'Alibaba',
    released: '2024-06',
    numExperts: 64,
    topK: 8,
    sharedExperts: 4,
    totalParams: '57B',
    activeParams: '14B',
    sparsity: '25%',
    moeLayers: 'every layer',
    notes: 'Higher k (8) and shared experts. Naming convention "X-AY" = X total, Y active.',
  },
  {
    name: 'OLMoE-1B-7B',
    org: 'AI2',
    released: '2024-09',
    numExperts: 64,
    topK: 8,
    sharedExperts: 0,
    totalParams: '7B',
    activeParams: '1.3B',
    sparsity: '19%',
    moeLayers: 'every layer',
    notes: 'Fully open (weights + training data + checkpoints). Reference for studying MoE training dynamics.',
  },
  {
    name: 'Phi-3.5-MoE',
    org: 'Microsoft',
    released: '2024-08',
    numExperts: 16,
    topK: 2,
    sharedExperts: 0,
    totalParams: '42B',
    activeParams: '6.6B',
    sparsity: '16%',
    moeLayers: 'every layer',
    notes: 'Edge-friendly. 6.6B active runs comfortably on a single 24GB GPU.',
  },
  {
    name: 'DeepSeek-V3',
    org: 'DeepSeek',
    released: '2024-12',
    numExperts: 256,
    topK: 8,
    sharedExperts: 1,
    totalParams: '671B',
    activeParams: '37B',
    sparsity: '5.5%',
    moeLayers: 'except first 3',
    notes: 'Aggressive fine-grained experts (256!) + auxiliary-loss-free routing. Frontier-class on \u224835B active.',
  },
  {
    name: 'GPT-OSS-20B',
    org: 'OpenAI',
    released: '2025-08',
    numExperts: 32,
    topK: 4,
    sharedExperts: 0,
    totalParams: '20.9B',
    activeParams: '3.6B',
    sparsity: '17%',
    moeLayers: 'every layer',
    notes: 'OpenAI\u2019s first open-weights MoE. The 120B sibling uses 128 experts.',
  },
];

// ================================================================
// PAGE 9 — Summary
// ================================================================
export const RESOURCE_TRADEOFFS = [
  { resource: 'FFN compute / token',     dense: '1\u00d7 baseline',  moe: 'k / N \u00d7 baseline',  direction: 'down' },
  { resource: 'Total weight memory',     dense: '1\u00d7 baseline',  moe: 'N\u00d7 baseline (worst case)', direction: 'up' },
  { resource: 'Effective HBM bandwidth', dense: '1\u00d7 baseline',  moe: 'Approaches 1\u00d7 baseline as batch fills experts', direction: 'flat' },
  { resource: 'Inter-GPU traffic',       dense: 'TP all-reduce',     moe: '+ MoE all-to-all (new pattern)', direction: 'up' },
  { resource: 'Per-token latency',       dense: '1\u00d7 baseline',  moe: '1\u00d7 baseline + router + all-to-all', direction: 'up' },
  { resource: 'KV cache memory',         dense: '1\u00d7 baseline',  moe: '1\u00d7 baseline (unchanged)', direction: 'flat' },
];

export const FORWARD_LINKS = [
  { stop: 21, label: 'Linear / kernel attention', why: 'Different lever: reduces attention\u2019s O(n\u00b2) cost. Pairs naturally with MoE in some hybrids.' },
  { stop: 22, label: 'State Space Models / Mamba', why: 'Goes further: removes the KV cache entirely. Constant memory per layer.' },
  { stop: 23, label: 'Hybrid architectures',      why: 'Production-class designs that mix MoE FFN, sparse attention, and SSM blocks in the same stack.' },
];
