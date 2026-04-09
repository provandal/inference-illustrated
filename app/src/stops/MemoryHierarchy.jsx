import { useState, useCallback, useEffect } from 'react';
import {
  PAGES,
  TIERING_COMPARISON,
  MEMORY_TIERS,
  INTERCONNECT_TABLE,
  MIGRATION_FRAMES,
  RETRIEVAL_PATHS,
  BLOCK_LIFECYCLE,
  STORAGE_REQUIREMENTS,
  BLOCK_SIZE_TABLE,
  BLOCKING_TABLE,
  CACHE_HIT_VS_MISS,
  WITHOUT_TIERING,
  WITH_TIERING,
  TIER_SUMMARY,
} from '../data/stop13Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Narration text for each page ---

const NARRATIONS = {
  framing:
    '<strong>Stop 13: The Memory Hierarchy &mdash; Where the Cache Lives.</strong> In our scenario, 32 users on 8x H100 GPUs with Llama-3 70B at FP4. At steady state (8K tokens average), the KV cache fits comfortably in HBM. But when 5 users simultaneously upload large documents (32K tokens each), cache demand spikes to 50 GB on a single GPU &mdash; more than the 45 GB available after weights. In Stop 11, we saw three options: preempt, queue, or offload. This stop is about that third option &mdash; and it is the option that turns the KV cache into a tiered storage problem.',

  'five-tiers':
    'NVIDIA formalized the KV cache memory hierarchy into five tiers, labeled G1 through G4 (with G3.5 added at CES 2026). Each tier offers more capacity at higher latency. Here are the concrete numbers for our 8x H100 cluster.',

  'data-movement':
    'The tiers don&rsquo;t just exist &mdash; data moves between them. Let&rsquo;s trace User 17&rsquo;s KV cache through a 30-minute session with full mechanical detail: what triggers each move, what moves, how it moves, and what else is happening while the move is in progress.',

  kvbm:
    'The orchestrator behind all this data movement is the <strong>Dynamo KV Block Manager (KVBM)</strong>. If you&rsquo;ve worked with storage controllers, volume managers, or caching layers, the KVBM will feel familiar &mdash; it is a block-level memory manager with tiering policies, lifecycle tracking, and a storage-agnostic backend API.',

  'storage-io':
    'If you are building or evaluating a storage system for KV cache (the G3, G3.5, or G4 tier), here is what the I/O workload looks like. This section translates inference behavior into storage engineering requirements.',

  'cache-sharing':
    'Here is the detail that matters most for networking professionals: when KV cache lives in a shared tier (G3.5/ICMS or G4), <strong>any GPU in the pod can read any conversation&rsquo;s cache</strong>. This breaks the one-GPU-one-cache binding from Stop 11 and creates entirely new possibilities &mdash; and entirely new network demands.',

  blocking:
    'One of the most important questions for infrastructure engineers: when a user&rsquo;s KV cache is not in HBM, what happens to their request? Does the system block? Does it process other work while waiting?',

  competition:
    'NVIDIA&rsquo;s Dynamo/KVBM/NIXL/CMX stack is the most mature KV cache tiering solution as of early 2026. But it is not the only approach. Here is where the competition stands &mdash; because your infrastructure decisions may involve AMD, open-source alternatives, or vendor-specific storage integrations.',

  economics:
    'The economic case for KV cache tiering comes down to a single metric: <strong>cache hit rate</strong> &mdash; how often a request can reuse existing cached KV data instead of recomputing from scratch. According to Manus AI, &ldquo;KV cache hit rate is the most important metric for agentic AI systems because a KV cache miss costs ten times more than a cache hit.&rdquo;',

  calculator:
    'Let&rsquo;s calculate the total cache capacity and cost across all tiers for our scenario &mdash; and see how tiering changes the number of concurrent users we can serve.',

  summary:
    'The KV cache memory hierarchy transforms inference from a single-tier problem into a multi-tier optimization problem &mdash; the same kind of problem storage engineers solve every day, applied to a new data type.',
};

// --- Page Content Components ---

function FramingPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>A problem you already know</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            If you have worked with storage systems, you have built tiered architectures
            before: SSD for hot data, HDD for warm, tape or object storage for cold.
            The same pattern applies here &mdash; but the tiers are different, the data
            is ephemeral, and the latency requirements are measured in microseconds,
            not milliseconds.
          </p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Traditional storage tiering vs. KV cache tiering</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left"></th>
                <th className="px-4 py-2 text-left">Traditional Storage</th>
                <th className="px-4 py-2 text-left">KV Cache</th>
              </tr>
            </thead>
            <tbody>
              {TIERING_COMPARISON.map((row) => (
                <tr
                  key={row.aspect}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">
                    {row.aspect}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                    {row.traditional}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                    {row.kvCache}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="note"
        message='<strong>The last row is the key difference.</strong> In traditional storage, losing data is catastrophic. KV cache is ephemeral &mdash; it can always be reconstructed by re-running the prompt through the model (prefill). This means cache tiering is a <strong>latency optimization</strong>, not a durability requirement. The question is not "will I lose data?" &mdash; it is "how long does it take to get the data back?"'
      />
    </div>
  );
}

function FiveTiersPage() {
  const [expandedTier, setExpandedTier] = useState(null);

  return (
    <div>
      {/* Tier bars */}
      <Panel>
        <PanelHeader>The five-tier KV cache hierarchy</PanelHeader>
        <div className="p-4 space-y-2">
          {MEMORY_TIERS.map((tier) => {
            const isExpanded = expandedTier === tier.id;
            return (
              <div key={tier.id}>
                <button
                  onClick={() => setExpandedTier(isExpanded ? null : tier.id)}
                  className="w-full text-left cursor-pointer"
                >
                  <div
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors"
                    style={{
                      borderColor: isExpanded ? tier.color : 'var(--color-border-light)',
                      background: isExpanded ? 'var(--color-surface-muted)' : 'transparent',
                    }}
                  >
                    <div
                      className="flex-shrink-0 w-3 h-3 rounded-sm"
                      style={{ background: tier.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium text-[var(--color-text)]">
                        {tier.label}
                      </span>
                      <span className="ml-2 text-[12px] text-[var(--color-text-muted)]">
                        {tier.latency} &middot; {tier.costPerGB}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {isExpanded ? '\u25B2' : '\u25BC'}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="ml-6 mt-1 mb-2 p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-[12px] space-y-1.5 text-[var(--color-text-secondary)]">
                    <div><strong className="text-[var(--color-text)]">Capacity:</strong> {tier.capacity}</div>
                    <div><strong className="text-[var(--color-text)]">Bandwidth:</strong> {tier.bandwidth}</div>
                    <div><strong className="text-[var(--color-text)]">Interconnect:</strong> {tier.interconnect}</div>
                    <div><strong className="text-[var(--color-text)]">Role:</strong> {tier.role}</div>
                    <div className="pt-1 border-t border-[var(--color-border-light)]">
                      <strong className="text-[var(--color-text)]">In our scenario:</strong> {tier.scenario}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Interconnect summary */}
      <Panel className="mt-4">
        <PanelHeader>Interconnect summary</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Tier Transition</th>
                <th className="px-4 py-2 text-left">Interconnect</th>
                <th className="px-4 py-2 text-left">Bandwidth</th>
                <th className="px-4 py-2 text-left">Initiator</th>
              </tr>
            </thead>
            <tbody>
              {INTERCONNECT_TABLE.map((row) => (
                <tr
                  key={row.transition}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-mono text-[12px] text-[var(--color-text)]">
                    {row.transition}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                    {row.interconnect}
                  </td>
                  <td className="px-4 py-2 font-mono text-[12px] text-[var(--color-text)]">
                    {row.bandwidth}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                    {row.initiator}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>G3.5 is the networking breakthrough.</strong> ICMS/CMX uses Spectrum-X Ethernet with RDMA between compute nodes and ICMS enclosures &mdash; NOT NVLink (which connects GPUs within a single server) and NOT InfiniBand (though NIXL abstracts across both). The BlueField-4 DPU provides hardware-accelerated KV I/O on the ICMS side. Announced at CES 2026, updated at GTC 2026."
      />
    </div>
  );
}

function DataMovementPage() {
  const [activeFrame, setActiveFrame] = useState(0);
  const frame = MIGRATION_FRAMES[activeFrame];

  return (
    <div>
      {/* Frame selector */}
      <Panel>
        <PanelHeader>User 17&rsquo;s cache migration &mdash; 30-minute session</PanelHeader>
        <div className="p-4">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {MIGRATION_FRAMES.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveFrame(i)}
                className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors cursor-pointer ${
                  i === activeFrame
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border-light)] hover:border-[var(--color-border)]'
                }`}
              >
                {f.time}
              </button>
            ))}
          </div>

          {/* Active frame detail */}
          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[13px] font-medium text-[var(--color-text)]">
                {frame.title}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]">
                {frame.tier}
              </span>
              <span className="ml-auto text-[12px] font-mono text-[var(--color-text-muted)]">
                {frame.cacheSize}
              </span>
            </div>
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              {frame.description}
            </p>
          </div>
        </div>
      </Panel>

      {/* Retrieval path comparison */}
      <Panel className="mt-4">
        <PanelHeader>Retrieval path comparison</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Retrieval Path</th>
                <th className="px-4 py-2 text-right">Latency</th>
                <th className="px-4 py-2 text-left">GPU Compute Used</th>
              </tr>
            </thead>
            <tbody>
              {RETRIEVAL_PATHS.map((row) => (
                <tr
                  key={row.path}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.path.includes('miss') ? 'bg-[var(--color-red-bg)]' : ''
                  }`}
                >
                  <td className="px-4 py-2 text-[var(--color-text)]">{row.path}</td>
                  <td className="px-4 py-2 text-right font-mono text-[12px] text-[var(--color-text)]">
                    {row.latency}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                    {row.gpuCompute}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>Every tiered retrieval uses zero GPU compute &mdash; it is pure data movement.</strong> A cache miss consumes full GPU compute for prefill, blocking other users&rsquo; token generation. This is the fundamental economic advantage of cache tiering."
      />

      <Callout
        type="note"
        message="<strong>An insight for infrastructure architects: layer-aware partial eviction.</strong> You don&rsquo;t have to evict ALL of a conversation&rsquo;s cache to the same tier. Early layers (1&ndash;20) could stay in G1 while later layers (21&ndash;80) are demoted to G2. When decode resumes, layers 1&ndash;20 are immediately available. The GPU begins processing the token through early layers while later layers are promoted in parallel. The KVBM architecture supports this &mdash; it manages blocks at layer granularity. This approach is in active research and early implementation as of 2026. <strong>Important caveat:</strong> during ACTIVE decode, the full cache for ALL layers must be in G1 (HBM). Layer-aware partial eviction applies to IDLE conversations only."
      />
    </div>
  );
}

function KvbmPage() {
  return (
    <div>
      {/* Three-layer architecture */}
      <Panel>
        <PanelHeader>KVBM architecture &mdash; three layers</PanelHeader>
        <div className="p-4 space-y-2">
          {[
            {
              num: '1',
              label: 'Model Integration',
              text: 'Connects inference engines (vLLM, TensorRT-LLM, SGLang) to the KVBM. The inference engine does not manage cache placement \u2014 it just calls get_mutable_block() when it needs a cache block, and the KVBM handles where that block lives and how it gets there.',
            },
            {
              num: '2',
              label: 'Memory Management',
              text: 'The core. Manages block pools across all tiers (G1\u2013G4). Each KV block is a 2D array: [num_layers] x [page_size x inner_dim]. The page_size is configurable (typically 16 tokens per page). Each block holds K,V for 16 tokens across all layers.',
            },
            {
              num: '3',
              label: 'Storage and Data Transfer (NIXL)',
              text: 'Connects KVBM to all storage backends through a unified API. NIXL supports: NVLink, PCIe, InfiniBand, Spectrum-X RDMA, GPUDirect Storage (GDS), and S3/Azure Blob. It selects the optimal transport automatically based on the source and destination tiers.',
            },
          ].map((layer) => (
            <div
              key={layer.num}
              className="flex gap-3 items-start p-2.5 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {layer.num}
              </span>
              <div className="min-w-0 text-[13px]">
                <div className="font-medium text-[var(--color-text)]">{layer.label}</div>
                <div className="text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                  {layer.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Block lifecycle */}
      <Panel className="mt-4">
        <PanelHeader>Block lifecycle state machine</PanelHeader>
        <div className="p-4">
          <div className="text-center text-[12px] font-mono text-[var(--color-text)] mb-3 p-2 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
            Inactive &rarr; Mutable &rarr; Committed &rarr; Evictable &rarr; Inactive
          </div>
          <div className="space-y-1.5">
            {BLOCK_LIFECYCLE.map((state) => (
              <div key={state.state} className="flex gap-2 items-start text-[13px]">
                <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] min-w-[72px] text-center">
                  {state.state}
                </span>
                <span className="text-[var(--color-text-secondary)] leading-relaxed">
                  {state.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Callout
        type="note"
        message='<strong>When are blocks mutable during decode?</strong> During active decode, each new token appends K,V to the cache. The NEWEST page (the one being filled with the latest tokens) is in Mutable state. All previous pages (full, 16 tokens each) are in Committed state. This means only ONE page per conversation per layer is mutable at any time &mdash; the rest are immutable and could theoretically be demoted even during active decode (though in practice, the full cache is kept in G1 during active generation). When a conversation goes idle, ALL pages transition to Committed, then to Evictable after the idle threshold.'
      />

      <Callout
        type="note"
        message='<strong>Why "block" and not "file" or "object"?</strong> The KVBM&rsquo;s API is block-level: get() and put() on fixed-size blocks identified by coordinates (conversation_id, layer_range, token_range). Files carry filesystem overhead that KV cache does not need. Object stores add HTTP/REST overhead and are optimized for large, immutable blobs. KV blocks are small (~5.2 MB per block for Llama-3 70B), mutable during decode, and accessed with strict latency requirements. Block-level fits: fixed-size, addressable by coordinates, accessed via get/put, allocated from pools, freed back to pools.'
      />

      <InfoBox>
        NIXL transfers are <strong>asynchronous</strong> (don&rsquo;t block inference),{' '}
        <strong>non-contiguous</strong> (can transfer scattered PagedAttention pages without
        first gathering them), <strong>layer-parallel</strong> (layers transfer in parallel
        across multiple DMA channels), and <strong>overlap-capable</strong> (the Scheduler
        releases blocks to the inference engine layer-by-layer as they arrive).
      </InfoBox>
    </div>
  );
}

function StorageIOPage() {
  const [customKvHeads, setCustomKvHeads] = useState(8);
  const [customDHead, setCustomDHead] = useState(128);
  const [customLayers, setCustomLayers] = useState(80);
  const [customPageSize, setCustomPageSize] = useState(16);
  const [customPrecision, setCustomPrecision] = useState(2);

  const perLayerPerPage = customKvHeads * customDHead * 2 * customPrecision * customPageSize;
  const fullBlockSize = perLayerPerPage * customLayers;

  function formatBytes(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  return (
    <div>
      {/* I/O patterns */}
      <Panel>
        <PanelHeader>I/O workload characteristics</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <div>
            <strong className="text-[var(--color-text)]">Write pattern (demotion):</strong>{' '}
            Batch of KV blocks, not individual tokens. An 8,000-token conversation at 16 tokens
            per page = 500 pages. Each page is ~5.2 MB (Llama-3 70B with GQA). Total write: ~2.6 GB.
            Writes are sequential but source pages may be scattered (PagedAttention). Writes are{' '}
            <strong className="text-[var(--color-text)]">not latency-critical</strong> &mdash; the
            conversation is already idle. Throughput matters more than latency.
          </div>
          <div>
            <strong className="text-[var(--color-text)]">Read pattern (promotion):</strong>{' '}
            Full conversation&rsquo;s cache &mdash; all pages, all layers. Same ~2.6 GB for 8K tokens.
            The read IS <strong className="text-[var(--color-text)]">latency-critical</strong>: the
            user is waiting for their first token. With layer-parallel promotion, the system reads
            layers in parallel and feeds them to the GPU as they arrive &mdash; more like a streaming
            read than a single large I/O.
          </div>
          <div>
            <strong className="text-[var(--color-text)]">Concurrency:</strong>{' '}
            Normal load: 1&ndash;5 concurrent demotions or promotions. Burst (post-lunch return):
            20&ndash;30 simultaneous promotions across 8 GPUs.
          </div>
        </div>
      </Panel>

      {/* Sizing rule of thumb (Patch 4 applied) */}
      <Panel className="mt-4">
        <PanelHeader>Sizing rule of thumb (our scenario)</PanelHeader>
        <div className="p-4 space-y-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <div className="flex gap-2 items-start">
            <span className="flex-shrink-0 font-mono text-[var(--color-text)] min-w-[180px] text-right">Peak cache volume:</span>
            <span>32 x 2.5 GB = <strong className="text-[var(--color-text)]">80 GB</strong></span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="flex-shrink-0 font-mono text-[var(--color-text)] min-w-[180px] text-right">Peak demotion write:</span>
            <span>30 conversations x 2.5 GB / 10 sec = <strong className="text-[var(--color-text)]">7.5 GB/s</strong></span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="flex-shrink-0 font-mono text-[var(--color-text)] min-w-[180px] text-right">Peak promotion read:</span>
            <span>30 x 2.5 GB each, target &lt; 200 ms per conversation. Each needs 2.5 / 0.2 = 12.5 GB/s. Aggregate: 30 x 12.5 = <strong className="text-[var(--color-text)]">375 GB/s</strong>. This is why WEKA demonstrated 270+ GB/s on 8 GPUs &mdash; the promotion burst during post-break user return is the peak bandwidth demand that sizes the storage system.</span>
          </div>
        </div>
      </Panel>

      {/* Optimal storage characteristics */}
      <Panel className="mt-4">
        <PanelHeader>Optimal storage characteristics</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Requirement</th>
                <th className="px-3 py-2 text-left">Why</th>
                <th className="px-3 py-2 text-left">Storage Implication</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE_REQUIREMENTS.map((row) => (
                <tr
                  key={row.requirement}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">
                    {row.requirement}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.why}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.implication}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Block size table (Patch 3) */}
      <Panel className="mt-4">
        <PanelHeader>KV cache block sizes across models (FP16, page_size = 16)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Model</th>
                <th className="px-3 py-2 text-right">KV Heads</th>
                <th className="px-3 py-2 text-right">d_head</th>
                <th className="px-3 py-2 text-right">Layers</th>
                <th className="px-3 py-2 text-right">Per-layer/page</th>
                <th className="px-3 py-2 text-right">Block Size</th>
              </tr>
            </thead>
            <tbody>
              {BLOCK_SIZE_TABLE.map((row) => (
                <tr
                  key={row.model}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">{row.model}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.kvHeads}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.dHead}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.layers}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text)]">{row.perLayerPerPage}</td>
                  <td className="px-3 py-2 text-right font-mono font-medium text-[var(--color-text)]">{row.blockSize}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <InfoBox>
          At FP8 (1 byte per number): all values halve. Llama-3 70B: 2.56 MB per block.
          At INT4 (0.5 bytes): all values quarter. Llama-3 70B: 1.28 MB per block.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message="<strong>Key observation:</strong> The per-layer-per-page contribution (64 KB for GQA-8 models) is identical across Llama-3 8B, 70B, and 405B. The block size difference comes entirely from the number of layers (32 vs 80 vs 126). This mirrors the KV cache per-token finding from Stop 8: bigger models have bigger caches because of depth, not wider heads. <strong>DeepSeek-V3 (MLA)</strong> is notably different: its Multi-Head Latent Attention compresses K,V into a smaller latent space, producing blocks roughly 2.5x smaller &mdash; the compression approach we will explore in Stop 14."
      />

      {/* Block size calculator */}
      <Panel className="mt-4">
        <PanelHeader>Block size calculator</PanelHeader>
        <div className="p-4">
          <div className="text-[12px] font-mono text-[var(--color-text-muted)] mb-3">
            KV_heads &times; d_head &times; 2 (K+V) &times; bytes_per_number &times; page_size &times; num_layers
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
            <div>
              <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">KV Heads</label>
              <input
                type="number"
                value={customKvHeads}
                onChange={(e) => setCustomKvHeads(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-2 py-1.5 text-[13px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">d_head</label>
              <input
                type="number"
                value={customDHead}
                onChange={(e) => setCustomDHead(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-2 py-1.5 text-[13px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">Layers</label>
              <input
                type="number"
                value={customLayers}
                onChange={(e) => setCustomLayers(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-2 py-1.5 text-[13px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">Page Size</label>
              <input
                type="number"
                value={customPageSize}
                onChange={(e) => setCustomPageSize(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-2 py-1.5 text-[13px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">Precision</label>
              <select
                value={customPrecision}
                onChange={(e) => setCustomPrecision(parseFloat(e.target.value))}
                className="w-full px-2 py-1.5 text-[13px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
              >
                <option value={2}>FP16 (2 bytes)</option>
                <option value={1}>FP8 (1 byte)</option>
                <option value={0.5}>INT4 (0.5 bytes)</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-[13px]">
            <div>
              <span className="text-[var(--color-text-muted)]">Per-layer per page: </span>
              <strong className="text-[var(--color-text)] font-mono">{formatBytes(perLayerPerPage)}</strong>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)]">Full block size: </span>
              <strong className="text-[var(--color-text)] font-mono">{formatBytes(fullBlockSize)}</strong>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)]">Blocks per GB: </span>
              <strong className="text-[var(--color-text)] font-mono">
                {fullBlockSize > 0 ? Math.floor((1024 * 1024 * 1024) / fullBlockSize).toLocaleString() : '\u2014'}
              </strong>
            </div>
          </div>
        </div>
      </Panel>

      {/* Patch 2: Local SSD vs. ICMS note */}
      <Callout
        type="note"
        message="<strong>A note on local SSD vs. ICMS performance.</strong> The generic bandwidth numbers (14 GB/s per NVMe drive vs. 50 GB/s RDMA) suggest ICMS is always faster for promotion. In practice, the comparison is more nuanced. <strong>Optimized local SSD solutions</strong> can aggregate multiple drives and use GPUDirect Storage (GDS) to bypass the CPU entirely &mdash; WEKA&rsquo;s Augmented Memory Grid demonstrates 270+ GB/s aggregate read throughput on 8x H100, and Dell&rsquo;s Lightning platform targets similar high-throughput local flash. <strong>ICMS/CMX adds value beyond raw bandwidth:</strong> the cache becomes pod-shared (any GPU can access any cache), enabling workload migration and prefix deduplication that local SSD cannot provide. The right comparison is optimized local SSD (per-server, private) vs. ICMS (pod-level, shared). Each has use cases."
      />
    </div>
  );
}

function CacheSharingPage() {
  return (
    <div>
      {/* Without vs. with shared cache */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader>Without shared cache (Stop 11&ndash;12 model)</PanelHeader>
          <div className="p-4 space-y-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            <p>
              User 17&rsquo;s cache lives on Decode GPU 3. Only GPU 3 can serve User 17.
            </p>
            <p>
              If GPU 3 is overloaded and GPU 5 has spare capacity, User 17 cannot
              be moved without recomputing the entire cache.
            </p>
            <p>
              If GPU 3 fails, User 17&rsquo;s cache is lost. Full recomputation required.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader>With shared cache (ICMS / G3.5)</PanelHeader>
          <div className="p-4 space-y-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            <p>
              User 17&rsquo;s cache is in ICMS, accessible by <strong className="text-[var(--color-text)]">any GPU</strong> in the pod.
            </p>
            <p>
              If GPU 3 is overloaded, the Smart Router can direct User 17&rsquo;s next
              request to GPU 5, which pulls the cache from ICMS. No recomputation.
            </p>
            <p>
              If GPU 3 fails, the cache survives in ICMS. Any GPU picks up the conversation.
            </p>
            <p>
              System prompts and shared prefixes are stored <strong className="text-[var(--color-text)]">once</strong>{' '}
              in ICMS and served to all GPUs on demand.
            </p>
          </div>
        </Panel>
      </div>

      {/* Network demand */}
      <Panel className="mt-4">
        <PanelHeader>Network demand for cache sharing</PanelHeader>
        <div className="p-4 space-y-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            When GPU 5 needs to pull User 17&rsquo;s cache from ICMS:
          </p>
          <div className="space-y-1 pl-4 font-mono text-[12px] text-[var(--color-text)]">
            <div>8K-token cache: &nbsp; 2.5 GB at 50 GB/s Spectrum-X RDMA = ~50 ms</div>
            <div>32K-token cache: 10 GB at 50 GB/s = ~200 ms</div>
          </div>
          <p>
            This transfer happens on the Spectrum-X Ethernet fabric between compute
            nodes and ICMS enclosures &mdash; NOT on NVLink (which only connects GPUs
            within a node) and NOT on the PCIe bus (which connects GPU to local CPU/SSD).
          </p>
        </div>
      </Panel>

      {/* Network path */}
      <Panel className="mt-4">
        <PanelHeader>The network path for ICMS access</PanelHeader>
        <div className="p-4">
          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] font-mono text-[12px] text-[var(--color-text)] text-center space-y-1">
            <div>GPU (G1) &rarr; ConnectX SuperNIC &rarr; Spectrum-X Switch &rarr; BlueField-4 DPU &rarr; NVMe Flash (ICMS)</div>
            <div className="text-[var(--color-text-muted)]">Same path in reverse for reads &larr;</div>
          </div>
          <div className="mt-3 space-y-1.5 text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
            <div><strong className="text-[var(--color-text)]">GPU</strong> initiates the transfer via NIXL</div>
            <div><strong className="text-[var(--color-text)]">ConnectX SuperNIC</strong> handles the RDMA protocol</div>
            <div><strong className="text-[var(--color-text)]">Spectrum-X</strong> provides the lossless, low-jitter Ethernet fabric</div>
            <div><strong className="text-[var(--color-text)]">BlueField-4 DPU</strong> terminates the RDMA and handles KV I/O on the ICMS side &mdash; hardware-accelerated data plane, not software on a general-purpose CPU</div>
          </div>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>What else is on the Spectrum-X fabric?</strong> Not just KV cache transfers. The same fabric carries: disaggregated P/D transfers (Stop 12), gradient synchronization (for training workloads sharing the cluster), and inter-node tensor parallelism communication. KV cache transfers must coexist with these other traffic types. Spectrum-X&rsquo;s congestion control and QoS features (Stop 15) ensure that cache transfers do not starve latency-sensitive decode traffic."
      />
    </div>
  );
}

function BlockingPage() {
  return (
    <div>
      {/* Step-by-step scenario */}
      <Panel>
        <PanelHeader>Scenario: User 17 sends a follow-up. Cache is in G2 (DRAM).</PanelHeader>
        <div className="p-4 space-y-2">
          {[
            {
              num: '1',
              label: 'Request arrives at Smart Router.',
              text: 'Router checks KVBM\u2019s index: "User 17\u2019s cache is on Server 2, in G2 (DRAM), Decode GPU 3." Router sends request to Decode GPU 3. Non-blocking \u2014 router immediately available for other requests.',
              blocking: 'Non-blocking',
            },
            {
              num: '2',
              label: 'KVBM initiates promotion.',
              text: 'G2 \u2192 G1 transfer begins via PCIe DMA. Decode GPU 3 continues generating tokens for Users 13\u201316 in the continuous batch. The DMA transfer uses a separate memory channel.',
              blocking: 'Non-blocking for other users',
            },
            {
              num: '3',
              label: 'User 17\u2019s new tokens begin incremental prefill.',
              text: 'The Scheduler coordinates: as each layer\u2019s cache arrives in G1, that layer becomes available for the new tokens\u2019 attention computation. The prefill proceeds layer-by-layer, overlapping with the ongoing promotion.',
              blocking: 'Partially blocking for User 17',
            },
            {
              num: '4',
              label: 'Promotion completes.',
              text: 'All of User 17\u2019s cache is now in G1. User 17 joins the continuous batch for decode. From this point, User 17 gets tokens at the same rate as everyone else.',
              blocking: 'Fully active',
            },
          ].map((step) => (
            <div
              key={step.num}
              className="flex gap-3 items-start p-2.5 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {step.num}
              </span>
              <div className="min-w-0 text-[13px]">
                <div className="font-medium text-[var(--color-text)]">
                  {step.label}
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-blue-bg)] border border-[var(--color-blue)] text-[var(--color-blue-text)]">
                    {step.blocking}
                  </span>
                </div>
                <div className="text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                  {step.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* What-blocks-what summary */}
      <Panel className="mt-4">
        <PanelHeader>What blocks what?</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Event</th>
                <th className="px-3 py-2 text-left">User 17</th>
                <th className="px-3 py-2 text-left">Other Users (Same GPU)</th>
                <th className="px-3 py-2 text-left">Prefill Pool</th>
              </tr>
            </thead>
            <tbody>
              {BLOCKING_TABLE.map((row) => (
                <tr
                  key={row.event}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.event.includes('miss') ? 'bg-[var(--color-red-bg)]' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">{row.event}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.user17}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.otherUsers}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.prefillPool}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <InfoBox>
        <strong className="text-[var(--color-text)]">What if the cache is in G3 (SSD) or G3.5 (ICMS)?</strong>{' '}
        Same flow, but the initial transfer takes longer (500&ndash;800 ms for SSD, ~200 ms for ICMS).
        During this time, other users&rsquo; decode continues normally. The longer transfer means
        User 17 sees a longer TTFT, but no other user is affected.
      </InfoBox>

      <Callout
        type="warn"
        message="<strong>A full cache miss is the worst case.</strong> User 17&rsquo;s request is treated as a new conversation. Full prefill runs from scratch: all prompt tokens through all 80 layers. Cost: ~2,000 ms of GPU compute. The prefill GPU is fully occupied and cannot process other prefill requests. This is why maximizing cache hit rate is the central economic metric."
      />
    </div>
  );
}

function CompetitionPage() {
  return (
    <div>
      {/* NVIDIA */}
      <Panel>
        <PanelHeader>NVIDIA (Dynamo + KVBM + NIXL + CMX/ICMS)</PanelHeader>
        <div className="p-4 space-y-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Most complete stack: disaggregated serving, KV-aware routing,
            multi-tier cache management, hardware-accelerated ICMS. BlueField-4 DPU
            provides dedicated KV I/O plane. Tightly integrated with Spectrum-X networking.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Storage partners:</strong>{' '}
            VAST, WEKA, DDN, Dell, NetApp, Cohesion, Hammerspace, Pliops.
          </p>
          <p className="text-[12px] text-[var(--color-text-muted)]">
            Status: Dynamo GA, KVBM V2 in production, ICMS/CMX shipping with Rubin platform.
          </p>
        </div>
      </Panel>

      {/* AMD */}
      <Panel className="mt-4">
        <PanelHeader>AMD (ROCm 7.0 + vLLM)</PanelHeader>
        <div className="p-4 space-y-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            ROCm 7.0 announced distributed inference support (prefill/decode separation)
            at Advancing AI 2025. MI300X/MI325X/MI355X offer competitive single-node
            inference performance, especially memory-bandwidth-per-dollar.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Gap:</strong>{' '}
            No equivalent to ICMS, BlueField-4, or the Spectrum-X KV cache data path.
            Currently lacks native KV cache tiering to SSD/storage, smart routing,
            or production-grade equivalent to Dynamo&rsquo;s KVBM. Relies on community
            projects (vLLM, SGLang) for inference serving. Helios / MI450X expected 2H 2026
            but KV cache infrastructure details not yet public.
          </p>
        </div>
      </Panel>

      {/* Open-source */}
      <Panel className="mt-4">
        <PanelHeader>Open-source / vendor-neutral</PanelHeader>
        <div className="p-4 space-y-2">
          {[
            {
              name: 'LMCache',
              desc: 'Open-source KV caching layer for vLLM. Offloads to CPU DRAM, local SSD, or remote storage. Integrates with Dynamo. Less sophisticated than KVBM but works on both NVIDIA and AMD GPUs.',
            },
            {
              name: 'Mooncake Transfer Engine',
              desc: 'High-performance zero-copy data transfer library. Now integrates as a NIXL backend plugin. Used by SGLang for KV cache transfer in their DeepSeek-R1 disaggregated serving deployment.',
            },
            {
              name: 'llm-d (Red Hat + Google + IBM + NVIDIA + CoreWeave)',
              desc: 'Kubernetes-native distributed inference framework. Uses NIXL for KV cache transfer. Vendor-neutral at the orchestration layer but currently leverages NVIDIA-specific acceleration for data movement.',
            },
          ].map((item) => (
            <div
              key={item.name}
              className="flex gap-3 items-start p-2.5 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-[13px]"
            >
              <div className="min-w-0">
                <div className="font-medium text-[var(--color-text)]">{item.name}</div>
                <div className="text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>The takeaway for infrastructure architects.</strong> NVIDIA&rsquo;s stack is the most integrated and performant, but it creates vendor lock-in through hardware dependencies (BlueField-4, Spectrum-X, ConnectX). Open-source alternatives (LMCache, Mooncake, llm-d) provide vendor-neutral functionality at the cost of some performance and integration depth. AMD is investing but is 12&ndash;18 months behind on KV cache infrastructure. Your choice depends on whether you are optimizing for: (a) maximum performance (NVIDIA end-to-end), (b) vendor flexibility (open-source stack on commodity hardware), or (c) cost (AMD GPUs with open-source software)."
      />
    </div>
  );
}

function EconomicsPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The 10x cost difference explained</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <div>
            <strong className="text-[var(--color-text)]">Cache hit (data found in a tier):</strong>{' '}
            Retrieve the cached K, V vectors from whatever tier they are in. Cost = transfer time.{' '}
            <strong className="text-[var(--color-text)]">Zero GPU compute consumed</strong> &mdash;
            the transfer is pure data movement over DMA or RDMA, handled by the NIC or DPU,
            not the GPU&rsquo;s compute cores.
          </div>
          <div>
            <strong className="text-[var(--color-text)]">Cache miss (data not found anywhere):</strong>{' '}
            Re-run the entire prompt through prefill. Cost = compute time for all prompt tokens
            through all layers. The prefill GPU is fully occupied during this time and cannot serve
            other prefill requests.
          </div>
        </div>
      </Panel>

      {/* Hit vs. miss table */}
      <Panel className="mt-4">
        <PanelHeader>Cost comparison &mdash; 28,000-token conversation</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left"></th>
                <th className="px-4 py-2 text-left">Cache Hit (from G3.5/ICMS)</th>
                <th className="px-4 py-2 text-left">Cache Miss</th>
              </tr>
            </thead>
            <tbody>
              {CACHE_HIT_VS_MISS.map((row) => (
                <tr
                  key={row.metric}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.metric}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.hit}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.miss}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Why this matters for agentic AI</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            AI agents maintain persistent context across many subtasks, tools, and reasoning steps.
            An agent might accumulate 100K+ tokens of context over a multi-step task. If that context
            is evicted and must be recomputed, the agent stalls for seconds &mdash; potentially causing
            cascading delays in a multi-agent workflow.
          </p>
          <p>
            This is why NVIDIA, WEKA, VAST, and others are investing heavily in KV cache
            infrastructure. <strong className="text-[var(--color-text)]">Context is becoming a first-class
            infrastructure resource</strong>, as fundamental to inference as model weights.
          </p>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>Compression multiplies every tier&rsquo;s effectiveness.</strong> Stop 14 covers compression techniques (GQA, MLA, quantization) that reduce the SIZE of the cache at each tier. Smaller cache = more entries per tier = higher effective capacity = higher hit rate = lower cost."
      />
    </div>
  );
}

function CalculatorPage() {
  return (
    <div>
      {/* Without tiering */}
      <Panel>
        <PanelHeader>Without tiering (HBM only)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left"></th>
                <th className="px-4 py-2 text-right">Per GPU</th>
                <th className="px-4 py-2 text-right">8 GPUs</th>
              </tr>
            </thead>
            <tbody>
              {WITHOUT_TIERING.map((row) => (
                <tr
                  key={row.metric}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 text-[var(--color-text)]">{row.metric}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.perGPU}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-text)]">{row.eightGPUs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* With tiering */}
      <Panel className="mt-4">
        <PanelHeader>With tiering (all tiers)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Tier</th>
                <th className="px-4 py-2 text-right">Capacity</th>
                <th className="px-4 py-2 text-right">Users at 8K</th>
                <th className="px-4 py-2 text-right">Latency</th>
                <th className="px-4 py-2 text-left">Retrieval Path</th>
              </tr>
            </thead>
            <tbody>
              {WITH_TIERING.map((row) => (
                <tr
                  key={row.tier}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.tier}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.capacity}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text)]">{row.usersAt8K}</td>
                  <td className="px-4 py-2 text-right font-mono text-[12px] text-[var(--color-text-secondary)]">{row.latency}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>Without tiering: 144 concurrent users maximum. With tiering: 144 ACTIVE (generating tokens) + thousands WARM (between turns, retrievable in &lt;200 ms) + tens of thousands ARCHIVED.</strong> The active user count does not change &mdash; you still need HBM for active decode. But the number of conversations you can MAINTAIN without recomputing grows from 144 to thousands."
      />
    </div>
  );
}

function SummaryPage() {
  return (
    <div>
      {/* Summary tier table */}
      <Panel>
        <PanelHeader>The five tiers at a glance</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Tier</th>
                <th className="px-4 py-2 text-right">Capacity</th>
                <th className="px-4 py-2 text-right">Latency</th>
                <th className="px-4 py-2 text-left">Interconnect</th>
                <th className="px-4 py-2 text-left">Role</th>
              </tr>
            </thead>
            <tbody>
              {TIER_SUMMARY.map((row) => (
                <tr
                  key={row.tier}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.tier}</td>
                  <td className="px-4 py-2 text-right font-mono text-[12px] text-[var(--color-text-secondary)]">{row.capacity}</td>
                  <td className="px-4 py-2 text-right font-mono text-[12px] text-[var(--color-text)]">{row.latency}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.interconnect}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Key takeaways */}
      <Panel className="mt-4">
        <PanelHeader>What this stop established</PanelHeader>
        <div className="p-4 space-y-2">
          {[
            'The KV cache can live at five tiers: GPU HBM, CPU DRAM, local NVMe, ICMS/CMX, and network storage.',
            'Each tier trades capacity for latency. All tiered retrieval uses zero GPU compute \u2014 only a cache miss requires full prefill.',
            'The KVBM orchestrates data movement across tiers with block-level granularity and lifecycle tracking.',
            'ICMS/CMX (G3.5) breaks the one-GPU-one-cache binding: any GPU can access any conversation\u2019s cache.',
            'For storage engineers: the I/O workload is sequential reads/writes of fixed-size blocks (~5 MB), latency-critical on reads, throughput-critical on writes.',
            'Cache hit rate is the central economic metric \u2014 a miss costs ~10x a hit.',
          ].map((point, i) => (
            <div key={i} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-[var(--color-text-secondary)] leading-relaxed">{point}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Bridge to Stop 14 */}
      <Panel className="mt-4">
        <PanelHeader>Bridge to Stop 14</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Tiering gives us more <strong className="text-[var(--color-text)]">capacity</strong> &mdash;
            places to put the cache. But what if we could make the cache itself{' '}
            <strong className="text-[var(--color-text)]">smaller</strong>? Our 28,000-token
            conversation takes 8.96 GB at FP16. At FP8: 4.48 GB. At INT4: 2.24 GB.
          </p>
          <p>
            Half the size means twice the users per tier, twice the cache hit rate,
            half the transfer time between tiers, half the network bandwidth consumed during
            promotion.
          </p>
          <p>
            GQA already reduced the cache by 8x compared to full MHA (Stop 8).
            DeepSeek&rsquo;s MLA compresses further by projecting K,V into a smaller latent space.
            Quantization shrinks each number&rsquo;s precision. Token eviction throws away the
            least important entries entirely.
          </p>
          <p>
            For our scenario, compressing from FP16 to FP8 would double our effective capacity
            at every tier &mdash; turning 144 active users into 288, and cutting every promotion
            transfer time in half. <strong className="text-[var(--color-text)]">Stop 14 explores how
            to make the cache as small as possible &mdash; and what accuracy you trade for each
            reduction.</strong>
          </p>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>From single-tier to multi-tier.</strong> The memory hierarchy transforms KV cache management from a single-pool allocation problem into a tiered storage optimization problem &mdash; the same kind of problem storage engineers solve every day, now applied to the most critical ephemeral data structure in modern AI inference."
      />
    </div>
  );
}

// --- Main Component ---

export default function MemoryHierarchy() {
  const [pageIndex, setPageIndex] = useState(0);
  const isDark = useStore((s) => s.darkMode);

  const page = PAGES[pageIndex];
  const narration = NARRATIONS[page.id] || '';

  // Page navigation
  const goToPage = useCallback((idx) => {
    setPageIndex(idx);
  }, []);

  const prevPage = useCallback(() => {
    goToPage(Math.max(0, pageIndex - 1));
  }, [pageIndex, goToPage]);

  const nextPage = useCallback(() => {
    goToPage(Math.min(PAGES.length - 1, pageIndex + 1));
  }, [pageIndex, goToPage]);

  // Keyboard: PageDown/PageUp or [ ] for pages
  useEffect(() => {
    function handleKey(e) {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'PageDown' || e.key === ']') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'PageUp' || e.key === '[') {
        e.preventDefault();
        prevPage();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nextPage, prevPage]);

  return (
    <div>
      {/* Narration — always at top */}
      <div
        className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed
                    px-4 py-3 bg-[var(--color-surface-muted)] rounded-lg
                    border border-[var(--color-border-light)] mb-5"
        dangerouslySetInnerHTML={{ __html: narration }}
      />

      {/* Page content */}
      <div className="min-h-[200px]">
        {page.id === 'framing' && <FramingPage />}
        {page.id === 'five-tiers' && <FiveTiersPage />}
        {page.id === 'data-movement' && <DataMovementPage />}
        {page.id === 'kvbm' && <KvbmPage />}
        {page.id === 'storage-io' && <StorageIOPage />}
        {page.id === 'cache-sharing' && <CacheSharingPage />}
        {page.id === 'blocking' && <BlockingPage />}
        {page.id === 'competition' && <CompetitionPage />}
        {page.id === 'economics' && <EconomicsPage />}
        {page.id === 'calculator' && <CalculatorPage />}
        {page.id === 'summary' && <SummaryPage />}
      </div>

      {/* Page navigation — always at bottom */}
      <PageNav
        pageIndex={pageIndex}
        totalPages={PAGES.length}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        pageLabel={`Page ${pageIndex + 1} of ${PAGES.length}: ${page.label}`}
      />

      {/* Keyboard hint */}
      <div className="text-center mt-3 mb-2 text-[10px] text-[var(--color-text-muted)]">
        PageDown / PageUp to turn pages
      </div>
    </div>
  );
}
