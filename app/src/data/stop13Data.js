// Stop 13: The Memory Hierarchy — Where the Cache Lives

export const PAGES = [
  { id: 'framing',         label: 'You Already Know This',        type: 'static' },
  { id: 'five-tiers',      label: 'The Five Tiers',               type: 'static' },
  { id: 'data-movement',   label: 'Data Movement',                type: 'static' },
  { id: 'kvbm',            label: 'The KV Block Manager',         type: 'static' },
  { id: 'storage-io',      label: 'What Storage Sees',            type: 'static' },
  { id: 'cache-sharing',   label: 'Cache Sharing',                type: 'static' },
  { id: 'blocking',        label: 'What Waits on What',           type: 'static' },
  { id: 'competition',     label: 'The Competitive Landscape',    type: 'static' },
  { id: 'economics',       label: 'The Cache Hit Rate',           type: 'static' },
  { id: 'calculator',      label: 'Putting Numbers on It',        type: 'static' },
  { id: 'summary',         label: 'Stop 13 at a Glance',          type: 'static' },
];

// Side-by-side comparison: traditional storage tiering vs. KV cache tiering
export const TIERING_COMPARISON = [
  { aspect: 'Hot tier',            traditional: 'NVMe SSD',                            kvCache: 'GPU HBM' },
  { aspect: 'Warm tier',           traditional: 'SAS SSD / HDD',                      kvCache: 'CPU DRAM' },
  { aspect: 'Cold tier',           traditional: 'HDD / tape',                          kvCache: 'NVMe SSD' },
  { aspect: 'Archive',             traditional: 'Object storage / cloud',              kvCache: 'Network storage (VAST, WEKA)' },
  { aspect: 'Data lifecycle',      traditional: 'Months to years',                     kvCache: 'Seconds to minutes' },
  { aspect: 'Placement policy',    traditional: 'Access frequency over days/weeks',    kvCache: 'Access recency within a conversation' },
  { aspect: 'Eviction cost',       traditional: 'Read from slower tier',               kvCache: 'Recompute (prefill) OR read from slower tier' },
  { aspect: 'Data durability',     traditional: 'Critical (data must not be lost)',     kvCache: 'Ephemeral (can always be recomputed)' },
];

// The five-tier memory hierarchy with concrete numbers for 8x H100 cluster
export const MEMORY_TIERS = [
  {
    id: 'G1',
    label: 'G1 — GPU HBM',
    capacity: '80 GB per GPU x 8 = 640 GB total (45 GB usable after weights x 8 = 360 GB)',
    latency: '~1 ns',
    bandwidth: '3.35 TB/s per H100',
    costPerGB: '~$25/GB',
    interconnect: 'Internal to GPU (no network involved)',
    role: 'Active decode. Every token being generated reads from here.',
    scenario: 'Holds the KV cache for all actively-generating conversations. 32 users x 2.5 GB = 80 GB. Fits across 8 GPUs.',
    color: 'var(--color-teal)',
  },
  {
    id: 'G2',
    label: 'G2 — CPU DRAM',
    capacity: '~2 TB per server',
    latency: '~100 ns (100x slower than HBM)',
    bandwidth: '~200 GB/s (DDR5)',
    costPerGB: '~$5/GB',
    interconnect: 'PCIe Gen5 between GPU and CPU memory (~64 GB/s per direction)',
    role: 'Warm cache. Recently active conversations not currently generating. Conversations between user turns.',
    scenario: 'During a 30-second pause between turns, a user\u2019s 2.5 GB cache can be offloaded from HBM to DRAM via PCIe. Transfer time: 2.5 GB / 64 GB/s = ~39 ms. When the user sends their next message, swap back: ~39 ms.',
    color: 'var(--color-blue)',
  },
  {
    id: 'G3',
    label: 'G3 — Local NVMe SSD',
    capacity: '4\u201316 TB per server',
    latency: '~10 \u00B5s (10,000 ns \u2014 100x slower than DRAM)',
    bandwidth: '7\u201314 GB/s per drive, ~30\u201360 GB/s aggregate',
    costPerGB: '~$0.10/GB',
    interconnect: 'NVMe over PCIe (local to server)',
    role: 'Cold cache. Conversations idle for minutes. Overflow from DRAM.',
    scenario: 'A user closes their laptop for 10 minutes. Their cache (2.5 GB) is tiered from DRAM to SSD. Retrieval when they return: 2.5 GB / 14 GB/s = ~180 ms.',
    color: 'var(--color-primary)',
  },
  {
    id: 'G3.5',
    label: 'G3.5 — ICMS / CMX',
    capacity: 'Petabytes per pod',
    latency: '~50\u2013100 \u00B5s',
    bandwidth: '270+ GB/s aggregate (demonstrated by WEKA on 8x H100)',
    costPerGB: '~$0.05/GB',
    interconnect: 'Spectrum-X Ethernet with RDMA between compute nodes and ICMS enclosures',
    role: 'Shared context memory. KV cache accessible by ANY GPU in the pod \u2014 not tied to a single server. Enables cache reuse across requests with shared prefixes.',
    scenario: 'All 500 engineers share the same system prompt (~2K tokens). Instead of each GPU computing and storing this prefix independently, ICMS stores it once and serves it to any GPU on demand.',
    color: 'var(--color-text-muted)',
  },
  {
    id: 'G4',
    label: 'G4 — Network Storage',
    capacity: 'Petabytes to exabytes',
    latency: '~1\u201310 ms',
    bandwidth: 'Varies (1\u2013100+ GB/s)',
    costPerGB: '~$0.01/GB',
    interconnect: 'RDMA over Ethernet, NVMe-oF, or S3/object protocols',
    role: 'Persistent context archive. For agentic AI workflows where context spans hours or days.',
    scenario: 'An engineer starts a multi-day code review with extensive context. At end of day, the 32K-token cache (10 GB) is archived. Next morning, retrieved from network storage: 10 GB at 50 GB/s RDMA = 200 ms vs. recompute at ~2,000 ms.',
    color: 'var(--color-red)',
  },
];

// Interconnect summary table
export const INTERCONNECT_TABLE = [
  { transition: 'G1 \u2194 G1 (same node)',     interconnect: 'NVLink',                bandwidth: '900 GB/s',     initiator: 'Tensor parallelism all-reduce' },
  { transition: 'G1 \u2194 G1 (cross-node)',     interconnect: 'InfiniBand / Spectrum-X RDMA', bandwidth: '50\u2013100 GB/s', initiator: 'Disaggregated P/D transfer' },
  { transition: 'G1 \u2194 G2',                  interconnect: 'PCIe Gen5',             bandwidth: '64 GB/s',      initiator: 'KVBM demotion/promotion' },
  { transition: 'G2 \u2194 G3',                  interconnect: 'NVMe over PCIe',        bandwidth: '14\u201360 GB/s',  initiator: 'KVBM demotion/promotion' },
  { transition: 'G1/G2 \u2194 G3.5',             interconnect: 'Spectrum-X RDMA',       bandwidth: '50\u2013100 GB/s', initiator: 'KVBM + NIXL' },
  { transition: 'Any \u2194 G4',                  interconnect: 'RDMA / NVMe-oF / S3',  bandwidth: '1\u2013100 GB/s',  initiator: 'KVBM + NIXL' },
];

// Data-movement animation frames for User 17
export const MIGRATION_FRAMES = [
  {
    id: 'prefill',
    time: '0:00',
    title: 'Prefill',
    tier: 'G1',
    cacheSize: '8.96 GB',
    description: 'User 17 sends a 28,000-token document. Prefill computes KV cache in G1 (HBM). 28,000 tokens x 320 KB = 8.96 GB created across the prefill GPU\u2019s HBM.',
  },
  {
    id: 'pd-transfer',
    time: '0:00+',
    title: 'P/D Transfer',
    tier: 'G1 \u2192 G1',
    cacheSize: '8.96 GB',
    description: 'Prefill complete. KVBM marks blocks as "committed." NIXL initiates RDMA transfer from Prefill GPU to Decode GPU: 8.96 GB at 50 GB/s = ~180 ms. The Decode GPU continues generating tokens for other users during the transfer \u2014 it is asynchronous and non-blocking.',
  },
  {
    id: 'decode',
    time: '0:00\u20130:45',
    title: 'Active Decode',
    tier: 'G1',
    cacheSize: '8.96 \u2192 9.60 GB',
    description: 'Response generated over ~45 seconds. Cache grows in G1 as new tokens are generated. Each new token appends K,V to the cache at every layer \u2014 80 layers x 320 KB per token of cache growth per decode step.',
  },
  {
    id: 'demotion',
    time: '0:45\u20132:00',
    title: 'User Reading \u2014 Cache Demotion',
    tier: 'G1 \u2192 G2',
    cacheSize: '9.60 GB',
    description: 'Response complete. User is reading. After a configurable idle threshold (e.g., 15 seconds), KVBM transitions blocks to "evictable." If G1 memory pressure is high, demotion to G2 (CPU DRAM) begins: 9.60 GB via PCIe Gen5 at 64 GB/s = ~150 ms.',
  },
  {
    id: 'promotion',
    time: '2:00',
    title: 'Follow-up \u2014 Cache Promotion',
    tier: 'G2 \u2192 G1',
    cacheSize: '9.60 GB',
    description: 'User sends next message. KVBM looks up the blocks in G2. Promotion initiated at 64 GB/s = ~150 ms. Prefill and promotion can overlap: the KVBM releases blocks layer-by-layer as they arrive, so early layers process while later layers transfer. Net user delay: ~50\u201380 ms.',
  },
  {
    id: 'deep-demotion',
    time: '5:00\u201315:00',
    title: 'Extended Idle \u2014 Deeper Demotion',
    tier: 'G2 \u2192 G3 or G3.5',
    cacheSize: '9.60 GB',
    description: 'User takes a long break. G2 is filling up. KVBM demotes further: G2 \u2192 G3 (NVMe) at 14 GB/s = ~686 ms. Or if ICMS is available: G2 \u2192 G3.5 at ~50 GB/s RDMA = ~192 ms \u2014 faster AND the cache becomes accessible to any GPU in the pod.',
  },
  {
    id: 'return',
    time: '15:00',
    title: 'User Returns from Long Break',
    tier: 'G3/G3.5 \u2192 G1',
    cacheSize: '9.60 GB',
    description: 'From G3 (local SSD): ~500\u2013836 ms via GPUDirect Storage or staged through DRAM. From G3.5 (ICMS): ~192 ms directly to G1 via RDMA. Compare: full recomputation from scratch would be ~2,000 ms for a 30,000-token prefill.',
  },
  {
    id: 'end',
    time: '30:00',
    title: 'Conversation Ends',
    tier: 'Freed or Archived',
    cacheSize: '9.60 GB',
    description: 'Option A: Cache freed entirely \u2014 pages returned to all tier pools. Future reference requires full recomputation. Option B: Cache archived to G3.5/G4 for potential reuse. For our scenario (same 500 engineers daily), archival to G3.5 is likely worthwhile.',
  },
];

// Retrieval path comparison table
export const RETRIEVAL_PATHS = [
  { path: 'G1 (already in HBM)',            latency: '0 ms',          gpuCompute: 'None' },
  { path: 'G2 \u2192 G1 (DRAM promotion)',  latency: '~150 ms',       gpuCompute: 'None (DMA transfer)' },
  { path: 'G3 \u2192 G1 (SSD promotion)',   latency: '~500\u2013836 ms', gpuCompute: 'None (DMA transfer)' },
  { path: 'G3.5 \u2192 G1 (ICMS promotion)',latency: '~192 ms',       gpuCompute: 'None (RDMA transfer)' },
  { path: 'Cache miss (full recompute)',     latency: '~2,000 ms',     gpuCompute: 'Full prefill GPU compute' },
];

// KVBM block lifecycle states
export const BLOCK_LIFECYCLE = [
  { state: 'Inactive',  description: 'Block is in the free pool, available for allocation.' },
  { state: 'Mutable',   description: 'Block is being written to (during prefill or decode). Cannot be evicted or moved.' },
  { state: 'Committed', description: 'Block contains valid cache data and is being actively read during decode. Cannot be evicted.' },
  { state: 'Evictable', description: 'Block\u2019s conversation is idle. Can be demoted to a lower tier or freed entirely.' },
];

// Storage I/O characteristics table
export const STORAGE_REQUIREMENTS = [
  { requirement: 'High sequential read throughput',              why: 'Promotion latency = TTFT',                                   implication: 'Optimize for large sequential reads, not random IOPS' },
  { requirement: 'Moderate sequential write throughput',         why: 'Demotion is background, not latency-critical',               implication: 'Write throughput matters but not as much as read' },
  { requirement: 'Fixed block size (~5 MB)',                     why: 'KVBM page size determines I/O unit',                         implication: 'Align storage block/chunk size to KVBM page size' },
  { requirement: 'RDMA support',                                why: 'Bypass CPU on data path; GPU-to-storage direct transfer',    implication: 'Must support GPUDirect Storage (GDS) or RDMA verbs' },
  { requirement: 'Append-friendly (no in-place update)',         why: 'KV blocks are written once, read many, then freed',          implication: 'Log-structured or append-only layouts are natural fits' },
  { requirement: 'No durability guarantees needed',              why: 'Cache is ephemeral \u2014 can be recomputed',                implication: 'Skip RAID, replication, journaling. Raw performance > reliability' },
  { requirement: 'Namespace per conversation',                   why: 'Blocks identified by conversation_id + coordinates',         implication: 'Flat namespace with coordinate-based addressing' },
  { requirement: 'Fast space reclamation',                       why: 'When conversation ends, all blocks freed at once',           implication: 'Bulk delete by conversation_id, not page-by-page' },
];

// KV cache block sizes across models (Patch 3)
export const BLOCK_SIZE_TABLE = [
  { model: 'Llama-3 8B',          kvHeads: 8,  dHead: 128, layers: 32,  perLayerPerPage: '64 KB',  blockSize: '2.05 MB' },
  { model: 'Llama-3 70B',         kvHeads: 8,  dHead: 128, layers: 80,  perLayerPerPage: '64 KB',  blockSize: '5.12 MB' },
  { model: 'Llama-3 405B',        kvHeads: 8,  dHead: 128, layers: 126, perLayerPerPage: '64 KB',  blockSize: '8.06 MB' },
  { model: 'Mistral 7B',          kvHeads: 8,  dHead: 128, layers: 32,  perLayerPerPage: '64 KB',  blockSize: '2.05 MB' },
  { model: 'Qwen-2.5 72B',        kvHeads: 8,  dHead: 128, layers: 80,  perLayerPerPage: '64 KB',  blockSize: '5.12 MB' },
  { model: 'DeepSeek-V3 (MLA)',   kvHeads: 1,  dHead: 512, layers: 61,  perLayerPerPage: '32 KB',  blockSize: '1.95 MB' },
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
  { metric: 'Network bandwidth',      hit: '9.6 GB one-time transfer',        miss: 'None (compute-only)' },
  { metric: 'Total cost',             hit: '1x (transfer only)',               miss: '~10x (compute + stall + opportunity)' },
];

// Capacity comparison: without tiering vs. with tiering
export const WITHOUT_TIERING = [
  { metric: 'HBM available for cache',           perGPU: '45 GB',  eightGPUs: '360 GB' },
  { metric: 'Users at 8K tokens (2.5 GB each)',   perGPU: '18',     eightGPUs: '144' },
  { metric: 'Users at 32K tokens (10 GB each)',    perGPU: '4',      eightGPUs: '32' },
];

export const WITH_TIERING = [
  { tier: 'G1 (HBM)',     capacity: '360 GB',    usersAt8K: '144 active',    latency: '~0 ms',          path: 'Already there' },
  { tier: 'G2 (DRAM)',    capacity: '2 TB',      usersAt8K: '800 warm',      latency: '~150 ms',        path: 'PCIe DMA' },
  { tier: 'G3 (NVMe)',    capacity: '16 TB',     usersAt8K: '6,400 cold',    latency: '~500\u2013800 ms',  path: 'GDS or staged via DRAM' },
  { tier: 'G3.5 (ICMS)',  capacity: '100+ TB',   usersAt8K: '40,000+ shared', latency: '~200 ms',        path: 'Spectrum-X RDMA' },
  { tier: 'G4 (Network)', capacity: 'PB+',       usersAt8K: 'Millions archived', latency: '~1\u201310 s', path: 'RDMA / NVMe-oF / S3' },
];

// Summary tier table
export const TIER_SUMMARY = [
  { tier: 'G1 (HBM)',     capacity: '80 GB',   latency: '~1 ns',        interconnect: 'Internal to GPU',   role: 'Active decode' },
  { tier: 'G2 (DRAM)',    capacity: '2 TB',    latency: '~100 ns',      interconnect: 'PCIe Gen5',         role: 'Warm / between turns' },
  { tier: 'G3 (NVMe)',    capacity: '16 TB',   latency: '~10 \u00B5s',  interconnect: 'NVMe/PCIe',         role: 'Cold / idle minutes' },
  { tier: 'G3.5 (ICMS)',  capacity: '100+ TB', latency: '~50\u2013100 \u00B5s', interconnect: 'Spectrum-X RDMA', role: 'Shared pod context' },
  { tier: 'G4 (Network)', capacity: 'PB+',     latency: '~1\u201310 ms', interconnect: 'RDMA / NVMe-oF',  role: 'Archive / persistent' },
];
