// Stop 16: Intelligent Routing — Where Should This Request Go?

export const PAGES = [
  { id: 'round-robin-cost',    label: 'Round-Robin Is 40x Too Expensive',  type: 'static' },
  { id: 'routing-decision',    label: 'The Routing Decision',              type: 'interactive' },
  { id: 'prefix-sharing',      label: 'Prefix Sharing',                    type: 'interactive' },
  { id: 'llm-d',               label: 'The llm-d Approach',                type: 'static' },
  { id: 'dynamo-router',       label: 'Dynamo Smart Router',               type: 'static' },
  { id: 'decision-tree',       label: 'The Routing Decision Tree',         type: 'interactive' },
  { id: 'feedback-loop',       label: 'The Cache Placement Feedback Loop', type: 'static' },
  { id: 'summary',             label: 'Stop 16 at a Glance',               type: 'static' },
];

// --- Narration (rendered with dangerouslySetInnerHTML; NO double-escaping) ---

export const NARRATIONS = {
  'round-robin-cost':
    'In our scenario, 32 concurrent users on 8 GPUs. User 17 has been chatting for 20 minutes. Their KV cache (8K tokens, 1.28 GB at FP8) is warm on Decode GPU 3. User 17 sends a follow-up message. A round-robin load balancer picks the next GPU in rotation — say, GPU 5. GPU 5 has no idea who User 17 is. It has no cached context. It must run full prefill on the entire conversation history: 8K tokens through all 80 layers. Cost: ~500 ms of GPU compute, consuming GPU 5’s full capacity during that time. Meanwhile, GPU 3 has User 17’s entire cache sitting in HBM, ready to go. If the request had gone to GPU 3, the follow-up would have needed only incremental prefill on the new message (~200 tokens, ~12 ms). The cache hit saves 488 ms of GPU compute and avoids blocking GPU 5’s other users. <strong>One wrong routing decision. 40× more compute.</strong> And this happens on every request in a round-robin system.',

  'routing-decision':
    'A cache-aware router must answer three questions for every incoming request: <strong>Which GPU has the relevant cache? How loaded is that GPU? And is the cache benefit worth sending to a busier GPU?</strong> These questions are in tension. The GPU with the best cache match might also be the most loaded. The least loaded GPU might have no relevant cache at all. The router must balance these competing signals in real time, for every request.',

  'prefix-sharing':
    'So far we’ve looked at routing for individual users — sending User 17 to the GPU that has User 17’s cache. But there’s a second, even more powerful optimization: recognizing when multiple users share the <em>same</em> tokens at the beginning of their prompts. To understand this, we need to define what a <strong>prefix</strong> is in the context of KV cache, and why it creates such a large opportunity for reuse.',

  'llm-d':
    'The <strong>llm-d</strong> project (Red Hat, Google Cloud, IBM Research, NVIDIA, CoreWeave) is the most mature open-source implementation of KV-cache-aware routing for Kubernetes-native inference. It achieved <strong>57× faster response times</strong> and <strong>2× throughput</strong> on identical hardware by replacing round-robin with intelligent scheduling. Here’s how it works.',

  'dynamo-router':
    'NVIDIA Dynamo includes its own KV-aware routing layer, with some capabilities that complement or overlap with llm-d’s approach. Here’s how they compare.',

  'decision-tree':
    'Let’s walk through the complete routing logic for several request types in our scenario. <strong>Pick a scenario below</strong> and watch the router think through the decision — cache lookup, scoring, selection, data movement — with real numbers for each case.',

  'feedback-loop':
    'Routing doesn’t just react to cache placement — it <strong>drives</strong> cache placement. The router’s decisions determine which GPUs accumulate which users’ caches. Over time, a well-tuned router creates natural cache affinity groups: sets of users whose conversations are co-located on the same GPU, maximizing cache reuse and minimizing cross-GPU transfers.',

  summary:
    'Intelligent routing turns the KV cache from a per-GPU optimization into a cluster-wide resource. The router is the control plane that connects everything from Stops 11 through 15: it decides which GPU gets the request (batching from Stop 11), whether it goes to prefill or decode pools (disaggregation from Stop 12), which tier the cache is retrieved from (hierarchy from Stop 13), and which fabric carries the data (protocols from Stop 15).',
};

// --- Page 1: Round-robin vs cache-aware comparison ---

export const ROUTING_COMPARISON = [
  { metric: 'Prefill compute',      roundRobin: '8K tokens × 80 layers = ~500 ms', cacheAware: '200 tokens × 80 layers = ~12 ms' },
  { metric: 'TTFT',                 roundRobin: '~500 ms (full recompute)',        cacheAware: '~12 ms (incremental prefill)' },
  { metric: 'GPU blocked',          roundRobin: 'GPU 5 for 500 ms',                cacheAware: 'GPU 3 for 12 ms' },
  { metric: 'Other users impacted', roundRobin: 'GPU 5’s batch stalled during prefill', cacheAware: 'Minimal impact' },
  { metric: 'Cache storage',        roundRobin: '1.28 GB duplicated on GPU 5 (now on both 3 and 5)', cacheAware: 'No duplication' },
  { metric: 'Cost multiplier',      roundRobin: '~40×',                             cacheAware: '1×', highlight: true },
];

// --- Page 2: 8 GPU fleet status ---

export const GPU_FLEET = [
  { id: 0, load: 45, userRange: 'Users 1–4',   cached: 'system prompt + conversations', hasUser17: false },
  { id: 1, load: 72, userRange: 'Users 5–8',   cached: null, hasUser17: false },
  { id: 2, load: 30, userRange: 'Users 9–12',  cached: null, hasUser17: false },
  { id: 3, load: 65, userRange: 'Users 13–17', cached: 'Users 13–17 (incl. User 17’s 8K cache)', hasUser17: true },
  { id: 4, load: 55, userRange: 'Users 18–21', cached: null, hasUser17: false },
  { id: 5, load: 20, userRange: 'Users 22–25', cached: null, hasUser17: false },
  { id: 6, load: 80, userRange: 'Users 26–29', cached: null, hasUser17: false },
  { id: 7, load: 40, userRange: 'Users 30–32', cached: null, hasUser17: false },
];

// Scoring steps for the 3-step animation on Page 2
// Each step highlights different fields on each GPU tile.
export const ROUTING_STEPS = [
  {
    key: 'idle',
    label: 'Ready',
    title: 'Request arrives: User 17, 200-token follow-up',
    description: 'The router receives User 17’s request. Before routing, every GPU is a candidate. Click “Score request” to watch the router walk through its decision.',
  },
  {
    key: 'cache',
    label: 'Step 1 — Cache affinity',
    title: 'Step 1 — Cache affinity scoring',
    description: 'The router queries the KV cache index: “Which GPUs have User 17’s prefix cached?” Only GPU 3 has any of it (100% match, 8K tokens). Every other GPU scores 0%.',
  },
  {
    key: 'load',
    label: 'Step 2 — Load scoring',
    title: 'Step 2 — Load scoring',
    description: 'The router scores each GPU on available capacity (100% − current load). GPU 5 has the most headroom at 80% capacity. GPU 6 has the least at 20%.',
  },
  {
    key: 'combined',
    label: 'Step 3 — Combined',
    title: 'Step 3 — Combined decision (cache × 0.8 + capacity × 0.2)',
    description: 'The router computes a weighted score. Cache affinity is heavily favored because the cost of a miss is so high. GPU 3 wins by a wide margin: 87 points vs. 16 for GPU 5.',
  },
  {
    key: 'routed',
    label: 'Routed',
    title: 'Routed → GPU 3',
    description: 'User 17’s request goes to GPU 3. Only ~200 new tokens need incremental prefill (~12 ms TTFT). The cache did its job.',
  },
];

// Combined scoring table for Step 3
export const SCORING_TABLE = [
  { gpu: 'GPU 3', id: 3, cacheScore: 100, capacity: 35, points: 87, winner: true },
  { gpu: 'GPU 5', id: 5, cacheScore: 0,   capacity: 80, points: 16, winner: false },
  { gpu: 'GPU 2', id: 2, cacheScore: 0,   capacity: 70, points: 14, winner: false },
  { gpu: 'GPU 7', id: 7, cacheScore: 0,   capacity: 60, points: 12, winner: false },
  { gpu: 'GPU 0', id: 0, cacheScore: 0,   capacity: 55, points: 11, winner: false },
  { gpu: 'GPU 4', id: 4, cacheScore: 0,   capacity: 45, points: 9,  winner: false },
  { gpu: 'GPU 1', id: 1, cacheScore: 0,   capacity: 28, points: 6,  winner: false },
  { gpu: 'GPU 6', id: 6, cacheScore: 0,   capacity: 20, points: 4,  winner: false },
];

// --- Page 3: Prefix sharing ---

export const PREFIX_SOURCES = [
  {
    num: 1,
    title: 'System prompts',
    tagline: 'Same 2K tokens for all 500 engineers',
    body: 'Every conversation with the 500-engineer assistant begins with the same system prompt — instructions telling the model how to behave, what tools are available, what format to use. That ~2,000 tokens of instructions is identical for User 1 and User 500. The KV cache for those tokens is the same regardless of which user sent the request.',
    blocks: [
      { label: 'System prompt: ~2K', kind: 'shared', tokens: 2000 },
      { label: 'User msg: ~200', kind: 'unique', tokens: 200 },
    ],
  },
  {
    num: 2,
    title: 'RAG contexts',
    tagline: '20 engineers querying the same policy document',
    body: 'In RAG pipelines, retrieved documents are prepended to the user’s question. When 20 engineers ask questions about the same 8K-token policy document, the first 10K tokens (system prompt + document) are identical across all 20 queries. Only the 200-token question differs.',
    blocks: [
      { label: 'System: 2K', kind: 'shared', tokens: 2000 },
      { label: 'Document: 8K (shared across 20 users)', kind: 'shared', tokens: 8000 },
      { label: 'Question: 200', kind: 'unique', tokens: 200 },
    ],
  },
  {
    num: 3,
    title: 'Multi-turn conversations',
    tagline: 'History is the prefix',
    body: 'In a multi-turn conversation, each new message includes all previous turns as context. Turn 5 contains turns 1–4 as its prefix. If the KV cache for turns 1–4 is still in HBM, the model only needs to compute the new message’s tokens. This is the “returning user” case — the conversation history <em>is</em> the prefix.',
    blocks: [
      { label: 'Turns 1–4: ~6K (history)', kind: 'shared', tokens: 6000 },
      { label: 'Turn 5: 250', kind: 'unique', tokens: 250 },
    ],
  },
];

// Prefix tree match examples for Page 3
export const PREFIX_MATCHES = [
  {
    label: 'Full match',
    color: 'teal',
    dot: 'var(--color-teal)',
    text: 'The entire prefix is cached. Skip to the first uncached token and begin prefill from there.',
    bar: { cached: 100, fresh: 0 },
    savings: '~12 ms prefill avoided',
  },
  {
    label: 'Partial match',
    color: 'amber',
    dot: 'var(--color-amber)',
    text: 'Some prefix tokens are cached, others aren’t. Resume prefill from the first uncached token.',
    bar: { cached: 60, fresh: 40 },
    savings: '~7 ms prefill avoided',
  },
  {
    label: 'No match',
    color: 'red',
    dot: 'var(--color-red)',
    text: 'No shared prefix exists on this GPU. Full prefill required from the root.',
    bar: { cached: 0, fresh: 100 },
    savings: '0 ms avoided',
  },
];

export const PREFIX_ROUTING_SAVINGS = [
  { metric: 'System prompt prefill',            without: '32 users × 2K tokens = 64K tokens',       withRouting: '8 GPUs × 2K = 16K tokens' },
  { metric: 'Per-user TTFT (new conversation)', without: '~60 ms (2K prefix + user message)',       withRouting: '~30 ms (user message only)' },
  { metric: 'GPU compute saved',                without: '0',                                       withRouting: '48K tokens worth of prefill (~288 ms aggregate)' },
  { metric: 'Equivalent GPU time freed',        without: '0',                                       withRouting: '~1.5 GPU-seconds per batch cycle' },
];

export const PREFIX_BENCHMARKS = [
  { metric: 'Cache hit rate',   value: '87%',      note: 'with precise prefix-cache-aware scheduling' },
  { metric: 'TTFT improvement', value: '57× faster', note: 'median, compared to round-robin' },
  { metric: 'Throughput gain',  value: '2×',        note: 'on identical hardware' },
];

// --- Page 4: llm-d architecture ---

export const LLMD_COMPONENTS = [
  {
    num: 1,
    title: 'KV Cache Indexer',
    text: 'A high-performance service that maintains a near-real-time global view of KV cache block locality across all vLLM pods. It subscribes to KVEvents streamed from each vLLM instance — structured metadata emitted as KV blocks are created or evicted. The indexer tracks which blocks reside on which pods and on which tier (GPU, CPU, storage).',
    detail: 'For infrastructure architects: this is conceptually a distributed key-value store where the keys are token-sequence hashes and the values are (pod_id, tier, block_address) tuples. The memory overhead is negligible — llm-d documents a 1,000,000:1 data-to-metadata ratio. The entire index for a large cluster fits in a few hundred MB.',
  },
  {
    num: 2,
    title: 'Inference Scheduler (EPP — External Processing Pod)',
    text: 'Sits behind the Kubernetes Gateway API and makes routing decisions for every incoming request. For each request, it tokenizes the prompt prefix, queries the KV Cache Indexer for pods with that prefix cached, and scores each candidate pod on cache affinity, load (KV utilization + queue depth), and — experimentally — predicted TTFT/TPOT from an ML model trained on live traffic. The highest-scoring pod wins.',
    detail: null,
  },
  {
    num: 3,
    title: 'Disaggregated Serving Sidecar',
    text: 'For disaggregated deployments (Stop 12), the scheduler also decides which prefill instance handles a new request and which decode instance receives the KV cache afterward. The sidecar coordinates the P/D handoff, instructing vLLM to transfer KV cache via NIXL over the appropriate interconnect (NVLink within the scale-up domain, RDMA across domains).',
    detail: null,
  },
];

export const LLMD_STRATEGIES = [
  { strategy: 'Round-robin',          howItWorks: 'Cycle through pods',                                                 bestFor: 'Baseline (worst performance)' },
  { strategy: 'Load-aware',           howItWorks: 'Route to least-loaded pod',                                          bestFor: 'Workloads without prefix sharing' },
  { strategy: 'Load + prefix',        howItWorks: 'Combine load and prefix cache affinity scores',                      bestFor: 'Most production workloads' },
  { strategy: 'Precise prefix-cache', howItWorks: 'Real-time introspection of distributed vLLM caches via KV Indexer',  bestFor: 'Maximum cache hit rate' },
  { strategy: 'Predicted latency',    howItWorks: 'ML model trained on live traffic predicts TTFT/TPOT per pod',        bestFor: 'Adaptive to dynamic workloads' },
];

export const LLMD_BENCHMARKS = [
  { metric: 'TTFT (median)',  roundRobin: '1,200 ms', loadPrefix: '450 ms',     precisePrefix: '21 ms' },
  { metric: 'Throughput',     roundRobin: 'Baseline', loadPrefix: '1.4×',       precisePrefix: '2.0×' },
  { metric: 'Cache hit rate', roundRobin: '~15%',     loadPrefix: '~60%',       precisePrefix: '~87%' },
  { metric: 'Improvement',    roundRobin: '—',        loadPrefix: '2.7× faster', precisePrefix: '57× faster', highlight: true },
];

// --- Page 5: llm-d vs Dynamo ---

export const LLMD_VS_DYNAMO = [
  { property: 'Architecture',     llmd: 'Kubernetes-native (Gateway API + EPP)',         dynamo: 'Dynamo-native (Rust framework)' },
  { property: 'Cache tracking',   llmd: 'KVEvents + global Indexer',                     dynamo: 'Radix Tree + hash matching' },
  { property: 'Scheduling',       llmd: 'Pluggable scorers (load, prefix, latency ML)',  dynamo: 'Integrated with Planner' },
  { property: 'Hardware support', llmd: 'Multi-vendor (NVIDIA, Intel XPU, Google TPU)',  dynamo: 'NVIDIA-focused' },
  { property: 'KV transfer',      llmd: 'NIXL, Mooncake, LMCache connectors',            dynamo: 'NIXL native' },
  { property: 'P/D coordination', llmd: 'Sidecar orchestration',                         dynamo: 'Integrated disaggregated serving' },
  { property: 'Open source',      llmd: 'Yes (Red Hat, Google, IBM, NVIDIA, CoreWeave)', dynamo: 'Yes (NVIDIA)' },
  { property: 'Maturity',         llmd: 'v0.5 (Feb 2026), production-validated',         dynamo: 'GA with Dynamo' },
];

// --- Page 6: Decision tree scenarios ---
// Each scenario drives a multi-stage animation with these stages:
//   cache_lookup → scoring → selection → data_movement → done
//
// selectedGpu = the GPU we route to (for highlight animation)
// cacheTier = which tier the cache currently lives in
// ttft / roundRobinTtft used in dual bar chart (ms values)

export const ROUTING_SCENARIOS = [
  {
    id: 'A',
    title: 'Returning user, cache hot in GPU 3',
    subtitle: 'Cache: 8K tokens, GPU 3 HBM (G1)',
    description: 'User 17 sends a follow-up. Cache is fresh in HBM on GPU 3.',
    selectedGpu: 3,
    cacheTier: 'HBM (G1)',
    cacheTierColor: 'var(--color-teal)',
    stages: [
      { key: 'lookup',   title: 'Cache lookup',   text: 'Indexer returns: GPU 3 holds 100% of User 17’s 8K cache in HBM.' },
      { key: 'scoring',  title: 'Scoring',         text: 'GPU 3: cache 100%, load 65% → 87 pts. No other GPU holds any of it — GPU 3 wins easily.' },
      { key: 'selection', title: 'Selection',      text: 'Route to GPU 3.' },
      { key: 'movement', title: 'Data movement',  text: 'No cache movement needed. Incremental prefill only: ~200 tokens (~12 ms).' },
    ],
    ttftMs: 12,
    roundRobinTtftMs: 500,
    ttft: '~12 ms',
    roundRobinTtft: '~500 ms',
    verdict: 'Cache-aware routing is 42× faster — the happy path.',
  },
  {
    id: 'B',
    title: 'Returning user, cache cold (in DRAM)',
    subtitle: 'Cache demoted to G2 (DRAM) on GPU 3’s server',
    description: 'User 17 returns after a 5-minute break. Their cache was evicted from HBM and sits in host DRAM on GPU 3’s server.',
    selectedGpu: 3,
    cacheTier: 'DRAM (G2)',
    cacheTierColor: 'var(--color-blue)',
    stages: [
      { key: 'lookup',   title: 'Cache lookup',   text: 'Indexer: GPU 3 still owns User 17’s cache — tier tag says G2 (DRAM on the host).' },
      { key: 'scoring',  title: 'Scoring',         text: 'GPU 3 still scores highest: the DRAM tier is local to the host, promotion back to HBM is cheap.' },
      { key: 'selection', title: 'Selection',      text: 'Route to GPU 3.' },
      { key: 'movement', title: 'Data movement',  text: 'KVBM promotes cache G2 → G1 over PCIe (~70 ms), then incremental prefill (~12 ms). Total: ~82 ms.' },
    ],
    ttftMs: 82,
    roundRobinTtftMs: 500,
    ttft: '~82 ms',
    roundRobinTtft: '~500 ms',
    verdict: 'Even a cold cache in DRAM beats full prefill by 6×.',
  },
  {
    id: 'C',
    title: 'Returning user, cache in ICMS',
    subtitle: 'Cache in shared G3.5 tier; GPU 3 overloaded at 90%',
    description: 'User 17 returns. Their cache was demoted to ICMS (G3.5), a shared tier accessible from any GPU. GPU 3 is at 90% load; GPU 5 is at 20%.',
    selectedGpu: 5,
    cacheTier: 'ICMS (G3.5)',
    cacheTierColor: 'var(--color-amber)',
    stages: [
      { key: 'lookup',   title: 'Cache lookup',   text: 'Indexer: User 17’s cache is in ICMS — accessible from any GPU. No GPU has it in HBM.' },
      { key: 'scoring',  title: 'Scoring',         text: 'GPU 3 is at 90% load (queue delay risk). GPU 5 at 20% load — and ICMS is reachable from anywhere.' },
      { key: 'selection', title: 'Selection',      text: 'Route to GPU 5 (lower load wins over sticky affinity).' },
      { key: 'movement', title: 'Data movement',  text: 'GPU 5 pulls cache from ICMS via NVMe/RoCE (~100 ms), then incremental prefill (~12 ms). Total: ~112 ms.' },
    ],
    ttftMs: 112,
    roundRobinTtftMs: 500,
    ttft: '~112 ms',
    roundRobinTtft: '~500 ms',
    verdict: 'ICMS makes cache location fungible — the router picks on load.',
  },
  {
    id: 'D',
    title: 'New user, shared system prompt prefix',
    subtitle: 'System prompt (2K) cached on all 8 GPUs',
    description: 'User 501 starts a new conversation. The 2K-token system prompt is already cached on every GPU because earlier users warmed it up.',
    selectedGpu: 5,
    cacheTier: 'Shared prefix in HBM on all GPUs',
    cacheTierColor: 'var(--color-teal)',
    stages: [
      { key: 'lookup',   title: 'Cache lookup',   text: 'Indexer: the system prompt prefix is cached on GPUs 0–7 — 100% match on all of them.' },
      { key: 'scoring',  title: 'Scoring',         text: 'Cache affinity ties across all GPUs — load score breaks the tie. GPU 5 has the most headroom at 80% capacity.' },
      { key: 'selection', title: 'Selection',      text: 'Route to GPU 5 (least loaded of the prefix-holding pods).' },
      { key: 'movement', title: 'Data movement',  text: 'GPU 5 reuses cached system prompt (0 ms), then prefills only the user’s ~500-token message (~30 ms). Total: ~30 ms.' },
    ],
    ttftMs: 30,
    roundRobinTtftMs: 60,
    ttft: '~30 ms',
    roundRobinTtft: '~60 ms',
    verdict: 'Shared prefix cuts new-user TTFT in half.',
  },
  {
    id: 'E',
    title: 'New user, unique document (no cache anywhere)',
    subtitle: '28K-token upload, nothing cached',
    description: 'User 501 uploads a 28K-token document. No cache exists anywhere. This is a pure prefill request.',
    selectedGpu: null, // routed to Prefill Pool, no single GPU highlight
    cacheTier: 'None',
    cacheTierColor: 'var(--color-red)',
    stages: [
      { key: 'lookup',   title: 'Cache lookup',   text: 'Indexer: no prefix match on any GPU. Nothing to reuse.' },
      { key: 'scoring',  title: 'Scoring',         text: 'Cache scores are all zero. Route to the prefill pool (disaggregated serving, Stop 12).' },
      { key: 'selection', title: 'Selection',      text: 'Route to Prefill Pool → least-loaded prefill instance.' },
      { key: 'movement', title: 'Data movement',  text: 'Full prefill: 28K tokens, ~500 ms. KV cache transfers to a Decode pool GPU via NIXL (~1.2 ms intra scale-up domain, ~90 ms cross-domain).' },
    ],
    ttftMs: 500,
    roundRobinTtftMs: 500,
    ttft: '~500 ms',
    roundRobinTtft: '~500 ms',
    verdict: 'Pure prefill — no cache can help here. Routing still steers to the right pool.',
  },
];

// --- Page 7: Feedback loop steps ---

export const FEEDBACK_LOOP_STEPS = [
  { num: 1, label: 'Request arrives', text: 'A user request enters the cluster through the Gateway API.' },
  { num: 2, label: 'Router checks cache index', text: 'The scheduler queries the KV Cache Indexer for pods holding this request’s prefix.' },
  { num: 3, label: 'GPU processes request', text: 'The winning GPU runs prefill (or reuses the cache), then decode. KV cache grows on that GPU.' },
  { num: 4, label: 'Cache index updates', text: 'The vLLM pod emits KVEvents. The Indexer now knows this GPU holds even more of this user’s cache.' },
  { num: 5, label: 'Next request from same user', text: 'When the user follows up, the router sees an even stronger cache match on the same GPU.' },
  { num: 6, label: 'Routes to same GPU again', text: 'Cache affinity is reinforced. The user is now “sticky” to this GPU — conversations accumulate there.' },
];

// --- Page 8: Summary ---

export const SUMMARY_TABLE = [
  { strategy: 'Round-robin',                   ttftImpact: 'Baseline (worst)', cacheHitRate: '~15%',     complexity: 'None' },
  { strategy: 'Load-aware',                    ttftImpact: '2–3× better',     cacheHitRate: '~15% (no cache awareness)', complexity: 'Low' },
  { strategy: 'Load + prefix (approximate)',   ttftImpact: '3–5× better',     cacheHitRate: '~60%',     complexity: 'Moderate' },
  { strategy: 'Precise prefix-cache (llm-d)',  ttftImpact: '57× better',      cacheHitRate: '~87%',     complexity: 'Higher (requires KV Indexer)', highlight: true },
  { strategy: 'Predicted latency (ML-based)',  ttftImpact: 'Adaptive',        cacheHitRate: 'Adaptive', complexity: 'Highest (requires training)' },
];
