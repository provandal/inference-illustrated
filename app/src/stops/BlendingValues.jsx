import { useState, useCallback, useEffect } from 'react';
import { PAGES, WEIGHTED_SUM_EXAMPLE } from '../data/stop7Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Narration text for each page ---

const NARRATIONS = {
  intro:
    '<strong>Stop 7: Blending the Values \u2014 The Output.</strong> We now know which words "faulty" should listen to, and how much \u2014 controller at 37.9%, crashed at 24.7%, and so on. But knowing who to listen to isn\u2019t enough. The model needs to actually <strong>gather the information</strong>. This is where it does that.',

  'weighted-sum':
    'Each word carries a <strong>Value vector</strong> \u2014 the payload of information created by W<sub>V</sub> back in Stop 3. The attention weights determine how to <strong>blend</strong> those payloads into a single output. The operation is a <strong>weighted sum</strong>: multiply each Value by its weight, then add.',

  'worked-example':
    'Let\u2019s do the math with real numbers. Five Value vectors, five attention weights from Stop 6. Multiply each vector by its weight, then sum across all five. The result is the <strong>output vector for "faulty"</strong> \u2014 a blend of information from the entire context.',

  'context-enriched':
    'The weighted sum has transformed "faulty" from a generic adjective into a <strong>context-specific representation</strong>. The word hasn\u2019t changed \u2014 its representation has been enriched with information gathered from the words it attended to.',

  residual:
    'The attention output doesn\u2019t <strong>replace</strong> the original representation. Instead, it\u2019s <strong>added</strong> to it \u2014 a design choice called a <strong>residual connection</strong> that is essential for training deep models. Without it, transformers with 80+ layers would be nearly impossible to train.',

  pipeline:
    'Let\u2019s put the complete attention pipeline together \u2014 all the steps from embedding to context-enriched output in one view. Two of these steps depend on stored vectors from earlier tokens \u2014 that storage is the <strong>KV cache</strong>.',

  bridge:
    'We\u2019ve traced the complete path of a single attention computation \u2014 from embedding through Q/K matching, softmax normalization, and Value blending to the final context-enriched output. But this is the work of a single attention <strong>"head."</strong> What happens when we run many heads in parallel?',
};

// --- Page Content Components ---

function IntroPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Gathering information from the context</PanelHeader>
        <InfoBox>
          In Stop 6, softmax converted raw dot-product scores into attention
          weights &mdash; probabilities that sum to 1. Those weights answer the
          question <strong>&ldquo;how much should &lsquo;faulty&rsquo; listen to each
          word?&rdquo;</strong> But the weights themselves are just proportions. They
          don&rsquo;t contain information &mdash; they specify how much information to
          collect.
        </InfoBox>
        <InfoBox>
          The information lives in the <strong>Value vectors</strong>. Back in Stop 3,
          each word&rsquo;s embedding was multiplied by W<sub>V</sub> to produce a Value
          vector &mdash; a transformed representation that carries the word&rsquo;s
          informational payload. V<sub>controller</sub> carries information
          like &ldquo;I am a hardware component, specifically a storage device
          controller.&rdquo; V<sub>crashed</sub> carries &ldquo;I represent a system
          failure event.&rdquo; These Value vectors have been sitting in the{' '}
          <strong>KV cache</strong> (the stored Key and Value vectors from Stop 3),
          waiting to be read.
        </InfoBox>
        <InfoBox>
          This stop is where the model actually collects that information. The
          attention weights determine the proportions; the Value vectors supply the
          content. The result is a single output vector that blends information from
          every word &mdash; dominated by the words &ldquo;faulty&rdquo; attended to
          most strongly.
        </InfoBox>
      </Panel>
    </div>
  );
}

function WeightedSumPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The weighted sum</PanelHeader>
        <InfoBox>
          Think of it like mixing paint. Each word&rsquo;s Value vector is a different
          color of paint. The attention weight is how much of that color you pour into
          the mix. &ldquo;Controller&rdquo; at 37.9% dominates the blend &mdash; the
          final color is mostly controller. &ldquo;Crashed&rdquo; at 24.7% is the
          second strongest contributor. &ldquo;Last&rdquo; at 6.9% adds just a trace.
          The resulting color is a unique blend determined entirely by the attention
          pattern.
        </InfoBox>
        <InfoBox>
          Grounding this in our example: V<sub>controller</sub> carries information
          like &ldquo;I am a hardware component, specifically a storage device
          controller.&rdquo; V<sub>crashed</sub> carries &ldquo;I represent a system
          failure event.&rdquo; Blending 37.9% of V<sub>controller</sub> with 24.7%
          of V<sub>crashed</sub> means the output for &ldquo;faulty&rdquo; will be
          dominated by hardware-component information, with a strong supporting signal
          of system failure. V<sub>server</sub> at 18.1% adds infrastructure context.
          The minor contributions from &ldquo;was&rdquo; (12.5%) and &ldquo;last&rdquo;
          (6.9%) are traces &mdash; present but not dominant.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message='<strong>Output = w<sub>1</sub> &times; V<sub>1</sub> + w<sub>2</sub> &times; V<sub>2</sub> + &hellip; + w<sub>n</sub> &times; V<sub>n</sub></strong><br/>Each weight w<sub>i</sub> came from softmax in Stop 6. Each V<sub>i</sub> was created by W<sub>V</sub> in Stop 3 and stored in the KV cache. Because the weights sum to 1, the output is a proper weighted average &mdash; a single vector that blends all the Values in proportion to their relevance.'
      />
    </div>
  );
}

function WorkedExamplePage() {
  const { entries, output } = WEIGHTED_SUM_EXAMPLE;

  return (
    <div>
      <Panel>
        <PanelHeader>Worked example: output for &ldquo;faulty&rdquo;</PanelHeader>
        <InfoBox>
          Each row below shows one word&rsquo;s contribution. The weight (from
          Stop 6&rsquo;s softmax) multiplies every number in that word&rsquo;s
          Value vector. For example, &ldquo;controller&rdquo; has weight 37.9%,
          so each number in V<sub>controller</sub> is multiplied by 0.379. The
          bottom row sums all five weighted vectors into a single output &mdash;
          the blended representation of &ldquo;faulty&rdquo; after attention.
        </InfoBox>
        <div className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-center gap-2 text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            <span className="min-w-[90px] text-right">Word</span>
            <span className="min-w-[44px] text-right">Weight</span>
            <span className="px-1 text-[var(--color-text-muted)]">&times;</span>
            <span className="flex-1 text-center">Value vector</span>
            <span className="px-1 text-[var(--color-text-muted)]">=</span>
            <span className="flex-1 text-center">Weighted</span>
          </div>

          {/* One row per entry */}
          {entries.map((entry) => {
            const isTop = entry.weight >= 0.20;
            return (
              <div
                key={entry.label}
                className={`flex items-center gap-2 text-xs rounded-md px-2 py-1.5 ${
                  isTop
                    ? 'bg-[var(--color-teal-bg)] border border-[var(--color-teal)]'
                    : 'bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]'
                }`}
              >
                <span
                  className={`min-w-[90px] text-right font-mono text-[11px] ${
                    isTop ? 'font-medium text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  V<sub>{entry.label}</sub>
                </span>
                <span className="min-w-[44px] text-right font-mono text-[11px] text-[var(--color-text-muted)]">
                  {(entry.weight * 100).toFixed(1)}%
                </span>
                <span className="px-1 text-[var(--color-text-muted)]">&times;</span>
                <span className="flex-1 font-mono text-[11px] text-center text-[var(--color-text-secondary)]">
                  [{entry.vector.map((v) => v.toFixed(1)).join(', ')}]
                </span>
                <span className="px-1 text-[var(--color-text-muted)]">=</span>
                <span className="flex-1 font-mono text-[11px] text-center text-[var(--color-text-secondary)]">
                  [{entry.weighted.map((v) => v.toFixed(4)).join(', ')}]
                </span>
              </div>
            );
          })}

          {/* Divider */}
          <div className="border-t border-[var(--color-border)] pt-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="min-w-[90px] text-right font-medium text-[var(--color-text)] text-[11px]">
                Sum
              </span>
              <span className="min-w-[44px]" />
              <span className="px-1" />
              <span className="flex-1" />
              <span className="px-1 text-[var(--color-text-muted)]">=</span>
              <span className="flex-1 font-mono text-[12px] text-center font-medium text-[var(--color-primary-text)]">
                [{output.map((v) => v.toFixed(4)).join(', ')}]
              </span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Interpreting the output</PanelHeader>
        <InfoBox>
          The output vector doesn&rsquo;t have clean labels &mdash; these four numbers
          are <strong>distributed representations</strong>, meaning information is
          spread across all dimensions rather than neatly packed into one slot per
          concept. But the model has learned to encode meaning into these patterns
          during training: the blend carries mostly &ldquo;controller&rdquo;
          information because that&rsquo;s what &ldquo;faulty&rdquo; attends to most
          strongly (37.9%), with significant &ldquo;crashed&rdquo; and
          &ldquo;server&rdquo; contributions shaping the context around system failure
          and infrastructure.
        </InfoBox>
        <InfoBox>
          In a real model, these vectors have 128 dimensions per head, not 4 &mdash;
          far more room to encode nuanced meaning. But the principle is identical:
          multiply, sum, blend. The math scales, the interpretation does not change.
        </InfoBox>
      </Panel>
    </div>
  );
}

function ContextEnrichedPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>From generic to context-enriched</PanelHeader>
        <InfoBox>
          The weighted sum has done something remarkable. Before attention,
          &ldquo;faulty&rdquo; was represented solely by its embedding &mdash; the
          same vector it would have in any sentence. &ldquo;The faulty wiring,&rdquo;
          &ldquo;a faulty assumption,&rdquo; &ldquo;the faulty controller&rdquo; &mdash;
          all identical. After attention, its representation has been enriched with
          information gathered from the specific words it attended to in{' '}
          <em>this</em> sentence.
        </InfoBox>
      </Panel>

      <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader>Before attention</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)] space-y-2">
            <p>
              <strong className="text-[var(--color-text)]">&ldquo;faulty&rdquo;</strong>{' '}
              knows:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>I am an adjective meaning defective or broken</li>
              <li>I typically modify nouns</li>
              <li>I carry negative connotation</li>
            </ul>
            <p className="text-[var(--color-text-muted)] text-[12px] italic mt-3">
              No knowledge of what it describes in this sentence. Same
              representation in every context.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader>After attention</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)] space-y-2">
            <p>
              <strong className="text-[var(--color-text)]">&ldquo;faulty&rdquo;</strong>{' '}
              now knows:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>I describe a <strong>storage controller</strong> (37.9%)</li>
              <li>I&rsquo;m related to a <strong>crash event</strong> (24.7%)</li>
              <li>I&rsquo;m connected to a <strong>server</strong> (18.1%)</li>
              <li>I sit in a copular construction with <strong>&ldquo;was&rdquo;</strong> (12.5%)</li>
              <li>There&rsquo;s a temporal reference &mdash; <strong>&ldquo;last&rdquo;</strong> week (6.9%)</li>
            </ul>
            <p className="text-[var(--color-text-muted)] text-[12px] italic mt-3">
              Unique to this sentence. &ldquo;The faulty wiring&rdquo; would produce
              entirely different attention weights and a different output.
            </p>
          </div>
        </Panel>
      </div>

      <Callout
        type="good"
        message='<strong>This is what attention does:</strong> it transforms a word from an isolated dictionary entry into a representation that encodes its role in this specific sentence. The word hasn&rsquo;t changed &mdash; its representation has been enriched with context. This is why the same word means different things in different sentences: the attention pattern changes, so the weighted sum changes, so the output changes.'
      />
    </div>
  );
}

function ResidualPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Residual connection (skip connection)</PanelHeader>
        <InfoBox>
          There&rsquo;s a crucial architectural detail: the attention output
          doesn&rsquo;t <strong>replace</strong> the original representation of
          &ldquo;faulty.&rdquo; Instead, it&rsquo;s <strong>added</strong> to it.
          This is called a <strong>residual connection</strong> (or skip connection),
          introduced by Kaiming He et al. in 2015 for deep image networks
          (<strong>ResNet</strong>). The idea: let the original signal pass through
          untouched, and add new information on top &mdash; like writing annotations
          in the margin without erasing the original text.
        </InfoBox>
      </Panel>

      <Panel className="my-4">
        <PanelHeader>Why add instead of replace?</PanelHeader>
        <InfoBox>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                1
              </span>
              <div>
                <strong>Preservation.</strong> If the attention mechanism produces a
                poor result, the original information survives. The embedding carries
                information that attention might not capture &mdash; the word&rsquo;s
                basic meaning, its position, its part of speech. Adding ensures none
                of this is lost. With replacement, bad attention could destroy useful
                information. With addition, the worst case is noise on top of signal.
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                2
              </span>
              <div>
                <strong>Gradient flow.</strong> In a model with 80 layers, the error
                signal during training must flow backward through every layer &mdash;
                the same <strong>backpropagation</strong> process we saw in Stop 4.
                Without residual connections, this signal would decay at each layer,
                suffering the same kind of exponential loss we watched in the RNN&rsquo;s
                hidden state in Stop 1 &mdash; the{' '}
                <strong>vanishing gradient problem</strong>. The residual connection
                provides a &ldquo;gradient highway&rdquo; &mdash; a direct path that
                lets the training signal flow through undiminished, no matter how deep
                the model. Without this highway, transformers couldn&rsquo;t be trained
                at the depths that make them powerful.
              </div>
            </div>
          </div>
        </InfoBox>
      </Panel>

      <Panel className="my-4">
        <PanelHeader>What this means concretely</PanelHeader>
        <InfoBox>
          After 80 layers of processing, the representation of &ldquo;faulty&rdquo;
          has been transformed many times &mdash; each layer&rsquo;s attention
          mechanism gathering different contextual information, each layer&rsquo;s
          feed-forward network (the other half of each transformer block, mentioned
          in Stop 4) digesting what was gathered. But because of residual
          connections, the original embedding is still partially present in the final
          representation. Every layer <em>adds</em> to what came before rather than
          overwriting it.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message='<strong>output = attention(x) + x</strong><br/>This simple formula &mdash; add the attention output back to the original input &mdash; is what makes deep transformers trainable. It solves the same vanishing-signal problem that crippled the RNN in Stop 1, but at the level of training gradients rather than hidden state information.'
      />
    </div>
  );
}

function PipelinePage() {
  const steps = [
    {
      num: 1,
      title: 'Compute Q',
      desc: 'Multiply the current word\u2019s embedding by W\u1D60 to produce its Query vector \u2014 "what am I looking for?"',
      cache: false,
    },
    {
      num: 2,
      title: 'Retrieve K vectors',
      desc: 'Retrieve all stored Key vectors from the KV cache \u2014 one K per previous word, created by W\u1D4A in Stop 3.',
      cache: true,
    },
    {
      num: 3,
      title: 'Score',
      desc: 'Dot product of Q against each K (Stop 5), then scale by \u221Ad\u2095\u2091\u2090\u2094 to prevent extreme values.',
      cache: false,
    },
    {
      num: 4,
      title: 'Normalize',
      desc: 'Softmax (Stop 6) converts scores to attention weights \u2014 probabilities summing to 1.',
      cache: false,
    },
    {
      num: 5,
      title: 'Blend Values',
      desc: 'Weighted sum of stored Value vectors from the KV cache \u2014 the step we just completed.',
      cache: true,
    },
    {
      num: 6,
      title: 'Residual add',
      desc: 'Add the original embedding back to the attention output, preserving base meaning.',
      cache: false,
    },
    {
      num: 7,
      title: 'Output',
      desc: 'Context-enriched representation, ready for the feed-forward network and the next layer.',
      cache: false,
    },
  ];

  return (
    <div>
      <Panel>
        <PanelHeader>The complete attention pipeline for &ldquo;faulty&rdquo;</PanelHeader>
        <div className="p-4 space-y-2.5">
          {steps.map((step) => (
            <div
              key={step.num}
              className={`flex gap-3 items-start p-2.5 rounded-lg border ${
                step.cache
                  ? 'bg-[var(--color-teal-bg)] border-[var(--color-teal)]'
                  : 'bg-[var(--color-surface-muted)] border-[var(--color-border-light)]'
              }`}
            >
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                  step.cache
                    ? 'bg-[var(--color-teal)] text-white'
                    : 'bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]'
                }`}
              >
                {step.num}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[var(--color-text)]">
                  {step.title}
                  {step.cache && (
                    <span className="ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded bg-[var(--color-teal)] text-white">
                      KV cache
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>Steps 2 and 5 are why the KV cache exists.</strong> The Query is computed fresh for each word, but Keys and Values from all previous words must be available for scoring and blending. Without caching K and V, the model would recompute them for every previous word at every new token &mdash; an enormous waste. For a 128K-token context, that means recomputing 127,999 Key and Value vectors at every single generation step. The cache trades memory for compute: store the vectors once, read them many times."
      />
    </div>
  );
}

function BridgePage() {
  return (
    <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3 mt-4">
      <p>
        We&rsquo;ve traced the full path: embedding &rarr; Q/K/V creation (Stop 3)
        &rarr; dot-product scoring (Stop 5) &rarr; softmax normalization (Stop 6)
        &rarr; weighted sum of Values &rarr; residual addition &rarr;
        context-enriched output. Every step served a specific purpose, and together
        they form one complete attention computation.
      </p>
      <p>
        But consider: the single head we&rsquo;ve been tracking learned one
        pattern &mdash; connecting &ldquo;faulty&rdquo; to &ldquo;controller&rdquo;
        via coreference. What about the other relationships in our sentence?
        &ldquo;Crashed&rdquo; needs to find its subject &ldquo;server.&rdquo;
        &ldquo;Last&rdquo; needs to modify &ldquo;week.&rdquo; &ldquo;Was&rdquo;
        needs to connect back to &ldquo;controller&rdquo; as the subject of its
        clause. One set of W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub> can only
        learn one type of pattern.
      </p>
      <p>
        What if we ran{' '}
        <strong className="text-[var(--color-text)]">
          multiple attention computations in parallel
        </strong>
        , each with its own weight matrices, each free to specialize? One head
        could track grammatical agreement. Another could follow coreference chains.
        A third could attend to positional patterns. Each head would produce its
        own K and V vectors &mdash; which means each head needs its own entries in
        the KV cache.
      </p>
      <p>
        That&rsquo;s{' '}
        <strong className="text-[var(--color-text)]">multi-head attention</strong>
        {' '}&mdash; and it&rsquo;s the subject of Stop 8.
      </p>
    </div>
  );
}

// --- Main Component ---

export default function BlendingValues() {
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
        {page.id === 'weighted-sum' && <WeightedSumPage />}
        {page.id === 'worked-example' && <WorkedExamplePage />}
        {page.id === 'context-enriched' && <ContextEnrichedPage />}
        {page.id === 'residual' && <ResidualPage />}
        {page.id === 'pipeline' && <PipelinePage />}
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
