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

      {/* Visual block diagram showing fork/rejoin structure */}
      <Panel className="my-4">
        <PanelHeader>Single transformer layer &mdash; block diagram</PanelHeader>
        <div className="p-4 flex justify-center">
          <div className="inline-flex flex-col items-center gap-0 text-[12px] font-mono">
            {/* Input */}
            <div className="px-4 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text)] font-medium text-center">
              Input <span className="text-[var(--color-text-muted)] font-normal">(d_model)</span>
            </div>
            <div className="text-[var(--color-text-muted)]">&darr;</div>

            {/* Attention sub-block with residual fork */}
            <div className="relative w-[320px] border border-[var(--color-teal)] rounded-lg bg-[var(--color-teal-bg)] p-3">
              {/* Residual bypass arrow — right side */}
              <div className="absolute -right-[60px] top-0 bottom-0 flex flex-col items-center justify-between py-1">
                <div className="text-[10px] text-[var(--color-text-muted)] writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
                  residual
                </div>
                <div className="flex-1 w-px bg-[var(--color-border)] mx-auto my-1" />
                <div className="text-[var(--color-text-muted)]">&darr;</div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="px-3 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border-light)] text-[var(--color-text-muted)] text-[11px]">
                  RMSNorm
                </div>
                <div className="text-[var(--color-text-muted)]">&darr;</div>
                <div className="px-3 py-1.5 rounded bg-[var(--color-teal)] text-white text-[11px] font-semibold">
                  Multi-Head Attention
                </div>
                <div className="text-[10px] text-[var(--color-teal-text)] mt-0.5">
                  &harr; KV Cache
                </div>
              </div>
            </div>

            {/* Add residual */}
            <div className="flex items-center gap-2 my-0.5">
              <div className="text-[var(--color-text-muted)]">&darr;</div>
            </div>
            <div className="px-3 py-1 rounded-full border border-[var(--color-amber)] bg-[var(--color-amber-bg)] text-[var(--color-amber-text)] text-[11px] font-medium">
              + add residual
            </div>
            <div className="text-[var(--color-text-muted)]">&darr;</div>

            {/* FFN sub-block with residual fork */}
            <div className="relative w-[320px] border border-[var(--color-primary)] rounded-lg bg-[var(--color-primary-bg)] p-3">
              {/* Residual bypass arrow — right side */}
              <div className="absolute -right-[60px] top-0 bottom-0 flex flex-col items-center justify-between py-1">
                <div className="text-[10px] text-[var(--color-text-muted)]" style={{ writingMode: 'vertical-rl' }}>
                  residual
                </div>
                <div className="flex-1 w-px bg-[var(--color-border)] mx-auto my-1" />
                <div className="text-[var(--color-text-muted)]">&darr;</div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="px-3 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border-light)] text-[var(--color-text-muted)] text-[11px]">
                  RMSNorm
                </div>
                <div className="text-[var(--color-text-muted)]">&darr;</div>
                <div className="px-3 py-1.5 rounded bg-[var(--color-primary)] text-white text-[11px] font-semibold">
                  FFN: W&#x2081; &rarr; SwiGLU &rarr; W&#x2082;
                </div>
                <div className="text-[10px] text-[var(--color-primary-text)] mt-0.5">
                  No cache &bull; Independent per token
                </div>
              </div>
            </div>

            {/* Add residual */}
            <div className="flex items-center gap-2 my-0.5">
              <div className="text-[var(--color-text-muted)]">&darr;</div>
            </div>
            <div className="px-3 py-1 rounded-full border border-[var(--color-amber)] bg-[var(--color-amber-bg)] text-[var(--color-amber-text)] text-[11px] font-medium">
              + add residual
            </div>
            <div className="text-[var(--color-text-muted)]">&darr;</div>

            {/* Output */}
            <div className="px-4 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text)] font-medium text-center">
              Output <span className="text-[var(--color-text-muted)] font-normal">&rarr; next layer</span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Detailed step-by-step walkthrough */}
      <Panel className="my-4">
        <PanelHeader>The same flow &mdash; step by step</PanelHeader>

        <div className="p-4 space-y-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          {/* Step 1: Input */}
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs font-medium flex items-center justify-center">1</span>
            <div>
              <strong className="text-[var(--color-text)]">Input arrives</strong> &mdash;
              a d_model-sized vector (8,192 numbers for Llama-3 70B) for each token being
              processed. On the first layer, this comes from the embedding. On deeper layers,
              it comes from the previous layer&rsquo;s output.
            </div>
          </div>

          {/* Step 2: Fork */}
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs font-medium flex items-center justify-center">2</span>
            <div>
              <strong className="text-[var(--color-text)]">The input splits into two paths.</strong> One
              copy is saved aside unchanged &mdash; this is the <strong>residual path</strong> (from
              Stop 7). The other copy continues forward to be processed.
            </div>
          </div>

          {/* Step 3: RMSNorm + Attention */}
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)] text-xs font-medium flex items-center justify-center">3</span>
            <div>
              <strong className="text-[var(--color-text)]">RMSNorm &rarr; Multi-Head Attention</strong> &mdash;
              the forward copy is first normalized by <strong>RMSNorm</strong> (which stabilizes the
              numbers across dimensions &mdash; without this, values would drift and overflow across 80
              layers). Then it enters <strong>multi-head attention</strong> (Stops 3&ndash;8): the token
              computes its Query, matches it against all cached Keys, and blends the corresponding Values.
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--color-teal)] text-white text-[11px] font-medium">
                KV Cache: K and V written in for this token, K and V read out from all earlier tokens
              </div>
            </div>
          </div>

          {/* Step 4: Add residual */}
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs font-medium flex items-center justify-center">4</span>
            <div>
              <strong className="text-[var(--color-text)]">Add residual</strong> &mdash;
              the attention output is added back to the saved copy from step 2. This
              preserves the original signal while enriching it with context from other tokens.
            </div>
          </div>

          {/* Step 5: Fork again */}
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs font-medium flex items-center justify-center">5</span>
            <div>
              <strong className="text-[var(--color-text)]">The result splits again</strong> &mdash;
              same pattern. One copy saved aside (new residual path), the other continues forward.
            </div>
          </div>

          {/* Step 6: RMSNorm + FFN */}
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">6</span>
            <div>
              <strong className="text-[var(--color-text)]">RMSNorm &rarr; FFN</strong> &mdash;
              the forward copy is normalized again, then processed by the <strong>feed-forward
              network</strong>: expansion through W&#x2081;, SwiGLU activation, compression
              through W&#x2082;. Each token is processed independently &mdash; no communication
              between tokens, no cache involved. Only frozen weight matrices. (The FFN turns
              out to be surprisingly large and important &mdash; we&rsquo;ll take a closer look
              on the next page.)
            </div>
          </div>

          {/* Step 7: Add residual + Output */}
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs font-medium flex items-center justify-center">7</span>
            <div>
              <strong className="text-[var(--color-text)]">Add residual &rarr; Output</strong> &mdash;
              the FFN output is added back to the saved copy from step 5. The result is a
              d_model-sized vector that feeds into the next layer. After all layers, this final
              vector is used to predict the next token.
            </div>
          </div>
        </div>
      </Panel>

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
        <div className="p-4 space-y-3">
          {FAULTY_EVOLUTION.map((step, idx) => {
            const isLast = idx === FAULTY_EVOLUTION.length - 1;
            return (
              <div key={step.layer}>
                <div
                  className={`rounded-lg border overflow-hidden ${
                    isLast
                      ? 'border-[var(--color-teal)]'
                      : 'border-[var(--color-border-light)]'
                  }`}
                >
                  {/* Layer header */}
                  <div className={`flex items-center gap-2 px-3 py-2 ${
                    isLast
                      ? 'bg-[var(--color-teal-bg)]'
                      : 'bg-[var(--color-surface-muted)]'
                  }`}>
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                        isLast
                          ? 'bg-[var(--color-teal)] text-white'
                          : 'bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]'
                      }`}
                    >
                      {step.layer}
                    </span>
                    <div className="text-[13px] font-medium text-[var(--color-text)]">
                      Layer {step.layer}: {step.title}
                    </div>
                  </div>
                  {/* Layer content */}
                  <div className="px-3 py-2.5 text-[12px] text-[var(--color-text-secondary)] leading-relaxed space-y-2">
                    <p>{step.summary}</p>
                    <div className="flex gap-3 text-[11px]">
                      <div className="flex-1 px-2 py-1.5 rounded bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
                        <span className="font-medium text-[var(--color-teal-text)]">Attention gathered:</span>{' '}
                        <span className="text-[var(--color-text-secondary)]">{step.attention}</span>
                      </div>
                      <div className="flex-1 px-2 py-1.5 rounded bg-[var(--color-primary-bg)] border border-[var(--color-primary)]">
                        <span className="font-medium text-[var(--color-primary-text)]">FFN processed:</span>{' '}
                        <span className="text-[var(--color-text-secondary)]">{step.ffn}</span>
                      </div>
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

      {/* FFN block diagram */}
      <Panel className="mt-4">
        <PanelHeader>Inside the FFN &mdash; block diagram</PanelHeader>
        <div className="p-4 flex justify-center">
          <div className="inline-flex flex-col items-center gap-0 text-[12px] font-mono">
            {/* Input */}
            <div className="px-4 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text)] font-medium text-center">
              Input from attention <span className="text-[var(--color-text-muted)] font-normal">(d_model = 8,192)</span>
            </div>
            <div className="text-[var(--color-text-muted)]">&darr;</div>

            {/* W1 expansion */}
            <div className="w-[340px] border border-[var(--color-primary)] rounded-lg bg-[var(--color-primary-bg)] p-3">
              <div className="flex flex-col items-center gap-1">
                <div className="px-3 py-1.5 rounded bg-[var(--color-primary)] text-white text-[11px] font-semibold">
                  W&#x2081; &mdash; Expansion matrix
                </div>
                <div className="text-[11px] text-[var(--color-primary-text)] text-center font-sans">
                  Multiplies the 8,192-dimensional input by a learned 8,192 &times; 28,672 matrix,
                  expanding it into a <strong>28,672-dimensional</strong> internal workspace &mdash;
                  3.5&times; wider. This gives the network room to represent complex patterns
                  that don&rsquo;t fit in the original d_model dimensions.
                </div>
              </div>
            </div>
            <div className="text-[var(--color-text-muted)]">&darr; <span className="text-[10px] font-sans">28,672 dimensions</span></div>

            {/* SwiGLU */}
            <div className="w-[340px] border border-[var(--color-amber)] rounded-lg bg-[var(--color-amber-bg)] p-3">
              <div className="flex flex-col items-center gap-1">
                <div className="px-3 py-1.5 rounded bg-[var(--color-amber)] text-white text-[11px] font-semibold">
                  SwiGLU activation
                </div>
                <div className="text-[11px] text-[var(--color-amber-text)] text-center font-sans">
                  A non-linear function applied element by element. This is what makes the FFN
                  more than a simple matrix multiplication &mdash; without non-linearity, stacking
                  layers would collapse into a single linear transformation. SwiGLU selectively
                  gates which dimensions pass through, allowing the network to learn complex,
                  non-linear patterns.
                </div>
              </div>
            </div>
            <div className="text-[var(--color-text-muted)]">&darr; <span className="text-[10px] font-sans">28,672 dimensions</span></div>

            {/* W2 compression */}
            <div className="w-[340px] border border-[var(--color-primary)] rounded-lg bg-[var(--color-primary-bg)] p-3">
              <div className="flex flex-col items-center gap-1">
                <div className="px-3 py-1.5 rounded bg-[var(--color-primary)] text-white text-[11px] font-semibold">
                  W&#x2082; &mdash; Compression matrix
                </div>
                <div className="text-[11px] text-[var(--color-primary-text)] text-center font-sans">
                  Multiplies the 28,672-dimensional result by a learned 28,672 &times; 8,192 matrix,
                  compressing it back to <strong>d_model = 8,192</strong>. The output must be the
                  same size as the input so it can be added back via the residual connection and
                  fed into the next layer.
                </div>
              </div>
            </div>
            <div className="text-[var(--color-text-muted)]">&darr;</div>

            {/* Output */}
            <div className="px-4 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text)] font-medium text-center">
              Output <span className="text-[var(--color-text-muted)] font-normal">(d_model = 8,192) &rarr; + residual</span>
            </div>
          </div>
        </div>
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
