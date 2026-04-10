import { useState, useCallback, useEffect, useRef } from 'react';
import {
  PAGES,
  NARRATIONS,
  SPLIT_AXES,
  DP_STEPS,
  DATA_PARALLEL_GPUS,
  TP_ANIMATION_STEPS,
  TENSOR_PARALLEL_GPUS,
  ALL_REDUCE_BY_MODEL,
  SUPER_LINEAR_SCALING,
  PP_STAGES,
  PP_SINGLE_TOKEN_FRAMES,
  PP_MICROBATCH_TIMELINE,
  PIPELINE_PARALLEL_GPUS,
  PARALLELISM_COMPARISON,
  SCENARIO_CONFIGS,
  AGGREGATED_TIMELINE,
  DISAGGREGATED_TIMELINE,
  TRANSFER_TIMES,
  DYNAMO_COMPONENTS,
  DYNAMO_STEADY_STATE,
  LIFECYCLE_FRAMES,
  CACHE_LIFECYCLE,
  LIFECYCLE_STOP_MAP,
  SUMMARY_TABLE,
  BRIDGE_CALC,
} from '../data/stop12Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';

/* ================================================================
   Shared animation control strip (play/pause + scrubber)
   ================================================================ */
function AnimControls({ isPlaying, onPlayToggle, value, max, onChange, label, labelMax }) {
  return (
    <div className="pt-3 border-t border-[var(--color-border-light)] flex items-center gap-3">
      <button
        onClick={onPlayToggle}
        className="px-3 py-1 text-[11px] rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer text-[var(--color-text-secondary)]"
      >
        {isPlaying ? 'Pause' : value >= max ? 'Replay' : 'Play'}
      </button>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="anim-scrubber flex-1"
      />
      <span className="text-[11px] font-mono text-[var(--color-text-muted)] min-w-[110px] text-right">
        {label} / {labelMax}
      </span>
    </div>
  );
}

/* ================================================================
   PAGE 1 — One GPU Isn't Enough
   3D block + three axes diagram
   ================================================================ */
function OneGpuPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The size problem</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Llama-3 70B has 70 billion parameters. At FP16 (2 bytes each), the weights alone
            consume <strong className="text-[var(--color-text)]">140 GB</strong> — nearly two
            full H100s (80 GB each), before any KV cache. At FP4 (0.5 bytes each), the model
            is 35 GB: it fits, but leaves only 45 GB per GPU for cache.
          </p>
          <p>
            Llama-3 405B at FP4 is still ~100 GB — more than one H100 can hold. When a model
            doesn&rsquo;t fit on one GPU, you must split it.
          </p>
        </div>

        {/* Memory fit visual */}
        <div className="px-4 pb-4">
          <div className="text-[11px] text-[var(--color-text-muted)] mb-1">Single H100 (80 GB)</div>
          <div className="rounded-lg border border-[var(--color-border-light)] overflow-hidden mb-2">
            <div className="flex items-center h-8">
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                style={{ width: `${(140 / 80) * 50}%`, background: 'var(--color-red)' }}
              >
                Llama-3 70B FP16 = 140 GB (OVERFLOW)
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--color-border-light)] overflow-hidden mb-2">
            <div className="flex items-center h-8">
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                style={{ width: `${(100 / 80) * 50}%`, background: 'var(--color-red)' }}
              >
                Llama-3 405B FP4 = 100 GB (OVERFLOW)
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--color-border-light)] overflow-hidden">
            <div className="flex items-center h-8">
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                style={{ width: `${(35 / 80) * 100}%`, background: 'var(--color-teal)' }}
              >
                Llama-3 70B FP4 = 35 GB
              </div>
              <div
                className="h-full flex items-center justify-center text-[10px]"
                style={{ width: `${(45 / 80) * 100}%`, background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)' }}
              >
                45 GB for cache
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Three axes of splitting (3D block)</PanelHeader>
        <div className="p-4">
          <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-4">
            Think of the full model as a 3D block. Three colored planes cut it three different ways.
            Each parallelism type cuts along a different axis — and the KV cache follows the cut
            differently.
          </div>

          {/* 3D perspective box */}
          <div className="relative mx-auto my-4" style={{ width: '280px', height: '240px', perspective: '800px' }}>
            <div
              className="absolute"
              style={{
                width: '180px',
                height: '180px',
                top: '30px',
                left: '30px',
                transformStyle: 'preserve-3d',
                transform: 'rotateX(-20deg) rotateY(-30deg)',
              }}
            >
              {/* Front face — Width axis (TP, red) */}
              <div
                className="absolute inset-0 flex items-center justify-center text-[10px] font-medium"
                style={{
                  background: 'linear-gradient(90deg, rgba(239,68,68,0.45), rgba(239,68,68,0.15))',
                  border: '2px solid var(--color-red)',
                  color: 'var(--color-red-text)',
                  transform: 'translateZ(60px)',
                }}
              >
                Width → TP
              </div>
              {/* Back face */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'rgba(100,116,139,0.15)',
                  border: '1px dashed var(--color-border)',
                  transform: 'translateZ(-60px)',
                }}
              />
              {/* Top face — Depth (PP, blue) */}
              <div
                className="absolute"
                style={{
                  width: '180px',
                  height: '120px',
                  top: 0,
                  left: 0,
                  background: 'linear-gradient(180deg, rgba(59,130,246,0.45), rgba(59,130,246,0.15))',
                  border: '2px solid var(--color-blue)',
                  color: 'var(--color-blue-text)',
                  transform: 'rotateX(90deg) translateZ(60px)',
                  transformOrigin: 'top',
                  fontSize: '10px',
                  fontWeight: 500,
                  textAlign: 'center',
                  paddingTop: '6px',
                }}
              >
                Depth → PP
              </div>
              {/* Right face — Users (DP, teal) */}
              <div
                className="absolute"
                style={{
                  width: '120px',
                  height: '180px',
                  top: 0,
                  right: 0,
                  background: 'linear-gradient(90deg, rgba(20,184,166,0.45), rgba(20,184,166,0.15))',
                  border: '2px solid var(--color-teal)',
                  color: 'var(--color-teal-text)',
                  transform: 'rotateY(90deg) translateZ(60px)',
                  transformOrigin: 'right',
                  fontSize: '10px',
                  fontWeight: 500,
                  textAlign: 'center',
                  paddingTop: '80px',
                }}
              >
                Users → DP
              </div>
            </div>

            {/* Axis labels */}
            <div
              className="absolute text-[10px] font-medium"
              style={{ bottom: '8px', left: '50%', transform: 'translateX(-50%)', color: 'var(--color-red-text)' }}
            >
              ← Width (d_model) →
            </div>
            <div
              className="absolute text-[10px] font-medium"
              style={{ top: '50%', left: '-4px', transform: 'rotate(-90deg) translateY(-50%)', color: 'var(--color-blue-text)', transformOrigin: 'left' }}
            >
              ↑ Depth (80 layers)
            </div>
            <div
              className="absolute text-[10px] font-medium"
              style={{ top: '16px', right: '0', color: 'var(--color-teal-text)' }}
            >
              ↗ Users
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {SPLIT_AXES.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 items-start p-3 rounded-lg border"
                style={{ background: item.bgColor, borderColor: item.color }}
              >
                <div className="flex-shrink-0 w-3 h-12 rounded-sm" style={{ background: item.color }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium" style={{ color: item.textColor }}>
                    {item.name}
                  </div>
                  <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                    <strong className="text-[var(--color-text)]">{item.axis}</strong> — {item.direction}.
                    <br />
                    <em>{item.cut}.</em>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Callout
        type="note"
        message="Each of the next three pages shows one cut. Watch what happens to the data &mdash; the weight matrices, the activations flowing between layers, and most importantly, the KV cache."
      />
    </div>
  );
}

/* ================================================================
   PAGE 2 — Data Parallelism (animated 5-step sequence)
   ================================================================ */
function DataParallelPage() {
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  const maxIdx = DP_STEPS.length - 1;
  const step = DP_STEPS[stepIdx];

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setStepIdx((prev) => {
          if (prev >= maxIdx) {
            setIsPlaying(false);
            return maxIdx;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, maxIdx]);

  function handlePlay() {
    if (stepIdx >= maxIdx) setStepIdx(0);
    setIsPlaying(!isPlaying);
  }

  return (
    <div>
      <Panel>
        <PanelHeader>Data parallelism in action — 5-step animation</PanelHeader>
        <div className="p-4 space-y-4">
          {/* Current step label + description */}
          <div className="p-3 rounded-lg bg-[var(--color-primary-bg)] border border-[var(--color-primary)]">
            <div className="text-[11px] font-medium text-[var(--color-primary-text)] uppercase tracking-wider">
              Step {step.id + 1} of {DP_STEPS.length} — {step.label}
            </div>
            <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-1">
              {step.description}
            </div>
          </div>

          {/* Router + 8 GPUs layout */}
          <div className="space-y-2">
            {step.arrows && (
              <div className="text-center text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
                Router distributing 32 users →
              </div>
            )}

            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {DATA_PARALLEL_GPUS.map((gpu, i) => {
                const userGroupStart = i * 4 + 1;
                const userGroupEnd = i * 4 + 4;
                return (
                  <div
                    key={gpu.gpu}
                    className="rounded-lg border-2 p-2"
                    style={{
                      borderColor: step.usersActive ? 'var(--color-teal)' : 'var(--color-border)',
                      background: 'var(--color-surface)',
                      transition: 'border-color 300ms ease',
                    }}
                  >
                    <div className="text-[9px] font-medium text-[var(--color-text)] text-center">
                      {gpu.gpu}
                    </div>

                    {/* Weights bar (always full) */}
                    <div className="h-12 rounded mt-1 flex flex-col overflow-hidden border border-[var(--color-border-light)]">
                      <div
                        className="flex items-center justify-center text-[8px] font-medium text-white"
                        style={{
                          height: `${(35 / 80) * 100}%`,
                          background: 'var(--color-primary)',
                        }}
                      >
                        35GB
                      </div>
                      {/* Cache grows with step */}
                      <div
                        className="flex items-center justify-center text-[8px] font-medium text-white"
                        style={{
                          height: `${(10 / 80) * 100 * step.cacheFill}%`,
                          background: 'var(--color-teal)',
                          transition: 'height 600ms ease',
                        }}
                      >
                        {step.cacheFill > 0.3 ? 'KV' : ''}
                      </div>
                      <div className="flex-1" style={{ background: 'var(--color-surface-muted)' }} />
                    </div>

                    {/* Users assigned */}
                    <div
                      className="text-[8px] text-center mt-1 font-mono"
                      style={{
                        color: step.usersAssigned ? 'var(--color-teal-text)' : 'var(--color-text-muted)',
                        opacity: step.usersAssigned ? 1 : 0.4,
                        transition: 'opacity 300ms ease',
                      }}
                    >
                      U{userGroupStart}-{userGroupEnd}
                    </div>

                    {/* Active indicator */}
                    {step.usersActive && (
                      <div
                        className="text-[8px] text-center mt-0.5"
                        style={{ color: 'var(--color-teal-text)' }}
                      >
                        ● active
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <AnimControls
            isPlaying={isPlaying}
            onPlayToggle={handlePlay}
            value={stepIdx}
            max={maxIdx}
            onChange={(v) => { setIsPlaying(false); setStepIdx(v); }}
            label={`Step ${stepIdx + 1}`}
            labelMax={DP_STEPS.length}
          />
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Memory layout across 8 GPUs</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">GPU</th>
                <th className="px-4 py-2 text-right">Weights</th>
                <th className="px-4 py-2 text-right">KV Cache</th>
                <th className="px-4 py-2 text-right">Free</th>
                <th className="px-4 py-2 text-left">Comm.</th>
              </tr>
            </thead>
            <tbody>
              {DATA_PARALLEL_GPUS.map((row) => (
                <tr key={row.gpu} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 font-mono font-medium text-[var(--color-text)]">{row.gpu}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.weights}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.cache}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.free}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.communication}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[var(--color-border)] font-medium text-[var(--color-text)]">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right font-mono" style={{ color: 'var(--color-red-text)' }}>280 GB (8 copies)</td>
                <td className="px-4 py-2 text-right font-mono">80 GB</td>
                <td className="px-4 py-2 text-right font-mono">280 GB</td>
                <td className="px-4 py-2">Zero</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="warn"
        message="<strong>Weight duplication:</strong> With 8 GPUs running data parallel, 280 GB of HBM is the same 35 GB of weights repeated 8 times. That is memory that could have been KV cache. And it doesn&rsquo;t help when the model doesn&rsquo;t fit on one GPU &mdash; if the model is 140 GB (FP16), data parallelism alone can&rsquo;t save you."
      />

      <Callout
        type="note"
        message="<strong>KV cache implication:</strong> Each GPU holds the COMPLETE cache for its users. The cache never moves between GPUs. If a user is assigned to GPU 3, all their KV data lives on GPU 3 for the duration of the conversation. This is simple but inflexible &mdash; if GPU 3 runs out of cache space while GPU 5 has plenty, there&rsquo;s no way to rebalance. <em>Stop 16 addresses this imbalance with cache-aware routing.</em>"
      />
    </div>
  );
}

/* ================================================================
   PAGE 3 — Tensor Parallelism (6-step animation)
   ================================================================ */
function TensorParallelPage() {
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  const maxIdx = TP_ANIMATION_STEPS.length - 1;
  const step = TP_ANIMATION_STEPS[stepIdx];

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setStepIdx((prev) => {
          if (prev >= maxIdx) {
            setIsPlaying(false);
            return maxIdx;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, maxIdx]);

  function handlePlay() {
    if (stepIdx >= maxIdx) setStepIdx(0);
    setIsPlaying(!isPlaying);
  }

  const stateColor = {
    wait: { bg: 'var(--color-surface-muted)', border: 'var(--color-border)', label: 'waiting' },
    compute: { bg: 'var(--color-teal-bg)', border: 'var(--color-teal)', label: 'computing' },
    comm: { bg: 'var(--color-amber-bg)', border: 'var(--color-amber)', label: 'all-reduce' },
    done: { bg: 'var(--color-primary-bg)', border: 'var(--color-primary)', label: 'done' },
  };

  return (
    <div>
      <Panel>
        <PanelHeader>Tensor parallelism — one layer, one token, across 4 GPUs</PanelHeader>
        <div className="p-4 space-y-4">
          {/* Step label + description */}
          <div className="p-3 rounded-lg bg-[var(--color-primary-bg)] border border-[var(--color-primary)]">
            <div className="text-[11px] font-medium text-[var(--color-primary-text)] uppercase tracking-wider">
              Step {step.step} of 6 — {step.label}
            </div>
            <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-1">
              {step.description}
            </div>
          </div>

          {/* 4 GPUs visual */}
          <div className="relative">
            {/* All-reduce arrows overlay */}
            {step.arrows === 'all-reduce' && (
              <div
                className="absolute inset-x-0 top-1/2 h-1 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, var(--color-amber) 0%, var(--color-amber) 50%, var(--color-amber) 100%)',
                  transform: 'translateY(-50%)',
                  opacity: 0.6,
                  animation: 'pulse 1s ease-in-out infinite',
                }}
              />
            )}
            {step.arrows === 'broadcast' && (
              <div className="text-center text-[11px] font-medium text-[var(--color-blue-text)] mb-1">
                ↓ Token embedding broadcast to all 4 GPUs ↓
              </div>
            )}

            <div className="grid grid-cols-4 gap-3 relative z-10">
              {[0, 1, 2, 3].map((gpuIdx) => {
                const state = step.gpuState[gpuIdx];
                const style = stateColor[state];
                return (
                  <div
                    key={gpuIdx}
                    className="rounded-lg border-2 p-3"
                    style={{
                      background: style.bg,
                      borderColor: style.border,
                      transition: 'all 400ms ease',
                    }}
                  >
                    <div className="text-[10px] font-mono text-center text-[var(--color-text)]">
                      GPU {gpuIdx}
                    </div>
                    {/* Weight slice visual */}
                    <div className="mt-2 h-16 rounded flex flex-col border border-[var(--color-border-light)] overflow-hidden">
                      <div
                        className="flex-1 flex items-center justify-center text-[8px] text-white font-medium"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        W 1/4
                      </div>
                      <div
                        className="h-5 flex items-center justify-center text-[8px] text-white font-medium"
                        style={{ background: 'var(--color-teal)' }}
                      >
                        KV 1/4
                      </div>
                    </div>
                    {/* Token indicator */}
                    {step.tokenOn[gpuIdx] && (
                      <div
                        className="mt-1 text-[8px] text-center rounded px-1 py-0.5 font-mono"
                        style={{
                          background: 'var(--color-blue-bg)',
                          color: 'var(--color-blue-text)',
                          border: '1px solid var(--color-blue)',
                        }}
                      >
                        token
                      </div>
                    )}
                    {/* State label */}
                    <div
                      className="mt-1 text-[9px] text-center font-medium"
                      style={{ color: style.border }}
                    >
                      {style.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* NVLink ring indicator */}
            <div className="mt-3 text-center text-[10px] text-[var(--color-text-muted)]">
              ←—— NVLink mesh (900 GB/s) ——→
            </div>
          </div>

          {/* GPU work bullets */}
          <div className="rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] p-3">
            <div className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
              What each GPU is doing
            </div>
            {step.gpuWork.map((work, i) => (
              <div key={i} className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                • {work}
              </div>
            ))}
          </div>

          <AnimControls
            isPlaying={isPlaying}
            onPlayToggle={handlePlay}
            value={stepIdx}
            max={maxIdx}
            onChange={(v) => { setIsPlaying(false); setStepIdx(v); }}
            label={`Step ${stepIdx + 1}`}
            labelMax={TP_ANIMATION_STEPS.length}
          />
        </div>
      </Panel>

      {/* Correction 4 — All-reduce count by model */}
      <Panel className="mt-4">
        <PanelHeader>All-reduce count scales with layer depth</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            With tensor parallelism (TP &gt; 1), there are{' '}
            <strong className="text-[var(--color-text)]">2 all-reduce operations per layer per
            forward pass</strong> — one after the attention block, one after the FFN block. The
            total per forward pass depends on the model&rsquo;s layer count.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Configuration</th>
                  <th className="px-3 py-2 text-right">Layers</th>
                  <th className="px-3 py-2 text-right">All-reduces / pass</th>
                  <th className="px-3 py-2 text-left">Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {ALL_REDUCE_BY_MODEL.map((row) => (
                  <tr key={row.model} className="border-b border-[var(--color-border-light)] last:border-b-0">
                    <td className="px-3 py-2 font-medium text-[var(--color-text)]">{row.model}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.layers}</td>
                    <td className="px-3 py-2 text-right font-mono font-medium text-[var(--color-text)]">{row.perPass}</td>
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <strong className="text-[var(--color-text)]">At TP=1, there are ZERO all-reduce
            operations during inference.</strong> Each GPU holds the complete model and runs the
            forward pass independently. This is the default configuration for models that fit in a
            single GPU&rsquo;s HBM (Llama-3 70B at FP4 on H100/B200, or Llama-3 8B at any
            precision). <em>Training always requires all-reduce for gradient synchronization,
            regardless of TP setting.</em>
          </p>
        </div>
        <InfoBox>
          At NVLink speeds (900 GB/s within a node), each all-reduce is fast. Cross-node
          (InfiniBand at ~400 Gbps = 50 GB/s), it&rsquo;s 18&times; slower &mdash; which is why{' '}
          <strong>tensor parallelism should stay within a single node</strong>.
        </InfoBox>
      </Panel>

      {/* Memory layout */}
      <Panel className="mt-4">
        <PanelHeader>Memory layout (TP=4)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">GPU</th>
                <th className="px-4 py-2 text-right">Weights</th>
                <th className="px-4 py-2 text-left">KV Cache</th>
                <th className="px-4 py-2 text-left">KV Groups</th>
                <th className="px-4 py-2 text-left">Comm.</th>
              </tr>
            </thead>
            <tbody>
              {TENSOR_PARALLEL_GPUS.map((row) => (
                <tr key={row.gpu} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 font-mono font-medium text-[var(--color-text)]">{row.gpu}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.weights}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.cacheDesc}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.kvGroups}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.communication}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[var(--color-border)] font-medium text-[var(--color-text)]">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right font-mono">140 GB (no duplication)</td>
                <td className="px-4 py-2">Distributed</td>
                <td className="px-4 py-2">All 8 KV groups</td>
                <td className="px-4 py-2 font-mono">Heavy</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Super-linear scaling */}
      <Panel className="mt-4">
        <PanelHeader>Bonus — super-linear KV cache scaling</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            This is a non-obvious effect that surprises most engineers. Consider what happens to
            memory when you go from TP=1 (one GPU running the full model) to TP=2 (two GPUs
            splitting the model):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
              <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                {SUPER_LINEAR_SCALING.tp1.label}
              </div>
              <div className="font-mono text-[12px] space-y-0.5">
                <div>Weights: <span className="text-[var(--color-text)]">{SUPER_LINEAR_SCALING.tp1.weightsMem}</span></div>
                <div>Free for cache: <span className="text-[var(--color-text)]">{SUPER_LINEAR_SCALING.tp1.freeMem}</span></div>
              </div>
              {/* Mini bar */}
              <div className="mt-2 h-4 rounded overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border-light)] flex">
                <div style={{ width: '87.5%', background: 'var(--color-primary)' }} />
                <div style={{ width: '12.5%', background: 'var(--color-teal)' }} />
              </div>
              <div className="text-[9px] text-[var(--color-text-muted)] mt-0.5">70 GB weights | 10 GB cache</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
              <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider mb-2">
                {SUPER_LINEAR_SCALING.tp2.label}
              </div>
              <div className="font-mono text-[12px] space-y-0.5">
                <div>Weights: <span className="text-[var(--color-text)]">{SUPER_LINEAR_SCALING.tp2.weightsMem}</span></div>
                <div>Free for cache: <span className="text-[var(--color-text)]">{SUPER_LINEAR_SCALING.tp2.freeMem}</span></div>
              </div>
              {/* Mini bar showing 2 GPUs */}
              <div className="mt-2 flex gap-1">
                <div className="flex-1 h-4 rounded overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border-light)] flex">
                  <div style={{ width: '43.75%', background: 'var(--color-primary)' }} />
                  <div style={{ width: '56.25%', background: 'var(--color-teal)' }} />
                </div>
                <div className="flex-1 h-4 rounded overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border-light)] flex">
                  <div style={{ width: '43.75%', background: 'var(--color-primary)' }} />
                  <div style={{ width: '56.25%', background: 'var(--color-teal)' }} />
                </div>
              </div>
              <div className="text-[9px] text-[var(--color-text-muted)] mt-0.5">35 GB weights + 45 GB cache per GPU</div>
            </div>
          </div>
          <p>
            You added 1 GPU (2&times; hardware), but cache capacity went from{' '}
            <strong className="text-[var(--color-text)]">10 GB to 90 GB — a{' '}
            <span style={{ color: 'var(--color-teal-text)' }}>{SUPER_LINEAR_SCALING.increase}{' '}increase</span></strong>.
            The reason: the weights were consuming most of the memory, and splitting them freed a
            disproportionately larger fraction of each GPU for cache.
          </p>
          <p>
            In practice, vLLM measured{' '}
            <strong className="text-[var(--color-text)]">{SUPER_LINEAR_SCALING.vllmBlocks}</strong>{' '}
            at TP=2 vs. TP=1 (even higher than our simplified calculation because distributing the
            model also reduces activation memory and internal buffers). That 13.9&times; more cache
            enabled <strong className="text-[var(--color-text)]">{SUPER_LINEAR_SCALING.vllmThroughput}</strong>{' '}
            &mdash; more cache means larger batches, and larger batches mean better GPU
            utilization. The &ldquo;expected 2&times;&rdquo; is the naive linear assumption; the
            actual 3.9&times; exceeds it because the freed memory compounds through the batching
            effect.
          </p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Strengths and weaknesses</PanelHeader>
        <div className="p-4 space-y-3">
          <div className="p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
            <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider mb-2">
              Strengths
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              The model fits! 140 GB split across 4 GPUs = 35 GB each. Each GPU now has 45 GB free
              for KV cache. Lower latency per token — 4 GPUs computing in parallel finish faster than 1.
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-red-bg)] border border-[var(--color-red)]">
            <div className="text-[11px] font-medium text-[var(--color-red-text)] uppercase tracking-wider mb-2">
              Weakness
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              Massive communication. 160 all-reduce operations per forward pass for Llama-3 70B
              (2 &times; 80 layers). Fine over NVLink within a node, but across nodes it becomes
              the bottleneck.
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>KV cache implication:</strong> The cache is split across the <strong>heads dimension</strong>. Each GPU stores K,V for only its assigned attention heads. For GQA with 8 KV groups and TP=4: each GPU stores 2 KV groups. A token&rsquo;s complete cache (all heads, all layers) is distributed across all 4 GPUs. If you need to move this cache (e.g., for disaggregated inference), you must gather it from all TP GPUs &mdash; a coordination challenge."
      />
    </div>
  );
}

/* ================================================================
   PAGE 4 — Pipeline Parallelism (animated)
   Single-token animation + micro-batching animation
   ================================================================ */
function PipelineParallelPage() {
  // Single-token animation
  const [frameIdx, setFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  // Micro-batch animation
  const [mbIdx, setMbIdx] = useState(0);
  const [mbPlaying, setMbPlaying] = useState(false);
  const mbIntervalRef = useRef(null);

  const maxFrame = PP_SINGLE_TOKEN_FRAMES.length - 1;
  const frame = PP_SINGLE_TOKEN_FRAMES[frameIdx];

  const maxMb = PP_MICROBATCH_TIMELINE.length - 1;
  const mbStep = PP_MICROBATCH_TIMELINE[mbIdx];

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setFrameIdx((prev) => {
          if (prev >= maxFrame) { setIsPlaying(false); return maxFrame; }
          return prev + 1;
        });
      }, 1200);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, maxFrame]);

  useEffect(() => {
    if (mbPlaying) {
      mbIntervalRef.current = setInterval(() => {
        setMbIdx((prev) => {
          if (prev >= maxMb) { setMbPlaying(false); return maxMb; }
          return prev + 1;
        });
      }, 1500);
    }
    return () => { if (mbIntervalRef.current) clearInterval(mbIntervalRef.current); };
  }, [mbPlaying, maxMb]);

  // Colors for micro-batch tokens
  const tokenColors = {
    A: 'var(--color-primary)',
    B: 'var(--color-teal)',
    C: 'var(--color-amber)',
    D: 'var(--color-red)',
    E: 'var(--color-blue)',
  };

  return (
    <div>
      {/* Single-token animation */}
      <Panel>
        <PanelHeader>One token traversing 4 pipeline stages</PanelHeader>
        <div className="p-4 space-y-4">
          <div className="p-3 rounded-lg bg-[var(--color-primary-bg)] border border-[var(--color-primary)]">
            <div className="text-[11px] font-medium text-[var(--color-primary-text)] uppercase tracking-wider">
              Frame {frameIdx + 1} of {PP_SINGLE_TOKEN_FRAMES.length} — {frame.label}
            </div>
            <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-1">
              {frame.description}
            </div>
          </div>

          {/* Vertical pipeline with token moving */}
          <div className="relative mx-auto" style={{ maxWidth: '500px' }}>
            {PP_STAGES.map((stage, i) => {
              const isActiveCompute = frame.action === 'compute' && Math.floor(frame.tokenAt) === i;
              const isHandoffFrom = frame.action === 'handoff' && Math.floor(frame.tokenAt) === i;
              const isComplete = frame.action === 'complete' && i === 3;
              return (
                <div key={stage.id}>
                  {/* Stage card */}
                  <div
                    className="rounded-lg border-2 p-3 flex items-center gap-3"
                    style={{
                      borderColor: (isActiveCompute || isComplete) ? 'var(--color-teal)' : 'var(--color-border)',
                      background: (isActiveCompute || isComplete) ? 'var(--color-teal-bg)' : 'var(--color-surface)',
                      transition: 'all 400ms ease',
                    }}
                  >
                    <div className="text-[11px] font-mono font-medium text-[var(--color-text)] min-w-[60px]">
                      {stage.gpu}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-secondary)] flex-1">
                      {stage.layers}
                      <span className="text-[var(--color-text-muted)] ml-2">({stage.weights})</span>
                    </div>
                    {(isActiveCompute || isComplete) && (
                      <div
                        className="text-[10px] font-mono px-2 py-0.5 rounded"
                        style={{ background: 'var(--color-teal)', color: 'white' }}
                      >
                        ● token here
                      </div>
                    )}
                    {!isActiveCompute && !isComplete && frame.action !== 'handoff' && Math.floor(frame.tokenAt) !== i && (
                      <div className="text-[10px] text-[var(--color-text-muted)] italic">idle</div>
                    )}
                  </div>

                  {/* Handoff arrow (between stages) */}
                  {i < 3 && (
                    <div className="flex justify-center items-center h-8 relative">
                      <div
                        className="w-0.5 h-full"
                        style={{ background: 'var(--color-border)' }}
                      />
                      {isHandoffFrom && (
                        <div
                          className="absolute px-2 py-0.5 rounded text-[10px] font-mono font-medium"
                          style={{
                            background: 'var(--color-amber)',
                            color: 'white',
                            animation: 'pulse 0.8s ease-in-out infinite',
                          }}
                        >
                          16 KB ↓
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <AnimControls
            isPlaying={isPlaying}
            onPlayToggle={() => {
              if (frameIdx >= maxFrame) setFrameIdx(0);
              setIsPlaying(!isPlaying);
            }}
            value={frameIdx}
            max={maxFrame}
            onChange={(v) => { setIsPlaying(false); setFrameIdx(v); }}
            label={`Frame ${frameIdx + 1}`}
            labelMax={PP_SINGLE_TOKEN_FRAMES.length}
          />
        </div>
      </Panel>

      {/* Micro-batching animation */}
      <Panel className="mt-4">
        <PanelHeader>Micro-batching fills the pipeline</PanelHeader>
        <div className="p-4 space-y-4">
          <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            With multiple tokens from different users, all stages stay busy simultaneously. Watch
            the pipeline fill up over time.
          </div>

          {/* Current state label */}
          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
            <div className="text-[11px] font-mono font-medium text-[var(--color-text)]">{mbStep.time}</div>
            <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{mbStep.note}</div>
          </div>

          {/* Stage grid showing current tokens */}
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((stageIdx) => {
              const token = mbStep.stages[stageIdx];
              return (
                <div
                  key={stageIdx}
                  className="rounded-lg border-2 p-3 text-center"
                  style={{
                    borderColor: token ? tokenColors[token] : 'var(--color-border)',
                    background: token ? 'var(--color-surface)' : 'var(--color-surface-muted)',
                    transition: 'all 400ms ease',
                  }}
                >
                  <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
                    Stage {stageIdx + 1}
                  </div>
                  <div className="text-[9px] text-[var(--color-text-muted)]">
                    L{stageIdx * 20 + 1}-{(stageIdx + 1) * 20}
                  </div>
                  <div
                    className="mt-2 mx-auto rounded-full flex items-center justify-center font-bold text-white text-[14px]"
                    style={{
                      width: '32px',
                      height: '32px',
                      background: token ? tokenColors[token] : 'var(--color-border-light)',
                      opacity: token ? 1 : 0.3,
                      transition: 'all 400ms ease',
                    }}
                  >
                    {token || '—'}
                  </div>
                  <div className="text-[9px] text-[var(--color-text-muted)] mt-1">
                    {token ? 'busy' : 'bubble'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full timeline table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  <th className="px-3 py-1 text-left">Time</th>
                  <th className="px-3 py-1 text-center">Stage 1</th>
                  <th className="px-3 py-1 text-center">Stage 2</th>
                  <th className="px-3 py-1 text-center">Stage 3</th>
                  <th className="px-3 py-1 text-center">Stage 4</th>
                </tr>
              </thead>
              <tbody>
                {PP_MICROBATCH_TIMELINE.map((row, i) => (
                  <tr
                    key={row.time}
                    className="border-b border-[var(--color-border-light)] last:border-b-0 cursor-pointer"
                    style={{
                      background: i === mbIdx ? 'var(--color-teal-bg)' : 'transparent',
                      transition: 'background 300ms ease',
                    }}
                    onClick={() => { setMbPlaying(false); setMbIdx(i); }}
                  >
                    <td className="px-3 py-1 font-mono font-medium text-[var(--color-text)]">{row.time}</td>
                    {row.stages.map((cell, j) => (
                      <td key={j} className="px-3 py-1 text-center font-mono">
                        {cell ? (
                          <span style={{ color: tokenColors[cell], fontWeight: 600 }}>{cell}</span>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AnimControls
            isPlaying={mbPlaying}
            onPlayToggle={() => {
              if (mbIdx >= maxMb) setMbIdx(0);
              setMbPlaying(!mbPlaying);
            }}
            value={mbIdx}
            max={maxMb}
            onChange={(v) => { setMbPlaying(false); setMbIdx(v); }}
            label={`${mbStep.time}`}
            labelMax={PP_MICROBATCH_TIMELINE[maxMb].time}
          />
        </div>
        <InfoBox>
          Once the pipeline is full (T4 onward), all 4 GPUs are busy simultaneously &mdash; each
          processing a different token at a different stage. Throughput approaches that of tensor
          parallelism, while per-token latency is higher.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Memory layout (PP=4)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">GPU</th>
                <th className="px-4 py-2 text-left">Layers</th>
                <th className="px-4 py-2 text-right">Weights</th>
                <th className="px-4 py-2 text-left">KV Cache</th>
                <th className="px-4 py-2 text-left">Comm.</th>
              </tr>
            </thead>
            <tbody>
              {PIPELINE_PARALLEL_GPUS.map((row) => (
                <tr key={row.gpu} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 font-mono font-medium text-[var(--color-text)]">{row.gpu}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.layers}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.weights}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.cacheDesc}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.communication}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[var(--color-border)] font-medium text-[var(--color-text)]">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2">All 80 layers</td>
                <td className="px-4 py-2 text-right font-mono">140 GB</td>
                <td className="px-4 py-2">Distributed by layer</td>
                <td className="px-4 py-2">Minimal</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Strengths and weaknesses</PanelHeader>
        <div className="p-4 space-y-3">
          <div className="p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
            <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider mb-2">
              Strengths
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              Minimal communication &mdash; just one point-to-point send of ~16 KB per stage
              boundary per token. Works across nodes (doesn&rsquo;t need NVLink). Good for memory
              &mdash; each GPU stores only 1/4 of the layers.
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-red-bg)] border border-[var(--color-red)]">
            <div className="text-[11px] font-medium text-[var(--color-red-text)] uppercase tracking-wider mb-2">
              Weakness
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              Higher per-token latency &mdash; the token must traverse all stages sequentially.
              Pipeline bubbles at the start (stages 2&ndash;4 idle while stage 1 processes the
              first token) and end (stage 1 idle while stage 4 finishes the last token).
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="note"
        message='<strong>KV cache implication:</strong> The cache is split across the <strong>layer dimension</strong>. GPU 0&rsquo;s cache contains layers 1&ndash;20 for ALL tokens. GPU 3&rsquo;s cache contains layers 61&ndash;80 for ALL tokens. A token&rsquo;s complete cache is distributed across all pipeline stages. To move a full user&rsquo;s cache (e.g., for disaggregated inference), you must gather from all stages &mdash; but the data at each stage is contiguous by layer, which maps naturally to the tier structure we&rsquo;ll see in Stop 13.'
      />
    </div>
  );
}

/* ================================================================
   PAGE 5 — Choosing and combining (static)
   ================================================================ */
function ChoosingPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Side-by-side comparison (7 dimensions)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Dimension</th>
                <th className="px-3 py-2 text-left">Data Parallel</th>
                <th className="px-3 py-2 text-left">Tensor Parallel</th>
                <th className="px-3 py-2 text-left">Pipeline Parallel</th>
              </tr>
            </thead>
            <tbody>
              {PARALLELISM_COMPARISON.map((row) => (
                <tr key={row.dimension} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">{row.dimension}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.data}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.tensor}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.pipeline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Three configurations for our scenario</PanelHeader>
        <div className="p-4 space-y-3">
          {SCENARIO_CONFIGS.map((config) => (
            <div
              key={config.label}
              className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]"
            >
              <div className="text-[13px] font-medium text-[var(--color-text)] mb-1">
                {config.label}
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                {config.description}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <div>
                  <span className="text-[var(--color-text-muted)]">Total cache: </span>
                  <span className="font-mono text-[var(--color-text)]">{config.totalCache}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Max users @8K: </span>
                  <span className="font-mono text-[var(--color-text)]">{config.maxUsersAt8K}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[var(--color-text-muted)]">Communication: </span>
                  <span className="font-mono text-[var(--color-text)]">{config.communication}</span>
                </div>
              </div>
              <div className="mt-1 text-[11px] text-[var(--color-text-muted)] italic">
                {config.tradeoff}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="note"
        message="The right choice depends on your priorities: latency (TP), throughput (DP), model size (PP), or some combination. But all of these strategies still run prefill and decode on the same GPUs. The next question is: what if we separated them?"
      />
    </div>
  );
}

/* ================================================================
   PAGE 6 — Disaggregated inference (two-panel animation)
   ================================================================ */
function DisaggregatedPage() {
  const [tick, setTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  const maxTick = Math.max(AGGREGATED_TIMELINE.length, DISAGGREGATED_TIMELINE.length) - 1;

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setTick((prev) => {
          if (prev >= maxTick) { setIsPlaying(false); return maxTick; }
          return prev + 1;
        });
      }, 1400);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, maxTick]);

  const aggCurrent = AGGREGATED_TIMELINE[Math.min(tick, AGGREGATED_TIMELINE.length - 1)];
  const disCurrent = DISAGGREGATED_TIMELINE[Math.min(tick, DISAGGREGATED_TIMELINE.length - 1)];

  return (
    <div>
      <Panel>
        <PanelHeader>Aggregated vs. disaggregated — side by side</PanelHeader>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT PANEL — Aggregated */}
            <div className="p-3 rounded-lg border-2 border-[var(--color-red)] bg-[var(--color-red-bg)]">
              <div className="text-[11px] font-medium text-[var(--color-red-text)] uppercase tracking-wider mb-2">
                Aggregated (shared GPU)
              </div>

              {/* Shared GPU box */}
              <div
                className="rounded-lg border-2 p-3 mb-2"
                style={{
                  borderColor: aggCurrent.phase === 'prefill' ? 'var(--color-red)' : 'var(--color-teal)',
                  background: 'var(--color-surface)',
                  transition: 'border-color 400ms ease',
                }}
              >
                <div className="text-[10px] font-mono text-[var(--color-text-muted)]">Shared GPU</div>
                <div
                  className="mt-1 text-center font-medium text-[11px] py-2 rounded"
                  style={{
                    background: aggCurrent.phase === 'prefill' ? 'var(--color-red)' : 'var(--color-teal)',
                    color: 'white',
                    transition: 'background 400ms ease',
                  }}
                >
                  {aggCurrent.phase === 'prefill' ? '▓▓▓ PREFILL BURST ▓▓▓' : '● decode steady'}
                </div>
              </div>

              {/* Users affected */}
              <div className="space-y-1">
                {['User 1', 'User 2', 'User 3', 'User 4'].map((u) => (
                  <div key={u} className="flex items-center gap-2 text-[10px]">
                    <div className="font-mono text-[var(--color-text-muted)] min-w-[45px]">{u}</div>
                    <div className="flex-1 h-3 rounded overflow-hidden bg-[var(--color-surface-muted)]">
                      <div
                        className="h-full"
                        style={{
                          width: aggCurrent.stalled ? '10%' : '100%',
                          background: aggCurrent.stalled ? 'var(--color-red)' : 'var(--color-teal)',
                          transition: 'width 500ms ease, background 500ms ease',
                        }}
                      />
                    </div>
                    <div
                      className="text-[9px] font-mono min-w-[45px]"
                      style={{ color: aggCurrent.stalled ? 'var(--color-red-text)' : 'var(--color-teal-text)' }}
                    >
                      {aggCurrent.stalled ? 'STALL' : 'flowing'}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="mt-3 p-2 rounded text-[11px]"
                style={{ background: 'var(--color-surface)' }}
              >
                <div className="font-medium text-[var(--color-text)]">{aggCurrent.label}</div>
                <div className="text-[var(--color-text-secondary)] mt-0.5">{aggCurrent.description}</div>
              </div>
            </div>

            {/* RIGHT PANEL — Disaggregated */}
            <div className="p-3 rounded-lg border-2 border-[var(--color-teal)] bg-[var(--color-teal-bg)]">
              <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider mb-2">
                Disaggregated (separate pools)
              </div>

              {/* Prefill Pool */}
              <div className="grid grid-cols-2 gap-2">
                {/* Prefill */}
                <div
                  className="rounded-lg border-2 p-2"
                  style={{
                    borderColor: disCurrent.prefillActive ? 'var(--color-primary)' : 'var(--color-border)',
                    background: 'var(--color-surface)',
                    transition: 'border-color 400ms ease',
                  }}
                >
                  <div className="text-[9px] font-mono text-[var(--color-text-muted)]">Prefill Pool (2 GPU)</div>
                  <div
                    className="mt-1 text-center text-[10px] py-1 rounded"
                    style={{
                      background: disCurrent.prefillActive ? 'var(--color-primary)' : 'var(--color-surface-muted)',
                      color: disCurrent.prefillActive ? 'white' : 'var(--color-text-muted)',
                      transition: 'all 400ms ease',
                    }}
                  >
                    {disCurrent.prefillActive ? '▓ prefilling' : '○ idle'}
                  </div>
                </div>

                {/* Decode */}
                <div
                  className="rounded-lg border-2 p-2"
                  style={{
                    borderColor: 'var(--color-teal)',
                    background: 'var(--color-surface)',
                  }}
                >
                  <div className="text-[9px] font-mono text-[var(--color-text-muted)]">Decode Pool (6 GPU)</div>
                  <div
                    className="mt-1 text-center text-[10px] py-1 rounded"
                    style={{
                      background: 'var(--color-teal)',
                      color: 'white',
                    }}
                  >
                    ● decode steady
                  </div>
                </div>
              </div>

              {/* NIXL transfer pipe */}
              <div className="my-2 relative h-6 rounded overflow-hidden border border-[var(--color-border-light)] bg-[var(--color-surface)]">
                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-[var(--color-text-muted)]">
                  NIXL / RDMA pipe — 8.96 GB KV cache
                </div>
                {disCurrent.transferActive && (
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, transparent, var(--color-blue) 50%, transparent)',
                      animation: 'slide 1.5s linear infinite',
                      opacity: 0.5,
                    }}
                  />
                )}
              </div>

              {/* Users affected */}
              <div className="space-y-1">
                {['User 1', 'User 2', 'User 3', 'User 4'].map((u) => (
                  <div key={u} className="flex items-center gap-2 text-[10px]">
                    <div className="font-mono text-[var(--color-text-muted)] min-w-[45px]">{u}</div>
                    <div className="flex-1 h-3 rounded overflow-hidden bg-[var(--color-surface-muted)]">
                      <div
                        className="h-full"
                        style={{
                          width: '100%',
                          background: 'var(--color-teal)',
                          transition: 'width 500ms ease',
                        }}
                      />
                    </div>
                    <div
                      className="text-[9px] font-mono min-w-[45px]"
                      style={{ color: 'var(--color-teal-text)' }}
                    >
                      flowing
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="mt-3 p-2 rounded text-[11px]"
                style={{ background: 'var(--color-surface)' }}
              >
                <div className="font-medium text-[var(--color-text)]">{disCurrent.label}</div>
                <div className="text-[var(--color-text-secondary)] mt-0.5">{disCurrent.description}</div>
              </div>
            </div>
          </div>

          <AnimControls
            isPlaying={isPlaying}
            onPlayToggle={() => {
              if (tick >= maxTick) setTick(0);
              setIsPlaying(!isPlaying);
            }}
            value={tick}
            max={maxTick}
            onChange={(v) => { setIsPlaying(false); setTick(v); }}
            label={`Tick ${tick + 1}`}
            labelMax={maxTick + 1}
          />
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>What transfers between pools</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The KV cache is the <strong className="text-[var(--color-text)]">ONLY artifact that
            must transfer</strong> between prefill and decode. The model weights don&rsquo;t move
            (both pools have their own copies or shards). The token embeddings don&rsquo;t move
            (they&rsquo;re recreated from the token IDs). Only the K and V vectors must travel from
            the prefill GPU to the decode GPU.
          </p>
          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] font-mono text-[12px] text-[var(--color-text)] text-center leading-loose">
            28,000 tokens &times; 320 KB/token = <strong>8.96 GB</strong>
          </div>
          <p>
            This is a substantial network transfer. The time it takes directly impacts{' '}
            <strong className="text-[var(--color-text)]">Time-to-First-Token (TTFT)</strong> &mdash;
            the delay between the user submitting their prompt and seeing the first word of the
            response.
          </p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Transfer time for 8.96 GB across network types</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Network</th>
                <th className="px-4 py-2 text-right">Bandwidth</th>
                <th className="px-4 py-2 text-right">Transfer time</th>
                <th className="px-4 py-2 text-left">Relative speed</th>
              </tr>
            </thead>
            <tbody>
              {TRANSFER_TIMES.map((row) => {
                const maxT = 358;
                const widthPct = Math.min((row.timeNum / maxT) * 100, 100);
                return (
                  <tr
                    key={row.network}
                    className="border-b border-[var(--color-border-light)] last:border-b-0"
                    style={{ background: row.highlight ? 'var(--color-teal-bg)' : 'transparent' }}
                  >
                    <td className="px-4 py-2 text-[var(--color-text)]">{row.network}</td>
                    <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.bandwidth}</td>
                    <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-text)]">{row.time}</td>
                    <td className="px-4 py-2">
                      <div className="h-3 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${widthPct}%`,
                            background: row.timeNum < 100 ? 'var(--color-teal)' : row.timeNum < 200 ? 'var(--color-amber)' : 'var(--color-red)',
                            transition: 'width 300ms ease',
                          }}
                        />
                      </div>
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
        message="The network between prefill and decode pools is on the <strong>critical path</strong> of every inference request. This is the moment the KV cache becomes a networking story &mdash; the transfer latency directly determines how fast the user sees their first token."
      />
    </div>
  );
}

/* ================================================================
   PAGE 7 — Dynamo orchestration (architecture diagram)
   ================================================================ */
function DynamoPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>NVIDIA Dynamo architecture — 8× H100 cluster</PanelHeader>
        <div className="p-4">
          {/* Architecture diagram */}
          <div className="space-y-3">
            {/* Router row */}
            <div
              className="p-3 rounded-lg border-2 text-center"
              style={{
                borderColor: 'var(--color-amber)',
                background: 'var(--color-amber-bg)',
              }}
            >
              <div className="text-[10px] font-mono text-[var(--color-amber-text)]">Smart Router (control plane)</div>
              <div className="text-[11px] text-[var(--color-text)] mt-0.5">
                KV-cache-aware routing: new conversations → prefill, ongoing → the decode GPU that has the user&rsquo;s cache
              </div>
            </div>

            {/* Arrow down */}
            <div className="text-center text-[var(--color-text-muted)]">↓</div>

            {/* Prefill / Decode row */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="p-3 rounded-lg border-2"
                style={{ borderColor: 'var(--color-primary)', background: 'var(--color-primary-bg)' }}
              >
                <div className="text-[11px] font-medium text-[var(--color-primary-text)] uppercase tracking-wider">
                  Prefill Pool
                </div>
                <div className="text-[11px] font-mono text-[var(--color-text)] mt-1">2 GPUs — TP=2</div>
                {/* GPU icons */}
                <div className="flex gap-1 mt-2">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="flex-1 h-8 rounded border text-[9px] flex items-center justify-center font-mono text-white"
                      style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                    >
                      GPU {i}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-[var(--color-text-secondary)] mt-2">
                  Handles all incoming prompts. Computes KV cache for entire prompt in parallel.
                </div>
              </div>

              <div
                className="p-3 rounded-lg border-2"
                style={{ borderColor: 'var(--color-teal)', background: 'var(--color-teal-bg)' }}
              >
                <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider">
                  Decode Pool
                </div>
                <div className="text-[11px] font-mono text-[var(--color-text)] mt-1">6 GPUs — TP=1, DP=6</div>
                {/* GPU icons */}
                <div className="flex gap-1 mt-2">
                  {[2, 3, 4, 5, 6, 7].map((i) => (
                    <div
                      key={i}
                      className="flex-1 h-8 rounded border text-[9px] flex items-center justify-center font-mono text-white"
                      style={{ background: 'var(--color-teal)', borderColor: 'var(--color-teal)' }}
                    >
                      G{i}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-[var(--color-text-secondary)] mt-2">
                  Ongoing token generation. PagedAttention. Receives cache via NIXL.
                </div>
              </div>
            </div>

            {/* NIXL pipe */}
            <div
              className="p-2 rounded-lg border-2 text-center"
              style={{ borderColor: 'var(--color-blue)', background: 'var(--color-blue-bg)' }}
            >
              <div className="text-[10px] font-mono text-[var(--color-blue-text)]">NIXL (transfer layer) — RDMA / NVLink / InfiniBand / PCIe</div>
              <div className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
                Moves KV cache between pools. Asynchronous, non-blocking, can overlap transfer with computation.
              </div>
            </div>

            {/* Arrow down */}
            <div className="text-center text-[var(--color-text-muted)]">↑ monitors ↑</div>

            {/* Planner */}
            <div
              className="p-3 rounded-lg border-2 text-center"
              style={{ borderColor: 'var(--color-red)', background: 'var(--color-red-bg)' }}
            >
              <div className="text-[10px] font-mono text-[var(--color-red-text)]">Dynamo Planner (orchestrator)</div>
              <div className="text-[11px] text-[var(--color-text)] mt-0.5">
                Monitors GPU utilization + queue depths. Dynamically adjusts prefill/decode ratio.
                Reassigns GPUs between pools based on demand.
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Component roles in detail</PanelHeader>
        <div className="p-4 space-y-3">
          {DYNAMO_COMPONENTS.map((comp) => (
            <div
              key={comp.name}
              className="p-3 rounded-lg border"
              style={{ borderColor: comp.color, background: comp.bgColor }}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[13px] font-medium" style={{ color: comp.textColor }}>
                  {comp.name}
                </span>
                {comp.gpus !== '—' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'var(--color-surface)', color: comp.textColor, border: `1px solid ${comp.color}` }}>
                    {comp.gpus} — {comp.config}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                    {comp.config}
                  </span>
                )}
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                {comp.role}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Steady state for our scenario</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-center">
              <div className="text-[20px] font-bold text-[var(--color-text)]">{DYNAMO_STEADY_STATE.users}</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">concurrent users</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-center">
              <div className="text-[20px] font-bold text-[var(--color-text)]">{DYNAMO_STEADY_STATE.newConvsPerMin}/min</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">new conversations</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-center">
              <div className="text-[20px] font-bold text-[var(--color-primary-text)]">~{DYNAMO_STEADY_STATE.prefillTimeMs} ms</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">prefill (8K prompt, TP=2)</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-center">
              <div className="text-[20px] font-bold text-[var(--color-teal-text)]">~{DYNAMO_STEADY_STATE.usersPerDecodeGpu}</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">users / decode GPU</div>
            </div>
          </div>
          <p>
            With 32 concurrent users and 2 new conversations per minute, 2 prefill GPUs handle the
            load easily. The 6 decode GPUs each serve ~5 users with continuous batching &mdash;
            well within their memory and throughput capacity. The Planner can shift GPUs between
            pools as demand changes.
          </p>
        </div>
      </Panel>

      <Callout
        type="good"
        message="Dynamo doesn&rsquo;t replace the inference engine (vLLM, TensorRT-LLM, SGLang). It orchestrates <strong>above</strong> them &mdash; managing GPU pools, routing requests, transferring caches, and dynamically balancing the prefill/decode ratio."
      />
    </div>
  );
}

/* ================================================================
   PAGE 8 — KV cache lifecycle (6-frame animation)
   ================================================================ */
function LifecyclePage() {
  const [frameIdx, setFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  const maxIdx = LIFECYCLE_FRAMES.length - 1;
  const frame = LIFECYCLE_FRAMES[frameIdx];

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setFrameIdx((prev) => {
          if (prev >= maxIdx) { setIsPlaying(false); return maxIdx; }
          return prev + 1;
        });
      }, 2200);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, maxIdx]);

  return (
    <div>
      <Panel>
        <PanelHeader>User 17&rsquo;s request — 6-frame end-to-end trace</PanelHeader>
        <div className="p-4 space-y-4">
          {/* Current frame banner */}
          <div
            className="p-3 rounded-lg border-2"
            style={{
              borderColor: frame.color,
              background: 'var(--color-surface-muted)',
            }}
          >
            <div className="flex items-baseline gap-2">
              <span
                className="text-[11px] font-mono font-medium uppercase tracking-wider"
                style={{ color: frame.color }}
              >
                Frame {frame.frame}
              </span>
              <span className="text-[14px] font-bold" style={{ color: frame.color }}>
                {frame.phase}
              </span>
              <span className="text-[12px] text-[var(--color-text-muted)]">— {frame.label}</span>
            </div>
            <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-1">
              {frame.description}
            </div>
            {frame.where !== '—' && (
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-[var(--color-text-muted)]">Where: </span>
                  <span className="font-mono text-[var(--color-text)]">{frame.where}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Size: </span>
                  <span className="font-mono text-[var(--color-text)]">{frame.size}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Duration: </span>
                  <span className="font-mono text-[var(--color-text)]">{frame.duration}</span>
                </div>
              </div>
            )}
          </div>

          {/* Flow diagram: Prefill → Transfer → Decode */}
          <div className="grid grid-cols-5 gap-2 items-center">
            {/* Prefill */}
            <div
              className="p-2 rounded-lg border-2 text-center"
              style={{
                borderColor: frame.activePool === 'prefill' ? 'var(--color-primary)' : 'var(--color-border)',
                background: frame.activePool === 'prefill' ? 'var(--color-primary-bg)' : 'var(--color-surface-muted)',
                transition: 'all 400ms ease',
              }}
            >
              <div className="text-[9px] font-mono text-[var(--color-text-muted)]">Prefill Pool</div>
              <div className="text-[10px] font-medium mt-1" style={{ color: frame.activePool === 'prefill' ? 'var(--color-primary-text)' : 'var(--color-text-muted)' }}>
                2 GPUs TP=2
              </div>
              {frame.activePool === 'prefill' && (
                <div className="text-[9px] mt-1" style={{ color: 'var(--color-primary-text)' }}>
                  ● busy
                </div>
              )}
            </div>

            {/* Arrow 1 */}
            <div
              className="h-6 relative flex items-center"
              style={{
                opacity: frame.activePool === 'transfer' ? 1 : 0.3,
                transition: 'opacity 400ms ease',
              }}
            >
              <div className="w-full h-0.5 bg-[var(--color-blue)] relative">
                {frame.activePool === 'transfer' && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent, var(--color-blue), transparent)',
                      animation: 'slide 1s linear infinite',
                    }}
                  />
                )}
              </div>
              <div className="absolute right-0 text-[10px]" style={{ color: 'var(--color-blue)' }}>▶</div>
            </div>

            {/* NIXL / transfer box */}
            <div
              className="p-2 rounded-lg border-2 text-center"
              style={{
                borderColor: frame.activePool === 'transfer' ? 'var(--color-blue)' : 'var(--color-border)',
                background: frame.activePool === 'transfer' ? 'var(--color-blue-bg)' : 'var(--color-surface-muted)',
                transition: 'all 400ms ease',
              }}
            >
              <div className="text-[9px] font-mono text-[var(--color-text-muted)]">NIXL / RDMA</div>
              <div className="text-[10px] font-medium mt-1" style={{ color: frame.activePool === 'transfer' ? 'var(--color-blue-text)' : 'var(--color-text-muted)' }}>
                8.96 GB
              </div>
              {frame.activePool === 'transfer' && (
                <div className="text-[9px] mt-1" style={{ color: 'var(--color-blue-text)' }}>
                  ● in flight
                </div>
              )}
            </div>

            {/* Arrow 2 */}
            <div
              className="h-6 relative flex items-center"
              style={{
                opacity: frame.activePool === 'transfer' ? 1 : 0.3,
                transition: 'opacity 400ms ease',
              }}
            >
              <div className="w-full h-0.5 bg-[var(--color-blue)]" />
              <div className="absolute right-0 text-[10px]" style={{ color: 'var(--color-blue)' }}>▶</div>
            </div>

            {/* Decode */}
            <div
              className="p-2 rounded-lg border-2 text-center"
              style={{
                borderColor: frame.activePool === 'decode' ? 'var(--color-teal)' : 'var(--color-border)',
                background: frame.activePool === 'decode' ? 'var(--color-teal-bg)' : 'var(--color-surface-muted)',
                transition: 'all 400ms ease',
              }}
            >
              <div className="text-[9px] font-mono text-[var(--color-text-muted)]">Decode Pool</div>
              <div className="text-[10px] font-medium mt-1" style={{ color: frame.activePool === 'decode' ? 'var(--color-teal-text)' : 'var(--color-text-muted)' }}>
                6 GPUs
              </div>
              {frame.activePool === 'decode' && (
                <div className="text-[9px] mt-1" style={{ color: 'var(--color-teal-text)' }}>
                  ● serving
                </div>
              )}
            </div>
          </div>

          {/* Frame pills */}
          <div className="flex gap-1 flex-wrap">
            {LIFECYCLE_FRAMES.map((f, i) => (
              <button
                key={f.frame}
                onClick={() => { setIsPlaying(false); setFrameIdx(i); }}
                className="px-2 py-1 rounded text-[10px] font-mono cursor-pointer transition-all"
                style={{
                  background: i === frameIdx ? f.color : 'var(--color-surface-muted)',
                  color: i === frameIdx ? 'white' : 'var(--color-text-muted)',
                  border: `1px solid ${i === frameIdx ? f.color : 'var(--color-border-light)'}`,
                }}
              >
                {f.frame}. {f.phase}
              </button>
            ))}
          </div>

          <AnimControls
            isPlaying={isPlaying}
            onPlayToggle={() => {
              if (frameIdx >= maxIdx) setFrameIdx(0);
              setIsPlaying(!isPlaying);
            }}
            value={frameIdx}
            max={maxIdx}
            onChange={(v) => { setIsPlaying(false); setFrameIdx(v); }}
            label={`Frame ${frameIdx + 1}`}
            labelMax={LIFECYCLE_FRAMES.length}
          />
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Cache lifecycle summary</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Phase</th>
                <th className="px-4 py-2 text-left">Where cache lives</th>
                <th className="px-4 py-2 text-right">Size</th>
                <th className="px-4 py-2 text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {CACHE_LIFECYCLE.map((row) => (
                <tr key={row.phase} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.phase}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.where}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.size}</td>
                  <td className="px-4 py-2 text-right text-[var(--color-text-secondary)]">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Born, moved, grows, persists, dies — the roadmap for Act 2</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The cache is <strong className="text-[var(--color-text)]">born</strong> in prefill,{' '}
            <strong className="text-[var(--color-text)]">moved</strong> to decode,{' '}
            <strong className="text-[var(--color-text)]">grows</strong> during generation,{' '}
            <strong className="text-[var(--color-text)]">persists</strong> across turns, and{' '}
            <strong className="text-[var(--color-text)]">dies</strong> when the conversation ends.
            Every stop in Act 2 touches a different phase of this lifecycle:
          </p>
          <div className="space-y-2">
            {LIFECYCLE_STOP_MAP.map((item) => (
              <div
                key={item.stop}
                className="flex gap-3 items-start p-2.5 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-[11px] font-bold flex items-center justify-center">
                  {item.stop}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[var(--color-text)]">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">{item.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ================================================================
   PAGE 9 — Summary + Bridge to Stop 13
   ================================================================ */
function SummaryPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Four ways to split inference work</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Split type</th>
                <th className="px-4 py-2 text-left">What&rsquo;s split</th>
                <th className="px-4 py-2 text-left">KV cache effect</th>
                <th className="px-4 py-2 text-left">Network requirement</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_TABLE.map((row) => (
                <tr key={row.splitType} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.splitType}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.whatsSplit}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.cacheEffect}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.networkReq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Evolving diagram — Stop 12 version</PanelHeader>
        <div className="p-4">
          <div className="text-[12px] text-[var(--color-text-muted)] mb-3">
            The 8 GPUs are now split into prefill and decode pools, connected by a NIXL/RDMA pipe.
            The Smart Router sits between users and the prefill pool.
          </div>

          {/* Users */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-6 rounded text-[9px] font-mono flex items-center justify-center"
                style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-light)' }}
              >
                U{i * 4 + 1}-{i * 4 + 4}
              </div>
            ))}
          </div>

          <div className="text-center text-[var(--color-text-muted)] my-1">↓</div>

          {/* Smart router */}
          <div
            className="p-2 rounded-lg border-2 text-center"
            style={{ borderColor: 'var(--color-amber)', background: 'var(--color-amber-bg)' }}
          >
            <div className="text-[10px] font-mono text-[var(--color-amber-text)]">Smart Router</div>
          </div>

          <div className="text-center text-[var(--color-text-muted)] my-1">↓</div>

          {/* Pool row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Prefill */}
            <div
              className="p-2 rounded-lg border-2"
              style={{ borderColor: 'var(--color-primary)', background: 'var(--color-primary-bg)' }}
            >
              <div className="text-[10px] font-mono text-[var(--color-primary-text)] text-center mb-1">Prefill Pool (2 GPU, TP=2)</div>
              <div className="grid grid-cols-2 gap-1">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-8 rounded text-[9px] flex items-center justify-center text-white font-mono"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    GPU {i}
                  </div>
                ))}
              </div>
            </div>

            {/* Decode */}
            <div
              className="p-2 rounded-lg border-2"
              style={{ borderColor: 'var(--color-teal)', background: 'var(--color-teal-bg)' }}
            >
              <div className="text-[10px] font-mono text-[var(--color-teal-text)] text-center mb-1">Decode Pool (6 GPU, DP=6)</div>
              <div className="grid grid-cols-6 gap-1">
                {[2, 3, 4, 5, 6, 7].map((i) => (
                  <div
                    key={i}
                    className="h-8 rounded text-[9px] flex items-center justify-center text-white font-mono"
                    style={{ background: 'var(--color-teal)' }}
                  >
                    G{i}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* NIXL pipe between */}
          <div className="my-2 relative h-6 rounded overflow-hidden border border-[var(--color-blue)] bg-[var(--color-blue-bg)]">
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-[var(--color-blue-text)]">
              NIXL / RDMA pipe — KV cache transfers in flight
            </div>
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, transparent, var(--color-blue) 50%, transparent)',
                animation: 'slide 2s linear infinite',
                opacity: 0.3,
              }}
            />
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Bridge to Stop 13 — 2.5 GB swap math</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The KV cache transfer between prefill and decode takes ~180 ms in our scenario. But
            what happens when the Decode GPU&rsquo;s HBM fills up? With 5 users at 8K tokens each
            (12.5 GB), plus User 17&rsquo;s 10.56 GB document cache, we&rsquo;re using ~23 GB of
            the 45 GB available. Comfortable now &mdash; but add 10 more users, or let
            conversations grow to 32K tokens, and we&rsquo;ll hit the memory wall again.
          </p>
          <p>
            Stop 11 showed one answer: preempt or queue. But there&rsquo;s another option: move
            less-recently-used cache pages to cheaper, larger memory. An H100 server has{' '}
            <strong className="text-[var(--color-text)]">~2 TB of CPU DRAM</strong> alongside its
            80 GB of HBM.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-center">
              <div className="text-[18px] font-bold text-[var(--color-teal-text)]">{BRIDGE_CALC.hbmAccessMs} ms</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">HBM access</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-amber-bg)] border border-[var(--color-amber)] text-center">
              <div className="text-[18px] font-bold text-[var(--color-amber-text)]">{BRIDGE_CALC.swapTimeMs} ms</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">swap {BRIDGE_CALC.cacheGB} GB → DRAM @ {BRIDGE_CALC.pcieBandwidth}</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-red-bg)] border border-[var(--color-red)] text-center">
              <div className="text-[18px] font-bold text-[var(--color-red-text)]">~{BRIDGE_CALC.recomputeMs} ms</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">full recompute from prefill</div>
            </div>
          </div>

          <p>
            <strong className="text-[var(--color-text)]">Swapping is ~8&times; faster than
            recomputing.</strong> This multi-tier approach &mdash; HBM for hot caches, DRAM for
            warm, SSD for cold, networked storage for frozen &mdash; is the subject of{' '}
            <strong className="text-[var(--color-text)]">Stop 13</strong>.
          </p>
        </div>
      </Panel>

      <Callout
        type="good"
        message="The KV cache is no longer a GPU-local optimization. It is data in flight &mdash; born in prefill, transferred between pools, grown during decode, swapped between memory tiers, and routed across clusters. The engineering challenges of LLM inference are fundamentally shaped by the size, structure, and lifecycle of the KV cache."
      />
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function SplittingWork() {
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
      {/* Narration — passed through dangerouslySetInnerHTML directly, no escaping */}
      <div
        className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed
                    px-4 py-3 bg-[var(--color-surface-muted)] rounded-lg
                    border border-[var(--color-border-light)] mb-5"
        dangerouslySetInnerHTML={{ __html: narration }}
      />

      {/* Page content */}
      <div className="min-h-[200px]">
        {page.id === 'one-gpu'           && <OneGpuPage />}
        {page.id === 'data-parallel'     && <DataParallelPage />}
        {page.id === 'tensor-parallel'   && <TensorParallelPage />}
        {page.id === 'pipeline-parallel' && <PipelineParallelPage />}
        {page.id === 'choosing'          && <ChoosingPage />}
        {page.id === 'disaggregated'     && <DisaggregatedPage />}
        {page.id === 'dynamo'            && <DynamoPage />}
        {page.id === 'lifecycle'         && <LifecyclePage />}
        {page.id === 'summary'           && <SummaryPage />}
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
