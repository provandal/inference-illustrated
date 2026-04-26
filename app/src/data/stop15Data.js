// Stop 15: The Fabric — How the Cache Moves

export const PAGES = [
  { id: 'four-protocols',    label: 'Four Protocols, Four Distances',    type: 'static' },
  { id: 'nvlink-domains',    label: 'Scale-Up Domains',                 type: 'static' },
  { id: 'rdma',              label: 'RDMA — Crossing the Boundary',     type: 'static' },
  { id: 'cxl',               label: 'CXL — Memory, Not Network',        type: 'static' },
  { id: 'nvme',              label: 'NVMe-oF — Reaching Storage',       type: 'static' },
  { id: 'complete-path',     label: 'The Complete Data Path',           type: 'static' },
  { id: 'fabric-contention', label: 'What Competes for the Fabric',     type: 'static' },
  { id: 'summary',           label: 'Stop 15 at a Glance',              type: 'static' },
];

// Page 1: Protocol overview table (sorted by latency per Patch 1)
export const PROTOCOL_OVERVIEW = [
  {
    protocol: 'NVLink 6',
    bandwidth: '3.6 TB/s per GPU',
    transferTime: '~1.2 ms',
    latencyClass: 'Nanoseconds',
    distance: 'Within scale-up domain (NVL8 to NVL576+)',
    primaryUse: 'TP all-reduce, P/D transfer within domain',
  },
  {
    protocol: 'CXL 2.0',
    bandwidth: '64 GB/s (x16 PCIe 5.0)',
    transferTime: '~70 ms',
    latencyClass: '<100 ns',
    distance: 'Intra-rack (CPU to pooled DRAM)',
    primaryUse: 'Memory-tier KV cache pooling',
  },
  {
    protocol: 'InfiniBand NDR',
    bandwidth: '50 GB/s (400 Gbps)',
    transferTime: '~90 ms',
    latencyClass: '1\u20132 \u00b5s',
    distance: 'Inter-domain / inter-pod',
    primaryUse: 'P/D transfer across scale-up domains',
  },
  {
    protocol: 'RoCEv2 / Spectrum-X',
    bandwidth: '50 GB/s (400 Gbps)',
    transferTime: '~90 ms',
    latencyClass: '5\u201310 \u00b5s',
    distance: 'Inter-domain / inter-pod',
    primaryUse: 'P/D transfer, ICMS access',
  },
  {
    protocol: 'NVMe/RoCE',
    bandwidth: '14\u2013100+ GB/s',
    transferTime: '~45\u2013320 ms',
    latencyClass: '10\u2013100 \u00b5s',
    distance: 'Multi-rack',
    primaryUse: 'G3/G3.5/G4 storage tier access',
  },
];

// Page 2: Scale-up domain sizes (Patch 2)
export const NVLINK_DOMAINS = [
  {
    config: 'NVL2',
    gpus: 2,
    scope: 'NVLink bridge (2-GPU workstation/HPC)',
    bwPerGpu: '600 GB/s (NVLink 4 bridge)',
    totalBw: '1.2 TB/s',
    status: 'Legacy (A100/H100 workstation)',
  },
  {
    config: 'GB200 NVL4',
    gpus: 4,
    scope: 'Superchip board (4 Blackwell + 2 Grace)',
    bwPerGpu: '1.8 TB/s (NVLink 5)',
    totalBw: '7.2 TB/s',
    status: 'Production (2025, HPC/AI)',
  },
  {
    config: 'HGX NVL8',
    gpus: 8,
    scope: 'Single node',
    bwPerGpu: '1.8 TB/s (NVLink 5, Blackwell)',
    totalBw: '14.4 TB/s',
    status: 'Production (2024\u2013)',
  },
  {
    config: 'GB200 NVL72',
    gpus: 72,
    scope: 'Single rack (18 compute trays)',
    bwPerGpu: '1.8 TB/s (NVLink 5)',
    totalBw: '130 TB/s',
    status: 'Production (2025\u2013)',
  },
  {
    config: 'Vera Rubin NVL72',
    gpus: 72,
    scope: 'Single rack (18 compute trays)',
    bwPerGpu: '3.6 TB/s (NVLink 6)',
    totalBw: '260 TB/s',
    status: 'H2 2026',
  },
  {
    config: 'Vera Rubin NVL144 CPX',
    gpus: 144,
    scope: 'Rubin SXM + CPX accelerators (only ~48 on NVLink fabric)',
    bwPerGpu: '3.6 TB/s (NVLink 6)',
    totalBw: 'N/A (not a 144-GPU all-to-all domain)',
    status: 'De-prioritized (see note below)',
  },
  {
    config: 'Vera Rubin Ultra NVL576',
    gpus: 576,
    scope: 'Multi-rack (Kyber optical)',
    bwPerGpu: '3.6 TB/s (NVLink 6)',
    totalBw: '2+ PB/s',
    status: 'Announced (2027+)',
  },
  {
    config: 'Future (NVL1152)',
    gpus: '1,152',
    scope: 'Multi-rack (Kyber optical)',
    bwPerGpu: 'TBD (NVLink 7?)',
    totalBw: 'TBD',
    status: 'Roadmap (Feynman)',
  },
];

// Page 3: RDMA data path steps (Patch 3 applied)
export const RDMA_DATA_PATH = [
  { step: 1, description: 'Prefill GPU completes computation.' },
  { step: 2, description: 'KVBM marks the cache blocks as ready for transfer (committed state from Stop 13). KVBM then instructs NIXL to execute the transfer. NIXL initiates an RDMA WRITE operation \u2014 the prefill GPU\u2019s NIC (ConnectX-7 or ConnectX-9) reads the cache blocks directly from GPU HBM via GPUDirect RDMA, bypassing the CPU entirely. (KVBM is the orchestrator that decides WHAT moves and WHEN. NIXL is the execution layer that performs the actual data transfer using the appropriate transport protocol.)' },
  { step: 3, description: 'The data travels over the fabric (Ethernet or IB) to the decode node\u2019s NIC.' },
  { step: 4, description: 'The decode node\u2019s NIC writes the data directly into the decode GPU\u2019s HBM \u2014 again bypassing the CPU.' },
  { step: 5, description: 'Total CPU involvement: zero. The entire transfer is NIC-to-NIC with GPU memory on both ends.' },
];

// Page 3: IB vs RoCEv2 comparison
export const IB_VS_ROCE = [
  { property: 'Bandwidth',             ib: '50 GB/s per port',                    roce: '50 GB/s per port' },
  { property: 'Latency',               ib: '1\u20132 \u00b5s',                    roce: '5\u201310 \u00b5s' },
  { property: 'Congestion control',    ib: 'Credit-based (built-in lossless)',     roce: 'Requires PFC + ECN + DCQCN tuning' },
  { property: 'Routing',               ib: 'Subnet manager (centralized)',         roce: 'Standard IP routing (ECMP)' },
  { property: 'Multi-vendor',          ib: 'NVIDIA-centric (Quantum switches)',    roce: 'Broad ecosystem (Spectrum-X, Arista, Cisco, Juniper)' },
  { property: 'Operational complexity', ib: 'Lower (self-tuning fabric)',          roce: 'Higher (PFC/ECN configuration critical)' },
  { property: 'Scalability',           ib: 'Excellent within a fabric partition',  roce: 'Excellent across L3 boundaries' },
  { property: 'Cost',                  ib: 'Higher (dedicated fabric)',            roce: 'Lower (shared Ethernet infrastructure)' },
  { property: 'Best for',             ib: 'Large-scale training, ultra-low latency inference', roce: 'Inference clusters, converged fabrics, cost-sensitive' },
];

// Page 4: CXL vs RDMA comparison
export const CXL_VS_RDMA = [
  { property: 'Access model',    rdma: 'Copy: source NIC reads, fabric transfers, dest NIC writes', cxl: 'Memory: direct load/store to shared memory pool' },
  { property: 'Latency',         rdma: '1\u201310 \u00b5s (protocol) + transfer time',              cxl: '<100 ns (memory-like access)' },
  { property: 'CPU involvement', rdma: 'Zero (GPUDirect RDMA)',                                     cxl: 'Zero (direct memory mapping)' },
  { property: 'Reach',           rdma: 'Multi-rack (Ethernet/IB fabric)',                            cxl: 'Intra-rack (PCIe distance, ~1\u20132 m)' },
  { property: 'Bandwidth',       rdma: '50\u2013100 GB/s per port',                                 cxl: '64 GB/s (x16 PCIe 5.0), up to 128 GB/s (CXL 3.0)' },
  { property: 'Shared access',   rdma: 'Requires explicit coordination',                            cxl: 'Memory-coherent (hardware-managed)' },
  { property: 'Maturity',        rdma: 'Production since 2015+',                                    cxl: 'First cloud instances Nov 2025 (Microsoft Azure)' },
];

// Page 4: CXL production results
export const CXL_PRODUCTION_RESULTS = [
  { source: 'TraCT (UC research, 2025)',        result: 'CXL-based KV cache sharing for disaggregated inference on Dynamo achieved up to 9.8\u00d7 TTFT reduction over RDMA/NIXL baseline.' },
  { source: 'XConn + MemVerge (SC 2025)',        result: 'CXL memory pool for KV cache achieved 3.8\u00d7 speedup over 200G RDMA and 6.5\u00d7 over 100G RDMA.' },
  { source: 'Astera Labs (OCP 2025)',            result: 'Leo CXL Smart Memory Controllers demonstrated 3\u00d7 concurrent LLM instances at higher throughput and 3\u00d7 lower latency.' },
  { source: 'Enfabrica EMFASYS',                result: 'Combines CXL and Ethernet RDMA in a single switch \u2014 144 CXL 2.0 lanes with up to 18 TB pooled DDR5 memory, plus 800 GbE RDMA connectivity.' },
];

// Page 5: NVMe transport options (Patch 5 applied)
export const NVME_TRANSPORTS = [
  { transport: 'NVMe/RoCE', protocol: 'RDMA verbs over RoCEv2',  latency: '10\u201320 \u00b5s', bandwidth: '50+ GB/s',  relevance: 'Primary transport for ICMS and high-performance G3.5/G4 access' },
  { transport: 'NVMe/FC',   protocol: 'Fibre Channel NVMe',      latency: '20\u201350 \u00b5s', bandwidth: '32\u201364 Gbps', relevance: 'Not currently used for KV cache infrastructure' },
  { transport: 'NVMe/TCP',  protocol: 'Standard TCP/IP',          latency: '50\u2013200 \u00b5s', bandwidth: '10\u201325 GB/s', relevance: 'Cost-sensitive G4 storage access, brownfield deployments' },
];

// Page 5: ICMS data path steps (Patch 5 Step 3 corrected)
export const ICMS_DATA_PATH = [
  { step: 1, description: 'KVBM issues a get() request.' },
  { step: 2, description: 'NIXL translates this to an NVMe/RoCE read command.' },
  { step: 3, description: 'The local BlueField-4 DPU sends the NVMe/RoCE read command over the Spectrum-X Ethernet (RDMA transport) to the BlueField-4 DPU fronting the ICMS enclosure.' },
  { step: 4, description: 'BlueField-4 terminates the NVMe/RoCE protocol, reads the KV block from local NVMe flash.' },
  { step: 5, description: 'The data returns over the same RDMA path to GPU HBM via GPUDirect.' },
];

// Page 6: Complete data path steps
export const DATA_PATH_STEPS = [
  {
    step: 1,
    title: 'Prefill (intra-node)',
    dataPath: 'Embedding \u2192 GPU compute \u2192 KV cache in Prefill GPU HBM',
    protocol: 'Internal to GPU (no network)',
    dataVolume: '\u2014',
    latency: '0 (computation, not transfer)',
  },
  {
    step: 2,
    title: 'P/D transfer (cross-domain, disaggregated)',
    dataPath: 'Prefill GPU HBM \u2192 ConnectX NIC \u2192 Spectrum-X switch \u2192 ConnectX NIC \u2192 Decode GPU HBM',
    protocol: 'RDMA (RoCEv2) via GPUDirect',
    dataVolume: '4.48 GB (FP8)',
    latency: '~90 ms',
  },
  {
    step: 3,
    title: 'Active decode',
    dataPath: 'Decode GPU HBM (read at every layer, every decode step)',
    protocol: 'Internal to GPU',
    dataVolume: '4.48 GB read + small append per step',
    latency: '\u2014',
  },
  {
    step: 4,
    title: 'Demotion to DRAM (idle conversation)',
    dataPath: 'Decode GPU HBM \u2192 PCIe Gen5 \u2192 CPU DRAM',
    protocol: 'PCIe DMA',
    dataVolume: '4.48 GB',
    latency: '~70 ms (4.48 GB / 64 GB/s)',
  },
  {
    step: 5,
    title: 'Promotion back to HBM (user returns)',
    dataPath: 'CPU DRAM \u2192 PCIe Gen5 \u2192 Decode GPU HBM',
    protocol: 'PCIe DMA',
    dataVolume: '4.48 GB',
    latency: '~70 ms',
  },
  {
    step: 6,
    title: 'Demotion to ICMS (extended idle)',
    dataPath: 'CPU DRAM \u2192 ConnectX NIC \u2192 Spectrum-X switch \u2192 BlueField-4 DPU \u2192 NVMe flash',
    protocol: 'NVMe/RoCE',
    dataVolume: '4.48 GB',
    latency: '~90 ms',
  },
  {
    step: 7,
    title: 'Promotion from ICMS (user returns next day)',
    dataPath: 'NVMe flash \u2192 BlueField-4 DPU \u2192 Spectrum-X switch \u2192 ConnectX NIC \u2192 GPU HBM',
    protocol: 'NVMe/RoCE \u2192 GPUDirect',
    dataVolume: '4.48 GB',
    latency: '~90\u2013100 ms (vs. recomputation: ~2,000 ms)',
  },
  {
    step: 8,
    title: 'Archive to network storage (conversation ends)',
    dataPath: 'ICMS \u2192 Spectrum-X \u2192 Storage system (Dell/VAST/WEKA/DDN)',
    protocol: 'RDMA or NVMe/RoCE or S3',
    dataVolume: '4.48 GB',
    latency: 'Async (not on critical path)',
  },
];

// Page 6: Protocol summary by tier transition (Patch 7 applied)
export const TIER_PROTOCOL_SUMMARY = [
  { transition: 'G1 \u2194 G1 (within scale-up domain)', protocol: 'NVLink 6',             bandwidth: '3.6 TB/s per GPU', transferTime: '~1.2 ms' },
  { transition: 'G1 \u2194 G1 (across scale-up domains)', protocol: 'RDMA (RoCEv2/IB)',     bandwidth: '50\u2013100 GB/s',  transferTime: '~45\u201390 ms' },
  { transition: 'G1 \u2194 G2',                          protocol: 'PCIe Gen5 DMA',        bandwidth: '64 GB/s',           transferTime: '~70 ms' },
  { transition: 'G1/G2 \u2194 G3',                       protocol: 'NVMe/PCIe (local)',    bandwidth: '14\u201360 GB/s',   transferTime: '~75\u2013320 ms' },
  { transition: 'G1/G2 \u2194 G3.5',                     protocol: 'NVMe/RoCE',            bandwidth: '50+ GB/s',          transferTime: '~90\u2013100 ms' },
  { transition: 'Any \u2194 G4',                          protocol: 'NVMe/RoCE or NVMe/TCP', bandwidth: '1\u2013100 GB/s', transferTime: 'Varies' },
  { transition: 'Future: G1/G2 \u2194 CXL pool',         protocol: 'CXL.mem',              bandwidth: '64\u2013128 GB/s',  transferTime: '~35\u201370 ms', future: true },
];

// Page 7: Traffic types on inference fabric (Patch 8 applied)
export const FABRIC_TRAFFIC = [
  { type: 'TP all-reduce (TP>1 only)',     protocol: 'RDMA (NVLink intra, IB/RoCE inter)', pattern: '2 per layer per pass (64/160/252 for 8B/70B/405B). Zero at TP=1.', latencySensitivity: 'Very high (blocks decode)', bandwidth: 'Moderate' },
  { type: 'P/D KV transfer',               protocol: 'NVLink (within scale-up domain) or RDMA (across scale-up domains)', pattern: 'Occasional, large (GB)', latencySensitivity: 'High (adds to TTFT)', bandwidth: 'High burst' },
  { type: 'Cache promotion (G3.5\u2192G1)', protocol: 'NVMe/RoCE',                         pattern: 'Occasional, large (GB)',          latencySensitivity: 'High (adds to TTFT)',        bandwidth: 'High burst' },
  { type: 'Cache demotion (G1\u2192G3.5)',  protocol: 'NVMe/RoCE',                         pattern: 'Occasional, large (GB)',          latencySensitivity: 'Low (background)',            bandwidth: 'Moderate' },
  { type: 'Model weight loading',           protocol: 'RDMA or GDS',                        pattern: 'Rare, very large (35\u2013140 GB)', latencySensitivity: 'Low (startup only)',        bandwidth: 'Very high burst' },
  { type: 'Gradient sync (if training)',     protocol: 'RDMA',                               pattern: 'Continuous, large',               latencySensitivity: 'Very high',                  bandwidth: 'Very high' },
  { type: 'Health checks / control plane',   protocol: 'TCP/IP',                             pattern: 'Continuous, tiny',                latencySensitivity: 'Low',                        bandwidth: 'Negligible' },
];

// Page 1: Interactive protocol rings (concentric distance rings)
export const PROTOCOL_RINGS = [
  {
    id: 'nvlink',
    label: 'NVLink 6',
    bandwidth: '3.6 TB/s per GPU',
    latency: 'ns',
    distance: 'Within scale-up domain',
    color: 'var(--color-primary)',
    bgColor: 'var(--color-primary-bg)',
    ringSize: 110, // center
    description: 'Intra-domain GPU-to-GPU. Memory-semantic speed. NVSwitch all-to-all fabric.',
  },
  {
    id: 'cxl',
    label: 'CXL 2.0',
    bandwidth: '64 GB/s',
    latency: '<100 ns',
    distance: 'Intra-rack',
    color: 'var(--color-teal)',
    bgColor: 'var(--color-teal-bg)',
    ringSize: 170,
    description: 'Load/store semantics to pooled DRAM. CPU or GPU via PCIe. Rack-level reach.',
  },
  {
    id: 'rdma',
    label: 'RDMA (IB/RoCEv2)',
    bandwidth: '50 GB/s',
    latency: '1\u201310 \u00b5s',
    distance: 'Inter-domain, inter-pod',
    color: 'var(--color-blue)',
    bgColor: 'var(--color-blue-bg)',
    ringSize: 240,
    description: 'Node-to-node GPU HBM transfers via GPUDirect. Spectrum-X or Quantum-X800.',
  },
  {
    id: 'nvme',
    label: 'NVMe/RoCE',
    bandwidth: '14\u2013100+ GB/s',
    latency: '10\u2013100 \u00b5s',
    distance: 'Multi-rack',
    color: 'var(--color-text-muted)',
    bgColor: 'var(--color-surface-muted)',
    ringSize: 320,
    description: 'Reach to remote flash tiers. ICMS, G3.5, G4 storage access over RDMA.',
  },
];

// Page 3: RDMA animation frames (Prefill GPU -> Decode GPU via GPUDirect)
export const RDMA_ANIMATION_STEPS = [
  { id: 'prefill-hbm',  label: 'Prefill GPU HBM',  sub: 'KV blocks committed', color: 'var(--color-primary)' },
  { id: 'gpudirect-tx', label: 'GPUDirect RDMA',    sub: 'NIC reads HBM, no CPU', color: 'var(--color-text)' },
  { id: 'nic-tx',       label: 'ConnectX NIC',       sub: 'RDMA WRITE posted', color: 'var(--color-blue)' },
  { id: 'fabric',       label: 'Fabric',             sub: 'IB or Ethernet (Spectrum-X)', color: 'var(--color-text-muted)' },
  { id: 'nic-rx',       label: 'ConnectX NIC',       sub: 'RDMA WRITE received', color: 'var(--color-blue)' },
  { id: 'gpudirect-rx', label: 'GPUDirect RDMA',    sub: 'NIC writes HBM, no CPU', color: 'var(--color-text)' },
  { id: 'decode-hbm',   label: 'Decode GPU HBM',     sub: 'Cache ready for decode', color: 'var(--color-teal)' },
];

// Page 6: Complete data path animation (8 steps, lifecycle)
export const COMPLETE_PATH_FRAMES = [
  {
    step: 1,
    title: 'Prefill (intra-node)',
    from: 'Embedding',
    to: 'Prefill GPU HBM',
    protocol: 'Internal to GPU',
    latency: '0 (compute)',
    color: 'var(--color-primary)',
    narrative: 'User 17\u2019s 28K-token prompt is tokenized, embedded, and processed by the prefill GPU. The KV cache materializes directly in HBM. No network involved.',
  },
  {
    step: 2,
    title: 'P/D transfer',
    from: 'Prefill GPU HBM',
    to: 'Decode GPU HBM',
    protocol: 'RDMA (RoCEv2) via GPUDirect',
    latency: '~90 ms',
    color: 'var(--color-blue)',
    narrative: '4.48 GB of FP8 KV cache flows from prefill node to decode node across Spectrum-X. NIC-to-NIC with GPUDirect RDMA \u2014 zero CPU involvement.',
  },
  {
    step: 3,
    title: 'Active decode',
    from: 'Decode GPU HBM',
    to: 'Decode GPU HBM',
    protocol: 'Internal to GPU',
    latency: 'ongoing',
    color: 'var(--color-teal)',
    narrative: 'The decode GPU reads the full 4.48 GB on every decode step and appends a few KB per new token. All local to HBM.',
  },
  {
    step: 4,
    title: 'Demotion to DRAM',
    from: 'Decode GPU HBM',
    to: 'CPU DRAM (G2)',
    protocol: 'PCIe Gen5 DMA',
    latency: '~70 ms',
    color: 'var(--color-amber)',
    narrative: 'User 17 pauses. KVBM demotes the cache to host DRAM across PCIe Gen5. Still in the same node \u2014 no network.',
  },
  {
    step: 5,
    title: 'Promotion to HBM',
    from: 'CPU DRAM (G2)',
    to: 'Decode GPU HBM',
    protocol: 'PCIe Gen5 DMA',
    latency: '~70 ms',
    color: 'var(--color-amber)',
    narrative: 'User 17 returns within minutes. KVBM promotes the cache back to HBM. Decode resumes instantly \u2014 no recomputation.',
  },
  {
    step: 6,
    title: 'Demotion to ICMS',
    from: 'CPU DRAM',
    to: 'ICMS flash (G3.5)',
    protocol: 'NVMe/RoCE',
    latency: '~90 ms',
    color: 'var(--color-blue)',
    narrative: 'Extended idle. KVBM evicts to ICMS across Spectrum-X. BlueField-4 DPU writes the aggregated chunks to remote NVMe.',
  },
  {
    step: 7,
    title: 'Promotion from ICMS',
    from: 'ICMS flash (G3.5)',
    to: 'Decode GPU HBM',
    protocol: 'NVMe/RoCE \u2192 GPUDirect',
    latency: '~90\u2013100 ms',
    color: 'var(--color-blue)',
    narrative: 'Next day, User 17 resumes. ICMS streams the cache chunks back via NVMe/RoCE, GPUDirect writes directly to HBM. ~90 ms vs. ~2,000 ms for recomputation.',
  },
  {
    step: 8,
    title: 'Archive to G4',
    from: 'ICMS',
    to: 'Network storage (Dell/VAST/WEKA/DDN)',
    protocol: 'RDMA or NVMe/RoCE or S3',
    latency: 'Async',
    color: 'var(--color-text-muted)',
    narrative: 'Conversation closes. The cache tiers out to deep network storage asynchronously. No user latency \u2014 this is background.',
  },
];

// Page 7: Traffic contention visual data
export const TRAFFIC_VISUAL = [
  { id: 'tp',        label: 'TP all-reduce',       color: 'var(--color-red)',       priority: 'critical',  size: 'small', freq: 'very high', note: 'TP>1 only' },
  { id: 'pd',        label: 'P/D KV transfer',     color: 'var(--color-blue)',      priority: 'high',      size: 'huge',  freq: 'bursty',    note: 'Dominates bandwidth' },
  { id: 'promo',     label: 'Cache promotion',     color: 'var(--color-teal)',       priority: 'high',      size: 'huge',  freq: 'bursty',    note: 'NVMe/RoCE' },
  { id: 'demote',    label: 'Cache demotion',      color: 'var(--color-amber)',     priority: 'low',       size: 'huge',  freq: 'occasional', note: 'Background' },
  { id: 'weights',   label: 'Model weights',       color: 'var(--color-amber)',     priority: 'low',       size: 'massive', freq: 'rare',    note: 'Startup only' },
  { id: 'control',   label: 'Control / health',     color: 'var(--color-text-muted)', priority: 'low',     size: 'tiny',  freq: 'continuous', note: 'Negligible BW' },
];

// Page 8: Summary table
export const SUMMARY_TABLE = [
  { protocol: 'NVLink',            distance: 'Intra-domain',  bandwidth: '3.6 TB/s per GPU (NVLink 6)', latency: 'ns',         role: 'TP all-reduce, intra-domain P/D',  maturity: 'Production' },
  { protocol: 'RDMA (IB/RoCEv2)',  distance: 'Inter-domain',  bandwidth: '50\u2013100 GB/s',             latency: '1\u201310 \u00b5s', role: 'P/D transfer, ICMS, cache sharing', maturity: 'Production' },
  { protocol: 'CXL',               distance: 'Intra-rack',    bandwidth: '64\u2013128 GB/s',             latency: '<100 ns',    role: 'Pooled memory, shared KV cache',   maturity: 'Early production (2025\u20132026)' },
  { protocol: 'NVMe-oF',           distance: 'Multi-rack',    bandwidth: '14\u2013100+ GB/s',            latency: '10\u2013100 \u00b5s', role: 'G3/G3.5/G4 storage access',  maturity: 'Production' },
];
