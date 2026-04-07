import { useState, useCallback, useEffect } from 'react';
import { PAGES, DOT_PRODUCT_EXAMPLES, SCALING_EXAMPLE } from '../data/stop5Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Page Content Components ---

function IntroPage() {
  return (
    <Panel>
      <PanelHeader>How does matching work?</PanelHeader>
      <InfoBox>
        In Stop 3, we learned that each word gets a Query vector ("what am I looking for?") and
        every other word has a Key vector ("what do I contain?"). But how does the model measure
        whether a particular Query matches a particular Key?
      </InfoBox>
      <InfoBox>
        The answer is one of the simplest operations in mathematics:{' '}
        <strong>the dot product</strong>.
      </InfoBox>
    </Panel>
  );
}

function WhatIsDotPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The dot product</PanelHeader>
        <InfoBox>
          The dot product takes two vectors of the same length, multiplies them element by element,
          and sums the results into a single number.
        </InfoBox>
        <InfoBox>
          That number measures how <strong>similar</strong> the two vectors are — how much they
          point in the same direction.
        </InfoBox>
      </Panel>

      <div className="my-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel>
          <PanelHeader>Large positive</PanelHeader>
          <div className="px-4 py-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            The vectors are <strong className="text-[var(--color-teal-text)]">aligned</strong> —
            they point in the same direction. This means the Query and Key are similar.
          </div>
        </Panel>
        <Panel>
          <PanelHeader>Near zero</PanelHeader>
          <div className="px-4 py-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            The vectors are <strong>unrelated</strong> — they point in perpendicular directions.
            The Query and Key have nothing in common.
          </div>
        </Panel>
        <Panel>
          <PanelHeader>Negative</PanelHeader>
          <div className="px-4 py-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            The vectors point in{' '}
            <strong className="text-[var(--color-red-text)]">opposite directions</strong>. The
            Query and Key are dissimilar.
          </div>
        </Panel>
      </div>

      <Callout
        type="note"
        message="<strong>One number from two vectors.</strong> The dot product compresses all the dimensional information into a single relevance score. That score is the foundation of the attention mechanism."
      />
    </div>
  );
}

function WorkedExamplePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Worked example: Q_faulty matched against three Keys</PanelHeader>
        <InfoBox>
          Let's compute the dot product step by step using simplified 4-dimensional vectors from
          our running example: the sentence{' '}
          <em>"The faulty storage controller crashed last week."</em>
        </InfoBox>
      </Panel>

      <div className="my-4 space-y-4">
        {DOT_PRODUCT_EXAMPLES.map((ex) => {
          const isHigh = ex.score > 1;
          const isNeg = ex.score < 0;
          const scoreColor = isHigh
            ? 'var(--color-teal-text)'
            : isNeg
              ? 'var(--color-red-text)'
              : 'var(--color-blue-text)';

          return (
            <Panel key={ex.keyLabel}>
              <PanelHeader>
                {ex.queryLabel} · {ex.keyLabel}
              </PanelHeader>
              <div className="px-4 py-3">
                {/* Vector display */}
                <div className="text-[12px] font-mono text-[var(--color-text-secondary)] mb-3 space-y-1">
                  <div>
                    <span className="text-[var(--color-text-muted)] min-w-[100px] inline-block">
                      {ex.queryLabel}
                    </span>{' '}
                    = [{ex.queryVector.join(', ')}]
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] min-w-[100px] inline-block">
                      {ex.keyLabel}
                    </span>{' '}
                    = [{ex.keyVector.join(', ')}]
                  </div>
                </div>

                {/* Step-by-step multiplication */}
                <div className="flex flex-wrap gap-2 items-center text-[12px] font-mono mb-3">
                  {ex.steps.map((step, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && (
                        <span className="text-[var(--color-text-muted)] mx-1">+</span>
                      )}
                      <span className="px-2 py-1 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
                        {step.a} × {step.b} = {step.product}
                      </span>
                    </span>
                  ))}
                </div>

                {/* Result */}
                <div className="flex items-center gap-3 text-[13px]">
                  <span className="text-[var(--color-text-muted)]">Score:</span>
                  <span
                    className="text-lg font-bold font-mono"
                    style={{ color: scoreColor }}
                  >
                    {ex.score}
                  </span>
                  <span
                    className="text-[12px] px-2 py-0.5 rounded"
                    style={{
                      color: scoreColor,
                      background: isHigh
                        ? 'var(--color-teal-bg)'
                        : isNeg
                          ? 'var(--color-red-bg)'
                          : 'var(--color-blue-bg)',
                      border: `1px solid ${isHigh ? 'var(--color-teal)' : isNeg ? 'var(--color-red)' : 'var(--color-blue)'}`,
                    }}
                  >
                    {ex.interpretation}
                  </span>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      <Callout
        type="note"
        message='<strong>These are simplified to 4 dimensions for clarity.</strong> Real models like Llama-3 use 128 dimensions per head — the same computation, just with 128 multiplications instead of 4.'
      />
    </div>
  );
}

function WhyItWorksPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Why the dot product works</PanelHeader>
        <InfoBox>
          The dot product works because the <strong>embedding space was shaped by training</strong>.
          During the billions of training examples, W<sub>Q</sub> learned to project "faulty" into a
          direction that means "looking for the thing I describe." W<sub>K</sub> learned to project
          "storage controller" into a direction that means "I am a describable hardware component."
        </InfoBox>
        <InfoBox>
          These directions <strong>align</strong> in the embedding space — and the dot product
          detects that alignment. It's not that the dot product is clever; it's that training
          arranged the vectors so the dot product would give the right answer.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Historical note</PanelHeader>
        <InfoBox>
          This idea — that <strong>meaning can be encoded as direction in a high-dimensional
          space</strong> — goes back to <strong>Word2Vec</strong> (Mikolov et al., 2013). The famous
          example: the vector for "king" minus "man" plus "woman" approximately equals the vector
          for "queen."
        </InfoBox>
        <InfoBox>
          Transformers build on this foundation. The difference is that in Word2Vec, each word gets
          one fixed vector. In a transformer, the same word gets <em>different</em> Q, K, and V
          vectors depending on the surrounding context — which is what makes attention so powerful.
        </InfoBox>
      </Panel>
    </div>
  );
}

function ScalingPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Scaling: why we divide by sqrt(d_head)</PanelHeader>
        <InfoBox>
          There's one more step before these scores become attention weights. In high-dimensional
          spaces, dot products produce <strong>large numbers</strong>. With 128 dimensions, the raw
          scores can be in the tens or hundreds.
        </InfoBox>
        <InfoBox>
          These extreme values would cause problems when we apply softmax (next stop) — most of the
          probability would collapse onto a single word. The fix: divide by the square root of the
          dimension count.
        </InfoBox>
        <InfoBox>
          For d<sub>head</sub> = {SCALING_EXAMPLE.dHead}: sqrt({SCALING_EXAMPLE.dHead}) ≈{' '}
          {SCALING_EXAMPLE.sqrtDHead}. This is the "scaled" in{' '}
          <strong>"scaled dot-product attention."</strong>
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Scaling our example scores</PanelHeader>
        <div className="px-4 py-3">
          <div className="space-y-2">
            {SCALING_EXAMPLE.raw.map((item) => {
              const isHigh = item.rawScore > 1;
              const isNeg = item.rawScore < 0;
              const scoreColor = isHigh
                ? 'var(--color-teal-text)'
                : isNeg
                  ? 'var(--color-red-text)'
                  : 'var(--color-blue-text)';

              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 text-[13px] font-mono py-2 border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <span className="min-w-[200px] text-[var(--color-text-secondary)]">
                    {item.label}
                  </span>
                  <span className="min-w-[60px] text-right" style={{ color: scoreColor }}>
                    {item.rawScore}
                  </span>
                  <span className="text-[var(--color-text-muted)]">
                    ÷ {SCALING_EXAMPLE.sqrtDHead}
                  </span>
                  <span className="text-[var(--color-text-muted)]">=</span>
                  <span className="font-bold" style={{ color: scoreColor }}>
                    {item.scaledScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>After scaling, the scores are smaller and more spread out.</strong> This keeps the softmax function from becoming too extreme — allowing the model to attend to multiple words when appropriate, rather than always concentrating on a single one."
      />
    </div>
  );
}

function BridgePage() {
  return (
    <Panel>
      <PanelHeader>What comes next</PanelHeader>
      <InfoBox>
        We now have a score for every Query-Key pair — a number measuring relevance. But scores
        aren't weights yet.
      </InfoBox>
      <InfoBox>
        The raw scores could be any positive or negative number. We need to convert them into a{' '}
        <strong>probability distribution</strong>: non-negative values that sum to 1, so they can
        blend information proportionally.
      </InfoBox>
      <InfoBox>
        That conversion uses a function called <strong>softmax</strong> — and understanding it
        explains why transformers can be so confident or so uncertain. That's Stop 6.
      </InfoBox>
    </Panel>
  );
}

// --- Narration text for each page ---

function getNarration(pageId) {
  switch (pageId) {
    case 'intro':
      return '<strong>Stop 5: The Dot Product.</strong> In Stop 3, we learned that each word gets a Query and every other word has a Key. But how does the model measure whether a Query matches a Key? The answer is the dot product — one of the simplest operations in mathematics.';
    case 'what-is-dot':
      return 'The <strong>dot product</strong> multiplies two vectors element by element and sums the results into a single number. That number measures similarity: positive means aligned, zero means unrelated, negative means opposing.';
    case 'worked-example':
      return 'Here we compute the dot product step by step. Q<sub>faulty</sub> matched against K<sub>controller</sub> gives a high score (1.26), K<sub>crashed</sub> gives a moderate score (0.83), and K<sub>last</sub> gives a negative score (-0.45). The math is simple — the power comes from the learned vectors.';
    case 'why-it-works':
      return 'The dot product isn\'t clever — the <strong>training process</strong> is. It shaped the embedding space so that related words produce vectors pointing in similar directions. The dot product simply detects that alignment.';
    case 'scaling':
      return 'In high dimensions, dot products get large. Dividing by <strong>sqrt(d_head)</strong> keeps the scores moderate, preventing softmax from collapsing all attention onto a single word. This is the "scaled" in "scaled dot-product attention."';
    case 'bridge':
      return 'We have raw scores measuring relevance. But they can be any number — positive or negative. To use them as weights, we need to convert them into a <strong>probability distribution</strong>. That conversion is called <strong>softmax</strong>, and it\'s Stop 6.';
    default:
      return '';
  }
}

// --- Main Component ---

export default function DotProduct() {
  const [pageIndex, setPageIndex] = useState(0);
  const isDark = useStore((s) => s.darkMode);

  const page = PAGES[pageIndex];
  const narration = getNarration(page.id);

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
        {page.id === 'what-is-dot' && <WhatIsDotPage />}
        {page.id === 'worked-example' && <WorkedExamplePage />}
        {page.id === 'why-it-works' && <WhyItWorksPage />}
        {page.id === 'scaling' && <ScalingPage />}
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
