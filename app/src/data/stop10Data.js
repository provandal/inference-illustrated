// Stop 10: And Now, The Cache — The Bridge

export const PAGES = [
  { id: 'intro',          label: 'Everything We Built',     type: 'static' },
  { id: 'two-phases',     label: 'Two Phases',              type: 'static' },
  { id: 'multi-turn',     label: 'Multi-Turn',              type: 'static' },
  { id: 'tradeoff',       label: 'The Tradeoff',            type: 'static' },
  { id: 'calculation',    label: 'The Full Calculation',    type: 'static' },
  { id: 'memory-wall',    label: 'The Memory Wall',         type: 'static' },
  { id: 'infrastructure', label: 'Two Different Problems',  type: 'static' },
  { id: 'bridge',         label: 'Welcome to Act 2',        type: 'static' },
];

// Llama-3 70B cache formula components
export const CACHE_FORMULA = {
  layers: 80,
  kvHeads: 8,
  dHead: 128,
  precision: 2,       // FP16 = 2 bytes
  coefficient: 327680, // 2 × 80 × 8 × 128 × 2 = 327,680 bytes per token
};

// KV cache sizes at various context lengths (FP16)
export const CACHE_SIZES = [
  { context: '1K',   size8b: '128 MB',   size70b: '320 MB',   description: 'Short prompt + brief answer' },
  { context: '8K',   size8b: '1.0 GB',   size70b: '2.5 GB',   description: 'Typical multi-turn conversation' },
  { context: '32K',  size8b: '4.0 GB',   size70b: '10.0 GB',  description: 'Long conversation or document analysis' },
  { context: '128K', size8b: '16.0 GB',  size70b: '40.0 GB',  description: 'Full context window utilized' },
];

// Memory-wall scenarios: Llama-3 70B on H100 (80 GB), FP4 weights = ~35 GB, leaving ~45 GB
export const MEMORY_WALL_SCENARIOS = [
  { users: 1,  context: '128K', cache: '40 GB',  fits: true,  note: 'Barely' },
  { users: 2,  context: '128K', cache: '80 GB',  fits: false, note: '35 GB over' },
  { users: 2,  context: '64K',  cache: '40 GB',  fits: true },
  { users: 8,  context: '8K',   cache: '20 GB',  fits: true },
  { users: 8,  context: '32K',  cache: '80 GB',  fits: false, note: '35 GB over' },
  { users: 32, context: '8K',   cache: '80 GB',  fits: false, note: '35 GB over' },
];

// Prefill vs. decode comparison
export const PREFILL_VS_DECODE = [
  {
    property: 'Tokens processed',
    prefill: 'All input tokens at once',
    decode: 'One new token per step',
  },
  {
    property: 'Bottleneck',
    prefill: 'Compute-bound (matrix math)',
    decode: 'Memory-bound (reading cache)',
  },
  {
    property: 'GPU utilization',
    prefill: 'High — large batch of parallel work',
    decode: 'Low — mostly waiting on memory reads',
  },
  {
    property: 'Cache role',
    prefill: 'Write: fill K and V for all input tokens',
    decode: 'Read: look up all K and V at every layer',
  },
  {
    property: 'Scaling challenge',
    prefill: 'More compute (scales with input length)',
    decode: 'More memory bandwidth (scales with context)',
  },
];

// Act 2 preview: stops 11–17
export const ACT2_PREVIEW = [
  { stop: 11, title: 'KV Cache Quantization',       description: 'Shrinking the cache with lower precision — trading accuracy for capacity.' },
  { stop: 12, title: 'Eviction & Windowing',         description: 'When the cache is full, which tokens do you keep and which do you discard?' },
  { stop: 13, title: 'Paged Attention',              description: 'Virtual memory for the KV cache — how vLLM eliminated memory fragmentation.' },
  { stop: 14, title: 'Continuous Batching',           description: 'Serving many users on one GPU by interleaving their decode steps.' },
  { stop: 15, title: 'Speculative Decoding',          description: 'Using a small model to draft tokens and a large model to verify — in parallel.' },
  { stop: 16, title: 'Disaggregated Inference',       description: 'Splitting prefill and decode onto separate hardware — and shipping the cache between them.' },
  { stop: 17, title: 'The Frontier',                  description: 'MLA, RadixAttention, cache-aware routing, and where the field is heading next.' },
];
