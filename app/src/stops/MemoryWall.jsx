import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  PAGES,
  NARRATIONS,
  SCENARIO_CALCULATOR,
  SCENARIO_DEFAULTS,
  OVER_ALLOCATION,
  FRAGMENTATION_BLOCKS,
  GROWTH_SCENARIO,
  BATCH_UTILIZATION,
  BATCHING_ECONOMICS,
  STATIC_BATCHING_USERS,
  STATIC_UTILIZATION_STEPS,
  STATIC_BATCHING_WASTE,
  CONTINUOUS_BATCHING_EVENTS,
  CONTINUOUS_VS_STATIC,
  CONV_COLORS,
  TRADITIONAL_ALLOCATION,
  TRADITIONAL_TOTALS,
  PAGED_ALLOCATION,
  PAGED_TOTALS,
  PAGED_VISUAL_GRID_SIZE,
  MEMORY_OPTIONS,
  SUMMARY_TABLE,
  BRIDGE_CALC,
} from '../data/stop11Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

/* ================================================================
   ACT 2 INTRO — "Welcome to Act 2"
   Sets up the running scenario that threads through Stops 11-17
   ================================================================ */

function Act2IntroPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The scenario</PanelHeader>
        <InfoBox>
          Every concept in Act 2 is grounded in a single concrete deployment
          scenario that will thread through all seven remaining stops. Here it is:
        </InfoBox>
        <div className="px-4 py-4 border-b border-[var(--color-border-light)]">
          <div className="p-4 rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary-bg)]">
            <div className="text-[14px] leading-relaxed text-[var(--color-text)]">
              <strong>Your company is deploying Llama-3 70B</strong> to serve an
              internal AI assistant for 500 engineers. Peak concurrent usage is{' '}
              <strong>32 simultaneous conversations</strong>. Average context length
              is <strong>8K tokens</strong>, with spikes to 32K for document analysis.
              You have a budget of <strong>8&times; H100 GPUs</strong> (640 GB total HBM).
            </div>
            <div className="mt-3 text-[14px] font-medium text-[var(--color-primary-text)]">
              How do you serve this workload?
            </div>
          </div>
        </div>
        <InfoBox>
          Each stop adds a new dimension to this scenario. By Stop 17, you will
          have designed a complete inference infrastructure.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>What each stop contributes</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Stop</th>
                <th className="px-4 py-2 text-left">Adds</th>
              </tr>
            </thead>
            <tbody className="text-[var(--color-text-secondary)]">
              {[
                ['11 (this stop)', 'Users + GPU memory management + batching'],
                ['12', 'Split into prefill + decode pools + network pipe'],
                ['13', 'KV cache tier column (HBM \u2192 DRAM \u2192 SSD \u2192 network storage)'],
                ['14', 'Compression controls (GQA/MLA toggle, quantization slider)'],
                ['15', 'Network pipe labeled with protocols (RDMA, CXL, NVMe-oF)'],
                ['16', 'Routing and scheduling layer'],
                ['17', 'Full simulator with all layers connected'],
              ].map(([stop, adds], i) => (
                <tr key={i} className={`border-b border-[var(--color-border-light)] ${i === 0 ? 'bg-[var(--color-primary-bg)] font-medium text-[var(--color-text)]' : ''}`}>
                  <td className="px-4 py-2 whitespace-nowrap">{stop}</td>
                  <td className="px-4 py-2">{adds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>Act 2 is where your expertise kicks in.</strong> The concepts ahead &mdash; memory tiering, paging, batching, network fabric, routing &mdash; are the same problems you solve in storage and networking infrastructure, applied to a new domain. The vocabulary is different, but the engineering principles are the same."
      />
    </div>
  );
}

/* ================================================================
   PAGE 2 — "The math says it should work"
   Interactive calculator, green indicator, false sense of security
   ================================================================ */

function MathWorksPage() {
  const [users, setUsers] = useState(SCENARIO_DEFAULTS.users);
  const [contextK, setContextK] = useState(SCENARIO_DEFAULTS.contextPerUser / 1000);

  const cachePerUser = (SCENARIO_DEFAULTS.kvPerToken_KB * contextK * 1000) / 1e6; // GB
  const totalCache = cachePerUser * users;
  const totalMemory = SCENARIO_DEFAULTS.weightsFP4_GB + totalCache;
  const available = SCENARIO_DEFAULTS.gpuCount * SCENARIO_DEFAULTS.gpuMemory_GB;
  const utilization = ((totalMemory / available) * 100).toFixed(1);
  const fits = totalMemory <= available;

  const rows = [
    { label: 'Model',              value: SCENARIO_DEFAULTS.model,          source: 'Scenario' },
    { label: 'Weights (FP4)',      value: `${SCENARIO_DEFAULTS.weightsFP4_GB} GB`, source: 'Stop 8' },
    { label: 'KV cache per token', value: `${SCENARIO_DEFAULTS.kvPerToken_KB} KB`, source: 'Stop 8/9' },
    { label: 'Users',              value: String(users),                    source: 'Scenario', isInput: true },
    { label: 'Context per user',   value: `${contextK}K tokens`,           source: 'Scenario', isInput: true },
    { label: 'Cache per user',     value: `${cachePerUser.toFixed(1)} GB`, source: `${SCENARIO_DEFAULTS.kvPerToken_KB} KB \u00d7 ${contextK}K` },
    { label: 'Total cache',        value: `${totalCache.toFixed(1)} GB`,   source: `${cachePerUser.toFixed(1)} GB \u00d7 ${users}` },
    { label: 'Total memory',       value: `${totalMemory.toFixed(1)} GB`,  source: `${SCENARIO_DEFAULTS.weightsFP4_GB} + ${totalCache.toFixed(1)}` },
    { label: `Available (${SCENARIO_DEFAULTS.gpuCount}\u00d7 H100)`, value: `${available} GB`, source: `${SCENARIO_DEFAULTS.gpuCount} \u00d7 ${SCENARIO_DEFAULTS.gpuMemory_GB}` },
    { label: 'Utilization',        value: `${utilization}%`,               source: `${totalMemory.toFixed(0)} / ${available}`, highlight: true },
  ];

  return (
    <div>
      <Panel>
        <PanelHeader>Scenario calculator</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Parameter</th>
                <th className="px-4 py-2 text-right">Value</th>
                <th className="px-4 py-2 text-left">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.highlight ? (fits ? 'bg-[var(--color-teal-bg)]' : 'bg-[var(--color-red-bg)]') : ''
                  }`}
                >
                  <td className={`px-4 py-2 ${row.highlight ? 'font-medium text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}>
                    {row.label}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {row.label === 'Users' ? (
                      <input
                        type="range"
                        min={1}
                        max={128}
                        value={users}
                        onChange={(e) => setUsers(Number(e.target.value))}
                        className="anim-scrubber w-20 align-middle mr-2"
                        style={{ verticalAlign: 'middle' }}
                      />
                    ) : row.label === 'Context per user' ? (
                      <input
                        type="range"
                        min={1}
                        max={128}
                        value={contextK}
                        onChange={(e) => setContextK(Number(e.target.value))}
                        className="anim-scrubber w-20 align-middle mr-2"
                        style={{ verticalAlign: 'middle' }}
                      />
                    ) : null}
                    <span className={`font-mono ${row.highlight ? 'font-bold' : ''} ${
                      row.highlight
                        ? (fits ? 'text-[var(--color-teal-text)]' : 'text-[var(--color-red-text)]')
                        : 'text-[var(--color-text-secondary)]'
                    }`}>
                      {row.value}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)] text-[12px]">
                    {row.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Utilization bar */}
        <div className="px-4 pb-4 pt-2">
          <div className="h-8 rounded-lg border border-[var(--color-border-light)] overflow-hidden bg-[var(--color-surface-muted)] relative">
            <div
              className="h-full flex items-center justify-center text-[11px] font-medium text-white"
              style={{
                width: `${Math.min(parseFloat(utilization), 100)}%`,
                background: fits ? 'var(--color-teal)' : 'var(--color-red)',
                transition: 'width 300ms ease, background 300ms ease',
              }}
            >
              {parseFloat(utilization) > 8 ? `${utilization}%` : ''}
            </div>
            {parseFloat(utilization) <= 8 && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[var(--color-text-muted)]">
                {utilization}%
              </span>
            )}
          </div>
        </div>
      </Panel>

      {fits ? (
        <Callout
          type="good"
          message={`<strong>Everything fits.</strong> ${totalMemory.toFixed(0)} GB needed across ${available} GB available &mdash; only ${utilization}% utilization. On paper, this is comfortable.`}
        />
      ) : (
        <Callout
          type="warn"
          message={`<strong>Doesn&rsquo;t fit!</strong> ${totalMemory.toFixed(0)} GB needed but only ${available} GB available. You&rsquo;d need more GPUs or less cache.`}
        />
      )}

      {fits && (
        <Callout
          type="warn"
          message="<strong>But paper is not production.</strong> Try moving the context slider above to 64K and watch the utilization change. Even the simple arithmetic starts to strain &mdash; and that&rsquo;s before we account for real-world complexity. The next page reveals three problems that turn this comfortable margin into a crisis."
        />
      )}
    </div>
  );
}

/* ================================================================
   PAGE 2 — "Why the math lies"
   Three distinct visual problems with colored bars
   ================================================================ */

function MathLiesPage() {
  // Interactive growth bar
  const [growthPct, setGrowthPct] = useState(0);
  const currentTokens = GROWTH_SCENARIO.initialTokens + (GROWTH_SCENARIO.spikeTokens - GROWTH_SCENARIO.initialTokens) * (growthPct / 100);
  const currentGB = (currentTokens * SCENARIO_DEFAULTS.kvPerToken_KB) / 1e6;

  return (
    <div>
      {/* Problem 1: Over-allocation */}
      <Panel>
        <PanelHeader>Problem 1 &mdash; Over-allocation</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Each conversation is allocated a contiguous block sized for the{' '}
            <strong className="text-[var(--color-text)]">maximum</strong> possible context
            (128K tokens = 40 GB). But the actual conversation only uses 8K tokens (2.5 GB).
            The allocated block is <strong className="text-[var(--color-text)]">94% empty</strong>.
          </p>
        </div>

        {/* GPU memory bar showing weights + one conversation */}
        <div className="px-4 pb-3">
          <div className="text-[11px] text-[var(--color-text-muted)] mb-1">Single H100 (80 GB)</div>
          <div className="rounded-lg border border-[var(--color-border-light)] overflow-hidden">
            <div className="flex items-center h-12">
              {/* Weights */}
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium text-white border-r border-white/20"
                style={{ width: `${(35 / 80) * 100}%`, background: 'var(--color-primary)' }}
              >
                Weights 35 GB
              </div>
              {/* Used cache */}
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                style={{ width: `${(2.5 / 80) * 100}%`, background: 'var(--color-teal)' }}
              >
              </div>
              {/* Wasted allocation */}
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium"
                style={{ width: `${(37.5 / 80) * 100}%`, background: 'var(--color-red-bg)', color: 'var(--color-red-text)' }}
              >
                37.5 GB wasted
              </div>
              {/* Remaining */}
              <div
                className="h-full flex items-center justify-center text-[10px]"
                style={{ width: `${(5 / 80) * 100}%`, background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)' }}
              >
                5 GB
              </div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-1">
            <span>2.5 GB actually used</span>
            <span>40 GB allocated for one conversation</span>
          </div>
        </div>

        <InfoBox>
          With this allocation strategy, a single H100 can only serve{' '}
          <strong>one conversation</strong> (40 GB allocation + 35 GB weights = 75 GB,
          nearly full). Our 8 GPUs serve 8 users, not 32.
        </InfoBox>
      </Panel>

      {/* Problem 2: Fragmentation */}
      <Panel className="mt-4">
        <PanelHeader>Problem 2 &mdash; Fragmentation</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Even with conservative allocation (say, 8K max per conversation), when
            conversations finish at different times, they leave{' '}
            <strong className="text-[var(--color-text)]">holes</strong> in memory.
            New conversations may not fit in the holes.
          </p>
        </div>

        <div className="px-4 pb-4">
          <div className="rounded-lg border border-[var(--color-border-light)] overflow-hidden">
            <div className="flex items-center h-12">
              {FRAGMENTATION_BLOCKS.map((block) => (
                <div
                  key={block.id}
                  className="h-full flex items-center justify-center text-[10px] font-medium"
                  style={{
                    width: `${block.widthPct}%`,
                    background: block.type === 'active' ? block.color : 'var(--color-surface-muted)',
                    color: block.type === 'active' ? 'white' : 'var(--color-text-muted)',
                    borderRight: '1px solid var(--color-surface)',
                  }}
                >
                  {block.type === 'active' ? `Conv ${block.id}` : 'free'}
                </div>
              ))}
            </div>
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
            30% free total &mdash; but no single gap large enough for a new 12K-token conversation
          </div>
          {/* Incoming request indicator */}
          <div className="mt-2 p-2 rounded border border-dashed text-[11px] flex items-center gap-2"
            style={{ borderColor: 'var(--color-red)', background: 'var(--color-red-bg)', color: 'var(--color-red-text)' }}>
            <span style={{ fontSize: '14px' }}>&#x2717;</span>
            New conversation needs 12K tokens (3.75 GB) &mdash; no contiguous gap is large enough, even though total free memory is sufficient.
          </div>
        </div>
      </Panel>

      {/* Problem 3: Unpredictable growth */}
      <Panel className="mt-4">
        <PanelHeader>Problem 3 &mdash; Unpredictable growth</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            A conversation allocated for 8K tokens suddenly needs 32K (the user uploaded
            a document mid-conversation). The contiguous block can&rsquo;t grow &mdash;
            there&rsquo;s another conversation&rsquo;s block right next to it.
          </p>
        </div>

        {/* Interactive growth bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] text-[var(--color-text-muted)] min-w-[60px]">Growth:</span>
            <input
              type="range"
              min={0}
              max={100}
              value={growthPct}
              onChange={(e) => setGrowthPct(Number(e.target.value))}
              className="anim-scrubber flex-1"
            />
            <span className="text-[11px] font-mono text-[var(--color-text-secondary)] min-w-[80px] text-right">
              {(currentTokens / 1000).toFixed(1)}K tokens
            </span>
          </div>

          <div className="rounded-lg border border-[var(--color-border-light)] overflow-hidden">
            <div className="flex items-center h-10">
              {/* Allocated block (8K = 2.5 GB) */}
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium text-white relative"
                style={{ width: '25%', background: 'var(--color-teal)' }}
              >
                Allocated: 2.5 GB
              </div>
              {/* Overflow if growing beyond allocation */}
              {growthPct > 0 && (
                <div
                  className="h-full flex items-center justify-center text-[10px] font-medium"
                  style={{
                    width: `${Math.min((currentGB - 2.5) / 10 * 25, 50)}%`,
                    background: 'var(--color-red)',
                    color: 'white',
                    transition: 'width 150ms ease',
                  }}
                >
                  {currentGB > 3 ? `+${(currentGB - 2.5).toFixed(1)} GB` : ''}
                </div>
              )}
              {/* Neighbor block */}
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                style={{ width: '25%', background: 'var(--color-blue)' }}
              >
                Next conv
              </div>
              <div
                className="h-full flex-1 flex items-center justify-center text-[10px]"
                style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)' }}
              >
              </div>
            </div>
          </div>
          {growthPct > 10 && (
            <div className="mt-1 text-[11px]" style={{ color: 'var(--color-red-text)' }}>
              Can&rsquo;t grow &mdash; the neighboring conversation&rsquo;s block is in the way.
              Would need to copy the entire cache to a new location.
            </div>
          )}
        </div>
      </Panel>

      <Callout
        type="warn"
        message="Traditional inference systems waste <strong>60&ndash;80%</strong> of allocated KV cache memory through this combination of over-allocation and fragmentation. On our 8&times; H100 cluster, that means 384&ndash;512 GB of our 640 GB is wasted. Instead of serving 32 users comfortably, we&rsquo;re struggling to serve 8."
      />
    </div>
  );
}

/* ================================================================
   PAGE 3 — "Why batching is non-negotiable"
   HTML table + economic argument + per-scenario math
   ================================================================ */

function BatchingWhyPage() {
  const [highlightRow, setHighlightRow] = useState(-1);

  return (
    <div>
      <Panel>
        <PanelHeader>Same weight read, more useful work</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-right">Batch size</th>
                <th className="px-4 py-2 text-right">Weight read</th>
                <th className="px-4 py-2 text-right">Tokens processed</th>
                <th className="px-4 py-2 text-right">GPU compute utilization</th>
              </tr>
            </thead>
            <tbody>
              {BATCH_UTILIZATION.map((row, i) => (
                <tr
                  key={row.batchSize}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 cursor-pointer transition-colors ${
                    highlightRow === i ? 'bg-[var(--color-teal-bg)]' : 'hover:bg-[var(--color-surface-alt)]'
                  }`}
                  onMouseEnter={() => setHighlightRow(i)}
                  onMouseLeave={() => setHighlightRow(-1)}
                >
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-text)]">
                    {row.batchSize} user{row.batchSize > 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.weightRead}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.tokensProcessed}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-3 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${row.utilizationNum}%`,
                            background: row.utilizationNum > 60 ? 'var(--color-teal)' : row.utilizationNum > 20 ? 'var(--color-amber)' : 'var(--color-red)',
                            transition: 'width 300ms ease',
                          }}
                        />
                      </div>
                      <span className="font-mono font-medium text-[var(--color-text)]">
                        {row.utilization}
                      </span>
                      {row.note && (
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          ({row.note})
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Weight read visual */}
        <div className="px-4 pt-2 pb-4">
          <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
            <div className="flex-1 h-6 rounded overflow-hidden bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
              <div className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                style={{ width: '100%', background: 'var(--color-primary)' }}>
                35 GB weight read &mdash; same regardless of batch size
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>The economics of batching</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Same 35 GB read from memory. 128&times; more useful work.{' '}
            <strong className="text-[var(--color-text)]">Batching</strong> means
            processing multiple users&rsquo; tokens through the same weight matrices in a
            single GPU operation. It&rsquo;s the difference between paying{' '}
            <strong className="text-[var(--color-text)]">{BATCHING_ECONOMICS.costSingleUser} per token</strong> and{' '}
            <strong className="text-[var(--color-teal-text)]">{BATCHING_ECONOMICS.costBatched} per token</strong>.
          </p>

          {/* Cost comparison visual */}
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--color-red-bg)' }}>
              <div className="text-[20px] font-bold" style={{ color: 'var(--color-red-text)' }}>{BATCHING_ECONOMICS.costSingleUser}</div>
              <div className="text-[11px]" style={{ color: 'var(--color-red-text)' }}>per token (batch=1)</div>
            </div>
            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--color-teal-bg)' }}>
              <div className="text-[20px] font-bold" style={{ color: 'var(--color-teal-text)' }}>{BATCHING_ECONOMICS.costBatched}</div>
              <div className="text-[11px]" style={{ color: 'var(--color-teal-text)' }}>per token (batch=128)</div>
            </div>
          </div>

          <p>
            But each user in the batch needs their own KV cache in HBM. Adding a user to
            the batch adds {BATCHING_ECONOMICS.cachePerUser_GB} GB (at 8K tokens). The batch size is limited not by
            compute &mdash; the GPU can handle hundreds of tokens per step &mdash; but by{' '}
            <strong className="text-[var(--color-text)]">how many KV caches fit in memory</strong>{' '}
            alongside the weights.
          </p>
          <p>
            This is why KV cache memory management isn&rsquo;t just a technical detail.
            It&rsquo;s the lever that controls batch size, which controls GPU utilization,
            which controls cost per token.
          </p>
        </div>
      </Panel>

      <Callout
        type="note"
        message={`<strong>For our scenario:</strong> With 35 GB weights on one H100 (${BATCHING_ECONOMICS.perGpuAvailable_GB} GB remaining), we can fit ${BATCHING_ECONOMICS.perGpuAvailable_GB} GB / ${BATCHING_ECONOMICS.cachePerUser_GB} GB = ${BATCHING_ECONOMICS.usersPerGpu} users per GPU at 8K tokens. Across 8 GPUs, that&rsquo;s ${BATCHING_ECONOMICS.totalAcross8} users &mdash; well above our 32. But only if we actually <em>use</em> the ${BATCHING_ECONOMICS.perGpuAvailable_GB} GB efficiently, which the naive allocator from the previous page doesn&rsquo;t.`}
      />
    </div>
  );
}

/* ================================================================
   PAGE 4 — "Static batching: feel the pain"
   Animated timeline with utilization meter
   ================================================================ */

function StaticBatchingPage() {
  const maxStep = Math.max(...STATIC_BATCHING_USERS.map((u) => u.finishStep));
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  // Animated step = a percentage of the timeline (0..500 mapped to visual steps)
  const animatedTime = (currentStep / 100) * maxStep;

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 1;
        });
      }, 80);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  const activeUsers = STATIC_BATCHING_USERS.filter((u) => u.finishStep > animatedTime);
  const utilPct = activeUsers.length > 0 ? (activeUsers.length / STATIC_BATCHING_USERS.length) * 100 : 0;

  function handlePlay() {
    if (currentStep >= 100) setCurrentStep(0);
    setIsPlaying(true);
  }

  return (
    <div>
      <Panel>
        <PanelHeader>Four users, one batch &mdash; timeline</PanelHeader>
        <div className="p-4 space-y-3">
          {STATIC_BATCHING_USERS.map((user) => {
            const pct = (user.finishStep / maxStep) * 100;
            const idlePct = 100 - pct;
            const isActive = user.finishStep > animatedTime;
            const isFinished = user.finishStep <= animatedTime;

            return (
              <div key={user.id} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-[var(--color-text)]">
                    User {user.id}
                  </span>
                  <span className="text-[var(--color-text-muted)]">
                    {user.generateTokens} tokens &mdash; finishes at step {user.finishStep}
                    {isFinished && ' \u2713'}
                  </span>
                </div>
                <div className="flex h-8 rounded overflow-hidden border border-[var(--color-border-light)] relative">
                  <div
                    className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                    style={{
                      width: `${pct}%`,
                      background: user.color,
                      opacity: isActive ? 1 : 0.4,
                      transition: 'opacity 300ms ease',
                    }}
                  >
                    {user.generateTokens} tokens
                  </div>
                  {idlePct > 0 && (
                    <div
                      className="h-full flex items-center justify-center text-[10px]"
                      style={{
                        width: `${idlePct}%`,
                        background: 'var(--color-red-bg)',
                        color: 'var(--color-red-text)',
                        opacity: isFinished ? 1 : 0.3,
                        transition: 'opacity 300ms ease',
                      }}
                    >
                      {idlePct > 15 ? 'idle' : ''}
                    </div>
                  )}
                  {/* Playhead */}
                  {currentStep > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5"
                      style={{
                        left: `${(animatedTime / maxStep) * 100}%`,
                        background: 'var(--color-text)',
                        opacity: 0.6,
                        transition: 'left 80ms linear',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Animation controls */}
          <div className="pt-3 border-t border-[var(--color-border-light)]">
            <div className="flex items-center gap-3">
              <button
                onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
                className="px-3 py-1 text-[11px] rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer text-[var(--color-text-secondary)]"
              >
                {isPlaying ? 'Pause' : currentStep >= 100 ? 'Replay' : 'Play'}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={currentStep}
                onChange={(e) => { setIsPlaying(false); setCurrentStep(Number(e.target.value)); }}
                className="anim-scrubber flex-1"
              />
              <span className="text-[11px] font-mono text-[var(--color-text-muted)] min-w-[80px] text-right">
                Step {Math.round(animatedTime)} / {maxStep}
              </span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Narrative explanation between timeline and utilization */}
      <Callout
        type="note"
        message="<strong>Watch what happens.</strong> All four users start together and the GPU is fully busy at step 1. After step 20, User A is done &mdash; but their slot sits idle for 480 more steps. User D finishes at step 30, then User B at step 50. Now three slots are idle. The GPU spends the next 450 steps generating tokens only for User C while three slots waste memory and compute."
      />

      {/* Utilization meter */}
      <Panel className="mt-4">
        <PanelHeader>GPU utilization over time</PanelHeader>
        <div className="p-4 space-y-2">
          {/* Animated utilization bar */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[12px] text-[var(--color-text-muted)] min-w-[90px]">Current:</span>
            <div className="flex-1 h-6 bg-[var(--color-surface-muted)] rounded overflow-hidden border border-[var(--color-border-light)]">
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium text-white rounded"
                style={{
                  width: `${utilPct}%`,
                  background: utilPct > 75 ? 'var(--color-teal)' : utilPct > 50 ? 'var(--color-blue)' : utilPct > 25 ? 'var(--color-amber)' : 'var(--color-red)',
                  transition: 'width 300ms ease, background 300ms ease',
                }}
              >
                {activeUsers.length}/{STATIC_BATCHING_USERS.length} active &mdash; {utilPct.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Step breakdown bars */}
          {STATIC_UTILIZATION_STEPS.map((step) => {
            const barColor = step.pct === 100 ? 'var(--color-teal)' : step.pct >= 75 ? 'var(--color-blue)' : step.pct >= 50 ? 'var(--color-amber)' : 'var(--color-red)';
            return (
              <div key={step.range} className="flex items-center gap-3 text-[12px]">
                <span className="min-w-[100px] text-[var(--color-text-muted)]">{step.range}</span>
                <div className="flex-1 h-4 bg-[var(--color-surface-muted)] rounded overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{ width: `${step.pct}%`, background: barColor, transition: 'width 300ms ease' }}
                  />
                </div>
                <span className="min-w-[50px] text-right font-mono text-[var(--color-text)]">
                  {step.active}/{step.total}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Waste table */}
      <Panel className="mt-4">
        <PanelHeader>The waste</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <tbody>
              {[STATIC_BATCHING_WASTE.totalSlotSteps, STATIC_BATCHING_WASTE.usedSlotSteps, STATIC_BATCHING_WASTE.waste].map((row) => {
                const isWaste = row === STATIC_BATCHING_WASTE.waste;
                return (
                  <tr
                    key={row.label}
                    className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                      isWaste ? 'bg-[var(--color-red-bg)]' : ''
                    }`}
                  >
                    <td className={`px-4 py-2 ${isWaste ? 'font-bold text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}>
                      {row.label}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono ${isWaste ? 'font-bold text-[var(--color-red-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                      {row.value}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="warn"
        message="This is <strong>head-of-line blocking</strong> &mdash; the same problem that shows up in network packet queues and SCSI command queues. The slowest request holds everything up. In a batch of 32 users where response lengths vary from 20 to 2,000 tokens, average GPU utilization might be 30&ndash;40%."
      />
    </div>
  );
}

/* ================================================================
   PAGE 5 — "Continuous batching: the fix"
   Animated timeline with immediate replacement + comparison table
   ================================================================ */

// Colors for replacement users
const REPLACEMENT_COLORS = {
  A: '#4F46E5', B: '#378ADD', C: '#1D9E75', D: '#EF9F27',
  E: '#E24B4A', F: '#8B5CF6', G: '#EC4899', H: '#06B6D4',
};

function ContinuousBatchingPage() {
  const [eventIndex, setEventIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setEventIndex((prev) => {
          if (prev >= CONTINUOUS_BATCHING_EVENTS.length - 1) {
            setIsPlaying(false);
            return CONTINUOUS_BATCHING_EVENTS.length - 1;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  const currentEvent = CONTINUOUS_BATCHING_EVENTS[eventIndex];

  function handlePlay() {
    if (eventIndex >= CONTINUOUS_BATCHING_EVENTS.length - 1) setEventIndex(0);
    setIsPlaying(true);
  }

  return (
    <div>
      <Panel>
        <PanelHeader>Same four users &mdash; with continuous batching</PanelHeader>
        <div className="p-4 space-y-3">
          {/* Slot visualization */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {currentEvent.slots.map((user, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border text-center"
                style={{
                  borderColor: REPLACEMENT_COLORS[user] || 'var(--color-border)',
                  background: `${REPLACEMENT_COLORS[user]}15`,
                  transition: 'all 300ms ease',
                }}
              >
                <div className="text-[14px] font-bold" style={{ color: REPLACEMENT_COLORS[user] }}>
                  {user}
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)]">Slot {i + 1}</div>
              </div>
            ))}
          </div>

          {/* Event timeline */}
          {CONTINUOUS_BATCHING_EVENTS.map((evt, i) => {
            const isCurrent = i === eventIndex;
            const isPast = i < eventIndex;
            return (
              <div
                key={i}
                className={`flex gap-3 items-start text-[13px] p-2 rounded cursor-pointer transition-all ${
                  isCurrent ? 'bg-[var(--color-teal-bg)] border border-[var(--color-teal)]' : isPast ? 'opacity-50' : 'opacity-70'
                }`}
                onClick={() => { setIsPlaying(false); setEventIndex(i); }}
              >
                <span className="flex-shrink-0 min-w-[90px] font-mono text-[12px] text-[var(--color-text-muted)]">
                  {evt.label}
                </span>
                <div>
                  <span className="font-medium text-[var(--color-text)]">
                    [{evt.slots.join(', ')}]
                  </span>
                  <span className="text-[var(--color-text-secondary)]"> &mdash; {evt.note}</span>
                </div>
              </div>
            );
          })}

          {/* Controls */}
          <div className="pt-3 border-t border-[var(--color-border-light)] flex items-center gap-3">
            <button
              onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
              className="px-3 py-1 text-[11px] rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer text-[var(--color-text-secondary)]"
            >
              {isPlaying ? 'Pause' : eventIndex >= CONTINUOUS_BATCHING_EVENTS.length - 1 ? 'Replay' : 'Play'}
            </button>
            <input
              type="range"
              min={0}
              max={CONTINUOUS_BATCHING_EVENTS.length - 1}
              value={eventIndex}
              onChange={(e) => { setIsPlaying(false); setEventIndex(Number(e.target.value)); }}
              className="anim-scrubber flex-1"
            />
            <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
              Event {eventIndex + 1} / {CONTINUOUS_BATCHING_EVENTS.length}
            </span>
          </div>

          {/* Utilization bar: constant ~100% */}
          <div className="rounded-lg border border-[var(--color-border-light)] overflow-hidden">
            <div className="flex items-center h-8">
              <div
                className="h-full flex items-center justify-center text-[11px] font-medium text-white"
                style={{ width: '100%', background: 'var(--color-teal)' }}
              >
                ~100% utilization throughout &mdash; slots always full
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Comparison table */}
      <Panel className="mt-4">
        <PanelHeader>Static vs. continuous batching</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-right">Static batching</th>
                <th className="px-4 py-2 text-right">Continuous batching</th>
              </tr>
            </thead>
            <tbody>
              {CONTINUOUS_VS_STATIC.map((row) => (
                <tr
                  key={row.metric}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 text-[var(--color-text)]">{row.metric}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-muted)]">
                    {row.staticVal}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-teal-text)]">
                    {row.continuousVal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Continuous batching is now the standard in all major inference serving
            systems: <strong className="text-[var(--color-text)]">vLLM</strong>,{' '}
            <strong className="text-[var(--color-text)]">TensorRT-LLM</strong>,{' '}
            <strong className="text-[var(--color-text)]">NVIDIA Dynamo</strong>. The key
            insight: operate at token-level granularity, not request-level.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">But continuous batching makes the
            memory problem harder.</strong> With static batching, you know exactly which
            requests are in the batch. With continuous batching, requests arrive and leave
            dynamically. Each request&rsquo;s cache grows at a different rate. You need a
            memory allocator that can handle this churn without fragmenting.
          </p>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>[Forward ref: Stop 12]</strong> When requests finish, their freed KV cache memory can also be used by <em>chunked prefill</em> &mdash; processing new arrivals&rsquo; prompts in pieces, interleaved with ongoing decode. This avoids a latency spike from a large prefill blocking the decode batch."
      />
    </div>
  );
}

/* ================================================================
   PAGE 6 — "PagedAttention: virtual memory for the GPU"
   Two-panel interactive: traditional vs paged
   ================================================================ */

function PagedAttentionPage() {
  // State for interactive conversations
  const [traditionalConvs, setTraditionalConvs] = useState(
    TRADITIONAL_ALLOCATION.map((c) => ({ ...c, active: true }))
  );
  const [pagedConvs, setPagedConvs] = useState(
    PAGED_ALLOCATION.map((c) => ({ ...c, active: true }))
  );
  const [nextConvId, setNextConvId] = useState('E');

  // Traditional calculations
  const tradActive = traditionalConvs.filter((c) => c.active);
  const tradAllocated = tradActive.reduce((s, c) => s + c.allocatedGB, 0);
  const tradUsed = tradActive.reduce((s, c) => s + c.usedGB, 0);
  const tradWaste = tradAllocated - tradUsed;
  const tradWastePct = tradAllocated > 0 ? ((tradWaste / tradAllocated) * 100).toFixed(0) : 0;
  const tradRemaining = TRADITIONAL_TOTALS.totalAvailableGB - tradAllocated;
  const tradCanFit = Math.floor(tradRemaining / 10); // 10 GB per allocation

  // Paged calculations
  const pagedActive = pagedConvs.filter((c) => c.active);
  const pagedUsed = pagedActive.reduce((s, c) => s + c.usedGB, 0);
  const pagedFree = PAGED_TOTALS.totalAvailableGB - pagedUsed;
  const pagedWastePct = pagedUsed > 0 ? ((PAGED_TOTALS.totalAvailableGB - pagedFree - pagedUsed) / PAGED_TOTALS.totalAvailableGB * 100).toFixed(0) : 0;
  const pagedCanFit = Math.floor(pagedFree / 2.5);

  // Generate a random paged layout for visual scatter effect
  const pagedGrid = useMemo(() => {
    const grid = new Array(PAGED_VISUAL_GRID_SIZE).fill(null);
    let rng = 42; // deterministic seed
    function nextRng() { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng; }

    pagedActive.forEach((conv) => {
      const blockCount = Math.round((conv.usedGB / PAGED_TOTALS.totalAvailableGB) * PAGED_VISUAL_GRID_SIZE);
      let placed = 0;
      let attempts = 0;
      while (placed < blockCount && attempts < PAGED_VISUAL_GRID_SIZE * 3) {
        const idx = nextRng() % PAGED_VISUAL_GRID_SIZE;
        if (!grid[idx]) {
          grid[idx] = conv.id;
          placed++;
        }
        attempts++;
      }
    });
    return grid;
  }, [pagedActive]);

  function addConversation() {
    if (nextConvId > 'R') return; // limit
    const newUsedGB = 2.5;
    // Traditional: needs 10 GB contiguous
    if (tradRemaining >= 10) {
      setTraditionalConvs((prev) => [...prev, { id: nextConvId, allocatedGB: 10, usedGB: newUsedGB, wastePercent: 75, active: true }]);
    }
    // Paged: needs only actual space
    if (pagedFree >= newUsedGB) {
      setPagedConvs((prev) => [...prev, { id: nextConvId, pages: 156, usedGB: newUsedGB, active: true }]);
    }
    setNextConvId(String.fromCharCode(nextConvId.charCodeAt(0) + 1));
  }

  function finishConversation(id) {
    setTraditionalConvs((prev) => prev.map((c) => c.id === id ? { ...c, active: false } : c));
    setPagedConvs((prev) => prev.map((c) => c.id === id ? { ...c, active: false } : c));
  }

  function resetConversations() {
    setTraditionalConvs(TRADITIONAL_ALLOCATION.map((c) => ({ ...c, active: true })));
    setPagedConvs(PAGED_ALLOCATION.map((c) => ({ ...c, active: true })));
    setNextConvId('E');
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={addConversation}
          className="px-3 py-1.5 text-[11px] rounded border border-[var(--color-teal)] bg-[var(--color-teal-bg)] text-[var(--color-teal-text)] hover:opacity-80 transition-opacity cursor-pointer"
        >
          + Add conversation
        </button>
        {tradActive.length > 0 && (
          <button
            onClick={() => finishConversation(tradActive[0].id)}
            className="px-3 py-1.5 text-[11px] rounded border border-[var(--color-red)] bg-[var(--color-red-bg)] text-[var(--color-red-text)] hover:opacity-80 transition-opacity cursor-pointer"
          >
            Finish Conv {tradActive[0].id}
          </button>
        )}
        <button
          onClick={resetConversations}
          className="px-3 py-1.5 text-[11px] rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer"
        >
          Reset
        </button>
      </div>

      {/* Two panels side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Traditional */}
        <Panel>
          <PanelHeader>Traditional (contiguous allocation)</PanelHeader>
          <div className="p-4 space-y-2">
            {/* Memory bar for traditional */}
            <div className="rounded-lg border border-[var(--color-border-light)] overflow-hidden mb-3">
              <div className="flex items-stretch h-8">
                {traditionalConvs.filter(c => c.active).map((conv) => {
                  const pctAlloc = (conv.allocatedGB / TRADITIONAL_TOTALS.totalAvailableGB) * 100;
                  const pctUsed = (conv.usedGB / conv.allocatedGB) * 100;
                  return (
                    <div
                      key={conv.id}
                      className="h-full relative border-r border-white/20"
                      style={{ width: `${pctAlloc}%`, transition: 'width 300ms ease' }}
                    >
                      <div
                        className="absolute inset-0 flex items-center justify-center text-[9px] font-medium"
                        style={{ background: 'var(--color-red-bg)', color: 'var(--color-red-text)' }}
                      />
                      <div
                        className="absolute top-0 bottom-0 left-0 flex items-center justify-center text-[9px] font-medium text-white"
                        style={{
                          width: `${pctUsed}%`,
                          background: CONV_COLORS[conv.id] || 'var(--color-teal)',
                          transition: 'width 300ms ease',
                        }}
                      >
                        {conv.id}
                      </div>
                    </div>
                  );
                })}
                {tradRemaining > 0 && (
                  <div
                    className="h-full flex items-center justify-center text-[9px]"
                    style={{
                      width: `${(tradRemaining / TRADITIONAL_TOTALS.totalAvailableGB) * 100}%`,
                      background: 'var(--color-surface-muted)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {tradRemaining.toFixed(0)} GB free
                  </div>
                )}
              </div>
            </div>

            {/* Per-conversation bars */}
            {tradActive.map((conv) => {
              const usedPct = (conv.usedGB / conv.allocatedGB) * 100;
              return (
                <div key={conv.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-[var(--color-text)]" style={{ color: CONV_COLORS[conv.id] }}>Conv {conv.id}</span>
                    <span className="text-[var(--color-text-muted)]">
                      {conv.usedGB} GB / {conv.allocatedGB} GB &mdash; {conv.wastePercent}% waste
                    </span>
                  </div>
                  <div className="flex h-5 rounded overflow-hidden border border-[var(--color-border-light)]">
                    <div className="h-full" style={{ width: `${usedPct}%`, background: CONV_COLORS[conv.id] || 'var(--color-teal)', transition: 'width 300ms ease' }} />
                    <div className="h-full" style={{ width: `${100 - usedPct}%`, background: 'var(--color-red-bg)', transition: 'width 300ms ease' }} />
                  </div>
                </div>
              );
            })}

            <div className="pt-3 mt-3 border-t border-[var(--color-border-light)] space-y-1 text-[12px] text-[var(--color-text-secondary)]">
              <div>Total allocated: <strong className="text-[var(--color-text)]">{tradAllocated} GB</strong></div>
              <div>Total used: <strong className="text-[var(--color-text)]">{tradUsed.toFixed(1)} GB</strong></div>
              <div>
                Waste: <strong style={{ color: 'var(--color-red-text)' }}>{tradWaste.toFixed(1)} GB (~{tradWastePct}%)</strong>
              </div>
              <div>Room for: <strong className="text-[var(--color-text)]">{Math.max(0, tradCanFit)} more</strong> (need 10 GB contiguous each)</div>
            </div>

            {/* Waste meter */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] mb-1">
                <span>Waste</span>
                <span>~{tradWastePct}%</span>
              </div>
              <div className="h-3 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${tradWastePct}%`, background: 'var(--color-red)', transition: 'width 300ms ease' }}
                />
              </div>
            </div>

            <div className="text-[11px] font-medium pt-2" style={{ color: 'var(--color-text-muted)' }}>
              Concurrent conversations: <span className="text-[var(--color-text)]">{tradActive.length}</span>
            </div>
          </div>
        </Panel>

        {/* Right: Paged */}
        <Panel>
          <PanelHeader>PagedAttention (paged allocation)</PanelHeader>
          <div className="p-4 space-y-2">
            {/* Page grid visualization */}
            <div className="rounded-lg border border-[var(--color-border-light)] p-2 mb-3">
              <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(18, 1fr)' }}>
                {pagedGrid.map((convId, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-sm"
                    style={{
                      background: convId ? (CONV_COLORS[convId] || 'var(--color-teal)') : 'var(--color-surface-muted)',
                      opacity: convId ? 0.85 : 0.4,
                      transition: 'background 300ms ease, opacity 300ms ease',
                    }}
                    title={convId ? `Conv ${convId}` : 'Free page'}
                  />
                ))}
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] mt-1 text-center">
                Each square = one page ({PAGED_TOTALS.pageSize} tokens, {PAGED_TOTALS.pageSizeBytes})
                &mdash; pages scattered, not contiguous
              </div>
            </div>

            {/* Per-conversation info */}
            {pagedActive.map((conv) => (
              <div key={conv.id} className="flex items-center justify-between text-[12px] py-1">
                <span className="font-medium" style={{ color: CONV_COLORS[conv.id] }}>
                  Conv {conv.id}
                </span>
                <span className="text-[var(--color-text-muted)]">
                  {conv.pages} pages &mdash; {conv.usedGB} GB (scattered)
                </span>
              </div>
            ))}

            <div className="pt-3 mt-3 border-t border-[var(--color-border-light)] space-y-1 text-[12px] text-[var(--color-text-secondary)]">
              <div>Total used: <strong className="text-[var(--color-text)]">{pagedUsed.toFixed(1)} GB</strong></div>
              <div>Total free: <strong style={{ color: 'var(--color-teal-text)' }}>{pagedFree.toFixed(1)} GB</strong> (all usable &mdash; no fragments)</div>
              <div>
                Waste: <strong style={{ color: 'var(--color-teal-text)' }}>~{Math.max(0, pagedWastePct)}%</strong> (internal fragmentation only)
              </div>
              <div>Room for: <strong style={{ color: 'var(--color-teal-text)' }}>~{pagedCanFit} more conversations</strong> at 2.5 GB each</div>
            </div>

            {/* Waste meter */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] mb-1">
                <span>Waste</span>
                <span>~3%</span>
              </div>
              <div className="h-3 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: '3%', background: 'var(--color-teal)', transition: 'width 300ms ease' }}
                />
              </div>
            </div>

            <div className="text-[11px] font-medium pt-2" style={{ color: 'var(--color-text-muted)' }}>
              Concurrent conversations: <span style={{ color: 'var(--color-teal-text)' }}>up to {PAGED_TOTALS.maxConversations}</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* How it works + analogies */}
      <Panel className="mt-4">
        <PanelHeader>How PagedAttention works</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The same 45 GB of available memory is divided into fixed-size{' '}
            <strong className="text-[var(--color-text)]">pages</strong>, each holding K
            and V for {PAGED_TOTALS.pageSize} tokens ({PAGED_TOTALS.pageSizeBytes} per page for
            Llama-3 70B with GQA). Each conversation is a set of pages scattered across
            memory.
          </p>
          <p>
            A <strong className="text-[var(--color-text)]">block table</strong> for each
            conversation maps logical token positions to physical page locations:
            &ldquo;Conv A tokens 1&ndash;16 &rarr; page 47, tokens 17&ndash;32 &rarr;
            page 203, tokens 33&ndash;48 &rarr; page 12&hellip;&rdquo;
          </p>
          <p>
            When a conversation finishes, its individual pages are freed. Each is immediately
            available. No fragmentation &mdash; every freed page is the same size.
          </p>
        </div>
      </Panel>

      {/* Analogies */}
      <Panel className="mt-4">
        <div className="p-4 space-y-3">
          <div className="flex gap-3 items-start text-[13px]">
            <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]">
              Storage
            </span>
            <div className="text-[var(--color-text-secondary)] leading-relaxed">
              <strong className="text-[var(--color-text)]">This is thin provisioning.</strong>{' '}
              You don&rsquo;t allocate the full LUN up front &mdash; you allocate blocks as
              data is written. The block map tracks logical-to-physical mappings.
            </div>
          </div>
          <div className="flex gap-3 items-start text-[13px]">
            <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)]">
              Network
            </span>
            <div className="text-[var(--color-text-secondary)] leading-relaxed">
              <strong className="text-[var(--color-text)]">This is scatter-gather DMA.</strong>{' '}
              The data doesn&rsquo;t need to be contiguous &mdash; the controller follows a
              descriptor list.
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="good"
        message="PagedAttention is the core innovation behind <strong>vLLM</strong>, which has become the dominant open-source inference serving system. It reduced KV cache waste from 60&ndash;80% to under 4%, enabling 2&ndash;4&times; more concurrent conversations on the same hardware."
      />

      <Callout
        type="note"
        message="<strong>For our scenario:</strong> With PagedAttention on our 8&times; H100 cluster, each GPU with 45 GB available can serve ~18 conversations at 8K tokens with minimal waste. Across 8 GPUs: 144 concurrent conversations. Our requirement of 32 is well within reach &mdash; and we have headroom for the users who spike to 32K tokens (10 GB each, still fits)."
      />
    </div>
  );
}

/* ================================================================
   PAGE 7 — "When memory runs out"
   Three option cards with cost/benefit
   ================================================================ */

function MemoryRunsOutPage() {
  const [selectedOption, setSelectedOption] = useState(null);

  // GPU memory bar at 95%+ to show the pressure
  const usedPct = 95;

  return (
    <div>
      {/* Memory pressure indicator */}
      <Panel>
        <PanelHeader>GPU HBM pressure &mdash; 95%+ utilized</PanelHeader>
        <div className="p-4">
          <div className="h-8 rounded-lg border border-[var(--color-border-light)] overflow-hidden">
            <div
              className="h-full flex items-center justify-center text-[11px] font-medium text-white"
              style={{ width: `${usedPct}%`, background: 'var(--color-red)' }}
            >
              {usedPct}% HBM used &mdash; new request arrives
            </div>
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
            5 users uploaded large documents simultaneously. Cache demand exceeds capacity.
          </div>
        </div>
      </Panel>

      {/* Three option cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {MEMORY_OPTIONS.map((opt) => {
          const isSelected = selectedOption === opt.id;
          return (
            <div
              key={opt.id}
              className="rounded-lg border-2 cursor-pointer transition-all"
              style={{
                borderColor: isSelected ? opt.color : 'var(--color-border-light)',
                background: isSelected ? opt.bgColor : 'var(--color-surface)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 300ms ease',
              }}
              onClick={() => setSelectedOption(isSelected ? null : opt.id)}
            >
              {/* Header */}
              <div className="p-3 border-b" style={{ borderColor: isSelected ? opt.color : 'var(--color-border-light)' }}>
                <div className="flex items-center gap-2">
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center text-white"
                    style={{ background: opt.color }}
                  >
                    {opt.letter}
                  </span>
                  <div>
                    <div className="text-[14px] font-medium text-[var(--color-text)]">{opt.label}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">{opt.subtitle}</div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-3 space-y-2">
                <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                  {opt.description}
                </p>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-start gap-1.5 text-[11px]">
                    <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-red-text)' }}>Cost:</span>
                    <span className="text-[var(--color-text-secondary)]">{opt.cost}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[11px]">
                    <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-teal-text)' }}>Benefit:</span>
                    <span className="text-[var(--color-text-secondary)]">{opt.benefit}</span>
                  </div>
                </div>

                {opt.analogy && (
                  <p className="text-[11px] text-[var(--color-text-muted)] pt-1 italic">
                    {opt.analogy}
                  </p>
                )}

                {(opt.forwardRef || opt.forwardRefExtra) && (
                  <div className="flex gap-2 pt-1 flex-wrap">
                    {opt.forwardRef && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-blue-bg)] border border-[var(--color-blue)] text-[var(--color-blue-text)]">
                        Forward ref: {opt.forwardRef}
                      </span>
                    )}
                    {opt.forwardRefExtra && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-blue-bg)] border border-[var(--color-blue)] text-[var(--color-blue-text)]">
                        Forward ref: {opt.forwardRefExtra}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Callout
        type="note"
        message="<strong>[Forward ref: Stop 13]</strong> The offload option extends to multiple tiers: HBM &rarr; CPU DRAM &rarr; NVMe SSD &rarr; networked storage. Each tier offers more capacity at higher latency. NVIDIA Dynamo&rsquo;s KV Block Manager orchestrates this hierarchy, and companies like WEKA and VAST are building RDMA-based storage that can serve KV cache back to GPUs at up to 270 GB/s aggregate throughput."
      />

      <Callout
        type="good"
        message="<strong>For our scenario:</strong> With 8 GPUs, each having ~2 TB of CPU DRAM available for overflow, our total KV cache capacity extends from 640 GB (HBM only) to ~16 TB (HBM + DRAM). The 5 users with 32K contexts (50 GB total) are easily absorbed &mdash; their less-recently-used cache pages can be offloaded to DRAM while active decode reads from HBM."
      />
    </div>
  );
}

/* ================================================================
   PAGE 8 — "Stop 11 at a glance"
   Summary table + evolving diagram + bridge to Stop 12
   ================================================================ */

function SummaryPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>What we solved</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Problem</th>
                <th className="px-4 py-2 text-left">Solution</th>
                <th className="px-4 py-2 text-left">Impact</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_TABLE.map((row) => (
                <tr
                  key={row.problem}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 text-[var(--color-text)]">{row.problem}</td>
                  <td className="px-4 py-2 font-medium text-[var(--color-teal-text)]">
                    {row.solution}
                  </td>
                  <td className="px-4 py-2 font-mono text-[var(--color-text-secondary)]">
                    {row.impact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Evolving diagram */}
      <Panel className="mt-4">
        <PanelHeader>The picture so far &mdash; Stop 11</PanelHeader>
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* Users */}
            <div className="flex-shrink-0 p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
              <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                32 Users
              </div>
              <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: 32 }).map((_, i) => {
                  // Vary context length for visual interest
                  const contextH = 4 + (i % 5) * 2;
                  return (
                    <div
                      key={i}
                      className="w-4 rounded-sm bg-[var(--color-primary-bg)] border border-[var(--color-primary)] relative"
                      style={{ height: `${contextH}px` }}
                      title={`User ${i + 1}`}
                    />
                  );
                })}
              </div>
              <div className="text-[9px] text-[var(--color-text-muted)] mt-1">
                Height = context length
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center text-[var(--color-text-muted)] text-lg self-center">
              &rarr;
            </div>

            {/* Scheduler */}
            <div className="flex-shrink-0 p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)] self-center">
              <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider">
                Continuous Batching
              </div>
              <div className="text-[10px] text-[var(--color-teal-text)] mt-1">
                Scheduler
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center text-[var(--color-text-muted)] text-lg self-center">
              &rarr;
            </div>

            {/* GPUs */}
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                8&times; H100 GPUs
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-2 rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]"
                  >
                    <div className="text-[10px] font-medium text-[var(--color-text)]">
                      GPU {i}
                    </div>
                    {/* Weights bar */}
                    <div className="mt-1 h-2 rounded overflow-hidden bg-[var(--color-surface-alt)]">
                      <div className="h-full rounded" style={{ width: '44%', background: 'var(--color-primary)' }} title="Weights 35 GB" />
                    </div>
                    {/* KV cache paged bar */}
                    <div className="mt-0.5 h-2 rounded overflow-hidden bg-[var(--color-surface-alt)]">
                      <div className="h-full flex">
                        {[0, 1, 2, 3].map((j) => (
                          <div
                            key={j}
                            className="h-full"
                            style={{
                              width: `${12 + j * 4}%`,
                              background: Object.values(CONV_COLORS)[j % 4],
                              marginRight: '1px',
                              borderRadius: '1px',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-[8px] text-[var(--color-text-muted)] mt-0.5">
                      Weights + Paged KV
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Bridge to Stop 12 */}
      <Panel className="mt-4">
        <PanelHeader>Bridge to Stop 12</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            In our current setup, all 8 GPUs run both prefill and decode. But prefill
            is compute-bound (GPU cores fully busy) and decode is memory-bound (GPU cores
            waiting for cache reads). When a user submits a 28,000-token document for
            analysis, the prefill phase saturates the GPU for several seconds &mdash; and
            during that time, all decode users on that GPU see their token generation stall.
          </p>
          <p>
            What if we dedicated some GPUs to prefill and others to decode? The prefill
            GPUs would stay compute-saturated. The decode GPUs would be optimized for
            memory bandwidth. But after prefill completes, the KV cache &mdash;{' '}
            {BRIDGE_CALC.documentTokens.toLocaleString()} tokens &times; {BRIDGE_CALC.kvPerToken_KB} KB ={' '}
            <strong className="text-[var(--color-text)]">{BRIDGE_CALC.cacheSize_GB} GB</strong> &mdash; must
            transfer from the prefill GPU to the decode GPU. At {BRIDGE_CALC.rdmaBandwidth_Gbps} Gbps
            RDMA ({BRIDGE_CALC.rdmaBandwidth_GBs} GB/s), that transfer takes{' '}
            <strong className="text-[var(--color-text)]">~{BRIDGE_CALC.transferTime_ms} ms</strong>.
          </p>

          {/* Transfer calculation visual */}
          <div className="grid grid-cols-3 gap-2 py-2">
            <div className="p-2 rounded-lg text-center bg-[var(--color-primary-bg)] border border-[var(--color-primary)]">
              <div className="text-[16px] font-bold text-[var(--color-primary-text)]">{BRIDGE_CALC.cacheSize_GB} GB</div>
              <div className="text-[10px] text-[var(--color-primary-text)]">KV cache to transfer</div>
            </div>
            <div className="p-2 rounded-lg text-center bg-[var(--color-blue-bg)] border border-[var(--color-blue)]">
              <div className="text-[16px] font-bold text-[var(--color-blue-text)]">{BRIDGE_CALC.rdmaBandwidth_GBs} GB/s</div>
              <div className="text-[10px] text-[var(--color-blue-text)]">RDMA bandwidth</div>
            </div>
            <div className="p-2 rounded-lg text-center bg-[var(--color-amber-bg)] border border-[var(--color-amber)]">
              <div className="text-[16px] font-bold text-[var(--color-amber-text)]">~{BRIDGE_CALC.transferTime_ms} ms</div>
              <div className="text-[10px] text-[var(--color-amber-text)]">Transfer time</div>
            </div>
          </div>

          <p>
            <strong className="text-[var(--color-text)]">
              That {BRIDGE_CALC.transferTime_ms} ms transfer &mdash; and how to shrink it &mdash; is the subject
              of Stop 12.
            </strong>
          </p>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>The single-GPU story is complete.</strong> Batching, continuous batching, PagedAttention, and overflow management. Next: what happens when prefill and decode need different hardware &mdash; and the KV cache must travel across the network."
      />
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function MemoryWall() {
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

  // Format narration: replace \n\n with paragraph breaks
  const narrationHtml = narration
    .replace(/\n\n/g, '</p><p style="margin-top:0.5em">')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');

  return (
    <div>
      {/* Narration */}
      <div
        className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed
                    px-4 py-3 bg-[var(--color-surface-muted)] rounded-lg
                    border border-[var(--color-border-light)] mb-5"
        dangerouslySetInnerHTML={{ __html: narrationHtml }}
      />

      {/* Page content */}
      <div className="min-h-[200px]">
        {page.id === 'act2-intro' && <Act2IntroPage />}
        {page.id === 'math-works' && <MathWorksPage />}
        {page.id === 'math-lies' && <MathLiesPage />}
        {page.id === 'batching-why' && <BatchingWhyPage />}
        {page.id === 'static-batching' && <StaticBatchingPage />}
        {page.id === 'continuous-batching' && <ContinuousBatchingPage />}
        {page.id === 'paged-attention' && <PagedAttentionPage />}
        {page.id === 'memory-runs-out' && <MemoryRunsOutPage />}
        {page.id === 'summary' && <SummaryPage />}
      </div>

      {/* Page navigation */}
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
