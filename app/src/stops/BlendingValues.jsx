import { useState, useCallback, useEffect } from 'react';
import { PAGES, WEIGHTED_SUM_EXAMPLE } from '../data/stop7Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Narration text for each page ---

const NARRATIONS = {
  intro:
    '<strong>Stop 7: Blending the Values \u2014 The Output.</strong> In Stop 6, we converted raw dot-product scores into attention weights \u2014 probabilities that sum to 1. Now comes the final step: using those weights to actually gather information from the Value vectors.',

  'weighted-sum':
    'The attention weights tell the model <strong>how much</strong> of each word\u2019s Value to include. The operation is a <strong>weighted sum</strong> \u2014 multiply each Value vector by its weight, then add them all together. The result is a single vector that blends information from every word in proportion to its relevance.',

  'worked-example':
    'Let\u2019s do the math. We have five Value vectors and their attention weights. We multiply each vector by its weight, then sum across all five. The result is the <strong>output vector for "faulty"</strong> \u2014 a blend of information from the entire context.',

  'context-enriched':
    'Before attention, "faulty" was a generic adjective. After attention, it carries contextual information \u2014 it now <strong>"knows"</strong> that it describes a storage controller that crashed a server. This enrichment is the whole point of the attention mechanism.',

  residual:
    'The attention output doesn\u2019t replace the original representation. Instead, it\u2019s <strong>added</strong> to it \u2014 a <strong>residual connection</strong> that preserves the original meaning while enriching it with context. This simple addition is critical for training deep models.',

  pipeline:
    'Let\u2019s put the complete attention pipeline together \u2014 all the steps from embedding to context-enriched output. Notice that <strong>steps 2 and 5 reference the KV cache</strong> \u2014 this is why Key and Value vectors must persist.',

  bridge:
    'We\u2019ve traced the complete path of a single attention computation. But this is the work of a single attention <strong>"head"</strong> \u2014 one set of W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub>. What if we ran multiple heads in parallel, each free to specialize? That\u2019s <strong>multi-head attention</strong> \u2014 Stop 8.',
};

// --- Page Content Components ---

function IntroPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The final step of attention</PanelHeader>
        <InfoBox>
          In Stop 6, we converted raw dot-product scores into attention weights &mdash;
          probabilities that sum to 1. Now comes the final step of the attention mechanism:
          using those weights to actually <strong>gather information</strong>.
        </InfoBox>
        <InfoBox>
          Each word has a <strong>Value vector</strong> &mdash; the payload of information
          it carries. We created these back in Stop 3 by multiplying each word&rsquo;s
          embedding by W<sub>V</sub>.
        </InfoBox>
        <InfoBox>
          The attention weights determine how to <strong>blend</strong> those Value vectors
          into a single output for the current word. A word that received 42% attention
          contributes 42% of its Value. A word with 8% attention contributes just 8%.
          The result is a new vector that carries mostly information from the most relevant
          words, with traces of the others.
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
          Think of it like mixing paint colors. Each word&rsquo;s Value is a color. The
          attention weight is how much of that color to add to the mix.
        </InfoBox>
        <InfoBox>
          A word with <strong>42% attention</strong> contributes 42% of its Value to the
          output. A word with <strong>8% attention</strong> contributes just 8%. The result
          is a blend that carries mostly information from the most relevant words, with
          traces of the others.
        </InfoBox>
        <InfoBox>
          Mathematically, the output is a <strong>weighted sum</strong>: multiply each Value
          vector by its attention weight, then add all the products together. Because the
          weights sum to 1 (thanks to softmax), the output is a proper weighted average of
          the Value vectors.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message='<strong>Output = w<sub>1</sub> &times; V<sub>1</sub> + w<sub>2</sub> &times; V<sub>2</sub> + &hellip; + w<sub>n</sub> &times; V<sub>n</sub></strong><br/>Each weight w<sub>i</sub> came from softmax. Each V<sub>i</sub> came from the KV cache. The result is a single vector that blends all the Values in proportion to their relevance.'
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
        <div className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-center gap-2 text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            <span className="min-w-[90px] text-right">Word</span>
            <span className="min-w-[40px] text-right">Weight</span>
            <span className="px-1 text-[var(--color-text-muted)]">&times;</span>
            <span className="flex-1 text-center">Value vector</span>
            <span className="px-1 text-[var(--color-text-muted)]">=</span>
            <span className="flex-1 text-center">Weighted</span>
          </div>

          {/* One row per entry */}
          {entries.map((entry, idx) => {
            const isTop = entry.weight >= 0.25;
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
                <span className="min-w-[40px] text-right font-mono text-[11px] text-[var(--color-text-muted)]">
                  {entry.weight.toFixed(2)}
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
              <span className="min-w-[40px]" />
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

      <Callout
        type="good"
        message='<strong>The output vector for "faulty" is now a blend:</strong> mostly "storage controller" information (42%), with supporting context from "crashed" (25%), "server" (15%), and traces of others. This is what "faulty" now knows about itself in context.'
      />
    </div>
  );
}

function ContextEnrichedPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>From generic to context-enriched</PanelHeader>
        <InfoBox>
          Before attention, <strong>&ldquo;faulty&rdquo;</strong> was just a generic
          adjective meaning &ldquo;defective.&rdquo; Its embedding carried the
          dictionary meaning of the word &mdash; nothing about what it describes in
          this particular sentence.
        </InfoBox>
        <InfoBox>
          After attention, it&rsquo;s a <strong>context-enriched representation</strong> that
          carries information from the words most relevant to it. It now
          &ldquo;knows&rdquo; that it describes a storage controller that crashed a
          server.
        </InfoBox>
        <InfoBox>
          This enrichment is the whole point of the attention mechanism &mdash;
          transforming isolated word meanings into <strong>contextual understanding</strong>.
          The word hasn&rsquo;t changed, but its representation now encodes its role
          in this specific sentence.
        </InfoBox>
      </Panel>

      <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader>Before attention</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)] space-y-2">
            <p>
              <strong className="text-[var(--color-text)]">&ldquo;faulty&rdquo;</strong>
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Generic adjective: &ldquo;defective, imperfect&rdquo;</li>
              <li>No knowledge of what it modifies</li>
              <li>Same representation in any sentence</li>
              <li>Isolated meaning only</li>
            </ul>
          </div>
        </Panel>

        <Panel>
          <PanelHeader>After attention</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)] space-y-2">
            <p>
              <strong className="text-[var(--color-text)]">&ldquo;faulty&rdquo;</strong>
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Describes a <strong>storage controller</strong> (42%)</li>
              <li>Related to <strong>crashing</strong> (25%)</li>
              <li>Connected to a <strong>server</strong> (15%)</li>
              <li>Contextual, sentence-specific meaning</li>
            </ul>
          </div>
        </Panel>
      </div>

      <Callout
        type="good"
        message="<strong>This is what attention does:</strong> it transforms a word from an isolated dictionary entry into a contextual representation that encodes its relationships to other words in the sentence."
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
          But there&rsquo;s a crucial detail: the attention output doesn&rsquo;t{' '}
          <strong>replace</strong> the original representation of &ldquo;faulty.&rdquo;
          Instead, it&rsquo;s <strong>added</strong> to it. This is called a{' '}
          <strong>residual connection</strong> (or skip connection), introduced by He
          et al. in 2015 for deep image networks (ResNet).
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
                <strong>Preservation.</strong> The original embedding carries information
                that attention might not capture &mdash; like the word&rsquo;s basic meaning
                and position. Adding ensures this isn&rsquo;t lost. The model keeps everything
                it started with and layers new context on top.
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                2
              </span>
              <div>
                <strong>Gradient flow.</strong> In a model with 80 layers, the error signal
                during training must flow backward through every layer. Without residual
                connections, this signal would decay to near-zero by the time it reached
                early layers &mdash; the <strong>vanishing gradient problem</strong>. The
                residual connection provides a &ldquo;gradient highway&rdquo; that lets the
                signal flow directly through, no matter how deep the model.
              </div>
            </div>
          </div>
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message='<strong>output = attention(x) + x</strong><br/>This simple formula — add the attention output back to the original input — is what makes deep transformers trainable. Without it, models deeper than a few layers would be nearly impossible to train effectively.'
      />
    </div>
  );
}

function PipelinePage() {
  const steps = [
    {
      num: 1,
      title: 'Compute Q',
      desc: 'Multiply the current word\u2019s embedding by W_Q to produce its Query vector.',
      cache: false,
    },
    {
      num: 2,
      title: 'Retrieve K vectors',
      desc: 'Retrieve all stored Key vectors from the KV cache.',
      cache: true,
    },
    {
      num: 3,
      title: 'Score',
      desc: 'Dot product of Q against each K, then scale by \u221Ad_head.',
      cache: false,
    },
    {
      num: 4,
      title: 'Normalize',
      desc: 'Softmax converts scores to attention weights (probabilities summing to 1).',
      cache: false,
    },
    {
      num: 5,
      title: 'Blend',
      desc: 'Weighted sum of stored Value vectors from the KV cache.',
      cache: true,
    },
    {
      num: 6,
      title: 'Add',
      desc: 'Residual connection adds the original embedding back to the attention output.',
      cache: false,
    },
    {
      num: 7,
      title: 'Output',
      desc: 'Context-enriched representation, ready for the next layer.',
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
        message="<strong>Steps 2 and 5 reference the KV cache.</strong> This is why K and V must persist &mdash; the Query is computed fresh for each word, but Keys and Values from all previous words must be available for scoring and blending. Without the cache, the model would have to recompute every K and V from scratch on every token."
      />
    </div>
  );
}

function BridgePage() {
  return (
    <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3 mt-4">
      <p>
        We&rsquo;ve now traced the complete path of a single attention computation
        &mdash; from embedding to context-enriched output. Query matches against
        Keys, softmax normalizes the scores, and the resulting weights blend the
        Value vectors into a single output that carries contextual information.
      </p>
      <p>
        But this is the work of a single attention{' '}
        <strong className="text-[var(--color-text)]">&ldquo;head,&rdquo;</strong>{' '}
        using one set of W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub>. Language has
        many simultaneous relationships: grammar, meaning, position, coreference.
        One head can only learn one pattern.
      </p>
      <p>
        What if we ran <strong className="text-[var(--color-text)]">multiple
        attention computations in parallel</strong>, each with its own weight
        matrices, each free to specialize? One head could track grammatical
        agreement. Another could follow coreference chains. A third could attend
        to positional patterns.
      </p>
      <p>
        That&rsquo;s <strong className="text-[var(--color-text)]">multi-head
        attention</strong> &mdash; Stop 8.
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
