import { useState, useCallback, useEffect } from 'react';
import { PAGES, LAYER_COUNTS, FAULTY_EVOLUTION } from '../data/stop9Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Narration text for each page ---

const NARRATIONS = {
  intro:
    '<strong>Stop 9: The Stack &mdash; Layers on Layers.</strong> In Stop 8, we saw multi-head attention: many parallel perspectives combining into a rich representation. But every head in that single layer worked from the original embeddings. Real language understanding &mdash; integrating coreference, causality, and temporal reasoning &mdash; requires building meaning progressively across many layers.',

  'layer-anatomy':
    'Each transformer layer contains exactly two components, always in the same order. Together they form the repeating unit that stacks to create the full model. Below is the anatomy of a single layer, with every arrow annotated.',

  evolution:
    'We&rsquo;ll track the token &ldquo;faulty&rdquo; through six layers to see how its representation evolves from a generic adjective to an integrated contextual understanding. Each layer&rsquo;s attention and FFN progressively enrich the representation.',

  ffn:
    'The FFN is the larger component in each layer &mdash; about 63% of all parameters. It stores factual knowledge in its frozen weight matrices, processes each token independently, and creates <strong>no cache</strong>.',

  'full-stack':
    'A production model repeats this two-component layer dozens or hundreds of times. Each layer maintains its own KV cache. Below, we put concrete numbers on the per-layer and per-model cache costs.',

  architecture:
    'The complete transformer architecture from raw text to predicted token, and the two phases of inference that have very different computational profiles.',

  bridge:
    'The KV cache makes inference possible. But the structure that makes inference fast is also the structure that makes inference expensive at scale. Stop 10 puts the full cost picture together.',
};

// --- Page Content Components ---

function IntroPage() {
  return (
    <div>
      <Callout
        type="note"
        message='<strong>A terminology shift.</strong> Since Stop 3, we&rsquo;ve been saying &ldquo;words&rdquo; for readability, while noting that transformers actually operate on <strong>tokens</strong> &mdash; sub-word pieces. From here forward, the distinction matters: cache sizes are calculated per token, not per word, and a single word like &ldquo;technician&rdquo; may be two tokens (&ldquo;tech&rdquo; + &ldquo;nician&rdquo;), each with its own K, V vectors in the cache. So from this point on, we&rsquo;ll use <strong>token</strong> &mdash; the precise term &mdash; whenever we&rsquo;re talking about what the transformer processes and what the KV cache stores.'
      />

      <Panel>
        <PanelHeader>Why one layer isn&rsquo;t enough</PanelHeader>
        <InfoBox>
          In a single layer, every head works from the original embeddings. But
          our running example requires integrating multiple kinds of understanding
          simultaneously:
        </InfoBox>
        <InfoBox>
          <em>&ldquo;The server crashed because a faulty storage controller was
          replaced by a technician last week.&rdquo;</em>
        </InfoBox>
        <InfoBox>
          <div className="space-y-1.5">
            <div className="flex gap-2 items-start text-[13px]">
              <span className="flex-shrink-0 font-medium text-[var(--color-text)]">Coreference:</span>
              <span>&ldquo;faulty&rdquo; describes &ldquo;controller,&rdquo; not &ldquo;server&rdquo; or &ldquo;technician&rdquo;</span>
            </div>
            <div className="flex gap-2 items-start text-[13px]">
              <span className="flex-shrink-0 font-medium text-[var(--color-text)]">Causality:</span>
              <span>&ldquo;because&rdquo; links the crash to the faulty component</span>
            </div>
            <div className="flex gap-2 items-start text-[13px]">
              <span className="flex-shrink-0 font-medium text-[var(--color-text)]">Temporal:</span>
              <span>&ldquo;last week&rdquo; places the replacement in the past, yet the fault persists</span>
            </div>
          </div>
        </InfoBox>
        <InfoBox>
          No single attention pass can produce that integration. A single layer
          can gather local relationships, but it cannot build the layered
          reasoning that language demands.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Each layer sees enriched representations</PanelHeader>
        <InfoBox>
          Layer 2 doesn&rsquo;t see raw tokens. It sees tokens{' '}
          <strong>enriched by layer 1</strong>. Layer 3 sees tokens enriched by
          layers 1 and 2. Each successive layer works with progressively richer
          representations &mdash; building meaning on top of meaning.
        </InfoBox>
        <InfoBox>
          This is why deeper models are more capable. A 32-layer model (Llama-3
          8B) gets 32 rounds of progressive refinement. An 80-layer model
          (Llama-3 70B) gets 80 rounds &mdash; enough to build deeper
          abstractions, handle more complex reasoning, and integrate more context.
        </InfoBox>
      </Panel>
    </div>
  );
}

function LayerAnatomyPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The two-part rhythm: gather, then process</PanelHeader>
        <InfoBox>
          <strong>Component 1: Multi-head attention</strong> &mdash; everything
          we&rsquo;ve built in Stops 3&ndash;8. Each token gathers information
          from other tokens at earlier positions in the sequence. After
          attention, each token&rsquo;s representation has been enriched by the
          tokens it attended to.
        </InfoBox>
        <InfoBox>
          <strong>Component 2: Feed-forward network (FFN)</strong> &mdash;
          applied to each token <strong>independently</strong> after the
          attention step. If attention is a meeting where everyone exchanges
          notes, the FFN is what happens when each person goes back to their desk
          and processes what they heard. Attention handles communication between
          tokens. The FFN handles reasoning within each token.
        </InfoBox>
        <InfoBox>
          Each component is wrapped in two architectural elements we&rsquo;ve
          already met: a <strong>residual connection</strong> (from Stop 7) that
          adds the component&rsquo;s output to its input, preserving the original
          signal, and <strong>RMSNorm</strong> (Root Mean Square Normalization)
          applied before each component to stabilize values across dimensions.
          Without normalization, numbers would drift and potentially overflow
          across 80+ layers.
        </InfoBox>
      </Panel>

      {/* Annotated block diagram */}
      <div className="my-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] overflow-hidden">
        <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
          <span className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            Single transformer layer &mdash; block diagram
          </span>
        </div>
        <div className="p-4">
          <div className="font-mono text-[12px] leading-[2] text-[var(--color-text-secondary)] space-y-0">
            {/* Input */}
            <div className="text-center text-[var(--color-text)]">
              Input <span className="text-[var(--color-text-muted)] text-[11px]">(d_model-sized vector, one per token)</span>
            </div>
            <div className="text-center text-[var(--color-text-muted)]">&darr;</div>

            {/* Attention sub-block */}
            <div className="border border-[var(--color-teal)] rounded-md p-3 my-1 bg-[var(--color-teal-bg)]">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-[12px]">
                    <span className="text-[var(--color-text-muted)]">[RMSNorm]</span>
                    {' '}&rarr;{' '}
                    <span className="font-semibold text-[var(--color-teal-text)]">[Multi-Head Attention]</span>
                    {' '}&rarr;{' '}
                    <span className="text-[var(--color-text)]">+ residual</span>
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)] not-italic font-sans">
                    Residual path bypasses attention, preserving the original input
                  </div>
                </div>
                <div className="flex-shrink-0 px-2 py-1 rounded bg-[var(--color-teal)] text-white text-[10px] font-sans font-medium">
                  KV Cache
                </div>
              </div>
              <div className="mt-1 text-[10px] text-[var(--color-text-muted)] not-italic font-sans">
                K, V written in from current token &bull; K, V read out from all earlier tokens
              </div>
            </div>

            <div className="text-center text-[var(--color-text-muted)]">
              &darr; <span className="text-[10px] font-sans">d_model-sized vector</span>
            </div>

            {/* FFN sub-block */}
            <div className="border border-[var(--color-primary)] rounded-md p-3 my-1 bg-[var(--color-primary-bg)]">
              <div className="space-y-0.5">
                <div className="text-[12px]">
                  <span className="text-[var(--color-text-muted)]">[RMSNorm]</span>
                  {' '}&rarr;{' '}
                  <span className="font-semibold text-[var(--color-primary-text)]">[FFN: W&#x2081; &rarr; SwiGLU &rarr; W&#x2082;]</span>
                  {' '}&rarr;{' '}
                  <span className="text-[var(--color-text)]">+ residual</span>
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] not-italic font-sans">
                  Residual path bypasses FFN, preserving the attention-enriched signal
                </div>
              </div>
              <div className="mt-1 text-[10px] text-[var(--color-text-muted)] not-italic font-sans">
                No cache &bull; Each token processed independently &bull; Frozen weight matrices only
              </div>
            </div>

            <div className="text-center text-[var(--color-text-muted)]">&darr;</div>

            {/* Output */}
            <div className="text-center text-[var(--color-text)]">
              Output <span className="text-[var(--color-text-muted)] text-[11px]">(d_model-sized vector &rarr; feeds into the next layer)</span>
            </div>
          </div>
        </div>

        {/* Annotation footer */}
        <div className="px-4 py-2 border-t border-[var(--color-border-light)] bg-[var(--color-surface-muted)] text-[11px] text-[var(--color-text-muted)]">
          Every arrow between blocks carries a d_model-sized vector (8,192
          numbers for Llama-3 70B), one per token being processed.
        </div>
      </div>

      <Callout
        type="good"
        message="Every transformer layer is a two-part rhythm &mdash; <strong>gather</strong> (attention), then <strong>process</strong> (FFN). This unit repeats identically for 32, 80, or 126 layers, with each layer&rsquo;s own independent weight matrices and its own KV cache."
      />
    </div>
  );
}

function EvolutionPage() {
  return (
    <div>
      <Callout
        type="warn"
        message='<strong>Honesty disclosure:</strong> The layer-by-layer descriptions below are interpretive approximations. Real transformer layers don&rsquo;t produce human-readable &ldquo;meanings&rdquo; &mdash; they produce high-dimensional vectors distributed across thousands of dimensions with no clean labels. We describe them in natural language to build intuition, but the actual representations are far more nuanced and distributed than any summary can capture. The progressive-refinement pattern, however, is well-documented: probing studies consistently show that syntactic information concentrates in early layers while semantic and reasoning capabilities emerge in deeper layers.'
      />

      <Panel>
        <PanelHeader>
          How &ldquo;faulty&rdquo; evolves through 6 layers
        </PanelHeader>
        <InfoBox>
          We&rsquo;ll track the token &ldquo;faulty&rdquo; through six layers
          (simplified from the real 80, but the principle is identical). At each
          layer, attention gathers context from other tokens, and the FFN
          processes what was gathered. Watch how the representation transforms
          from a bare dictionary entry into a richly contextual understanding.
        </InfoBox>
        <div className="p-4 space-y-2.5">
          {FAULTY_EVOLUTION.map((step, idx) => {
            const isLast = idx === FAULTY_EVOLUTION.length - 1;
            return (
              <div key={step.layer}>
                <div
                  className={`flex gap-3 items-start p-2.5 rounded-lg border ${
                    isLast
                      ? 'bg-[var(--color-teal-bg)] border-[var(--color-teal)]'
                      : 'bg-[var(--color-surface-muted)] border-[var(--color-border-light)]'
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                      isLast
                        ? 'bg-[var(--color-teal)] text-white'
                        : 'bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]'
                    }`}
                  >
                    {step.layer}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[var(--color-text)]">
                      Layer {step.layer}
                    </div>
                    <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                      {step.summary}
                    </div>
                  </div>
                </div>
                {/* Arrow between layers */}
                {!isLast && (
                  <div className="flex justify-center text-[var(--color-text-muted)] text-sm py-0.5">
                    &darr;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Why depth matters</PanelHeader>
        <InfoBox>
          Each layer builds on the previous one&rsquo;s work. Layer 1 can only
          see raw token embeddings. Layer 4 sees tokens that have already been
          enriched by three rounds of attention and FFN processing. The effective
          reach of attention increases with depth &mdash; not because the
          mechanism changes, but because the representations it operates on are
          progressively richer.
        </InfoBox>
      </Panel>
    </div>
  );
}

function FfnPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The FFN is larger than attention</PanelHeader>
        <InfoBox>
          For Llama-3 70B, the FFN&rsquo;s expansion matrix W&#x2081; is
          d_model &times; d_ff = 8,192 &times; 28,672, and the compression
          matrix W&#x2082; is d_ff &times; d_model = 28,672 &times; 8,192.
          Together, that&rsquo;s roughly{' '}
          <strong>470 million parameters per layer</strong> &mdash; compared to
          roughly 268 million for all the attention matrices (W<sub>Q</sub>,{' '}
          W<sub>K</sub>, W<sub>V</sub>, W<sub>O</sub>) combined.{' '}
          <strong>About 63% of the model&rsquo;s total parameters live in FFN
          layers.</strong>
        </InfoBox>
        <InfoBox>
          The FFN isn&rsquo;t a minor appendage to attention &mdash; it&rsquo;s
          the larger component. Across 80 layers, that&rsquo;s roughly 37 billion
          parameters dedicated to feed-forward processing.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>What the FFN contributes</PanelHeader>
        <InfoBox>
          <strong>Attention</strong> excels at: finding relationships between
          tokens, routing information across positions, building context-aware
          representations.
        </InfoBox>
        <InfoBox>
          <strong>FFN</strong> excels at: storing and retrieving factual
          knowledge, applying learned transformations, and pattern detection that
          operates on individual token representations. Research shows that when
          probing where factual knowledge lives (e.g., &ldquo;The capital of
          France is ___&rdquo;), the answer is predominantly in the FFN layers.
          Attention identifies that a question is being asked and routes relevant
          context. The FFN supplies the answer from its learned weights.
        </InfoBox>
        <InfoBox>
          <strong>The two-matrix structure:</strong> W&#x2081; expands the
          token&rsquo;s representation into a larger internal workspace (28,672
          dimensions for 70B). A non-linear activation function
          (<strong>SwiGLU</strong>) is applied. Then W&#x2082; compresses the
          result back to d_model. Like all weight matrices we&rsquo;ve seen
          &mdash; W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub>, W<sub>O</sub>
          &mdash; these are learned during training and frozen during inference.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message="<strong>Critical for the KV cache story: the FFN creates no cache.</strong> It processes each token independently using only its frozen weight matrices &mdash; W&#x2081; and W&#x2082;, the same two matrices for every token in every conversation. No per-conversation state. No per-token storage. The memory cost of the FFN is in the model weights themselves (contributing to the ~140 GB weight footprint), not in anything that grows during a conversation. The KV cache is purely an attention-side phenomenon. The FFN&rsquo;s weight matrices are loaded once and shared across all users and all conversations."
      />
    </div>
  );
}

function FullStackPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Layer counts in production models</PanelHeader>
        <div className="p-4">
          <div className="space-y-2">
            {/* Header row */}
            <div className="flex items-center gap-2 text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              <span className="flex-1">Model</span>
              <span className="w-16 text-right">Layers</span>
              <span className="w-24 text-right">Per layer</span>
              <span className="flex-1 text-right">Total per token</span>
            </div>

            {LAYER_COUNTS.map((entry) => {
              const perLayer =
                entry.model === 'Llama-3 8B'
                  ? '~2 KB'
                  : entry.model === 'Llama-3 70B'
                    ? '~4 KB'
                    : '~8 KB';
              const total =
                entry.model === 'Llama-3 8B'
                  ? '~64 KB'
                  : entry.model === 'Llama-3 70B'
                    ? '~320 KB'
                    : '~1,008 KB';
              return (
                <div
                  key={entry.model}
                  className="flex items-center gap-2 text-xs rounded-md px-2 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]"
                >
                  <span className="flex-1 font-medium text-[var(--color-text)] text-[12px]">
                    {entry.model}
                  </span>
                  <span className="w-16 text-right font-mono text-[12px] text-[var(--color-text-secondary)]">
                    {entry.layers}
                  </span>
                  <span className="w-24 text-right font-mono text-[12px] text-[var(--color-text-secondary)]">
                    {perLayer}
                  </span>
                  <span className="flex-1 text-right font-mono text-[12px] text-[var(--color-text-secondary)]">
                    {perLayer} &times; {entry.layers} = {total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Where the 320 KB comes from</PanelHeader>
        <InfoBox>
          In Stop 8, we calculated the KV cache for one layer of Llama-3 70B
          with GQA: 8 KV groups &times; 128 d_head &times; 2 (K + V) &times; 2
          bytes = 4,096 bytes &asymp; <strong>4 KB per layer</strong>.
        </InfoBox>
        <InfoBox>
          Across 80 layers: 4 KB &times; 80 = <strong>320 KB per token</strong>.
          This matches the number from Stop 8&rsquo;s table &mdash; now you can
          see exactly where it comes from. For a 4,000-token context,
          that&rsquo;s already <strong>1.2 GB</strong> of cache memory &mdash;
          just for one request.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Three dimensions of scaling</PanelHeader>
        <InfoBox>
          The KV cache scales with three dimensions simultaneously:
        </InfoBox>
        <div className="px-4 pb-4 space-y-2">
          <div className="flex gap-3 items-start p-2.5 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
            <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]">
              Tokens
            </span>
            <span className="text-[12px] text-[var(--color-text-secondary)]">
              Grows linearly as the conversation lengthens. This is the dimension
              you control by choosing shorter or longer prompts.
            </span>
          </div>
          <div className="flex gap-3 items-start p-2.5 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
            <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]">
              Heads / KV groups
            </span>
            <span className="text-[12px] text-[var(--color-text-secondary)]">
              Set by the architecture. Reduced by GQA (Stop 8) &mdash; Llama-3
              uses 8 KV groups instead of 64 independent K, V per head.
            </span>
          </div>
          <div className="flex gap-3 items-start p-2.5 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
            <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-teal)] text-white">
              Layers
            </span>
            <span className="text-[12px] text-[var(--color-text-secondary)]">
              Set by the architecture &mdash; no shortcut to reduce this. Often
              the <strong>largest multiplier</strong>. The 70B model has 2.5&times;
              the cache of the 8B model, and the difference is entirely due to
              80 vs. 32 layers &mdash; the KV groups and d_head are identical.
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ArchitecturePage() {
  const stages = [
    {
      title: 'Tokenizer',
      desc: 'Raw text is split into tokens (sub-word pieces) and mapped to integer IDs.',
      highlight: false,
      stops: 'Stop 2',
    },
    {
      title: 'Embedding Layer',
      desc: 'Each token ID is mapped to a d_model-sized vector (8,192 dimensions for 70B).',
      highlight: false,
      stops: 'Stop 3',
    },
    {
      title: 'Transformer Layers (\u00d780 for 70B)',
      desc: 'Each layer: RMSNorm \u2192 Multi-Head Attention (+ residual) \u2192 RMSNorm \u2192 FFN (+ residual). K and V cached per layer.',
      highlight: true,
      stops: 'Stops 3\u20139',
    },
    {
      title: 'Final RMSNorm',
      desc: 'Normalizes the output of the last transformer layer before projection.',
      highlight: false,
      stops: '',
    },
    {
      title: 'Output Projection + Softmax',
      desc: 'Projects the final representation to vocabulary size, producing a probability distribution over all possible next tokens.',
      highlight: false,
      stops: 'Stop 6',
    },
  ];

  return (
    <div>
      <Panel>
        <PanelHeader>Complete transformer architecture</PanelHeader>
        <div className="p-4 space-y-2">
          {stages.map((stage, idx) => (
            <div key={stage.title}>
              <div
                className={`flex gap-3 items-start p-2.5 rounded-lg border ${
                  stage.highlight
                    ? 'bg-[var(--color-teal-bg)] border-[var(--color-teal)]'
                    : 'bg-[var(--color-surface-muted)] border-[var(--color-border-light)]'
                }`}
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                    stage.highlight
                      ? 'bg-[var(--color-teal)] text-white'
                      : 'bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]'
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[var(--color-text)]">
                    {stage.title}
                    {stage.highlight && (
                      <span className="ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded bg-[var(--color-teal)] text-white">
                        KV cache
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                    {stage.desc}
                  </div>
                </div>
              </div>
              {idx < stages.length - 1 && (
                <div className="flex justify-center text-[var(--color-text-muted)] text-sm py-0.5">
                  &darr;
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Two phases of inference</PanelHeader>
        <div className="p-4 space-y-3">
          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
            <div className="text-[13px] font-medium text-[var(--color-text)] mb-1.5">
              Phase 1: Prefill (processing the prompt)
            </div>
            <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed space-y-1.5">
              <p>
                When you send a message to a model like Claude or Llama, the
                entire prompt &mdash; system instructions, conversation history,
                and your new message &mdash; is processed through all layers{' '}
                <strong>in parallel</strong>. This is where GPUs shine: thousands
                of tokens processed at once through massive parallel matrix
                multiplications.
              </p>
              <p>
                During prefill, the KV cache for every prompt token, at every
                layer, is computed and stored. If the prompt is 2,000 tokens and
                the model has 80 layers, that&rsquo;s 2,000 &times; 80 = 160,000
                sets of K, V vectors computed and cached in one burst.
              </p>
              <p>
                This phase is <strong>compute-bound</strong> &mdash; the
                bottleneck is the sheer volume of matrix multiplications.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
            <div className="text-[13px] font-medium text-[var(--color-text)] mb-1.5">
              Phase 2: Decode (generating the response)
            </div>
            <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed space-y-1.5">
              <p>
                Now the model produces new tokens one at a time. Each new token
                passes through the full stack of layers. At each layer,
                multi-head attention computes Q for the new token and compares it
                against <strong>all cached K vectors</strong> from earlier
                tokens &mdash; finding what to attend to. It blends the
                corresponding cached V vectors into the output. Then the FFN
                processes the result. After the final layer, the model predicts
                the next token.
              </p>
              <p>
                Each decode step adds one new set of K, V entries to the cache at
                every layer. To generate 100 tokens of response, the full stack
                runs 100 times &mdash; and after those 100 steps, the cache has
                grown by 100 tokens&rsquo; worth of K, V at every layer.
              </p>
              <p>
                This phase is <strong>memory-bound</strong> &mdash; each step
                processes only one new token, but must read the entire KV cache
                at every layer.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>These two phases have very different computational profiles.</strong> Prefill is compute-bound &mdash; lots of matrix multiplications processing thousands of tokens in parallel. Decode is memory-bound &mdash; each step processes only one new token, but must read the entire KV cache at every layer. This distinction has major infrastructure implications that we&rsquo;ll explore in Stop 10 and Act 2."
      />
    </div>
  );
}

function BridgePage() {
  return (
    <div className="space-y-4 mt-4">
      <Panel>
        <PanelHeader>The complete picture so far</PanelHeader>
        <InfoBox>
          We&rsquo;ve now seen the complete transformer from input to output:
          <strong> Embeddings</strong> turn tokens into vectors (Stops 1, 3).{' '}
          <strong>Q, K, V</strong> enable matching and information retrieval
          (Stops 3, 5, 6, 7). <strong>Multi-head attention</strong> provides
          parallel perspectives (Stop 8). <strong>FFN</strong> adds non-linear
          processing and factual knowledge (this stop).{' '}
          <strong>Layers</strong> stack for progressive refinement (this stop).{' '}
          <strong>Residual connections</strong> preserve information across depth
          (Stop 7).
        </InfoBox>
      </Panel>

      <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3">
        <p>
          The KV cache makes inference possible &mdash; without it, the model
          would recompute all K and V vectors for every previous token at every
          generation step. That&rsquo;s quadratic recomputation eliminated by
          linear storage.
        </p>
        <p>
          But the cache that makes inference{' '}
          <strong className="text-[var(--color-text)]">fast</strong> is also the
          structure that makes inference{' '}
          <strong className="text-[var(--color-text)]">expensive at scale</strong>.
          Every token, every layer, every head group &mdash; the memory adds up.
          Serving thousands of concurrent users means managing gigabytes of cache
          per request, multiplied across the batch.
        </p>
        <p>
          We&rsquo;ve just seen that inference has two phases &mdash; prefill and
          decode &mdash; with different computational profiles.{' '}
          <strong className="text-[var(--color-text)]">Stop 10</strong> explores
          what this means for infrastructure: why some systems separate the two
          phases onto different hardware, how the KV cache must be transferred
          between them, and what happens when the cache outgrows the
          GPU&rsquo;s memory.
        </p>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function LayersOnLayers() {
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
        {page.id === 'intro' && <IntroPage />}
        {page.id === 'layer-anatomy' && <LayerAnatomyPage />}
        {page.id === 'evolution' && <EvolutionPage />}
        {page.id === 'ffn' && <FfnPage />}
        {page.id === 'full-stack' && <FullStackPage />}
        {page.id === 'architecture' && <ArchitecturePage />}
        {page.id === 'bridge' && <BridgePage />}
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
