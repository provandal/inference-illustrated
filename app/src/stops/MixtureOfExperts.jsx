import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PAGES,
  NARRATIONS,
  WEIGHT_BREAKDOWN,
  MOE_LAYER_DEMO,
  ROUTER_DEMO,
  SPARSE_ACTIVATION_DEFAULTS,
  moeParamCounts,
  COST_WALKTHROUGH,
  EP_DEMO,
  COLLECTIVE_COMPARISON,
  LAYER_STEP_DIFF,
  PRODUCTION_MODELS,
  RESOURCE_TRADEOFFS,
  FORWARD_LINKS,
} from '../data/stop19Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';

/* ================================================================
   PAGE 1 — Where the Weights Live
   Stacked-bar visualisation showing how FFN dominates parameter
   count, and how that domination GROWS with model size. The case
   for MoE writes itself once you see this bar.
   ================================================================ */
function WeightsLivePage() {
  const maxTotal = Math.max(...WEIGHT_BREAKDOWN.map((m) => m.totalB));

  return (
    <div>
      <Panel>
        <PanelHeader>FFN dominates parameter count \u2014 and dominates more as models scale</PanelHeader>
        <InfoBox>
          A standard transformer layer has two big blocks: <strong>attention</strong>
          {' '}and <strong>feed-forward network (FFN)</strong>. Of the two, FFN
          carries far more weights \u2014 and the imbalance grows with model size.
          By Llama-3 70B, four out of every five parameters live in FFN. The
          bar chart below is the architectural fact that motivates everything
          we cover in this stop.
        </InfoBox>

        <div className="px-4 pb-4 space-y-4">
          {WEIGHT_BREAKDOWN.map((m) => (
            <ModelWeightBar key={m.model} model={m} maxTotal={maxTotal} />
          ))}

          <div className="text-[11px] text-[var(--color-text-secondary)] italic leading-relaxed mt-2">
            Numbers computed from public Llama-3 architecture specs: d_model,
            d_ffn, n_layers, n_kv_heads, vocab size. Embeddings are tied
            (shared with the LM head), so they count once.
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>What this means for compute</PanelHeader>
        <InfoBox>
          For every token in a dense transformer, the model reads the
          <em> entire FFN block of every layer</em> from HBM and runs the math
          against it. With FFN at 80% of weights, that\u2019s 80% of the read
          traffic per token \u2014 even though the token may only need a small
          subset of what those parameters can express. <strong>The MoE bet:
          most of that compute is wasted on most tokens.</strong> If we can
          predict which slice of FFN matters for each token, we can skip the
          rest and use the saved compute on a bigger model.
        </InfoBox>
        <div className="px-4 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="text-left text-[var(--color-text-muted)]">
                  <th className="px-3 py-2 border-b border-[var(--color-border-light)]">Model</th>
                  <th className="px-3 py-2 border-b border-[var(--color-border-light)] text-right font-mono">Layers</th>
                  <th className="px-3 py-2 border-b border-[var(--color-border-light)] text-right font-mono">d_model</th>
                  <th className="px-3 py-2 border-b border-[var(--color-border-light)] text-right font-mono">d_ffn</th>
                  <th className="px-3 py-2 border-b border-[var(--color-border-light)] text-right font-mono">d_ffn / d_model</th>
                  <th className="px-3 py-2 border-b border-[var(--color-border-light)] text-right font-mono">FFN %</th>
                </tr>
              </thead>
              <tbody>
                {WEIGHT_BREAKDOWN.map((m) => (
                  <tr key={m.model}>
                    <td className="px-3 py-2 border-b border-[var(--color-border-light)] font-medium text-[var(--color-text)]">{m.model}</td>
                    <td className="px-3 py-2 border-b border-[var(--color-border-light)] font-mono text-right">{m.layers}</td>
                    <td className="px-3 py-2 border-b border-[var(--color-border-light)] font-mono text-right">{m.dModel.toLocaleString()}</td>
                    <td className="px-3 py-2 border-b border-[var(--color-border-light)] font-mono text-right">{m.dFfn.toLocaleString()}</td>
                    <td className="px-3 py-2 border-b border-[var(--color-border-light)] font-mono text-right">{(m.dFfn / m.dModel).toFixed(1)}\u00d7</td>
                    <td className="px-3 py-2 border-b border-[var(--color-border-light)] font-mono text-right font-bold text-[var(--color-primary-text)]">
                      {((m.ffnB / m.totalB) * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)] italic leading-relaxed mt-3">
            d_ffn (the FFN\u2019s hidden width) grows faster than d_model as models
            scale. By 405B, the FFN is 3.25\u00d7 wider than d_model, so its
            parameter footprint grows quadratically with the model. MoE is
            the architectural response.
          </div>
        </div>
      </Panel>

      <Callout
        type="info"
        message="<strong>The Act 3 question.</strong> Acts 1\u20132 took the dense transformer as a given and asked how to serve it. Act 3 asks what happens when we change the architecture itself. Each stop after this one swaps out a different piece \u2014 the FFN, the attention pattern, the softmax, the entire sequence model \u2014 and each swap reshapes the cache memory model differently."
      />
    </div>
  );
}

function ModelWeightBar({ model, maxTotal }) {
  const totalPct = (model.totalB / maxTotal) * 100;
  const attnFrac = model.attentionB / model.totalB;
  const ffnFrac  = model.ffnB / model.totalB;
  const embFrac  = model.embeddingB / model.totalB;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-[13px] font-medium text-[var(--color-text)] font-mono">
          {model.model} <span className="text-[var(--color-text-muted)] text-[11px] ml-1">({model.paramsLabel})</span>
        </div>
        <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
          {model.attentionB.toFixed(1)}B attn + {model.ffnB.toFixed(1)}B ffn + {model.embeddingB.toFixed(2)}B emb
        </div>
      </div>
      <div
        className="h-7 rounded border border-[var(--color-border-light)] overflow-hidden flex"
        style={{ width: `${totalPct}%`, minWidth: '40%' }}
      >
        <div
          className="flex items-center justify-center text-[10px] font-mono text-white font-bold"
          style={{ width: `${attnFrac * 100}%`, background: 'var(--color-red)' }}
          title={`Attention ${(attnFrac * 100).toFixed(0)}%`}
        >
          {attnFrac > 0.08 ? `${(attnFrac * 100).toFixed(0)}%` : ''}
        </div>
        <div
          className="flex items-center justify-center text-[10px] font-mono text-white font-bold"
          style={{ width: `${ffnFrac * 100}%`, background: 'var(--color-primary)' }}
          title={`FFN ${(ffnFrac * 100).toFixed(0)}%`}
        >
          {ffnFrac > 0.08 ? `${(ffnFrac * 100).toFixed(0)}%` : ''}
        </div>
        <div
          className="flex items-center justify-center text-[10px] font-mono text-white font-bold"
          style={{ width: `${embFrac * 100}%`, background: 'var(--color-text-muted)' }}
          title={`Embedding ${(embFrac * 100).toFixed(0)}%`}
        >
          {embFrac > 0.08 ? `${(embFrac * 100).toFixed(0)}%` : ''}
        </div>
      </div>
      {/* Legend (only render once \u2014 above bar of largest model) */}
      {model.totalB === maxTotal && (
        <div className="flex gap-3 mt-1 text-[10px] text-[var(--color-text-muted)] font-mono">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: 'var(--color-red)' }} /> attention</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: 'var(--color-primary)' }} /> FFN</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: 'var(--color-text-muted)' }} /> embedding</span>
        </div>
      )}
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
   Main Stop 19 component
   ================================================================ */
export default function MixtureOfExperts() {
  const [pageIndex, setPageIndex] = useState(0);

  const page = PAGES[pageIndex];
  const narration = NARRATIONS[page.id] || '';

  const goToPage = useCallback((idx) => { setPageIndex(idx); }, []);
  const prevPage = useCallback(() => { goToPage(Math.max(0, pageIndex - 1)); }, [pageIndex, goToPage]);
  const nextPage = useCallback(() => { goToPage(Math.min(PAGES.length - 1, pageIndex + 1)); }, [pageIndex, goToPage]);

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
      <div
        className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed
                   px-4 py-3 bg-[var(--color-surface-muted)] rounded-lg
                   border border-[var(--color-border-light)] mb-5"
        dangerouslySetInnerHTML={{ __html: narration }}
      />

      <div className="min-h-[200px]">
        {page.id === 'weights-live'      && <WeightsLivePage />}
        {page.id === 'moe-idea'          && <PlaceholderPage title="The MoE Idea" />}
        {page.id === 'router'            && <PlaceholderPage title="The Router Up Close" />}
        {page.id === 'sparse-activation' && <PlaceholderPage title="Sparse Activation" />}
        {page.id === 'inference-cost'    && <PlaceholderPage title="Inference Cost \u2014 The Catch" />}
        {page.id === 'expert-parallel'   && <PlaceholderPage title="Expert Parallelism + All-to-All" />}
        {page.id === 'kv-cache-impact'   && <PlaceholderPage title="What This Does to the KV Cache" />}
        {page.id === 'production'        && <PlaceholderPage title="In Production Today" />}
        {page.id === 'summary'           && <PlaceholderPage title="Stop 19 at a Glance" />}
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
