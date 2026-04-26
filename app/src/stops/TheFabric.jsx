import { useState, useCallback, useEffect, useRef } from 'react';
import {
  PAGES,
  PROTOCOL_OVERVIEW,
  PROTOCOL_RINGS,
  NVLINK_DOMAINS,
  RDMA_DATA_PATH,
  RDMA_ANIMATION_STEPS,
  IB_VS_ROCE,
  CXL_VS_RDMA,
  CXL_PRODUCTION_RESULTS,
  NVME_TRANSPORTS,
  ICMS_DATA_PATH,
  DATA_PATH_STEPS,
  COMPLETE_PATH_FRAMES,
  TIER_PROTOCOL_SUMMARY,
  FABRIC_TRAFFIC,
  TRAFFIC_VISUAL,
  SUMMARY_TABLE,
} from '../data/stop15Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Narration text for each page ---

const NARRATIONS = {
  'four-protocols':
    'Every KV cache transfer we&rsquo;ve discussed in Stops 12 and 13 &mdash; disaggregated P/D handoff, tier promotion, tier demotion, cache sharing &mdash; travels over a physical interconnect using a specific protocol. The choice of protocol determines the transfer latency, which directly impacts the user&rsquo;s Time-to-First-Token. In our scenario (8&times; H100, Llama-3 70B, FP8), a 28,000-token cache is 4.48 GB (after FP8 compression from Stop 14). Here&rsquo;s what that transfer looks like over each protocol family:',

  'nvlink-domains':
    'The highest-bandwidth interconnect in the AI infrastructure stack is the vendor&rsquo;s <strong>scale-up fabric</strong>. A <strong>scale-up domain</strong> is the set of GPUs interconnected by a high-bandwidth all-to-all fabric &mdash; NVIDIA&rsquo;s NVLink, AMD&rsquo;s Infinity Fabric, or future interconnects. Everything inside a scale-up domain communicates at memory-semantic speeds; everything outside must use Ethernet or InfiniBand. This is one of the most important and often misunderstood aspects of modern AI architecture. NVIDIA has been steadily expanding the reach of NVLink from 2&ndash;4 GPUs on a single board, through 8-GPU nodes, to hundreds of GPUs across multiple racks.',

  rdma:
    'When KV cache must move <strong>between scale-up domains</strong> &mdash; for disaggregated P/D where prefill and decode are in different racks, for ICMS access, or for cache sharing across domains &mdash; it travels over RDMA (Remote Direct Memory Access). RDMA allows one GPU to write directly into another machine&rsquo;s memory without involving either machine&rsquo;s CPU. If RDMA is new to you, this <a href="https://www.youtube.com/watch?v=GnBy5F1TCoQ" target="_blank" rel="noopener noreferrer" class="underline text-[var(--color-primary)]">8-minute video</a> provides an excellent visual explanation. RDMA comes in two flavors: InfiniBand and RoCEv2. Both provide the same RDMA verbs (the same programming interface), but they differ in the underlying fabric.',

  cxl:
    'CXL (Compute Express Link) represents a fundamentally different approach to KV cache data movement. Instead of networking protocols that copy data between machines, CXL extends the memory address space &mdash; making remote DRAM appear as local memory to the GPU or CPU. For KV cache, this is transformative: instead of &ldquo;transfer 4.48 GB from node A to node B,&rdquo; CXL enables &ldquo;GPU on node B reads cache directly from a shared memory pool as if it were local DRAM.&rdquo; No copy. No NIC involvement. Memory-semantic access with sub-100 ns latency.',

  nvme:
    'NVMe over Fabrics (NVMe-oF) extends the NVMe storage protocol across a network fabric, allowing GPUs and CPUs to access remote NVMe drives with near-local performance. For KV cache, NVMe-oF is the protocol that connects the G3.5/ICMS tier (BlueField-4 fronted flash shelves) and the G4 tier (network-attached storage) to the compute nodes.',

  'complete-path':
    'In a real inference cluster, KV cache data touches multiple protocols during its lifecycle. Let&rsquo;s trace our User 17&rsquo;s 28,000-token cache through the complete data path &mdash; from birth to archive &mdash; showing which protocol carries it at each step.',

  'fabric-contention':
    'KV cache transfers don&rsquo;t travel on a dedicated network &mdash; they share the fabric with other traffic types. Understanding what else is on the wire is essential for capacity planning and QoS configuration.',

  summary:
    'Four protocol families serve four distance ranges, each with different bandwidth, latency, and operational characteristics. The fabric is not just a pipe &mdash; it&rsquo;s a shared resource that requires traffic engineering to ensure KV cache transfers don&rsquo;t interfere with latency-sensitive inference traffic.',
};

// --- Page Content Components ---

function FourProtocolsPage() {
  const [hoveredRing, setHoveredRing] = useState(null);
  const rings = PROTOCOL_RINGS; // NVLink (center) -> NVMe/RoCE (outer)
  const outer = rings[rings.length - 1].ringSize;

  return (
    <div>
      <Panel>
        <PanelHeader>Transfer time by protocol (4.48 GB FP8 cache)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Protocol</th>
                <th className="px-4 py-2 text-right">Bandwidth</th>
                <th className="px-4 py-2 text-right">Transfer time</th>
                <th className="px-4 py-2 text-left">Latency class</th>
                <th className="px-4 py-2 text-left">Distance</th>
                <th className="px-4 py-2 text-left">Primary KV cache use</th>
              </tr>
            </thead>
            <tbody>
              {PROTOCOL_OVERVIEW.map((row) => (
                <tr
                  key={row.protocol}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.protocol}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.bandwidth}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-text)]">{row.transferTime}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.latencyClass}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.distance}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.primaryUse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="note"
        message="Each protocol occupies a distinct niche. There is no single &ldquo;best&rdquo; fabric &mdash; the right choice depends on the distance the data travels and the latency budget for that transfer. Hover any ring below to highlight a protocol family."
      />

      {/* Concentric distance rings — interactive */}
      <Panel className="mt-4">
        <PanelHeader>Protocol families by distance (hover to highlight)</PanelHeader>
        <div className="p-4 flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="relative" style={{ width: outer, height: outer }}>
            {/* Render outermost first so inner rings sit on top */}
            {[...rings].reverse().map((r) => {
              const isHover = hoveredRing === r.id;
              const isDim = hoveredRing !== null && !isHover;
              const offset = (outer - r.ringSize) / 2;
              const isCenter = r.id === 'nvlink';
              return (
                <div
                  key={r.id}
                  onMouseEnter={() => setHoveredRing(r.id)}
                  onMouseLeave={() => setHoveredRing(null)}
                  onClick={() => setHoveredRing(hoveredRing === r.id ? null : r.id)}
                  className="absolute rounded-full flex items-start justify-center cursor-pointer select-none"
                  style={{
                    left: offset,
                    top: offset,
                    width: r.ringSize,
                    height: r.ringSize,
                    border: `2px ${isCenter ? 'solid' : 'dashed'} ${r.color}`,
                    background: isCenter || isHover ? r.bgColor : 'var(--color-surface)',
                    opacity: isDim ? 0.35 : 1,
                    transform: isHover ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isHover ? `0 0 0 2px ${r.color}` : 'none',
                    transition: 'opacity 250ms ease, transform 250ms ease, box-shadow 250ms ease, background 250ms ease',
                    paddingTop: isCenter ? 0 : 6,
                  }}
                >
                  {isCenter ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center">
                      <div className="text-[11px] font-bold" style={{ color: r.color }}>
                        {r.label}
                      </div>
                      <div className="text-[10px]" style={{ color: r.color }}>
                        {r.bandwidth}
                      </div>
                      <div className="text-[9px]" style={{ color: r.color }}>
                        {r.latency}
                      </div>
                    </div>
                  ) : (
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded"
                      style={{
                        color: r.color,
                        background: 'var(--color-surface)',
                      }}
                    >
                      {r.label} &middot; {r.bandwidth} &middot; {r.latency}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Side panel: details about hovered ring */}
          <div
            className="w-full md:w-60 rounded-lg border p-3 text-[12px] leading-relaxed"
            style={{
              borderColor: hoveredRing
                ? rings.find((r) => r.id === hoveredRing).color
                : 'var(--color-border-light)',
              background: hoveredRing
                ? rings.find((r) => r.id === hoveredRing).bgColor
                : 'var(--color-surface-muted)',
              minHeight: 140,
              transition: 'border-color 250ms ease, background 250ms ease',
            }}
          >
            {hoveredRing ? (
              (() => {
                const r = rings.find((rr) => rr.id === hoveredRing);
                return (
                  <div>
                    <div className="text-[13px] font-bold mb-1" style={{ color: r.color }}>
                      {r.label}
                    </div>
                    <div className="text-[var(--color-text-secondary)] mb-2">
                      {r.description}
                    </div>
                    <div className="space-y-0.5 text-[11px] text-[var(--color-text-secondary)]">
                      <div><span className="text-[var(--color-text-muted)]">Bandwidth:</span> <span className="font-mono">{r.bandwidth}</span></div>
                      <div><span className="text-[var(--color-text-muted)]">Latency:</span> <span className="font-mono">{r.latency}</span></div>
                      <div><span className="text-[var(--color-text-muted)]">Reach:</span> {r.distance}</div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-[var(--color-text-muted)] text-center pt-8">
                Hover a ring to see its bandwidth, latency, and reach.
              </div>
            )}
          </div>
        </div>
        <div className="px-4 pb-3 text-[11px] text-[var(--color-text-muted)] text-center">
          Concentric rings map protocol families to physical distance from the GPU
        </div>
      </Panel>
    </div>
  );
}

function NvlinkDomainsPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>NVIDIA scale-up domain sizes (current and announced)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Configuration</th>
                <th className="px-4 py-2 text-right">GPUs</th>
                <th className="px-4 py-2 text-left">Physical scope</th>
                <th className="px-4 py-2 text-right">BW per GPU</th>
                <th className="px-4 py-2 text-right">Total fabric BW</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {NVLINK_DOMAINS.map((row) => (
                <tr
                  key={row.config}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.config}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.gpus}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.scope}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.bwPerGpu}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-text)]">{row.totalBw}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <InfoBox>
        The trend is clear: NVIDIA is aggressively expanding the scale-up domain.
        The NVL72 connected 72 GPUs within a single rack. The NVL576 will
        use <strong>NVIDIA Kyber</strong> &mdash; silicon photonics-based rack-to-rack
        optical interconnects &mdash; to extend NVLink across multiple racks while
        maintaining the same all-to-all bandwidth characteristics.
      </InfoBox>

      <Callout
        type="note"
        message="<strong>Note on NVL144 CPX:</strong> NVIDIA&rsquo;s original plan for NVL144 CPX paired Rubin SXM GPUs (decode) with Rubin CPX accelerators (GDDR7-based, prefill-optimized) in a single rack. Only the Rubin SXM GPUs (~48) were on the NVLink fabric; the CPX accelerators connected separately. This configuration was NOT a 144-GPU all-to-all scale-up domain. At GTC 2026, NVIDIA effectively shelved CPX. Ian Buck confirmed the pivot: &ldquo;scratch Rubin CPX.&rdquo; NVIDIA&rsquo;s $20B acquisition of Groq (Christmas Eve 2025) produced the Groq 3 LPU (LP30), which replaces CPX&rsquo;s role. The new architecture flips the original plan: <strong>Rubin GPUs handle prefill, Groq LPUs handle decode.</strong> The Groq 3 LPX rack (256 LPUs, 500 MB SRAM per die, 150 TB/s memory bandwidth per die &mdash; 7&times; Rubin&rsquo;s HBM4) sits ALONGSIDE the Vera Rubin NVL72, not inside the NVLink domain. NVIDIA claims 35&times; higher throughput per megawatt vs. Blackwell NVL72 alone. Shipping Q3 2026. Because CPX has been de-prioritized, this curriculum does not focus on the NVL144 CPX configuration. The Groq 3 LPU / LPX architecture is more representative of NVIDIA&rsquo;s near-term direction for inference acceleration."
      />

      <Callout
        type="good"
        message="<strong>Why this matters for KV cache:</strong> Within a scale-up domain, P/D transfer is essentially free. Our 4.48 GB cache at 3.6 TB/s (NVLink 6) transfers in ~1.2 ms &mdash; compared to ~90 ms over RDMA. That&rsquo;s a 75&times; difference. Every GPU that can be kept within the scale-up domain avoids the inter-domain transfer penalty."
      />

      {/* Scale-up domain architecture diagram */}
      <Panel className="mt-4">
        <PanelHeader>Scale-up domain with external connectivity</PanelHeader>
        <div className="p-4">
          <div
            className="rounded-lg border-2 p-4"
            style={{ borderColor: 'var(--color-primary)', background: 'var(--color-primary-bg)' }}
          >
            <div className="text-[11px] font-bold text-center mb-2" style={{ color: 'var(--color-primary)' }}>
              NVLink Domain (NVL72 shown) &mdash; all-to-all NVSwitch 6 fabric
            </div>

            {/* GPU grid — 8 wide x 9 rows = 72 */}
            <div className="flex flex-col items-center gap-1 my-2">
              {Array.from({ length: 9 }).map((_, row) => (
                <div key={row} className="flex gap-1">
                  {Array.from({ length: 8 }).map((_, col) => {
                    const idx = row * 8 + col;
                    return (
                      <div
                        key={col}
                        className="rounded text-[8px] font-mono flex items-center justify-center"
                        style={{
                          width: 28,
                          height: 18,
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-primary)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        G{idx}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="text-[10px] text-center text-[var(--color-text-muted)] mt-2">
              3.6 TB/s per GPU &middot; 260 TB/s aggregate (Vera Rubin NVL72) &middot; nanosecond latency
            </div>

            {/* External NIC/DPU row */}
            <div className="flex justify-center gap-3 text-[10px] font-medium pt-3 mt-3 border-t border-[var(--color-border-light)]">
              <div
                className="px-2 py-1 rounded border"
                style={{ borderColor: 'var(--color-blue)', color: 'var(--color-blue)', background: 'var(--color-surface)' }}
              >
                ConnectX-9 SuperNIC
              </div>
              <div
                className="px-2 py-1 rounded border"
                style={{ borderColor: 'var(--color-blue)', color: 'var(--color-blue)', background: 'var(--color-surface)' }}
              >
                ConnectX-9 SuperNIC
              </div>
              <div
                className="px-2 py-1 rounded border"
                style={{ borderColor: 'var(--color-teal)', color: 'var(--color-teal)', background: 'var(--color-surface)' }}
              >
                BlueField-4 DPU
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-8 mt-3 text-[11px] font-medium">
            <div className="text-center">
              <div className="text-[var(--color-text-muted)]">&darr;</div>
              <div style={{ color: 'var(--color-blue)' }}>Spectrum-X</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">(Ethernet scale-out)</div>
            </div>
            <div className="text-center">
              <div className="text-[var(--color-text-muted)]">&darr;</div>
              <div style={{ color: 'var(--color-blue)' }}>Quantum-X800</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">(InfiniBand scale-out)</div>
            </div>
            <div className="text-center">
              <div className="text-[var(--color-text-muted)]">&darr;</div>
              <div style={{ color: 'var(--color-teal)' }}>ICMS / CMX</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">(context memory)</div>
            </div>
          </div>
        </div>
      </Panel>

      <InfoBox>
        Within the scale-up domain: 3.6 TB/s per GPU, all-to-all, nanosecond latency.
        Outside the domain: ConnectX-9 SuperNICs provide 1.6 Tbps (200 GB/s)
        per GPU for scale-out networking via Spectrum-X or Quantum-X800. BlueField-4
        DPUs connect to ICMS/CMX storage. These are the cross-domain interconnects
        where KV cache transfers compete with other traffic.
      </InfoBox>

      <InfoBox>
        For disaggregated inference (Stop 12), if both the prefill GPU and the decode
        GPU are within the same scale-up domain, the KV cache transfer adds ~1.2 ms to
        TTFT. If they&rsquo;re in different domains (connected by Ethernet/IB), it
        adds ~90 ms. This is why NVIDIA&rsquo;s rack-scale systems are so valuable
        for inference: the larger the scale-up domain, the more flexibility you have to
        place prefill and decode without paying the cross-domain penalty.
      </InfoBox>
    </div>
  );
}

function RdmaPage() {
  const maxStep = RDMA_ANIMATION_STEPS.length - 1;
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setActiveIdx((prev) => {
          if (prev >= maxStep) {
            setIsPlaying(false);
            return maxStep;
          }
          return prev + 1;
        });
      }, 700);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, maxStep]);

  function handlePlay() {
    if (activeIdx >= maxStep) setActiveIdx(0);
    setIsPlaying(true);
  }

  return (
    <div>
      <Panel>
        <PanelHeader>How RDMA works for KV cache transfer</PanelHeader>
        <div className="px-4 py-3 space-y-2">
          {RDMA_DATA_PATH.map((s) => (
            <div key={s.step} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {s.step}
              </span>
              <span className="text-[var(--color-text-secondary)] leading-relaxed">{s.description}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* RDMA data path visual — animated */}
      <Panel className="mt-4">
        <PanelHeader>GPUDirect RDMA data path &mdash; animated (zero CPU copies)</PanelHeader>
        <div className="p-4">
          <div className="flex items-center justify-between gap-1 text-[10px] font-medium text-center flex-wrap">
            {RDMA_ANIMATION_STEPS.map((step, i) => {
              const isActive = i === activeIdx;
              const isPassed = i < activeIdx;
              return (
                <div key={step.id} className="contents">
                  <div
                    onClick={() => { setIsPlaying(false); setActiveIdx(i); }}
                    className="px-2 py-1.5 rounded border cursor-pointer"
                    style={{
                      borderColor: isActive || isPassed ? step.color : 'var(--color-border-light)',
                      background: isActive
                        ? step.color
                        : isPassed
                          ? 'var(--color-surface-muted)'
                          : 'var(--color-surface)',
                      color: isActive ? '#ffffff' : isPassed ? step.color : 'var(--color-text-muted)',
                      opacity: isActive ? 1 : isPassed ? 0.85 : 0.5,
                      transform: isActive ? 'scale(1.08)' : 'scale(1)',
                      boxShadow: isActive ? `0 0 0 3px ${step.color}33` : 'none',
                      transition: 'all 350ms ease',
                      minWidth: 72,
                    }}
                  >
                    <div>{step.label}</div>
                    <div className="text-[9px] opacity-80 font-normal">{step.sub}</div>
                  </div>
                  {i < RDMA_ANIMATION_STEPS.length - 1 && (
                    <div
                      className="text-base"
                      style={{
                        color: i < activeIdx ? RDMA_ANIMATION_STEPS[i + 1].color : 'var(--color-text-muted)',
                        opacity: i < activeIdx ? 1 : 0.4,
                        transition: 'opacity 350ms ease, color 350ms ease',
                      }}
                    >
                      &rarr;
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active step narrative */}
          <div
            className="mt-4 p-3 rounded border text-[12px] leading-relaxed"
            style={{
              borderColor: RDMA_ANIMATION_STEPS[activeIdx].color,
              background: 'var(--color-surface-muted)',
              transition: 'border-color 350ms ease',
            }}
          >
            <strong style={{ color: RDMA_ANIMATION_STEPS[activeIdx].color }}>
              Step {activeIdx + 1} / {RDMA_ANIMATION_STEPS.length}: {RDMA_ANIMATION_STEPS[activeIdx].label}
            </strong>
            <span className="text-[var(--color-text-secondary)]"> &mdash; {RDMA_ANIMATION_STEPS[activeIdx].sub}.</span>
          </div>

          {/* Controls */}
          <div className="pt-3 mt-3 border-t border-[var(--color-border-light)]">
            <div className="flex items-center gap-3">
              <button
                onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
                className="px-3 py-1 text-[11px] rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer text-[var(--color-text-secondary)]"
              >
                {isPlaying ? 'Pause' : activeIdx >= maxStep ? 'Replay' : 'Play'}
              </button>
              <input
                type="range"
                min={0}
                max={maxStep}
                value={activeIdx}
                onChange={(e) => { setIsPlaying(false); setActiveIdx(Number(e.target.value)); }}
                className="anim-scrubber flex-1"
              />
              <span className="text-[11px] font-mono text-[var(--color-text-muted)] min-w-[70px] text-right">
                {activeIdx + 1} / {RDMA_ANIMATION_STEPS.length}
              </span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>InfiniBand vs. RoCEv2 &mdash; side by side</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Property</th>
                <th className="px-4 py-2 text-left">InfiniBand (NDR 400G)</th>
                <th className="px-4 py-2 text-left">RoCEv2 (400 GbE + Spectrum-X)</th>
              </tr>
            </thead>
            <tbody>
              {IB_VS_ROCE.map((row) => (
                <tr
                  key={row.property}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.property}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.ib}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.roce}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>The industry trend:</strong> Ethernet-based RDMA (RoCEv2) is gaining ground for inference workloads, driven by NVIDIA&rsquo;s Spectrum-X platform and the Ultra Ethernet Consortium&rsquo;s standardization efforts. InfiniBand remains dominant for training (where 1&ndash;2 &micro;s latency matters for all-reduce synchronization). For KV cache transfers, the 5&ndash;10 &micro;s RoCEv2 latency is typically acceptable."
      />

      {/* Bandwidth dominates insight (Patch 3) */}
      <Panel className="mt-4">
        <PanelHeader>Bandwidth dominates, not protocol latency</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            For KV cache transfers, this is a critical insight. The protocol-level latency
            difference between InfiniBand (1&ndash;2 &micro;s) and RoCEv2 (5&ndash;10 &micro;s) is
            measured in <strong className="text-[var(--color-text)]">microseconds</strong>. But the
            actual transfer time for our 4.48 GB cache at 50 GB/s
            is <strong className="text-[var(--color-text)]">~90 milliseconds</strong> &mdash;
            10,000&times; longer than the protocol latency. The transfer time is almost entirely
            determined by <strong className="text-[var(--color-text)]">bandwidth &times; data volume</strong>,
            not protocol overhead.
          </p>
          <p>
            This is why NVLink&rsquo;s advantage is so decisive: it&rsquo;s not the latency
            that matters (NVLink latency is nanoseconds vs. RDMA&rsquo;s microseconds),
            it&rsquo;s the <strong className="text-[var(--color-text)]">bandwidth</strong> &mdash;
            3.6 TB/s vs. 50 GB/s, a 72&times; difference. At 3.6 TB/s, our 4.48 GB transfers
            in 1.2 ms. At 50 GB/s, it takes 90 ms. You could reduce RDMA&rsquo;s protocol
            latency to zero and the transfer would still take 89.99 ms. The bandwidth is
            the bottleneck, not the latency.
          </p>
          <p>
            For small transfers (TP all-reduce at 16&ndash;32 KB), protocol latency
            dominates &mdash; and this is where InfiniBand&rsquo;s 1&ndash;2 &micro;s advantage
            over RoCEv2&rsquo;s 5&ndash;10 &micro;s matters. But for KV cache-sized transfers
            (MBs to GBs), bandwidth is everything.
          </p>
        </div>
      </Panel>

      <InfoBox>
        <strong>Spectrum-X specifically</strong> adds AI-optimized features on top of standard
        RoCEv2: adaptive routing, enhanced congestion control, and telemetry that understands
        inference traffic patterns. For ICMS access (Stop 13), Spectrum-X is NVIDIA&rsquo;s
        recommended fabric because it provides the predictable, low-jitter connectivity that
        RDMA-based KV cache retrieval requires.
      </InfoBox>
    </div>
  );
}

function CxlPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>How CXL works for KV cache</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            CXL 2.0 (current) and CXL 3.0 (coming) enable three access modes:
          </p>
          <div className="space-y-2">
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'var(--color-primary-bg)' }}>CXL.mem</span>
              <span>Memory-semantic access to remote DRAM. The CPU (or GPU via PCIe) issues load/store instructions to CXL-attached memory as if it were local. Sub-100 ns latency.</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border border-[var(--color-border)] text-[var(--color-text-muted)]">CXL.cache</span>
              <span>Cache-coherent access for shared data structures.</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border border-[var(--color-border)] text-[var(--color-text-muted)]">CXL.io</span>
              <span>Standard PCIe I/O for device communication.</span>
            </div>
          </div>
          <p>
            For KV cache, <strong className="text-[var(--color-text)]">CXL.mem</strong> is
            the relevant mode: attach a pool of DRAM (potentially terabytes) to the
            PCIe/CXL fabric, and any device on the fabric can access it with memory semantics.
          </p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>CXL vs. RDMA for KV cache</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Property</th>
                <th className="px-4 py-2 text-left">RDMA (IB/RoCEv2)</th>
                <th className="px-4 py-2 text-left">CXL 2.0</th>
              </tr>
            </thead>
            <tbody>
              {CXL_VS_RDMA.map((row) => (
                <tr
                  key={row.property}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.property}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.rdma}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.cxl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Production results</PanelHeader>
        <div className="px-4 py-3 space-y-3">
          {CXL_PRODUCTION_RESULTS.map((r) => (
            <div key={r.source} className="text-[13px]">
              <strong className="text-[var(--color-text)]">{r.source}:</strong>{' '}
              <span className="text-[var(--color-text-secondary)]">{r.result}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Patch 4: CXL maturity caveats */}
      <Callout
        type="warn"
        message="<strong>Maturity and scope caveats:</strong> CXL for KV cache is real but early. Microsoft Azure launched the first CXL-equipped cloud instances in November 2025, but these are for general memory expansion, not specifically for KV cache tiering. The TraCT and XConn/MemVerge results are research demonstrations, not production deployments."
      />

      <InfoBox>
        <strong>CXL vs. NVLink:</strong> CXL and NVLink serve different purposes.
        NVLink connects GPUs to GPUs within a domain for compute parallelism
        (all-reduce, expert routing). CXL connects CPUs/GPUs to pooled DRAM for memory
        expansion. CXL is not a replacement for NVLink &mdash; it&rsquo;s complementary.
        For non-NVIDIA platforms (AMD MI300X, Intel), CXL may be the closest available
        technology to NVLink&rsquo;s memory-coherent GPU interconnect, but it operates at
        significantly lower bandwidth (64 GB/s vs. 3.6 TB/s).
      </InfoBox>

      <InfoBox>
        <strong>CXL&rsquo;s KV cache role</strong> is most likely as a G2.5 tier: faster than
        Spectrum-X RDMA for ICMS access (memory semantics, no NIC hop), but limited to
        intra-rack distances (CXL 2.0) or multi-rack with CXL 3.0+ switching. It does not
        replace NVLink for GPU-to-GPU communication within the inference pipeline.
      </InfoBox>

      <InfoBox>
        <strong>Current CXL scale:</strong> Commercial CXL memory pools reached 100 TiB
        in 2025 (XConn Technologies). CXL 4.0 (specification November 2025, hardware
        expected 2027) doubles bandwidth to 128 GT/s and adds extended reach for
        multi-rack deployments. The trajectory is promising, but production deployments
        for KV cache specifically are still emerging.
      </InfoBox>

      <Callout
        type="note"
        message="<strong>For our scenario:</strong> CXL is not yet available on our H100 cluster (H100 predates CXL adoption). On next-generation platforms (Blackwell, Rubin), CXL-attached DRAM pools could serve as a G2.5 tier &mdash; faster than Spectrum-X RDMA for ICMS access, with the memory-coherent sharing that eliminates explicit data copies. This is the direction the industry is heading: KV cache as shared memory, not transferred data."
      />
    </div>
  );
}

function NvmePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>NVMe over Fabrics transport options (sorted by latency)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Transport</th>
                <th className="px-4 py-2 text-left">Protocol</th>
                <th className="px-4 py-2 text-right">Latency</th>
                <th className="px-4 py-2 text-right">Bandwidth</th>
                <th className="px-4 py-2 text-left">KV cache relevance</th>
              </tr>
            </thead>
            <tbody>
              {NVME_TRANSPORTS.map((row) => (
                <tr
                  key={row.transport}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.transport}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.protocol}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.latency}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.bandwidth}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.relevance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Patch 5: FC non-fit explanation */}
      <InfoBox>
        <strong>A note on Fibre Channel:</strong> While NVMe/FC is a mature and
        well-understood protocol in enterprise storage, it is not a practical fit for
        KV cache infrastructure. NVIDIA&rsquo;s AI platforms (ConnectX SuperNICs,
        BlueField DPUs, Spectrum-X switches) do not include FC HBA support. The cost
        and bandwidth economics also don&rsquo;t align: 32 GFC provides ~4 GB/s at
        roughly 4&times; the per-port cost of 100 GbE, which provides ~12.5 GB/s. For
        KV cache workloads where bandwidth drives transfer time (as we established on
        Page 3), FC&rsquo;s lower bandwidth at higher cost makes it a poor fit.
        NVMe/FC remains valuable for traditional enterprise storage, but the AI
        inference fabric is built on Ethernet and RDMA.
      </InfoBox>

      <Callout
        type="note"
        message="<strong>For KV cache, NVMe/RoCE is the primary transport.</strong> It provides the lowest latency path from GPU to remote flash, which matters for G3.5 cache promotion where every millisecond adds to TTFT."
      />

      <Panel className="mt-4">
        <PanelHeader>How ICMS uses NVMe/RoCE</PanelHeader>
        <div className="px-4 py-3 space-y-2">
          {ICMS_DATA_PATH.map((s) => (
            <div key={s.step} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)] text-xs font-medium flex items-center justify-center">
                {s.step}
              </span>
              <span className="text-[var(--color-text-secondary)] leading-relaxed">{s.description}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Storage workload profile for KV cache (revised per Correction 5) */}
      <Panel className="mt-4">
        <PanelHeader>Storage workload profile for KV cache</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            <strong className="text-[var(--color-text)]">Aggregated chunks, not per-page transfers.</strong>{' '}
            Early prefill/decode disaggregation systems (vLLM&rsquo;s original PD pattern)
            transferred the KV cache one page at a time at the inference engine&rsquo;s
            native page size (16&ndash;32 tokens, tens of KB per I/O). This pattern{' '}
            <strong>underutilized network bandwidth</strong>. LMCache benchmarks
            documented the problem, and production systems &mdash; NVIDIA KVBM, Dell, WEKA,
            VAST, LMCache &mdash; have all converged on a different approach:{' '}
            <strong>aggregate many pages and all model layers into a single large
            sequential transfer</strong>.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Chunk composition.</strong> A
            production chunk combines (tokens per chunk) &times; (all model layers) &times;
            (KV size per token per layer) into one sequential transfer unit. LMCache&rsquo;s
            default is <strong>256 tokens per chunk</strong>. For Llama-3 70B at FP8 with
            256-token chunks, that&rsquo;s roughly <strong>~5 MB per chunk</strong>. KVBM&rsquo;s
            eviction path writes &ldquo;all model layers of the block size&rdquo; as a single
            unit. Production chunks range from hundreds of KB to multiple MB.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Why aggregation matters.</strong>{' '}
            Page-by-page transfers at the engine&rsquo;s native size (tens of KB) cannot
            saturate modern fabric bandwidth. Aggregating pages and layers into larger
            sequential chunks lets RDMA hit line rate. VAST demonstrated{' '}
            <strong>99% of 200 Gbps line rate</strong> using this aggregated pattern in
            collaboration with NVIDIA Dynamo engineering.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Aggregate volume vs. chunk count.</strong>{' '}
            A conversation&rsquo;s total KV cache is 1&ndash;10 GB depending on context length
            and model. In the production pattern, this transfers as <strong>tens to low
            hundreds of large chunks</strong>, not thousands of small pages.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Networking implication.</strong>{' '}
            KV cache transfers are <strong>bandwidth-dominated large sequential flows</strong>,
            not many small concurrent flows. The fabric&rsquo;s aggregate bandwidth matters
            more than small-flow handling or fine-grained adaptive routing.
          </p>
        </div>
      </Panel>

      <InfoBox>
        <strong>I/O pattern:</strong> Burst reads (promotion) and sequential writes (demotion).
        Very few random reads. No read-modify-write. <strong>Durability:</strong> Not required.
        KV cache can be recomputed. No need for write-ahead logging, journaling, or RAID.
        This workload profile suggests that optimized KV cache storage appliances (like ICMS)
        don&rsquo;t need the full complexity of general-purpose storage systems.
      </InfoBox>
    </div>
  );
}

function CompletePathPage() {
  const maxStep = COMPLETE_PATH_FRAMES.length - 1;
  const [frameIdx, setFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setFrameIdx((prev) => {
          if (prev >= maxStep) {
            setIsPlaying(false);
            return maxStep;
          }
          return prev + 1;
        });
      }, 1400);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, maxStep]);

  function handlePlay() {
    if (frameIdx >= maxStep) setFrameIdx(0);
    setIsPlaying(true);
  }

  const active = COMPLETE_PATH_FRAMES[frameIdx];

  // Tier rows showing where the cache currently lives
  const TIERS = [
    { id: 'prefill',  label: 'Prefill GPU HBM (G1)',    activeFor: [1] },
    { id: 'decode',   label: 'Decode GPU HBM (G1)',      activeFor: [2, 3, 5, 7] },
    { id: 'dram',     label: 'CPU DRAM (G2)',            activeFor: [4, 5, 6] },
    { id: 'icms',     label: 'ICMS flash (G3.5)',        activeFor: [6, 7, 8] },
    { id: 'g4',       label: 'Network storage (G4)',    activeFor: [8] },
  ];

  return (
    <div>
      {/* Step-by-step animation */}
      <Panel>
        <PanelHeader>User 17&rsquo;s cache &mdash; complete lifecycle animation</PanelHeader>
        <div className="p-4">
          {/* Tier rail showing where the data lives right now */}
          <div className="space-y-2 mb-4">
            {TIERS.map((tier) => {
              const isActive = tier.activeFor.includes(active.step);
              return (
                <div
                  key={tier.id}
                  className="flex items-center gap-3 rounded border p-2 text-[12px]"
                  style={{
                    borderColor: isActive ? active.color : 'var(--color-border-light)',
                    background: isActive ? 'var(--color-surface-muted)' : 'var(--color-surface)',
                    transition: 'border-color 500ms ease, background 500ms ease',
                  }}
                >
                  <div
                    className="flex-shrink-0 w-2 h-8 rounded"
                    style={{
                      background: isActive ? active.color : 'var(--color-border-light)',
                      transition: 'background 500ms ease',
                    }}
                  />
                  <div className="flex-1">
                    <div
                      className="font-medium"
                      style={{
                        color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
                        transition: 'color 500ms ease',
                      }}
                    >
                      {tier.label}
                    </div>
                  </div>
                  {isActive && (
                    <div
                      className="text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{
                        background: active.color,
                        color: '#ffffff',
                      }}
                    >
                      cache resident
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active step card */}
          <div
            className="rounded-lg border-2 p-4"
            style={{
              borderColor: active.color,
              background: 'var(--color-surface-muted)',
              transition: 'border-color 500ms ease',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                style={{ background: active.color }}
              >
                {active.step}
              </div>
              <div className="text-[15px] font-bold text-[var(--color-text)]">
                {active.title}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[12px] mb-2">
              <span className="px-2 py-1 rounded font-mono" style={{ background: 'var(--color-surface)', color: active.color, border: `1px solid ${active.color}` }}>
                {active.from}
              </span>
              <span className="text-[var(--color-text-muted)]">&rarr;</span>
              <span className="px-2 py-1 rounded font-mono" style={{ background: 'var(--color-surface)', color: active.color, border: `1px solid ${active.color}` }}>
                {active.to}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[var(--color-text-secondary)] mb-3">
              <div>
                <span className="text-[var(--color-text-muted)]">Protocol: </span>
                <strong className="text-[var(--color-text)]">{active.protocol}</strong>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">Latency: </span>
                <span className="font-mono text-[var(--color-text)]">{active.latency}</span>
              </div>
            </div>
            <div className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
              {active.narrative}
            </div>
          </div>

          {/* Step dot navigation */}
          <div className="flex justify-between items-center mt-4 gap-1">
            {COMPLETE_PATH_FRAMES.map((f, i) => {
              const isActive = i === frameIdx;
              const isPassed = i < frameIdx;
              return (
                <button
                  key={f.step}
                  onClick={() => { setIsPlaying(false); setFrameIdx(i); }}
                  className="flex-1 rounded py-1.5 text-[10px] font-medium cursor-pointer"
                  style={{
                    background: isActive ? f.color : isPassed ? 'var(--color-surface-muted)' : 'var(--color-surface)',
                    color: isActive ? '#ffffff' : isPassed ? f.color : 'var(--color-text-muted)',
                    border: `1px solid ${isActive || isPassed ? f.color : 'var(--color-border-light)'}`,
                    opacity: isActive ? 1 : isPassed ? 0.85 : 0.5,
                    transition: 'all 350ms ease',
                  }}
                >
                  {f.step}
                </button>
              );
            })}
          </div>

          {/* Controls */}
          <div className="pt-3 mt-3 border-t border-[var(--color-border-light)]">
            <div className="flex items-center gap-3">
              <button
                onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
                className="px-3 py-1 text-[11px] rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer text-[var(--color-text-secondary)]"
              >
                {isPlaying ? 'Pause' : frameIdx >= maxStep ? 'Replay' : 'Play'}
              </button>
              <input
                type="range"
                min={0}
                max={maxStep}
                value={frameIdx}
                onChange={(e) => { setIsPlaying(false); setFrameIdx(Number(e.target.value)); }}
                className="anim-scrubber flex-1"
              />
              <span className="text-[11px] font-mono text-[var(--color-text-muted)] min-w-[80px] text-right">
                Step {frameIdx + 1} / {COMPLETE_PATH_FRAMES.length}
              </span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Full step detail table */}
      <Panel className="mt-4">
        <PanelHeader>All 8 steps in detail</PanelHeader>
        <div className="px-4 py-3 space-y-3">
          {DATA_PATH_STEPS.map((s) => (
            <div
              key={s.step}
              className="rounded-lg border border-[var(--color-border-light)] p-3 text-[13px]"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-bold flex items-center justify-center">
                  {s.step}
                </span>
                <strong className="text-[var(--color-text)]">{s.title}</strong>
              </div>
              <div className="ml-8 space-y-1 text-[12px]">
                <div>
                  <span className="text-[var(--color-text-muted)]">Path: </span>
                  <span className="text-[var(--color-text-secondary)]">{s.dataPath}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Protocol: </span>
                  <strong className="text-[var(--color-text)]">{s.protocol}</strong>
                </div>
                {s.dataVolume !== '\u2014' && (
                  <div>
                    <span className="text-[var(--color-text-muted)]">Data: </span>
                    <span className="font-mono text-[var(--color-text-secondary)]">{s.dataVolume}</span>
                  </div>
                )}
                {s.latency !== '\u2014' && (
                  <div>
                    <span className="text-[var(--color-text-muted)]">Latency: </span>
                    <span className="font-mono text-[var(--color-text-secondary)]">{s.latency}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Patch 7: Updated tier protocol summary */}
      <Panel className="mt-4">
        <PanelHeader>Protocol stack at each tier transition</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Transition</th>
                <th className="px-4 py-2 text-left">Protocol</th>
                <th className="px-4 py-2 text-right">Bandwidth</th>
                <th className="px-4 py-2 text-right">Transfer time (4.48 GB)</th>
              </tr>
            </thead>
            <tbody>
              {TIER_PROTOCOL_SUMMARY.map((row) => (
                <tr
                  key={row.transition}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.future ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-4 py-2 text-[var(--color-text)]">
                    {row.transition}
                    {row.future && <span className="text-[10px] text-[var(--color-text-muted)] ml-1">(future)</span>}
                  </td>
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.protocol}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.bandwidth}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.transferTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function FabricContentionPage() {
  // Competing traffic visual: each lane shows a flow on the wire
  const sizeToWidth = { tiny: 6, small: 14, huge: 60, massive: 88 };

  return (
    <div>
      {/* Traffic contention visual: shared pipe */}
      <Panel>
        <PanelHeader>What competes on the wire</PanelHeader>
        <div className="p-4 space-y-2">
          <div className="text-[11px] text-[var(--color-text-muted)] mb-2">
            Every traffic type below shares the same physical fabric link. Width indicates relative burst size; the red TP lane is the latency-critical flow that large bursts can block.
          </div>
          {TRAFFIC_VISUAL.map((t) => {
            const width = sizeToWidth[t.size] || 20;
            return (
              <div key={t.id} className="flex items-center gap-3">
                <div
                  className="text-[11px] font-medium min-w-[140px] text-right"
                  style={{ color: t.color }}
                >
                  {t.label}
                </div>
                <div className="flex-1 h-5 rounded overflow-hidden border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] relative">
                  <div
                    className="h-full rounded-r"
                    style={{
                      width: `${width}%`,
                      background: t.color,
                      opacity: t.priority === 'critical' ? 1 : 0.85,
                      transition: 'width 400ms ease',
                    }}
                  />
                  <div
                    className="absolute inset-0 flex items-center px-2 text-[9px] font-mono"
                    style={{ color: t.priority === 'critical' ? '#ffffff' : 'var(--color-text-secondary)' }}
                  >
                    {t.freq} &middot; {t.note}
                  </div>
                </div>
                <div
                  className="text-[10px] min-w-[70px] px-2 py-0.5 rounded text-center"
                  style={{
                    background: t.priority === 'critical'
                      ? 'var(--color-red-bg)'
                      : t.priority === 'high'
                        ? 'var(--color-amber-bg)'
                        : 'var(--color-surface-muted)',
                    color: t.priority === 'critical'
                      ? 'var(--color-red-text)'
                      : t.priority === 'high'
                        ? 'var(--color-amber-text)'
                        : 'var(--color-text-muted)',
                  }}
                >
                  {t.priority}
                </div>
              </div>
            );
          })}
          <div className="mt-3 text-[11px] text-[var(--color-text-muted)] italic border-t border-[var(--color-border-light)] pt-2">
            Head-of-line risk: the massive P/D and promotion bursts can delay the tiny, latency-critical TP all-reduce packets unless QoS classes, separate fabrics, or PFC/ECN flow control are configured.
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Traffic types on the inference fabric</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Traffic type</th>
                <th className="px-4 py-2 text-left">Protocol</th>
                <th className="px-4 py-2 text-left">Pattern</th>
                <th className="px-4 py-2 text-left">Latency sensitivity</th>
                <th className="px-4 py-2 text-left">Bandwidth</th>
              </tr>
            </thead>
            <tbody>
              {FABRIC_TRAFFIC.map((row) => (
                <tr
                  key={row.type}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.type}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.protocol}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.pattern}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.latencySensitivity}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.bandwidth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Patch 8: P/D scale-up domain note */}
      <InfoBox>
        <strong>Note:</strong> P/D KV transfer uses NVLink if the prefill and decode GPUs
        are within the same scale-up domain &mdash; which is the fastest possible path
        (~1.2 ms). If they are in different scale-up domains (e.g., different racks in a
        multi-rack deployment), the transfer falls to RDMA over Spectrum-X or InfiniBand
        (~90 ms). This 75&times; latency difference is a primary reason why keeping prefill
        and decode within the same scale-up domain is strongly preferred when the domain
        size allows it.
      </InfoBox>

      <Panel className="mt-4">
        <PanelHeader>The contention risk</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            When a P/D KV transfer (4.48 GB burst) and a TP all-reduce (32 KB,
            latency-critical) compete for the same fabric link, the large transfer
            can delay the small one. This is the classic head-of-line blocking
            problem at the network level.
          </p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Solutions</PanelHeader>
        <div className="px-4 py-3 space-y-2">
          {[
            {
              label: 'Traffic classes / QoS',
              text: 'Assign TP all-reduce to a high-priority traffic class; KV transfers to a lower class. Spectrum-X supports this natively.',
            },
            {
              label: 'Separate fabrics',
              text: 'Some deployments use NVLink for TP (intra-domain) and Ethernet/IB for KV transfers (inter-domain), physically separating the traffic types.',
            },
            {
              label: 'RDMA flow control',
              text: 'PFC (Priority Flow Control) on RoCEv2 prevents drops but can cause pause storms if not tuned correctly. ECN (Explicit Congestion Notification) + DCQCN provide finer-grained congestion management.',
            },
          ].map((item) => (
            <div key={item.label} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: 'var(--color-primary)' }} />
              <div className="text-[var(--color-text-secondary)] leading-relaxed">
                <strong className="text-[var(--color-text)]">{item.label}:</strong>{' '}
                {item.text}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>For our scenario:</strong> With TP=1 (no tensor parallelism, each GPU runs the full model), there&rsquo;s no TP all-reduce traffic. The fabric carries only P/D transfers and cache tier transitions. This simplifies traffic engineering significantly. If we moved to TP=4 (for FP16 inference), the all-reduce traffic would share the fabric and QoS configuration would become essential."
      />
    </div>
  );
}

function SummaryPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Protocol summary</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Protocol</th>
                <th className="px-4 py-2 text-left">Distance</th>
                <th className="px-4 py-2 text-right">Bandwidth</th>
                <th className="px-4 py-2 text-right">Latency</th>
                <th className="px-4 py-2 text-left">KV cache role</th>
                <th className="px-4 py-2 text-left">Maturity</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_TABLE.map((row) => (
                <tr
                  key={row.protocol}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.protocol}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.distance}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.bandwidth}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.latency}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.role}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.maturity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Evolving diagram description */}
      <Panel className="mt-4">
        <PanelHeader>Evolving diagram &mdash; Stop 15 version</PanelHeader>
        <div className="p-4 space-y-2">
          {[
            { color: 'var(--color-primary)', weight: 'thick',  label: 'NVLink between GPUs within a domain', detail: '3.6 TB/s per GPU' },
            { color: 'var(--color-blue)',    weight: 'medium', label: 'Spectrum-X / RDMA between domains and to ICMS', detail: '50\u2013100 GB/s' },
            { color: 'var(--color-text-muted)', weight: 'thin', label: 'NVMe/RoCE to G4 storage', detail: 'varies' },
            { color: 'var(--color-teal)',    weight: 'dashed', label: 'CXL to pooled DRAM', detail: '64\u2013128 GB/s, coming' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-[13px]">
              <div
                className="flex-shrink-0 h-1 rounded"
                style={{
                  width: item.weight === 'thick' ? 40 : item.weight === 'medium' ? 30 : 20,
                  background: item.color,
                  borderBottom: item.weight === 'dashed' ? `2px dashed ${item.color}` : 'none',
                  height: item.weight === 'thick' ? 4 : item.weight === 'medium' ? 3 : item.weight === 'dashed' ? 0 : 2,
                }}
              />
              <span className="text-[var(--color-text-secondary)]">
                <strong className="text-[var(--color-text)]">{item.label}</strong>
                <span className="text-[var(--color-text-muted)] ml-1">({item.detail})</span>
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Bridge to Stop 16 */}
      <Panel className="mt-4">
        <PanelHeader>Bridge to Stop 16</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            We now know <strong className="text-[var(--color-text)]">WHAT</strong> the
            cache is (Stops 8&ndash;10), <strong className="text-[var(--color-text)]">WHERE</strong> it
            lives (Stop 13), how to make
            it <strong className="text-[var(--color-text)]">SMALLER</strong> (Stop 14),
            and <strong className="text-[var(--color-text)]">HOW</strong> it moves (this stop).
            The remaining question: when a request arrives, <strong className="text-[var(--color-text)]">WHERE
            should it go?</strong>
          </p>
          <p>
            In our scenario, User 17 sends a follow-up message. Their cache was last on
            Decode GPU 3 but has since been demoted to ICMS. Meanwhile, GPU 3 is fully
            loaded and GPU 5 has spare capacity. The Smart Router must decide: send to
            GPU 3 (which must promote the cache, ~90 ms) or to GPU 5 (which must pull
            from ICMS anyway, also ~90 ms, but has more capacity for decode)? What if
            20 other users share the same system prompt prefix that&rsquo;s already
            cached on GPU 2?
          </p>
          <p>
            These routing decisions &mdash; balancing cache locality, GPU load, prefix
            sharing, and memory pressure &mdash; are the subject of Stop 16.
          </p>
        </div>
      </Panel>
    </div>
  );
}

// --- Main Component ---

export default function TheFabric() {
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
        {page.id === 'four-protocols' && <FourProtocolsPage />}
        {page.id === 'nvlink-domains' && <NvlinkDomainsPage />}
        {page.id === 'rdma' && <RdmaPage />}
        {page.id === 'cxl' && <CxlPage />}
        {page.id === 'nvme' && <NvmePage />}
        {page.id === 'complete-path' && <CompletePathPage />}
        {page.id === 'fabric-contention' && <FabricContentionPage />}
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
