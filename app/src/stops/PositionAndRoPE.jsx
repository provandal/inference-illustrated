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
        {page.id === 'rotate-idea'     && <PlaceholderPage title="RoPE \u2014 Rotate, Don\u2019t Add" />}
        {page.id === 'rope-math'       && <PlaceholderPage title="The Math (Just Enough)" />}
        {page.id === 'frequencies'     && <PlaceholderPage title="Many Frequencies, Many Roles" />}
        {page.id === 'rope-and-cache'  && <PlaceholderPage title="RoPE Meets the KV Cache" />}
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
