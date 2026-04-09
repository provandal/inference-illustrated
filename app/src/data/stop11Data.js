// Stop 11: The Memory Wall — Up Close (Act 2, Stop 1)
// All data for every visual, table, interactive control, and calculation

export const PAGES = [
  { id: 'act2-intro',         label: 'Welcome to Act 2',              type: 'static' },
  { id: 'math-works',         label: 'The Math Says It Should Work',   type: 'static' },
  { id: 'math-lies',          label: 'Why the Math Lies',              type: 'static' },
  { id: 'batching-why',       label: 'Why Batching Is Non-Negotiable', type: 'static' },
  { id: 'static-batching',    label: 'Static Batching',               type: 'interactive' },
  { id: 'continuous-batching', label: 'Continuous Batching',           type: 'interactive' },
  { id: 'paged-attention',    label: 'PagedAttention',                type: 'interactive' },
  { id: 'memory-runs-out',    label: 'When Memory Runs Out',          type: 'static' },
  { id: 'summary',            label: 'Stop 11 at a Glance',           type: 'static' },
];

// --- Narration text for each page ---
export const NARRATIONS = {
  'act2-intro':
    '<strong>Welcome to Act 2: KV Cache &amp; The Network.</strong> In Act 1, we built the transformer from the ground up and discovered why the KV cache exists. Now we turn to the question that matters to infrastructure engineers: <strong>how do you actually serve this at scale?</strong>',

  'math-works':
    'With the scenario established, let\u2019s check the arithmetic from Stop 10. Do we have enough memory? The answer looks deceptively simple.',

  'math-lies':
    'The calculation on the previous page assumed every conversation uses exactly 8K tokens. In reality, right now across those 32 users: one is asking a quick question (200 tokens). Another uploaded a 40-page spec and asked for a summary (28,000 tokens). Most are somewhere in between. And you don\u2019t know in advance how long any response will be \u2014 the model generates tokens until it produces an end-of-sequence token, which could happen after 10 tokens or 10,000.',

  'batching-why':
    'Before we solve the memory problem, we need to understand why serving multiple users per GPU isn\u2019t just nice to have \u2014 it\u2019s the only way to make the economics work.\n\nDuring decode, the GPU reads 35 GB of model weights from HBM to process ONE token for ONE user. The actual arithmetic for that token takes a fraction of the time the read takes. The GPU\u2019s compute cores are mostly idle, waiting for data.',

  'static-batching':
    'The simplest batching strategy is static batching: collect a group of requests, process them together, wait for ALL to finish, then start the next batch. Here\u2019s what that looks like with four of our users.',

  'continuous-batching':
    'Continuous batching eliminates head-of-line blocking by operating at the granularity of individual decode steps. When a user finishes, their slot is immediately filled by the next waiting request \u2014 no idle steps.',

  'paged-attention':
    'Traditional KV cache allocation wastes 60\u201380% of memory. In 2023, researchers at UC Berkeley solved this by applying a technique from 1960s operating systems to GPU memory: virtual memory paging.\n\nIf you\u2019ve worked with storage systems, you already know this pattern. It\u2019s thin provisioning. It\u2019s scatter-gather DMA. Same principle, applied to KV cache.',

  'memory-runs-out':
    'Even with PagedAttention, GPU memory is finite. In our scenario, imagine 5 of our 32 users simultaneously upload large documents \u2014 each conversation jumps to 32K tokens (10 GB cache each). Those 5 users alone consume 50 GB, more than a single H100 can provide for cache. Something has to give.',

  summary:
    'We\u2019ve solved the single-GPU memory management problem. Batching makes GPUs economically viable. Continuous batching eliminates idle slots. PagedAttention eliminates fragmentation. Preemption and offloading handle overflow.\n\nBut we\u2019ve been treating each GPU independently. In our scenario, 8 GPUs each run the full model and independently serve a subset of users. This works \u2014 but it ignores the fact that prefill and decode have fundamentally different hardware needs.',
};

// --- Page 1: Scenario calculator ---
export const SCENARIO_DEFAULTS = {
  model: 'Llama-3 70B',
  weightsFP4_GB: 35,
  kvPerToken_KB: 320,
  users: 32,
  contextPerUser: 8000,
  gpuCount: 8,
  gpuMemory_GB: 80,
};

export const SCENARIO_CALCULATOR = [
  { label: 'Model',                value: 'Llama-3 70B',  source: 'Scenario',      isInput: false },
  { label: 'Weights (FP4)',        value: '35 GB',        source: 'Stop 8',        isInput: false },
  { label: 'KV cache per token',   value: '320 KB',       source: 'Stop 8/9',      isInput: false },
  { label: 'Users',                value: '32',           source: 'Scenario',      isInput: true, key: 'users' },
  { label: 'Context per user',     value: '8K tokens',    source: 'Scenario',      isInput: true, key: 'context' },
  { label: 'Cache per user',       value: '2.5 GB',       source: '320 KB \u00d7 8K',    isInput: false, computed: true },
  { label: 'Total cache',          value: '80 GB',        source: '2.5 GB \u00d7 32',    isInput: false, computed: true },
  { label: 'Total memory',         value: '115 GB',       source: '35 + 80',       isInput: false, computed: true },
  { label: 'Available (8\u00d7 H100)',  value: '640 GB',  source: '8 \u00d7 80',         isInput: false },
  { label: 'Utilization',          value: '18%',          source: '115 / 640',     isInput: false, computed: true, highlight: true },
];

// --- Page 2: Three memory problems ---
export const OVER_ALLOCATION = {
  maxContextTokens: 128000,
  maxContextGB: 40,
  actualTokens: 8000,
  actualGB: 2.5,
  wastePercent: 94,
  wasteGB: 37.5,
  weightsGB: 35,
  gpuGB: 80,
  maxUsersPerGPU: 1, // 40 + 35 = 75, nearly full
};

export const FRAGMENTATION_BLOCKS = [
  { id: 'B', widthPct: 15, color: 'var(--color-teal)', type: 'active' },
  { id: 'gap1', widthPct: 10, color: null, type: 'free' },
  { id: 'C', widthPct: 25, color: 'var(--color-blue)', type: 'active' },
  { id: 'gap2', widthPct: 8, color: null, type: 'free' },
  { id: 'E', widthPct: 20, color: 'var(--color-primary)', type: 'active' },
  { id: 'gap3', widthPct: 12, color: null, type: 'free' },
  { id: 'F', widthPct: 10, color: 'var(--color-teal)', type: 'active' },
];

export const GROWTH_SCENARIO = {
  initialTokens: 8000,
  initialGB: 2.5,
  spikeTokens: 32000,
  spikeGB: 10,
  reason: 'User uploaded a document mid-conversation',
};

// --- Page 3: Batch utilization ---
export const BATCH_UTILIZATION = [
  { batchSize: 1,   weightRead: '35 GB', tokensProcessed: '1 token',    utilization: '~5%',  utilizationNum: 5,   note: 'cores mostly idle' },
  { batchSize: 8,   weightRead: '35 GB', tokensProcessed: '8 tokens',   utilization: '~30%', utilizationNum: 30,  note: '' },
  { batchSize: 32,  weightRead: '35 GB', tokensProcessed: '32 tokens',  utilization: '~70%', utilizationNum: 70,  note: '' },
  { batchSize: 128, weightRead: '35 GB', tokensProcessed: '128 tokens', utilization: '~95%', utilizationNum: 95,  note: 'near saturation' },
];

export const BATCHING_ECONOMICS = {
  costSingleUser: '$1',
  costBatched: '$0.008',
  perGpuAvailable_GB: 45,
  cachePerUser_GB: 2.5,
  usersPerGpu: 18, // 45 / 2.5
  totalAcross8: 144,
};

// --- Page 4: Static batching ---
export const STATIC_BATCHING_USERS = [
  { id: 'A', color: '#4F46E5', promptTokens: 500,  generateTokens: 20,  finishStep: 20 },
  { id: 'B', color: '#378ADD', promptTokens: 2000, generateTokens: 50,  finishStep: 50 },
  { id: 'C', color: '#1D9E75', promptTokens: 8000, generateTokens: 500, finishStep: 500 },
  { id: 'D', color: '#EF9F27', promptTokens: 1000, generateTokens: 30,  finishStep: 30 },
];

export const STATIC_UTILIZATION_STEPS = [
  { range: 'Steps 1\u201320',   active: 4, total: 4, pct: 100 },
  { range: 'Steps 21\u201330',  active: 3, total: 4, pct: 75 },
  { range: 'Steps 31\u201350',  active: 2, total: 4, pct: 50 },
  { range: 'Steps 51\u2013500', active: 1, total: 4, pct: 25 },
];

export const STATIC_BATCHING_WASTE = {
  totalSlotSteps: { label: 'Total slot-steps available', value: '4 \u00d7 500 = 2,000', num: 2000 },
  usedSlotSteps:  { label: 'Total slot-steps used',      value: '20 + 50 + 500 + 30 = 600', num: 600 },
  waste:          { label: 'Waste',                       value: '70%', num: 70 },
};

// --- Page 5: Continuous batching ---
export const CONTINUOUS_BATCHING_EVENTS = [
  { step: 0,   label: 'Steps 1\u201320',  slots: ['A', 'B', 'C', 'D'], note: 'All active. 4/4 slots used.', active: 4 },
  { step: 20,  label: 'Step 20',          slots: ['E', 'B', 'C', 'D'], note: 'User A finishes. Cache freed. User E immediately takes the slot. 4/4.', active: 4, exit: 'A', enter: 'E' },
  { step: 30,  label: 'Step 30',          slots: ['E', 'B', 'C', 'F'], note: 'User D finishes. User F takes the slot. Still 4/4.', active: 4, exit: 'D', enter: 'F' },
  { step: 50,  label: 'Step 50',          slots: ['E', 'G', 'C', 'F'], note: 'User B finishes. User G takes the slot. Still 4/4.', active: 4, exit: 'B', enter: 'G' },
  { step: 500, label: 'Step 500',         slots: ['E', 'G', 'H', 'F'], note: 'User C finishes. User H takes the slot. Still 4/4.', active: 4, exit: 'C', enter: 'H' },
];

export const CONTINUOUS_VS_STATIC = [
  { metric: 'Slot utilization',        staticVal: '30%',         continuousVal: '~98%' },
  { metric: 'Throughput (tokens/sec)',  staticVal: 'Low',         continuousVal: '2\u201324\u00d7 higher' },
  { metric: 'GPU idle time',           staticVal: 'Significant',  continuousVal: 'Near zero' },
];

// --- Page 6: PagedAttention ---

// Colors for each conversation in the paged view
export const CONV_COLORS = {
  A: '#4F46E5', // indigo
  B: '#378ADD', // blue
  C: '#1D9E75', // teal
  D: '#EF9F27', // amber
  E: '#E24B4A', // red
  F: '#8B5CF6', // violet
  G: '#EC4899', // pink
  H: '#06B6D4', // cyan
};

export const TRADITIONAL_ALLOCATION = [
  { id: 'A', allocatedGB: 10, usedGB: 2.5,  wastePercent: 75 },
  { id: 'B', allocatedGB: 10, usedGB: 4,    wastePercent: 60 },
  { id: 'C', allocatedGB: 10, usedGB: 8,    wastePercent: 20 },
  { id: 'D', allocatedGB: 10, usedGB: 1,    wastePercent: 90 },
];

export const TRADITIONAL_TOTALS = {
  allocatedGB: 40,
  usedGB: 15.5,
  wasteGB: 24.5,
  wastePercent: 63,
  remainingGB: 5,
  maxConversations: 4,
  totalAvailableGB: 45,
};

export const PAGED_ALLOCATION = [
  { id: 'A', pages: 156, usedGB: 2.5 },
  { id: 'B', pages: 250, usedGB: 4 },
  { id: 'C', pages: 500, usedGB: 8 },
  { id: 'D', pages: 63,  usedGB: 1 },
];

export const PAGED_TOTALS = {
  usedGB: 15.5,
  freeGB: 29.5,
  wastePercent: 3,
  maxConversations: 18,
  pageSize: 16,          // tokens per page
  pageSizeBytes: '~5 KB', // per page for 70B with GQA
  totalAvailableGB: 45,
};

// Total page count for the 45 GB pool (at ~5 KB per page = ~0.005 MB)
// 45 GB / 5 KB = ~9,000,000 pages (but we simplify for visual)
export const PAGED_VISUAL_GRID_SIZE = 180; // total visual blocks to show

// --- Page 7: When memory runs out ---
export const MEMORY_OPTIONS = [
  {
    id: 'preempt',
    letter: 'A',
    label: 'Preempt',
    subtitle: 'Evict + recompute later',
    description:
      'Evict a lower-priority conversation\u2019s KV cache. Free its pages. The evicted conversation goes to a recompute queue \u2014 when pages become available, its entire prompt must go through prefill again to reconstruct the cache.',
    cost: 'All that prefill compute is wasted.',
    benefit: 'High-priority request gets immediate service.',
    analogy: 'This is the storage equivalent of reclaiming thin-provisioned space from an idle volume to serve a hot workload.',
    forwardRef: null,
    color: 'var(--color-red)',
    bgColor: 'var(--color-red-bg)',
    textColor: 'var(--color-red-text)',
  },
  {
    id: 'queue',
    letter: 'B',
    label: 'Queue',
    subtitle: 'Wait for space',
    description:
      'Hold the new request until an active conversation finishes and frees its pages. Simple.',
    cost: 'The waiting user sees latency.',
    benefit: 'No wasted compute, no complexity.',
    analogy: null,
    forwardRef: null,
    color: 'var(--color-amber)',
    bgColor: 'var(--color-amber-bg)',
    textColor: 'var(--color-amber-text)',
  },
  {
    id: 'offload',
    letter: 'C',
    label: 'Offload',
    subtitle: 'Move to CPU DRAM/SSD',
    description:
      'Move a conversation\u2019s KV cache from HBM to CPU DRAM (~2 TB available on a typical server, 10\u201350\u00d7 cheaper per GB than HBM). The cache is preserved \u2014 no recomputation needed \u2014 but swapping it back in adds latency (~1\u20135 ms for DRAM, vs. ~0.1 ms for HBM access).',
    cost: 'Retrieval latency when swapping back.',
    benefit: 'Cache preserved, no recomputation.',
    analogy: null,
    forwardRef: 'Stop 13',
    forwardRefExtra: 'Stop 16',
    color: 'var(--color-blue)',
    bgColor: 'var(--color-blue-bg)',
    textColor: 'var(--color-blue-text)',
  },
];

// --- Page 8: Summary ---
export const SUMMARY_TABLE = [
  { problem: 'GPU underutilization during decode', solution: 'Batching',               impact: '5% \u2192 70%+ utilization' },
  { problem: 'Head-of-line blocking',              solution: 'Continuous batching',     impact: '2\u201324\u00d7 throughput' },
  { problem: 'Memory fragmentation / over-allocation', solution: 'PagedAttention',     impact: '60\u201380% waste \u2192 <4%' },
  { problem: 'Memory exhaustion',                  solution: 'Preemption + offloading', impact: 'Graceful degradation' },
];

export const BRIDGE_CALC = {
  documentTokens: 28000,
  kvPerToken_KB: 320,
  cacheSize_GB: 8.96,   // 28000 * 320 / 1e6
  rdmaBandwidth_Gbps: 400,
  rdmaBandwidth_GBs: 50,
  transferTime_ms: 180,  // 8.96 / 50 * 1000 ~= 179.2
};
