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
   PAGE 2 — The MoE Idea
   12 tokens through one MoE layer with 8 experts, top-2. Each token
   highlights its 2 experts. Click a token to focus. Show that
   different tokens in the same sequence take different paths.
   ================================================================ */
function MoeIdeaPage() {
  const [selectedTokenIdx, setSelectedTokenIdx] = useState(null);
  const { numExperts, topK, tokens, expertLabels } = MOE_LAYER_DEMO;

  // Compute utilisation per expert across the whole batch.
  const utilisation = useMemo(() => {
    const counts = new Array(numExperts).fill(0);
    tokens.forEach((t) => t.experts.forEach((e) => { counts[e]++; }));
    const maxCount = Math.max(...counts);
    return counts.map((c) => ({ count: c, maxFrac: c / maxCount }));
  }, [tokens, numExperts]);

  return (
    <div>
      <Panel>
        <PanelHeader>One MoE layer: 12 tokens, 8 experts, top-2 routing</PanelHeader>
        <InfoBox>
          Click any token to see which 2 experts it routes to. Notice that
          even within the same sequence, different tokens get different
          experts \u2014 routing is per-token, not per-sequence. The 8 experts
          here are given illustrative names; in a real model their
          specialisations emerge from training and are mostly uninterpretable.
        </InfoBox>

        <div className="px-4 pb-4">
          <MoeRoutingDiagram
            tokens={tokens}
            numExperts={numExperts}
            topK={topK}
            expertLabels={expertLabels}
            utilisation={utilisation}
            selectedTokenIdx={selectedTokenIdx}
            onSelectToken={setSelectedTokenIdx}
          />

          <div className="mt-3 text-[11px] text-[var(--color-text-secondary)] leading-relaxed italic">
            Each token activates k=2 of N=8 experts, so it touches 25% of the
            FFN parameters in this layer. Averaged over a full batch, the
            other 75% mostly sit idle on any given token, but they are still
            resident in HBM \u2014 we will return to this on Page 5.
          </div>
        </div>
      </Panel>

      <Callout
        type="info"
        message="<strong>Per-token sparsity, not per-sequence.</strong> Some early MoE work routed entire sequences to a single expert. Modern designs (Mixtral, DeepSeek, Qwen) route every token independently, so a single user prompt can use every expert at least once. This makes batching unintuitive: throughput-optimal batch sizes assume the router balances tokens across experts, and a balanced router is non-trivial to train."
      />
    </div>
  );
}

function MoeRoutingDiagram({ tokens, numExperts, topK, expertLabels, utilisation, selectedTokenIdx, onSelectToken }) {
  const W = 720;
  const expertRowY = 30;
  const expertHeight = 30;
  const tokenRowY = 220;
  const tokenHeight = 24;
  const H = 260;

  const expertSpacing = W / numExperts;
  const tokenSpacing = W / tokens.length;

  const expertCx = (i) => expertSpacing * (i + 0.5);
  const tokenCx  = (i) => tokenSpacing * (i + 0.5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]">
      {/* Expert boxes */}
      {expertLabels.map((label, i) => {
        const x = expertCx(i) - 38;
        const u = utilisation[i];
        return (
          <g key={i}>
            <rect
              x={x} y={expertRowY}
              width={76} height={expertHeight}
              rx={4}
              fill="var(--color-surface)"
              stroke="var(--color-primary)"
              strokeWidth={1.2}
              opacity={0.4 + 0.6 * u.maxFrac}
            />
            <text x={expertCx(i)} y={expertRowY + 13} fontSize={9} fontWeight={700} textAnchor="middle" fill="var(--color-primary-text)" fontFamily="monospace">
              E{i}
            </text>
            <text x={expertCx(i)} y={expertRowY + 24} fontSize={8} textAnchor="middle" fill="var(--color-text-secondary)">
              {label}
            </text>
            <text x={expertCx(i)} y={expertRowY + expertHeight + 12} fontSize={9} textAnchor="middle" fill="var(--color-text-muted)" fontFamily="monospace">
              {u.count}/{tokens.length}
            </text>
          </g>
        );
      })}

      {/* Routing lines */}
      {tokens.map((t, ti) => {
        const isSelected = selectedTokenIdx === ti;
        const isDim = selectedTokenIdx !== null && !isSelected;
        return t.experts.map((eIdx, k) => (
          <line
            key={`${ti}-${k}`}
            x1={tokenCx(ti)}
            y1={tokenRowY}
            x2={expertCx(eIdx)}
            y2={expertRowY + expertHeight}
            stroke={isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)'}
            strokeWidth={isSelected ? 2 : 1}
            opacity={isDim ? 0.08 : isSelected ? 0.9 : 0.35}
          />
        ));
      })}

      {/* Tokens */}
      {tokens.map((t, ti) => {
        const isSelected = selectedTokenIdx === ti;
        const isDim = selectedTokenIdx !== null && !isSelected;
        return (
          <g key={ti} style={{ cursor: 'pointer' }} onClick={() => onSelectToken(isSelected ? null : ti)}>
            <rect
              x={tokenCx(ti) - 26}
              y={tokenRowY}
              width={52} height={tokenHeight}
              rx={4}
              fill={isSelected ? 'var(--color-primary-bg)' : 'var(--color-surface)'}
              stroke={isSelected ? 'var(--color-primary)' : 'var(--color-border)'}
              strokeWidth={isSelected ? 2 : 1}
              opacity={isDim ? 0.45 : 1}
            />
            <text
              x={tokenCx(ti)}
              y={tokenRowY + 16}
              fontSize={10}
              textAnchor="middle"
              fill={isSelected ? 'var(--color-primary-text)' : 'var(--color-text)'}
              fontFamily="monospace"
              fontWeight={isSelected ? 700 : 400}
              opacity={isDim ? 0.6 : 1}
            >
              {t.text}
            </text>
          </g>
        );
      })}

      {/* Header */}
      <text x={10} y={16} fontSize={10} fill="var(--color-text-muted)" fontFamily="monospace">
        Experts (top, with usage count)
      </text>
      <text x={10} y={H - 6} fontSize={10} fill="var(--color-text-muted)" fontFamily="monospace">
        Tokens (bottom \u2014 click to highlight routing)
      </text>
    </svg>
  );
}

/* ================================================================
   PAGE 3 — The Router Up Close
   Walk through one routing step with concrete numbers.
   Token embedding (8-D) -> N=6 logits via router matrix -> top-2
   selection -> softmax on selected -> weights for expert blending.
   ================================================================ */
function RouterPage() {
  const { dModel, numExperts, topK, tokenEmbedding, routerWeights, expertLabels } = ROUTER_DEMO;

  // Compute all expert logits.
  const logits = useMemo(() => {
    return routerWeights.map((row) =>
      row.reduce((sum, w, i) => sum + w * tokenEmbedding[i], 0)
    );
  }, [routerWeights, tokenEmbedding]);

  // Top-k selection
  const topKIndices = useMemo(() => {
    return [...logits.keys()]
      .sort((a, b) => logits[b] - logits[a])
      .slice(0, topK);
  }, [logits, topK]);

  // Softmax over the selected top-k logits only.
  const selectedLogits = topKIndices.map((i) => logits[i]);
  const maxLogit = Math.max(...selectedLogits);
  const exps = selectedLogits.map((l) => Math.exp(l - maxLogit));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  const weights = exps.map((e) => e / sumExps);

  return (
    <div>
      <Panel>
        <PanelHeader>Router math, with concrete numbers</PanelHeader>
        <InfoBox>
          For each token, the router runs a single matmul (d_model \u00d7 N),
          picks the top-k logits, and softmax-normalises the selected scores.
          Below: one token with d_model=8, N=6 experts, k=2. Real models
          use d_model 4096+ and N=8 to 256, but the algebra is identical.
        </InfoBox>

        <div className="px-4 pb-4 space-y-4">
          {/* Step 1 — token embedding */}
          <RouterStep number={1} title="Input: token embedding (d_model)">
            <VectorRow values={tokenEmbedding} label="x" />
          </RouterStep>

          {/* Step 2 — router matrix */}
          <RouterStep number={2} title={`Router matrix W_r (N \u00d7 d_model) = (${numExperts} \u00d7 ${dModel})`}>
            <RouterMatrix matrix={routerWeights} expertLabels={expertLabels} />
            <div className="text-[11px] text-[var(--color-text-secondary)] italic mt-2">
              Each row is one expert\u2019s &ldquo;preferences&rdquo; over the d_model
              dimensions. Trained jointly with the rest of the model.
            </div>
          </RouterStep>

          {/* Step 3 — logits */}
          <RouterStep number={3} title="Logits: each expert's score for this token">
            <ExpertLogitsBar logits={logits} topKIndices={topKIndices} expertLabels={expertLabels} />
            <div className="text-[11px] text-[var(--color-text-secondary)] italic mt-2 font-mono">
              logits[e] = W_r[e] \u00b7 x
            </div>
          </RouterStep>

          {/* Step 4 — top-k */}
          <RouterStep number={4} title={`Top-${topK} selection: pick the ${topK} highest-scoring experts`}>
            <div className="flex gap-2 flex-wrap">
              {topKIndices.map((i, rank) => (
                <div key={i} className="px-3 py-2 rounded border border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-text)]">
                  <div className="text-[10px] uppercase tracking-wider font-mono">rank {rank + 1}</div>
                  <div className="text-[13px] font-bold font-mono">E{i}</div>
                  <div className="text-[10px] font-mono">logit = {logits[i].toFixed(3)}</div>
                </div>
              ))}
            </div>
          </RouterStep>

          {/* Step 5 — softmax */}
          <RouterStep number={5} title={`Softmax over the top-${topK} logits (the rest are discarded)`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {topKIndices.map((i, rank) => (
                <div key={i} className="p-3 rounded border border-[var(--color-teal)] bg-[var(--color-teal-bg)]">
                  <div className="text-[11px] font-mono text-[var(--color-teal-text)]">
                    Expert E{i} weight
                  </div>
                  <div className="text-[24px] font-bold font-mono text-[var(--color-teal-text)]">
                    {(weights[rank] * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)] mt-1">
                    exp({logits[i].toFixed(3)} \u2212 max) / sum
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-[var(--color-text-secondary)] italic mt-2 font-mono">
              output = w\u2080 \u00b7 Expert\u2080(x) + w\u2081 \u00b7 Expert\u2081(x)
            </div>
          </RouterStep>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>A note on training: the load-balancing problem</PanelHeader>
        <InfoBox>
          The router is the most fragile part of an MoE model. Without
          intervention, the router collapses to using one expert all the time
          \u2014 because that expert gets all the gradient and gets better, while
          the others starve. To prevent this, training adds an <strong>
          auxiliary load-balancing loss</strong> that encourages even token
          distribution across experts.
        </InfoBox>
        <InfoBox>
          The classic formulation (Shazeer et al., 2017): for each expert,
          compute the fraction of tokens routed to it (<em>f<sub>i</sub></em>)
          and the fraction of router probability mass it received
          (<em>P<sub>i</sub></em>); add <em>N \u00b7 \u03a3 f<sub>i</sub> P<sub>i</sub></em>
          to the training loss. When perfectly balanced (each <em>f<sub>i</sub></em> = 1/N,
          each <em>P<sub>i</sub></em> = 1/N), this term equals 1. Worse balance pushes it higher.
        </InfoBox>
        <InfoBox>
          DeepSeek-V3 (December 2024) abandoned auxiliary losses entirely in
          favour of a per-expert <em>bias</em> term updated online: undersubscribed
          experts get a positive nudge, oversubscribed ones a negative nudge.
          The router itself stays untouched, but its outputs are corrected at
          inference time. This is the current state-of-the-art for MoE load
          balancing and is one of the architectural choices that made
          DeepSeek-V3 trainable with so many experts (256).
        </InfoBox>
      </Panel>

      <Callout
        type="warning"
        message="<strong>Why we cover this depth.</strong> An infra engineer doesn\u2019t need to write training code, but should know that an MoE deployment\u2019s inference-time stability depends entirely on how well the router was trained. If the load balancing was poor, some experts will be hot and others cold, which destroys all-to-all efficiency on Page 6."
      />
    </div>
  );
}

function RouterStep({ number, title, children }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-3">
      <div className="flex items-baseline gap-2 mb-2">
        <div className="text-[10px] font-bold font-mono text-[var(--color-primary-text)] w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] flex items-center justify-center">
          {number}
        </div>
        <div className="text-[12px] font-medium text-[var(--color-text)]">{title}</div>
      </div>
      <div className="ml-8">{children}</div>
    </div>
  );
}

function VectorRow({ values, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-mono text-[var(--color-text-muted)] min-w-[20px]">{label} =</span>
      <div className="flex gap-1">
        {values.map((v, i) => (
          <div
            key={i}
            className="px-2 py-1 text-[10px] font-mono rounded border min-w-[44px] text-center"
            style={{
              background: v >= 0 ? 'var(--color-teal-bg)' : 'var(--color-red-bg)',
              borderColor: v >= 0 ? 'var(--color-teal)' : 'var(--color-red)',
              color: v >= 0 ? 'var(--color-teal-text)' : 'var(--color-red-text)',
            }}
          >
            {v.toFixed(2)}
          </div>
        ))}
      </div>
    </div>
  );
}

function RouterMatrix({ matrix, expertLabels }) {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[10px] font-mono">
        <tbody>
          {matrix.map((row, ei) => (
            <tr key={ei}>
              <td className="px-2 py-1 text-[var(--color-text-muted)] text-right">
                {expertLabels[ei]}
              </td>
              {row.map((v, i) => (
                <td
                  key={i}
                  className="px-2 py-0.5 text-center min-w-[42px]"
                  style={{
                    background: v >= 0
                      ? `color-mix(in srgb, var(--color-teal) ${Math.round(Math.abs(v) * 80)}%, transparent)`
                      : `color-mix(in srgb, var(--color-red)  ${Math.round(Math.abs(v) * 80)}%, transparent)`,
                  }}
                >
                  {v.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpertLogitsBar({ logits, topKIndices, expertLabels }) {
  const max = Math.max(...logits.map(Math.abs));
  return (
    <div className="space-y-1">
      {logits.map((l, i) => {
        const isTopK = topKIndices.includes(i);
        const pct = (Math.abs(l) / max) * 100;
        const color = isTopK ? 'var(--color-primary)' : 'var(--color-text-muted)';
        return (
          <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
            <div className="min-w-[120px] text-[var(--color-text-secondary)]">
              {expertLabels[i]}
            </div>
            <div className="flex-1 h-4 bg-[var(--color-surface)] rounded relative overflow-hidden border border-[var(--color-border-light)]">
              <div
                className="absolute top-0 bottom-0 transition-all"
                style={{
                  background: color,
                  opacity: isTopK ? 1 : 0.5,
                  width: `${pct}%`,
                  left: l >= 0 ? '50%' : `${50 - pct / 2}%`,
                  transform: l >= 0 ? 'translateX(0)' : 'translateX(0)',
                }}
              />
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[var(--color-border)]" />
            </div>
            <div className="min-w-[60px] text-right" style={{ color, fontWeight: isTopK ? 700 : 400 }}>
              {l.toFixed(3)} {isTopK && '\u2605'}
            </div>
          </div>
        );
      })}
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
        {page.id === 'moe-idea'          && <MoeIdeaPage />}
        {page.id === 'router'            && <RouterPage />}
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
