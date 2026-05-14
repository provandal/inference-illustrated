import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PAGES,
  NARRATIONS,
  POSITION_BLIND_WORDS,
  POSITION_BLIND_ORDERINGS,
  POSITION_BLIND_ATTENTION,
  SINUSOIDAL_DEMO,
  sinusoidalPE,
  SIGNAL_DECAY_DEMO,
  residualPESurvival,
  EXTRAPOLATION_FAILURE,
  ROTATE_DEMO,
  rotate2D,
  dot2D,
  ROPE_MATH_STEPS,
  FREQUENCY_DEMO,
  ropeBandTheta,
  CACHE_REUSE_DEMO,
  LONG_CONTEXT_TECHNIQUES,
  STOP_SUMMARY,
  FORWARD_LINKS,
} from '../data/stop8Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';

/* ================================================================
   PAGE 1 — The Position-Blind Problem
   Three preset orderings of the same 3 words. The attention matrix
   is computed per (queryer, key) word pair, NOT per position — so
   it is identical regardless of which ordering is selected. The
   visual makes that lock-step blatant.
   ================================================================ */
function PositionBlindPage() {
  const [orderingId, setOrderingId] = useState(POSITION_BLIND_ORDERINGS[0].id);
  const ordering = POSITION_BLIND_ORDERINGS.find((o) => o.id === orderingId);
  const wordById = useMemo(() => {
    const m = {};
    POSITION_BLIND_WORDS.forEach((w) => { m[w.id] = w; });
    return m;
  }, []);

  return (
    <div>
      <Panel>
        <PanelHeader>The same three words, in three orders</PanelHeader>
        <InfoBox>
          A tiny sentence: <strong>three words, three orderings</strong>. Pick one
          and watch the attention matrix below. The matrix tracks who attends to
          whom <em>by word</em> — Query &middot; Key — so it doesn&rsquo;t depend
          on what position each word ended up at.
        </InfoBox>

        <div className="px-4 pb-4">
          {/* Ordering selector */}
          <div className="flex flex-wrap gap-2 mb-3">
            {POSITION_BLIND_ORDERINGS.map((o) => (
              <button
                key={o.id}
                onClick={() => setOrderingId(o.id)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded border transition-all cursor-pointer ${
                  orderingId === o.id
                    ? 'bg-[var(--color-primary-bg)] border-[var(--color-primary)] text-[var(--color-primary-text)] shadow-sm'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Display the chosen ordering as positioned tiles */}
          <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2 font-medium">
              Sentence (each tile labelled by position)
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {ordering.order.map((wordId, posIdx) => {
                const w = wordById[wordId];
                return (
                  <div key={posIdx} className="flex flex-col items-center">
                    <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
                      pos {posIdx}
                    </div>
                    <div
                      className="px-3 py-2 rounded-md border-2 font-mono font-bold text-[13px]"
                      style={{
                        borderColor: w.color,
                        background: `color-mix(in srgb, ${w.color} 12%, transparent)`,
                        color: w.color,
                      }}
                    >
                      {w.label}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-[11px] text-[var(--color-text-secondary)] italic leading-relaxed">
              {ordering.note}
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Attention scores by word (Query &middot; Key)</PanelHeader>
        <div className="px-4 pb-4">
          <div className="text-[12px] text-[var(--color-text-secondary)] mb-3">
            Rows = the word doing the looking (Query). Columns = the word being
            looked at (Key). Each cell is the attention weight after softmax.
          </div>

          <AttentionMatrix wordById={wordById} />

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {POSITION_BLIND_ORDERINGS.map((o) => (
              <div
                key={o.id}
                className="rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-2"
              >
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1 font-mono">
                  {o.label}
                </div>
                <div className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                  matrix unchanged
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Callout
        type="warning"
        message="<strong>Permutation invariance.</strong> The model sees a bag of vectors. Without a position signal, it has no way to distinguish &lsquo;dog bit man&rsquo; from &lsquo;man bit dog&rsquo;. Same Q vectors, same K vectors, same Q&middot;K dot products, same softmax. Order is invisible. This is the gap the rest of this stop closes."
      />
    </div>
  );
}

function AttentionMatrix({ wordById }) {
  const wordIds = POSITION_BLIND_WORDS.map((w) => w.id);
  const cellPct = (v) => `${Math.round(v * 100)}%`;
  const colorFor = (v) => {
    // Map 0..1 to a teal-ish heat.
    const pct = Math.min(1, Math.max(0, v));
    return `color-mix(in srgb, var(--color-teal) ${Math.round(pct * 70)}%, transparent)`;
  };

  return (
    <div className="inline-block rounded border border-[var(--color-border-light)] overflow-hidden">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="text-[10px] font-mono text-[var(--color-text-muted)] px-3 py-1.5 border-b border-r border-[var(--color-border-light)] bg-[var(--color-surface-muted)]">
              Q&nbsp;\&nbsp;K
            </th>
            {wordIds.map((kid) => {
              const k = wordById[kid];
              return (
                <th
                  key={kid}
                  className="text-[11px] font-mono font-bold px-3 py-1.5 border-b border-r border-[var(--color-border-light)] bg-[var(--color-surface-muted)]"
                  style={{ color: k.color }}
                >
                  {k.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {wordIds.map((qid) => {
            const q = wordById[qid];
            return (
              <tr key={qid}>
                <th
                  className="text-[11px] font-mono font-bold px-3 py-1.5 border-b border-r border-[var(--color-border-light)] bg-[var(--color-surface-muted)]"
                  style={{ color: q.color }}
                >
                  {q.label}
                </th>
                {wordIds.map((kid) => {
                  const v = POSITION_BLIND_ATTENTION[qid][kid];
                  return (
                    <td
                      key={kid}
                      className="text-[11px] font-mono px-4 py-2 border-b border-r border-[var(--color-border-light)] text-center"
                      style={{ background: colorFor(v) }}
                    >
                      {cellPct(v)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================
   PAGE 2 — First Try: Add a Position Vector (Sinusoidal PE)
   Position slider + heatmap of the resulting d=64 position vector.
   Below, three adjacent positions side-by-side show that nearby
   positions produce similar vectors.
   ================================================================ */
function SinusoidalPage() {
  const [pos, setPos] = useState(SINUSOIDAL_DEMO.defaultPos);
  const vec = useMemo(() => sinusoidalPE(pos, SINUSOIDAL_DEMO.dim), [pos]);
  const prevVec = useMemo(() => sinusoidalPE(Math.max(0, pos - 1), SINUSOIDAL_DEMO.dim), [pos]);
  const nextVec = useMemo(() => sinusoidalPE(pos + 1, SINUSOIDAL_DEMO.dim), [pos]);

  return (
    <div>
      <Panel>
        <PanelHeader>The 2017 idea: add a sinusoidal position vector</PanelHeader>
        <InfoBox>
          For position <em>pos</em> and dimension <em>i</em>, the original
          Transformer paper uses
          <span className="font-mono mx-1">PE(pos, 2i) = sin(pos / 10000<sup>2i/d</sup>)</span>
          and
          <span className="font-mono mx-1">PE(pos, 2i+1) = cos(pos / 10000<sup>2i/d</sup>)</span>.
          Low-i dimensions oscillate slowly (encode coarse position); high-i
          dimensions oscillate quickly (encode fine position). The combined
          vector is a unique fingerprint for every position.
        </InfoBox>

        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-mono text-[var(--color-text-muted)] min-w-[60px]">
              Position
            </span>
            <input
              type="range"
              min={0}
              max={SINUSOIDAL_DEMO.maxPos}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              className="anim-scrubber flex-1"
            />
            <span className="text-[12px] font-mono text-[var(--color-primary-text)] font-bold min-w-[48px] text-right">
              pos = {pos}
            </span>
          </div>

          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1 font-medium">
            PE vector at this position (d = {SINUSOIDAL_DEMO.dim})
          </div>
          <PEHeatmap vec={vec} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <PEHeatmapCard label={`pos = ${Math.max(0, pos - 1)}`} vec={prevVec} />
            <PEHeatmapCard label={`pos = ${pos}`} vec={vec} highlight />
            <PEHeatmapCard label={`pos = ${pos + 1}`} vec={nextVec} />
          </div>
        </div>
      </Panel>

      <Callout
        type="info"
        message="<strong>Why this is a clever choice.</strong> Adjacent positions produce very similar vectors (high cosine similarity), and distant positions produce very different ones. The sinusoidal structure is also <em>shift-friendly</em>: the relationship between any two positions depends only on their difference, not their absolute values \u2014 in theory. The next page shows why &lsquo;in theory&rsquo; falls apart."
      />
    </div>
  );
}

function PEHeatmap({ vec }) {
  const cellW = 100 / vec.length;
  return (
    <div className="flex h-6 rounded border border-[var(--color-border-light)] overflow-hidden">
      {vec.map((v, i) => (
        <div
          key={i}
          style={{
            width: `${cellW}%`,
            background: peCellColor(v),
          }}
          title={`d${i}: ${v.toFixed(3)}`}
        />
      ))}
    </div>
  );
}

function PEHeatmapCard({ label, vec, highlight }) {
  return (
    <div
      className="rounded border p-2"
      style={{
        background: highlight ? 'var(--color-primary-bg)' : 'var(--color-surface-muted)',
        borderColor: highlight ? 'var(--color-primary)' : 'var(--color-border-light)',
      }}
    >
      <div className="text-[10px] font-mono mb-1" style={{ color: highlight ? 'var(--color-primary-text)' : 'var(--color-text-muted)' }}>
        {label}
      </div>
      <PEHeatmap vec={vec} />
    </div>
  );
}

// Map a PE component in [-1, 1] to a diverging colormap (red \u2194 white \u2194 teal).
function peCellColor(v) {
  const x = Math.max(-1, Math.min(1, v));
  if (x >= 0) {
    return `color-mix(in srgb, var(--color-teal) ${Math.round(x * 80)}%, var(--color-surface))`;
  }
  return `color-mix(in srgb, var(--color-red) ${Math.round(-x * 80)}%, var(--color-surface))`;
}

/* ================================================================
   PAGE 3 — Why Add-at-Input Fails
   Two parts:
   (a) signal-decay slider showing how much of the original PE survives
       after L layers of residual writes,
   (b) extrapolation table: model trained to 4K, tested at 8K/32K \u2192 broken.
   ================================================================ */
function AddAtInputFailsPage() {
  const [layer, setLayer] = useState(SIGNAL_DECAY_DEMO.defaultLayer);
  const survival = residualPESurvival(layer);
  const survivalPct = Math.round(survival * 100);
  return (
    <div>
      <Panel>
        <PanelHeader>Problem 1 \u2014 the residual stream attenuates the position signal</PanelHeader>
        <InfoBox>
          The position vector is added <em>once</em>, at the input. From there
          it lives in the residual stream alongside content. Every layer\u2019s
          attention and FFN write their own signal into the residual stream,
          and the position fingerprint gets relatively quieter at each step.
          By layer 80 it\u2019s mostly buried.
        </InfoBox>

        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-mono text-[var(--color-text-muted)] min-w-[60px]">Layer</span>
            <input
              type="range"
              min={1}
              max={SIGNAL_DECAY_DEMO.totalLayers}
              value={layer}
              onChange={(e) => setLayer(Number(e.target.value))}
              className="anim-scrubber flex-1"
            />
            <span className="text-[12px] font-mono text-[var(--color-primary-text)] font-bold min-w-[60px] text-right">
              L = {layer}
            </span>
          </div>

          <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2 font-medium">
              Position-signal amplitude after {layer} layer{layer === 1 ? '' : 's'}
            </div>
            <div className="relative h-7 rounded bg-[var(--color-surface)] border border-[var(--color-border-light)] overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${survivalPct}%`,
                  background:
                    survival > 0.6
                      ? 'var(--color-teal)'
                      : survival > 0.3
                        ? 'var(--color-amber)'
                        : 'var(--color-red)',
                }}
              />
              <div
                className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-bold"
                style={{ color: 'var(--color-text)' }}
              >
                {survivalPct}% of original position signal
              </div>
            </div>
            <div className="text-[11px] text-[var(--color-text-secondary)] mt-2 italic">
              Toy decay model. The point is qualitative: a one-shot add at the
              input is fighting an uphill battle against 80 layers of residual
              writes. RoPE solves this by re-applying position at every layer.
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Problem 2 \u2014 sinusoidal PE doesn\u2019t extrapolate</PanelHeader>
        <InfoBox>
          If a model only saw positions 0\u2013{EXTRAPOLATION_FAILURE.trainedMax} during
          training, the sinusoids at any larger position fall in regions the
          model never learned to interpret. Output quality collapses well
          before any &ldquo;hard&rdquo; limit.
        </InfoBox>
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="text-[var(--color-text-muted)] text-left">
                <th className="px-3 py-2 border-b border-[var(--color-border-light)] font-mono">Position</th>
                <th className="px-3 py-2 border-b border-[var(--color-border-light)]">Regime</th>
                <th className="px-3 py-2 border-b border-[var(--color-border-light)]">Quality</th>
                <th className="px-3 py-2 border-b border-[var(--color-border-light)]">Note</th>
              </tr>
            </thead>
            <tbody>
              {EXTRAPOLATION_FAILURE.examples.map((ex) => (
                <tr key={ex.pos}>
                  <td className="px-3 py-2 border-b border-[var(--color-border-light)] font-mono">{ex.pos.toLocaleString()}</td>
                  <td className="px-3 py-2 border-b border-[var(--color-border-light)] text-[var(--color-text-secondary)]">{ex.status}</td>
                  <td className="px-3 py-2 border-b border-[var(--color-border-light)]">
                    <QualityBadge quality={ex.quality} />
                  </td>
                  <td className="px-3 py-2 border-b border-[var(--color-border-light)] text-[var(--color-text-secondary)]">{ex.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="warning"
        message="<strong>Bottom line.</strong> Adding a position vector at the input is a workable hack but doesn\u2019t scale: position info erodes through depth, and the model can\u2019t safely run beyond the context lengths it saw in training. RoPE fixes both by changing where and how position is applied."
      />
    </div>
  );
}

function QualityBadge({ quality }) {
  const styles = {
    perfect:  { bg: 'var(--color-teal-bg)',  border: 'var(--color-teal)',  text: 'var(--color-teal-text)'  },
    good:     { bg: 'var(--color-teal-bg)',  border: 'var(--color-teal)',  text: 'var(--color-teal-text)'  },
    degraded: { bg: 'var(--color-amber-bg)', border: 'var(--color-amber)', text: 'var(--color-amber-text)' },
    broken:   { bg: 'var(--color-red-bg)',   border: 'var(--color-red)',   text: 'var(--color-red-text)'   },
  };
  const s = styles[quality] || styles.degraded;
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-medium border"
      style={{ background: s.bg, borderColor: s.border, color: s.text }}
    >
      {quality}
    </span>
  );
}

/* ================================================================
   PAGE 4 — RoPE: Rotate, Don't Add
   Single 2D dimension-pair. Sliders for position m (Q) and n (K).
   Show pre-rotation arrows (dim) and post-rotation arrows (bright).
   Display dot products: Q\u00b7K (pre) vs Q\u2032\u00b7K\u2032 (post). The post-rotation
   dot depends on (n\u2212m) only \u2014 the next page proves this algebraically.
   ================================================================ */
function RotateIdeaPage() {
  const [m, setM] = useState(ROTATE_DEMO.defaultPosM);
  const [n, setN] = useState(ROTATE_DEMO.defaultPosN);
  const theta = ROTATE_DEMO.defaultTheta;
  const q = ROTATE_DEMO.qVector;
  const k = ROTATE_DEMO.kVector;
  const qRot = useMemo(() => rotate2D(q, m * theta), [m, theta, q]);
  const kRot = useMemo(() => rotate2D(k, n * theta), [n, theta, k]);
  const preDot  = useMemo(() => dot2D(q, k),         [q, k]);
  const postDot = useMemo(() => dot2D(qRot, kRot),   [qRot, kRot]);

  return (
    <div>
      <Panel>
        <PanelHeader>One dimension-pair, two rotating arrows</PanelHeader>
        <InfoBox>
          RoPE treats each Q and K vector as d/2 pairs of dimensions. Below is
          one such pair, drawn in 2D. Move the sliders to rotate Q (by m\u03b8) and
          K (by n\u03b8). The dim gray arrows are the originals; the bright ones
          are after rotation.
        </InfoBox>

        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RotationCanvas q={q} k={k} qRot={qRot} kRot={kRot} m={m} n={n} theta={theta} />

            <div className="flex flex-col gap-3 text-[12px] font-mono">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1 font-medium">
                  Position of Q (m)
                </div>
                <input
                  type="range" min={0} max={12} value={m}
                  onChange={(e) => setM(Number(e.target.value))}
                  className="anim-scrubber w-full"
                />
                <div className="text-[12px] text-[var(--color-text-secondary)] mt-1">
                  m = <span className="font-bold text-[var(--color-red-text)]">{m}</span>,
                  &nbsp;rotation = m\u00d7\u03b8 = {(m * theta).toFixed(2)} rad
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1 font-medium">
                  Position of K (n)
                </div>
                <input
                  type="range" min={0} max={12} value={n}
                  onChange={(e) => setN(Number(e.target.value))}
                  className="anim-scrubber w-full"
                />
                <div className="text-[12px] text-[var(--color-text-secondary)] mt-1">
                  n = <span className="font-bold text-[var(--color-teal-text)]">{n}</span>,
                  &nbsp;rotation = n\u00d7\u03b8 = {(n * theta).toFixed(2)} rad
                </div>
              </div>

              <div className="mt-2 p-3 rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]">
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1 font-medium">
                  Dot products
                </div>
                <div className="text-[12px]">
                  Q&middot;K (pre-rotation): <span className="font-bold">{preDot.toFixed(3)}</span>
                </div>
                <div className="text-[12px] mt-1">
                  Q\u2032&middot;K\u2032 (post-rotation): <span className="font-bold text-[var(--color-primary-text)]">{postDot.toFixed(3)}</span>
                </div>
                <div className="text-[11px] text-[var(--color-text-secondary)] mt-2 italic leading-relaxed">
                  Move both sliders by the same amount and watch the
                  post-rotation dot product stay constant. Move only one and
                  watch it change. The post-dot depends only on (n \u2212 m).
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>Two wins fall out of this design.</strong> (1) Rotation happens at every attention layer, so position never gets buried in the residual stream. (2) Absolute positions cancel inside the dot product, so only relative position matters \u2014 which makes long-context generalisation work."
      />
    </div>
  );
}

function RotationCanvas({ q, k, qRot, kRot, m, n, theta }) {
  const W = 340, H = 340, CX = W / 2, CY = H / 2, SCALE = 110;
  const toScreen = ([x, y]) => [CX + x * SCALE, CY - y * SCALE];
  const [qx, qy]   = toScreen(q);
  const [kx, ky]   = toScreen(k);
  const [qrx, qry] = toScreen(qRot);
  const [krx, kry] = toScreen(kRot);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[340px] rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]">
      <defs>
        <marker id="arrow-red"  viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-red)" />
        </marker>
        <marker id="arrow-teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-teal)" />
        </marker>
        <marker id="arrow-dim"  viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-text-muted)" />
        </marker>
      </defs>
      {/* Axes */}
      <line x1={0} y1={CY} x2={W} y2={CY} stroke="var(--color-border-light)" />
      <line x1={CX} y1={0} x2={CX} y2={H} stroke="var(--color-border-light)" />
      {/* Unit circle */}
      <circle cx={CX} cy={CY} r={SCALE} fill="none" stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.6} />
      {/* Pre-rotation Q and K (dim) */}
      <line x1={CX} y1={CY} x2={qx} y2={qy} stroke="var(--color-text-muted)" strokeWidth={1.5} opacity={0.5} markerEnd="url(#arrow-dim)" />
      <line x1={CX} y1={CY} x2={kx} y2={ky} stroke="var(--color-text-muted)" strokeWidth={1.5} opacity={0.5} markerEnd="url(#arrow-dim)" />
      <text x={qx + 6} y={qy - 6} fontSize={10} fill="var(--color-text-muted)" fontFamily="monospace">Q</text>
      <text x={kx + 6} y={ky - 6} fontSize={10} fill="var(--color-text-muted)" fontFamily="monospace">K</text>
      {/* Post-rotation Q' and K' (bright) */}
      <line x1={CX} y1={CY} x2={qrx} y2={qry} stroke="var(--color-red)"  strokeWidth={2.2} markerEnd="url(#arrow-red)" />
      <line x1={CX} y1={CY} x2={krx} y2={kry} stroke="var(--color-teal)" strokeWidth={2.2} markerEnd="url(#arrow-teal)" />
      <text x={qrx + 8} y={qry - 4} fontSize={12} fontWeight={700} fill="var(--color-red-text)"  fontFamily="monospace">Q\u2032 (pos {m})</text>
      <text x={krx + 8} y={kry - 4} fontSize={12} fontWeight={700} fill="var(--color-teal-text)" fontFamily="monospace">K\u2032 (pos {n})</text>
      {/* Relative-rotation arc, very small */}
      <text x={W - 8} y={H - 10} fontSize={9} textAnchor="end" fill="var(--color-text-muted)" fontFamily="monospace">
        (n\u2212m)\u03b8 = {((n - m) * theta).toFixed(2)} rad
      </text>
    </svg>
  );
}

/* ================================================================
   PAGE 5 — The Math (Just Enough)
   Five-step algebraic derivation that absolute positions cancel.
   Plus a plot of the dot product Q\u00b7R((n\u2212m)\u03b8)K as a function of (n\u2212m).
   ================================================================ */
function RopeMathPage() {
  const q = ROTATE_DEMO.qVector;
  const k = ROTATE_DEMO.kVector;
  const theta = ROTATE_DEMO.defaultTheta;
  // Compute Q\u00b7R(d\u00b7\u03b8)K for d in -20..+20
  const points = useMemo(() => {
    const out = [];
    for (let d = -20; d <= 20; d++) {
      const kr = rotate2D(k, d * theta);
      out.push({ d, v: dot2D(q, kr) });
    }
    return out;
  }, [q, k, theta]);

  return (
    <div>
      <Panel>
        <PanelHeader>Five lines of algebra: absolute positions cancel</PanelHeader>
        <InfoBox>
          We can prove the &ldquo;only relative position matters&rdquo; claim
          directly. The key facts: (a) rotations are orthogonal matrices, so
          R<sup>T</sup>(\u03c6) = R(\u2212\u03c6); and (b) successive 2D
          rotations <em>add</em> their angles, so R(a)R(b) = R(a+b).
        </InfoBox>

        <div className="px-4 pb-4">
          <ol className="space-y-2">
            {ROPE_MATH_STEPS.map((step, idx) => (
              <li key={step.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-[11px] font-bold flex items-center justify-center font-mono">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[13px] text-[var(--color-text)]">
                    {step.lhs}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-secondary)] italic mt-0.5 leading-relaxed">
                    {step.note}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>The dot product as a function of relative position</PanelHeader>
        <InfoBox>
          Below: the post-rotation dot product Q&middot;R((n\u2212m)\u03b8)K plotted
          against the relative offset (n\u2212m). The wave is what RoPE buys you.
          Nearby tokens produce one consistent score; tokens far apart produce
          another. Critically, the curve depends only on the offset \u2014 you
          could shift both positions by +1000 and the picture wouldn\u2019t move.
        </InfoBox>
        <div className="px-4 pb-4">
          <RelativeDotPlot points={points} theta={theta} />
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>Why this matters for long context.</strong> If the score depends only on (n\u2212m), then a model trained to recognise relative offsets of \u00b1100 will keep working when you slide the whole window to absolute positions 50,000\u201350,200 \u2014 the offsets are still in range. That property is precisely what makes RoPE extrapolate well."
      />
    </div>
  );
}

function RelativeDotPlot({ points, theta }) {
  const W = 640, H = 200, M = { l: 36, r: 14, t: 14, b: 28 };
  const xs = points.map(p => p.d);
  const ys = points.map(p => p.v);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(-1, ...ys), yMax = Math.max(1, ...ys);
  const xScale = (x) => M.l + ((x - xMin) / (xMax - xMin)) * (W - M.l - M.r);
  const yScale = (y) => H - M.b - ((y - yMin) / (yMax - yMin)) * (H - M.t - M.b);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.d)} ${yScale(p.v)}`).join(' ');
  const zeroY = yScale(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]">
      {/* x-axis */}
      <line x1={M.l} y1={zeroY} x2={W - M.r} y2={zeroY} stroke="var(--color-border-light)" />
      {/* y-axis */}
      <line x1={M.l} y1={M.t} x2={M.l} y2={H - M.b} stroke="var(--color-border-light)" />
      {/* Tick labels */}
      {[-20, -10, 0, 10, 20].map((t) => (
        <g key={t}>
          <line x1={xScale(t)} y1={H - M.b} x2={xScale(t)} y2={H - M.b + 3} stroke="var(--color-border)" />
          <text x={xScale(t)} y={H - M.b + 14} fontSize={9} textAnchor="middle" fill="var(--color-text-muted)" fontFamily="monospace">{t}</text>
        </g>
      ))}
      {[-1, 0, 1].map((t) => (
        <g key={t}>
          <line x1={M.l - 3} y1={yScale(t)} x2={M.l} y2={yScale(t)} stroke="var(--color-border)" />
          <text x={M.l - 6} y={yScale(t) + 3} fontSize={9} textAnchor="end" fill="var(--color-text-muted)" fontFamily="monospace">{t.toFixed(1)}</text>
        </g>
      ))}
      {/* Axis labels */}
      <text x={(M.l + W - M.r) / 2} y={H - 4} fontSize={10} textAnchor="middle" fill="var(--color-text-muted)" fontFamily="monospace">(n \u2212 m)</text>
      <text x={4} y={M.t + 4} fontSize={10} fill="var(--color-text-muted)" fontFamily="monospace">Q\u00b7K\u2032</text>
      {/* The plot */}
      <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      {/* Markers at offsets that look interesting */}
      {points.filter(p => p.d % 5 === 0).map((p) => (
        <circle key={p.d} cx={xScale(p.d)} cy={yScale(p.v)} r={2.5} fill="var(--color-primary)" />
      ))}
      <text x={W - M.r - 4} y={M.t + 10} fontSize={9} textAnchor="end" fill="var(--color-text-muted)" fontFamily="monospace">\u03b8 = {theta} rad/pos</text>
    </svg>
  );
}

/* ================================================================
   PAGE 6 — Many Frequencies, Many Roles
   d/2 bands, geometrically spaced. Show 8 of them simultaneously
   with a position slider. The fast bands sweep many revolutions
   while the slow bands have barely moved.
   ================================================================ */
function FrequenciesPage() {
  const [pos, setPos] = useState(FREQUENCY_DEMO.defaultPos);
  const { d, base } = FREQUENCY_DEMO;
  const numBands = d / 2; // 8 bands

  const bands = useMemo(() => {
    const arr = [];
    for (let i = 0; i < numBands; i++) {
      const theta = ropeBandTheta(i, d, base);
      const fullRotPositions = (2 * Math.PI) / theta; // positions for one full revolution
      arr.push({ i, theta, angle: pos * theta, fullRotPositions });
    }
    return arr;
  }, [pos, d, base, numBands]);

  return (
    <div>
      <Panel>
        <PanelHeader>One rotation rate per dimension-pair</PanelHeader>
        <InfoBox>
          For dimension-pair <em>i</em> out of d/2, RoPE uses frequency
          <span className="font-mono mx-1">\u03b8<sub>i</sub> = base<sup>\u22122i/d</sup></span>
          (with base typically 10,000). Pair 0 rotates the fastest and encodes
          <em> local </em>position. The last pair rotates the slowest and
          encodes <em>long-range</em> position. Move the slider \u2014 watch the
          fast bands sweep many revolutions while the slow bands have barely
          twitched.
        </InfoBox>

        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-mono text-[var(--color-text-muted)] min-w-[60px]">Position</span>
            <input
              type="range"
              min={0}
              max={FREQUENCY_DEMO.maxPos}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              className="anim-scrubber flex-1"
            />
            <span className="text-[12px] font-mono text-[var(--color-primary-text)] font-bold min-w-[60px] text-right">
              pos = {pos}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {bands.map((b) => (
              <BandArrow key={b.i} band={b} numBands={numBands} />
            ))}
          </div>
        </div>
      </Panel>

      <Callout
        type="info"
        message="<strong>Why a single dot product captures both close and far relationships.</strong> When you compute Q\u00b7K, the contribution from each dimension-pair has its own offset-dependent wave (Page 5). Fast bands give sharp local signal, slow bands give smooth long-range signal. Attention heads then learn to weight whichever bands match the relationship that head specialises in (Stop 9)."
      />
    </div>
  );
}

function BandArrow({ band, numBands }) {
  const W = 80, H = 80, CX = W / 2, CY = H / 2, R = 28;
  const x = CX + R * Math.cos(band.angle);
  const y = CY - R * Math.sin(band.angle);
  // Color goes from red (fast) to teal (slow) across bands.
  const t = band.i / (numBands - 1);
  const color = `color-mix(in srgb, var(--color-red) ${Math.round((1 - t) * 100)}%, var(--color-teal))`;
  const fullRot = band.fullRotPositions < 1e4
    ? `${Math.round(band.fullRotPositions).toLocaleString()} pos / turn`
    : `${(band.fullRotPositions / 1000).toFixed(0)}K pos / turn`;
  return (
    <div className="rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-2 flex flex-col items-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[80px]">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--color-border)" strokeDasharray="2 2" opacity={0.6} />
        <line x1={CX} y1={CY} x2={x} y2={y} stroke={color} strokeWidth={2.2} />
        <circle cx={x} cy={y} r={3.5} fill={color} />
      </svg>
      <div className="text-[10px] font-mono font-bold text-[var(--color-text-secondary)] mt-1">
        pair {band.i}
      </div>
      <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
        {fullRot}
      </div>
    </div>
  );
}

/* ================================================================
   PAGE 7 — RoPE Meets the KV Cache
   Demonstrate that naive cache reuse at a different position is wrong.
   Toggle: "naive reuse" vs "position-rewrite". The naive case computes
   Q\u00b7K_cached with K_cached still rotated to the OLD position; the
   rewrite case un-rotates and re-rotates K to the new position before
   the dot product.
   ================================================================ */
function RopeAndCachePage() {
  const [mode, setMode] = useState('naive'); // 'naive' | 'rewrite'
  const { cachedAtPos, reuseAtPos, qVector, kVectorPreRotation, theta } = CACHE_REUSE_DEMO;

  // Q is at the NEW position (reuseAtPos). So Q' = R(reuseAtPos * theta) Q.
  const qPrime = useMemo(() => rotate2D(qVector, reuseAtPos * theta), [qVector, reuseAtPos, theta]);

  // K cached form: K originally rotated by cachedAtPos * theta.
  const kCached = useMemo(() => rotate2D(kVectorPreRotation, cachedAtPos * theta), [kVectorPreRotation, cachedAtPos, theta]);

  // Naive reuse: just use kCached as-is at the new position.
  // The correct relative offset SHOULD be (reuseAtPos - reuseAtPos) = 0 (they\u2019re at the same effective position),
  // but the dot product Q'\u00b7kCached behaves as if K were at position cachedAtPos.
  const naiveDot = useMemo(() => dot2D(qPrime, kCached), [qPrime, kCached]);

  // Rewrite: un-rotate by cachedAtPos, re-rotate by reuseAtPos.
  const kRewritten = useMemo(() => {
    const unrotated = rotate2D(kCached, -cachedAtPos * theta);
    return rotate2D(unrotated, reuseAtPos * theta);
  }, [kCached, cachedAtPos, reuseAtPos, theta]);
  const rewriteDot = useMemo(() => dot2D(qPrime, kRewritten), [qPrime, kRewritten]);

  // The "correct" reference: what you'd get if K had been freshly computed at the new position.
  const kFreshAtNew = useMemo(() => rotate2D(kVectorPreRotation, reuseAtPos * theta), [kVectorPreRotation, reuseAtPos, theta]);
  const referenceDot = useMemo(() => dot2D(qPrime, kFreshAtNew), [qPrime, kFreshAtNew]);

  const currentDot = mode === 'naive' ? naiveDot : rewriteDot;
  const errorVsRef = currentDot - referenceDot;

  return (
    <div>
      <Panel>
        <PanelHeader>The cost no one talks about: prefix-cache reuse</PanelHeader>
        <InfoBox>
          A KV cache stores the <strong>post-rotation</strong> K vector \u2014 the
          rotation is baked in at the position the token was originally seen.
          That\u2019s fine for normal reads. It becomes a problem when you try to
          reuse a cached K at a <em>different</em> position (prompt-prefix
          caching, document caching, cross-session reuse).
        </InfoBox>

        <div className="px-4 pb-4">
          <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px] font-mono">
            <div className="rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-2">
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">K cached at</div>
              <div className="text-[14px] font-bold text-[var(--color-text)]">pos {cachedAtPos}</div>
            </div>
            <div className="rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-2">
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">Trying to reuse at</div>
              <div className="text-[14px] font-bold text-[var(--color-text)]">pos {reuseAtPos}</div>
            </div>
            <div className="rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-2">
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">Effective offset baked in</div>
              <div className="text-[14px] font-bold text-[var(--color-red-text)]">{cachedAtPos - reuseAtPos}</div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('naive')}
              className={`flex-1 px-3 py-2 text-[12px] font-medium rounded border transition-all cursor-pointer ${
                mode === 'naive'
                  ? 'bg-[var(--color-red-bg)] border-[var(--color-red)] text-[var(--color-red-text)] shadow-sm'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
              }`}
            >
              Naive reuse (use cached K as-is)
            </button>
            <button
              onClick={() => setMode('rewrite')}
              className={`flex-1 px-3 py-2 text-[12px] font-medium rounded border transition-all cursor-pointer ${
                mode === 'rewrite'
                  ? 'bg-[var(--color-teal-bg)] border-[var(--color-teal)] text-[var(--color-teal-text)] shadow-sm'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
              }`}
            >
              Position-rewrite (un-rotate then re-rotate)
            </button>
          </div>

          <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px] font-mono">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">Computed Q\u00b7K</div>
                <div className="text-[18px] font-bold mt-1" style={{ color: mode === 'naive' ? 'var(--color-red-text)' : 'var(--color-teal-text)' }}>
                  {currentDot.toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">Reference (K fresh at new pos)</div>
                <div className="text-[18px] font-bold text-[var(--color-text-secondary)] mt-1">
                  {referenceDot.toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">Error vs reference</div>
                <div
                  className="text-[18px] font-bold mt-1"
                  style={{ color: Math.abs(errorVsRef) < 1e-4 ? 'var(--color-teal-text)' : 'var(--color-red-text)' }}
                >
                  {Math.abs(errorVsRef) < 1e-4 ? '\u2248 0' : errorVsRef.toFixed(3)}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-[var(--color-text-secondary)] mt-3 italic leading-relaxed">
              {mode === 'naive' ? (
                <>
                  <strong>Naive reuse silently scores the wrong relative offset.</strong> The cached K
                  carries a rotation matched to its <em>original</em> position. When you compare it
                  against a Q that\u2019s rotated for a new position, the dot product behaves as if K were
                  back at pos {cachedAtPos}, not at pos {reuseAtPos}. Quality drops without obvious
                  error signals.
                </>
              ) : (
                <>
                  <strong>Position-rewrite recovers the right score.</strong> Un-rotate K by the old
                  position, re-rotate by the new one. Same value as if K had been freshly computed
                  there. The extra rotations are cheap (a few multiplies per pair), but the bookkeeping
                  \u2014 knowing each cache entry\u2019s original position \u2014 is what makes prefix-cache
                  systems harder than they look.
                </>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="info"
        message="<strong>Forward pointer.</strong> Stop 17 covers cache-aware routing: when a prefix is shared across many requests, the cache layer needs to either keep prefixes at fixed absolute positions (limiting reuse) or apply position-rewrite per reuse (extra ops). Several production systems land somewhere in between."
      />
    </div>
  );
}

/* ================================================================
   Placeholder pages (filled in progressively).
   ================================================================ */
function PlaceholderPage({ title }) {
  return (
    <div>
      <Panel>
        <PanelHeader>{title}</PanelHeader>
        <InfoBox>
          <em>Coming next: full content + interactive widget for this page.</em>
        </InfoBox>
      </Panel>
    </div>
  );
}

/* ================================================================
   Main Stop 8 component
   ================================================================ */
export default function PositionAndRoPE() {
  const [pageIndex, setPageIndex] = useState(0);

  const page = PAGES[pageIndex];
  const narration = NARRATIONS[page.id] || '';

  const goToPage = useCallback((idx) => { setPageIndex(idx); }, []);
  const prevPage = useCallback(() => { goToPage(Math.max(0, pageIndex - 1)); }, [pageIndex, goToPage]);
  const nextPage = useCallback(() => { goToPage(Math.min(PAGES.length - 1, pageIndex + 1)); }, [pageIndex, goToPage]);

  // Keyboard nav: PageDown/PageUp or [ ]
  useEffect(() => {
    function handleKey(e) {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'PageDown' || e.key === ']') { e.preventDefault(); nextPage(); }
      else if (e.key === 'PageUp' || e.key === '[') { e.preventDefault(); prevPage(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nextPage, prevPage]);

  return (
    <div>
      {/* Top-of-page narration */}
      <div
        className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed
                   px-4 py-3 bg-[var(--color-surface-muted)] rounded-lg
                   border border-[var(--color-border-light)] mb-5"
        dangerouslySetInnerHTML={{ __html: narration }}
      />

      {/* Page content */}
      <div className="min-h-[200px]">
        {page.id === 'position-blind' && <PositionBlindPage />}
        {page.id === 'sinusoidal'      && <SinusoidalPage />}
        {page.id === 'add-at-input'    && <AddAtInputFailsPage />}
        {page.id === 'rotate-idea'     && <RotateIdeaPage />}
        {page.id === 'rope-math'       && <RopeMathPage />}
        {page.id === 'frequencies'     && <FrequenciesPage />}
        {page.id === 'rope-and-cache'  && <RopeAndCachePage />}
        {page.id === 'long-context'    && <PlaceholderPage title="Stretching the Window" />}
        {page.id === 'summary'         && <PlaceholderPage title="Stop 8 at a Glance" />}
      </div>

      {/* Page nav */}
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
