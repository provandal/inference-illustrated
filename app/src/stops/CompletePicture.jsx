import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PAGES,
  CURRICULUM_MAP,
  MODEL_CONFIGS,
  GPU_SPECS,
  KV_PRECISION,
  WEIGHT_QUANT,
  DEPLOYMENT_PRESETS,
  TRACE_SCENARIOS,
  RESOURCES,
  ACTIVE_COMMUNITIES,
  CASCADING_EFFECTS,
  kvCacheBytesPerToken,
  kvCachePerUser_GB,
  weightSize_GB,
  availableHBMPerGPU_GB,
  maxUsersPerGPU,
  evaluateDeployment,
} from '../data/stop17Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Narration text for each page ---

const NARRATIONS = {
  'everything-together':
    'Over sixteen stops, we&rsquo;ve built inference infrastructure from the ground up: <strong>Act 1</strong> covered how transformers work, why they need attention, how Q/K/V enables direct lookup, why multi-head attention multiplies the cache, why layers deepen it further, and why caching K and V is both essential (O(T) vs O(T&sup2;) compute) and expensive (gigabytes per conversation). <strong>Act 2</strong> covered how batching makes GPUs economically viable, how PagedAttention eliminates memory waste, how disaggregated inference separates prefill from decode, how tiered memory extends capacity from gigabytes to petabytes, how compression shrinks the cache 16&times;+, how four protocol families carry cache data at different speeds, and how intelligent routing ensures requests reach the right GPU. Now let&rsquo;s see it all work together.',

  'capstone-diagram':
    'This interactive diagram represents a complete inference deployment. Every component you&rsquo;ve learned about is present. Adjust any parameter and watch the effects cascade through the entire system.',

  'trace-request':
    'The best way to understand the system is to watch one request flow through it, end to end. Select a scenario and watch every component participate.',

  'deployment-planner':
    'Now it&rsquo;s your turn. Configure a deployment for your workload and see how the system performs. Start with our scenario (32 users, 8&times; H100, Llama-3 70B) or build your own from scratch.',

  'where-next':
    'You&rsquo;ve built a mental model of inference infrastructure from transformer attention through production deployment. Here&rsquo;s where to deepen your understanding.',
};

// ---------------------------------------------------------------------------
// Shared control components
// ---------------------------------------------------------------------------

function SelectControl({ label, value, options, onChange }) {
  return (
    <label className="flex items-center gap-2 text-[12px]">
      <span className="text-[var(--color-text-muted)] min-w-[80px]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-[12px] cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SliderControl({ label, value, options, onChange }) {
  const idx = options.indexOf(value);
  return (
    <label className="flex items-center gap-2 text-[12px]">
      <span className="text-[var(--color-text-muted)] min-w-[80px]">{label}</span>
      <input
        type="range"
        min={0}
        max={options.length - 1}
        value={idx >= 0 ? idx : 0}
        onChange={(e) => onChange(options[Number(e.target.value)])}
        className="flex-1 accent-[var(--color-primary)] cursor-pointer"
      />
      <span className="font-mono text-[var(--color-text)] min-w-[60px] text-right">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </label>
  );
}

function ToggleControl({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 text-[12px] cursor-pointer">
      <span className="text-[var(--color-text-muted)] min-w-[80px]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
          value
            ? 'bg-[var(--color-primary)]'
            : 'bg-[var(--color-border)]'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span className="text-[var(--color-text)] text-[11px]">
        {value ? 'Disaggregated' : 'Aggregated'}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// GPU Memory Bar
// ---------------------------------------------------------------------------

function GPUMemoryBar({ gpuIndex, weightsGB, cacheGB, totalGB, usersOnGPU }) {
  const weightsPct = Math.min(100, (weightsGB / totalGB) * 100);
  const cachePct = Math.min(100 - weightsPct, (cacheGB / totalGB) * 100);
  const freePct = Math.max(0, 100 - weightsPct - cachePct);
  const full = freePct < 5;
  return (
    <div className={`p-2 rounded border text-[10px] ${full ? 'border-[var(--color-red)] bg-[var(--color-red-bg)]' : 'border-[var(--color-border-light)] bg-[var(--color-surface-muted)]'}`}>
      <div className="flex justify-between mb-1">
        <span className="font-medium text-[var(--color-text)]">GPU {gpuIndex}</span>
        <span className="text-[var(--color-text-muted)]">{usersOnGPU}u</span>
      </div>
      <div className="flex h-3 rounded overflow-hidden">
        <div
          className="h-full"
          style={{ width: `${weightsPct}%`, background: 'var(--color-primary)' }}
          title={`Weights: ${weightsGB.toFixed(1)} GB`}
        />
        <div
          className="h-full"
          style={{ width: `${cachePct}%`, background: 'var(--color-teal)' }}
          title={`KV Cache: ${cacheGB.toFixed(1)} GB`}
        />
        <div
          className="h-full"
          style={{ width: `${freePct}%`, background: 'var(--color-surface)' }}
          title={`Free: ${(totalGB - weightsGB - cacheGB).toFixed(1)} GB`}
        />
      </div>
      <div className="flex justify-between mt-0.5 text-[8px] text-[var(--color-text-muted)]">
        <span>{weightsGB.toFixed(0)}G wt</span>
        <span>{cacheGB.toFixed(1)}G kv</span>
        <span>{Math.max(0, totalGB - weightsGB - cacheGB).toFixed(0)}G free</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric card
// ---------------------------------------------------------------------------

function MetricCard({ label, value, unit, warn }) {
  return (
    <div className={`p-2 rounded border text-center ${warn ? 'border-[var(--color-red)] bg-[var(--color-red-bg)]' : 'border-[var(--color-border-light)] bg-[var(--color-surface-muted)]'}`}>
      <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{label}</div>
      <div className={`text-[16px] font-mono font-bold ${warn ? 'text-[var(--color-red-text)]' : 'text-[var(--color-text)]'}`}>
        {value}
      </div>
      {unit && <div className="text-[9px] text-[var(--color-text-muted)]">{unit}</div>}
    </div>
  );
}

// =========================================================================
// PAGE 1: Everything, Together
// =========================================================================

function EverythingTogetherPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The complete curriculum map</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Stop</th>
                <th className="px-4 py-2 text-left">Component</th>
                <th className="px-4 py-2 text-left">System role</th>
              </tr>
            </thead>
            <tbody>
              {CURRICULUM_MAP.map((row, i) => {
                const isActBreak = row.stops === '11';
                return (
                  <tr
                    key={row.stops}
                    className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                      isActBreak ? 'border-t-2 border-t-[var(--color-primary)]' : ''
                    }`}
                  >
                    <td className="px-4 py-2 font-mono font-medium text-[var(--color-text)]">
                      {row.stops}
                    </td>
                    <td className="px-4 py-2 text-[var(--color-text)]">{row.component}</td>
                    <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.systemRole}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Two acts, one system</PanelHeader>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary-bg)]">
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
              Act 1 &mdash; The Mechanism (Stops 1&ndash;10)
            </div>
            <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
              How transformers work, why they need attention, how Q/K/V enables
              direct lookup, why multi-head attention multiplies the cache, why
              layers deepen it further, and why caching K and V is both essential
              (O(T) vs O(T&sup2;) compute) and expensive (gigabytes per conversation).
            </p>
          </div>
          <div className="p-3 rounded-lg border border-[var(--color-teal)] bg-[var(--color-teal-bg)]">
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--color-teal)' }}>
              Act 2 &mdash; The Infrastructure (Stops 11&ndash;16)
            </div>
            <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
              How batching makes GPUs viable, how PagedAttention eliminates waste,
              how disaggregated inference separates prefill from decode, how tiered
              memory extends capacity, how compression shrinks the cache 16&times;+,
              how four protocol families carry cache data, and how intelligent
              routing ensures requests reach the right GPU.
            </p>
          </div>
        </div>
      </Panel>

      <Callout
        type="good"
        message="No new concepts are introduced in this stop. Everything here is synthesis &mdash; the moment you go from understanding individual pieces to understanding the system."
      />
    </div>
  );
}

// =========================================================================
// PAGE 2: The Capstone Diagram (Interactive Simulator)
// =========================================================================

const USER_OPTIONS = [1, 4, 8, 16, 32, 64, 128];
const CONTEXT_OPTIONS = [1024, 4096, 8192, 16384, 32768, 65536, 131072];
const GPU_COUNT_OPTIONS = [1, 2, 4, 8, 16, 32, 72, 144];
const TP_OPTIONS = [1, 2, 4, 8];

function CapstoneDiagramPage() {
  const [model, setModel] = useState('70B');
  const [weightQuant, setWeightQuant] = useState('FP4');
  const [kvPrec, setKvPrec] = useState('FP8');
  const [gpuType, setGpuType] = useState('H100');
  const [gpuCount, setGpuCount] = useState(8);
  const [concurrentUsers, setConcurrentUsers] = useState(32);
  const [contextLength, setContextLength] = useState(8192);
  const [disaggregated, setDisaggregated] = useState(false);
  const [tp, setTp] = useState(1);

  // Derived calculations
  const result = useMemo(() => evaluateDeployment({
    model, weightQuant, kvPrecision: kvPrec, gpu: gpuType,
    gpuCount, concurrentUsers, contextLength, disaggregated, tp,
  }), [model, weightQuant, kvPrec, gpuType, gpuCount, concurrentUsers, contextLength, disaggregated, tp]);

  const gpuSpec = GPU_SPECS[gpuType];
  const m = result.metrics;

  // Build GPU visualization data
  const gpuViz = useMemo(() => {
    if (!m.weightsPerGPU_GB) return [];
    const effGPUs = m.effectiveDecodeGPUs || 1;
    const usersPerGpuCalc = m.usersPerGPU || 0;
    return Array.from({ length: Math.min(gpuCount, 16) }, (_, i) => {
      const usersOnThis = i < effGPUs
        ? Math.min(usersPerGpuCalc, Math.ceil(concurrentUsers / effGPUs))
        : 0;
      const cacheOnThis = usersOnThis * (m.cachePerUser_GB || 0);
      return {
        index: i,
        weightsGB: m.weightsPerGPU_GB,
        cacheGB: Math.min(cacheOnThis, m.availHBMPerGPU_GB || gpuSpec.hbm_GB),
        totalGB: gpuSpec.hbm_GB,
        users: usersOnThis,
        role: disaggregated
          ? (i < Math.ceil(gpuCount * 0.25) ? 'Prefill' : 'Decode')
          : 'Both',
      };
    });
  }, [gpuCount, m, gpuSpec, concurrentUsers, disaggregated]);

  return (
    <div>
      {/* Configuration controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Left: Workload */}
        <Panel>
          <PanelHeader>Workload</PanelHeader>
          <div className="p-3 space-y-3">
            <SliderControl
              label="Users"
              value={concurrentUsers}
              options={USER_OPTIONS}
              onChange={setConcurrentUsers}
            />
            <SliderControl
              label="Context"
              value={contextLength}
              options={CONTEXT_OPTIONS}
              onChange={setContextLength}
            />
          </div>
        </Panel>

        {/* Center: Model */}
        <Panel>
          <PanelHeader>Model configuration</PanelHeader>
          <div className="p-3 space-y-3">
            <SelectControl
              label="Model"
              value={model}
              options={Object.entries(MODEL_CONFIGS).map(([k, v]) => ({ value: k, label: v.label }))}
              onChange={setModel}
            />
            <SelectControl
              label="Weights"
              value={weightQuant}
              options={Object.entries(WEIGHT_QUANT).map(([k, v]) => ({ value: k, label: v.label }))}
              onChange={setWeightQuant}
            />
            <SelectControl
              label="KV cache"
              value={kvPrec}
              options={Object.entries(KV_PRECISION).map(([k, v]) => ({ value: k, label: v.label }))}
              onChange={setKvPrec}
            />
          </div>
        </Panel>

        {/* Right: Hardware */}
        <Panel>
          <PanelHeader>Hardware &amp; deployment</PanelHeader>
          <div className="p-3 space-y-3">
            <SelectControl
              label="GPU"
              value={gpuType}
              options={Object.entries(GPU_SPECS).map(([k, v]) => ({ value: k, label: `${v.label} (${v.hbm_GB} GB)` }))}
              onChange={setGpuType}
            />
            <SliderControl
              label="GPU count"
              value={gpuCount}
              options={GPU_COUNT_OPTIONS}
              onChange={setGpuCount}
            />
            <SelectControl
              label="TP degree"
              value={String(tp)}
              options={TP_OPTIONS.map((v) => ({ value: String(v), label: `TP=${v}` }))}
              onChange={(v) => setTp(Number(v))}
            />
            <ToggleControl
              label="Mode"
              value={disaggregated}
              onChange={setDisaggregated}
            />
          </div>
        </Panel>
      </div>

      {/* Status indicator */}
      <div className={`px-4 py-2 rounded-lg text-center text-[13px] font-medium mb-4 ${
        result.canServe
          ? 'bg-[var(--color-teal-bg)] text-[var(--color-teal-text)] border border-[var(--color-teal)]'
          : 'bg-[var(--color-red-bg)] text-[var(--color-red-text)] border border-[var(--color-red)]'
      }`}>
        {result.canServe
          ? `This configuration can serve ${concurrentUsers} concurrent users.`
          : `Cannot serve ${concurrentUsers} users. ${result.bottleneck}.`}
        {result.recommendation && !result.canServe && (
          <span className="block text-[12px] mt-1 opacity-80">
            Recommendation: {result.recommendation}
          </span>
        )}
      </div>

      {/* Metrics dashboard */}
      <Panel className="mb-4">
        <PanelHeader>System metrics</PanelHeader>
        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <MetricCard
            label="Cache / user"
            value={m.cachePerUser_GB ? m.cachePerUser_GB.toFixed(2) : '\u2014'}
            unit="GB"
          />
          <MetricCard
            label="Total HBM cache"
            value={m.totalCacheHBM_GB ? m.totalCacheHBM_GB.toFixed(1) : '\u2014'}
            unit="GB"
          />
          <MetricCard
            label="HBM utilization"
            value={m.hbmUtilization ? `${(m.hbmUtilization * 100).toFixed(0)}%` : '\u2014'}
            warn={m.hbmUtilization > 0.9}
          />
          <MetricCard
            label="Users / GPU"
            value={m.usersPerGPU ?? '\u2014'}
            warn={m.usersPerGPU < 2}
          />
          <MetricCard
            label="Max users"
            value={m.maxUsers ?? '\u2014'}
            warn={m.maxUsers < concurrentUsers}
          />
          <MetricCard
            label="Est. TTFT"
            value={m.ttftEstimate_ms ? `${m.ttftEstimate_ms.toFixed(0)}` : '\u2014'}
            unit="ms"
          />
        </div>
      </Panel>

      {/* GPU cluster visualization */}
      <Panel className="mb-4">
        <PanelHeader>
          GPU cluster ({Math.min(gpuCount, 16)} of {gpuCount} shown)
          {disaggregated && (
            <span className="ml-2 text-[var(--color-primary)]">
              &mdash; Disaggregated P/D
            </span>
          )}
        </PanelHeader>
        <div className="p-3">
          {/* Router */}
          <div className="text-center mb-3">
            <span className="inline-block px-3 py-1 rounded-lg text-[11px] font-medium border border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-text)]">
              Smart Router
            </span>
            <div className="text-[var(--color-text-muted)] text-[10px] mt-0.5">
              Cache-aware scoring &rarr; GPU assignment
            </div>
          </div>

          {/* GPU grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {gpuViz.map((g) => (
              <div key={g.index}>
                {disaggregated && (
                  <div className={`text-center text-[9px] font-medium mb-0.5 ${
                    g.role === 'Prefill'
                      ? 'text-[var(--color-blue)]'
                      : 'text-[var(--color-teal)]'
                  }`}>
                    {g.role}
                  </div>
                )}
                <GPUMemoryBar
                  gpuIndex={g.index}
                  weightsGB={g.weightsGB}
                  cacheGB={g.cacheGB}
                  totalGB={g.totalGB}
                  usersOnGPU={g.users}
                />
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 text-[10px] justify-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ background: 'var(--color-primary)' }} />
              <span className="text-[var(--color-text-muted)]">Weights</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ background: 'var(--color-teal)' }} />
              <span className="text-[var(--color-text-muted)]">KV Cache</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-[var(--color-surface)] border border-[var(--color-border)]" />
              <span className="text-[var(--color-text-muted)]">Free HBM</span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Memory hierarchy tiers */}
      <Panel className="mb-4">
        <PanelHeader>Memory hierarchy</PanelHeader>
        <div className="p-3 space-y-2">
          {[
            { tier: 'G1 \u2014 HBM', capacity: `${(gpuSpec.hbm_GB * gpuCount).toLocaleString()} GB`, bw: `${gpuSpec.hbmBW_TBs} TB/s`, latency: 'ns', color: 'var(--color-primary)' },
            { tier: 'G2 \u2014 DRAM', capacity: `~${(gpuCount * 2).toLocaleString()} TB`, bw: '~200 GB/s', latency: '\u00b5s', color: 'var(--color-blue)' },
            { tier: 'G3.5 \u2014 ICMS', capacity: 'Petabytes (shared)', bw: '14\u2013100 GB/s', latency: '10\u2013100 \u00b5s', color: 'var(--color-teal)' },
            { tier: 'G4 \u2014 Storage', capacity: 'Unlimited', bw: '1\u201314 GB/s', latency: 'ms', color: 'var(--color-text-muted)' },
          ].map((t) => (
            <div key={t.tier} className="flex items-center gap-3 text-[12px]">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
              <span className="min-w-[120px] font-medium text-[var(--color-text)]">{t.tier}</span>
              <span className="min-w-[130px] font-mono text-[var(--color-text-secondary)]">{t.capacity}</span>
              <span className="min-w-[100px] font-mono text-[var(--color-text-secondary)]">{t.bw}</span>
              <span className="font-mono text-[var(--color-text-muted)]">{t.latency}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Cascading effects */}
      <Panel>
        <PanelHeader>Cascading effects &mdash; change one parameter, everything shifts</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Change</th>
                <th className="px-4 py-2 text-left">Cascading effects</th>
              </tr>
            </thead>
            <tbody>
              {CASCADING_EFFECTS.map((row) => (
                <tr
                  key={row.change}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.change}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.effects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <InfoBox>
        Try it: move the user count slider up and watch the GPU memory bars fill.
        Then switch KV cache precision from FP8 to INT4 and watch them drop by half.
        Then enable disaggregation and see the GPUs split into prefill and decode pools.
        Every parameter connects to every other.
      </InfoBox>
    </div>
  );
}

// =========================================================================
// PAGE 3: Trace One Request
// =========================================================================

function TraceRequestPage() {
  const [selectedScenario, setSelectedScenario] = useState('new-short');
  const [activeStep, setActiveStep] = useState(-1);
  const [animating, setAnimating] = useState(false);

  const scenario = TRACE_SCENARIOS.find((s) => s.id === selectedScenario);

  const startTrace = useCallback(() => {
    setActiveStep(0);
    setAnimating(true);
  }, []);

  useEffect(() => {
    if (!animating || activeStep < 0) return;
    if (activeStep >= scenario.steps.length) {
      setAnimating(false);
      return;
    }
    const timer = setTimeout(() => {
      setActiveStep((prev) => prev + 1);
    }, 800);
    return () => clearTimeout(timer);
  }, [animating, activeStep, scenario]);

  // Reset animation when scenario changes
  useEffect(() => {
    setActiveStep(-1);
    setAnimating(false);
  }, [selectedScenario]);

  return (
    <div>
      {/* Scenario selector */}
      <Panel className="mb-4">
        <PanelHeader>Select a scenario</PanelHeader>
        <div className="p-3 space-y-2">
          {TRACE_SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedScenario(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border text-[12px] transition-colors cursor-pointer ${
                selectedScenario === s.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-text)]'
                  : 'border-[var(--color-border-light)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'
              }`}
            >
              <strong className="text-[var(--color-text)]">{s.label}</strong>
              <span className="ml-2">&mdash; {s.description}</span>
            </button>
          ))}
        </div>
      </Panel>

      {/* Animation control */}
      <div className="text-center mb-4">
        <button
          type="button"
          onClick={startTrace}
          className="px-5 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors cursor-pointer"
        >
          {animating ? 'Tracing...' : 'Trace Request'}
        </button>
      </div>

      {/* Step-by-step trace */}
      <Panel>
        <PanelHeader>Request flow &mdash; {scenario.label}</PanelHeader>
        <div className="px-4 py-3 space-y-2">
          {scenario.steps.map((step, i) => {
            const isVisible = activeStep < 0 || i <= activeStep;
            const isActive = i === activeStep;
            return (
              <div
                key={i}
                className={`rounded-lg border p-3 text-[12px] transition-all duration-300 ${
                  !isVisible
                    ? 'opacity-20 border-[var(--color-border-light)]'
                    : isActive
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] shadow-sm'
                      : 'border-[var(--color-border-light)] bg-[var(--color-surface-muted)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white'
                      : isVisible
                        ? 'bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)]'
                        : 'bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-[var(--color-text-muted)]'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--color-text)]">{step.phase}</div>
                    <div className="text-[var(--color-text-secondary)] mt-0.5">{step.detail}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[10px]">
                      {step.time !== '\u2014' && (
                        <span>
                          <span className="text-[var(--color-text-muted)]">Time: </span>
                          <span className="font-mono text-[var(--color-text)]">{step.time}</span>
                        </span>
                      )}
                      {step.data !== '\u2014' && (
                        <span>
                          <span className="text-[var(--color-text-muted)]">Data: </span>
                          <span className="font-mono text-[var(--color-text)]">{step.data}</span>
                        </span>
                      )}
                      {step.protocol !== '\u2014' && (
                        <span>
                          <span className="text-[var(--color-text-muted)]">Protocol: </span>
                          <span className="font-mono text-[var(--color-text)]">{step.protocol}</span>
                        </span>
                      )}
                      <span>
                        <span className="text-[var(--color-text-muted)]">Component: </span>
                        <span className="font-mono text-[var(--color-primary)]">{step.component}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Result summary */}
      {(activeStep >= scenario.steps.length || activeStep < 0) && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Callout
            type="good"
            message={`<strong>Time to First Token:</strong> ${scenario.ttft}`}
          />
          <Panel>
            <div className="p-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              {scenario.summary}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// PAGE 4: Design Your Own Deployment (Calculator)
// =========================================================================

function DeploymentPlannerPage() {
  const [model, setModel] = useState('70B');
  const [weightQuant, setWeightQuant] = useState('FP4');
  const [kvPrec, setKvPrec] = useState('FP8');
  const [gpuType, setGpuType] = useState('H100');
  const [gpuCount, setGpuCount] = useState(8);
  const [concurrentUsers, setConcurrentUsers] = useState(32);
  const [contextLength, setContextLength] = useState(8192);
  const [disaggregated, setDisaggregated] = useState(false);
  const [tp, setTp] = useState(1);

  const applyPreset = useCallback((preset) => {
    const c = preset.config;
    setModel(c.model);
    setWeightQuant(c.weightQuant);
    setKvPrec(c.kvPrecision);
    setGpuType(c.gpu);
    setGpuCount(c.gpuCount);
    setConcurrentUsers(c.concurrentUsers);
    setContextLength(c.contextLength);
    setDisaggregated(c.disaggregated);
    setTp(c.tp);
  }, []);

  const result = useMemo(() => evaluateDeployment({
    model, weightQuant, kvPrecision: kvPrec, gpu: gpuType,
    gpuCount, concurrentUsers, contextLength, disaggregated, tp,
  }), [model, weightQuant, kvPrec, gpuType, gpuCount, concurrentUsers, contextLength, disaggregated, tp]);

  const m = result.metrics;
  const gpuSpec = GPU_SPECS[gpuType];

  return (
    <div>
      {/* Presets */}
      <Panel className="mb-4">
        <PanelHeader>Preset scenarios</PanelHeader>
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {DEPLOYMENT_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className="text-left px-3 py-2 rounded-lg border border-[var(--color-border-light)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] text-[12px] transition-colors cursor-pointer"
            >
              <strong className="text-[var(--color-text)]">{p.label}</strong>
              <div className="text-[var(--color-text-muted)] text-[11px] mt-0.5">{p.description}</div>
            </button>
          ))}
        </div>
      </Panel>

      {/* Input panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Panel>
          <PanelHeader>Workload &amp; Model</PanelHeader>
          <div className="p-3 space-y-3">
            <SliderControl label="Users" value={concurrentUsers} options={USER_OPTIONS} onChange={setConcurrentUsers} />
            <SliderControl label="Context" value={contextLength} options={CONTEXT_OPTIONS} onChange={setContextLength} />
            <SelectControl label="Model" value={model} options={Object.entries(MODEL_CONFIGS).map(([k, v]) => ({ value: k, label: v.label }))} onChange={setModel} />
            <SelectControl label="Weights" value={weightQuant} options={Object.entries(WEIGHT_QUANT).map(([k, v]) => ({ value: k, label: v.label }))} onChange={setWeightQuant} />
            <SelectControl label="KV cache" value={kvPrec} options={Object.entries(KV_PRECISION).map(([k, v]) => ({ value: k, label: v.label }))} onChange={setKvPrec} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader>Hardware &amp; Deployment</PanelHeader>
          <div className="p-3 space-y-3">
            <SelectControl label="GPU" value={gpuType} options={Object.entries(GPU_SPECS).map(([k, v]) => ({ value: k, label: `${v.label} (${v.hbm_GB} GB)` }))} onChange={setGpuType} />
            <SliderControl label="GPU count" value={gpuCount} options={GPU_COUNT_OPTIONS} onChange={setGpuCount} />
            <SelectControl label="TP degree" value={String(tp)} options={TP_OPTIONS.map((v) => ({ value: String(v), label: `TP=${v}` }))} onChange={(v) => setTp(Number(v))} />
            <ToggleControl label="Mode" value={disaggregated} onChange={setDisaggregated} />
          </div>
        </Panel>
      </div>

      {/* Output panel */}
      <Panel className="mb-4">
        <PanelHeader>Deployment analysis</PanelHeader>
        <div className="p-4">
          {/* Status */}
          <div className={`px-4 py-3 rounded-lg text-center text-[14px] font-bold mb-4 ${
            result.canServe
              ? 'bg-[var(--color-teal-bg)] text-[var(--color-teal-text)] border border-[var(--color-teal)]'
              : 'bg-[var(--color-red-bg)] text-[var(--color-red-text)] border border-[var(--color-red)]'
          }`}>
            {result.canServe
              ? 'This workload can be served.'
              : 'This workload cannot be served.'}
          </div>

          {/* Bottleneck / recommendation */}
          {!result.canServe && result.bottleneck && (
            <Callout
              type="warn"
              message={`<strong>Bottleneck:</strong> ${result.bottleneck}.<br/><strong>Recommendation:</strong> ${result.recommendation}`}
            />
          )}

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
            <MetricCard label="Weights / GPU" value={m.weightsPerGPU_GB ? m.weightsPerGPU_GB.toFixed(1) : '\u2014'} unit="GB" />
            <MetricCard label="Cache / user" value={m.cachePerUser_GB ? m.cachePerUser_GB.toFixed(2) : '\u2014'} unit="GB" />
            <MetricCard label="Avail HBM / GPU" value={m.availHBMPerGPU_GB ? m.availHBMPerGPU_GB.toFixed(1) : '\u2014'} unit="GB" />
            <MetricCard label="Users / GPU" value={m.usersPerGPU ?? '\u2014'} warn={m.usersPerGPU < 2} />
            <MetricCard label="DP degree" value={m.dpDegree ?? '\u2014'} />
            <MetricCard label="Decode GPUs" value={m.effectiveDecodeGPUs ?? '\u2014'} />
            <MetricCard label="Max users" value={m.maxUsers ?? '\u2014'} warn={m.maxUsers < concurrentUsers} />
            <MetricCard label="Total HBM" value={m.totalHBM_GB ? `${m.totalHBM_GB.toLocaleString()}` : '\u2014'} unit="GB" />
            <MetricCard label="HBM used for cache" value={m.totalCacheHBM_GB ? m.totalCacheHBM_GB.toFixed(1) : '\u2014'} unit="GB" />
            <MetricCard label="HBM utilization" value={m.hbmUtilization ? `${(m.hbmUtilization * 100).toFixed(0)}%` : '\u2014'} warn={m.hbmUtilization > 0.9} />
            <MetricCard label="Est. TTFT (prefill)" value={m.ttftEstimate_ms ? `${m.ttftEstimate_ms.toFixed(0)}` : '\u2014'} unit="ms" />
            <MetricCard label="Tok/s per GPU" value={m.tokensPerSecPerGPU ?? '\u2014'} unit="decode" />
          </div>
        </div>
      </Panel>

      {/* HBM breakdown bar */}
      {m.totalHBM_GB > 0 && (
        <Panel>
          <PanelHeader>Cluster HBM breakdown</PanelHeader>
          <div className="p-4">
            <div className="flex h-8 rounded-lg overflow-hidden border border-[var(--color-border-light)]">
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                style={{
                  width: `${((m.weightsPerGPU_GB * gpuCount) / m.totalHBM_GB) * 100}%`,
                  background: 'var(--color-primary)',
                }}
              >
                {(m.weightsPerGPU_GB * gpuCount).toFixed(0)} GB weights
              </div>
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                style={{
                  width: `${(m.totalCacheHBM_GB / m.totalHBM_GB) * 100}%`,
                  background: 'var(--color-teal)',
                  minWidth: m.totalCacheHBM_GB > 0 ? '2px' : '0',
                }}
              >
                {m.totalCacheHBM_GB > 5 ? `${m.totalCacheHBM_GB.toFixed(0)} GB cache` : ''}
              </div>
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium"
                style={{
                  width: `${Math.max(0, ((m.totalHBM_GB - m.weightsPerGPU_GB * gpuCount - m.totalCacheHBM_GB) / m.totalHBM_GB)) * 100}%`,
                  background: 'var(--color-surface-muted)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {(m.totalHBM_GB - m.weightsPerGPU_GB * gpuCount - m.totalCacheHBM_GB) > 10
                  ? `${(m.totalHBM_GB - m.weightsPerGPU_GB * gpuCount - m.totalCacheHBM_GB).toFixed(0)} GB free`
                  : ''}
              </div>
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)] text-center mt-1">
              Total cluster HBM: {m.totalHBM_GB.toLocaleString()} GB across {gpuCount} GPUs
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

// =========================================================================
// PAGE 5: Where to Go from Here
// =========================================================================

function WhereNextPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Industry resources</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Topic</th>
                <th className="px-4 py-2 text-left">Resource</th>
                <th className="px-4 py-2 text-left">Why it matters</th>
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((row) => (
                <tr
                  key={row.resource}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 text-[var(--color-text)]">{row.topic}</td>
                  <td className="px-4 py-2">
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
                    >
                      {row.resource}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Active standards and communities</PanelHeader>
        <div className="px-4 py-3 space-y-2">
          {ACTIVE_COMMUNITIES.map((c) => (
            <div key={c} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: 'var(--color-primary)' }} />
              <span className="text-[var(--color-text-secondary)]">{c}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>The conversation continues</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Inference infrastructure is evolving faster than any other area of
            data center technology. The concepts in this course will remain
            foundational &mdash; attention, KV cache, tiering, compression, routing &mdash;
            but the specific numbers, products, and architectures will change.
          </p>
          <p>
            The goal was never to memorize today&rsquo;s specifications. It was to
            build the mental model that lets you evaluate tomorrow&rsquo;s.
          </p>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>You&rsquo;ve completed Inference Illustrated.</strong> From the Telephone Problem through production deployment, you now have a systems-level understanding of how transformer inference works &mdash; from the attention mechanism that creates the KV cache, to the infrastructure that manages, compresses, transports, and routes it at scale."
      />
    </div>
  );
}

// =========================================================================
// MAIN COMPONENT
// =========================================================================

export default function CompletePicture() {
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
        {page.id === 'everything-together' && <EverythingTogetherPage />}
        {page.id === 'capstone-diagram' && <CapstoneDiagramPage />}
        {page.id === 'trace-request' && <TraceRequestPage />}
        {page.id === 'deployment-planner' && <DeploymentPlannerPage />}
        {page.id === 'where-next' && <WhereNextPage />}
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
