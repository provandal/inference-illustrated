// Stop 14: Compressing the Cache — Making It Smaller

export const PAGES = [
  { id: 'cascading',         label: 'Every Byte Saved Compounds',     type: 'static' },
  { id: 'architectural',     label: 'Architectural Compression',      type: 'interactive' },
  { id: 'quantization',      label: 'Quantization',                   type: 'interactive' },
  { id: 'eviction',          label: 'Token Eviction',                 type: 'interactive' },
  { id: 'combined',          label: 'Combining Techniques',           type: 'interactive' },
  { id: 'accuracy',          label: 'Accuracy vs. Compression',       type: 'static' },
  { id: 'infrastructure',    label: 'The Infrastructure Impact',      type: 'static' },
  { id: 'summary',           label: 'Stop 14 at a Glance',            type: 'static' },
];

// Narration text for each page. Uses Unicode directly (no HTML entity escaping).
// HTML tags are allowed and rendered via dangerouslySetInnerHTML.
export const NARRATIONS = {
  cascading:
    'In our scenario, Llama-3 70B\u2019s KV cache takes 320 KB per token at FP16. For a 28,000-token conversation, that\u2019s 8.96 GB. If we could cut that in half \u2014 to 160 KB per token, 4.48 GB total \u2014 the effect cascades through every tier we saw in Stop 13: <strong>G1 (HBM)</strong> fits 288 active users instead of 144. <strong>G2 (DRAM)</strong> fits 1,600 warm conversations instead of 800. <strong>Transfer time:</strong> the P/D transfer from Stop 12 drops from 180 ms to 90 ms. <strong>Cache hit rate:</strong> more conversations maintained = fewer misses = fewer costly recomputes. <strong>Network bandwidth:</strong> every promotion/demotion moves half the data.\n\nCompression doesn\u2019t just save memory. It improves latency, throughput, network utilization, and cost at every level of the stack. That\u2019s why it\u2019s one of the most actively researched areas in LLM inference. There are three families of techniques, each attacking a different dimension of the cache.',

  architectural:
    'We introduced GQA in Stop 8 \u2014 grouping attention heads to share K and V. Now let\u2019s see all three architectural approaches in depth, with concrete cache sizes for our scenario.\n\nThese techniques are <strong>built into the model architecture</strong>. They\u2019re chosen during model design and training, not applied afterward. If a model was trained with GQA, you can\u2019t switch it to MHA or MLA later \u2014 the weight matrices were shaped for one specific approach.',

  quantization:
    'Architectural compression reduces the <em>number</em> of vectors stored per token. Quantization reduces the <em>precision</em> of each number within those vectors.\n\nEvery number in the KV cache is stored as a floating-point value. At FP16 (16-bit), each number uses 2 bytes. At FP8 (8-bit), just 1 byte. At INT4 (4-bit), half a byte. Each step halves the memory \u2014 and each step loses some numerical precision.',

  eviction:
    'The third family takes a radical approach: instead of making each entry smaller, remove entire token entries from the cache. If a token contributed almost nothing to attention in the past, it probably won\u2019t matter in the future. Why store it?\n\nThis sounds dangerous \u2014 and it can be. But research shows that attention is highly skewed: a small fraction of tokens receive the vast majority of attention weight. Most tokens contribute almost nothing. The challenge is identifying which tokens are important and which can be safely evicted.',

  combined:
    'The three compression families are independent \u2014 you can stack them. Let\u2019s see the combined effect on our scenario\u2019s 28,000-token conversation with Llama-3 70B. Dial the three axes and watch every metric update in real time.',

  accuracy:
    'Every compression technique promises \u201cminimal accuracy loss.\u201d But \u201cminimal\u201d means different things for different tasks. A chatbot answering general questions is more forgiving than a reasoning model solving math problems. Here\u2019s what the benchmarks actually show.',

  infrastructure:
    'Let\u2019s trace the impact of compression through every component we\u2019ve built in Stops 11\u201313. For our scenario, comparing GQA + FP16 (the baseline from Stops 11\u201313) with GQA + FP8 (the recommended production setting).',

  summary:
    'Three families of compression, each attacking a different dimension of the cache. Architectural changes are chosen at model design time. Quantization and eviction are applied at inference time. All three can be combined.',
};

// --- Page 1: Cache grid visualization (rows=layers, cols=KV head groups) ---
export const CACHE_GRID = {
  layers: 80,
  kvHeads: 8,
  dHead: 128,
  bytesPerValue: 2, // FP16
  // For the rendered visual we draw a down-sampled grid
  visualRows: 10,    // represents 80 layers (each = 8 layers)
  visualCols: 8,
  cellNumbers: 4,    // label "128 numbers" but show 4 dots per cell
};

// Three compression dimensions for the visual on page 1
export const COMPRESSION_DIMENSIONS = [
  {
    id: 'architectural',
    arrow: 'Columns',
    label: 'Architectural: reduce the number of KV head groups',
    techniques: 'GQA, MQA, MLA',
    detail: 'Fewer columns in the grid',
    color: 'var(--color-teal)',
    axis: 'horizontal',
  },
  {
    id: 'quantization',
    arrow: 'Cell contents',
    label: 'Quantization: reduce the precision of each number',
    techniques: 'FP16 \u2192 FP8 \u2192 INT4 \u2192 2-bit',
    detail: 'Smaller cells',
    color: 'var(--color-blue)',
    axis: 'cell',
  },
  {
    id: 'eviction',
    arrow: 'Rows',
    label: 'Eviction: remove entire token entries',
    techniques: 'H2O, SnapKV',
    detail: 'Fewer rows in the grid (fewer tokens cached)',
    color: 'var(--color-primary)',
    axis: 'vertical',
  },
];

// The multiplicative example for page 1
export const COMPOUND_EXAMPLE = {
  gqaFactor: 8,
  fp8Factor: 2,
  evictionFactor: 2,
  totalFactor: 32, // 8 * 2 * 2
  baselineGB: 8.96,
  compressedMB: 280, // 8.96 GB / 32 ≈ 280 MB
};

// --- Page 2: Architectural approach comparison table ---
export const ARCH_COMPARISON = [
  {
    id: 'mha',
    name: 'MHA',
    fullName: 'Multi-Head Attention',
    kvHeads: 64,
    kvHeadsLabel: '64',
    perToken: '2.62 MB',
    at28K: '73.3 GB',
    reduction: '1\u00d7 (baseline)',
    reductionNum: 1,
    perTokenBytes: 2621440, // 2.5 MB-ish
    // For users-per-H100 calc: H100 has 80 GB total, ~35 GB weights => 45 GB for cache
    usersPerH100: 0.6,
    qualityNote:
      'Full baseline. Every Q head has its own K and V. Per token: 2 \u00d7 80 layers \u00d7 64 KV heads \u00d7 128 d_head \u00d7 2 bytes = 2.62 MB. At 28K tokens, one user nearly fills an H100.',
    formula: '2 \u00d7 80 \u00d7 64 \u00d7 128 \u00d7 2 bytes',
  },
  {
    id: 'gqa',
    name: 'GQA-8',
    fullName: 'Grouped-Query Attention',
    kvHeads: 8,
    kvHeadsLabel: '8',
    perToken: '320 KB',
    at28K: '8.96 GB',
    reduction: '8.2\u00d7',
    reductionNum: 8.2,
    perTokenBytes: 327680,
    usersPerH100: 5,
    qualityNote:
      'Minimal quality impact. Ablation studies in the Llama-2 and GQA papers show performance nearly indistinguishable from MHA on standard benchmarks. The insight: K and V are less head-specific than Q. Multiple Q heads asking different questions can effectively share the same K, V representation. This is what Llama-3 actually uses.',
    formula: '2 \u00d7 80 \u00d7 8 \u00d7 128 \u00d7 2 bytes',
  },
  {
    id: 'mqa',
    name: 'MQA',
    fullName: 'Multi-Query Attention',
    kvHeads: 1,
    kvHeadsLabel: '1',
    perToken: '40 KB',
    at28K: '1.12 GB',
    reduction: '65.5\u00d7',
    reductionNum: 65.5,
    perTokenBytes: 40960,
    usersPerH100: 40,
    qualityNote:
      'Noticeable on some tasks. With only one K, V representation shared across all 64 Q heads, the model loses the ability to specialize its Key and Value representations. Works well for simpler tasks, degrades on complex reasoning. Introduced by Noam Shazeer (2019). Used by PaLM, StarCoder.',
    formula: '2 \u00d7 80 \u00d7 1 \u00d7 128 \u00d7 2 bytes',
  },
  {
    id: 'mla',
    name: 'MLA',
    fullName: 'Multi-Head Latent Attention',
    kvHeads: '1 (latent)',
    kvHeadsLabel: '1 latent',
    perToken: '~125 KB',
    at28K: '~3.5 GB',
    reduction: '~21\u00d7',
    reductionNum: 21,
    perTokenBytes: 128000,
    usersPerH100: 12,
    qualityNote:
      'Minimal \u2014 the compression is trained end-to-end, so the model learns to preserve the information that matters in the latent space. Tradeoff: more compute at attention time (reconstructing K, V from the latent), but dramatically less memory. DeepSeek\u2019s approach. MLA blocks are ~2.5\u00d7 smaller than GQA blocks, meaning faster transfers, more conversations per tier, and higher cache hit rates.',
    formula: '2 \u00d7 61 \u00d7 1 \u00d7 512 \u00d7 2 bytes (latent dim)',
  },
];

// --- Page 3: Quantization precision table ---
export const QUANTIZATION_LEVELS = [
  {
    id: 'fp16',
    format: 'FP16',
    bits: 16,
    bytes: 2,
    storedValue: '0.7342529296875',
    error: '0',
    errorNum: 0,
    perToken: '320 KB',
    perTokenBytes: 327680,
    memoryFraction: 1.0,
    accuracyRetention: 100,
  },
  {
    id: 'fp8',
    format: 'FP8 (E4M3)',
    bits: 8,
    bytes: 1,
    storedValue: '0.734375',
    error: '0.01%',
    errorNum: 0.01,
    perToken: '160 KB',
    perTokenBytes: 163840,
    memoryFraction: 0.5,
    accuracyRetention: 99.2,
  },
  {
    id: 'int8',
    format: 'INT8',
    bits: 8,
    bytes: 1,
    storedValue: '0.7344 (scaled)',
    error: '0.02%',
    errorNum: 0.02,
    perToken: '160 KB',
    perTokenBytes: 163840,
    memoryFraction: 0.5,
    accuracyRetention: 99.0,
  },
  {
    id: 'int4',
    format: 'INT4',
    bits: 4,
    bytes: 0.5,
    storedValue: '0.733 (scaled)',
    error: '0.2%',
    errorNum: 0.2,
    perToken: '80 KB',
    perTokenBytes: 81920,
    memoryFraction: 0.25,
    accuracyRetention: 95,
  },
  {
    id: '2bit',
    format: '2-bit',
    bits: 2,
    bytes: 0.25,
    storedValue: '0.75 (ternary)',
    error: '2.1%',
    errorNum: 2.1,
    perToken: '40 KB',
    perTokenBytes: 40960,
    memoryFraction: 0.125,
    accuracyRetention: 88,
  },
];

// Quantization benchmark table (Page 3)
export const QUANTIZATION_BENCHMARKS = [
  { method: 'FP8 KV cache',                compression: '2\u00d7',         accuracy: '>99%',   bestFor: 'Everything \u2014 use by default on H100/B200' },
  { method: 'INT8 uniform',                compression: '2\u00d7',         accuracy: '>99%',   bestFor: 'Broad applicability' },
  { method: 'KVTuner (mixed INT4/INT8)',    compression: '2\u20134\u00d7',  accuracy: '>97%',   bestFor: 'When memory is critical' },
  { method: 'Google TurboQuant (3-bit)',    compression: '~5\u00d7',        accuracy: '~98%',   bestFor: 'Optimized for H100 tensor cores' },
  { method: 'KIVI (per-channel INT2)',      compression: '4\u20138\u00d7',  accuracy: '~95%',   bestFor: 'Extreme compression' },
  { method: 'MiniKV (2-bit + eviction)',    compression: '8\u201316\u00d7', accuracy: '~93%',   bestFor: 'Long-context research' },
  { method: 'KVTC (transform coding)',      compression: '20\u201340\u00d7', accuracy: 'Varies', bestFor: 'Specific use cases' },
];

// --- Page 4: Attention distribution for token eviction demo ---
export const ATTENTION_DISTRIBUTION = [
  { token: 'storage controller', weight: '48%',  pct: 48,  classification: 'Heavy hitter',  action: 'Must keep' },
  { token: 'crashed',            weight: '14%',  pct: 14,  classification: 'Important',      action: 'Keep' },
  { token: 'was',                weight: '12%',  pct: 12,  classification: 'Moderate',       action: 'Keep' },
  { token: 'server',             weight: '8%',   pct: 8,   classification: 'Moderate',       action: 'Candidate' },
  { token: 'replaced',           weight: '6%',   pct: 6,   classification: 'Low',            action: 'Candidate' },
  { token: 'because',            weight: '4%',   pct: 4,   classification: 'Low',            action: 'Candidate' },
  { token: 'the (word 5)',       weight: '3%',   pct: 3,   classification: 'Very low',       action: 'Safe to evict' },
  { token: 'that',               weight: '2%',   pct: 2,   classification: 'Very low',       action: 'Safe to evict' },
  { token: 'technician',         weight: '1.5%', pct: 1.5, classification: 'Very low',       action: 'Safe to evict' },
  { token: 'last',               weight: '1%',   pct: 1,   classification: 'Negligible',     action: 'Safe to evict' },
  { token: 'week',               weight: '0.5%', pct: 0.5, classification: 'Negligible',     action: 'Safe to evict' },
];

// Eviction strategy cards
export const EVICTION_STRATEGIES = [
  {
    id: 'h2o',
    name: 'H2O (Heavy-Hitter Oracle)',
    summary:
      'Tracks cumulative attention scores for each token across all queries. Keeps the \u201cheavy hitters\u201d plus a window of recent tokens. Evicts everything else.',
    budget: 'Top 20% by attention + last 128 tokens',
    reduction: '5\u00d7 (80% evicted)',
    accuracy: '90\u201395% of full-cache performance',
    risk: 'Degrades on tasks requiring precise recall of details buried deep in context.',
    color: 'var(--color-teal)',
  },
  {
    id: 'snapkv',
    name: 'SnapKV',
    summary:
      'Uses a smarter observation window: examines attention patterns from recent queries and selects tokens that are consistently important within that window. Clusters to identify representatives.',
    budget: 'Clustered representatives from observation window',
    reduction: 'Similar to H2O',
    accuracy: 'Better retention on long-context tasks',
    risk: 'Still vulnerable to surprise queries about evicted content.',
    color: 'var(--color-blue)',
  },
];

// Adaptive precision research entries (Page 4)
export const ADAPTIVE_PRECISION = [
  {
    id: 'thinkv',
    name: 'ThinKV (2025)',
    tagline: 'Thought-adaptive',
    body:
      'Classifies tokens by their role in reasoning chains and assigns precision accordingly: FP8 for reasoning tokens (highest importance), NVFP4 for execution tokens (moderate), 2-bit ternary for transitional phrases (lowest). Classification happens dynamically during inference \u2014 the system watches which tokens participate in attention and adjusts their precision on the fly.',
    color: 'var(--color-teal)',
  },
  {
    id: 'vqkv',
    name: 'VQKV \u2014 Vector Quantization (2026)',
    tagline: 'Codebook-based',
    body:
      'Replaces groups of floating-point values with indices into a learned codebook \u2014 a table of representative vectors trained during calibration. Instead of storing 128 FP16 numbers (256 bytes) for a K or V vector, store a codebook index (a few bytes). Result: 82.8% compression ratio with 98.6% accuracy retention on LongBench \u2014 substantially better than scalar quantization at equivalent levels.',
    color: 'var(--color-blue)',
  },
];

// --- Page 5: Combined calculator ---
// Architecture options (per-token bytes)
export const CALC_ARCH_OPTIONS = [
  { id: 'mha',   label: 'MHA',   perTokenBytes: 2621440, fp16PerTokenKB: 2621.44 }, // 2.62 MB
  { id: 'gqa',   label: 'GQA-8', perTokenBytes: 327680,  fp16PerTokenKB: 320 },
  { id: 'mqa',   label: 'MQA',   perTokenBytes: 40960,   fp16PerTokenKB: 40 },
  { id: 'mla',   label: 'MLA',   perTokenBytes: 128000,  fp16PerTokenKB: 125 },
];

// Quantization options (multiplier on FP16 size)
export const CALC_QUANT_OPTIONS = [
  { id: 'fp16', label: 'FP16', factor: 1.0 },
  { id: 'fp8',  label: 'FP8',  factor: 0.5 },
  { id: 'int4', label: 'INT4', factor: 0.25 },
];

// Eviction options (fraction of tokens kept)
export const CALC_EVICTION_OPTIONS = [
  { id: 'e0',  label: '0%',  value: 0,    keep: 1.0 },
  { id: 'e25', label: '25%', value: 0.25, keep: 0.75 },
  { id: 'e50', label: '50%', value: 0.5,  keep: 0.5 },
  { id: 'e75', label: '75%', value: 0.75, keep: 0.25 },
];

// Scenario constants for the calculator
export const CALC_SCENARIO = {
  totalTokens: 28000,
  gpuCacheBudgetGB: 45, // ~80 GB - 35 GB weights
  transferBandwidthGBs: 50, // 400 Gbps RDMA
  baselineMhaFp16PerTokenBytes: 2621440,
  baselineMhaFp16At28KGB: 73.3,
};

// 7 preset combinations for the table
export const COMBINED_PRESETS = [
  { id: 'mha-fp16-0',  arch: 'MHA',   quant: 'FP16', eviction: '0%',  perToken: '2.62 MB', at28K: '73.3 GB', usersPerH100: '0.6', usersNote: 'doesn\u2019t fit', transferTime: '1,466 ms', at28KGB: 73.3,  highlight: false },
  { id: 'gqa-fp16-0',  arch: 'GQA-8', quant: 'FP16', eviction: '0%',  perToken: '320 KB',  at28K: '8.96 GB', usersPerH100: '5',   usersNote: '',                   transferTime: '179 ms',   at28KGB: 8.96,  highlight: false },
  { id: 'gqa-fp8-0',   arch: 'GQA-8', quant: 'FP8',  eviction: '0%',  perToken: '160 KB',  at28K: '4.48 GB', usersPerH100: '10',  usersNote: '',                   transferTime: '90 ms',    at28KGB: 4.48,  highlight: true },
  { id: 'gqa-fp8-50',  arch: 'GQA-8', quant: 'FP8',  eviction: '50%', perToken: '160 KB \u00d7 50%', at28K: '2.24 GB', usersPerH100: '20', usersNote: '', transferTime: '45 ms', at28KGB: 2.24, highlight: false },
  { id: 'gqa-int4-50', arch: 'GQA-8', quant: 'INT4', eviction: '50%', perToken: '80 KB \u00d7 50%',  at28K: '1.12 GB', usersPerH100: '40', usersNote: '', transferTime: '22 ms', at28KGB: 1.12, highlight: false },
  { id: 'mla-fp8-0',   arch: 'MLA',   quant: 'FP8',  eviction: '0%',  perToken: '~62 KB',  at28K: '~1.75 GB', usersPerH100: '25',  usersNote: '', transferTime: '35 ms', at28KGB: 1.75, highlight: false },
  { id: 'mqa-int4-75', arch: 'MQA',   quant: 'INT4', eviction: '75%', perToken: '10 KB \u00d7 25%',  at28K: '~70 MB',  usersPerH100: '642', usersNote: 'theoretical', transferTime: '1.4 ms', at28KGB: 0.07, highlight: false },
];

// --- Page 6: Accuracy by task type ---
export const ACCURACY_BY_TASK = [
  { compression: 'FP8 (2\u00d7)',                  chatQA: 99.5, summarization: 99.3, codeGen: 99.2, mathReasoning: 99.0, longRetrieval: 99.1, recommendation: 'Safe for all tasks.' },
  { compression: 'INT4 (4\u00d7)',                  chatQA: 97,   summarization: 96,   codeGen: 95,   mathReasoning: 93,   longRetrieval: 94,   recommendation: 'Acceptable for chat/docs. Risky for reasoning and code review.' },
  { compression: '50% eviction (2\u00d7)',          chatQA: 96,   summarization: 95,   codeGen: 94,   mathReasoning: 88,   longRetrieval: 82,   recommendation: 'OK for chat. Avoid for retrieval/reasoning.' },
  { compression: '2-bit quant (8\u00d7)',           chatQA: 93,   summarization: 91,   codeGen: 89,   mathReasoning: 85,   longRetrieval: 80,   recommendation: 'Research-grade only. Not for production.' },
  { compression: 'INT4 + 50% eviction (8\u00d7)',   chatQA: 93,   summarization: 92,   codeGen: 90,   mathReasoning: 82,   longRetrieval: 75,   recommendation: 'Experimental. Only for simple chat workloads.' },
];

// Task-type descriptions for accuracy page
export const TASK_TYPES = [
  { id: 'chatQA',         label: 'Chat / QA',          note: 'Forgiving \u2014 broad context suffices' },
  { id: 'summarization',  label: 'Summarization',      note: 'Robust to compression' },
  { id: 'codeGen',        label: 'Code generation',    note: 'Sensitive to precision in symbol names' },
  { id: 'mathReasoning',  label: 'Math reasoning',     note: 'Needs precise numerical values' },
  { id: 'longRetrieval',  label: 'Long-context retrieval', note: 'Needs every token available' },
];

// --- Page 7: Infrastructure impact table ---
export const INFRA_IMPACT = [
  { component: 'Per token cache',                       fp16: '320 KB',                  fp8: '160 KB',                      improvement: '2\u00d7 smaller',           fp16Num: 320,  fp8Num: 160 },
  { component: '28K conversation',                      fp16: '8.96 GB',                 fp8: '4.48 GB',                     improvement: '2\u00d7 smaller',           fp16Num: 8.96, fp8Num: 4.48 },
  { component: 'Active users per GPU (Stop 11)',        fp16: '18',                      fp8: '36',                          improvement: '2\u00d7 more',              fp16Num: 18,   fp8Num: 36 },
  { component: 'Batch size capacity (Stop 11)',         fp16: '18',                      fp8: '36',                          improvement: '2\u00d7 larger batches',    fp16Num: 18,   fp8Num: 36 },
  { component: 'PagedAttention pages (Stop 11)',        fp16: '5.12 MB/block',           fp8: '2.56 MB/block',               improvement: '2\u00d7 more blocks per GB', fp16Num: 5.12, fp8Num: 2.56 },
  { component: 'P/D transfer (Stop 12)',                fp16: '179 ms',                  fp8: '90 ms',                       improvement: '2\u00d7 faster TTFT',        fp16Num: 179,  fp8Num: 90 },
  { component: 'G2 capacity (Stop 13)',                 fp16: '800 warm conversations',  fp8: '1,600',                       improvement: '2\u00d7 more',               fp16Num: 800,  fp8Num: 1600 },
  { component: 'G3.5 promotion (Stop 13)',              fp16: '192 ms',                  fp8: '96 ms',                       improvement: '2\u00d7 faster retrieval',   fp16Num: 192,  fp8Num: 96 },
  { component: 'Cache hit rate (Stop 13)',              fp16: 'Baseline',                fp8: 'Higher (more fits per tier)', improvement: 'Fewer costly recomputes',    fp16Num: null, fp8Num: null },
  { component: 'Network bandwidth (promotion/demotion)', fp16: 'Baseline',               fp8: '50% of data moved',           improvement: '2\u00d7 headroom',           fp16Num: null, fp8Num: null },
  { component: 'Accuracy',                              fp16: '100% baseline',           fp8: '99%+',                        improvement: 'Negligible loss',            fp16Num: 100,  fp8Num: 99 },
];

// --- Page 8: Summary table ---
export const SUMMARY_TABLE = [
  {
    family: 'Architectural (GQA/MQA/MLA)',
    compresses: 'Number of KV head groups',
    whenApplied: 'Model design + training',
    typicalReduction: '8\u201365\u00d7 vs MHA',
    accuracyCost: 'Minimal (trained for it)',
  },
  {
    family: 'Quantization (FP8/INT4/2-bit)',
    compresses: 'Precision of each number',
    whenApplied: 'Inference time (post-training)',
    typicalReduction: '2\u20138\u00d7',
    accuracyCost: 'FP8: negligible. INT4: modest. 2-bit: significant',
  },
  {
    family: 'Token eviction (H2O/SnapKV)',
    compresses: 'Number of tokens cached',
    whenApplied: 'Inference time (dynamic)',
    typicalReduction: '2\u20135\u00d7',
    accuracyCost: 'Task-dependent. Reasoning degrades fastest',
  },
  {
    family: 'Combined',
    compresses: 'All dimensions',
    whenApplied: 'All stages',
    typicalReduction: '16\u20131,000\u00d7',
    accuracyCost: 'Depends on combination',
    highlight: true,
  },
];
