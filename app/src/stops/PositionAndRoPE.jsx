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
   Placeholder pages (filled in progressively).
   Each shows the page title so we can navigate the scaffolding.
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
        {page.id === 'sinusoidal'      && <PlaceholderPage title="First Try \u2014 Add a Position Vector" />}
        {page.id === 'add-at-input'    && <PlaceholderPage title="Why Add-at-Input Fails" />}
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
