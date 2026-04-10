// Stop 16: Intelligent Routing — Where Should This Request Go?

export const PAGES = [
  { id: 'round-robin-cost',    label: 'Round-Robin Is 40x Too Expensive',  type: 'static' },
  { id: 'routing-decision',    label: 'The Routing Decision',              type: 'static' },
  { id: 'prefix-sharing',      label: 'Prefix Sharing',                    type: 'static' },
  { id: 'llm-d',               label: 'The llm-d Approach',                type: 'static' },
  { id: 'dynamo-router',       label: 'Dynamo Smart Router',               type: 'static' },
  { id: 'decision-tree',       label: 'The Routing Decision Tree',         type: 'static' },
  { id: 'feedback-loop',       label: 'The Cache Placement Feedback Loop', type: 'static' },
  { id: 'summary',             label: 'Stop 16 at a Glance',               type: 'static' },
];

// Page 1: Round-robin vs cache-aware comparison
export const ROUTING_COMPARISON = [
  { metric: 'Prefill compute',      roundRobin: '8K tokens \u00d7 80 layers = ~500 ms', cacheAware: '200 tokens \u00d7 80 layers = ~12 ms' },
  { metric: 'TTFT',                  roundRobin: '~500 ms (full recompute)',              cacheAware: '~12 ms (incremental prefill)' },
  { metric: 'GPU blocked',           roundRobin: 'GPU 5 for 500 ms',                     cacheAware: 'GPU 3 for 12 ms' },
  { metric: 'Other users impacted',  roundRobin: 'GPU 5\u2019s batch stalled during prefill', cacheAware: 'Minimal impact' },
  { metric: 'Cache storage',         roundRobin: '1.28 GB duplicated on GPU 5 (now on both 3 and 5)', cacheAware: 'No duplication' },
  { metric: 'Cost multiplier',       roundRobin: '~40\u00d7',                            cacheAware: '1\u00d7', highlight: true },
];

// Page 2: GPU status for routing animation
export const GPU_STATUS = [
  { id: 0, load: 45, users: 'Users 1\u20134',   cacheNote: 'system prompt + conversations' },
  { id: 1, load: 72, users: 'Users 5\u20138',   cacheNote: null },
  { id: 2, load: 30, users: 'Users 9\u201312',  cacheNote: null },
  { id: 3, load: 65, users: 'Users 13\u201317', cacheNote: 'including User 17\u2019s 8K cache' },
  { id: 4, load: 55, users: 'Users 18\u201321', cacheNote: null },
  { id: 5, load: 20, users: 'Users 22\u201325', cacheNote: null },
  { id: 6, load: 80, users: 'Users 26\u201329', cacheNote: null },
  { id: 7, load: 40, users: 'Users 30\u201332', cacheNote: null },
];

// Page 2: Scoring example
export const SCORING_EXAMPLE = [
  { gpu: 'GPU 3', cacheScore: '100%', loadCapacity: '35%', combined: '100% \u00d7 0.8 + 35% \u00d7 0.2 = 87 pts', winner: true },
  { gpu: 'GPU 5', cacheScore: '0%',   loadCapacity: '80%', combined: '0% \u00d7 0.8 + 80% \u00d7 0.2 = 16 pts', winner: false },
  { gpu: 'GPU 2', cacheScore: '0%',   loadCapacity: '70%', combined: '0% \u00d7 0.8 + 70% \u00d7 0.2 = 14 pts', winner: false },
];

// Page 3: Prefix routing savings
export const PREFIX_ROUTING_SAVINGS = [
  { metric: 'System prompt prefill', without: '32 users \u00d7 2K tokens = 64K tokens', withRouting: '8 GPUs \u00d7 2K = 16K tokens' },
  { metric: 'Per-user TTFT (new conversation)', without: '~60 ms (2K prefix + user message)', withRouting: '~30 ms (user message only)' },
  { metric: 'GPU compute saved', without: '0', withRouting: '48K tokens worth of prefill (~288 ms aggregate)' },
  { metric: 'Equivalent GPU time freed', without: '0', withRouting: '~1.5 GPU-seconds per batch cycle' },
];

// Page 3: Production benchmark results
export const PREFIX_BENCHMARKS = [
  { metric: 'Cache hit rate',  value: '87%',  note: 'with precise prefix-cache-aware scheduling' },
  { metric: 'TTFT improvement', value: '57\u00d7 faster', note: 'median, compared to round-robin' },
  { metric: 'Throughput gain',  value: '2\u00d7',  note: 'on identical hardware' },
];

// Page 4: llm-d scoring strategies
export const LLMD_STRATEGIES = [
  { strategy: 'Round-robin',            howItWorks: 'Cycle through pods',                                     bestFor: 'Baseline (worst performance)' },
  { strategy: 'Load-aware',             howItWorks: 'Route to least-loaded pod',                               bestFor: 'Workloads without prefix sharing' },
  { strategy: 'Load + prefix',          howItWorks: 'Combine load and prefix cache affinity scores',           bestFor: 'Most production workloads' },
  { strategy: 'Precise prefix-cache',   howItWorks: 'Real-time introspection of distributed vLLM caches via KV Indexer', bestFor: 'Maximum cache hit rate' },
  { strategy: 'Predicted latency',      howItWorks: 'ML model trained on live traffic predicts TTFT/TPOT per pod', bestFor: 'Adaptive to dynamic workloads' },
];

// Page 4: llm-d benchmark results
export const LLMD_BENCHMARKS = [
  { metric: 'TTFT (median)',    roundRobin: '1,200 ms',  loadPrefix: '450 ms',  precisePrefix: '21 ms' },
  { metric: 'Throughput',       roundRobin: 'Baseline',  loadPrefix: '1.4\u00d7', precisePrefix: '2.0\u00d7' },
  { metric: 'Cache hit rate',   roundRobin: '~15%',      loadPrefix: '~60%',    precisePrefix: '~87%' },
  { metric: 'Improvement',      roundRobin: '\u2014',    loadPrefix: '2.7\u00d7 faster', precisePrefix: '57\u00d7 faster', highlight: true },
];

// Page 5: llm-d vs Dynamo comparison
export const LLMD_VS_DYNAMO = [
  { property: 'Architecture',     llmd: 'Kubernetes-native (Gateway API + EPP)',                          dynamo: 'Dynamo-native (Rust framework)' },
  { property: 'Cache tracking',   llmd: 'KVEvents + global Indexer',                                     dynamo: 'Radix Tree + hash matching' },
  { property: 'Scheduling',       llmd: 'Pluggable scorers (load, prefix, latency ML)',                   dynamo: 'Integrated with Planner' },
  { property: 'Hardware support', llmd: 'Multi-vendor (NVIDIA, Intel XPU, Google TPU)',                   dynamo: 'NVIDIA-focused' },
  { property: 'KV transfer',     llmd: 'NIXL, Mooncake, LMCache connectors',                             dynamo: 'NIXL native' },
  { property: 'P/D coordination', llmd: 'Sidecar orchestration',                                         dynamo: 'Integrated disaggregated serving' },
  { property: 'Open source',      llmd: 'Yes (Red Hat, Google, IBM, NVIDIA, CoreWeave)',                  dynamo: 'Yes (NVIDIA)' },
  { property: 'Maturity',         llmd: 'v0.5 (Feb 2026), production-validated',                          dynamo: 'GA with Dynamo' },
];

// Page 6: Routing scenarios
export const ROUTING_SCENARIOS = [
  {
    id: 'A',
    title: 'Returning user, cache hot',
    description: 'User 17 sends follow-up. Cache: 8K tokens on GPU 3, in HBM (G1).',
    routerDecision: 'GPU 3 has 100% cache match, load 65%.',
    action: 'Route to GPU 3.',
    dataMovement: 'Incremental prefill only (~200 tokens, ~12 ms TTFT).',
    ttft: '~12 ms',
    roundRobinTtft: '~500 ms',
  },
  {
    id: 'B',
    title: 'Returning user, cache cold',
    description: 'User 17 returns after 5-minute break. Cache demoted to G2 (DRAM) on GPU 3\u2019s server.',
    routerDecision: 'GPU 3 still tagged as having cache (tier info from Indexer).',
    action: 'Route to GPU 3.',
    dataMovement: 'KVBM promotes cache G2\u2192G1 (~70 ms), then incremental prefill (~12 ms).',
    ttft: '~82 ms',
    roundRobinTtft: '~500 ms',
  },
  {
    id: 'C',
    title: 'Returning user, cache in ICMS',
    description: 'User 17 returns. Cache demoted to ICMS (G3.5). GPU 3 at 90% load. GPU 5 at 20% load.',
    routerDecision: 'GPU 3 (cache in ICMS, high load) vs. GPU 5 (no cache, low load). Since cache is in ICMS (shared tier), GPU 5 can also pull it.',
    action: 'Route to GPU 5 (lower load; ICMS cache accessible from any GPU).',
    dataMovement: 'GPU 5 pulls cache from ICMS via NVMe/RoCE (~100 ms).',
    ttft: '~112 ms',
    roundRobinTtft: '~500 ms',
  },
  {
    id: 'D',
    title: 'New user, shared prefix',
    description: 'User 501 starts a new conversation. System prompt (2K tokens) cached on GPUs 0\u20137 (all have it).',
    routerDecision: 'All GPUs have the prefix. Choose least loaded.',
    action: 'Route to GPU 5 (20% load).',
    dataMovement: 'GPU 5 reuses system prompt cache (0 ms). Prefills only user\u2019s message (~500 tokens, ~30 ms).',
    ttft: '~30 ms',
    roundRobinTtft: '~60 ms',
  },
  {
    id: 'E',
    title: 'New user, unique document',
    description: 'User 501 uploads a 28K-token document. No cache exists anywhere.',
    routerDecision: 'No cache match on any GPU. This is a pure prefill request.',
    action: 'Route to Prefill Pool (disaggregated from Stop 12).',
    dataMovement: 'Full prefill: 28K tokens, ~500 ms. KV cache transfers to Decode Pool via NIXL (~90 ms or ~1.2 ms depending on scale-up domain).',
    ttft: '~590\u2013500 ms',
    roundRobinTtft: '~590\u2013500 ms',
  },
];

// Page 7: Feedback loop steps
export const FEEDBACK_LOOP_STEPS = [
  'User request arrives',
  'Router checks cache index \u2192 routes to GPU with best cache match',
  'GPU processes request \u2192 KV cache grows on that GPU',
  'Cache index updates \u2192 this GPU now has even more of this user\u2019s cache',
  'Next request from same user \u2192 router sees even stronger cache match',
  'Routes to same GPU again \u2192 cache affinity reinforced',
];

// Page 8: Summary table
export const SUMMARY_TABLE = [
  { strategy: 'Round-robin',                    ttftImpact: 'Baseline (worst)',  cacheHitRate: '~15%',     complexity: 'None' },
  { strategy: 'Load-aware',                     ttftImpact: '2\u20133\u00d7 better',  cacheHitRate: '~15% (no cache awareness)', complexity: 'Low' },
  { strategy: 'Load + prefix (approximate)',     ttftImpact: '3\u20135\u00d7 better',  cacheHitRate: '~60%',     complexity: 'Moderate' },
  { strategy: 'Precise prefix-cache (llm-d)',    ttftImpact: '57\u00d7 better',        cacheHitRate: '~87%',     complexity: 'Higher (requires KV Indexer)', highlight: true },
  { strategy: 'Predicted latency (ML-based)',    ttftImpact: 'Adaptive',              cacheHitRate: 'Adaptive', complexity: 'Highest (requires training)' },
];
