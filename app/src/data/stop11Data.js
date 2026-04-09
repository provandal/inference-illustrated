// Stop 11: The Memory Wall — Up Close (Act 2, Stop 1)

export const PAGES = [
  { id: 'math-works',        label: 'The Math Says It Should Work',  type: 'static' },
  { id: 'math-lies',         label: 'Why the Math Lies',             type: 'static' },
  { id: 'batching-why',      label: 'Why Batching Is Non-Negotiable',type: 'static' },
  { id: 'static-batching',   label: 'Static Batching',               type: 'static' },
  { id: 'continuous-batching',label: 'Continuous Batching',           type: 'static' },
  { id: 'paged-attention',   label: 'PagedAttention',                type: 'static' },
  { id: 'memory-runs-out',   label: 'When Memory Runs Out',          type: 'static' },
  { id: 'summary',           label: 'Stop 11 at a Glance',           type: 'static' },
];

// Scenario calculator — the "everything fits" table from Page 1
export const SCENARIO_CALCULATOR = [
  { label: 'Model',               value: 'Llama-3 70B',  source: 'Scenario' },
  { label: 'Weights (FP4)',       value: '35 GB',        source: 'Stop 8' },
  { label: 'KV cache per token',  value: '320 KB',       source: 'Stop 8/9' },
  { label: 'Users',               value: '32',           source: 'Scenario' },
  { label: 'Context per user',    value: '8K tokens',    source: 'Scenario' },
  { label: 'Cache per user',      value: '2.5 GB',       source: '320 KB \u00d7 8K' },
  { label: 'Total cache',         value: '80 GB',        source: '2.5 GB \u00d7 32' },
  { label: 'Total memory',        value: '115 GB',       source: '35 + 80' },
  { label: 'Available (8\u00d7 H100)', value: '640 GB',  source: '8 \u00d7 80' },
  { label: 'Utilization',         value: '18%',          source: '115 / 640', highlight: true },
];

// Batch size vs utilization table (Page 3)
export const BATCH_UTILIZATION = [
  { batchSize: 1,   weightRead: '35 GB', tokensProcessed: '1 token',    utilization: '~5%',  note: 'cores mostly idle' },
  { batchSize: 8,   weightRead: '35 GB', tokensProcessed: '8 tokens',   utilization: '~30%', note: '' },
  { batchSize: 32,  weightRead: '35 GB', tokensProcessed: '32 tokens',  utilization: '~70%', note: '' },
  { batchSize: 128, weightRead: '35 GB', tokensProcessed: '128 tokens', utilization: '~95%', note: 'near saturation' },
];

// Static batching waste calculation (Page 4)
export const STATIC_BATCHING_USERS = [
  { id: 'A', promptTokens: 500,  generateTokens: 20,  finishStep: 20 },
  { id: 'B', promptTokens: 2000, generateTokens: 50,  finishStep: 50 },
  { id: 'C', promptTokens: 8000, generateTokens: 500, finishStep: 500 },
  { id: 'D', promptTokens: 1000, generateTokens: 30,  finishStep: 30 },
];

export const STATIC_BATCHING_WASTE = [
  { metric: 'Total slot-steps available', value: '4 \u00d7 500 = 2,000' },
  { metric: 'Total slot-steps used',      value: '20 + 50 + 500 + 30 = 600' },
  { metric: 'Waste',                      value: '70%', highlight: true },
];

// Continuous vs static batching comparison (Page 5)
export const CONTINUOUS_VS_STATIC = [
  { metric: 'Slot utilization',     staticVal: '30%',          continuousVal: '~98%' },
  { metric: 'Throughput (tokens/sec)', staticVal: 'Low',       continuousVal: '2\u201324\u00d7 higher' },
  { metric: 'GPU idle time',        staticVal: 'Significant',  continuousVal: 'Near zero' },
];

// Traditional vs paged allocation comparison (Page 6)
export const TRADITIONAL_ALLOCATION = [
  { id: 'A', allocated: '10 GB', used: '2.5 GB', waste: '75%' },
  { id: 'B', allocated: '10 GB', used: '4 GB',   waste: '60%' },
  { id: 'C', allocated: '10 GB', used: '8 GB',   waste: '20%' },
  { id: 'D', allocated: '10 GB', used: '1 GB',   waste: '90%' },
];

export const TRADITIONAL_TOTALS = {
  allocated: '40 GB',
  used: '15.5 GB',
  waste: '24.5 GB',
  wastePercent: '~63%',
  remaining: '5 GB',
  maxConversations: 4,
};

export const PAGED_ALLOCATION = [
  { id: 'A', pages: 156,  used: '2.5 GB' },
  { id: 'B', pages: 250,  used: '4 GB' },
  { id: 'C', pages: 500,  used: '8 GB' },
  { id: 'D', pages: 63,   used: '1 GB' },
];

export const PAGED_TOTALS = {
  used: '15.5 GB',
  free: '29.5 GB',
  wastePercent: '~3%',
  maxConversations: 18,
  pageSize: '16 tokens',
  pageSizeBytes: '~5 KB',
};

// Memory exhaustion options (Page 7)
export const MEMORY_OPTIONS = [
  {
    id: 'preempt',
    label: 'Preempt',
    description:
      'Evict a lower-priority conversation\u2019s KV cache. Free its pages. The evicted conversation goes to a recompute queue \u2014 when pages become available, its entire prompt must go through prefill again to reconstruct the cache.',
    cost: 'All that prefill compute is wasted.',
    benefit: 'High-priority request gets immediate service.',
    analogy: 'This is the storage equivalent of reclaiming thin-provisioned space from an idle volume to serve a hot workload.',
    forwardRef: null,
  },
  {
    id: 'queue',
    label: 'Queue',
    description:
      'Hold the new request until an active conversation finishes and frees its pages. Simple.',
    cost: 'The waiting user sees latency.',
    benefit: 'No wasted compute, no complexity.',
    analogy: null,
    forwardRef: null,
  },
  {
    id: 'offload',
    label: 'Offload',
    description:
      'Move a conversation\u2019s KV cache from HBM to CPU DRAM (~2 TB available on a typical server, 10\u201350\u00d7 cheaper per GB than HBM). The cache is preserved \u2014 no recomputation needed \u2014 but swapping it back in adds latency (~1\u20135 ms for DRAM, vs. ~0.1 ms for HBM access).',
    cost: 'Retrieval latency when swapping back.',
    benefit: 'Cache preserved, no recomputation.',
    analogy: null,
    forwardRef: 'Stop 13',
  },
];

// Summary table (Page 8)
export const SUMMARY_TABLE = [
  { problem: 'GPU underutilization during decode', solution: 'Batching',                 impact: '5% \u2192 70%+ utilization' },
  { problem: 'Head-of-line blocking',              solution: 'Continuous batching',       impact: '2\u201324\u00d7 throughput' },
  { problem: 'Memory fragmentation / over-allocation', solution: 'PagedAttention',       impact: '60\u201380% waste \u2192 <4%' },
  { problem: 'Memory exhaustion',                  solution: 'Preemption + offloading',   impact: 'Graceful degradation' },
];
