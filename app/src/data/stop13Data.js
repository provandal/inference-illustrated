// Stop 13: The Memory Hierarchy — Where the Cache Lives

export const PAGES = [
  { id: 'framing',         label: 'You Already Know This',        type: 'static' },
  { id: 'five-tiers',      label: 'The Five Tiers',               type: 'interactive' },
  { id: 'data-movement',   label: 'Data Movement',                type: 'interactive' },
  { id: 'kvbm',            label: 'The KV Block Manager',         type: 'interactive' },
  { id: 'storage-io',      label: 'What Storage Sees',            type: 'interactive' },
  { id: 'cache-sharing',   label: 'Cache Sharing',                type: 'static' },
  { id: 'blocking',        label: 'What Waits on What',           type: 'static' },
  { id: 'competition',     label: 'The Competitive Landscape',    type: 'static' },
  { id: 'economics',       label: 'The Cache Hit Rate',           type: 'static' },
  { id: 'calculator',      label: 'Putting Numbers on It',        type: 'static' },
  { id: 'summary',         label: 'Stop 13 at a Glance',          type: 'static' },
];

// -- Narration text for each page (rendered with dangerouslySetInnerHTML) --

export const NARRATIONS = {
  framing:
    '<strong>Stop 13: The Memory Hierarchy &mdash; Where the Cache Lives.</strong> In our scenario, 32 users on 8x H100 GPUs with Llama-3 70B at FP4. At steady state (8K tokens average), the KV cache fits comfortably in HBM. But when 5 users simultaneously upload large documents (32K tokens each), cache demand spikes to 50 GB on a single GPU &mdash; more than the 45 GB available after weights. In Stop 11, we saw three options: preempt (expensive recomputation), queue (user waits), or offload (move cache to slower memory). This stop is about that third option &mdash; and it is the option that turns the KV cache into a tiered storage problem. If you have worked with storage systems, you have built tiered architectures before: SSD for hot data, HDD for warm, tape or object storage for cold. The same pattern applies here &mdash; but the tiers are different, the data is ephemeral, and the latency requirements are measured in microseconds, not milliseconds.',

  'five-tiers':
    'NVIDIA formalized the KV cache memory hierarchy into five tiers, labeled G1 through G4 (with G3.5 added at CES 2026). Each tier offers more capacity at higher latency. Here are the concrete numbers for our 8x H100 cluster. <strong>Drag the idle-time slider</strong> to see which tier a conversation would naturally migrate to, and <strong>toggle ICMS on/off</strong> to watch the G3.5 tier appear or disappear.',

  'data-movement':
    'The tiers don&rsquo;t just exist &mdash; data moves between them. Let&rsquo;s trace User 17&rsquo;s KV cache through a 30-minute session with full mechanical detail: what triggers each move, what moves, how it moves, and what else is happening while the move is in progress. <strong>Press play</strong> or drag the scrubber to step through the animation frame by frame.',

  kvbm:
    'The orchestrator behind all this data movement is the <strong>Dynamo KV Block Manager (KVBM)</strong>. If you&rsquo;ve worked with storage controllers, volume managers, or caching layers, the KVBM will feel familiar &mdash; it is a block-level memory manager with tiering policies, lifecycle tracking, and a storage-agnostic backend API. <strong>Click any state</strong> in the lifecycle diagram below to walk through a block&rsquo;s journey.',

  'storage-io':
    'If you are building or evaluating a storage system for KV cache (the G3, G3.5, or G4 tier), here is what the I/O workload looks like. This section translates inference behavior into storage engineering requirements.',

  'cache-sharing':
    'Here is the detail that matters most for networking professionals: when KV cache lives in a shared tier (G3.5/ICMS or G4), <strong>any GPU in the pod can read any conversation&rsquo;s cache</strong>. This breaks the one-GPU-one-cache binding from Stop 11 and creates entirely new possibilities &mdash; and entirely new network demands.',

  blocking:
    'One of the most important questions for infrastructure engineers: when a user&rsquo;s KV cache is not in HBM, what happens to their request? Does the system block? Does it process other work while waiting? Is there a job manager coordinating all of this?',

  competition:
    'NVIDIA&rsquo;s Dynamo/KVBM/NIXL/CMX stack is the most mature KV cache tiering solution as of early 2026. But it is not the only approach. Here is where the competition stands &mdash; because your infrastructure decisions may involve AMD, open-source alternatives, or vendor-specific storage integrations.',

  economics:
    'The economic case for KV cache tiering comes down to a single metric: <strong>cache hit rate</strong> &mdash; how often a request can reuse existing cached KV data instead of recomputing from scratch. According to Manus AI (an agentic AI company acquired by Meta in 2025), &ldquo;KV cache hit rate is the most important metric for agentic AI systems because a KV cache miss costs ten times more than a cache hit.&rdquo;',

  calculator:
    'Let&rsquo;s calculate the total cache capacity and cost across all tiers for our scenario &mdash; and see how tiering changes the number of concurrent users we can serve.',

  summary:
    'The KV cache memory hierarchy transforms inference from a single-tier problem into a multi-tier optimization problem &mdash; the same kind of problem storage engineers solve every day, applied to a new data type.',
};

// Side-by-side comparison: traditional storage tiering vs. KV cache tiering
export const TIERING_COMPARISON = [
  { aspect: 'Hot tier',            traditional: 'NVMe SSD',                            kvCache: 'GPU HBM' },
  { aspect: 'Warm tier',           traditional: 'SAS SSD / HDD',                      kvCache: 'CPU DRAM' },
  { aspect: 'Cold tier',           traditional: 'HDD / tape',                          kvCache: 'NVMe SSD' },
  { aspect: 'Archive',             traditional: 'Object storage / cloud',              kvCache: 'Network storage (Dell, WEKA, VAST)' },
  { aspect: 'Data lifecycle',      traditional: 'Months to years',                     kvCache: 'Seconds to minutes' },
  { aspect: 'Placement policy',    traditional: 'Access frequency over days/weeks',    kvCache: 'Access recency within a conversation' },
  { aspect: 'Eviction cost',       traditional: 'Read from slower tier',               kvCache: 'Recompute (prefill) OR read from slower tier' },
  { aspect: 'Data durability',     traditional: 'Critical (data must not be lost)',     kvCache: 'Ephemeral (can always be recomputed)' },
];

// The five-tier memory hierarchy with concrete numbers for 8x H100 cluster.
// capacityGB is an approximate numeric aggregate used by the Five Tiers capacity counter.
export const MEMORY_TIERS = [
  {
    id: 'G1',
    label: 'G1 \u2014 GPU HBM',
    shortLabel: 'G1 HBM',
    capacity: '80 GB per GPU x 8 = 640 GB total (45 GB usable after weights x 8 = 360 GB)',
    capacityGB: 360,
    latency: '~1 ns',
    bandwidth: '3.35 TB/s per H100',
    costPerGB: '~$25/GB',
    interconnect: 'Internal to GPU (no network involved)',
    role: 'Active decode. Every token being generated reads from here.',
    scenario: 'Holds the KV cache for all actively-generating conversations. 32 users x 2.5 GB = 80 GB. Fits across 8 GPUs.',
    color: 'var(--color-teal)',
    colorBg: 'var(--color-teal-bg)',
    colorText: 'var(--color-teal-text)',
    // Idle-time (seconds) at which the tier is preferred placement
    idleThresholdSec: 0,
  },
  {
    id: 'G2',
    label: 'G2 \u2014 CPU DRAM',
    shortLabel: 'G2 DRAM',
    capacity: '~2 TB per server',
    capacityGB: 2048,
    latency: '~100 ns (100x slower than HBM)',
    bandwidth: '~200 GB/s (DDR5); GPU path via PCIe Gen5 at ~64 GB/s',
    costPerGB: '~$5/GB',
    interconnect: 'PCIe Gen5 between GPU and CPU memory (~64 GB/s per direction)',
    role: 'Warm cache. Recently active conversations not currently generating. Conversations between user turns.',
    scenario: 'During a 30-second pause between turns, a user\u2019s 2.5 GB cache can be offloaded from HBM to DRAM via PCIe. Transfer: 2.5 / 64 = ~39 ms. When the user sends their next message, swap back: ~39 ms.',
    color: 'var(--color-blue)',
    colorBg: 'var(--color-blue-bg)',
    colorText: 'var(--color-blue-text)',
    idleThresholdSec: 15,
  },
  {
    id: 'G3',
    label: 'G3 \u2014 Local NVMe SSD',
    shortLabel: 'G3 NVMe',
    capacity: '4\u201316 TB per server',
    capacityGB: 16384,
    latency: '~10 \u00B5s (10,000 ns \u2014 100x slower than DRAM)',
    bandwidth: '7\u201314 GB/s per drive, ~30\u201360 GB/s aggregate',
    costPerGB: '~$0.10/GB',
    interconnect: 'NVMe over PCIe (local to server)',
    role: 'Cold cache. Conversations idle for minutes. Overflow from DRAM.',
    scenario: 'A user closes their laptop for 10 minutes. Their cache (2.5 GB) is tiered from DRAM to SSD. Retrieval when they return: 2.5 GB / 14 GB/s = ~180 ms. Noticeable but far faster than full recomputation (~500\u20131000 ms for 8K-token prefill).',
    color: 'var(--color-amber)',
    colorBg: 'var(--color-amber-bg)',
    colorText: 'var(--color-amber-text)',
    idleThresholdSec: 300, // 5 minutes
  },
  {
    id: 'G3.5',
    label: 'G3.5 \u2014 ICMS / CMX',
    shortLabel: 'G3.5 ICMS',
    capacity: 'Petabytes per pod (~100+ TB typical)',
    capacityGB: 102400,
    latency: '~50\u2013100 \u00B5s (pod-level RDMA access)',
    bandwidth: '270+ GB/s aggregate (demonstrated by WEKA on 8x H100)',
    costPerGB: '~$0.05/GB',
    interconnect: 'Spectrum-X Ethernet with RDMA between compute nodes and ICMS enclosures',
    role: 'Shared context memory. KV cache accessible by ANY GPU in the pod \u2014 not tied to a single server. Enables cache reuse across requests with shared prefixes.',
    scenario: 'All 500 engineers share the same system prompt (~2K tokens). Instead of each GPU computing and storing this prefix independently, ICMS stores it once and serves it to any GPU on demand.',
    color: 'var(--color-primary)',
    colorBg: 'var(--color-primary-bg)',
    colorText: 'var(--color-primary-text)',
    idleThresholdSec: 900, // 15 minutes (ICMS preferred for long idle)
    optional: true,
  },
  {
    id: 'G4',
    label: 'G4 \u2014 Network Storage',
    shortLabel: 'G4 Network',
    capacity: 'Petabytes to exabytes',
    capacityGB: 1024 * 1024, // 1 PB
    latency: '~1\u201310 ms',
    bandwidth: 'Varies (1\u2013100+ GB/s depending on system and protocol)',
    costPerGB: '~$0.01/GB',
    interconnect: 'RDMA over Ethernet, NVMe-oF, or S3/object protocols',
    role: 'Persistent context archive. For agentic AI workflows where context spans hours or days.',
    scenario: 'An engineer starts a multi-day code review with extensive context. At end of day, the 32K-token cache (10 GB) is archived. Next morning, retrieved from network storage: 10 GB at 50 GB/s RDMA = 200 ms vs. recompute at ~2,000 ms.',
    color: 'var(--color-red)',
    colorBg: 'var(--color-red-bg)',
    colorText: 'var(--color-red-text)',
    idleThresholdSec: 3600, // 1 hour
  },
];

// Interconnect summary table
export const INTERCONNECT_TABLE = [
  { transition: 'G1 \u2194 G1 (GPU to GPU, same node)',     interconnect: 'NVLink',                      bandwidth: '900 GB/s',       initiator: 'Tensor parallelism all-reduce' },
  { transition: 'G1 \u2194 G1 (GPU to GPU, cross-node)',    interconnect: 'InfiniBand / Spectrum-X RDMA', bandwidth: '50\u2013100 GB/s', initiator: 'Disaggregated P/D transfer' },
  { transition: 'G1 \u2194 G2 (GPU to CPU DRAM)',            interconnect: 'PCIe Gen5',                   bandwidth: '64 GB/s',        initiator: 'KVBM demotion/promotion' },
  { transition: 'G2 \u2194 G3 (DRAM to local SSD)',          interconnect: 'NVMe over PCIe',              bandwidth: '14\u201360 GB/s',  initiator: 'KVBM demotion/promotion' },
  { transition: 'G1/G2 \u2194 G3.5 (Node to ICMS)',          interconnect: 'Spectrum-X RDMA',             bandwidth: '50\u2013100 GB/s', initiator: 'KVBM + NIXL' },
  { transition: 'Any \u2194 G4 (Node to network storage)',   interconnect: 'RDMA / NVMe-oF / S3',          bandwidth: '1\u2013100 GB/s',  initiator: 'KVBM + NIXL' },
];

// Data-movement animation frames for User 17.
// Each frame places User 17's block at `tierId` with a given size and optional
// flow animation from sourceTier -> targetTier for that frame.
export const MIGRATION_FRAMES = [
  {
    id: 'prefill',
    time: '0:00',
    title: 'Prefill',
    tierId: 'G1',
    sourceTier: null,
    targetTier: 'G1',
    transferMs: 0,
    cacheSize: '8.96 GB',
    cacheGB: 8.96,
    description: 'User 17 sends a 28,000-token document. Prefill computes KV cache in G1 (HBM). 28,000 tokens x 320 KB = 8.96 GB created across the prefill GPU\u2019s HBM. Nothing else is waiting \u2014 this is a new conversation, and the prefill GPU is dedicated to prefill (disaggregated from Stop 12).',
    policy: null,
    badge: 'New conversation',
  },
  {
    id: 'pd-transfer',
    time: '0:00+',
    title: 'P/D Transfer',
    tierId: 'G1',
    sourceTier: 'G1',
    targetTier: 'G1',
    transferMs: 180,
    transferLabel: '8.96 GB at 50 GB/s (InfiniBand NDR 400G) \u2248 180 ms',
    cacheSize: '8.96 GB',
    cacheGB: 8.96,
    description: 'Prefill complete. KVBM marks User 17\u2019s blocks as "committed." NIXL initiates an RDMA transfer from Prefill GPU HBM to Decode GPU HBM: 8.96 GB at 50 GB/s = ~180 ms. During this transfer, the Decode GPU continues generating tokens for its OTHER users (13\u201316) \u2014 the transfer is asynchronous and non-blocking. NIXL uses a separate DMA channel that does not compete with the compute path.',
    policy: 'Decode GPU: async DMA, other users unaffected',
    badge: 'RDMA stream',
  },
  {
    id: 'decode',
    time: '0:00\u20130:45',
    title: 'Active Decode',
    tierId: 'G1',
    sourceTier: null,
    targetTier: 'G1',
    transferMs: 0,
    cacheSize: '8.96 \u2192 9.60 GB',
    cacheGB: 9.60,
    growing: true,
    description: 'Response generated over ~45 seconds. Cache grows in G1 as new tokens are generated: 8.96 GB \u2192 9.60 GB (2,000 response tokens added). Each new token appends K,V to the cache at every layer \u2014 80 layers x 320 KB per token per layer of cache growth per decode step.',
    policy: 'Mutable page at head, all others Committed',
    badge: 'Cache growing',
  },
  {
    id: 'demotion',
    time: '0:45\u20132:00',
    title: 'User Reading \u2014 Cache Demotion',
    tierId: 'G2',
    sourceTier: 'G1',
    targetTier: 'G2',
    transferMs: 150,
    transferLabel: '9.60 GB via PCIe Gen5 at 64 GB/s \u2248 150 ms',
    cacheSize: '9.60 GB',
    cacheGB: 9.60,
    description: 'Response complete. User is reading. The KVBM monitors idle time. After a configurable threshold (e.g., 15 s of no activity), blocks transition to "evictable." If G1 memory pressure is high (new users arriving), KVBM initiates demotion to G2 (CPU DRAM) at 64 GB/s = ~150 ms. Pages are freed in G1. The trigger is a policy: idle time + G1 utilization + incoming queue depth.',
    policy: 'Idle: 15s | G1 util: 87% | Queue: 3 waiting',
    badge: 'Demote G1 \u2192 G2',
  },
  {
    id: 'promotion',
    time: '2:00',
    title: 'Follow-up \u2014 Cache Promotion',
    tierId: 'G1',
    sourceTier: 'G2',
    targetTier: 'G1',
    transferMs: 150,
    transferLabel: '9.60 GB at 64 GB/s \u2248 150 ms (layer-parallel fill)',
    cacheSize: '9.60 GB',
    cacheGB: 9.60,
    layerParallel: true,
    description: 'User sends next message. KVBM looks up blocks \u2014 finds them in G2. Promotion begins: G2 \u2192 G1 via PCIe at 64 GB/s = ~150 ms. Prefill and promotion OVERLAP: as each layer\u2019s cache arrives, the KVBM Scheduler releases it to the inference engine layer-by-layer rather than waiting for the full transfer. Net perceived delay: ~50\u201380 ms instead of the full 150 ms.',
    policy: 'Layer-parallel fill: early layers arrive first',
    badge: 'Promote G2 \u2192 G1',
  },
  {
    id: 'deep-demotion',
    time: '5:00\u201315:00',
    title: 'Extended Idle \u2014 Deeper Demotion',
    tierId: 'G3.5',
    sourceTier: 'G2',
    targetTier: 'G3.5',
    transferMs: 192,
    transferLabel: 'G2 \u2192 G3.5: 9.60 GB at 50 GB/s RDMA \u2248 192 ms (or G3 at 14 GB/s \u2248 686 ms)',
    cacheSize: '9.60 GB',
    cacheGB: 9.60,
    description: 'User takes a long break. G2 is filling up too \u2014 other conversations also idle. KVBM demotes further: G2 \u2192 G3 (NVMe) at 14 GB/s = ~686 ms. If ICMS is available: G2 \u2192 G3.5 at ~50 GB/s RDMA = ~192 ms \u2014 faster AND the cache becomes accessible to any GPU in the pod.',
    policy: 'Idle: 5+ min | G2 util: 92% | ICMS preferred',
    badge: 'Demote G2 \u2192 G3.5',
  },
  {
    id: 'return',
    time: '15:00',
    title: 'User Returns from Long Break',
    tierId: 'G1',
    sourceTier: 'G3.5',
    targetTier: 'G1',
    transferMs: 192,
    transferLabel: 'G3.5 \u2192 G1: 9.60 GB at 50 GB/s RDMA \u2248 192 ms (vs. ~2,000 ms full recompute)',
    cacheSize: '9.60 GB',
    cacheGB: 9.60,
    layerParallel: true,
    description: 'User sends another message. Cache must be promoted back to G1. From G3 (local SSD): ~500\u2013836 ms via GDS or staged through DRAM. From G3.5 (ICMS): ~192 ms directly to G1 via RDMA \u2014 the RDMA path is higher bandwidth than NVMe over PCIe. Compare: full recomputation from scratch would be ~2,000 ms for a 30,000-token prefill consuming full GPU compute.',
    policy: 'Zero GPU compute: pure RDMA transfer',
    badge: 'Promote G3.5 \u2192 G1',
  },
  {
    id: 'end',
    time: '30:00',
    title: 'Conversation Ends',
    tierId: null,
    sourceTier: 'G1',
    targetTier: null,
    transferMs: 0,
    cacheSize: 'Freed',
    cacheGB: 0,
    description: 'User closes the chat. Option A: Cache freed entirely \u2014 pages returned to all tier pools. Future reference requires full recomputation. Option B: Cache archived to G3.5/G4 for potential reuse. For our scenario (internal tool, same 500 engineers daily), archival to G3.5 is likely worthwhile.',
    policy: 'Freed across all tiers OR archived to G3.5/G4',
    badge: 'Session ends',
  },
];

// Retrieval path comparison table
export const RETRIEVAL_PATHS = [
  { path: 'G1 (already in HBM)',             latency: '0 ms',           gpuCompute: 'None' },
  { path: 'G2 \u2192 G1 (DRAM promotion)',   latency: '~150 ms',        gpuCompute: 'None (DMA transfer)' },
  { path: 'G3 \u2192 G1 (SSD promotion)',    latency: '~500\u2013836 ms', gpuCompute: 'None (DMA transfer)' },
  { path: 'G3.5 \u2192 G1 (ICMS promotion)', latency: '~192 ms',        gpuCompute: 'None (RDMA transfer)' },
  { path: 'Cache miss (full recompute)',       latency: '~2,000 ms',      gpuCompute: 'Full prefill GPU compute' },
];

// KVBM block lifecycle states
export const BLOCK_LIFECYCLE = [
  {
    state: 'Inactive',
    color: 'var(--color-text-muted)',
    description: 'Block is in the free pool, available for allocation. Holds no cache data.',
    detail: 'When a conversation ends (or all its pages are freed), blocks return here, ready to be allocated again by the next prefill or decode step.',
  },
  {
    state: 'Mutable',
    color: 'var(--color-amber)',
    description: 'Block is being written to (during prefill or decode). Cannot be evicted or moved.',
    detail: 'During active decode, each new token appends K,V to the cache. Only the NEWEST page per layer is Mutable \u2014 the rest are already full and Committed. This means only ONE page per conversation per layer is mutable at any time.',
  },
  {
    state: 'Committed',
    color: 'var(--color-teal)',
    description: 'Block contains valid cache data and is being actively read during decode. Cannot be evicted.',
    detail: 'Full pages during active generation sit here. They are read on every decode step across all layers. A conversation\u2019s prefix pages spend most of their lives in Committed.',
  },
  {
    state: 'Evictable',
    color: 'var(--color-blue)',
    description: 'Block\u2019s conversation is idle. Can be demoted to a lower tier or freed entirely.',
    detail: 'After the idle threshold, ALL pages transition from Committed to Evictable. The KVBM may then demote them to G2/G3/G3.5/G4 based on memory pressure, or free them if policy dictates.',
  },
];

// Storage I/O characteristics table
export const STORAGE_REQUIREMENTS = [
  { requirement: 'High sequential read throughput',              why: 'Promotion latency = TTFT',                                   implication: 'Optimize for large sequential reads, not random IOPS' },
  { requirement: 'Moderate sequential write throughput',         why: 'Demotion is background, not latency-critical',               implication: 'Write throughput matters but not as much as read' },
  { requirement: 'Fixed block size (configurable, ~5 MB)',       why: 'KVBM page size determines I/O unit',                         implication: 'Align storage block/chunk size to KVBM page size' },
  { requirement: 'RDMA support',                                  why: 'Bypass CPU on data path; GPU-to-storage direct transfer',    implication: 'Must support GPUDirect Storage (GDS) or RDMA verbs' },
  { requirement: 'Append-friendly (no in-place update)',          why: 'KV blocks written once, read many times, then freed',        implication: 'Log-structured or append-only layouts are natural fits' },
  { requirement: 'No durability guarantees needed',               why: 'Cache is ephemeral \u2014 can be recomputed',                implication: 'Skip RAID, replication, journaling. Raw performance > reliability' },
  { requirement: 'Namespace per conversation',                    why: 'Blocks identified by conversation_id + coordinates',         implication: 'Flat namespace with coordinate-based addressing' },
  { requirement: 'Fast space reclamation',                        why: 'When conversation ends, all blocks freed at once',           implication: 'Bulk delete by conversation_id, not page-by-page' },
];

// KV cache block sizes across models (Patch 3). FP16, page_size = 16.
export const BLOCK_SIZE_TABLE = [
  { model: 'Llama-3 8B',          kvHeads: 8,  dHead: 128, layers: 32,  perLayerPerPage: '64 KB',  blockSize: '2.05 MB' },
  { model: 'Llama-3 70B',         kvHeads: 8,  dHead: 128, layers: 80,  perLayerPerPage: '64 KB',  blockSize: '5.12 MB' },
  { model: 'Llama-3 405B',        kvHeads: 8,  dHead: 128, layers: 126, perLayerPerPage: '64 KB',  blockSize: '8.06 MB' },
  { model: 'Mistral 7B',          kvHeads: 8,  dHead: 128, layers: 32,  perLayerPerPage: '64 KB',  blockSize: '2.05 MB' },
  { model: 'Qwen-2.5 72B',        kvHeads: 8,  dHead: 128, layers: 80,  perLayerPerPage: '64 KB',  blockSize: '5.12 MB' },
  { model: 'DeepSeek-V3 (MLA)',   kvHeads: 1,  dHead: 512, layers: 61,  perLayerPerPage: '32 KB',  blockSize: '1.95 MB' },
];

// Step-by-step scenario: User 17 follow-up, cache in G2
export const BLOCKING_STEPS = [
  {
    num: '1',
    label: 'Request arrives at Smart Router.',
    text: 'Router checks KVBM\u2019s index: "User 17\u2019s cache is on Server 2, in G2 (DRAM), Decode GPU 3." Router sends request to Decode GPU 3. Router is immediately available for other requests.',
    blocking: 'Non-blocking',
    blockColor: 'teal',
  },
  {
    num: '2',
    label: 'KVBM initiates promotion.',
    text: 'G2 \u2192 G1 transfer begins via PCIe DMA. Decode GPU 3 continues generating tokens for Users 13\u201316 in the continuous batch. The DMA transfer uses a separate memory channel that does not stall compute.',
    blocking: 'Non-blocking for other users',
    blockColor: 'teal',
  },
  {
    num: '3',
    label: 'User 17\u2019s new tokens begin incremental prefill.',
    text: 'The Scheduler coordinates: as each layer\u2019s cache arrives in G1, that layer becomes available for the new tokens\u2019 attention computation. Prefill proceeds layer-by-layer, overlapping with the ongoing promotion. User 17 cannot get their first token until Layer 80\u2019s cache has arrived AND the new tokens have been processed through all 80 layers.',
    blocking: 'Partially blocking for User 17',
    blockColor: 'amber',
  },
  {
    num: '4',
    label: 'Promotion completes.',
    text: 'All of User 17\u2019s cache is now in G1. User 17 joins the continuous batch for decode. From this point, User 17 gets tokens at the same rate as everyone else.',
    blocking: 'Fully active',
    blockColor: 'teal',
  },
];

// What-blocks-what summary table
export const BLOCKING_TABLE = [
  { event: 'Cache in G1 (hot)',       user17: 'No delay',            otherUsers: 'No impact',            prefillPool: 'Not involved' },
  { event: 'Promotion from G2',       user17: 'TTFT += ~50\u2013150 ms',  otherUsers: 'No impact (async DMA)',  prefillPool: 'Not involved' },
  { event: 'Promotion from G3',       user17: 'TTFT += ~500\u2013800 ms', otherUsers: 'No impact (async DMA)',  prefillPool: 'Not involved' },
  { event: 'Promotion from G3.5',     user17: 'TTFT += ~200 ms',     otherUsers: 'No impact (async RDMA)', prefillPool: 'Not involved' },
  { event: 'Full cache miss',         user17: 'TTFT += ~2,000 ms',   otherUsers: 'No impact (different GPU pool)', prefillPool: 'Occupied for ~100\u2013500 ms' },
];

// Cache hit vs. miss cost comparison (28,000-token conversation)
export const CACHE_HIT_VS_MISS = [
  { metric: 'Latency',                hit: '~200 ms (RDMA transfer)',          miss: '~2,000 ms (prefill compute)' },
  { metric: 'GPU compute consumed',   hit: 'Zero',                             miss: 'Full prefill for 28K tokens' },
  { metric: 'Impact on other users',  hit: 'None (async transfer)',            miss: 'Stalls prefill pool' },
  { metric: 'Network bandwidth',      hit: '9.6 GB one-time transfer',         miss: 'None (compute-only)' },
  { metric: 'Total cost',             hit: '1x (transfer only)',               miss: '~10x (compute + stall + opportunity)' },
];

// Capacity comparison: without tiering vs. with tiering
export const WITHOUT_TIERING = [
  { metric: 'HBM available for cache',             perGPU: '45 GB', eightGPUs: '360 GB' },
  { metric: 'Users at 8K tokens (2.5 GB each)',     perGPU: '18',    eightGPUs: '144' },
  { metric: 'Users at 32K tokens (10 GB each)',     perGPU: '4',     eightGPUs: '32' },
];

export const WITH_TIERING = [
  { tier: 'G1 (HBM)',     capacity: '360 GB',    usersAt8K: '144 active',        latency: '~0 ms',             path: 'Already there' },
  { tier: 'G2 (DRAM)',    capacity: '2 TB',      usersAt8K: '800 warm',          latency: '~150 ms',           path: 'PCIe DMA' },
  { tier: 'G3 (NVMe)',    capacity: '16 TB',     usersAt8K: '6,400 cold',        latency: '~500\u2013800 ms',  path: 'GDS or staged via DRAM' },
  { tier: 'G3.5 (ICMS)',  capacity: '100+ TB',   usersAt8K: '40,000+ shared',    latency: '~200 ms',           path: 'Spectrum-X RDMA' },
  { tier: 'G4 (Network)', capacity: 'PB+',       usersAt8K: 'Millions archived', latency: '~1\u201310 s',      path: 'RDMA / NVMe-oF / S3' },
];

// Summary tier table
export const TIER_SUMMARY = [
  { tier: 'G1 (HBM)',     capacity: '80 GB',   latency: '~1 ns',                interconnect: 'Internal to GPU',  role: 'Active decode' },
  { tier: 'G2 (DRAM)',    capacity: '2 TB',    latency: '~100 ns',              interconnect: 'PCIe Gen5',        role: 'Warm / between turns' },
  { tier: 'G3 (NVMe)',    capacity: '16 TB',   latency: '~10 \u00B5s',          interconnect: 'NVMe/PCIe',        role: 'Cold / idle minutes' },
  { tier: 'G3.5 (ICMS)',  capacity: '100+ TB', latency: '~50\u2013100 \u00B5s', interconnect: 'Spectrum-X RDMA',  role: 'Shared pod context' },
  { tier: 'G4 (Network)', capacity: 'PB+',     latency: '~1\u201310 ms',        interconnect: 'RDMA / NVMe-oF',   role: 'Archive / persistent' },
];

// Key takeaways
export const KEY_TAKEAWAYS = [
  'The KV cache can live at five tiers: GPU HBM, CPU DRAM, local NVMe, ICMS/CMX, and network storage.',
  'Each tier trades capacity for latency. All tiered retrieval uses zero GPU compute \u2014 only a cache miss requires full prefill.',
  'The KVBM orchestrates data movement across tiers with block-level granularity and lifecycle tracking.',
  'ICMS/CMX (G3.5) breaks the one-GPU-one-cache binding: any GPU can access any conversation\u2019s cache.',
  'For storage engineers: the I/O workload is large sequential reads/writes of fixed-size blocks (~5 MB), latency-critical on reads, throughput-critical on writes.',
  'Cache hit rate is the central economic metric \u2014 a miss costs ~10x a hit.',
];

// Helper: determine which tier a conversation at `idleSec` of idle time would naturally live in
export function tierForIdle(idleSec, icmsEnabled) {
  // Walk the tier thresholds, skipping G3.5 if disabled
  const tiers = MEMORY_TIERS.filter((t) => icmsEnabled || !t.optional);
  let chosen = tiers[0];
  for (const t of tiers) {
    if (idleSec >= t.idleThresholdSec) chosen = t;
  }
  return chosen;
}
