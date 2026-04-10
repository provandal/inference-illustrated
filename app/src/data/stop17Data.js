// Stop 17: The Complete Picture — Inference Illustrated (Capstone)

export const PAGES = [
  { id: 'everything-together', label: 'Everything, Together',          type: 'static' },
  { id: 'capstone-diagram',    label: 'The Capstone Diagram',          type: 'interactive' },
  { id: 'trace-request',       label: 'Trace One Request',             type: 'interactive' },
  { id: 'deployment-planner',  label: 'Design Your Own Deployment',    type: 'interactive' },
  { id: 'where-next',          label: 'Where to Go from Here',         type: 'static' },
];

// Page 1: Curriculum recap — every stop mapped to its system role
export const CURRICULUM_MAP = [
  { stops: '1\u20137',  component: 'Transformer attention mechanism',          systemRole: 'Why KV cache exists' },
  { stops: '8',         component: 'Multi-head attention + GQA',               systemRole: 'Cache size per token' },
  { stops: '9',         component: 'Layer stacking',                           systemRole: 'Cache depth multiplier' },
  { stops: '10',        component: 'Prefill / decode phases',                  systemRole: 'Two workload types' },
  { stops: '11',        component: 'Batching + PagedAttention',                systemRole: 'GPU memory management' },
  { stops: '12',        component: 'Parallelism + disaggregation',             systemRole: 'GPU cluster organization' },
  { stops: '13',        component: 'Memory hierarchy (G1\u2013G4)',            systemRole: 'Cache tier placement' },
  { stops: '14',        component: 'Compression (GQA/FP8/eviction)',           systemRole: 'Cache size reduction' },
  { stops: '15',        component: 'Network fabric (NVLink/RDMA/CXL/NVMe)',    systemRole: 'Cache transport' },
  { stops: '16',        component: 'Intelligent routing',                      systemRole: 'Request-to-GPU assignment' },
];

// Model configurations — all architecture params populated automatically
export const MODEL_CONFIGS = {
  '8B': {
    label: 'Llama-3 8B',
    params: 8,
    layers: 32,
    heads: 32,
    kvHeads: 8,       // GQA-4
    dHead: 128,
    hiddenDim: 4096,
    gqaGroups: 4,
    weightsFP16_GB: 16,
    weightsFP8_GB: 8,
    weightsFP4_GB: 4,
  },
  '70B': {
    label: 'Llama-3 70B',
    params: 70,
    layers: 80,
    heads: 64,
    kvHeads: 8,       // GQA-8
    dHead: 128,
    hiddenDim: 8192,
    gqaGroups: 8,
    weightsFP16_GB: 140,
    weightsFP8_GB: 70,
    weightsFP4_GB: 35,
  },
  '405B': {
    label: 'Llama-3.1 405B',
    params: 405,
    layers: 126,
    heads: 128,
    kvHeads: 8,       // GQA-16
    dHead: 128,
    hiddenDim: 16384,
    gqaGroups: 16,
    weightsFP16_GB: 810,
    weightsFP8_GB: 405,
    weightsFP4_GB: 203,
  },
};

// GPU specifications
export const GPU_SPECS = {
  H100: {
    label: 'H100 SXM',
    hbm_GB: 80,
    hbmBW_TBs: 3.35,    // TB/s
    fp16TFLOPS: 990,
    fp8TFLOPS: 1979,
    nvlinkBW_TBs: 0.9,  // TB/s per GPU (NVLink 4, 8-GPU domain)
    generation: 'Hopper',
  },
  B200: {
    label: 'B200',
    hbm_GB: 192,
    hbmBW_TBs: 8.0,
    fp16TFLOPS: 2250,
    fp8TFLOPS: 4500,
    nvlinkBW_TBs: 1.8,
    generation: 'Blackwell',
  },
  Rubin: {
    label: 'Rubin Ultra',
    hbm_GB: 288,
    hbmBW_TBs: 12.0,
    fp16TFLOPS: 5000,
    fp8TFLOPS: 10000,
    nvlinkBW_TBs: 3.6,
    generation: 'Rubin',
  },
};

// KV cache precision multipliers (bytes per element)
export const KV_PRECISION = {
  FP16: { label: 'FP16', bytesPerElement: 2 },
  FP8:  { label: 'FP8',  bytesPerElement: 1 },
  INT4: { label: 'INT4', bytesPerElement: 0.5 },
};

// Weight quantization
export const WEIGHT_QUANT = {
  FP16: { label: 'FP16', field: 'weightsFP16_GB' },
  FP8:  { label: 'FP8',  field: 'weightsFP8_GB' },
  FP4:  { label: 'FP4',  field: 'weightsFP4_GB' },
};

// Deployment presets for Page 4
export const DEPLOYMENT_PRESETS = [
  {
    id: 'our-scenario',
    label: 'Our scenario',
    description: '32 users, 8\u00d7 H100, Llama-3 70B FP4',
    config: { model: '70B', weightQuant: 'FP4', kvPrecision: 'FP8', gpu: 'H100', gpuCount: 8, concurrentUsers: 32, contextLength: 8192, disaggregated: false, tp: 1 },
  },
  {
    id: 'startup',
    label: 'Startup on a budget',
    description: '4 users, 1\u00d7 H100, Llama-3 8B',
    config: { model: '8B', weightQuant: 'FP8', kvPrecision: 'FP8', gpu: 'H100', gpuCount: 1, concurrentUsers: 4, contextLength: 4096, disaggregated: false, tp: 1 },
  },
  {
    id: 'enterprise-rag',
    label: 'Enterprise RAG pipeline',
    description: '100 users, 16\u00d7 H100, shared 10K-token docs',
    config: { model: '70B', weightQuant: 'FP4', kvPrecision: 'FP8', gpu: 'H100', gpuCount: 16, concurrentUsers: 100, contextLength: 10240, disaggregated: true, tp: 2 },
  },
  {
    id: 'agentic',
    label: 'Agentic AI platform',
    description: '50 agents, long contexts, multi-turn, NVL72',
    config: { model: '70B', weightQuant: 'FP8', kvPrecision: 'FP8', gpu: 'B200', gpuCount: 72, concurrentUsers: 50, contextLength: 32768, disaggregated: true, tp: 4 },
  },
  {
    id: 'hyperscale',
    label: 'Hyperscale service',
    description: '10,000 users, NVL72 + ICMS + network storage',
    config: { model: '405B', weightQuant: 'FP8', kvPrecision: 'INT4', gpu: 'B200', gpuCount: 144, concurrentUsers: 10000, contextLength: 16384, disaggregated: true, tp: 8 },
  },
];

// Trace request scenarios for Page 3
export const TRACE_SCENARIOS = [
  {
    id: 'new-short',
    label: 'New user, short prompt',
    description: '1K tokens, no existing cache.',
    steps: [
      { phase: 'User sends request',       detail: '1,024 input tokens',          time: '0 ms',      data: '\u2014',             protocol: '\u2014',         component: 'Client' },
      { phase: 'Router scores GPUs',        detail: 'No cache match on any GPU. Score by load only.', time: '~1 ms', data: '\u2014', protocol: 'gRPC', component: 'Smart Router' },
      { phase: 'Router selects GPU',        detail: 'GPU 5 (lowest load, 20%)',    time: '~1 ms',      data: '\u2014',             protocol: 'gRPC',           component: 'Smart Router' },
      { phase: 'Prefill',                   detail: '1,024 tokens through 80 layers', time: '~60 ms', data: '\u2014',             protocol: '\u2014',         component: 'vLLM on GPU 5' },
      { phase: 'KV cache created',          detail: 'Stored in HBM (G1) via PagedAttention', time: '\u2014', data: '0.16 GB (FP8)', protocol: 'Local HBM', component: 'KVBM' },
      { phase: 'Decode begins',             detail: 'Tokens generated one at a time',  time: '~30 ms/token', data: '\u2014',      protocol: '\u2014',         component: 'vLLM on GPU 5' },
      { phase: 'Response streams to user',  detail: 'Tokens streamed as generated', time: 'continuous', data: '\u2014',           protocol: 'HTTP/SSE',       component: 'API Gateway' },
    ],
    ttft: '~62 ms',
    summary: 'Full prefill required. Cache created from scratch on GPU 5.',
  },
  {
    id: 'returning-hot',
    label: 'Returning user, cache hot',
    description: '8K context, cache in HBM (G1) on GPU 3.',
    steps: [
      { phase: 'User sends follow-up',     detail: '200 new tokens, 8K context history', time: '0 ms', data: '\u2014',          protocol: '\u2014',         component: 'Client' },
      { phase: 'Router scores GPUs',        detail: 'GPU 3: 100% cache match. Load 65%.', time: '~1 ms', data: '\u2014',        protocol: 'gRPC',           component: 'Smart Router' },
      { phase: 'Router selects GPU 3',      detail: 'Cache affinity wins (score: 87 pts)', time: '~1 ms', data: '\u2014',       protocol: 'gRPC',           component: 'Smart Router' },
      { phase: 'Incremental prefill only',  detail: '200 new tokens (not 8K!) through 80 layers', time: '~12 ms', data: '\u2014', protocol: '\u2014',     component: 'vLLM on GPU 3' },
      { phase: 'Cache appended',            detail: '200 tokens appended to existing pages', time: '\u2014', data: '0.03 GB',   protocol: 'Local HBM',      component: 'KVBM' },
      { phase: 'Decode begins',             detail: 'Tokens generated with full 8.2K context', time: '~30 ms/token', data: '\u2014', protocol: '\u2014',   component: 'vLLM on GPU 3' },
      { phase: 'Response streams to user',  detail: 'Tokens streamed as generated', time: 'continuous', data: '\u2014',           protocol: 'HTTP/SSE',       component: 'API Gateway' },
    ],
    ttft: '~14 ms',
    summary: 'Cache hit eliminates 97% of prefill compute. 200 tokens vs. 8,200.',
  },
  {
    id: 'returning-cold',
    label: 'Returning user, cache cold',
    description: '8K context, cache in ICMS (G3.5). Any GPU can fetch it.',
    steps: [
      { phase: 'User returns after break',  detail: '8K context, cache demoted to ICMS', time: '0 ms', data: '\u2014',          protocol: '\u2014',         component: 'Client' },
      { phase: 'Router checks index',        detail: 'Cache found in ICMS (shared tier). GPU 5 lowest load.', time: '~1 ms', data: '\u2014', protocol: 'gRPC', component: 'Smart Router' },
      { phase: 'Router selects GPU 5',        detail: 'ICMS accessible from any GPU. Choose lowest load.', time: '~1 ms', data: '\u2014', protocol: 'gRPC', component: 'Smart Router' },
      { phase: 'Cache promotion G3.5 \u2192 G1', detail: 'GPU 5 pulls 8K-token cache from ICMS', time: '~100 ms', data: '1.28 GB (FP8)', protocol: 'NVMe/RoCE', component: 'NIXL + KVBM' },
      { phase: 'Incremental prefill',        detail: '200 new tokens through 80 layers', time: '~12 ms', data: '\u2014',         protocol: '\u2014',         component: 'vLLM on GPU 5' },
      { phase: 'Decode begins',              detail: 'Full context available after promotion', time: '~30 ms/token', data: '\u2014', protocol: '\u2014',    component: 'vLLM on GPU 5' },
      { phase: 'Response streams to user',   detail: 'Tokens streamed as generated', time: 'continuous', data: '\u2014',           protocol: 'HTTP/SSE',       component: 'API Gateway' },
    ],
    ttft: '~114 ms',
    summary: 'ICMS promotion adds ~100 ms, but avoids full 8K-token recompute (~500 ms).',
  },
  {
    id: 'large-doc',
    label: 'User uploads large document',
    description: '28K tokens, no cache. Disaggregated P/D.',
    steps: [
      { phase: 'User uploads document',     detail: '28,000 input tokens, no cache anywhere', time: '0 ms', data: '\u2014',      protocol: '\u2014',         component: 'Client' },
      { phase: 'Router scores GPUs',         detail: 'No cache match. Large prefill \u2192 route to Prefill Pool.', time: '~1 ms', data: '\u2014', protocol: 'gRPC', component: 'Smart Router' },
      { phase: 'Prefill on dedicated GPU',   detail: '28K tokens through 80 layers (compute-saturated)', time: '~500 ms', data: '\u2014', protocol: '\u2014', component: 'Prefill GPU' },
      { phase: 'KV cache generated',         detail: '28K tokens \u00d7 80 layers cached', time: '\u2014', data: '4.48 GB (FP8)', protocol: 'Local HBM', component: 'KVBM' },
      { phase: 'P/D transfer',              detail: 'Cache moves Prefill GPU \u2192 Decode GPU', time: '~1.2 ms (NVLink) or ~90 ms (RDMA)', data: '4.48 GB', protocol: 'NVLink or RDMA', component: 'NIXL' },
      { phase: 'Decode begins',              detail: 'Tokens generated on Decode GPU', time: '~30 ms/token', data: '\u2014',      protocol: '\u2014',         component: 'Decode GPU' },
      { phase: 'Response streams to user',   detail: 'Tokens streamed as generated', time: 'continuous', data: '\u2014',           protocol: 'HTTP/SSE',       component: 'API Gateway' },
    ],
    ttft: '~501\u2013591 ms',
    summary: 'Full prefill is unavoidable. Disaggregation isolates the 500 ms prefill from decode users.',
  },
  {
    id: 'shared-prefix',
    label: 'User with shared prefix',
    description: '2K system prompt already cached, 500 new tokens.',
    steps: [
      { phase: 'User starts conversation',  detail: '2K system prompt + 500 user tokens', time: '0 ms', data: '\u2014',          protocol: '\u2014',         component: 'Client' },
      { phase: 'Router detects prefix',      detail: 'System prompt (2K tokens) cached on all 8 GPUs', time: '~1 ms', data: '\u2014', protocol: 'gRPC',     component: 'Smart Router' },
      { phase: 'Router selects GPU 5',       detail: 'All GPUs have prefix \u2192 choose lowest load', time: '~1 ms', data: '\u2014', protocol: 'gRPC',    component: 'Smart Router' },
      { phase: 'Prefix cache reused',        detail: '2K tokens already in HBM \u2192 zero prefill for prefix', time: '0 ms', data: '0 GB', protocol: 'Local HBM', component: 'KVBM' },
      { phase: 'Incremental prefill',        detail: '500 new user tokens only', time: '~30 ms', data: '\u2014',                   protocol: '\u2014',         component: 'vLLM on GPU 5' },
      { phase: 'Decode begins',              detail: 'Full 2.5K context available', time: '~30 ms/token', data: '\u2014',           protocol: '\u2014',         component: 'vLLM on GPU 5' },
      { phase: 'Response streams to user',   detail: 'Tokens streamed as generated', time: 'continuous', data: '\u2014',           protocol: 'HTTP/SSE',       component: 'API Gateway' },
    ],
    ttft: '~32 ms',
    summary: 'Prefix sharing saves 2K tokens of prefill. Router leverages cache-aware scheduling.',
  },
];

// Page 5: Industry resources
export const RESOURCES = [
  { topic: 'Inference serving',       resource: 'vLLM documentation',               url: 'https://docs.vllm.ai',      why: 'The dominant open-source inference engine' },
  { topic: 'Distributed inference',   resource: 'llm-d project',                    url: 'https://llm-d.ai',          why: 'Kubernetes-native KV-cache-aware routing' },
  { topic: 'NVIDIA infrastructure',   resource: 'Dynamo documentation',             url: 'https://docs.nvidia.com/dynamo', why: 'KV Block Manager, NIXL, Smart Router' },
  { topic: 'KV cache research',       resource: 'The Five Eras of KVCache (Modular)', url: 'https://www.modular.com/blog/the-five-eras-of-kvcache', why: 'Excellent historical perspective' },
  { topic: 'Memory hierarchy',        resource: 'NVIDIA ICMS blog',                 url: 'https://developer.nvidia.com/blog/introducing-nvidia-bluefield-4-powered-inference-context-memory-storage-platform-for-the-next-frontier-of-ai/', why: 'The G3.5 tier in detail' },
  { topic: 'CXL for inference',       resource: 'TraCT paper',                      url: 'https://arxiv.org/abs/2512.18194', why: 'CXL shared memory for KV cache' },
  { topic: 'Compression survey',      resource: 'KV Cache Optimization Strategies', url: 'https://arxiv.org/html/2603.20397', why: 'Comprehensive 2026 survey' },
  { topic: 'Storage for inference',   resource: 'WEKA Augmented Memory Grid',       url: 'https://www.weka.io/blog/ai-ml/nvidia-signals-an-infrastructure-shift-for-inference-systems-at-scale/', why: 'Context as infrastructure' },
];

export const ACTIVE_COMMUNITIES = [
  'SNIA DSN Technical Work Group (KV cache storage implications)',
  'Ultra Ethernet Consortium (AI-optimized Ethernet)',
  'CXL Consortium (memory pooling standards)',
  'OCP (Open Compute Project) rack-scale AI systems',
];

// Cascading effects table for Page 2
export const CASCADING_EFFECTS = [
  { change: 'Increase concurrent users',     effects: 'More KV cache needed \u2192 batch size grows \u2192 GPU utilization improves \u2192 but memory fills faster \u2192 more demotions \u2192 lower cache hit rate' },
  { change: 'Switch FP16 \u2192 FP8 KV cache', effects: 'All cache sizes halve \u2192 2\u00d7 users per tier \u2192 all transfer times halve \u2192 hit rate improves \u2192 TTFT drops' },
  { change: 'Enable disaggregation',         effects: 'GPUs split into P/D pools \u2192 P/D transfer appears \u2192 prefill latency isolated \u2192 decode TPOT stabilizes' },
  { change: 'Increase context length',       effects: 'Cache per user grows \u2192 fewer users per GPU \u2192 more demotions \u2192 TTFT for returning users increases' },
  { change: 'Switch to larger scale-up domain', effects: 'P/D transfer latency drops dramatically \u2192 more flexibility for GPU assignment \u2192 routing improves' },
  { change: 'Enable ICMS tier',              effects: 'G3.5 appears in hierarchy \u2192 cache sharing enabled \u2192 any GPU can serve any user \u2192 routing flexibility increases' },
];

// ---- Calculation helpers ----

/**
 * Compute KV cache size per token (bytes) for a given model and KV precision.
 * Formula: 2 (K+V) x kvHeads x dHead x layers x bytesPerElement
 */
export function kvCacheBytesPerToken(modelKey, kvPrecKey) {
  const m = MODEL_CONFIGS[modelKey];
  const p = KV_PRECISION[kvPrecKey];
  return 2 * m.kvHeads * m.dHead * m.layers * p.bytesPerElement;
}

/**
 * Compute total KV cache per user (GB).
 */
export function kvCachePerUser_GB(modelKey, kvPrecKey, contextLength) {
  return (kvCacheBytesPerToken(modelKey, kvPrecKey) * contextLength) / (1024 ** 3);
}

/**
 * Compute model weight size in GB given model and quantization.
 */
export function weightSize_GB(modelKey, weightQuantKey) {
  const m = MODEL_CONFIGS[modelKey];
  const field = WEIGHT_QUANT[weightQuantKey].field;
  return m[field];
}

/**
 * Compute available HBM per GPU for cache after subtracting weight shard.
 * tp = tensor parallelism degree (weights are sharded across TP GPUs).
 */
export function availableHBMPerGPU_GB(gpuKey, modelKey, weightQuantKey, tp) {
  const gpu = GPU_SPECS[gpuKey];
  const weights = weightSize_GB(modelKey, weightQuantKey);
  const weightShard = weights / tp;
  return Math.max(0, gpu.hbm_GB - weightShard);
}

/**
 * Max concurrent users per GPU, limited by HBM.
 */
export function maxUsersPerGPU(gpuKey, modelKey, weightQuantKey, kvPrecKey, contextLength, tp) {
  const avail = availableHBMPerGPU_GB(gpuKey, modelKey, weightQuantKey, tp);
  const perUser = kvCachePerUser_GB(modelKey, kvPrecKey, contextLength);
  if (perUser <= 0) return Infinity;
  return Math.floor(avail / perUser);
}

/**
 * Estimate whether a deployment can serve the requested number of users.
 * Returns an object with status, metrics, and optionally a bottleneck/recommendation.
 */
export function evaluateDeployment({ model, weightQuant, kvPrecision, gpu, gpuCount, concurrentUsers, contextLength, disaggregated, tp }) {
  const gpuSpec = GPU_SPECS[gpu];
  const weights = weightSize_GB(model, weightQuant);
  const weightShard = weights / tp;

  // Check if model fits
  if (weightShard > gpuSpec.hbm_GB) {
    return {
      canServe: false,
      bottleneck: 'Model weights exceed single GPU HBM',
      recommendation: `Increase TP to at least ${Math.ceil(weights / gpuSpec.hbm_GB)}, or use a larger GPU.`,
      metrics: {},
    };
  }

  // Check if we have enough GPUs for TP
  if (tp > gpuCount) {
    return {
      canServe: false,
      bottleneck: 'Not enough GPUs for requested tensor parallelism',
      recommendation: `Need at least ${tp} GPUs for TP=${tp}.`,
      metrics: {},
    };
  }

  const dpDegree = Math.floor(gpuCount / tp);
  const effectiveGPUs = disaggregated ? Math.max(1, Math.floor(dpDegree * 0.75)) : dpDegree;

  const availPerGPU = availableHBMPerGPU_GB(gpu, model, weightQuant, tp);
  const cachePerUser = kvCachePerUser_GB(model, kvPrecision, contextLength);
  const usersPerGPU = cachePerUser > 0 ? Math.floor(availPerGPU / cachePerUser) : 999;
  const maxUsers = usersPerGPU * effectiveGPUs;

  const totalCacheHBM = Math.min(concurrentUsers, maxUsers) * cachePerUser;
  const totalHBMUsed = (weightShard * gpuCount) + totalCacheHBM;
  const totalHBM = gpuSpec.hbm_GB * gpuCount;
  const hbmUtilization = totalHBMUsed / totalHBM;

  // Throughput estimate: tokens per second per GPU during decode
  // Rough: HBM bandwidth / (weight bytes read per token + cache bytes per token)
  const weightBytesPerToken = (weights / tp) * 1e9; // bytes
  const cacheBytesReadPerToken = kvCacheBytesPerToken(model, kvPrecision) * contextLength;
  const bytesPerDecodeStep = weightBytesPerToken + cacheBytesReadPerToken;
  const tokensPerSecPerGPU = (gpuSpec.hbmBW_TBs * 1e12) / bytesPerDecodeStep;
  const batchedThroughput = Math.min(usersPerGPU, concurrentUsers / effectiveGPUs) * tokensPerSecPerGPU;

  // TTFT estimate (prefill): ~input_tokens / prefill_throughput
  // Prefill throughput: ~fp8TFLOPS * utilization / (2 * model_params * 1e9) tokens/sec
  const prefillUtilization = 0.3; // conservative
  const prefillToksPerSec = (gpuSpec.fp8TFLOPS * 1e12 * prefillUtilization) / (2 * MODEL_CONFIGS[model].params * 1e9);
  const ttftPrefill = (contextLength / prefillToksPerSec) * 1000; // ms
  const pdTransfer = disaggregated ? 5 : 0; // ms estimate for NVLink transfer
  const ttftEstimate = ttftPrefill + pdTransfer;

  const canServe = maxUsers >= concurrentUsers;

  let bottleneck = null;
  let recommendation = null;
  if (!canServe) {
    if (usersPerGPU < 2) {
      bottleneck = 'HBM capacity \u2014 cache per user is too large';
      if (kvPrecision === 'FP16') {
        recommendation = 'Enable FP8 KV cache to halve cache size.';
      } else if (contextLength > 8192) {
        recommendation = 'Reduce context length or add more GPUs.';
      } else {
        recommendation = `Add ${Math.ceil((concurrentUsers - maxUsers) / usersPerGPU)} more GPUs.`;
      }
    } else {
      bottleneck = 'Not enough GPUs for the requested user count';
      const neededGPUs = Math.ceil(concurrentUsers / usersPerGPU);
      recommendation = `Add ${neededGPUs - effectiveGPUs} more decode GPUs (total ${neededGPUs * tp} GPUs).`;
    }
  }

  return {
    canServe,
    bottleneck,
    recommendation,
    metrics: {
      cachePerUser_GB: cachePerUser,
      totalCacheHBM_GB: totalCacheHBM,
      totalHBM_GB: totalHBM,
      hbmUtilization,
      usersPerGPU,
      maxUsers,
      dpDegree,
      effectiveDecodeGPUs: effectiveGPUs,
      ttftEstimate_ms: ttftEstimate,
      tokensPerSecPerGPU: Math.round(tokensPerSecPerGPU),
      weightsPerGPU_GB: weightShard,
      availHBMPerGPU_GB: availPerGPU,
    },
  };
}
