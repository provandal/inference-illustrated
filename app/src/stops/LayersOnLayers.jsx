import { useState, useCallback, useEffect } from 'react';
import { PAGES, LAYER_COUNTS, FAULTY_EVOLUTION } from '../data/stop9Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Narration text for each page ---

const NARRATIONS = {
  intro:
    '<strong>Stop 9: The Stack &mdash; Layers on Layers.</strong> A single attention layer can gather context from nearby tokens. But real language understanding &mdash; coreference, causality, temporal reasoning &mdash; requires building meaning progressively across many layers.',

  'layer-anatomy':
    'Each transformer layer has two components: <strong>multi-head attention</strong> (communication between tokens) and a <strong>feed-forward network</strong> (independent processing per token). Both are wrapped in residual connections and RMSNorm.',

  evolution:
    'Watch how the representation of a single token &mdash; &ldquo;faulty&rdquo; &mdash; evolves as it passes through successive layers. Each layer adds richer contextual meaning.',

  ffn:
    'The <strong>feed-forward network (FFN)</strong> is the largest component in each layer &mdash; and it creates <strong>no cache</strong>. It processes each token independently using frozen weight matrices. The KV cache is purely an attention-side phenomenon.',

  'full-stack':
    'A production model repeats this layer structure dozens or hundreds of times. Each layer maintains its own KV cache, and the memory cost scales with every layer.',

  architecture:
    'The complete transformer architecture &mdash; from raw text to predicted token &mdash; and the two phases of inference: <strong>prefill</strong> (parallel, compute-bound) and <strong>decode</strong> (sequential, memory-bound).',

  bridge:
    'The KV cache makes inference possible &mdash; but it also makes inference <strong>expensive</strong>. Stop 10 puts the full picture together.',
};

// --- Page Content Components ---

function IntroPage() {
  return (
    <div>
      <Callout
        type="note"
        message='<strong>A terminology shift.</strong> Since Stop 3, we&rsquo;ve been saying &ldquo;words&rdquo; for readability, while noting that transformers actually operate on <strong>tokens</strong> &mdash; sub-word pieces. From here forward, this distinction matters: cache sizes are calculated per token, not per word. So from this point on, we&rsquo;ll use <strong>token</strong> &mdash; the precise term.'
      />

      <Panel>
        <PanelHeader>Why one layer isn&rsquo;t enough</PanelHeader>
        <InfoBox>
          In a single layer, every head works from the original embeddings. But
          language understanding requires building up meaning progressively.
          Consider our running example: <em>&ldquo;The server crashed last week
          because a faulty storage controller was replaced by a technician.&rdquo;</em>
        </InfoBox>
        <InfoBox>
          That sentence requires integrating coreference, causality, and temporal
          context &mdash; which no single attention pass can produce. A single
          layer can gather local relationships, but it can&rsquo;t build the
          layered reasoning that language demands.
        </InfoBox>
        <InfoBox>
          Layer 2 doesn&rsquo;t see raw tokens. It sees tokens{' '}
          <strong>enriched by layer 1</strong>. Layer 3 sees tokens enriched by
          layers 1 and 2. Each successive layer works with progressively richer
          representations &mdash; building meaning on top of meaning.
        </InfoBox>
      </Panel>
    </div>
  );
}

function LayerAnatomyPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Two components per layer</PanelHeader>
        <InfoBox>
          Every transformer layer contains exactly two sub-blocks, always in the
          same order. Together, they form the repeating unit that stacks to create
          the full model.
        </InfoBox>
      </Panel>

      {/* Block diagram using styled divs */}
      <div className="my-4 space-y-3">
        {/* Attention block */}
        <div className="border border-[var(--color-teal)] rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-[var(--color-teal-bg)] border-b border-[var(--color-teal)]">
            <span className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider">
              Component 1: Multi-Head Attention
            </span>
          </div>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)] space-y-2">
            <p>
              Tokens <strong>gather information from other tokens</strong>. This
              is the communication step &mdash; where each token looks at every
              other token, computes attention weights, and blends Value vectors
              into a context-enriched representation.
            </p>
            <div className="flex items-center gap-2 mt-2 text-[12px] text-[var(--color-text-muted)]">
              <span className="px-2 py-0.5 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] font-mono">
                RMSNorm &rarr; Attention &rarr; + Residual
              </span>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center text-[var(--color-text-muted)] text-lg">
          &darr;
        </div>

        {/* FFN block */}
        <div className="border border-[var(--color-primary)] rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-[var(--color-primary-bg)] border-b border-[var(--color-primary)]">
            <span className="text-[11px] font-medium text-[var(--color-primary-text)] uppercase tracking-wider">
              Component 2: Feed-Forward Network (FFN)
            </span>
          </div>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)] space-y-2">
            <p>
              Each token <strong>processes independently</strong>. This is the
              reasoning step &mdash; where each token digests the information it
              gathered during attention and transforms its own representation.
            </p>
            <div className="flex items-center gap-2 mt-2 text-[12px] text-[var(--color-text-muted)]">
              <span className="px-2 py-0.5 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] font-mono">
                RMSNorm &rarr; FFN &rarr; + Residual
              </span>
            </div>
          </div>
        </div>
      </div>

      <Callout
        type="good"
        message="<strong>The analogy:</strong> If attention is a meeting where everyone exchanges notes, the FFN is what happens when each person goes back to their desk and processes what they heard. Communication, then computation &mdash; repeated layer after layer."
      />
    </div>
  );
}

function EvolutionPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>
          How &ldquo;faulty&rdquo; evolves through 6 layers
        </PanelHeader>
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

      <Callout
        type="warn"
        message='<strong>Honesty disclosure:</strong> These layer-by-layer descriptions are interpretive approximations. Real transformer layers don&rsquo;t produce human-readable "meanings" &mdash; they produce high-dimensional vectors. We describe them in natural language to build intuition, but the actual representations are far more nuanced and distributed than any summary can capture.'
      />
    </div>
  );
}

function FfnPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The feed-forward network</PanelHeader>
        <InfoBox>
          The FFN is the <strong>largest component</strong> in each transformer
          layer. For Llama-3 70B, the FFN contains roughly{' '}
          <strong>470 million parameters per layer</strong> &mdash; about 63% of
          each layer&rsquo;s total parameters. Across 80 layers, that&rsquo;s
          roughly 37 billion parameters dedicated to feed-forward processing.
        </InfoBox>
        <InfoBox>
          Attention excels at <strong>relationships</strong> &mdash; figuring out
          which tokens are relevant to which. The FFN excels at{' '}
          <strong>factual knowledge</strong> &mdash; storing and retrieving
          learned facts, applying transformations, and refining the token&rsquo;s
          representation based on what attention gathered.
        </InfoBox>
        <InfoBox>
          Think of it this way: attention decides <em>what to look at</em>, and
          the FFN decides <em>what to do with what it saw</em>. The two
          components have complementary roles, and both are essential.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message="<strong>Critical point: the FFN creates no cache.</strong> It processes each token independently using frozen weight matrices &mdash; no per-token state needs to persist between steps. The KV cache is purely an attention-side phenomenon. This matters because when we talk about cache memory costs, we&rsquo;re talking about attention only."
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
              <span className="w-20 text-right">Layers</span>
              <span className="flex-1 text-right">KV cache per token</span>
            </div>

            {LAYER_COUNTS.map((entry) => {
              const perLayer = entry.model === 'Llama-3 8B' ? '~2 KB' : entry.model === 'Llama-3 70B' ? '~4 KB' : '~8 KB';
              const total = entry.model === 'Llama-3 8B' ? '~64 KB' : entry.model === 'Llama-3 70B' ? '~320 KB' : '~1,008 KB';
              return (
                <div
                  key={entry.model}
                  className="flex items-center gap-2 text-xs rounded-md px-2 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]"
                >
                  <span className="flex-1 font-medium text-[var(--color-text)] text-[12px]">
                    {entry.model}
                  </span>
                  <span className="w-20 text-right font-mono text-[12px] text-[var(--color-text-secondary)]">
                    {entry.layers}
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
        <PanelHeader>Each layer has its own KV cache</PanelHeader>
        <InfoBox>
          The KV cache isn&rsquo;t a single shared structure &mdash; it&rsquo;s
          replicated across every layer. Each layer&rsquo;s attention heads have
          their own Key and Value vectors, because each layer attends to different
          patterns in different representational spaces.
        </InfoBox>
        <InfoBox>
          For Llama-3 70B: each layer contributes roughly{' '}
          <strong>~4 KB per token</strong> to the cache. Across 80 layers,
          that&rsquo;s <strong>~320 KB per token</strong>. For a 4,000-token
          context, that&rsquo;s already 1.2 GB of cache memory &mdash; just for
          one request.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message="<strong>Cache cost scales with layers &times; tokens &times; heads.</strong> This is why model size, context length, and batch size all compound to create the memory pressure that defines modern inference."
      />
    </div>
  );
}

function ArchitecturePage() {
  const stages = [
    {
      title: 'Tokenizer',
      desc: 'Raw text is split into tokens (sub-word pieces) and mapped to integer IDs.',
      highlight: false,
    },
    {
      title: 'Embedding Layer',
      desc: 'Each token ID is mapped to a high-dimensional vector (e.g., 8,192 dimensions for 70B).',
      highlight: false,
    },
    {
      title: 'Transformer Layers (x80 for 70B)',
      desc: 'Each layer: RMSNorm \u2192 Multi-Head Attention (+ residual) \u2192 RMSNorm \u2192 FFN (+ residual). Keys and Values are cached per layer.',
      highlight: true,
    },
    {
      title: 'Final RMSNorm',
      desc: 'Normalizes the output of the last transformer layer.',
      highlight: false,
    },
    {
      title: 'Output Projection',
      desc: 'Projects the final representation to vocabulary size, producing a probability distribution over all possible next tokens.',
      highlight: false,
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
                <div className="min-w-0">
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
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
            <div className="text-[13px] font-medium text-[var(--color-text)] mb-1">
              Prefill
            </div>
            <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
              Processes all prompt tokens <strong>in parallel</strong>. Fills the
              KV cache for every layer. This phase is{' '}
              <strong>compute-bound</strong> &mdash; the GPU is busy with matrix
              multiplications.
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
            <div className="text-[13px] font-medium text-[var(--color-text)] mb-1">
              Decode
            </div>
            <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
              Generates one token at a time, each time reading the full KV cache.
              This phase is <strong>memory-bound</strong> &mdash; the bottleneck
              is reading cache data from GPU memory, not computation.
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function BridgePage() {
  return (
    <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3 mt-4">
      <p>
        The KV cache makes inference possible &mdash; without it, the model
        would recompute all K and V vectors for every previous token at every
        generation step. That&rsquo;s quadratic recomputation eliminated by
        linear storage.
      </p>
      <p>
        But the cache that makes inference <strong className="text-[var(--color-text)]">fast</strong>{' '}
        is also the structure that makes inference{' '}
        <strong className="text-[var(--color-text)]">expensive at scale</strong>.
        Every token, every layer, every head &mdash; the memory adds up. Serving
        thousands of concurrent users means managing gigabytes of cache per
        request, multiplied across the batch.
      </p>
      <p>
        <strong className="text-[var(--color-text)]">Stop 10</strong> puts the
        full picture together &mdash; combining everything from tokens to layers
        to cache into the complete inference cost model.
      </p>
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
