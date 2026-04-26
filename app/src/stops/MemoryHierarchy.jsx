import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  PAGES,
  NARRATIONS,
  TIERING_COMPARISON,
  MEMORY_TIERS,
  INTERCONNECT_TABLE,
  MIGRATION_FRAMES,
  RETRIEVAL_PATHS,
  BLOCK_LIFECYCLE,
  STORAGE_REQUIREMENTS,
  BLOCK_SIZE_TABLE,
  BLOCKING_STEPS,
  BLOCKING_TABLE,
  CACHE_HIT_VS_MISS,
  WITHOUT_TIERING,
  WITH_TIERING,
  TIER_SUMMARY,
  KEY_TAKEAWAYS,
  tierForIdle,
} from '../data/stop13Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';

// ===========================================================================
// Page 1 — "You already know this problem"
// ===========================================================================

function FramingPage() {
  return (
    <div>
      <Panel>
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
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.aspect}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.traditional}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.kvCache}</td>
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

// ===========================================================================
// Page 2 — "The five tiers" (interactive: slider, ICMS toggle, counter)
// ===========================================================================

function formatCapacity(gb) {
  if (gb >= 1024 * 1024) return (gb / (1024 * 1024)).toFixed(1) + ' PB';
  if (gb >= 1024) return (gb / 1024).toFixed(1) + ' TB';
  return Math.round(gb) + ' GB';
}

function formatIdle(seconds) {
  if (seconds < 60) return seconds + ' sec';
  if (seconds < 3600) return Math.round(seconds / 60) + ' min';
  return (seconds / 3600).toFixed(1) + ' hr';
}

function FiveTiersPage() {
  const [expandedTier, setExpandedTier] = useState('G1');
  const [icmsEnabled, setIcmsEnabled] = useState(true);
  // Idle time in seconds, 0 .. 3600 (1 hr)
  const [idleSec, setIdleSec] = useState(0);

  const activeTiers = useMemo(
    () => MEMORY_TIERS.filter((t) => icmsEnabled || !t.optional),
    [icmsEnabled]
  );

  const totalCapacity = useMemo(
    () => activeTiers.reduce((s, t) => s + t.capacityGB, 0),
    [activeTiers]
  );

  const migrationTier = useMemo(() => tierForIdle(idleSec, icmsEnabled), [idleSec, icmsEnabled]);

  return (
    <div>
      {/* Interactive controls bar */}
      <Panel>
        <PanelHeader>Interactive tier explorer</PanelHeader>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={icmsEnabled}
                onChange={(e) => setIcmsEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-[12px] text-[var(--color-text)]">ICMS / G3.5 enabled</span>
            </label>
            <div className="text-[12px] text-[var(--color-text-muted)]">
              Total cache capacity:{' '}
              <strong className="text-[var(--color-text)] font-mono">
                {formatCapacity(totalCapacity)}
              </strong>{' '}
              across {activeTiers.length} tier{activeTiers.length === 1 ? '' : 's'}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] text-[var(--color-text-muted)]">
                Conversation idle time
              </label>
              <span className="text-[12px] font-mono text-[var(--color-text)]">
                {formatIdle(idleSec)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={3600}
              step={15}
              value={idleSec}
              onChange={(e) => setIdleSec(Number(e.target.value))}
              className="anim-scrubber w-full"
            />
            <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-1 font-mono">
              <span>0s</span>
              <span>15s</span>
              <span>1 min</span>
              <span>5 min</span>
              <span>15 min</span>
              <span>1 hr</span>
            </div>
            <div className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
              At this idle time, the cache would naturally live in{' '}
              <span
                className="px-2 py-0.5 rounded font-medium"
                style={{
                  background: migrationTier.colorBg,
                  color: migrationTier.colorText,
                  border: `1px solid ${migrationTier.color}`,
                }}
              >
                {migrationTier.label}
              </span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Tier bars — visual hierarchy with animated reveal/hide for ICMS */}
      <Panel className="mt-4">
        <PanelHeader>The five-tier KV cache hierarchy</PanelHeader>
        <div className="p-4 space-y-2">
          {MEMORY_TIERS.map((tier) => {
            const isExpanded = expandedTier === tier.id;
            const isMigration = tier.id === migrationTier.id;
            const isHidden = !icmsEnabled && tier.optional;
            // Visual width (wider tier = more capacity, log scale)
            const widthPct = Math.min(
              100,
              Math.max(25, 25 + 15 * Math.log10(tier.capacityGB))
            );

            return (
              <div
                key={tier.id}
                style={{
                  maxHeight: isHidden ? '0px' : '500px',
                  opacity: isHidden ? 0 : 1,
                  overflow: 'hidden',
                  transition: 'max-height 400ms ease, opacity 400ms ease',
                }}
              >
                <button
                  onClick={() => setExpandedTier(isExpanded ? null : tier.id)}
                  className="w-full text-left cursor-pointer"
                >
                  <div
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                    style={{
                      borderColor: isMigration
                        ? tier.color
                        : isExpanded
                        ? tier.color
                        : 'var(--color-border-light)',
                      background: isMigration
                        ? tier.colorBg
                        : isExpanded
                        ? 'var(--color-surface-muted)'
                        : 'transparent',
                      transition: 'border-color 300ms ease, background 300ms ease',
                    }}
                  >
                    <div
                      className="flex-shrink-0 w-3 h-3 rounded-sm"
                      style={{ background: tier.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-[var(--color-text)]">
                          {tier.label}
                        </span>
                        {isMigration && (
                          <span
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider"
                            style={{
                              background: tier.color,
                              color: 'white',
                            }}
                          >
                            Cache lives here
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        {tier.latency} &middot; {tier.costPerGB} &middot;{' '}
                        <span className="font-mono">{formatCapacity(tier.capacityGB)}</span>
                      </div>
                      {/* Capacity bar */}
                      <div className="mt-1.5 h-1.5 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${widthPct}%`,
                            background: tier.color,
                            transition: 'width 400ms ease',
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {isExpanded ? '\u25B2' : '\u25BC'}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="ml-6 mt-1 mb-2 p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-[12px] space-y-1.5 text-[var(--color-text-secondary)]">
                    <div>
                      <strong className="text-[var(--color-text)]">Capacity:</strong>{' '}
                      {tier.capacity}
                    </div>
                    <div>
                      <strong className="text-[var(--color-text)]">Bandwidth:</strong>{' '}
                      {tier.bandwidth}
                    </div>
                    <div>
                      <strong className="text-[var(--color-text)]">Interconnect:</strong>{' '}
                      {tier.interconnect}
                    </div>
                    <div>
                      <strong className="text-[var(--color-text)]">Role:</strong> {tier.role}
                    </div>
                    <div className="pt-1 border-t border-[var(--color-border-light)]">
                      <strong className="text-[var(--color-text)]">In our scenario:</strong>{' '}
                      {tier.scenario}
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
                <th className="px-4 py-2 text-left">Who Initiates</th>
              </tr>
            </thead>
            <tbody>
              {INTERCONNECT_TABLE.map((row) => (
                <tr
                  key={row.transition}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-mono text-[11px] text-[var(--color-text)]">
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

// ===========================================================================
// Page 3 — "The data movement" (frame-by-frame animation with tier columns)
// ===========================================================================

function TierColumns({ frame, progress }) {
  // Draw 5 vertical columns (G1..G4) with User 17's block rendered in the
  // appropriate column. If the frame has a source and target, interpolate
  // the vertical position by `progress` (0..1).
  const tierOrder = ['G1', 'G2', 'G3', 'G3.5', 'G4'];

  // Compute the "current" tier that holds User 17's block.
  // When transferring: show a ghost in source and a filling block in target.
  const source = frame.sourceTier;
  const target = frame.targetTier || frame.tierId;
  const isTransfer = source && target && source !== target && frame.transferMs > 0;

  // Growing phase: block in G1 grows from 8.96 GB to 9.60 GB.
  const displayedGB = frame.growing
    ? 8.96 + (9.60 - 8.96) * progress
    : frame.cacheGB;

  return (
    <div className="p-4">
      <div className="flex items-stretch gap-2 h-[260px]">
        {tierOrder.map((tierId) => {
          const tier = MEMORY_TIERS.find((t) => t.id === tierId);
          const isSource = source === tierId;
          const isTarget = target === tierId;
          const hasBlock = isTarget || (isSource && isTransfer);
          // Block opacity during transfer: source fades out, target fades in
          let blockOpacity = 1;
          if (isTransfer) {
            if (isSource) blockOpacity = 1 - progress;
            if (isTarget) blockOpacity = progress;
          } else if (frame.tierId && frame.tierId !== tierId && !isSource) {
            // static frame: only show block in tierId
          }

          // If the frame is "end" (no tier), draw nothing in any column
          const showBlock = frame.tierId !== null && (hasBlock || frame.tierId === tierId);

          // Layer-parallel fill: block is drawn as progressive horizontal fill
          const isLayerParallel = frame.layerParallel && isTarget && isTransfer;

          return (
            <div
              key={tierId}
              className="flex-1 flex flex-col items-center"
              style={{ minWidth: 0 }}
            >
              {/* Tier label at top */}
              <div className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1 text-center">
                {tier.shortLabel}
              </div>
              {/* Column body */}
              <div
                className="relative w-full flex-1 rounded-lg border overflow-hidden"
                style={{
                  background: 'var(--color-surface-muted)',
                  borderColor: tier.color,
                  borderStyle: isTarget || isSource ? 'solid' : 'dashed',
                  opacity: isTarget || isSource ? 1 : 0.5,
                  transition: 'opacity 300ms ease, border-style 300ms ease',
                }}
              >
                {showBlock && (
                  <div
                    className="absolute left-1 right-1 rounded flex items-center justify-center overflow-hidden"
                    style={{
                      top: '8px',
                      bottom: isTarget && isLayerParallel ? `${100 - progress * 100}%` : '8px',
                      background: tier.color,
                      opacity: blockOpacity,
                      transition: 'opacity 200ms linear',
                      minHeight: '28px',
                    }}
                  >
                    <div className="text-[10px] font-medium text-white text-center leading-tight px-1">
                      User 17
                      <div className="font-mono text-[9px] opacity-90">
                        {displayedGB.toFixed(2)} GB
                      </div>
                    </div>
                  </div>
                )}
                {/* Downward/upward arrow in source column during transfer */}
                {isTransfer && isSource && (
                  <div
                    className="absolute left-0 right-0 flex items-center justify-center text-[14px] font-bold"
                    style={{
                      bottom: '4px',
                      color: tier.color,
                      animation: 'pulseArrow 1s ease-in-out infinite',
                    }}
                  >
                    {tierOrder.indexOf(source) < tierOrder.indexOf(target) ? '\u2193' : '\u2191'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar for transfer frames */}
      {isTransfer && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] mb-1">
            <span>{frame.transferLabel || 'Transfer in progress'}</span>
            <span className="font-mono text-[var(--color-text)]">
              {Math.round(progress * frame.transferMs)} / {frame.transferMs} ms
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress * 100}%`,
                background: 'var(--color-primary)',
                transition: 'width 80ms linear',
              }}
            />
          </div>
        </div>
      )}
      {!isTransfer && frame.tierId && (
        <div className="mt-3 text-[11px] text-[var(--color-text-muted)]">
          {frame.growing
            ? 'Cache growing as new tokens are generated'
            : 'Block resident in tier'}
        </div>
      )}
      {!frame.tierId && (
        <div className="mt-3 text-[11px] text-[var(--color-text-muted)]">
          Session closed &mdash; cache freed or archived
        </div>
      )}

      <style>{`
        @keyframes pulseArrow {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(2px); }
        }
      `}</style>
    </div>
  );
}

function DataMovementPage() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // progress within the current frame: 0..100
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef(null);

  const frame = MIGRATION_FRAMES[frameIndex];
  const isTransferFrame =
    frame.sourceTier && frame.targetTier && frame.sourceTier !== frame.targetTier && frame.transferMs > 0;
  const isGrowing = !!frame.growing;

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            // advance to next frame, or stop if at the end
            setFrameIndex((i) => {
              if (i >= MIGRATION_FRAMES.length - 1) {
                setIsPlaying(false);
                return i;
              }
              return i + 1;
            });
            return 0;
          }
          return p + 4;
        });
      }, 80);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  // Whenever the user picks a frame manually via buttons or scrubber,
  // jump progress to 100% (end of the frame) so the final state is visible.
  function jumpToFrame(i) {
    setIsPlaying(false);
    setFrameIndex(i);
    setProgress(100);
  }

  function handlePlay() {
    // If at the end, restart
    if (frameIndex >= MIGRATION_FRAMES.length - 1 && progress >= 100) {
      setFrameIndex(0);
      setProgress(0);
    } else if (progress >= 100) {
      // Start the NEXT frame (we're at the end of current)
      setProgress(0);
    }
    setIsPlaying(true);
  }

  const progressRatio = (isTransferFrame || isGrowing) ? progress / 100 : 1;

  return (
    <div>
      {/* Animated tier columns */}
      <Panel>
        <PanelHeader>
          User 17&rsquo;s cache migration &mdash; 30-minute session
        </PanelHeader>
        <TierColumns frame={frame} progress={progressRatio} />

        {/* Frame scrubber */}
        <div className="px-4 pb-4 pt-1 border-t border-[var(--color-border-light)]">
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
              className="px-3 py-1 text-[11px] rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer text-[var(--color-text-secondary)]"
            >
              {isPlaying
                ? 'Pause'
                : frameIndex >= MIGRATION_FRAMES.length - 1 && progress >= 100
                ? 'Replay'
                : 'Play'}
            </button>
            <input
              type="range"
              min={0}
              max={MIGRATION_FRAMES.length - 1}
              value={frameIndex}
              onChange={(e) => jumpToFrame(Number(e.target.value))}
              className="anim-scrubber flex-1"
            />
            <span className="text-[11px] font-mono text-[var(--color-text-muted)] min-w-[120px] text-right">
              Frame {frameIndex + 1}/{MIGRATION_FRAMES.length} &middot; {frame.time}
            </span>
          </div>

          {/* Frame pill row */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {MIGRATION_FRAMES.map((f, i) => (
              <button
                key={f.id}
                onClick={() => jumpToFrame(i)}
                className={`px-2 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                  i === frameIndex
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border-light)] hover:border-[var(--color-border)]'
                }`}
                title={f.title}
              >
                {i + 1}. {f.time}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* Frame details */}
      <Panel className="mt-4">
        <PanelHeader>{frame.title}</PanelHeader>
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]">
              {frame.badge}
            </span>
            <span className="text-[12px] font-mono text-[var(--color-text-muted)]">
              t = {frame.time}
            </span>
            <span className="ml-auto text-[12px] font-mono text-[var(--color-text-muted)]">
              {frame.cacheSize}
            </span>
          </div>
          <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            {frame.description}
          </p>
          {frame.policy && (
            <div className="mt-2 px-3 py-1.5 rounded-md bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-[11px] font-mono text-[var(--color-text)]">
              Policy: {frame.policy}
            </div>
          )}
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
        message="<strong>An insight for infrastructure architects: layer-aware partial eviction.</strong> The layer-by-layer promotion implies something powerful: you don&rsquo;t have to evict ALL of a conversation&rsquo;s cache to the same tier. Early layers (1&ndash;20) could stay in G1 while later layers (21&ndash;80) are demoted to G2. When decode resumes, the GPU begins processing through early layers while later layers are promoted in parallel. The KVBM architecture supports this &mdash; it manages blocks at layer granularity. vLLM is developing support for &ldquo;perforated caches&rdquo; where some layers are present and others must be fetched or recomputed on demand. <strong>Important caveat:</strong> during ACTIVE decode (steady-state token generation), the full cache for ALL layers must be in G1 &mdash; the GPU reads the cache at every layer for every decode step. Layer-aware partial eviction applies to IDLE conversations only. This approach is in active research and early implementation as of 2026."
      />
    </div>
  );
}

// ===========================================================================
// Page 4 — "Inside the KVBM" (animated state machine on click)
// ===========================================================================

function KvbmPage() {
  const [activeState, setActiveState] = useState(null);

  return (
    <div>
      {/* Three-layer architecture diagram */}
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
              label: 'Memory Management (the core)',
              text: 'Manages block pools across all tiers (G1\u2013G4). Each KV block is a 2D array: [num_layers] x [page_size x inner_dim]. The page_size is configurable (typically 16 tokens per page). Each block holds K,V for 16 tokens across all layers. The KVBM emits CreateEvent/RemoveEvent lifecycle events that storage providers subscribe to.',
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

      {/* Interactive state machine */}
      <Panel className="mt-4">
        <PanelHeader>Block lifecycle state machine</PanelHeader>
        <div className="p-4">
          {/* State pills with arrows */}
          <div className="flex items-center justify-center gap-1 flex-wrap mb-4">
            {BLOCK_LIFECYCLE.map((s, i) => {
              const isActive = activeState === s.state;
              return (
                <div key={s.state} className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveState(isActive ? null : s.state)}
                    className="px-3 py-1.5 text-[12px] rounded-md border cursor-pointer font-medium"
                    style={{
                      background: isActive ? s.color : 'var(--color-surface-muted)',
                      borderColor: s.color,
                      color: isActive ? 'white' : 'var(--color-text)',
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 250ms ease',
                    }}
                  >
                    {s.state}
                  </button>
                  {i < BLOCK_LIFECYCLE.length - 1 && (
                    <span className="text-[var(--color-text-muted)]">&rarr;</span>
                  )}
                </div>
              );
            })}
            <span className="text-[var(--color-text-muted)] ml-1">&rarr; Inactive (loop)</span>
          </div>

          {/* State detail */}
          {activeState ? (
            (() => {
              const s = BLOCK_LIFECYCLE.find((x) => x.state === activeState);
              return (
                <div
                  className="p-3 rounded-lg border"
                  style={{
                    background: 'var(--color-surface-muted)',
                    borderColor: s.color,
                  }}
                >
                  <div
                    className="text-[13px] font-medium mb-1"
                    style={{ color: s.color }}
                  >
                    {s.state}
                  </div>
                  <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                    {s.description}
                  </div>
                  <div className="text-[12px] text-[var(--color-text-muted)] leading-relaxed mt-2 pt-2 border-t border-[var(--color-border-light)]">
                    {s.detail}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-dashed border-[var(--color-border-light)] text-[12px] text-[var(--color-text-muted)] text-center">
              Click a state to see its description.
            </div>
          )}

          {/* All states listed */}
          <div className="mt-3 space-y-1.5">
            {BLOCK_LIFECYCLE.map((s) => (
              <div key={s.state} className="flex gap-2 items-start text-[13px]">
                <span
                  className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium text-white min-w-[72px] text-center"
                  style={{ background: s.color }}
                >
                  {s.state}
                </span>
                <span className="text-[var(--color-text-secondary)] leading-relaxed">
                  {s.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Callout
        type="note"
        message='<strong>When are blocks mutable during decode?</strong> During active decode, each new token appends K,V to the cache. The NEWEST page (the one being filled with the latest tokens) is in Mutable state. All previous pages (full, 16 tokens each) are in Committed state. This means only ONE page per conversation per layer is mutable at any time &mdash; the rest are immutable and could theoretically be demoted even during active decode (though in practice, the full cache is kept in G1 during active generation for performance reasons). When a conversation goes idle, ALL pages transition to Committed, then to Evictable after the idle threshold.'
      />

      <Callout
        type="note"
        message='<strong>Why &ldquo;block&rdquo; and not &ldquo;file&rdquo; or &ldquo;object&rdquo;?</strong> The KVBM&rsquo;s API is block-level: get() and put() on fixed-size blocks identified by coordinates (conversation_id, layer_range, token_range). Files carry filesystem overhead that KV cache does not need. Object stores add HTTP/REST overhead and are optimized for large, immutable blobs. KV blocks are small (~5.2 MB per block for Llama-3 70B with GQA), mutable during decode, and accessed with strict latency requirements. However, KVBM treats G4 (network storage) as an <em>opaque blob store</em> &mdash; it does not dictate the backend&rsquo;s internal organization. Storage providers like Dell, VAST, WEKA, and DDN implement their own optimizations behind the KVBM API.'
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

// ===========================================================================
// Page 5 — "What the storage system sees" (with calculator)
// PRESERVING all Correction 5 content.
// ===========================================================================

function StorageIOPage() {
  const [customKvHeads, setCustomKvHeads] = useState(8);
  const [customDHead, setCustomDHead] = useState(128);
  const [customLayers, setCustomLayers] = useState(80);
  const [customPageSize, setCustomPageSize] = useState(16);
  const [customPrecision, setCustomPrecision] = useState(2);

  const perLayerPerPage =
    customKvHeads * customDHead * 2 * customPrecision * customPageSize;
  const fullBlockSize = perLayerPerPage * customLayers;

  function formatBytes(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  return (
    <div>
      {/* I/O patterns — PRESERVING Correction 5 wording */}
      <Panel>
        <PanelHeader>I/O workload characteristics</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <div>
            <strong className="text-[var(--color-text)]">Write pattern (demotion):</strong>{' '}
            Aggregated chunks combining multiple pages across all model layers. KVBM&rsquo;s
            eviction path writes &ldquo;all model layers of the block size&rdquo; as a single
            sequential transfer. For an 8,000-token conversation on Llama-3 70B at FP8 with
            LMCache-style 256-token chunks, that&rsquo;s roughly{' '}
            <strong className="text-[var(--color-text)]">
              ~32 chunks at ~5 MB each = ~160 MB per chunk batch
            </strong>
            , with ~2.5 GB total. Writes are large and sequential. Writes are{' '}
            <strong className="text-[var(--color-text)]">not latency-critical</strong> &mdash;
            the conversation is already idle. Throughput matters more than latency.
          </div>
          <div>
            <strong className="text-[var(--color-text)]">Read pattern (promotion):</strong>{' '}
            Full conversation&rsquo;s cache transferred as{' '}
            <strong>tens to low hundreds of large sequential chunks</strong>, not thousands
            of small per-page reads. Same ~2.5 GB for 8K tokens on 70B. The read IS{' '}
            <strong className="text-[var(--color-text)]">latency-critical</strong>: the user
            is waiting for their first token. Production systems aggregate pages and layers
            into large chunks specifically to saturate the fabric &mdash; VAST demonstrated 99%
            of 200 Gbps line rate using this pattern.
          </div>
          <div>
            <strong className="text-[var(--color-text)]">Concurrency:</strong> Normal load:
            1&ndash;5 concurrent demotions or promotions. Burst (post-lunch return):
            20&ndash;30 simultaneous promotions across 8 GPUs.
          </div>
        </div>
      </Panel>

      {/* Sizing rule of thumb (Patch 4 applied) */}
      <Panel className="mt-4">
        <PanelHeader>Sizing rule of thumb (our scenario)</PanelHeader>
        <div className="p-4 space-y-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <div className="flex gap-2 items-start">
            <span className="flex-shrink-0 font-mono text-[var(--color-text)] min-w-[180px] text-right">
              Peak cache volume:
            </span>
            <span>
              32 x 2.5 GB = <strong className="text-[var(--color-text)]">80 GB</strong>
            </span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="flex-shrink-0 font-mono text-[var(--color-text)] min-w-[180px] text-right">
              Peak demotion write:
            </span>
            <span>
              30 conversations x 2.5 GB / 10 sec ={' '}
              <strong className="text-[var(--color-text)]">7.5 GB/s</strong>
            </span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="flex-shrink-0 font-mono text-[var(--color-text)] min-w-[180px] text-right">
              Peak promotion read:
            </span>
            <span>
              30 conversations x 2.5 GB each, target &lt; 200 ms per conversation. Each
              needs 2.5 / 0.2 = 12.5 GB/s. Aggregate: 30 x 12.5 ={' '}
              <strong className="text-[var(--color-text)]">375 GB/s</strong>. This is why
              WEKA demonstrated 270+ GB/s on 8 GPUs &mdash; the promotion burst during
              post-break user return is the peak bandwidth demand that sizes the storage
              system. Meeting 375 GB/s may require multiple storage nodes or tiers working
              in parallel.
            </span>
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
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                    {row.implication}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Block size table (Patch 3) — PRESERVING "KV / layer / page" column label */}
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
                <th className="px-3 py-2 text-right">KV / layer / page</th>
                <th className="px-3 py-2 text-right">Full block</th>
              </tr>
            </thead>
            <tbody>
              {BLOCK_SIZE_TABLE.map((row) => (
                <tr
                  key={row.model}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">
                    {row.model}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.kvHeads}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.dHead}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.layers}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text)]">
                    {row.perLayerPerPage}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium text-[var(--color-text)]">
                    {row.blockSize}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <InfoBox>
          At FP8 (1 byte per number): all values halve. Llama-3 70B: 2.56 MB per block. At
          INT4 (0.5 bytes): all values quarter. Llama-3 70B: 1.28 MB per block.
        </InfoBox>
        <InfoBox>
          <strong>The columns above describe structural decomposition</strong> &mdash; how
          one block of 16 tokens (the KVBM page size) breaks down per layer. They are{' '}
          <em>not</em> network transfer units. Production systems (KVBM, Dell, WEKA,
          VAST, LMCache) aggregate multiple pages and all model layers into much larger
          sequential chunks. LMCache&rsquo;s default is 256 tokens per chunk &mdash; tens to
          low hundreds of large chunks per conversation, not thousands of small
          per-layer-per-page reads. We&rsquo;ll see why this matters in Stop 15 (the
          fabric).
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message="<strong>Key observation:</strong> The block size difference across Llama-3 8B, 70B, and 405B comes entirely from the number of layers (32 vs 80 vs 126). The KV-per-layer contribution is identical across the three sizes because they share the same GQA configuration (8 KV heads, 128 d_head). This mirrors the KV cache per-token finding from Stop 8: bigger models have bigger caches because of depth, not wider heads. <strong>DeepSeek-V3 (MLA)</strong> is notably different: its Multi-Head Latent Attention compresses K,V into a smaller latent space, producing blocks roughly 2.5x smaller &mdash; the compression approach we will explore in Stop 14."
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
              <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                KV Heads
              </label>
              <input
                type="range"
                min={1}
                max={64}
                value={customKvHeads}
                onChange={(e) => setCustomKvHeads(Number(e.target.value))}
                className="anim-scrubber w-full"
              />
              <div className="text-[11px] font-mono text-[var(--color-text)] text-center mt-1">
                {customKvHeads}
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                d_head
              </label>
              <input
                type="range"
                min={32}
                max={1024}
                step={32}
                value={customDHead}
                onChange={(e) => setCustomDHead(Number(e.target.value))}
                className="anim-scrubber w-full"
              />
              <div className="text-[11px] font-mono text-[var(--color-text)] text-center mt-1">
                {customDHead}
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                Layers
              </label>
              <input
                type="range"
                min={8}
                max={200}
                value={customLayers}
                onChange={(e) => setCustomLayers(Number(e.target.value))}
                className="anim-scrubber w-full"
              />
              <div className="text-[11px] font-mono text-[var(--color-text)] text-center mt-1">
                {customLayers}
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                Page Size
              </label>
              <input
                type="range"
                min={1}
                max={64}
                value={customPageSize}
                onChange={(e) => setCustomPageSize(Number(e.target.value))}
                className="anim-scrubber w-full"
              />
              <div className="text-[11px] font-mono text-[var(--color-text)] text-center mt-1">
                {customPageSize}
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                Precision
              </label>
              <select
                value={customPrecision}
                onChange={(e) => setCustomPrecision(parseFloat(e.target.value))}
                className="w-full px-2 py-1.5 text-[12px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
              >
                <option value={2}>FP16</option>
                <option value={1}>FP8</option>
                <option value={0.5}>INT4</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-[13px] pt-2 border-t border-[var(--color-border-light)]">
            <div>
              <span className="text-[var(--color-text-muted)]">KV per layer per page: </span>
              <strong className="text-[var(--color-text)] font-mono">
                {formatBytes(perLayerPerPage)}
              </strong>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)]">Full block size: </span>
              <strong className="text-[var(--color-text)] font-mono">
                {formatBytes(fullBlockSize)}
              </strong>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)]">Blocks per GB: </span>
              <strong className="text-[var(--color-text)] font-mono">
                {fullBlockSize > 0
                  ? Math.floor((1024 * 1024 * 1024) / fullBlockSize).toLocaleString()
                  : '\u2014'}
              </strong>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-[var(--color-text-muted)] italic leading-relaxed">
            Note: these are <strong>structural decomposition values</strong>, not transfer
            units. Production systems aggregate multiple pages and all layers into much
            larger sequential chunks (LMCache default: 256 tokens per chunk, ~5 MB for
            Llama-3 70B at FP8) to saturate network bandwidth.
          </div>
        </div>
      </Panel>

      {/* Patch 2: Local SSD vs. ICMS note */}
      <Callout
        type="note"
        message="<strong>A note on local SSD vs. ICMS performance.</strong> The generic bandwidth numbers (14 GB/s per NVMe drive vs. 50 GB/s RDMA) suggest ICMS is always faster for promotion. In practice, the comparison is more nuanced. <strong>Optimized local SSD solutions</strong> can aggregate multiple drives and use GPUDirect Storage (GDS) to bypass the CPU entirely &mdash; WEKA&rsquo;s Augmented Memory Grid demonstrates 270+ GB/s aggregate read throughput and 938,000 tokens/second retrieval on 8x H100, and Dell&rsquo;s Lightning platform targets similar high-throughput local flash. With 4&ndash;8 NVMe drives per server and GDS, local SSD promotion can approach or exceed basic RDMA throughput. <strong>ICMS/CMX adds value beyond raw bandwidth:</strong> the cache becomes pod-shared (any GPU can access any cache), enabling workload migration and prefix deduplication that local SSD cannot provide. The performance advantage of ICMS is in the SHARING, not necessarily in per-node bandwidth. The right comparison is optimized local SSD (per-server, private) vs. ICMS (pod-level, shared). Each has use cases."
      />
    </div>
  );
}

// ===========================================================================
// Page 6 — "Cache sharing" (two-panel comparison + network path)
// ===========================================================================

function CacheSharingPage() {
  return (
    <div>
      {/* Without vs. with shared cache */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader>Without shared cache (Stops 11&ndash;12 model)</PanelHeader>
          <div className="p-4 space-y-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            <p>
              User 17&rsquo;s cache lives on Decode GPU 3. Only GPU 3 can serve User 17.
            </p>
            <p>
              If GPU 3 is overloaded and GPU 5 has spare capacity, User 17 cannot be moved
              without recomputing the entire cache.
            </p>
            <p>If GPU 3 fails, User 17&rsquo;s cache is lost. Full recomputation required.</p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader>With shared cache (ICMS / G3.5)</PanelHeader>
          <div className="p-4 space-y-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            <p>
              User 17&rsquo;s cache is in ICMS, accessible by{' '}
              <strong className="text-[var(--color-text)]">any GPU</strong> in the pod.
            </p>
            <p>
              If GPU 3 is overloaded, the Smart Router can direct User 17&rsquo;s next
              request to GPU 5, which pulls the cache from ICMS. No recomputation.
            </p>
            <p>
              If GPU 3 fails, the cache survives in ICMS. Any GPU picks up the
              conversation.
            </p>
            <p>
              System prompts and shared prefixes are stored{' '}
              <strong className="text-[var(--color-text)]">once</strong> in ICMS and served
              to all GPUs on demand.
            </p>
          </div>
        </Panel>
      </div>

      {/* Network demand */}
      <Panel className="mt-4">
        <PanelHeader>Network demand for cache sharing</PanelHeader>
        <div className="p-4 space-y-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>When GPU 5 needs to pull User 17&rsquo;s cache from ICMS:</p>
          <div className="space-y-1 pl-4 font-mono text-[12px] text-[var(--color-text)]">
            <div>8K-token cache: &nbsp; 2.5 GB at 50 GB/s Spectrum-X RDMA = ~50 ms</div>
            <div>32K-token cache: 10 GB at 50 GB/s = ~200 ms</div>
          </div>
          <p>
            This transfer happens on the Spectrum-X Ethernet fabric between compute nodes
            and ICMS enclosures &mdash; NOT on NVLink (which only connects GPUs within a
            node) and NOT on the PCIe bus (which connects GPU to local CPU/SSD).
          </p>
        </div>
      </Panel>

      {/* Network path diagram */}
      <Panel className="mt-4">
        <PanelHeader>The network path for ICMS access</PanelHeader>
        <div className="p-4">
          {/* Horizontal flow diagram */}
          <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
            {[
              { label: 'GPU', sub: 'G1 HBM', color: 'var(--color-teal)' },
              { label: 'ConnectX', sub: 'SuperNIC', color: 'var(--color-blue)' },
              { label: 'Spectrum-X', sub: 'Switch', color: 'var(--color-primary)' },
              { label: 'BlueField-4', sub: 'DPU', color: 'var(--color-amber)' },
              { label: 'NVMe Flash', sub: 'ICMS', color: 'var(--color-red)' },
            ].map((box, i, arr) => (
              <div key={box.label} className="flex items-center">
                <div
                  className="flex-shrink-0 rounded-lg border px-3 py-2 text-center"
                  style={{
                    borderColor: box.color,
                    background: 'var(--color-surface-muted)',
                    minWidth: '90px',
                  }}
                >
                  <div
                    className="text-[12px] font-medium"
                    style={{ color: box.color }}
                  >
                    {box.label}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    {box.sub}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <span className="text-[18px] text-[var(--color-text-muted)] px-1">
                    &rarr;
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-[10px] text-[var(--color-text-muted)] mt-1 italic">
            Same path in reverse for reads &larr;
          </div>

          <div className="mt-4 space-y-1.5 text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
            <div>
              <strong className="text-[var(--color-text)]">GPU</strong> initiates the
              transfer via NIXL
            </div>
            <div>
              <strong className="text-[var(--color-text)]">ConnectX SuperNIC</strong>{' '}
              handles the RDMA protocol
            </div>
            <div>
              <strong className="text-[var(--color-text)]">Spectrum-X</strong> provides the
              lossless, low-jitter Ethernet fabric
            </div>
            <div>
              <strong className="text-[var(--color-text)]">BlueField-4 DPU</strong>{' '}
              terminates the RDMA and handles KV I/O on the ICMS side &mdash;
              hardware-accelerated data plane, not software on a general-purpose CPU
            </div>
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

// ===========================================================================
// Page 7 — "What waits on what"
// ===========================================================================

function BlockingPage() {
  return (
    <div>
      {/* Step-by-step scenario */}
      <Panel>
        <PanelHeader>Scenario: User 17 sends a follow-up. Cache is in G2 (DRAM).</PanelHeader>
        <div className="p-4 space-y-2">
          {BLOCKING_STEPS.map((step) => {
            const colorClasses = {
              teal: 'bg-[var(--color-teal-bg)] border-[var(--color-teal)] text-[var(--color-teal-text)]',
              amber: 'bg-[var(--color-amber-bg)] border-[var(--color-amber)] text-[var(--color-amber-text)]',
            };
            return (
              <div
                key={step.num}
                className="flex gap-3 items-start p-2.5 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                  {step.num}
                </span>
                <div className="min-w-0 text-[13px] flex-1">
                  <div className="font-medium text-[var(--color-text)] flex flex-wrap items-center gap-2">
                    <span>{step.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${colorClasses[step.blockColor]}`}
                    >
                      {step.blocking}
                    </span>
                  </div>
                  <div className="text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                    {step.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* What-blocks-what table */}
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
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">
                    {row.event}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                    {row.user17}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                    {row.otherUsers}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                    {row.prefillPool}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <InfoBox>
        <strong className="text-[var(--color-text)]">
          What if the cache is in G3 (SSD) or G3.5 (ICMS)?
        </strong>{' '}
        Same flow, but the initial transfer takes longer (500&ndash;800 ms for SSD, ~200 ms
        for ICMS). During this time, other users&rsquo; decode continues normally. The
        longer transfer means User 17 sees a longer TTFT, but no other user is affected.
      </InfoBox>

      <Callout
        type="warn"
        message="<strong>A full cache miss is the worst case.</strong> User 17&rsquo;s request is treated as a new conversation. The Smart Router sends it to the Prefill Pool. Full prefill runs from scratch: all prompt tokens through all 80 layers. Cost: ~2,000 ms of GPU compute. The prefill GPU is fully occupied and cannot process other prefill requests. After prefill, the cache transfers to the Decode Pool via NIXL, and decode begins. This is why maximizing cache hit rate is the central economic metric."
      />
    </div>
  );
}

// ===========================================================================
// Page 8 — Competitive landscape
// ===========================================================================

function CompetitionPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>NVIDIA (Dynamo + KVBM + NIXL + CMX/ICMS)</PanelHeader>
        <div className="p-4 space-y-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Most complete stack: disaggregated serving, KV-aware routing, multi-tier cache
            management, hardware-accelerated ICMS. BlueField-4 DPU provides dedicated KV
            I/O plane. Tightly integrated with Spectrum-X networking.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Storage partners:</strong> VAST,
            WEKA, DDN, Dell, NetApp, Cohesion, Hammerspace, Pliops.
          </p>
          <p className="text-[12px] text-[var(--color-text-muted)]">
            Status: Dynamo GA, KVBM V2 in production, ICMS/CMX shipping with Rubin platform.
          </p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>AMD (ROCm 7.0 + vLLM)</PanelHeader>
        <div className="p-4 space-y-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            ROCm 7.0 announced distributed inference support (prefill/decode separation)
            at Advancing AI 2025. MI300X/MI325X/MI355X offer competitive single-node
            inference performance, especially memory-bandwidth-per-dollar.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Gap:</strong> No equivalent to
            ICMS, BlueField-4, or the Spectrum-X KV cache data path. Currently lacks native
            KV cache tiering to SSD/storage, smart routing, or production-grade equivalent
            to Dynamo&rsquo;s KVBM. RCCL trails NCCL in features and optimization. Relies
            on community projects (vLLM, SGLang) for inference serving. Helios / MI450X
            expected 2H 2026 but KV cache infrastructure details not yet public.
          </p>
        </div>
      </Panel>

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
              desc: 'High-performance zero-copy data transfer library, originally from the Mooncake serving platform. Now integrates as a NIXL backend plugin. Used by SGLang for KV cache transfer in their DeepSeek-R1 disaggregated serving deployment.',
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

// ===========================================================================
// Page 9 — Economics / cache hit rate
// ===========================================================================

function EconomicsPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The 10x cost difference explained</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <div>
            <strong className="text-[var(--color-text)]">Cache hit (data found in a tier):</strong>{' '}
            Retrieve the cached K, V vectors from whatever tier they are in. Cost = transfer
            time from that tier.{' '}
            <strong className="text-[var(--color-text)]">Zero GPU compute consumed</strong>{' '}
            &mdash; the transfer is pure data movement over DMA or RDMA, handled by the NIC
            or DPU, not the GPU&rsquo;s compute cores.
          </div>
          <div>
            <strong className="text-[var(--color-text)]">Cache miss (data not found anywhere):</strong>{' '}
            Re-run the entire prompt through prefill. Cost = compute time for all prompt
            tokens through all layers. The prefill GPU is fully occupied during this time
            and cannot serve other prefill requests.
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
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">
                    {row.metric}
                  </td>
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
            AI agents maintain persistent context across many subtasks, tools, and reasoning
            steps. An agent might accumulate 100K+ tokens of context over a multi-step task.
            If that context is evicted and must be recomputed, the agent stalls for seconds
            &mdash; potentially causing cascading delays in a multi-agent workflow.
          </p>
          <p>
            This is why NVIDIA, Dell, WEKA, VAST, and others are investing heavily in KV cache
            infrastructure.{' '}
            <strong className="text-[var(--color-text)]">
              Context is becoming a first-class infrastructure resource
            </strong>
            , as fundamental to inference as model weights.
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

// ===========================================================================
// Page 10 — Calculator / numbers
// ===========================================================================

function CalculatorPage() {
  return (
    <div>
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
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.perGPU}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-text)]">
                    {row.eightGPUs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

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
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">
                    {row.tier}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.capacity}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text)]">
                    {row.usersAt8K}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[12px] text-[var(--color-text-secondary)]">
                    {row.latency}
                  </td>
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

// ===========================================================================
// Page 11 — Summary / bridge
// ===========================================================================

function SummaryPage() {
  return (
    <div>
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
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">
                    {row.tier}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[12px] text-[var(--color-text-secondary)]">
                    {row.capacity}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[12px] text-[var(--color-text)]">
                    {row.latency}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                    {row.interconnect}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>What this stop established</PanelHeader>
        <div className="p-4 space-y-2">
          {KEY_TAKEAWAYS.map((point, i) => (
            <div key={i} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-[var(--color-text-secondary)] leading-relaxed">
                {point}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Bridge to Stop 14</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Tiering gives us more{' '}
            <strong className="text-[var(--color-text)]">capacity</strong> &mdash; places to
            put the cache. But what if we could make the cache itself{' '}
            <strong className="text-[var(--color-text)]">smaller</strong>? Our 28,000-token
            conversation takes 8.96 GB at FP16. At FP8: 4.48 GB. At INT4: 2.24 GB.
          </p>
          <p>
            Half the size means twice the users per tier, twice the cache hit rate, half the
            transfer time between tiers, half the network bandwidth consumed during
            promotion.
          </p>
          <p>
            GQA already reduced the cache by 8x compared to full MHA (Stop 8).
            DeepSeek&rsquo;s MLA compresses further by projecting K,V into a smaller latent
            space. Quantization shrinks each number&rsquo;s precision. Token eviction throws
            away the least important entries entirely.
          </p>
          <p>
            For our scenario, compressing from FP16 to FP8 would double our effective
            capacity at every tier &mdash; turning 144 active users into 288, and cutting
            every promotion transfer time in half.{' '}
            <strong className="text-[var(--color-text)]">
              Stop 14 explores how to make the cache as small as possible &mdash; and what
              accuracy you trade for each reduction.
            </strong>
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

// ===========================================================================
// Main component — page router
// ===========================================================================

export default function MemoryHierarchy() {
  const [pageIndex, setPageIndex] = useState(0);

  const page = PAGES[pageIndex];
  const narration = NARRATIONS[page.id] || '';

  const goToPage = useCallback((idx) => {
    setPageIndex(idx);
  }, []);

  const prevPage = useCallback(() => {
    goToPage(Math.max(0, pageIndex - 1));
  }, [pageIndex, goToPage]);

  const nextPage = useCallback(() => {
    goToPage(Math.min(PAGES.length - 1, pageIndex + 1));
  }, [pageIndex, goToPage]);

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
      {/* Narration (html passed directly via dangerouslySetInnerHTML) */}
      <div
        className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed
                   px-4 py-3 bg-[var(--color-surface-muted)] rounded-lg
                   border border-[var(--color-border-light)] mb-5"
        dangerouslySetInnerHTML={{ __html: narration }}
      />

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

      <PageNav
        pageIndex={pageIndex}
        totalPages={PAGES.length}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        pageLabel={`Page ${pageIndex + 1} of ${PAGES.length}: ${page.label}`}
      />

      <div className="text-center mt-3 mb-2 text-[10px] text-[var(--color-text-muted)]">
        PageDown / PageUp to turn pages
      </div>
    </div>
  );
}
