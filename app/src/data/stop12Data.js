// Stop 12: Splitting the Work — Parallelism & Disaggregated Inference

export const PAGES = [
  { id: 'one-gpu',        label: 'One GPU Isn\'t Enough',    type: 'static' },
  { id: 'data-parallel',  label: 'Data Parallelism',         type: 'static' },
  { id: 'tensor-parallel', label: 'Tensor Parallelism',      type: 'static' },
  { id: 'pipeline-parallel', label: 'Pipeline Parallelism',  type: 'static' },
  { id: 'choosing',       label: 'Choosing & Combining',     type: 'static' },
  { id: 'disaggregated',  label: 'Disaggregated Inference',  type: 'static' },
  { id: 'dynamo',         label: 'Dynamo Orchestration',     type: 'static' },
  { id: 'lifecycle',      label: 'KV Cache Lifecycle',       type: 'static' },
  { id: 'summary',        label: 'Stop 12 at a Glance',      type: 'static' },
];

// Data-parallel memory layout per GPU (8 GPUs, Llama-3 70B FP4)
export const DATA_PARALLEL_GPUS = [
  { gpu: 'GPU 0', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 1-4', communication: 'None' },
  { gpu: 'GPU 1', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 5-8', communication: 'None' },
  { gpu: 'GPU 2', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 9-12', communication: 'None' },
  { gpu: 'GPU 3', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 13-16', communication: 'None' },
  { gpu: 'GPU 4', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 17-20', communication: 'None' },
  { gpu: 'GPU 5', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 21-24', communication: 'None' },
  { gpu: 'GPU 6', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 25-28', communication: 'None' },
  { gpu: 'GPU 7', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 29-32', communication: 'None' },
];

// Tensor-parallel memory layout (TP=4, Llama-3 70B FP16)
export const TENSOR_PARALLEL_GPUS = [
  { gpu: 'GPU 0', weights: '35 GB', cacheDesc: '1/4 of cache (heads 1-16)', kvGroups: '2 KV groups', communication: '160 all-reduce/pass' },
  { gpu: 'GPU 1', weights: '35 GB', cacheDesc: '1/4 of cache (heads 17-32)', kvGroups: '2 KV groups', communication: '160 all-reduce/pass' },
  { gpu: 'GPU 2', weights: '35 GB', cacheDesc: '1/4 of cache (heads 33-48)', kvGroups: '2 KV groups', communication: '160 all-reduce/pass' },
  { gpu: 'GPU 3', weights: '35 GB', cacheDesc: '1/4 of cache (heads 49-64)', kvGroups: '2 KV groups', communication: '160 all-reduce/pass' },
];

// Pipeline-parallel memory layout (PP=4, Llama-3 70B FP16)
export const PIPELINE_PARALLEL_GPUS = [
  { gpu: 'GPU 0', layers: 'Layers 1-20',  weights: '35 GB', cacheDesc: 'Cache for L1-20 only',  layersCached: '20 of 80', communication: '1 send per token' },
  { gpu: 'GPU 1', layers: 'Layers 21-40', weights: '35 GB', cacheDesc: 'Cache for L21-40 only', layersCached: '20 of 80', communication: '1 recv + 1 send' },
  { gpu: 'GPU 2', layers: 'Layers 41-60', weights: '35 GB', cacheDesc: 'Cache for L41-60 only', layersCached: '20 of 80', communication: '1 recv + 1 send' },
  { gpu: 'GPU 3', layers: 'Layers 61-80', weights: '35 GB', cacheDesc: 'Cache for L61-80 only', layersCached: '20 of 80', communication: '1 recv per token' },
];

// Micro-batching pipeline timeline
export const MICRO_BATCH_TIMELINE = [
  { time: 'T1', stage1: 'Token A', stage2: '\u2014',      stage3: '\u2014',      stage4: '\u2014' },
  { time: 'T2', stage1: 'Token B', stage2: 'Token A', stage3: '\u2014',      stage4: '\u2014' },
  { time: 'T3', stage1: 'Token C', stage2: 'Token B', stage3: 'Token A', stage4: '\u2014' },
  { time: 'T4', stage1: 'Token D', stage2: 'Token C', stage3: 'Token B', stage4: 'Token A' },
  { time: 'T5', stage1: 'Token E', stage2: 'Token D', stage3: 'Token C', stage4: 'Token B' },
];

// Side-by-side comparison of all three parallelism types (7 dimensions)
export const PARALLELISM_COMPARISON = [
  {
    dimension: 'What\u2019s split',
    data: 'Nothing \u2014 model is copied',
    tensor: 'Each layer\u2019s weight matrices',
    pipeline: 'The stack of layers',
  },
  {
    dimension: 'KV cache split',
    data: 'Complete cache per GPU',
    tensor: 'By heads (across all layers)',
    pipeline: 'By layers (all heads per layer)',
  },
  {
    dimension: 'Communication',
    data: 'None during inference',
    tensor: 'All-reduce, 2\u00d7 per layer (heavy)',
    pipeline: 'Point-to-point, 1\u00d7 per stage (light)',
  },
  {
    dimension: 'Bandwidth need',
    data: 'None',
    tensor: 'NVLink (900 GB/s)',
    pipeline: 'Network (50+ GB/s sufficient)',
  },
  {
    dimension: 'Latency',
    data: 'Same as single GPU',
    tensor: 'Lower (parallel computation)',
    pipeline: 'Higher (sequential stages)',
  },
  {
    dimension: 'Throughput',
    data: 'Linear with GPU count',
    tensor: 'Sub-linear (communication overhead)',
    pipeline: 'Good with micro-batching',
  },
  {
    dimension: 'When to use',
    data: 'Model fits on 1 GPU, need more users',
    tensor: 'Model too big for 1 GPU, within a node',
    pipeline: 'Model too big for 1 node',
  },
];

// Three concrete configurations for the running scenario
export const SCENARIO_CONFIGS = [
  {
    label: 'Config A \u2014 Pure Data Parallel',
    description: '8 copies of Llama-3 70B (FP4). Each GPU: 35 GB weights + 45 GB cache.',
    totalCache: '360 GB',
    maxUsersAt8K: '144',
    communication: 'Zero',
    tradeoff: 'Simple but 280 GB of weight duplication.',
  },
  {
    label: 'Config B \u2014 TP=4 \u00d7 DP=2',
    description: '4 GPUs run one model instance (tensor parallel). The other 4 run a second instance. Two copies serving 16 users each.',
    totalCache: '360 GB',
    maxUsersAt8K: '144',
    communication: '160 all-reduce/pass per instance',
    tradeoff: 'Lower latency \u2014 each token processed by 4 GPUs in parallel.',
  },
  {
    label: 'Config C \u2014 TP=4 \u00d7 PP=2',
    description: '4 GPUs form a tensor-parallel group for one set of layers. 2 such groups form a 2-stage pipeline. Allows FP16 inference (140 GB model fits across 4 TP GPUs per stage).',
    totalCache: 'Varies',
    maxUsersAt8K: 'Fewer (FP16 weights consume more memory)',
    communication: 'All-reduce within TP group + point-to-point between stages',
    tradeoff: 'More complex. Better quality (FP16).',
  },
];

// Transfer time for 8.96 GB KV cache across different network types
export const TRANSFER_TIMES = [
  { network: 'PCIe Gen5',                bandwidth: '64 GB/s',   time: '140 ms' },
  { network: 'NVLink (intra-node)',       bandwidth: '900 GB/s',  time: '10 ms' },
  { network: 'InfiniBand HDR',            bandwidth: '25 GB/s',   time: '358 ms' },
  { network: 'InfiniBand NDR (400G)',     bandwidth: '50 GB/s',   time: '179 ms' },
  { network: 'RoCE 400G',                 bandwidth: '50 GB/s',   time: '179 ms' },
  { network: 'NVIDIA NIXL (optimized)',   bandwidth: '50+ GB/s',  time: '<150 ms (overlap)' },
];

// NVIDIA Dynamo architecture components
export const DYNAMO_COMPONENTS = [
  {
    name: 'Prefill Pool',
    gpus: '2 GPUs',
    config: 'TP=2',
    role: 'Handles all incoming prompts. Computes KV cache for entire prompt in parallel. After prefill: hands KV cache to NIXL for transfer.',
  },
  {
    name: 'Decode Pool',
    gpus: '6 GPUs',
    config: 'TP=1, DP=6',
    role: 'Handles ongoing token generation for all active conversations. Receives KV cache from prefill pool via NIXL. Uses PagedAttention for cache management.',
  },
  {
    name: 'NIXL',
    gpus: '\u2014',
    config: 'Transfer layer',
    role: 'Moves KV cache between pools via RDMA. Supports NVLink, InfiniBand, PCIe \u2014 abstracts the transport. Asynchronous, non-blocking transfers. Can overlap transfer with computation.',
  },
  {
    name: 'Smart Router',
    gpus: '\u2014',
    config: 'Control plane',
    role: 'Routes new conversations to prefill pool. Routes ongoing conversations to the decode GPU that already has the user\u2019s cache. KV-cache-aware routing.',
  },
  {
    name: 'Dynamo Planner',
    gpus: '\u2014',
    config: 'Orchestrator',
    role: 'Monitors GPU utilization, queue depths, request patterns. Dynamically adjusts the prefill/decode GPU ratio. Reassigns GPUs between pools based on demand.',
  },
];

// KV cache lifecycle phases (User 17's request traced end-to-end)
export const CACHE_LIFECYCLE = [
  { phase: 'Prefill',           where: 'Prefill GPU HBM',    size: '8.96 GB (growing)', duration: '~100 ms' },
  { phase: 'Transfer',          where: 'Network (RDMA)',      size: '8.96 GB (in flight)', duration: '~180 ms' },
  { phase: 'Decode',            where: 'Decode GPU HBM',      size: '8.96\u201310.56 GB (growing)', duration: 'Seconds to minutes' },
  { phase: 'Follow-up',         where: 'Decode GPU HBM',      size: 'Persists + grows',    duration: 'Duration of conversation' },
  { phase: 'Conversation end',  where: 'Freed',               size: '0 GB',                duration: 'Instant' },
];

// Lifecycle-to-stop mapping
export const LIFECYCLE_STOP_MAP = [
  { phase: 'born',     verb: 'LIVES',    stop: 13, title: 'Where the cache lives (memory hierarchy / tiering)' },
  { phase: 'smaller',  verb: 'SMALLER',  stop: 14, title: 'How to make the cache smaller (compression)' },
  { phase: 'moved',    verb: 'MOVES',    stop: 15, title: 'How the cache moves (network fabrics)' },
  { phase: 'routed',   verb: 'WHERE',    stop: 16, title: 'How to decide where the cache goes (routing)' },
];

// Summary table for Page 9
export const SUMMARY_TABLE = [
  {
    splitType: 'Data parallel',
    whatsSplit: 'Nothing (model copied)',
    cacheEffect: 'Complete cache per GPU',
    networkReq: 'None',
  },
  {
    splitType: 'Tensor parallel',
    whatsSplit: 'Each layer\u2019s weights',
    cacheEffect: 'Cache sharded by heads',
    networkReq: 'NVLink (900 GB/s)',
  },
  {
    splitType: 'Pipeline parallel',
    whatsSplit: 'Stack of layers',
    cacheEffect: 'Cache sharded by layers',
    networkReq: 'Moderate (50+ GB/s)',
  },
  {
    splitType: 'Disaggregated P/D',
    whatsSplit: 'Prefill vs. decode phases',
    cacheEffect: 'Cache transfers between pools',
    networkReq: 'RDMA (50+ GB/s, latency-critical)',
  },
];

// TP step-by-step animation data for one layer processing one token
export const TP_ANIMATION_STEPS = [
  {
    step: 1,
    label: 'Setup',
    description: 'The token\u2019s embedding (8,192 numbers for 70B) is present on ALL 4 GPUs (replicated). Each GPU holds 1/4 of the weight matrices.',
    gpuWork: [
      'GPU 0: columns 1\u20132,048 of W_Q, W_K, W_V',
      'GPU 1: columns 2,049\u20134,096',
      'GPU 2: columns 4,097\u20136,144',
      'GPU 3: columns 6,145\u20138,192',
    ],
  },
  {
    step: 2,
    label: 'Compute Q, K, V (parallel)',
    description: 'Each GPU multiplies the full embedding by its 1/4 of W_Q, W_K, W_V. Each produces 1/4 of the Q, K, V vectors (16 of 64 attention heads). All 4 GPUs compute simultaneously.',
    gpuWork: ['4 parallel multiplications', 'Each produces a partial result'],
  },
  {
    step: 3,
    label: 'Attention (parallel)',
    description: 'Each GPU computes attention for its 16 heads using its slice of Q, K, and V. Each GPU also stores KV cache for only its 16 heads (not all 64).',
    gpuWork: ['4 parallel attention computations', 'Each with its own mini-KV-cache'],
  },
  {
    step: 4,
    label: 'All-Reduce (communication!)',
    description: 'After attention, each GPU has a partial result. An all-reduce operation sends data between all 4 GPUs via NVLink: each GPU sends its partial result to all others, then sums all partial results. After all-reduce, every GPU has the identical complete result.',
    gpuWork: ['Each GPU sends ~16 KB', 'At 900 GB/s NVLink: microseconds', 'Happens TWICE per layer (attention + FFN)'],
  },
  {
    step: 5,
    label: 'FFN (parallel + all-reduce)',
    description: 'The FFN weight matrices are also split across the 4 GPUs. Same pattern: parallel compute followed by another all-reduce.',
    gpuWork: ['Parallel computation', 'Second all-reduce of this layer'],
  },
  {
    step: 6,
    label: 'Layer complete',
    description: 'The token\u2019s representation after this layer is now identical on all 4 GPUs. It enters the next layer. The same sequence repeats for all 80 layers.',
    gpuWork: ['160 all-reduce operations total (2 per layer \u00d7 80 layers)'],
  },
];

// Super-linear KV cache scaling data
export const SUPER_LINEAR_SCALING = {
  tp1: { gpus: 1, weightsMem: '70 GB', freeMem: '10 GB', label: 'TP=1' },
  tp2: { gpus: 2, weightsMem: '35 GB each', freeMem: '90 GB total', label: 'TP=2' },
  increase: '9\u00d7',
  vllmBlocks: '13.9\u00d7 more KV cache blocks',
  vllmThroughput: '3.9\u00d7 higher throughput',
};
