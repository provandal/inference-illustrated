import { useState, useCallback, useEffect, useRef } from 'react';
import {
  PAGES,
  NARRATIONS,
  ROUTING_COMPARISON,
  GPU_FLEET,
  ROUTING_STEPS,
  SCORING_TABLE,
  PREFIX_SOURCES,
  PREFIX_MATCHES,
  PREFIX_ROUTING_SAVINGS,
  PREFIX_BENCHMARKS,
  LLMD_COMPONENTS,
  LLMD_STRATEGIES,
  LLMD_BENCHMARKS,
  LLMD_VS_DYNAMO,
  ROUTING_SCENARIOS,
  FEEDBACK_LOOP_STEPS,
  SUMMARY_TABLE,
} from '../data/stop16Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

/* =====================================================================
   PAGE 1 — "Round-robin is 10x too expensive"
   Side-by-side GPU visual + comparison table + 40x framing
   ===================================================================== */

function RoundRobinCostPage() {
  return (
    <div>
      {/* Hero: side-by-side GPU comparison */}
      <Panel>
        <PanelHeader>User 17’s follow-up — where does it go?</PanelHeader>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WRONG: GPU 5 */}
            <div
              className="rounded-lg border-2 p-4 space-y-3"
              style={{ borderColor: 'var(--color-red)', background: 'var(--color-red-bg)' }}
            >
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-bold" style={{ color: 'var(--color-red-text)' }}>
                  GPU 5 — round-robin choice
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--color-red)', color: 'var(--color-red-text)' }}>
                  WRONG
                </span>
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)]">No idea who User 17 is — empty cache for them</div>

              {/* Empty cache bar */}
              <div>
                <div className="text-[10px] text-[var(--color-text-muted)] mb-1">User 17’s cache on GPU 5</div>
                <div className="h-7 rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] flex items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                  empty — must recompute 8K × 80 layers
                </div>
              </div>

              {/* TTFT big number */}
              <div className="border-t border-[var(--color-border-light)] pt-3">
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">TTFT</div>
                <div className="text-[24px] font-mono font-bold" style={{ color: 'var(--color-red-text)' }}>~500 ms</div>
                <div className="text-[10px] text-[var(--color-text-muted)]">full prefill — blocks GPU 5 for 500 ms</div>
              </div>
            </div>

            {/* RIGHT: GPU 3 */}
            <div
              className="rounded-lg border-2 p-4 space-y-3"
              style={{ borderColor: 'var(--color-teal)', background: 'var(--color-teal-bg)' }}
            >
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-bold" style={{ color: 'var(--color-teal-text)' }}>
                  GPU 3 — cache-aware choice
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--color-teal)', color: 'var(--color-teal-text)' }}>
                  RIGHT
                </span>
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)]">User 17’s 8K cache warm in HBM, ready to go</div>

              {/* Full cache bar */}
              <div>
                <div className="text-[10px] text-[var(--color-text-muted)] mb-1">User 17’s cache on GPU 3</div>
                <div className="h-7 rounded border border-[var(--color-border-light)] overflow-hidden flex">
                  <div
                    className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                    style={{ width: '97%', background: 'var(--color-teal)' }}
                  >
                    8K tokens cached (1.28 GB @ FP8)
                  </div>
                  <div
                    className="h-full flex items-center justify-center text-[9px] font-medium text-white"
                    style={{ width: '3%', background: 'var(--color-primary)' }}
                    title="~200 new tokens"
                  />
                </div>
              </div>

              {/* TTFT big number */}
              <div className="border-t border-[var(--color-border-light)] pt-3">
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">TTFT</div>
                <div className="text-[24px] font-mono font-bold" style={{ color: 'var(--color-teal-text)' }}>~12 ms</div>
                <div className="text-[10px] text-[var(--color-text-muted)]">incremental prefill only — 200 new tokens</div>
              </div>
            </div>
          </div>

          {/* 40× ratio visual */}
          <div className="mt-4 p-3 rounded-lg border border-dashed text-center"
               style={{ borderColor: 'var(--color-red)', background: 'var(--color-red-bg)' }}>
            <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider">Bad routing decision</div>
            <div className="text-[28px] font-bold font-mono" style={{ color: 'var(--color-red-text)' }}>
              40× more compute
            </div>
            <div className="text-[11px]" style={{ color: 'var(--color-red-text)' }}>
              488 ms of GPU time burned on a problem the cluster already solved
            </div>
          </div>
        </div>
      </Panel>

      {/* Comparison table */}
      <Panel className="mt-4">
        <PanelHeader>Round-robin vs. cache-aware — metric by metric</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-left">Round-robin (GPU 5, no cache)</th>
                <th className="px-4 py-2 text-left">Cache-aware (GPU 3, cache hit)</th>
              </tr>
            </thead>
            <tbody>
              {ROUTING_COMPARISON.map((row) => (
                <tr
                  key={row.metric}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.highlight ? 'bg-[var(--color-red-bg)]' : ''
                  }`}
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.metric}</td>
                  <td className={`px-4 py-2 ${row.highlight ? 'font-bold text-[var(--color-red-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {row.roundRobin}
                  </td>
                  <td className={`px-4 py-2 ${row.highlight ? 'font-bold text-[var(--color-teal-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {row.cacheAware}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="warn"
        message="From Stop 13: a cache miss costs ~10× more than a hit when you factor in compute, stalling, and opportunity cost. In this example it’s even worse because the cache is <strong>right there on GPU 3</strong> — the system just didn’t know to look."
      />

      <Panel className="mt-4">
        <PanelHeader>The blind spot</PanelHeader>
        <div className="p-4 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          Traditional load balancers don’t know about KV cache. They see GPU utilization, queue depth, connection count.
          They don’t see that GPU 3 has User 17’s context and GPU 5 doesn’t. This blindness is what makes standard load
          balancing fundamentally wrong for LLM inference.
        </div>
      </Panel>
    </div>
  );
}

/* =====================================================================
   PAGE 2 — "The routing decision" — INTERACTIVE ANIMATION
   8 GPU fleet tiles animate through 3 scoring steps
   ===================================================================== */

function RoutingDecisionPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  // Auto-advance when playing
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setStepIndex((prev) => {
          if (prev >= ROUTING_STEPS.length - 1) {
            setIsPlaying(false);
            return ROUTING_STEPS.length - 1;
          }
          return prev + 1;
        });
      }, 1800);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  const step = ROUTING_STEPS[stepIndex];
  const phase = step.key;
  const showCache = phase === 'cache' || phase === 'combined' || phase === 'routed';
  const showLoad = phase === 'load' || phase === 'combined' || phase === 'routed';
  const showScores = phase === 'combined' || phase === 'routed';
  const highlightWinner = phase === 'routed';

  function handlePlay() {
    if (stepIndex >= ROUTING_STEPS.length - 1) setStepIndex(0);
    setIsPlaying(true);
  }
  function handleReset() {
    setIsPlaying(false);
    setStepIndex(0);
  }

  // Get the capacity score for a given GPU id
  const capacityOf = (id) => {
    const row = SCORING_TABLE.find((r) => r.id === id);
    return row ? row.capacity : 0;
  };
  const pointsOf = (id) => {
    const row = SCORING_TABLE.find((r) => r.id === id);
    return row ? row.points : 0;
  };

  return (
    <div>
      {/* Step banner */}
      <Panel>
        <PanelHeader>{step.title}</PanelHeader>
        <div className="p-4 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          {step.description}
        </div>

        {/* Controls */}
        <div className="px-4 pb-4 flex items-center gap-3 border-t border-[var(--color-border-light)] pt-3">
          <button
            onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
            className="px-3 py-1 text-[11px] rounded border border-[var(--color-teal)] bg-[var(--color-teal-bg)] text-[var(--color-teal-text)] hover:opacity-80 transition-opacity cursor-pointer"
          >
            {isPlaying ? 'Pause' : stepIndex >= ROUTING_STEPS.length - 1 ? 'Replay' : 'Score request'}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1 text-[11px] rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer"
          >
            Reset
          </button>
          {/* Step pips */}
          <div className="flex gap-1 flex-1 justify-center">
            {ROUTING_STEPS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => { setIsPlaying(false); setStepIndex(i); }}
                className={`px-2 py-0.5 text-[10px] rounded cursor-pointer transition-all border ${
                  i === stepIndex
                    ? 'bg-[var(--color-primary-bg)] border-[var(--color-primary)] text-[var(--color-primary-text)] font-medium'
                    : i < stepIndex
                    ? 'bg-[var(--color-surface-muted)] border-[var(--color-border-light)] text-[var(--color-text-muted)]'
                    : 'border-[var(--color-border-light)] text-[var(--color-text-muted)] opacity-60'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* 8 GPU fleet grid */}
      <Panel className="mt-4">
        <PanelHeader>The fleet — 8× H100 with User 17’s request pending</PanelHeader>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {GPU_FLEET.map((gpu) => {
              const isWinner = gpu.hasUser17;
              const highlight = highlightWinner && isWinner;
              const cacheMatch = gpu.hasUser17 ? 100 : 0;
              const capacity = capacityOf(gpu.id);
              const points = pointsOf(gpu.id);

              return (
                <div
                  key={gpu.id}
                  className="rounded-lg border-2 p-2 space-y-1.5"
                  style={{
                    borderColor: highlight ? 'var(--color-teal)' : isWinner && showCache ? 'var(--color-teal)' : 'var(--color-border-light)',
                    background: highlight
                      ? 'var(--color-teal-bg)'
                      : isWinner && showCache
                      ? 'var(--color-teal-bg)'
                      : 'var(--color-surface)',
                    transition: 'all 300ms ease',
                    boxShadow: highlight ? '0 0 0 3px var(--color-teal-bg)' : 'none',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-bold text-[var(--color-text)]">GPU {gpu.id}</div>
                    {highlight && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--color-teal)', color: 'white' }}>
                        ROUTED
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-[var(--color-text-muted)]">{gpu.userRange}</div>

                  {/* Load bar */}
                  <div>
                    <div className="flex items-center justify-between text-[9px] text-[var(--color-text-muted)]">
                      <span>Load</span>
                      <span className="font-mono">{gpu.load}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${gpu.load}%`,
                          background: gpu.load >= 70 ? 'var(--color-red)' : gpu.load >= 50 ? 'var(--color-amber)' : 'var(--color-teal)',
                          transition: 'width 400ms ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Cache match row — revealed in step 1+ */}
                  <div
                    style={{
                      opacity: showCache ? 1 : 0.2,
                      transition: 'opacity 400ms ease',
                    }}
                  >
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-[var(--color-text-muted)]">Cache U17</span>
                      <span
                        className="font-mono font-bold"
                        style={{ color: cacheMatch > 0 ? 'var(--color-teal-text)' : 'var(--color-text-muted)' }}
                      >
                        {cacheMatch}%
                      </span>
                    </div>
                  </div>

                  {/* Capacity row — revealed in step 2+ */}
                  <div
                    style={{
                      opacity: showLoad ? 1 : 0.2,
                      transition: 'opacity 400ms ease',
                    }}
                  >
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-[var(--color-text-muted)]">Capacity</span>
                      <span className="font-mono text-[var(--color-blue-text)]">{capacity}%</span>
                    </div>
                  </div>

                  {/* Points row — revealed in step 3+ */}
                  <div
                    className="rounded px-1 py-0.5"
                    style={{
                      opacity: showScores ? 1 : 0.2,
                      background: showScores && isWinner ? 'var(--color-teal)' : 'var(--color-surface-muted)',
                      transition: 'opacity 400ms ease, background 400ms ease',
                    }}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span style={{ color: showScores && isWinner ? 'white' : 'var(--color-text-muted)' }}>Score</span>
                      <span
                        className="font-mono font-bold"
                        style={{ color: showScores && isWinner ? 'white' : 'var(--color-text)' }}
                      >
                        {points} pts
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* Formula and scoring table */}
      <Panel className="mt-4">
        <PanelHeader>The formula</PanelHeader>
        <div className="p-4">
          <div className="text-center font-mono text-[14px] text-[var(--color-text)] py-2 px-4 rounded-lg border border-dashed border-[var(--color-primary)] bg-[var(--color-primary-bg)]">
            score = (cache_match% × <span style={{ color: 'var(--color-teal-text)' }}>0.8</span>) + (capacity% × <span style={{ color: 'var(--color-blue-text)' }}>0.2</span>)
          </div>
          <div className="text-[11px] text-center text-[var(--color-text-muted)] mt-2">
            Cache affinity is weighted 4× heavier than load because the cost of a miss is so high.
          </div>
        </div>
        <div className="overflow-x-auto border-t border-[var(--color-border-light)]">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-1.5 text-left">GPU</th>
                <th className="px-3 py-1.5 text-right">Cache match</th>
                <th className="px-3 py-1.5 text-right">Capacity</th>
                <th className="px-3 py-1.5 text-right">Weighted total</th>
              </tr>
            </thead>
            <tbody>
              {SCORING_TABLE.slice(0, 3).map((row) => (
                <tr
                  key={row.gpu}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.winner && showScores ? 'bg-[var(--color-teal-bg)]' : ''
                  }`}
                  style={{ transition: 'background 400ms ease' }}
                >
                  <td className={`px-3 py-1.5 font-medium ${row.winner && showScores ? 'text-[var(--color-teal-text)]' : 'text-[var(--color-text)]'}`}>
                    {row.gpu} {row.winner && showScores && '← winner'}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.cacheScore}% × 0.8 = {(row.cacheScore * 0.8).toFixed(0)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.capacity}% × 0.2 = {(row.capacity * 0.2).toFixed(0)}
                  </td>
                  <td className={`px-3 py-1.5 text-right font-mono ${row.winner && showScores ? 'font-bold text-[var(--color-teal-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {row.points} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>But what if GPU 3 were at 95% load?</strong> The weights shift. If GPU 3 is nearly full, sending more work risks queue delays for <em>all</em> of GPU 3’s users. The router might decide: “Cache miss on GPU 5 costs 500 ms of prefill, but GPU 3’s queue would add 800 ms of waiting. GPU 5 is the better choice despite the miss.” This is the tension the router navigates continuously."
      />
    </div>
  );
}

/* =====================================================================
   PAGE 3 — "Prefix sharing — the multiplier effect"
   Definition, 3 sources (visual token blocks), prefix tree matches,
   savings table, production benchmarks
   ===================================================================== */

function PrefixSharingPage() {
  const [matchIndex, setMatchIndex] = useState(0);
  const currentMatch = PREFIX_MATCHES[matchIndex];

  return (
    <div>
      {/* What is a prefix? */}
      <Panel>
        <PanelHeader>What is a prefix?</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            When a user sends a request to an LLM, the full prompt is a sequence of tokens. In many
            deployments, the first N tokens of that sequence are identical across multiple users or
            requests. This shared beginning is called the <strong className="text-[var(--color-text)]">prefix</strong>.
          </p>
          <p>
            The prefix isn’t a special data structure — it’s simply the observation that multiple prompts
            start with the same token sequence. The KV cache for those shared tokens is mathematically
            identical regardless of which user sent the request, because the attention computation for token
            N depends only on tokens 1 through N.
          </p>
          <p>
            If GPU 3 has already computed and cached the KV for tokens 1–2,000 (the prefix), and a new
            request arrives with the same first 2,000 tokens, GPU 3 can skip prefill for those tokens
            entirely. Only the tokens <em>after</em> the shared prefix need fresh computation.
          </p>
        </div>
      </Panel>

      {/* Three sources with visual token blocks */}
      <Panel className="mt-4">
        <PanelHeader>Where do prefixes come from? Three common sources</PanelHeader>
        <div className="px-4 py-3 space-y-5">
          {PREFIX_SOURCES.map((src) => {
            const total = src.blocks.reduce((s, b) => s + b.tokens, 0);
            return (
              <div key={src.num}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-[11px] font-bold flex items-center justify-center">
                    {src.num}
                  </span>
                  <strong className="text-[13px] text-[var(--color-text)]">{src.title}</strong>
                  <span className="text-[11px] text-[var(--color-text-muted)]">— {src.tagline}</span>
                </div>
                <p className="ml-8 text-[12px] text-[var(--color-text-secondary)] leading-relaxed mb-2"
                   dangerouslySetInnerHTML={{ __html: src.body }} />
                {/* Visual token blocks */}
                <div className="ml-8 rounded border border-[var(--color-border-light)] overflow-hidden flex h-8">
                  {src.blocks.map((b, i) => (
                    <div
                      key={i}
                      className="h-full flex items-center justify-center text-[10px] font-medium text-white border-r border-white/20 last:border-r-0"
                      style={{
                        width: `${(b.tokens / total) * 100}%`,
                        background: b.kind === 'shared' ? 'var(--color-teal)' : 'var(--color-primary)',
                      }}
                    >
                      {b.label}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Prefix tree with three match types — interactive selector */}
      <Panel className="mt-4">
        <PanelHeader>Prefix tree matching — three outcomes</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Inference engines (vLLM, SGLang, TRT-LLM) store KV cache in a <strong className="text-[var(--color-text)]">prefix tree</strong>
            {' '}(radix tree). When a new request arrives, the engine walks the tree from the root, matching
            the request’s tokens against existing nodes. One of three things happens:
          </p>

          {/* Match type selector */}
          <div className="flex gap-2 flex-wrap">
            {PREFIX_MATCHES.map((m, i) => (
              <button
                key={m.label}
                onClick={() => setMatchIndex(i)}
                className="px-3 py-1.5 text-[11px] rounded border-2 cursor-pointer transition-all"
                style={{
                  borderColor: i === matchIndex ? m.dot : 'var(--color-border-light)',
                  background: i === matchIndex ? `var(--color-${m.color}-bg)` : 'var(--color-surface)',
                  color: i === matchIndex ? `var(--color-${m.color}-text)` : 'var(--color-text-muted)',
                  fontWeight: i === matchIndex ? 'bold' : 'normal',
                }}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: m.dot }} />
                {m.label}
              </button>
            ))}
          </div>

          {/* Match visualization */}
          <div className="rounded-lg border border-[var(--color-border-light)] p-3 space-y-2"
               style={{ background: 'var(--color-surface-muted)' }}>
            <div className="text-[12px]">
              <strong className="text-[var(--color-text)]">{currentMatch.label}:</strong> {currentMatch.text}
            </div>
            <div className="flex h-8 rounded overflow-hidden border border-[var(--color-border-light)]">
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                style={{
                  width: `${currentMatch.bar.cached}%`,
                  background: 'var(--color-teal)',
                  transition: 'width 300ms ease',
                }}
              >
                {currentMatch.bar.cached > 0 && 'cached (reuse)'}
              </div>
              <div
                className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                style={{
                  width: `${currentMatch.bar.fresh}%`,
                  background: currentMatch.bar.fresh > 0 ? currentMatch.dot : 'transparent',
                  transition: 'width 300ms ease',
                }}
              >
                {currentMatch.bar.fresh > 0 && 'fresh prefill'}
              </div>
            </div>
            <div className="text-[11px] text-right font-mono" style={{ color: currentMatch.dot }}>
              {currentMatch.savings}
            </div>
          </div>

          <p className="text-[12px] text-[var(--color-text-muted)]">
            The prefix tree is what lets the <strong className="text-[var(--color-text)]">KV Cache Indexer</strong>
            {' '}(Page 4) answer: “what percentage of this request’s prefix is cached on each GPU?” The Indexer
            maintains a global view of every pod’s prefix tree.
          </p>
        </div>
      </Panel>

      {/* Savings table */}
      <Panel className="mt-4">
        <PanelHeader>Savings in our scenario — 32 users, 2K-token system prompt</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-left">Without prefix routing</th>
                <th className="px-4 py-2 text-left">With prefix routing</th>
              </tr>
            </thead>
            <tbody>
              {PREFIX_ROUTING_SAVINGS.map((row) => (
                <tr key={row.metric} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.metric}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.without}</td>
                  <td className="px-4 py-2 text-[var(--color-teal-text)]">{row.withRouting}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>64K → 16K tokens</strong> — a 4× reduction in redundant system prompt computation. For RAG workloads (20 engineers querying the same 10K-token document), the savings compound even further: ~8× reduction."
      />

      {/* Production benchmarks */}
      <Panel className="mt-4">
        <PanelHeader>Production benchmarks (llm-d, 16× H100, 150 enterprise customers)</PanelHeader>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {PREFIX_BENCHMARKS.map((b) => (
            <div
              key={b.metric}
              className="rounded-lg border-2 p-3 text-center"
              style={{ borderColor: 'var(--color-teal)', background: 'var(--color-teal-bg)' }}
            >
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{b.metric}</div>
              <div className="text-[22px] font-mono font-bold" style={{ color: 'var(--color-teal-text)' }}>
                {b.value}
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] mt-1">{b.note}</div>
            </div>
          ))}
        </div>
      </Panel>

      <InfoBox>
        These numbers come from a benchmark with heavy prefix overlap. Workloads with less sharing see
        smaller but still significant gains — 3–5× TTFT improvement even with moderate prefix overlap.
      </InfoBox>
    </div>
  );
}

/* =====================================================================
   PAGE 4 — "The llm-d approach"
   3 architecture components, scoring strategies table, benchmarks
   ===================================================================== */

function LlmdPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>llm-d architecture — three key components</PanelHeader>
        <div className="px-4 py-3 space-y-4">
          {LLMD_COMPONENTS.map((c) => (
            <div key={c.num} className="rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary-bg)] p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--color-primary)] text-white text-[13px] font-bold flex items-center justify-center">
                  {c.num}
                </span>
                <strong className="text-[13px] text-[var(--color-primary-text)]">{c.title}</strong>
              </div>
              <p className="ml-9 text-[12px] text-[var(--color-text-secondary)] leading-relaxed">{c.text}</p>
              {c.detail && (
                <p className="ml-9 mt-2 text-[11px] text-[var(--color-text-muted)] leading-relaxed italic border-l-2 pl-2"
                   style={{ borderColor: 'var(--color-border-light)' }}>
                  {c.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Scoring strategies — simplest to most sophisticated</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Strategy</th>
                <th className="px-4 py-2 text-left">How it works</th>
                <th className="px-4 py-2 text-left">Best for</th>
              </tr>
            </thead>
            <tbody>
              {LLMD_STRATEGIES.map((row, i) => (
                <tr key={row.strategy} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">
                    <span className="inline-block w-5 text-[var(--color-text-muted)] text-[10px] font-mono">{i + 1}.</span>
                    {row.strategy}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.howItWorks}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Benchmark results — 16× H100 cluster</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-right">Round-robin</th>
                <th className="px-4 py-2 text-right">Load + prefix</th>
                <th className="px-4 py-2 text-right">Precise prefix-cache</th>
              </tr>
            </thead>
            <tbody>
              {LLMD_BENCHMARKS.map((row) => (
                <tr
                  key={row.metric}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.highlight ? 'bg-[var(--color-teal-bg)]' : ''
                  }`}
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.metric}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.roundRobin}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.loadPrefix}</td>
                  <td className={`px-4 py-2 text-right font-mono ${row.highlight ? 'font-bold text-[var(--color-teal-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {row.precisePrefix}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="good"
        message="The <strong>57× improvement</strong> comes from eliminating nearly all redundant prefill computation. With an 87% cache hit rate, only 13% of requests require fresh prefill. The remaining 87% reuse existing cache and go straight to incremental prefill (just the new tokens) or immediate decode."
      />
    </div>
  );
}

/* =====================================================================
   PAGE 5 — "NVIDIA Dynamo Smart Router"
   Description + 8-property comparison table + convergence note
   ===================================================================== */

function DynamoRouterPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Dynamo Smart Router</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Dynamo’s router tracks KV cache across large fleets using a{' '}
            <strong className="text-[var(--color-text)]">Radix Tree</strong> — a prefix tree
            data structure optimized for matching shared prefixes. It hashes incoming requests and matches
            against the tree to find pods with relevant cached prefixes.
          </p>
          <p>
            The router integrates with the Dynamo Planner for dynamic prefill/decode pool sizing (Stop 12),
            and supports specialized algorithms for KV cache insertion and eviction, ensuring the most
            relevant blocks are retained.
          </p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>llm-d vs. Dynamo Smart Router</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Property</th>
                <th className="px-4 py-2 text-left">llm-d</th>
                <th className="px-4 py-2 text-left">Dynamo Smart Router</th>
              </tr>
            </thead>
            <tbody>
              {LLMD_VS_DYNAMO.map((row) => (
                <tr key={row.property} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.property}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.llmd}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.dynamo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="note"
        message="Both systems solve the same fundamental problem: making the routing layer KV-cache-aware. <strong>llm-d is more portable</strong> (works across hardware vendors and integrates with Kubernetes ecosystem tools). <strong>Dynamo is more integrated</strong> (tighter coupling with NVIDIA’s hardware and software stack). In practice, they’re converging: llm-d uses NIXL for KV transfer, and Dynamo’s components are being contributed to the open-source ecosystem."
      />
    </div>
  );
}

/* =====================================================================
   PAGE 6 — "The routing decision tree" — THE BIG INTERACTIVE
   5 scenario buttons, animated walk-through, dual TTFT bars
   ===================================================================== */

function DecisionTreePage() {
  const [scenarioId, setScenarioId] = useState('A');
  const [stageIndex, setStageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  const scenario = ROUTING_SCENARIOS.find((s) => s.id === scenarioId);

  // Reset animation when scenario changes
  useEffect(() => {
    setStageIndex(0);
    setIsPlaying(true);
  }, [scenarioId]);

  // Auto-advance stages when playing
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setStageIndex((prev) => {
          if (prev >= scenario.stages.length - 1) {
            setIsPlaying(false);
            return scenario.stages.length - 1;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, scenario]);

  // TTFT bar widths — normalize to max 600ms
  const maxMs = 600;
  const cacheAwareWidth = Math.min((scenario.ttftMs / maxMs) * 100, 100);
  const roundRobinWidth = Math.min((scenario.roundRobinTtftMs / maxMs) * 100, 100);

  function replayAnimation() {
    setStageIndex(0);
    setIsPlaying(true);
  }

  return (
    <div>
      {/* Scenario selector buttons */}
      <Panel>
        <PanelHeader>Pick a scenario</PanelHeader>
        <div className="p-3 grid grid-cols-1 md:grid-cols-5 gap-2">
          {ROUTING_SCENARIOS.map((s) => {
            const active = s.id === scenarioId;
            return (
              <button
                key={s.id}
                onClick={() => setScenarioId(s.id)}
                className="text-left p-2 rounded-lg border-2 cursor-pointer transition-all"
                style={{
                  borderColor: active ? 'var(--color-primary)' : 'var(--color-border-light)',
                  background: active ? 'var(--color-primary-bg)' : 'var(--color-surface)',
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center"
                    style={{
                      background: active ? 'var(--color-primary)' : 'var(--color-surface-muted)',
                      color: active ? 'white' : 'var(--color-text-muted)',
                    }}
                  >
                    {s.id}
                  </span>
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: active ? 'var(--color-primary-text)' : 'var(--color-text)' }}
                  >
                    {s.title}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] leading-tight">{s.subtitle}</div>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Scenario description */}
      <Panel className="mt-4">
        <PanelHeader>Scenario {scenario.id} — {scenario.title}</PanelHeader>
        <div className="p-4 space-y-3">
          <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            {scenario.description}
          </p>

          {/* Cache tier badge */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[var(--color-text-muted)]">Cache location:</span>
            <span
              className="px-2 py-0.5 rounded-full font-medium border"
              style={{
                borderColor: scenario.cacheTierColor,
                color: scenario.cacheTierColor,
                background: 'var(--color-surface-muted)',
              }}
            >
              {scenario.cacheTier}
            </span>
          </div>

          {/* Animated GPU strip — 8 tiles highlighting winner */}
          <div className="grid grid-cols-8 gap-1.5">
            {GPU_FLEET.map((gpu) => {
              const isWinner = scenario.selectedGpu === gpu.id;
              const showWinner = stageIndex >= 2 && isWinner;
              return (
                <div
                  key={gpu.id}
                  className="rounded border-2 p-1.5 text-center"
                  style={{
                    borderColor: showWinner ? 'var(--color-teal)' : 'var(--color-border-light)',
                    background: showWinner ? 'var(--color-teal-bg)' : 'var(--color-surface)',
                    transition: 'all 300ms ease',
                    boxShadow: showWinner ? '0 0 0 3px var(--color-teal-bg)' : 'none',
                  }}
                >
                  <div className="text-[10px] font-bold text-[var(--color-text)]">GPU {gpu.id}</div>
                  <div className="text-[9px] text-[var(--color-text-muted)]">{gpu.load}%</div>
                  {showWinner && (
                    <div className="text-[8px] font-bold mt-0.5" style={{ color: 'var(--color-teal-text)' }}>
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {scenario.selectedGpu === null && stageIndex >= 2 && (
            <div
              className="rounded-lg border-2 border-dashed p-2 text-center text-[11px]"
              style={{ borderColor: 'var(--color-amber)', color: 'var(--color-amber)', background: 'var(--color-surface-muted)' }}
            >
              Routed to Prefill Pool (disaggregated serving, Stop 12)
            </div>
          )}

          {/* Stage walkthrough */}
          <div className="space-y-2">
            {scenario.stages.map((stage, i) => {
              const isActive = i === stageIndex;
              const isPast = i < stageIndex;
              return (
                <div
                  key={stage.key}
                  onClick={() => { setIsPlaying(false); setStageIndex(i); }}
                  className="rounded-lg border p-2 cursor-pointer transition-all"
                  style={{
                    borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border-light)',
                    background: isActive ? 'var(--color-primary-bg)' : 'var(--color-surface)',
                    opacity: isPast ? 0.6 : 1,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                      style={{
                        background: isActive || isPast ? 'var(--color-primary)' : 'var(--color-surface-muted)',
                        color: isActive || isPast ? 'white' : 'var(--color-text-muted)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="text-[12px] font-medium text-[var(--color-text)]">{stage.title}</div>
                      <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{stage.text}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Replay button */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={replayAnimation}
              className="px-3 py-1 text-[11px] rounded border border-[var(--color-teal)] bg-[var(--color-teal-bg)] text-[var(--color-teal-text)] hover:opacity-80 transition-opacity cursor-pointer"
            >
              {isPlaying ? 'Playing…' : 'Replay animation'}
            </button>
            <button
              onClick={() => { setIsPlaying(false); setStageIndex(scenario.stages.length - 1); }}
              className="px-3 py-1 text-[11px] rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer"
            >
              Skip to end
            </button>
          </div>
        </div>
      </Panel>

      {/* Dual TTFT bars */}
      <Panel className="mt-4">
        <PanelHeader>TTFT — with vs. without smart routing</PanelHeader>
        <div className="p-4 space-y-3">
          {/* Cache-aware bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-medium text-[var(--color-teal-text)]">Cache-aware routing</span>
              <span className="font-mono font-bold text-[var(--color-teal-text)]">{scenario.ttft}</span>
            </div>
            <div className="h-6 rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] overflow-hidden">
              <div
                className="h-full flex items-center justify-end pr-2 text-[10px] font-medium text-white"
                style={{
                  width: `${cacheAwareWidth}%`,
                  background: 'var(--color-teal)',
                  transition: 'width 600ms ease',
                }}
              >
                {cacheAwareWidth > 10 && scenario.ttft}
              </div>
            </div>
          </div>

          {/* Round-robin bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-medium text-[var(--color-red-text)]">Round-robin (no awareness)</span>
              <span className="font-mono font-bold text-[var(--color-red-text)]">{scenario.roundRobinTtft}</span>
            </div>
            <div className="h-6 rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] overflow-hidden">
              <div
                className="h-full flex items-center justify-end pr-2 text-[10px] font-medium text-white"
                style={{
                  width: `${roundRobinWidth}%`,
                  background: 'var(--color-red)',
                  transition: 'width 600ms ease',
                }}
              >
                {roundRobinWidth > 10 && scenario.roundRobinTtft}
              </div>
            </div>
          </div>

          {/* Verdict */}
          <div
            className="rounded px-3 py-2 text-[12px] text-center font-medium"
            style={{
              background: 'var(--color-primary-bg)',
              color: 'var(--color-primary-text)',
              border: '1px solid var(--color-primary)',
            }}
          >
            {scenario.verdict}
          </div>
        </div>
      </Panel>

      <InfoBox>
        Every scenario except E (truly new, unique content with no cache anywhere) benefits from cache-aware
        routing. Even scenario D (new user, shared prefix) cuts TTFT in half by reusing the system prompt cache.
        The router doesn’t need complex logic for most cases — it just needs to know where the cache is.
      </InfoBox>
    </div>
  );
}

/* =====================================================================
   PAGE 7 — "The cache placement feedback loop"
   Cycle diagram with 6 numbered steps + sticky routing risk
   ===================================================================== */

function FeedbackLoopPage() {
  return (
    <div>
      {/* Feedback cycle — circular-ish arrangement */}
      <Panel>
        <PanelHeader>The feedback loop — routing drives placement drives routing</PanelHeader>
        <div className="p-4">
          <div className="space-y-0">
            {FEEDBACK_LOOP_STEPS.map((step, i) => (
              <div key={step.num}>
                <div
                  className="flex gap-3 items-start p-2 rounded-lg"
                  style={{
                    background: i % 2 === 0 ? 'var(--color-surface-muted)' : 'var(--color-surface)',
                    border: '1px solid var(--color-border-light)',
                  }}
                >
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-full text-[12px] font-bold flex items-center justify-center"
                    style={{ background: 'var(--color-primary)', color: 'white' }}
                  >
                    {step.num}
                  </span>
                  <div className="flex-1">
                    <div className="text-[12px] font-bold text-[var(--color-text)]">{step.label}</div>
                    <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">{step.text}</div>
                  </div>
                </div>
                {i < FEEDBACK_LOOP_STEPS.length - 1 && (
                  <div className="flex justify-center text-[14px] py-0.5" style={{ color: 'var(--color-primary)' }}>
                    ↓
                  </div>
                )}
              </div>
            ))}
            {/* Loop back */}
            <div
              className="mt-2 rounded-lg border border-dashed p-2 text-center text-[11px] font-medium"
              style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary-text)', background: 'var(--color-primary-bg)' }}
            >
              ↻ loop repeats — affinity strengthens with each request
            </div>
          </div>
        </div>
      </Panel>

      {/* Sticky routing risk */}
      <Panel className="mt-4">
        <PanelHeader>Sticky routing — the risk</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            This creates a <strong className="text-[var(--color-text)]">sticky routing</strong> pattern where
            users naturally accumulate on specific GPUs. But stickiness creates a risk: if User 17’s
            conversations are always long and GPU 3 always gets User 17, GPU 3 may become overloaded while
            other GPUs are underutilized.
          </p>
        </div>
      </Panel>

      {/* Cache affinity vs load balancing tension */}
      <Panel className="mt-4">
        <PanelHeader>The tension — cache affinity vs. load balancing</PanelHeader>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              className="rounded-lg border-2 p-3 space-y-2"
              style={{ borderColor: 'var(--color-teal)', background: 'var(--color-teal-bg)' }}
            >
              <div className="text-[12px] font-bold" style={{ color: 'var(--color-teal-text)' }}>
                ← Cache affinity pulls
              </div>
              <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Requests toward GPUs with existing cache. Reduces TTFT, saves compute. Favors long-lived
                conversations on specific GPUs. Prefix-heavy workloads (shared system prompts, RAG) win big.
              </div>
            </div>
            <div
              className="rounded-lg border-2 p-3 space-y-2"
              style={{ borderColor: 'var(--color-blue)', background: 'var(--color-blue-bg)' }}
            >
              <div className="text-[12px] font-bold" style={{ color: 'var(--color-blue-text)' }}>
                Load balancing pushes →
              </div>
              <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Requests toward less-loaded GPUs. Prevents hotspots, ensures fairness. Favors diverse
                workloads where cache hits are rare anyway. Stops any one GPU from becoming the bottleneck.
              </div>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-center text-[var(--color-text-muted)]">
            The optimal balance depends on workload. Prefix-heavy favors affinity; diverse favors balance.
          </div>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>The predicted latency approach</strong> (llm-d experimental) resolves this tension elegantly: instead of manually weighting cache vs. load, an ML model trained on live traffic directly predicts “if I send this request to GPU N, what will the TTFT and TPOT be?” The router simply picks the GPU with the lowest predicted latency. The model implicitly learns the right tradeoff between cache affinity and load for the current workload pattern."
      />
    </div>
  );
}

/* =====================================================================
   PAGE 8 — "Stop 16 at a glance"
   Summary table + evolving diagram + bridge to Stop 17
   ===================================================================== */

function SummaryPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Routing strategy comparison</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Routing strategy</th>
                <th className="px-4 py-2 text-left">TTFT impact</th>
                <th className="px-4 py-2 text-right">Cache hit rate</th>
                <th className="px-4 py-2 text-left">Complexity</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_TABLE.map((row) => (
                <tr
                  key={row.strategy}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.highlight ? 'bg-[var(--color-teal-bg)]' : ''
                  }`}
                >
                  <td className={`px-4 py-2 font-medium ${row.highlight ? 'text-[var(--color-teal-text)]' : 'text-[var(--color-text)]'}`}>
                    {row.strategy}
                  </td>
                  <td className={`px-4 py-2 ${row.highlight ? 'font-bold text-[var(--color-teal-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {row.ttftImpact}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.cacheHitRate}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.complexity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Evolving diagram — Smart Router + Indexer + Pools + ICMS */}
      <Panel className="mt-4">
        <PanelHeader>Evolving diagram — Stop 16 adds the routing layer</PanelHeader>
        <div className="p-4 space-y-3">
          {/* Users row */}
          <div className="flex justify-center gap-2 text-[10px]">
            {['User 1', 'User 17', 'User 32', 'User 501'].map((u) => (
              <div
                key={u}
                className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
              >
                {u}
              </div>
            ))}
          </div>
          <div className="text-center text-[var(--color-text-muted)] text-[11px]">↓ requests</div>

          {/* Smart Router + Indexer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <div></div>
            <div
              className="rounded-lg border-2 p-3 text-center"
              style={{ borderColor: 'var(--color-primary)', background: 'var(--color-primary-bg)' }}
            >
              <div className="text-[13px] font-bold" style={{ color: 'var(--color-primary-text)' }}>Smart Router</div>
              <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
                cache match · load · predicted TTFT
              </div>
            </div>
            <div
              className="rounded-lg border border-dashed p-2 text-center text-[10px]"
              style={{ borderColor: 'var(--color-blue)', color: 'var(--color-blue-text)', background: 'var(--color-blue-bg)' }}
            >
              <div className="font-bold">KV Cache Indexer</div>
              <div className="text-[9px] text-[var(--color-text-muted)]">KVEvents ← all GPUs</div>
            </div>
          </div>

          <div className="text-center text-[var(--color-text-muted)] text-[11px]">↓ routes</div>

          {/* Pools */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border-2 p-3" style={{ borderColor: 'var(--color-teal)', background: 'var(--color-teal-bg)' }}>
              <div className="text-[12px] font-bold text-center" style={{ color: 'var(--color-teal-text)' }}>Prefill Pool</div>
              <div className="text-[10px] text-center text-[var(--color-text-muted)] mt-1">GPUs 0–3</div>
              <div className="flex gap-1 mt-2 justify-center">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center"
                       style={{ background: 'var(--color-teal)', color: 'white' }}>
                    {i}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border-2 p-3" style={{ borderColor: 'var(--color-blue)', background: 'var(--color-blue-bg)' }}>
              <div className="text-[12px] font-bold text-center" style={{ color: 'var(--color-blue-text)' }}>Decode Pool</div>
              <div className="text-[10px] text-center text-[var(--color-text-muted)] mt-1">GPUs 4–7</div>
              <div className="flex gap-1 mt-2 justify-center">
                {[4, 5, 6, 7].map((i) => (
                  <div key={i} className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center"
                       style={{ background: 'var(--color-blue)', color: 'white' }}>
                    {i}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center text-[var(--color-text-muted)] text-[11px]">↕ via NIXL (scale-up domain) / RDMA</div>

          {/* ICMS tier */}
          <div className="flex justify-center">
            <div
              className="px-3 py-2 rounded-lg border border-dashed text-[11px] text-center"
              style={{ borderColor: 'var(--color-amber)', color: 'var(--color-amber)', background: 'var(--color-surface-muted)' }}
            >
              <div className="font-bold">ICMS (shared cache tier)</div>
              <div className="text-[9px] text-[var(--color-text-muted)]">accessible from any GPU via router decision</div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Bridge to Stop 17 */}
      <Panel className="mt-4">
        <PanelHeader>Bridge to Stop 17</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            We’ve now built the complete inference infrastructure — from transformer mechanism (Act 1)
            through memory management (Stop 11), parallelism and disaggregation (Stop 12), tiered storage
            (Stop 13), compression (Stop 14), network fabric (Stop 15), and intelligent routing (this stop).
          </p>
          <p>
            Stop 17 assembles the full picture and looks forward: where is this going in the next 1, 2, and
            5 years? What happens when <strong className="text-[var(--color-text)]">scale-up domains</strong> span
            576+ GPUs? When CXL pools reach petabytes? When KV cache becomes a first-class network service? And
            what does all of this mean for the infrastructure professionals building these systems?
          </p>
          <p>
            That’s the final stop — and the capstone interactive diagram that puts every component together
            in one view.
          </p>
        </div>
      </Panel>
    </div>
  );
}

/* =====================================================================
   MAIN COMPONENT
   ===================================================================== */

export default function IntelligentRouting() {
  const [pageIndex, setPageIndex] = useState(0);
  const isDark = useStore((s) => s.darkMode);

  const page = PAGES[pageIndex];
  const narration = NARRATIONS[page.id] || '';

  const goToPage = useCallback((idx) => setPageIndex(idx), []);
  const prevPage = useCallback(() => goToPage(Math.max(0, pageIndex - 1)), [pageIndex, goToPage]);
  const nextPage = useCallback(() => goToPage(Math.min(PAGES.length - 1, pageIndex + 1)), [pageIndex, goToPage]);

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
      {/* Narration — top of every page, rendered as HTML */}
      <div
        className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed
                    px-4 py-3 bg-[var(--color-surface-muted)] rounded-lg
                    border border-[var(--color-border-light)] mb-5"
        dangerouslySetInnerHTML={{ __html: narration }}
      />

      <div className="min-h-[200px]">
        {page.id === 'round-robin-cost' && <RoundRobinCostPage />}
        {page.id === 'routing-decision' && <RoutingDecisionPage />}
        {page.id === 'prefix-sharing' && <PrefixSharingPage />}
        {page.id === 'llm-d' && <LlmdPage />}
        {page.id === 'dynamo-router' && <DynamoRouterPage />}
        {page.id === 'decision-tree' && <DecisionTreePage />}
        {page.id === 'feedback-loop' && <FeedbackLoopPage />}
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
