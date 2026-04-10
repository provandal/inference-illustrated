import { useState, useCallback, useEffect } from 'react';
import {
  PAGES,
  NARRATIONS,
  CACHE_GRID,
  COMPRESSION_DIMENSIONS,
  COMPOUND_EXAMPLE,
  ARCH_COMPARISON,
  QUANTIZATION_LEVELS,
  QUANTIZATION_BENCHMARKS,
  ATTENTION_DISTRIBUTION,
  EVICTION_STRATEGIES,
  ADAPTIVE_PRECISION,
  CALC_ARCH_OPTIONS,
  CALC_QUANT_OPTIONS,
  CALC_EVICTION_OPTIONS,
  CALC_SCENARIO,
  COMBINED_PRESETS,
  ACCURACY_BY_TASK,
  TASK_TYPES,
  INFRA_IMPACT,
  SUMMARY_TABLE,
} from '../data/stop14Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';

/* ================================================================
   PAGE 1 — "Every byte saved compounds"
   Visual grid diagram + three annotated arrows + multiplicative example
   ================================================================ */

function CascadingPage() {
  return (
    <div>
      {/* The KV cache grid visualization */}
      <Panel>
        <PanelHeader>The KV cache for one token, visualized as a grid</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Rows = layers ({CACHE_GRID.layers}). Columns = KV head groups ({CACHE_GRID.kvHeads}).
            Each cell holds d<sub>head</sub> ({CACHE_GRID.dHead}) numbers at some precision
            ({CACHE_GRID.bytesPerValue} bytes for FP16).
          </p>
        </div>

        <div className="px-4 pb-4">
          <div className="flex gap-6 items-start">
            {/* The grid itself */}
            <div className="flex-shrink-0">
              <div className="flex flex-col gap-[2px] p-2 rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]">
                {/* Column labels */}
                <div className="flex gap-[2px] pb-1 pl-6">
                  {Array.from({ length: CACHE_GRID.visualCols }).map((_, c) => (
                    <div
                      key={c}
                      className="w-6 text-[9px] text-center text-[var(--color-text-muted)] font-mono"
                    >
                      KV{c}
                    </div>
                  ))}
                </div>
                {Array.from({ length: CACHE_GRID.visualRows }).map((_, r) => (
                  <div key={r} className="flex items-center gap-[2px]">
                    <div className="w-5 text-[9px] text-right text-[var(--color-text-muted)] font-mono pr-1">
                      L{r * 8}
                    </div>
                    {Array.from({ length: CACHE_GRID.visualCols }).map((_, c) => (
                      <div
                        key={c}
                        className="w-6 h-6 rounded-sm border border-[var(--color-border-light)] flex items-center justify-center gap-[1px]"
                        style={{ background: 'var(--color-surface)' }}
                      >
                        {Array.from({ length: CACHE_GRID.cellNumbers }).map((_, n) => (
                          <div
                            key={n}
                            className="w-[2px] h-[2px] rounded-full"
                            style={{ background: 'var(--color-primary)' }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="text-[9px] text-[var(--color-text-muted)] text-center mt-1 font-mono">
                80 layers &times; 8 KV heads &times; 128 nums &times; 2 B = 320 KB / token
              </div>
            </div>

            {/* Three arrows pointing to compression dimensions */}
            <div className="flex-1 space-y-3">
              {COMPRESSION_DIMENSIONS.map((dim) => (
                <div
                  key={dim.id}
                  className="p-3 rounded-lg border border-[var(--color-border-light)] flex items-start gap-3"
                  style={{ borderLeftWidth: 4, borderLeftColor: dim.color }}
                >
                  <div
                    className="text-[18px] font-bold flex-shrink-0 mt-0.5"
                    style={{ color: dim.color }}
                  >
                    {dim.axis === 'horizontal' ? '\u2194' : dim.axis === 'vertical' ? '\u2195' : '\u25FC'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded"
                        style={{ background: `${dim.color}22`, color: dim.color }}
                      >
                        {dim.arrow}
                      </span>
                      <span className="text-[13px] font-medium text-[var(--color-text)]">
                        {dim.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">
                      <span className="font-mono">{dim.techniques}</span>
                      <span> &mdash; {dim.detail}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* Multiplicative compound example */}
      <Panel className="mt-4">
        <PanelHeader>Compression compounds multiplicatively</PanelHeader>
        <div className="p-4">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <div className="p-3 rounded-lg border border-[var(--color-teal)] bg-[var(--color-teal-bg)] text-center min-w-[110px]">
              <div className="text-[10px] text-[var(--color-teal-text)] uppercase tracking-wider">GQA</div>
              <div className="text-[20px] font-bold text-[var(--color-teal-text)] font-mono">
                {COMPOUND_EXAMPLE.gqaFactor}&times;
              </div>
              <div className="text-[10px] text-[var(--color-teal-text)]">8 KV heads</div>
            </div>
            <div className="text-[22px] text-[var(--color-text-muted)]">&times;</div>
            <div className="p-3 rounded-lg border border-[var(--color-blue)] bg-[var(--color-blue-bg)] text-center min-w-[110px]">
              <div className="text-[10px] text-[var(--color-blue-text)] uppercase tracking-wider">FP8</div>
              <div className="text-[20px] font-bold text-[var(--color-blue-text)] font-mono">
                {COMPOUND_EXAMPLE.fp8Factor}&times;
              </div>
              <div className="text-[10px] text-[var(--color-blue-text)]">1 byte / num</div>
            </div>
            <div className="text-[22px] text-[var(--color-text-muted)]">&times;</div>
            <div className="p-3 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-center min-w-[110px]">
              <div className="text-[10px] text-[var(--color-primary-text)] uppercase tracking-wider">Eviction</div>
              <div className="text-[20px] font-bold text-[var(--color-primary-text)] font-mono">
                {COMPOUND_EXAMPLE.evictionFactor}&times;
              </div>
              <div className="text-[10px] text-[var(--color-primary-text)]">50% evicted</div>
            </div>
            <div className="text-[22px] text-[var(--color-text-muted)]">=</div>
            <div className="p-3 rounded-lg border-2 border-[var(--color-amber)] bg-[var(--color-amber-bg)] text-center min-w-[110px]">
              <div className="text-[10px] text-[var(--color-amber-text)] uppercase tracking-wider">Total</div>
              <div className="text-[24px] font-bold text-[var(--color-amber-text)] font-mono">
                {COMPOUND_EXAMPLE.totalFactor}&times;
              </div>
              <div className="text-[10px] text-[var(--color-amber-text)]">smaller</div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-[12px] text-[var(--color-text-secondary)] text-center">
            <span className="font-mono">{COMPOUND_EXAMPLE.baselineGB} GB</span>
            <span className="mx-2">&rarr;</span>
            <span className="font-mono font-bold text-[var(--color-teal-text)]">
              {COMPOUND_EXAMPLE.compressedMB} MB
            </span>
            <span className="ml-2 text-[var(--color-text-muted)]">
              (can compound to 16&ndash;32&times; in production)
            </span>
          </div>
        </div>
      </Panel>

      <Callout
        type="note"
        message="These three dimensions are <strong>independent</strong> &mdash; you can apply all three simultaneously. A model with GQA (8 KV groups instead of 64), FP8 quantization (1 byte instead of 2), and 50% token eviction would have a cache that&rsquo;s 8&times; smaller (from GQA) &times; 2&times; smaller (from FP8) &times; 2&times; smaller (from eviction) = <strong>32&times; smaller</strong> than full MHA at FP16 with no eviction. That turns our 8.96 GB conversation into 280 MB."
      />

      <Callout
        type="warn"
        message="Of course, each compression costs accuracy. The rest of this stop explores each family, what it costs, and how far you can push it."
      />
    </div>
  );
}

/* ================================================================
   PAGE 2 — "Architectural compression" (interactive)
   Live selector + animated cache-size bar + concurrent users
   ================================================================ */

function ArchitecturalPage() {
  const [selected, setSelected] = useState('gqa');
  const selectedArch = ARCH_COMPARISON.find((a) => a.id === selected);

  const mhaBytes = ARCH_COMPARISON[0].perTokenBytes;
  const barWidthPct = Math.max(2, (selectedArch.perTokenBytes / mhaBytes) * 100);

  // Concurrent users on 8x H100 cluster (45 GB cache budget per GPU)
  const cacheGBat28K = (selectedArch.perTokenBytes * CALC_SCENARIO.totalTokens) / 1e9;
  const usersPerH100Calc = cacheGBat28K > 0 ? Math.floor(CALC_SCENARIO.gpuCacheBudgetGB / cacheGBat28K) : 0;
  const usersOn8GPU = usersPerH100Calc * 8;

  return (
    <div>
      {/* Architecture selector */}
      <Panel>
        <PanelHeader>Select an architecture</PanelHeader>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {ARCH_COMPARISON.map((arch) => (
              <button
                key={arch.id}
                onClick={() => setSelected(arch.id)}
                className={`px-4 py-2 text-[12px] font-medium rounded border transition-all cursor-pointer ${
                  selected === arch.id
                    ? 'bg-[var(--color-primary-bg)] border-[var(--color-primary)] text-[var(--color-primary-text)] shadow-sm'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                }`}
              >
                <div className="font-mono font-bold">{arch.name}</div>
                <div className="text-[9px] mt-0.5 opacity-80">{arch.fullName}</div>
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* Live stat grid */}
      {selectedArch && (
        <Panel className="mt-4">
          <PanelHeader>
            {selectedArch.name} &mdash; {selectedArch.fullName} &mdash; live stats
          </PanelHeader>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
                <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">KV Heads</div>
                <div className="text-[18px] font-mono font-bold text-[var(--color-text)]"
                  style={{ transition: 'all 300ms ease' }}>
                  {selectedArch.kvHeadsLabel}
                </div>
              </div>
              <div className="p-3 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
                <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Per Token</div>
                <div className="text-[18px] font-mono font-bold text-[var(--color-text)]"
                  style={{ transition: 'all 300ms ease' }}>
                  {selectedArch.perToken}
                </div>
              </div>
              <div className="p-3 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
                <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">28K Tokens</div>
                <div className="text-[18px] font-mono font-bold text-[var(--color-text)]"
                  style={{ transition: 'all 300ms ease' }}>
                  {selectedArch.at28K}
                </div>
              </div>
              <div className="p-3 rounded bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
                <div className="text-[10px] text-[var(--color-teal-text)] uppercase tracking-wider">vs MHA</div>
                <div className="text-[18px] font-mono font-bold text-[var(--color-teal-text)]"
                  style={{ transition: 'all 300ms ease' }}>
                  {selectedArch.reduction}
                </div>
              </div>
            </div>

            {/* Animated size bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                <span>Cache size relative to MHA baseline (73.3 GB at 28K)</span>
                <span className="font-mono">{barWidthPct.toFixed(1)}%</span>
              </div>
              <div className="h-10 rounded-lg overflow-hidden border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] relative">
                <div
                  className="h-full rounded-lg flex items-center px-3 text-[12px] font-medium text-white"
                  style={{
                    width: `${barWidthPct}%`,
                    background: 'linear-gradient(90deg, var(--color-teal), var(--color-blue))',
                    transition: 'width 300ms ease',
                  }}
                >
                  {barWidthPct > 15 ? selectedArch.at28K : ''}
                </div>
                {barWidthPct <= 15 && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[var(--color-text-secondary)]">
                    {selectedArch.at28K}
                  </span>
                )}
              </div>
            </div>

            {/* Concurrent users visual */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-center">
                <div className="text-[10px] text-[var(--color-primary-text)] uppercase tracking-wider">
                  Users per H100
                </div>
                <div
                  className="text-[28px] font-mono font-bold text-[var(--color-primary-text)]"
                  style={{ transition: 'all 300ms ease' }}
                >
                  {usersPerH100Calc}
                </div>
                <div className="text-[10px] text-[var(--color-primary-text)]">
                  at 28K tokens (45 GB cache budget)
                </div>
              </div>
              <div className="p-3 rounded-lg border-2 border-[var(--color-teal)] bg-[var(--color-teal-bg)] text-center">
                <div className="text-[10px] text-[var(--color-teal-text)] uppercase tracking-wider">
                  Users across 8&times; H100
                </div>
                <div
                  className="text-[28px] font-mono font-bold text-[var(--color-teal-text)]"
                  style={{ transition: 'all 300ms ease' }}
                >
                  {usersOn8GPU}
                </div>
                <div className="text-[10px] text-[var(--color-teal-text)]">
                  {usersOn8GPU >= 32 ? 'covers our 32-user scenario' : 'below our 32-user target'}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
              <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                Formula
              </div>
              <div className="font-mono text-[12px] text-[var(--color-text-secondary)]">
                {selectedArch.formula} = <span className="font-bold text-[var(--color-text)]">{selectedArch.perToken}</span> per token
              </div>
            </div>

            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed p-3 rounded border-l-4 border-[var(--color-border)]">
              {selectedArch.qualityNote}
            </div>
          </div>
        </Panel>
      )}

      {/* Full comparison table */}
      <Panel className="mt-4">
        <PanelHeader>All four architectures compared</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Approach</th>
                <th className="px-4 py-2 text-right">KV Heads</th>
                <th className="px-4 py-2 text-right">Per Token</th>
                <th className="px-4 py-2 text-right">28K Tokens</th>
                <th className="px-4 py-2 text-right">Reduction</th>
              </tr>
            </thead>
            <tbody>
              {ARCH_COMPARISON.map((arch) => (
                <tr
                  key={arch.id}
                  onClick={() => setSelected(arch.id)}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 cursor-pointer transition-colors ${
                    arch.id === selected ? 'bg-[var(--color-primary-bg)]' : 'hover:bg-[var(--color-surface-alt)]'
                  }`}
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">
                    {arch.name}
                    <span className="text-[10px] text-[var(--color-text-muted)] ml-1">({arch.fullName})</span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{arch.kvHeadsLabel}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{arch.perToken}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{arch.at28K}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-teal-text)]">{arch.reduction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>Click any row or button above to switch architecture.</strong> The cache bar, user capacity, and formula all update in place. Notice: Llama-3 uses GQA-8 by default &mdash; that alone is an 8.2&times; reduction over hypothetical MHA, before we apply any other compression."
      />
    </div>
  );
}

/* ================================================================
   PAGE 3 — "Quantization" (interactive / animated)
   Precision selector + concrete example + benchmark table
   ================================================================ */

function QuantizationPage() {
  const [selectedLevel, setSelectedLevel] = useState('fp8');
  const level = QUANTIZATION_LEVELS.find((l) => l.id === selectedLevel);
  const fp16 = QUANTIZATION_LEVELS[0];
  const widthPct = (level.perTokenBytes / fp16.perTokenBytes) * 100;

  return (
    <div>
      {/* Animated precision selector */}
      <Panel>
        <PanelHeader>Precision selector</PanelHeader>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUANTIZATION_LEVELS.map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={`px-4 py-2 text-[12px] font-medium rounded border transition-all cursor-pointer ${
                  selectedLevel === lvl.id
                    ? 'bg-[var(--color-blue-bg)] border-[var(--color-blue)] text-[var(--color-blue-text)] shadow-sm'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                }`}
              >
                <div className="font-mono font-bold">{lvl.format}</div>
                <div className="text-[9px] mt-0.5 opacity-80">{lvl.bits} bit</div>
              </button>
            ))}
          </div>

          {/* Concrete example: one K value at each precision */}
          <div className="p-4 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]">
            <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              One K vector value at <span className="text-[var(--color-text)]">{level.format}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-[10px] text-[var(--color-text-muted)]">Original (FP16)</div>
                <div className="font-mono text-[14px] text-[var(--color-text)] break-all">0.7342529296875</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--color-text-muted)]">Stored value</div>
                <div
                  className="font-mono text-[14px] text-[var(--color-blue-text)] break-all"
                  style={{ transition: 'color 300ms ease' }}
                >
                  {level.storedValue}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--color-text-muted)]">Error</div>
                <div
                  className={`font-mono text-[14px] ${
                    level.errorNum >= 1 ? 'text-[var(--color-red-text)]' : 'text-[var(--color-teal-text)]'
                  }`}
                  style={{ transition: 'color 300ms ease' }}
                >
                  {level.error}
                </div>
              </div>
            </div>
          </div>

          {/* Animated memory bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
              <span>Per-token cache at {level.format} (GQA-8, 70B)</span>
              <span className="font-mono">{level.perToken}</span>
            </div>
            <div className="h-10 rounded-lg overflow-hidden border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]">
              <div
                className="h-full rounded-lg flex items-center px-3 text-[12px] font-medium text-white"
                style={{
                  width: `${widthPct}%`,
                  background: 'linear-gradient(90deg, var(--color-blue), var(--color-teal))',
                  transition: 'width 300ms ease',
                }}
              >
                {widthPct > 18 ? `${level.perToken} (${(100 - widthPct).toFixed(0)}% saved)` : ''}
              </div>
            </div>
          </div>

          {/* Full precision table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Format</th>
                  <th className="px-3 py-2 text-right">Bits</th>
                  <th className="px-3 py-2 text-right">Bytes</th>
                  <th className="px-3 py-2 text-left">Stored Value</th>
                  <th className="px-3 py-2 text-right">Error</th>
                  <th className="px-3 py-2 text-right">Per Token</th>
                </tr>
              </thead>
              <tbody>
                {QUANTIZATION_LEVELS.map((lvl) => (
                  <tr
                    key={lvl.id}
                    onClick={() => setSelectedLevel(lvl.id)}
                    className={`border-b border-[var(--color-border-light)] last:border-b-0 cursor-pointer transition-colors ${
                      selectedLevel === lvl.id ? 'bg-[var(--color-blue-bg)]' : 'hover:bg-[var(--color-surface-alt)]'
                    }`}
                  >
                    <td className="px-3 py-2 font-medium text-[var(--color-text)]">{lvl.format}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{lvl.bits}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{lvl.bytes}</td>
                    <td className="px-3 py-2 font-mono text-[var(--color-text-secondary)]">{lvl.storedValue}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{lvl.error}</td>
                    <td className="px-3 py-2 text-right font-mono font-medium text-[var(--color-text)]">{lvl.perToken}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <InfoBox>
        Each number individually loses very little precision. But there are billions of numbers
        in the cache, and the errors accumulate across layers. The question is: how much accuracy
        does the model lose overall?
      </InfoBox>

      {/* Benchmark results */}
      <Panel className="mt-4">
        <PanelHeader>Benchmark results (2025&ndash;2026 research)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Method</th>
                <th className="px-4 py-2 text-right">Compression</th>
                <th className="px-4 py-2 text-right">Accuracy</th>
                <th className="px-4 py-2 text-left">Best For</th>
              </tr>
            </thead>
            <tbody>
              {QUANTIZATION_BENCHMARKS.map((row) => (
                <tr
                  key={row.method}
                  className="border-b border-[var(--color-border-light)] last:border-b-0 hover:bg-[var(--color-surface-alt)]"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.method}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.compression}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-teal-text)]">{row.accuracy}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>The practical takeaway:</strong> FP8 KV cache quantization is essentially free on modern GPUs (H100, B200) &mdash; it halves the cache with negligible accuracy loss and is natively supported in hardware. Every production deployment should use it. Beyond FP8, the accuracy/compression tradeoff becomes workload-dependent."
      />

      <Callout
        type="note"
        message="<strong>For our scenario:</strong> Switching from FP16 to FP8 halves our cache. 28,000 tokens goes from 8.96 GB to 4.48 GB. The P/D transfer from Stop 12 drops from 180 ms to 90 ms. The number of active users per GPU doubles from 18 to 36. This single change has the highest impact-to-effort ratio of any optimization in this course."
      />
    </div>
  );
}

/* ================================================================
   PAGE 4 — "Token eviction" (interactive)
   Attention distribution + eviction toggle + strategy cards + adaptive
   ================================================================ */

function EvictionPage() {
  const [showEvicted, setShowEvicted] = useState(false);

  const evictThreshold = 3; // tokens with pct <= 3 get evicted
  const keptTokens = ATTENTION_DISTRIBUTION.filter((t) => t.pct > evictThreshold);
  const evictedTokens = ATTENTION_DISTRIBUTION.filter((t) => t.pct <= evictThreshold);
  const keptPct = keptTokens.reduce((s, t) => s + t.pct, 0);
  const evictedPct = evictedTokens.reduce((s, t) => s + t.pct, 0);
  // Eviction freed cache: if we evict 5 of 11 tokens, ~45% of cache freed (in the toy example)
  const evictionFraction = evictedTokens.length / ATTENTION_DISTRIBUTION.length;

  // Show one "freed cache" figure in 28K scenario terms
  const sceneGB = 8.96;
  const freedGB = (sceneGB * evictionFraction).toFixed(2);
  const remainingGB = (sceneGB - sceneGB * evictionFraction).toFixed(2);

  return (
    <div>
      {/* Attention distribution visualization */}
      <Panel>
        <PanelHeader>
          Attention from &ldquo;faulty&rdquo; to all other tokens (callback to Stop 2)
        </PanelHeader>
        <div className="p-4 space-y-2">
          {ATTENTION_DISTRIBUTION.map((tok) => {
            const isEvicted = showEvicted && tok.pct <= evictThreshold;
            return (
              <div
                key={tok.token}
                className="flex items-center gap-3 text-[12px]"
                style={{
                  opacity: isEvicted ? 0.3 : 1,
                  transition: 'opacity 300ms ease',
                }}
              >
                <span className="min-w-[140px] font-mono text-[var(--color-text)]">
                  {tok.token}
                </span>
                <div className="flex-1 h-5 bg-[var(--color-surface-muted)] rounded overflow-hidden border border-[var(--color-border-light)]">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${tok.pct * 2}%`,
                      background: isEvicted
                        ? 'var(--color-red)'
                        : tok.pct >= 12
                          ? 'var(--color-teal)'
                          : tok.pct >= 4
                            ? 'var(--color-blue)'
                            : 'var(--color-text-muted)',
                      transition: 'width 300ms ease, background 300ms ease',
                    }}
                  />
                </div>
                <span className="min-w-[45px] text-right font-mono text-[var(--color-text-secondary)]">
                  {tok.weight}
                </span>
                <span
                  className={`min-w-[100px] text-[11px] ${
                    isEvicted
                      ? 'text-[var(--color-red-text)] font-medium'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {isEvicted ? 'EVICTED' : tok.action}
                </span>
              </div>
            );
          })}
        </div>

        {/* Toggle button and freed cache stats */}
        <div className="px-4 pb-4 space-y-3">
          <button
            onClick={() => setShowEvicted(!showEvicted)}
            className={`px-4 py-2 text-[12px] font-medium rounded border transition-all cursor-pointer ${
              showEvicted
                ? 'bg-[var(--color-red-bg)] border-[var(--color-red)] text-[var(--color-red-text)]'
                : 'bg-[var(--color-primary-bg)] border-[var(--color-primary)] text-[var(--color-primary-text)] hover:bg-[var(--color-primary)] hover:text-white'
            }`}
          >
            {showEvicted ? 'Restore all tokens' : 'Evict low-attention tokens'}
          </button>

          {showEvicted && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-2 rounded bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-center">
                <div className="text-[10px] text-[var(--color-teal-text)] uppercase tracking-wider">Kept</div>
                <div className="text-[16px] font-mono font-bold text-[var(--color-teal-text)]">
                  {keptTokens.length}/{ATTENTION_DISTRIBUTION.length}
                </div>
                <div className="text-[10px] text-[var(--color-teal-text)]">{keptPct}% of attention</div>
              </div>
              <div className="p-2 rounded bg-[var(--color-red-bg)] border border-[var(--color-red)] text-center">
                <div className="text-[10px] text-[var(--color-red-text)] uppercase tracking-wider">Evicted</div>
                <div className="text-[16px] font-mono font-bold text-[var(--color-red-text)]">
                  {evictedTokens.length}/{ATTENTION_DISTRIBUTION.length}
                </div>
                <div className="text-[10px] text-[var(--color-red-text)]">only {evictedPct.toFixed(1)}% attention</div>
              </div>
              <div className="p-2 rounded bg-[var(--color-blue-bg)] border border-[var(--color-blue)] text-center">
                <div className="text-[10px] text-[var(--color-blue-text)] uppercase tracking-wider">Freed (28K scene)</div>
                <div className="text-[16px] font-mono font-bold text-[var(--color-blue-text)]">
                  {freedGB} GB
                </div>
                <div className="text-[10px] text-[var(--color-blue-text)]">of 8.96 GB</div>
              </div>
              <div className="p-2 rounded bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-center">
                <div className="text-[10px] text-[var(--color-primary-text)] uppercase tracking-wider">Remaining</div>
                <div className="text-[16px] font-mono font-bold text-[var(--color-primary-text)]">
                  {remainingGB} GB
                </div>
                <div className="text-[10px] text-[var(--color-primary-text)]">still cached</div>
              </div>
            </div>
          )}

          {showEvicted && (
            <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
              Top {keptTokens.length} tokens retain{' '}
              <strong className="text-[var(--color-teal-text)]">{keptPct}%</strong> of attention.
              Bottom {evictedTokens.length} tokens accounted for just{' '}
              <strong className="text-[var(--color-red-text)]">{evictedPct.toFixed(1)}%</strong>.
              The model would still strongly attend to &ldquo;storage controller&rdquo; &mdash; the correct answer.
            </div>
          )}
        </div>
      </Panel>

      <InfoBox>
        This is a toy example with 11 tokens. At 28,000 tokens, the skew is even more extreme:
        typically 5&ndash;10% of tokens receive 80&ndash;90% of the attention mass. The rest is noise.
      </InfoBox>

      {/* Two eviction strategies */}
      <Panel className="mt-4">
        <PanelHeader>Two major eviction strategies</PanelHeader>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {EVICTION_STRATEGIES.map((strat) => (
            <div
              key={strat.id}
              className="p-3 rounded-lg border border-[var(--color-border-light)]"
              style={{ borderLeftWidth: 4, borderLeftColor: strat.color }}
            >
              <div className="text-[14px] font-medium text-[var(--color-text)] mb-2">
                {strat.name}
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed space-y-2">
                <p>{strat.summary}</p>
                <div className="pt-2 border-t border-[var(--color-border-light)] space-y-1">
                  <div>
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Budget: </span>
                    <span className="font-mono text-[11px]">{strat.budget}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Reduction: </span>
                    <span className="font-mono text-[11px] font-bold text-[var(--color-teal-text)]">{strat.reduction}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Accuracy: </span>
                    <span className="text-[11px]">{strat.accuracy}</span>
                  </div>
                  <div className="text-[11px] text-[var(--color-red-text)] italic pt-1">
                    Risk: {strat.risk}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="warn"
        message="Eviction is powerful but risky. When it works, it&rsquo;s the most aggressive compression available &mdash; 5&times; to 10&times; reduction. When it fails, it fails hard: the model can&rsquo;t attend to an evicted token, period. Unlike quantization, where information is degraded but still present, evicted information is <strong>gone</strong>. This is why eviction is often combined with quantization: keep all tokens at lower precision as a safe baseline, then evict only the truly negligible ones."
      />

      {/* Adaptive precision section */}
      <Panel className="mt-4">
        <PanelHeader>Beyond binary: adaptive precision instead of eviction</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The keep-or-evict choice is a blunt instrument. A token that gets 3% attention
            isn&rsquo;t worthless &mdash; it&rsquo;s just less important than one getting 48%.
            What if instead of evicting it entirely, you stored it at lower precision? The
            important tokens get FP8 or FP16. The moderate tokens get INT4. The barely-relevant
            tokens get 2-bit or a codebook index. The token is still <em>present</em> &mdash;
            it can still be attended to &mdash; but its representation is lossy.
          </p>
          <p>
            This is <strong className="text-[var(--color-text)]">adaptive precision allocation</strong>,
            an active frontier of research:
          </p>
        </div>

        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {ADAPTIVE_PRECISION.map((ap) => (
            <div
              key={ap.id}
              className="p-3 rounded-lg border border-[var(--color-border-light)]"
              style={{ borderLeftWidth: 4, borderLeftColor: ap.color }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-[13px] font-medium text-[var(--color-text)]">{ap.name}</div>
                <span
                  className="text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ background: `${ap.color}22`, color: ap.color }}
                >
                  {ap.tagline}
                </span>
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                {ap.body}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <InfoBox>
        The direction is clear: the binary &ldquo;full precision vs. gone&rdquo; choice is being replaced
        by a <strong>precision gradient</strong> that matches compression aggressiveness to each token&rsquo;s
        importance. This is analogous to variable bitrate encoding in video compression &mdash; allocate
        precision where the content is complex, compress harder where it&rsquo;s simple.
      </InfoBox>

      <Callout
        type="note"
        message="<strong>For our scenario:</strong> Applying H2O with 50% eviction to our 28,000-token document analysis: the cache drops from 8.96 GB to 4.48 GB. Combined with FP8 quantization: 4.48 GB / 2 = 2.24 GB. Combined with GQA (already built in): our 2.24 GB cache is already 32&times; smaller than hypothetical MHA at FP16. User 17&rsquo;s full document context now fits in a fraction of one GPU&rsquo;s memory."
      />
    </div>
  );
}

/* ================================================================
   PAGE 5 — "Combining techniques" — THE BIG INTERACTIVE CALCULATOR
   Dropdowns + slider + live outputs + spectrum bar + preset table
   ================================================================ */

function CombinedCalculatorPage() {
  const [archId, setArchId] = useState('gqa');
  const [quantId, setQuantId] = useState('fp8');
  const [evictionId, setEvictionId] = useState('e0');

  const arch = CALC_ARCH_OPTIONS.find((a) => a.id === archId);
  const quant = CALC_QUANT_OPTIONS.find((q) => q.id === quantId);
  const eviction = CALC_EVICTION_OPTIONS.find((e) => e.id === evictionId);

  // Live calculations
  const perTokenBytes = arch.perTokenBytes * quant.factor;
  const perTokenKB = perTokenBytes / 1024;
  const effectiveTokens = CALC_SCENARIO.totalTokens * eviction.keep;
  const totalBytes = perTokenBytes * effectiveTokens;
  const totalGB = totalBytes / 1e9;
  const totalMB = totalBytes / 1e6;

  const usersPerH100 = totalGB > 0 ? CALC_SCENARIO.gpuCacheBudgetGB / totalGB : 0;
  const transferTimeMs = (totalBytes / 1e9 / CALC_SCENARIO.transferBandwidthGBs) * 1000;

  // Compression ratio vs MHA FP16
  const baselineBytes = CALC_SCENARIO.baselineMhaFp16PerTokenBytes * CALC_SCENARIO.totalTokens;
  const compressionRatio = baselineBytes / totalBytes;

  // Format helpers
  const formatPerToken = (kb) => {
    if (kb >= 1024) return `${(kb / 1024).toFixed(2)} MB`;
    if (kb >= 1) return `${kb.toFixed(1)} KB`;
    return `${(kb * 1024).toFixed(0)} B`;
  };
  const formatTotal = (gb) => {
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    return `${(gb * 1000).toFixed(0)} MB`;
  };
  const formatUsers = (u) => {
    if (u < 1) return u.toFixed(2);
    if (u < 10) return u.toFixed(1);
    return Math.floor(u).toString();
  };
  const formatTransfer = (ms) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
    if (ms >= 10) return `${ms.toFixed(0)} ms`;
    return `${ms.toFixed(1)} ms`;
  };

  // Spectrum bar: log scale for dramatic ratio range
  const spectrumPct = Math.min(100, Math.max(2, (Math.log10(compressionRatio) / Math.log10(2000)) * 100));

  return (
    <div>
      {/* Interactive controls */}
      <Panel>
        <PanelHeader>Compression controls</PanelHeader>
        <div className="p-4 space-y-4">
          {/* Architecture dropdown */}
          <div>
            <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Architecture
            </div>
            <div className="flex flex-wrap gap-2">
              {CALC_ARCH_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setArchId(opt.id)}
                  className={`px-4 py-2 text-[12px] font-mono font-bold rounded border transition-all cursor-pointer ${
                    archId === opt.id
                      ? 'bg-[var(--color-primary-bg)] border-[var(--color-primary)] text-[var(--color-primary-text)] shadow-sm'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantization dropdown */}
          <div>
            <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Quantization
            </div>
            <div className="flex flex-wrap gap-2">
              {CALC_QUANT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setQuantId(opt.id)}
                  className={`px-4 py-2 text-[12px] font-mono font-bold rounded border transition-all cursor-pointer ${
                    quantId === opt.id
                      ? 'bg-[var(--color-blue-bg)] border-[var(--color-blue)] text-[var(--color-blue-text)] shadow-sm'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Eviction slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              <span>Token eviction</span>
              <span className="font-mono">{eviction.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={3}
                step={1}
                value={CALC_EVICTION_OPTIONS.findIndex((e) => e.id === evictionId)}
                onChange={(e) => setEvictionId(CALC_EVICTION_OPTIONS[Number(e.target.value)].id)}
                className="anim-scrubber flex-1"
              />
              <div className="flex gap-1">
                {CALC_EVICTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setEvictionId(opt.id)}
                    className={`px-2 py-1 text-[10px] font-mono rounded border transition-all cursor-pointer ${
                      evictionId === opt.id
                        ? 'bg-[var(--color-teal-bg)] border-[var(--color-teal)] text-[var(--color-teal-text)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Live output stats */}
      <Panel className="mt-4">
        <PanelHeader>Live outputs</PanelHeader>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-center">
              <div className="text-[10px] text-[var(--color-primary-text)] uppercase tracking-wider">
                Per token
              </div>
              <div
                className="text-[22px] font-mono font-bold text-[var(--color-primary-text)]"
                style={{ transition: 'all 300ms ease' }}
              >
                {formatPerToken(perTokenKB)}
              </div>
            </div>
            <div className="p-3 rounded-lg border-2 border-[var(--color-blue)] bg-[var(--color-blue-bg)] text-center">
              <div className="text-[10px] text-[var(--color-blue-text)] uppercase tracking-wider">
                28K-token total
              </div>
              <div
                className="text-[22px] font-mono font-bold text-[var(--color-blue-text)]"
                style={{ transition: 'all 300ms ease' }}
              >
                {formatTotal(totalGB)}
              </div>
            </div>
            <div className="p-3 rounded-lg border-2 border-[var(--color-teal)] bg-[var(--color-teal-bg)] text-center">
              <div className="text-[10px] text-[var(--color-teal-text)] uppercase tracking-wider">
                Users per H100
              </div>
              <div
                className="text-[22px] font-mono font-bold text-[var(--color-teal-text)]"
                style={{ transition: 'all 300ms ease' }}
              >
                {formatUsers(usersPerH100)}
              </div>
            </div>
            <div className="p-3 rounded-lg border-2 border-[var(--color-amber)] bg-[var(--color-amber-bg)] text-center">
              <div className="text-[10px] text-[var(--color-amber-text)] uppercase tracking-wider">
                Transfer @ 50 GB/s
              </div>
              <div
                className="text-[22px] font-mono font-bold text-[var(--color-amber-text)]"
                style={{ transition: 'all 300ms ease' }}
              >
                {formatTransfer(transferTimeMs)}
              </div>
            </div>
          </div>

          {/* Compression spectrum bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] mb-1">
              <span>Compression vs. MHA + FP16 (log scale)</span>
              <span className="font-mono font-bold text-[var(--color-text)]">
                {compressionRatio.toFixed(1)}&times;
              </span>
            </div>
            <div className="h-8 rounded-lg overflow-hidden border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] relative">
              <div
                className="h-full rounded-lg flex items-center justify-end pr-3 text-[12px] font-medium text-white"
                style={{
                  width: `${spectrumPct}%`,
                  background: 'linear-gradient(90deg, var(--color-teal), var(--color-blue), var(--color-primary))',
                  transition: 'width 300ms ease',
                }}
              >
                {spectrumPct > 22 ? `${compressionRatio.toFixed(1)}\u00d7 smaller` : ''}
              </div>
            </div>
            <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] mt-1 font-mono">
              <span>1&times;</span>
              <span>10&times;</span>
              <span>100&times;</span>
              <span>1000&times;</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-[11px] text-[var(--color-text-secondary)] font-mono">
            <strong>{arch.label}</strong> + <strong>{quant.label}</strong> + <strong>{eviction.label} eviction</strong>
            {' = '}
            {arch.fp16PerTokenKB} KB &times; {quant.factor} &times; {eviction.keep} &times; 28,000 tokens = <strong>{formatTotal(totalGB)}</strong>
          </div>
        </div>
      </Panel>

      {/* Preset table */}
      <Panel className="mt-4">
        <PanelHeader>Seven preset combinations</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Arch</th>
                <th className="px-3 py-2 text-left">Quant</th>
                <th className="px-3 py-2 text-left">Eviction</th>
                <th className="px-3 py-2 text-right">Per Token</th>
                <th className="px-3 py-2 text-right">28K Total</th>
                <th className="px-3 py-2 text-right">Users/H100</th>
                <th className="px-3 py-2 text-right">P/D Transfer</th>
              </tr>
            </thead>
            <tbody>
              {COMBINED_PRESETS.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.highlight ? 'bg-[var(--color-teal-bg)]' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">{row.arch}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.quant}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.eviction}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.perToken}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.at28K}</td>
                  <td className={`px-3 py-2 text-right font-mono font-medium ${
                    row.highlight ? 'text-[var(--color-teal-text)]' : 'text-[var(--color-text)]'
                  }`}>
                    {row.usersPerH100}
                    {row.usersNote && (
                      <span className="text-[10px] text-[var(--color-text-muted)] ml-1">({row.usersNote})</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.transferTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <InfoBox>
        The last row is theoretical &mdash; MQA at INT4 with 75% eviction would compress the
        cache by over 1,000&times; from MHA + FP16. In practice, the accuracy loss at that extreme
        would make the model nearly useless for complex tasks. But it illustrates the design space:
        there are many viable points between &ldquo;no compression&rdquo; and &ldquo;maximum compression.&rdquo;
      </InfoBox>

      <Callout
        type="good"
        message="<strong>The production sweet spot for most deployments in 2026:</strong> GQA-8 (built into the model) + FP8 quantization (hardware-accelerated, negligible quality loss) = 16&times; compression vs. MHA + FP16. This is what Llama-3 already does (GQA) combined with what every H100/B200 deployment should enable (FP8 KV cache)."
      />
    </div>
  );
}

/* ================================================================
   PAGE 6 — "Accuracy vs compression"
   Task-type table with red highlighting + recommendations + ThinKV note
   ================================================================ */

function AccuracyPage() {
  const cellStyle = (val) => {
    if (val < 85) return 'text-[var(--color-red-text)] font-bold bg-[var(--color-red-bg)]';
    if (val < 93) return 'text-[var(--color-red-text)] font-medium';
    if (val >= 99) return 'text-[var(--color-teal-text)] font-medium';
    return 'text-[var(--color-text-secondary)]';
  };

  return (
    <div>
      <Panel>
        <PanelHeader>Accuracy retention by task type (benchmarks, 2025&ndash;2026)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Compression</th>
                <th className="px-3 py-2 text-right">Chat / QA</th>
                <th className="px-3 py-2 text-right">Summarization</th>
                <th className="px-3 py-2 text-right">Code Gen</th>
                <th className="px-3 py-2 text-right">Math Reasoning</th>
                <th className="px-3 py-2 text-right">Long Retrieval</th>
              </tr>
            </thead>
            <tbody>
              {ACCURACY_BY_TASK.map((row) => (
                <tr
                  key={row.compression}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">{row.compression}</td>
                  <td className={`px-3 py-2 text-right font-mono ${cellStyle(row.chatQA)}`}>{row.chatQA}%</td>
                  <td className={`px-3 py-2 text-right font-mono ${cellStyle(row.summarization)}`}>{row.summarization}%</td>
                  <td className={`px-3 py-2 text-right font-mono ${cellStyle(row.codeGen)}`}>{row.codeGen}%</td>
                  <td className={`px-3 py-2 text-right font-mono ${cellStyle(row.mathReasoning)}`}>{row.mathReasoning}%</td>
                  <td className={`px-3 py-2 text-right font-mono ${cellStyle(row.longRetrieval)}`}>{row.longRetrieval}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Per-row recommendations */}
      <Panel className="mt-4">
        <PanelHeader>Recommendation per compression level</PanelHeader>
        <div className="p-4 space-y-2">
          {ACCURACY_BY_TASK.map((row) => (
            <div
              key={row.compression}
              className="flex items-start gap-3 p-2 rounded border border-[var(--color-border-light)]"
            >
              <span className="min-w-[160px] text-[12px] font-medium text-[var(--color-text)]">
                {row.compression}
              </span>
              <span className="text-[12px] text-[var(--color-text-secondary)] flex-1">
                {row.recommendation}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="warn"
        message="The pattern: <strong>reasoning and retrieval degrade fastest.</strong> Math reasoning requires precise numerical values in the cache (quantization hurts) and precise recall of specific tokens (eviction hurts). General chat is the most forgiving because the model relies on broad context rather than specific token recall."
      />

      {/* Task-type notes */}
      <Panel className="mt-4">
        <PanelHeader>Task sensitivity overview</PanelHeader>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {TASK_TYPES.map((t) => (
            <div
              key={t.id}
              className="p-2 rounded border border-[var(--color-border-light)] text-[12px]"
            >
              <div className="font-medium text-[var(--color-text)]">{t.label}</div>
              <div className="text-[var(--color-text-muted)] text-[11px]">{t.note}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>What this means for our scenario</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Our 500 engineers use the assistant for <strong className="text-[var(--color-text)]">code review</strong> (sensitive
            to code generation accuracy), <strong className="text-[var(--color-text)]">documentation</strong> (summarization),
            and <strong className="text-[var(--color-text)]">debugging</strong> (reasoning). FP8 is safe across all tasks.
            INT4 is acceptable for chat and documentation but risky for debugging. Eviction beyond 25%
            would degrade code review quality.
          </p>
          <p>
            Our production configuration: <strong className="text-[var(--color-teal-text)]">GQA-8 + FP8 + no eviction</strong> &mdash;
            the conservative, high-quality choice that still delivers 16&times; compression.
          </p>
        </div>
      </Panel>

      {/* Thought-adaptive compression */}
      <Panel className="mt-4">
        <PanelHeader>An emerging approach: thought-adaptive compression</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Recent work (ThinKV, 2025) applies different precision levels to different parts
            of the conversation: reasoning tokens get FP8 (high precision), routine context
            gets INT4, and transitional phrases get 2-bit. This mixed-precision approach preserves
            quality where it matters while compressing aggressively where it doesn&rsquo;t.
          </p>
          <p>
            This is analogous to <strong className="text-[var(--color-text)]">variable-bitrate encoding in video compression</strong> &mdash;
            allocate precision where the content is complex, compress harder where it&rsquo;s simple.
          </p>
        </div>
      </Panel>
    </div>
  );
}

/* ================================================================
   PAGE 7 — "Infrastructure impact"
   FP16 vs FP8 comparison table with side-by-side bars
   ================================================================ */

function InfrastructurePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>FP16 vs FP8 across the full stack (Stops 11&ndash;13)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Component</th>
                <th className="px-3 py-2 text-right">GQA + FP16</th>
                <th className="px-3 py-2 text-right">GQA + FP8</th>
                <th className="px-3 py-2 text-left">Improvement</th>
              </tr>
            </thead>
            <tbody>
              {INFRA_IMPACT.map((row) => (
                <tr
                  key={row.component}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-3 py-2 text-[var(--color-text)]">{row.component}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.fp16}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.fp8}</td>
                  <td className="px-3 py-2 font-medium text-[var(--color-teal-text)]">{row.improvement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Side-by-side bar visualization for numeric rows */}
      <Panel className="mt-4">
        <PanelHeader>Side-by-side impact (numeric metrics)</PanelHeader>
        <div className="p-4 space-y-3">
          {INFRA_IMPACT.filter((r) => r.fp16Num !== null && r.fp8Num !== null).map((row) => {
            const maxVal = Math.max(row.fp16Num, row.fp8Num);
            // For rows where smaller is better (cache, transfer time), we still draw bars proportional to value
            const fp16Pct = (row.fp16Num / maxVal) * 100;
            const fp8Pct = (row.fp8Num / maxVal) * 100;
            return (
              <div key={row.component} className="space-y-1">
                <div className="text-[11px] text-[var(--color-text-muted)]">{row.component}</div>
                <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center text-[11px]">
                  <span className="font-mono text-[var(--color-text-muted)] min-w-[40px] text-right">FP16</span>
                  <div className="h-4 bg-[var(--color-surface-muted)] rounded overflow-hidden border border-[var(--color-border-light)]">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${fp16Pct}%`,
                        background: 'var(--color-primary)',
                        transition: 'width 300ms ease',
                      }}
                    />
                  </div>
                  <span className="font-mono text-[var(--color-text-secondary)] min-w-[60px]">{row.fp16}</span>

                  <span className="font-mono text-[var(--color-teal-text)] min-w-[40px] text-right">FP8</span>
                  <div className="h-4 bg-[var(--color-surface-muted)] rounded overflow-hidden border border-[var(--color-border-light)]">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${fp8Pct}%`,
                        background: 'var(--color-teal)',
                        transition: 'width 300ms ease',
                      }}
                    />
                  </div>
                  <span className="font-mono text-[var(--color-teal-text)] min-w-[60px]">{row.fp8}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Callout
        type="good"
        message="Every single metric improves. This is why FP8 KV cache quantization is sometimes called &ldquo;the free lunch&rdquo; of inference optimization &mdash; it improves everything with virtually no downside on modern hardware."
      />

      <Callout
        type="note"
        message="<strong>[Forward ref: Stop 15]</strong> When we examine the network fabric in detail, the bandwidth requirements for KV cache transfers will be calculated at FP8 precision &mdash; halving the data that flows over the wire compared to FP16. This affects fabric sizing, switch selection, and congestion management."
      />
    </div>
  );
}

/* ================================================================
   PAGE 8 — "Stop 14 at a glance"
   Summary table + bridge to Stop 15 with protocol preview
   ================================================================ */

function SummaryPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Four families of compression at a glance</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Family</th>
                <th className="px-3 py-2 text-left">Compresses</th>
                <th className="px-3 py-2 text-left">When Applied</th>
                <th className="px-3 py-2 text-right">Reduction</th>
                <th className="px-3 py-2 text-left">Accuracy Cost</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_TABLE.map((row) => (
                <tr
                  key={row.family}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.highlight ? 'bg-[var(--color-teal-bg)]' : ''
                  }`}
                >
                  <td className={`px-3 py-2 ${row.highlight ? 'font-bold' : 'font-medium'} text-[var(--color-text)]`}>
                    {row.family}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.compresses}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.whenApplied}</td>
                  <td className="px-3 py-2 text-right font-mono font-medium text-[var(--color-teal-text)]">
                    {row.typicalReduction}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.accuracyCost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Bridge to Stop 15 with protocol preview */}
      <Panel className="mt-4">
        <PanelHeader>Bridge to Stop 15 &mdash; network protocols preview</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            We now understand what the KV cache <strong className="text-[var(--color-text)]">IS</strong> (Stops 8&ndash;10),
            how it&rsquo;s <strong className="text-[var(--color-text)]">MANAGED</strong> in memory (Stop 11),
            how it <strong className="text-[var(--color-text)]">TRANSFERS</strong> between GPU pools (Stop 12),
            where it <strong className="text-[var(--color-text)]">LIVES</strong> in the memory hierarchy (Stop 13),
            and how to make it <strong className="text-[var(--color-text)]">SMALLER</strong> (this stop).
          </p>
          <p>
            The remaining question: <strong className="text-[var(--color-text)]">HOW</strong> does the cache
            physically move between all these components? What protocols carry it?
          </p>
          <p>
            For our scenario with FP8 compression, a 28,000-token P/D transfer is 4.48 GB. At 400 Gbps
            RDMA (50 GB/s), that&rsquo;s 90 ms. But what <em>IS</em> &ldquo;400 Gbps RDMA&rdquo;?
          </p>
        </div>

        {/* Protocol preview cards */}
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: 'RoCEv2 / Spectrum-X', role: 'Ethernet-based RDMA with lossless flow control', color: 'var(--color-teal)' },
            { name: 'InfiniBand NDR', role: 'Switch-fabric RDMA with adaptive routing', color: 'var(--color-blue)' },
            { name: 'CXL 2.0', role: 'Sub-microsecond memory-semantic access', color: 'var(--color-primary)' },
            { name: 'NVMe-oF', role: 'Storage-tier access over the fabric', color: 'var(--color-amber)' },
          ].map((p) => (
            <div
              key={p.name}
              className="p-3 rounded-lg border border-[var(--color-border-light)]"
              style={{ borderLeftWidth: 4, borderLeftColor: p.color }}
            >
              <div className="text-[13px] font-medium text-[var(--color-text)]">{p.name}</div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-1">{p.role}</div>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4">
          <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            <strong className="text-[var(--color-text)]">
              Stop 15 maps the network fabric that connects every tier and every GPU pool &mdash;
              the data paths that make everything we&rsquo;ve discussed physically possible.
            </strong>
          </p>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>The story so far:</strong> We&rsquo;ve traced the KV cache from a single attention dot product (Stop 2) through multi-head and multi-layer growth (Stops 8&ndash;9), memory management (Stop 11), disaggregated transfer (Stop 12), the storage hierarchy (Stop 13), and now compression (Stop 14). With GQA + FP8, User 17&rsquo;s 28,000-token conversation occupies 4.48 GB instead of the 73.3 GB it would need with MHA + FP16. Next: the physical fabric that carries it."
      />
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function CompressingCache() {
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

  // Format narration: replace \n\n with paragraph breaks (same pattern as Stop 11)
  const narrationHtml = narration
    .replace(/\n\n/g, '</p><p style="margin-top:0.5em">')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');

  return (
    <div>
      {/* Narration — always at top, passed through dangerouslySetInnerHTML directly */}
      <div
        className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed
                    px-4 py-3 bg-[var(--color-surface-muted)] rounded-lg
                    border border-[var(--color-border-light)] mb-5"
        dangerouslySetInnerHTML={{ __html: narrationHtml }}
      />

      {/* Page content */}
      <div className="min-h-[200px]">
        {page.id === 'cascading' && <CascadingPage />}
        {page.id === 'architectural' && <ArchitecturalPage />}
        {page.id === 'quantization' && <QuantizationPage />}
        {page.id === 'eviction' && <EvictionPage />}
        {page.id === 'combined' && <CombinedCalculatorPage />}
        {page.id === 'accuracy' && <AccuracyPage />}
        {page.id === 'infrastructure' && <InfrastructurePage />}
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
