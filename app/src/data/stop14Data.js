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

// Three compression dimensions for the visual on page 1
export const COMPRESSION_DIMENSIONS = [
  {
    id: 'architectural',
    arrow: 'Columns',
    label: 'Architectural: reduce the number of KV head groups',
    techniques: 'GQA, MQA, MLA',
    detail: 'Fewer columns in the grid',
    color: 'var(--color-teal)',
  },
  {
    id: 'quantization',
    arrow: 'Cell contents',
    label: 'Quantization: reduce the precision of each number',
    techniques: 'FP16 \u2192 FP8 \u2192 INT4 \u2192 2-bit',
    detail: 'Smaller cells',
    color: 'var(--color-blue)',
  },
  {
    id: 'eviction',
    arrow: 'Rows',
    label: 'Eviction: remove entire token entries',
    techniques: 'H2O, SnapKV',
    detail: 'Fewer rows in the grid (fewer tokens cached)',
    color: 'var(--color-primary)',
  },
];

// Architectural approach comparison table (Page 2)
export const ARCH_COMPARISON = [
  {
    id: 'mha',
    name: 'MHA',
    fullName: 'Multi-Head Attention',
    kvHeads: 64,
    perToken: '2.62 MB',
    at28K: '73.3 GB',
    reduction: '1\u00d7 (baseline)',
    perTokenBytes: 2621440,
    qualityNote: 'Full baseline. Every Q head has its own K and V.',
  },
  {
    id: 'gqa',
    name: 'GQA-8',
    fullName: 'Grouped-Query Attention',
    kvHeads: 8,
    perToken: '320 KB',
    at28K: '8.96 GB',
    reduction: '8.2\u00d7',
    perTokenBytes: 327680,
    qualityNote: 'Minimal quality impact. Performance nearly indistinguishable from MHA on standard benchmarks. K and V are less head-specific than Q.',
  },
  {
    id: 'mqa',
    name: 'MQA',
    fullName: 'Multi-Query Attention',
    kvHeads: 1,
    perToken: '40 KB',
    at28K: '1.12 GB',
    reduction: '65.5\u00d7',
    perTokenBytes: 40960,
    qualityNote: 'Noticeable quality loss on complex reasoning. Only one K, V shared across all 64 Q heads. Used by PaLM, StarCoder.',
  },
  {
    id: 'mla',
    name: 'MLA',
    fullName: 'Multi-Head Latent Attention',
    kvHeads: '1 (latent)',
    perToken: '~125 KB',
    at28K: '~3.5 GB',
    reduction: '~21\u00d7',
    perTokenBytes: 128000,
    qualityNote: 'Minimal quality loss. Compresses K, V into a latent vector and reconstructs on demand. More compute at attention time, but dramatically less memory. DeepSeek\u2019s approach.',
  },
];

// Quantization precision table (Page 3)
export const QUANTIZATION_LEVELS = [
  {
    id: 'fp16',
    format: 'FP16',
    bits: 16,
    bytes: 2,
    storedValue: '0.7342529296875',
    error: '0',
    perToken: '320 KB',
    perTokenBytes: 327680,
    memoryFraction: 1.0,
  },
  {
    id: 'fp8',
    format: 'FP8 (E4M3)',
    bits: 8,
    bytes: 1,
    storedValue: '0.734375',
    error: '0.01%',
    perToken: '160 KB',
    perTokenBytes: 163840,
    memoryFraction: 0.5,
  },
  {
    id: 'int8',
    format: 'INT8',
    bits: 8,
    bytes: 1,
    storedValue: '0.7344 (scaled)',
    error: '0.02%',
    perToken: '160 KB',
    perTokenBytes: 163840,
    memoryFraction: 0.5,
  },
  {
    id: 'int4',
    format: 'INT4',
    bits: 4,
    bytes: 0.5,
    storedValue: '0.733 (scaled)',
    error: '0.2%',
    perToken: '80 KB',
    perTokenBytes: 81920,
    memoryFraction: 0.25,
  },
  {
    id: '2bit',
    format: '2-bit',
    bits: 2,
    bytes: 0.25,
    storedValue: '0.75 (ternary)',
    error: '2.1%',
    perToken: '40 KB',
    perTokenBytes: 40960,
    memoryFraction: 0.125,
  },
];

// Quantization benchmark table (Page 3)
export const QUANTIZATION_BENCHMARKS = [
  { method: 'FP8 KV cache',                compression: '2\u00d7',     accuracy: '>99%',   bestFor: 'Everything \u2014 use by default on H100/B200' },
  { method: 'INT8 uniform',                compression: '2\u00d7',     accuracy: '>99%',   bestFor: 'Broad applicability' },
  { method: 'KVTuner (mixed INT4/INT8)',    compression: '2\u20134\u00d7',  accuracy: '>97%',  bestFor: 'When memory is critical' },
  { method: 'Google TurboQuant (3-bit)',    compression: '~5\u00d7',   accuracy: '~98%',   bestFor: 'Optimized for H100 tensor cores' },
  { method: 'KIVI (per-channel INT2)',      compression: '4\u20138\u00d7',  accuracy: '~95%',  bestFor: 'Extreme compression' },
  { method: 'MiniKV (2-bit + eviction)',    compression: '8\u201316\u00d7', accuracy: '~93%',  bestFor: 'Long-context research' },
  { method: 'KVTC (transform coding)',      compression: '20\u201340\u00d7', accuracy: 'Varies', bestFor: 'Specific use cases' },
];

// Attention distribution for token eviction demo (Page 4)
export const ATTENTION_DISTRIBUTION = [
  { token: 'storage controller', weight: '48%',  pct: 48,  classification: 'Heavy hitter',  action: 'Must keep' },
  { token: 'crashed',            weight: '14%',  pct: 14,  classification: 'Important',      action: 'Keep' },
  { token: 'was',                weight: '12%',  pct: 12,  classification: 'Moderate',        action: 'Keep' },
  { token: 'server',             weight: '8%',   pct: 8,   classification: 'Moderate',        action: 'Candidate for eviction' },
  { token: 'replaced',           weight: '6%',   pct: 6,   classification: 'Low',             action: 'Candidate' },
  { token: 'because',            weight: '4%',   pct: 4,   classification: 'Low',             action: 'Candidate' },
  { token: 'the',                weight: '3%',   pct: 3,   classification: 'Very low',        action: 'Safe to evict' },
  { token: 'that',               weight: '2%',   pct: 2,   classification: 'Very low',        action: 'Safe to evict' },
  { token: 'technician',         weight: '1.5%', pct: 1.5, classification: 'Very low',        action: 'Safe to evict' },
  { token: 'last',               weight: '1%',   pct: 1,   classification: 'Negligible',      action: 'Safe to evict' },
  { token: 'week',               weight: '0.5%', pct: 0.5, classification: 'Negligible',      action: 'Safe to evict' },
];

// Combined compression calculator presets (Page 5)
export const COMBINED_PRESETS = [
  {
    id: 'mha-fp16-0',
    arch: 'MHA',
    quant: 'FP16',
    eviction: '0%',
    perToken: '2.62 MB',
    at28K: '73.3 GB',
    usersPerH100: '0.6',
    usersNote: 'doesn\u2019t fit',
    transferTime: '1,466 ms',
    highlight: false,
  },
  {
    id: 'gqa-fp16-0',
    arch: 'GQA-8',
    quant: 'FP16',
    eviction: '0%',
    perToken: '320 KB',
    at28K: '8.96 GB',
    usersPerH100: '5',
    usersNote: '',
    transferTime: '179 ms',
    highlight: false,
  },
  {
    id: 'gqa-fp8-0',
    arch: 'GQA-8',
    quant: 'FP8',
    eviction: '0%',
    perToken: '160 KB',
    at28K: '4.48 GB',
    usersPerH100: '10',
    usersNote: '',
    transferTime: '90 ms',
    highlight: true,
  },
  {
    id: 'gqa-fp8-50',
    arch: 'GQA-8',
    quant: 'FP8',
    eviction: '50%',
    perToken: '160 KB \u00d7 50%',
    at28K: '2.24 GB',
    usersPerH100: '20',
    usersNote: '',
    transferTime: '45 ms',
    highlight: false,
  },
  {
    id: 'gqa-int4-50',
    arch: 'GQA-8',
    quant: 'INT4',
    eviction: '50%',
    perToken: '80 KB \u00d7 50%',
    at28K: '1.12 GB',
    usersPerH100: '40',
    usersNote: '',
    transferTime: '22 ms',
    highlight: false,
  },
  {
    id: 'mla-fp8-0',
    arch: 'MLA',
    quant: 'FP8',
    eviction: '0%',
    perToken: '~62 KB',
    at28K: '~1.75 GB',
    usersPerH100: '25',
    usersNote: '',
    transferTime: '35 ms',
    highlight: false,
  },
  {
    id: 'mqa-int4-75',
    arch: 'MQA',
    quant: 'INT4',
    eviction: '75%',
    perToken: '10 KB \u00d7 25%',
    at28K: '~70 MB',
    usersPerH100: '642',
    usersNote: '',
    transferTime: '1.4 ms',
    highlight: false,
  },
];

// Accuracy by task type (Page 6)
export const ACCURACY_BY_TASK = [
  { compression: 'FP8 (2\u00d7)',                  chatQA: '99.5%', summarization: '99.3%', codeGen: '99.2%', mathReasoning: '99.0%', longRetrieval: '99.1%' },
  { compression: 'INT4 (4\u00d7)',                  chatQA: '97%',   summarization: '96%',   codeGen: '95%',   mathReasoning: '93%',   longRetrieval: '94%' },
  { compression: '50% eviction (2\u00d7)',          chatQA: '96%',   summarization: '95%',   codeGen: '94%',   mathReasoning: '88%',   longRetrieval: '82%' },
  { compression: '2-bit quant (8\u00d7)',           chatQA: '93%',   summarization: '91%',   codeGen: '89%',   mathReasoning: '85%',   longRetrieval: '80%' },
  { compression: 'INT4 + 50% eviction (8\u00d7)',   chatQA: '93%',   summarization: '92%',   codeGen: '90%',   mathReasoning: '82%',   longRetrieval: '75%' },
];

// Infrastructure impact table (Page 7) — FP16 vs FP8 comparison
export const INFRA_IMPACT = [
  { component: 'Per token cache',                     fp16: '320 KB',                  fp8: '160 KB',                    improvement: '2\u00d7 smaller' },
  { component: '28K conversation',                     fp16: '8.96 GB',                 fp8: '4.48 GB',                   improvement: '2\u00d7 smaller' },
  { component: 'Active users per GPU (Stop 11)',       fp16: '18',                      fp8: '36',                        improvement: '2\u00d7 more' },
  { component: 'Batch size capacity (Stop 11)',        fp16: '18',                      fp8: '36',                        improvement: '2\u00d7 larger batches' },
  { component: 'PagedAttention pages (Stop 11)',       fp16: '5.12 MB/block',           fp8: '2.56 MB/block',             improvement: '2\u00d7 more blocks per GB' },
  { component: 'P/D transfer (Stop 12)',               fp16: '179 ms',                  fp8: '90 ms',                     improvement: '2\u00d7 faster TTFT' },
  { component: 'G2 capacity (Stop 13)',                fp16: '800 warm conversations',  fp8: '1,600',                     improvement: '2\u00d7 more' },
  { component: 'G3.5 promotion (Stop 13)',             fp16: '192 ms',                  fp8: '96 ms',                     improvement: '2\u00d7 faster retrieval' },
  { component: 'Cache hit rate (Stop 13)',             fp16: 'Baseline',                fp8: 'Higher (more fits per tier)', improvement: 'Fewer costly recomputes' },
  { component: 'Network bandwidth (promotion/demotion)', fp16: 'Baseline',             fp8: '50% of data moved',         improvement: '2\u00d7 headroom' },
  { component: 'Accuracy',                             fp16: '100% baseline',           fp8: '99%+',                      improvement: 'Negligible loss' },
];

// Summary table (Page 8)
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
