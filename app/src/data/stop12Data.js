// Stop 12: Splitting the Work — Parallelism & Disaggregated Inference

export const PAGES = [
  { id: 'one-gpu',           label: "One GPU Isn't Enough",   type: 'static' },
  { id: 'data-parallel',     label: 'Data Parallelism',        type: 'animated' },
  { id: 'tensor-parallel',   label: 'Tensor Parallelism',      type: 'animated' },
  { id: 'pipeline-parallel', label: 'Pipeline Parallelism',    type: 'animated' },
  { id: 'choosing',          label: 'Choosing & Combining',    type: 'static' },
  { id: 'disaggregated',     label: 'Disaggregated Inference', type: 'animated' },
  { id: 'dynamo',            label: 'Dynamo Orchestration',    type: 'static' },
  { id: 'lifecycle',         label: 'KV Cache Lifecycle',      type: 'animated' },
  { id: 'summary',           label: 'Stop 12 at a Glance',     type: 'static' },
];

// Curriculum narration text (verbatim). Passed through dangerouslySetInnerHTML.
export const NARRATIONS = {
  'one-gpu':
    '<p>In Stop 11, we treated each of our 8 H100 GPUs as independent — each running its own copy of Llama-3 70B, each serving its own subset of users. That works when the model fits on one GPU (35 GB at FP4).</p>' +
    '<p style="margin-top:0.5em">But what if we want to run at FP16 for better quality? Llama-3 70B at FP16 is 140 GB — nearly two full H100s just for the weights, before any KV cache. And Llama-3 405B at FP4 is still ~100 GB — more than one H100 can hold.</p>' +
    '<p style="margin-top:0.5em">When a model doesn\'t fit on one GPU, you must split it. But HOW you split it determines everything: where the KV cache lives, what data moves between GPUs, how much bandwidth you need, and how many users you can serve.</p>' +
    '<p style="margin-top:0.5em">There are three fundamental ways to split a model across GPUs. Each one cuts along a different dimension — and the KV cache follows the cut differently.</p>',

  'data-parallel':
    '<p>The simplest approach: make complete copies of the model. Each GPU gets the full model and serves different users independently. This is what we were doing in Stop 11 — we just didn\'t name it.</p>' +
    '<p style="margin-top:0.5em">For our scenario with Llama-3 70B at FP4 (35 GB): each of our 8 H100s holds one complete copy. Each GPU serves 4 of our 32 users (32 ÷ 8 = 4 per GPU). No GPU needs to talk to any other GPU during inference.</p>',

  'tensor-parallel':
    '<p>What if the model doesn\'t fit on one GPU? Tensor parallelism splits each layer\'s weight matrices across GPUs. Every GPU holds a SLICE of every layer — and all GPUs work together to process every single token.</p>' +
    '<p style="margin-top:0.5em">For Llama-3 70B at FP16 (140 GB): split across 4 GPUs, each holds 35 GB of weights. But now all 4 GPUs must collaborate on every computation — and they must synchronize after every layer.</p>',

  'pipeline-parallel':
    '<p>Pipeline parallelism takes a different approach: instead of splitting each layer, it splits the STACK of layers. GPU 0 gets layers 1-20, GPU 1 gets layers 21-40, GPU 2 gets layers 41-60, GPU 3 gets layers 61-80. Each GPU runs its assigned layers sequentially — then passes the result to the next GPU.</p>' +
    '<p style="margin-top:0.5em">The communication pattern is completely different from tensor parallelism: instead of all-reduce between all GPUs at every layer, you have a simple point-to-point send from one GPU to the next, once per stage boundary.</p>',

  'choosing':
    '<p>In practice, production systems combine these strategies. The rule of thumb used by every major inference framework: tensor parallelism WITHIN a node (where NVLink provides 900 GB/s), pipeline parallelism ACROSS nodes (where network bandwidth is 50-400 GB/s). Data parallelism on top of both for multi-user throughput.</p>',

  'disaggregated':
    '<p>All three parallelism strategies split the MODEL. Disaggregated inference splits the WORKLOAD — separating the prefill phase and the decode phase onto different GPU pools, each optimized for its computational profile.</p>' +
    '<p style="margin-top:0.5em">In our scenario, consider what happens when User 17 submits a 28,000-token document for analysis while Users 1-16 are mid-conversation. On a shared GPU, User 17\'s prefill — processing 28,000 tokens through all 80 layers — takes several seconds of intense computation, during which all 16 decode users on that GPU see their token generation stall.</p>' +
    '<p style="margin-top:0.5em">Disaggregated inference eliminates this interference.</p>',

  'dynamo':
    '<p>NVIDIA Dynamo, released at GTC 2025, is the open-source framework that turns a GPU cluster into a coordinated disaggregated inference system. It doesn\'t replace the inference engine (vLLM, TensorRT-LLM, SGLang) — it orchestrates above them.</p>' +
    '<p style="margin-top:0.5em">For our scenario, here\'s how Dynamo would organize our 8 H100 GPUs:</p>',

  'lifecycle':
    '<p>Let\'s trace the complete lifecycle of one user\'s KV cache through a disaggregated system — from the moment they send a message to the moment they receive a response. This is the data path that every optimization in Act 2 will touch.</p>',

  'summary':
    '<p>We\'ve seen four ways to split inference work across GPUs. Three split the model (data, tensor, pipeline). One splits the workload (prefill vs. decode). Production systems combine all four.</p>',
};

// ================================================================
// PAGE 1 — Three axes of splitting (3D block)
// ================================================================
export const SPLIT_AXES = [
  {
    id: 'tp',
    color: 'var(--color-red)',
    bgColor: 'var(--color-red-bg)',
    textColor: 'var(--color-red-text)',
    axis: 'Width (horizontal)',
    direction: 'Weight matrices within each layer (d_model)',
    cut: 'Vertical slice through weight columns',
    name: 'Tensor Parallelism',
  },
  {
    id: 'pp',
    color: 'var(--color-blue)',
    bgColor: 'var(--color-blue-bg)',
    textColor: 'var(--color-blue-text)',
    axis: 'Depth (vertical)',
    direction: 'Stack of 80 transformer layers',
    cut: 'Horizontal slice through the layer stack',
    name: 'Pipeline Parallelism',
  },
  {
    id: 'dp',
    color: 'var(--color-teal)',
    bgColor: 'var(--color-teal-bg)',
    textColor: 'var(--color-teal-text)',
    axis: 'Users (into the screen)',
    direction: 'Different conversations being served',
    cut: 'Replicates the entire block',
    name: 'Data Parallelism',
  },
];

// ================================================================
// PAGE 2 — Data Parallelism animation
// ================================================================
export const DP_STEPS = [
  {
    id: 0,
    label: 'Idle cluster',
    description: '8 H100 GPUs. Each holds a complete copy of Llama-3 70B (35 GB at FP4). No users yet — no KV cache in any GPU.',
    arrows: false,
    cacheFill: 0,
    usersActive: false,
    usersAssigned: false,
  },
  {
    id: 1,
    label: 'Requests arrive',
    description: '32 user requests arrive at the router. The router distributes them: Users 1-4 → GPU 0, Users 5-8 → GPU 1, … Users 29-32 → GPU 7.',
    arrows: true,
    cacheFill: 0,
    usersActive: false,
    usersAssigned: true,
  },
  {
    id: 2,
    label: 'Prefill (parallel)',
    description: 'Each GPU processes its 4 users\' prompts independently. All 8 GPUs prefill simultaneously. No data moves between GPUs. Each GPU builds its own KV cache for its 4 users.',
    arrows: false,
    cacheFill: 0.6,
    usersActive: true,
    usersAssigned: true,
  },
  {
    id: 3,
    label: 'Decode (parallel)',
    description: 'Each GPU generates tokens for its 4 users independently. Still no inter-GPU communication. Each GPU reads its own weights and its own KV cache.',
    arrows: false,
    cacheFill: 1,
    usersActive: true,
    usersAssigned: true,
  },
  {
    id: 4,
    label: 'Steady state',
    description: '8 independent inference engines. Each GPU has 45 GB for KV cache (80 − 35). At 2.5 GB per user (8K tokens): fits 18 users per GPU. We\'re only using 4 — plenty of headroom. Total duplication: 280 GB (8 × 35 GB) — same weights 8 times.',
    arrows: false,
    cacheFill: 1,
    usersActive: true,
    usersAssigned: true,
  },
];

// Data-parallel memory layout per GPU
export const DATA_PARALLEL_GPUS = [
  { gpu: 'GPU 0', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 1-4',   communication: 'None' },
  { gpu: 'GPU 1', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 5-8',   communication: 'None' },
  { gpu: 'GPU 2', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 9-12',  communication: 'None' },
  { gpu: 'GPU 3', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 13-16', communication: 'None' },
  { gpu: 'GPU 4', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 17-20', communication: 'None' },
  { gpu: 'GPU 5', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 21-24', communication: 'None' },
  { gpu: 'GPU 6', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 25-28', communication: 'None' },
  { gpu: 'GPU 7', weights: '35 GB', cache: '10 GB', free: '35 GB', users: 'Users 29-32', communication: 'None' },
];

// ================================================================
// PAGE 3 — Tensor Parallelism animation (6 steps)
// ================================================================
export const TP_ANIMATION_STEPS = [
  {
    step: 1,
    label: 'Setup — token broadcast',
    description: 'The token\'s embedding (8,192 numbers for 70B) is present on ALL 4 GPUs (replicated). Each GPU holds 1/4 of the weight matrices.',
    gpuWork: [
      'GPU 0: columns 1-2048 of W_Q, W_K, W_V',
      'GPU 1: columns 2049-4096',
      'GPU 2: columns 4097-6144',
      'GPU 3: columns 6145-8192',
    ],
    gpuState: ['wait', 'wait', 'wait', 'wait'],
    tokenOn: [true, true, true, true],
    arrows: 'broadcast',
  },
  {
    step: 2,
    label: 'Compute Q, K, V (parallel)',
    description: 'Each GPU multiplies the full embedding by its 1/4 of W_Q, W_K, W_V. Each produces 1/4 of the Q, K, V vectors (16 of 64 attention heads). All 4 GPUs compute simultaneously.',
    gpuWork: [
      '4 parallel multiplications',
      'Each produces a partial result (16 of 64 heads)',
    ],
    gpuState: ['compute', 'compute', 'compute', 'compute'],
    tokenOn: [true, true, true, true],
    arrows: 'none',
  },
  {
    step: 3,
    label: 'Sharded attention (parallel)',
    description: 'Each GPU computes attention for its 16 heads using its slice of Q, K, and V. Each GPU also stores KV cache for only its 16 heads (not all 64). Each has its own mini-KV-cache.',
    gpuWork: [
      '4 parallel attention computations',
      'Each with its own mini-KV-cache (2 KV groups)',
    ],
    gpuState: ['compute', 'compute', 'compute', 'compute'],
    tokenOn: [true, true, true, true],
    arrows: 'none',
  },
  {
    step: 4,
    label: 'All-reduce (communication!)',
    description: 'Each GPU has a partial result. An all-reduce operation sends data between all 4 GPUs via NVLink: each GPU sends its partial to all others, then sums all partials. After all-reduce, every GPU has the identical complete result.',
    gpuWork: [
      'Each GPU sends ~16 KB (one token, one layer)',
      'At 900 GB/s NVLink: microseconds',
      'Happens TWICE per layer (attention + FFN)',
    ],
    gpuState: ['comm', 'comm', 'comm', 'comm'],
    tokenOn: [true, true, true, true],
    arrows: 'all-reduce',
  },
  {
    step: 5,
    label: 'FFN (parallel + all-reduce)',
    description: 'The FFN weight matrices are also split across the 4 GPUs. Same pattern: parallel compute followed by another all-reduce.',
    gpuWork: [
      'Parallel FFN computation',
      'Second all-reduce of this layer',
    ],
    gpuState: ['compute', 'compute', 'compute', 'compute'],
    tokenOn: [true, true, true, true],
    arrows: 'all-reduce',
  },
  {
    step: 6,
    label: 'Layer complete',
    description: 'The token\'s representation after this layer is now identical on all 4 GPUs. It enters the next layer. The same sequence repeats for all 80 layers.',
    gpuWork: [
      '2 all-reduces per layer × 80 layers = 160 all-reduces (Llama-3 70B)',
    ],
    gpuState: ['done', 'done', 'done', 'done'],
    tokenOn: [true, true, true, true],
    arrows: 'none',
  },
];

// Tensor-parallel memory layout (TP=4)
export const TENSOR_PARALLEL_GPUS = [
  { gpu: 'GPU 0', weights: '35 GB', cacheDesc: '1/4 cache (heads 1-16)',  kvGroups: '2 KV groups', communication: '160 all-reduce / pass' },
  { gpu: 'GPU 1', weights: '35 GB', cacheDesc: '1/4 cache (heads 17-32)', kvGroups: '2 KV groups', communication: '160 all-reduce / pass' },
  { gpu: 'GPU 2', weights: '35 GB', cacheDesc: '1/4 cache (heads 33-48)', kvGroups: '2 KV groups', communication: '160 all-reduce / pass' },
  { gpu: 'GPU 3', weights: '35 GB', cacheDesc: '1/4 cache (heads 49-64)', kvGroups: '2 KV groups', communication: '160 all-reduce / pass' },
];

// Correction 4 — All-reduce count by model
// 2 all-reduces per layer per forward pass when TP > 1.
// TP=1 inference = ZERO all-reduces (each GPU holds the full model).
export const ALL_REDUCE_BY_MODEL = [
  { model: 'TP=1 (any model, inference)', layers: '—',   perPass: '0',   note: 'Zero all-reduces — each GPU runs the full forward pass independently' },
  { model: 'Llama-3 8B (TP>1)',            layers: 32,    perPass: '64',  note: '2 × 32 layers' },
  { model: 'Llama-3 70B (TP>1)',           layers: 80,    perPass: '160', note: '2 × 80 layers' },
  { model: 'Llama-3 405B (TP>1)',          layers: 126,   perPass: '252', note: '2 × 126 layers' },
];

// Super-linear KV cache scaling (TP=1 -> TP=2)
export const SUPER_LINEAR_SCALING = {
  tp1: {
    label: 'TP=1 (single GPU, FP16)',
    gpus: 1,
    weightsMem: '70 GB',
    freeMem: '10 GB',
    cacheGB: 10,
  },
  tp2: {
    label: 'TP=2 (two GPUs, FP16)',
    gpus: 2,
    weightsMem: '35 GB each',
    freeMem: '45 GB each (90 GB total)',
    cacheGB: 90,
  },
  increase: '9×',
  vllmBlocks: '13.9× more KV cache blocks',
  vllmThroughput: '3.9× higher throughput',
  naiveExpected: '2× (naive linear assumption)',
};

// ================================================================
// PAGE 4 — Pipeline Parallelism animation
// ================================================================
export const PP_STAGES = [
  { id: 0, gpu: 'GPU 0', layers: 'Layers 1-20',  weights: '35 GB' },
  { id: 1, gpu: 'GPU 1', layers: 'Layers 21-40', weights: '35 GB' },
  { id: 2, gpu: 'GPU 2', layers: 'Layers 41-60', weights: '35 GB' },
  { id: 3, gpu: 'GPU 3', layers: 'Layers 61-80', weights: '35 GB' },
];

// Single token through 4 stages (compute + handoff alternating)
// 8 frames: compute0, handoff01, compute1, handoff12, compute2, handoff23, compute3, complete
export const PP_SINGLE_TOKEN_FRAMES = [
  { frame: 0, tokenAt: 0,   action: 'compute',  label: 'Stage 1 compute (Layers 1-20)',   description: 'Token enters GPU 0. Processes through layers 1-20. KV cache for L1-20 stored locally. GPUs 1, 2, 3 are idle.' },
  { frame: 1, tokenAt: 0.5, action: 'handoff',  label: 'Handoff 1→2 (16 KB)',             description: 'GPU 0 sends the token representation (d_model × 2 bytes = 16 KB) to GPU 1. Tiny compared to tensor parallelism\'s all-reduce.' },
  { frame: 2, tokenAt: 1,   action: 'compute',  label: 'Stage 2 compute (Layers 21-40)',  description: 'GPU 1 processes layers 21-40. KV cache for these layers stored on GPU 1. GPU 0 is now idle.' },
  { frame: 3, tokenAt: 1.5, action: 'handoff',  label: 'Handoff 2→3 (16 KB)',             description: '16 KB sent to GPU 2.' },
  { frame: 4, tokenAt: 2,   action: 'compute',  label: 'Stage 3 compute (Layers 41-60)',  description: 'GPU 2 processes layers 41-60. KV cache for these layers stored locally.' },
  { frame: 5, tokenAt: 2.5, action: 'handoff',  label: 'Handoff 3→4 (16 KB)',             description: '16 KB sent to GPU 3.' },
  { frame: 6, tokenAt: 3,   action: 'compute',  label: 'Stage 4 compute (Layers 61-80)',  description: 'GPU 3 processes the final layers. After layer 80: output projection → softmax → sampling → next token selected.' },
  { frame: 7, tokenAt: 3,   action: 'complete', label: 'Token complete',                  description: 'Total: 3 handoffs × 16 KB = 48 KB of communication per token, vs. 160 all-reduces for tensor parallelism. This token returns to GPU 0 for the next decode step.' },
];

// Micro-batching: tokens flowing through the pipeline over time (5 time steps)
// Each cell: which token is at which stage
export const PP_MICROBATCH_TIMELINE = [
  { time: 'T1', stages: ['A', null, null, null], note: 'Token A enters Stage 1. Stages 2-4 idle (pipeline bubble).' },
  { time: 'T2', stages: ['B', 'A',  null, null], note: 'Token A moves to Stage 2. Token B enters Stage 1.' },
  { time: 'T3', stages: ['C', 'B',  'A',  null], note: 'Pipeline filling. Stage 4 still idle.' },
  { time: 'T4', stages: ['D', 'C',  'B',  'A'],  note: 'Pipeline full. All 4 GPUs busy simultaneously.' },
  { time: 'T5', stages: ['E', 'D',  'C',  'B'],  note: 'Token A exits. Throughput approaches tensor parallelism.' },
];

// Pipeline-parallel memory layout (PP=4)
export const PIPELINE_PARALLEL_GPUS = [
  { gpu: 'GPU 0', layers: 'Layers 1-20',  weights: '35 GB', cacheDesc: 'Cache for L1-20 only',  communication: '1 send per token' },
  { gpu: 'GPU 1', layers: 'Layers 21-40', weights: '35 GB', cacheDesc: 'Cache for L21-40 only', communication: '1 recv + 1 send' },
  { gpu: 'GPU 2', layers: 'Layers 41-60', weights: '35 GB', cacheDesc: 'Cache for L41-60 only', communication: '1 recv + 1 send' },
  { gpu: 'GPU 3', layers: 'Layers 61-80', weights: '35 GB', cacheDesc: 'Cache for L61-80 only', communication: '1 recv per token' },
];

// ================================================================
// PAGE 5 — Choosing and combining
// ================================================================
export const PARALLELISM_COMPARISON = [
  { dimension: "What's split",    data: 'Nothing — model is copied',             tensor: "Each layer's weight matrices",         pipeline: 'The stack of layers' },
  { dimension: 'KV cache split',   data: 'Complete cache per GPU',                tensor: 'By heads (across all layers)',          pipeline: 'By layers (all heads per layer)' },
  { dimension: 'Communication',    data: 'None during inference',                 tensor: 'All-reduce, 2× per layer (heavy)',      pipeline: 'Point-to-point, 1× per stage (light)' },
  { dimension: 'Bandwidth need',   data: 'None',                                  tensor: 'NVLink (900 GB/s)',                     pipeline: 'Network (50+ GB/s sufficient)' },
  { dimension: 'Latency',          data: 'Same as single GPU',                    tensor: 'Lower (parallel computation)',          pipeline: 'Higher (sequential stages)' },
  { dimension: 'Throughput',       data: 'Linear with GPU count',                 tensor: 'Sub-linear (communication overhead)',   pipeline: 'Good with micro-batching' },
  { dimension: 'When to use',      data: 'Model fits on 1 GPU, need more users',  tensor: 'Model too big for 1 GPU, within a node', pipeline: 'Model too big for 1 node' },
];

export const SCENARIO_CONFIGS = [
  {
    label: 'Config A — Pure Data Parallel',
    description: '8 copies of Llama-3 70B (FP4). Each GPU: 35 GB weights + 45 GB cache.',
    totalCache: '360 GB',
    maxUsersAt8K: '144',
    communication: 'Zero',
    tradeoff: 'Simple but 280 GB of weight duplication.',
  },
  {
    label: 'Config B — TP=4 × DP=2',
    description: '4 GPUs run one model instance (tensor parallel). The other 4 run a second instance. Two copies serving 16 users each.',
    totalCache: '360 GB',
    maxUsersAt8K: '144',
    communication: '160 all-reduce / pass per instance',
    tradeoff: 'Lower latency — each token processed by 4 GPUs in parallel.',
  },
  {
    label: 'Config C — TP=4 × PP=2',
    description: '4 GPUs form a tensor-parallel group for one set of layers. 2 such groups form a 2-stage pipeline. Allows FP16 inference (140 GB model fits across 4 TP GPUs per stage).',
    totalCache: 'Varies',
    maxUsersAt8K: 'Fewer (FP16 weights consume more memory)',
    communication: 'All-reduce within TP group + point-to-point between stages',
    tradeoff: 'More complex. Better quality (FP16).',
  },
];

// ================================================================
// PAGE 6 — Disaggregated inference animation
// ================================================================
// Aggregated timeline: prefill burst blocks decode
export const AGGREGATED_TIMELINE = [
  { t: 0,  phase: 'decode',  label: 'Decode steady',      description: 'GPU serving Users 1-4 with steady token generation.', stalled: false },
  { t: 1,  phase: 'decode',  label: 'Decode steady',      description: 'Tokens generated every step. Users see smooth output.', stalled: false },
  { t: 2,  phase: 'prefill', label: 'User 17 arrives',    description: 'User 17 submits a 28,000-token document. Prefill burst begins.', stalled: true },
  { t: 3,  phase: 'prefill', label: 'Prefill burst',      description: 'All compute cores consumed processing 28,000 tokens through 80 layers.', stalled: true },
  { t: 4,  phase: 'prefill', label: 'Prefill burst',      description: 'Users 1-4 see STALL — no new tokens during the burst.', stalled: true },
  { t: 5,  phase: 'decode',  label: 'Decode resumes',     description: 'Prefill complete. Users 1-4 resume getting tokens, now alongside User 17.', stalled: false },
];

// Disaggregated timeline: prefill pool and decode pool run independently
export const DISAGGREGATED_TIMELINE = [
  { t: 0, prefillActive: false, decodeSmooth: true,  transferActive: false, label: 'Idle prefill, steady decode',   description: 'Decode pool serving Users 1-16 smoothly. Prefill pool idle.' },
  { t: 1, prefillActive: true,  decodeSmooth: true,  transferActive: false, label: 'User 17 arrives at prefill',    description: 'Router sends User 17\'s 28,000-token prompt to the prefill pool. Decode pool keeps serving Users 1-16.' },
  { t: 2, prefillActive: true,  decodeSmooth: true,  transferActive: false, label: 'Prefill in progress',           description: 'Prefill pool processes User 17. Decode pool unaffected — smooth token generation for Users 1-16.' },
  { t: 3, prefillActive: false, decodeSmooth: true,  transferActive: true,  label: 'KV cache transfer (NIXL/RDMA)', description: 'Prefill complete. 8.96 GB of KV cache streams from the prefill pool to the decode pool over RDMA. Transfer does not block decode.' },
  { t: 4, prefillActive: false, decodeSmooth: true,  transferActive: true,  label: 'Transfer in flight',            description: 'At 400G RDMA (50 GB/s): ~180 ms. Decode pool still serving other users.' },
  { t: 5, prefillActive: false, decodeSmooth: true,  transferActive: false, label: 'User 17 joins decode batch',    description: 'Transfer complete. User 17\'s cache landed in decode GPU. They join the continuous batch. No stall for other users.' },
];

// Transfer time for 8.96 GB KV cache across network types
export const TRANSFER_TIMES = [
  { network: 'PCIe Gen5',              bandwidth: '64 GB/s',  time: '140 ms',            timeNum: 140, highlight: false },
  { network: 'NVLink (intra-node)',    bandwidth: '900 GB/s', time: '10 ms',             timeNum: 10,  highlight: true  },
  { network: 'InfiniBand HDR',         bandwidth: '25 GB/s',  time: '358 ms',            timeNum: 358, highlight: false },
  { network: 'InfiniBand NDR (400G)',  bandwidth: '50 GB/s',  time: '179 ms',            timeNum: 179, highlight: false },
  { network: 'RoCE 400G',              bandwidth: '50 GB/s',  time: '179 ms',            timeNum: 179, highlight: false },
  { network: 'NVIDIA NIXL (optimized)', bandwidth: '50+ GB/s', time: '<150 ms (overlap)', timeNum: 150, highlight: true  },
];

// ================================================================
// PAGE 7 — Dynamo architecture
// ================================================================
export const DYNAMO_COMPONENTS = [
  {
    name: 'Prefill Pool',
    gpus: '2 GPUs',
    config: 'TP=2',
    short: 'Handles all incoming prompts',
    role: 'Handles all incoming prompts. Computes KV cache for entire prompt in parallel. After prefill: hands KV cache to NIXL for transfer.',
    color: 'var(--color-primary)',
    bgColor: 'var(--color-primary-bg)',
    textColor: 'var(--color-primary-text)',
  },
  {
    name: 'Decode Pool',
    gpus: '6 GPUs',
    config: 'TP=1, DP=6',
    short: 'Ongoing token generation',
    role: 'Handles ongoing token generation for all active conversations. Receives KV cache from prefill pool via NIXL. Uses PagedAttention for cache management.',
    color: 'var(--color-teal)',
    bgColor: 'var(--color-teal-bg)',
    textColor: 'var(--color-teal-text)',
  },
  {
    name: 'NIXL',
    gpus: '—',
    config: 'Transfer layer',
    short: 'RDMA cache transport',
    role: 'Moves KV cache between pools via RDMA. Supports NVLink, InfiniBand, PCIe — abstracts the transport. Asynchronous, non-blocking transfers. Can overlap transfer with computation.',
    color: 'var(--color-blue)',
    bgColor: 'var(--color-blue-bg)',
    textColor: 'var(--color-blue-text)',
  },
  {
    name: 'Smart Router',
    gpus: '—',
    config: 'Control plane',
    short: 'KV-cache-aware routing',
    role: 'Routes new conversations to prefill pool. Routes ongoing conversations to the decode GPU that already has the user\'s cache. KV-cache-aware routing.',
    color: 'var(--color-amber)',
    bgColor: 'var(--color-amber-bg)',
    textColor: 'var(--color-amber-text)',
  },
  {
    name: 'Dynamo Planner',
    gpus: '—',
    config: 'Orchestrator',
    short: 'Dynamic pool sizing',
    role: 'Monitors GPU utilization, queue depths, request patterns. Dynamically adjusts the prefill/decode GPU ratio. Reassigns GPUs between pools based on demand.',
    color: 'var(--color-red)',
    bgColor: 'var(--color-red-bg)',
    textColor: 'var(--color-red-text)',
  },
];

export const DYNAMO_STEADY_STATE = {
  users: 32,
  newConvsPerMin: 2,
  prefillGpus: 2,
  decodeGpus: 6,
  prefillTimeMs: 100,
  usersPerDecodeGpu: 5,
};

// ================================================================
// PAGE 8 — KV cache lifecycle animation (6 frames)
// ================================================================
export const LIFECYCLE_FRAMES = [
  {
    frame: 1,
    phase: 'Born',
    verb: 'born',
    label: 'Prefill on prefill pool',
    where: 'Prefill GPU HBM',
    size: '8.96 GB (growing)',
    duration: '~100 ms',
    color: 'var(--color-primary)',
    description: 'User 17 submits 28,000 tokens. Prefill GPUs 0 and 1 (TP=2) process the entire prompt in parallel. At each of 80 layers: K and V vectors are computed and stored in PagedAttention pages. Total cache grows to 8.96 GB (4.48 GB per GPU in TP=2).',
    activePool: 'prefill',
  },
  {
    frame: 2,
    phase: 'Moved',
    verb: 'moved',
    label: 'RDMA transfer via NIXL',
    where: 'Network (RDMA in flight)',
    size: '8.96 GB (in flight)',
    duration: '~180 ms',
    color: 'var(--color-blue)',
    description: 'Prefill complete. Output projection → softmax → first token. NIXL begins streaming the 8.96 GB KV cache from the prefill pool to the assigned decode GPU over 400G RDMA. During transfer, the decode pool\'s other users (Users 13-16) continue generating tokens normally.',
    activePool: 'transfer',
  },
  {
    frame: 3,
    phase: 'Grows',
    verb: 'grows',
    label: 'Decode on decode pool',
    where: 'Decode GPU HBM',
    size: '8.96 → 10.56 GB (growing)',
    duration: 'Seconds to minutes',
    color: 'var(--color-teal)',
    description: 'Transfer complete. User 17\'s KV cache is now in Decode GPU 3\'s PagedAttention page table. User 17 joins the continuous batch with Users 13-16. Each decode step appends one new K, V entry per user. The cache grows as the response is generated.',
    activePool: 'decode',
  },
  {
    frame: 4,
    phase: 'Persists',
    verb: 'persists',
    label: 'Across conversation turns',
    where: 'Decode GPU HBM',
    size: 'Persists + grows',
    duration: 'Duration of conversation',
    color: 'var(--color-amber)',
    description: 'User 17 sends follow-up messages. The existing KV cache is preserved. Only the new tokens go through incremental prefill (Stop 10). The cache continues to grow with each turn.',
    activePool: 'decode',
  },
  {
    frame: 5,
    phase: 'Dies',
    verb: 'dies',
    label: 'Conversation ends',
    where: 'Freed',
    size: '0 GB',
    duration: 'Instant',
    color: 'var(--color-red)',
    description: 'Conversation ends. All 30,000 tokens of KV cache pages are freed back to the PagedAttention allocator. Pages become immediately available for the next conversation.',
    activePool: 'none',
  },
  {
    frame: 6,
    phase: 'Summary',
    verb: 'lifecycle',
    label: 'Cache lifecycle summary',
    where: '—',
    size: '—',
    duration: '—',
    color: 'var(--color-text-muted)',
    description: 'The cache is born in prefill, moved to decode, grows during generation, persists across turns, and dies when the conversation ends.',
    activePool: 'none',
  },
];

// Lifecycle table + Stop mapping
export const CACHE_LIFECYCLE = [
  { phase: 'Prefill',          where: 'Prefill GPU HBM',  size: '8.96 GB (growing)',        duration: '~100 ms' },
  { phase: 'Transfer',         where: 'Network (RDMA)',    size: '8.96 GB (in flight)',      duration: '~180 ms' },
  { phase: 'Decode',           where: 'Decode GPU HBM',    size: '8.96-10.56 GB (growing)',  duration: 'Seconds to minutes' },
  { phase: 'Follow-up',        where: 'Decode GPU HBM',    size: 'Persists + grows',         duration: 'Duration of conversation' },
  { phase: 'Conversation end', where: 'Freed',             size: '0 GB',                     duration: 'Instant' },
];

export const LIFECYCLE_STOP_MAP = [
  { stop: 13, verb: 'LIVES',   title: 'Where the cache LIVES',   subtitle: 'Memory hierarchy / tiering' },
  { stop: 14, verb: 'SMALLER', title: 'How to make it SMALLER',  subtitle: 'Compression (GQA, MLA, quantization)' },
  { stop: 15, verb: 'MOVES',   title: 'How the cache MOVES',     subtitle: 'Network fabrics (RDMA, CXL, NVMe-oF)' },
  { stop: 16, verb: 'WHERE',   title: 'How to decide WHERE',     subtitle: 'Cache-aware routing' },
];

// ================================================================
// PAGE 9 — Summary
// ================================================================
export const SUMMARY_TABLE = [
  { splitType: 'Data parallel',      whatsSplit: 'Nothing (model copied)',   cacheEffect: 'Complete cache per GPU',       networkReq: 'None' },
  { splitType: 'Tensor parallel',    whatsSplit: "Each layer's weights",      cacheEffect: 'Cache sharded by heads',        networkReq: 'NVLink (900 GB/s)' },
  { splitType: 'Pipeline parallel',  whatsSplit: 'Stack of layers',           cacheEffect: 'Cache sharded by layers',       networkReq: 'Moderate (50+ GB/s)' },
  { splitType: 'Disaggregated P/D',  whatsSplit: 'Prefill vs. decode phases', cacheEffect: 'Cache transfers between pools', networkReq: 'RDMA (50+ GB/s, latency-critical)' },
];

export const BRIDGE_CALC = {
  cacheGB: 2.5,
  pcieBandwidth: '200 GB/s',
  swapTimeMs: 12.5,
  hbmAccessMs: 0.1,
  recomputeMs: 100,
};
