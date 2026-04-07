import { useState, useCallback, useEffect } from 'react';
import { PAGES, DOT_PRODUCT_EXAMPLES, SCALING_EXAMPLE } from '../data/stop5Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Page Content Components ---

function IntroPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Scoring every word in the cache</PanelHeader>
        <InfoBox>
          In Stop 3, we saw the attention pipeline: compute a Query for the current word,
          compare it against every Key in the cache, then blend the Values. We are now at
          step 2 — the comparison.
        </InfoBox>
        <InfoBox>
          When <strong>"faulty"</strong> computes its Query and the model needs to score every
          Key in the cache, it performs the simplest operation imaginable: multiply the vectors
          element by element and add up the results. That operation is called
          the <strong>dot product</strong>, and its output is a single number — a relevance score.
        </InfoBox>
        <InfoBox>
          Let's see how this works with real numbers from our sentence:{' '}
          <em>"The faulty storage controller crashed last week."</em>
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Where we are in the pipeline</PanelHeader>
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-mono">
            <span className="px-2.5 py-1 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-[var(--color-text-muted)]">
              1. Compute Q
            </span>
            <span className="text-[var(--color-text-muted)]">&rarr;</span>
            <span className="px-2.5 py-1 rounded bg-[var(--color-primary-bg)] border-[1.5px] border-[var(--color-primary)] text-[var(--color-primary-text)] font-medium">
              2. Q &middot; K dot product
            </span>
            <span className="text-[var(--color-text-muted)]">&rarr;</span>
            <span className="px-2.5 py-1 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-[var(--color-text-muted)]">
              3. Scale &divide; &radic;d
            </span>
            <span className="text-[var(--color-text-muted)]">&rarr;</span>
            <span className="px-2.5 py-1 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-[var(--color-text-muted)]">
              4. Softmax
            </span>
            <span className="text-[var(--color-text-muted)]">&rarr;</span>
            <span className="px-2.5 py-1 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-[var(--color-text-muted)]">
              5. Blend Values
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function WhatIsDotPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>What the dot product computes</PanelHeader>
        <InfoBox>
          The dot product takes two vectors of the same length, multiplies them element by element,
          and sums the results into a single number. Two steps, nothing more.
        </InfoBox>
        <InfoBox>
          Think of Q and K as <strong>arrows in a high-dimensional space</strong>. The dot product
          asks: how much do these arrows point in the same direction? When they align, the products
          are consistently positive, and the sum is large. When they oppose, the products are
          consistently negative. When they are unrelated, positive and negative products cancel
          out toward zero.
        </InfoBox>
      </Panel>

      <div className="my-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel>
          <PanelHeader>Same direction</PanelHeader>
          <div className="px-4 py-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            Both vectors positive in the same positions, both negative in the same positions.
            Every product is positive. The sum is <strong className="text-[var(--color-teal-text)]">large and positive</strong>.
            <div className="mt-2 text-[12px] font-mono text-[var(--color-text-muted)]">
              (+)(+) = + &nbsp; (&#x2212;)(&#x2212;) = + &nbsp; &rarr; high score
            </div>
          </div>
        </Panel>
        <Panel>
          <PanelHeader>Perpendicular</PanelHeader>
          <div className="px-4 py-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            No pattern — some products positive, some negative, roughly balanced.
            They cancel out. The sum is <strong>near zero</strong>.
            <div className="mt-2 text-[12px] font-mono text-[var(--color-text-muted)]">
              (+)(+) and (+)(&#x2212;) cancel &rarr; &asymp; 0
            </div>
          </div>
        </Panel>
        <Panel>
          <PanelHeader>Opposite direction</PanelHeader>
          <div className="px-4 py-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            Q is positive where K is negative and vice versa. Every product
            is negative. The sum is <strong className="text-[var(--color-red-text)]">large and negative</strong>.
            <div className="mt-2 text-[12px] font-mono text-[var(--color-text-muted)]">
              (+)(&#x2212;) = &#x2212; &nbsp; (&#x2212;)(+) = &#x2212; &nbsp; &rarr; low score
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader>Grounding it in our sentence</PanelHeader>
        <InfoBox>
          <strong>Q<sub>faulty</sub></strong> points in a direction meaning{' '}
          <em>"looking for the hardware component I describe."</em>{' '}
          <strong>K<sub>controller</sub></strong> points in a direction meaning{' '}
          <em>"I am a describable hardware component."</em>{' '}
          These directions <strong>align</strong> — the dot product will be high.
        </InfoBox>
        <InfoBox>
          <strong>K<sub>last</sub></strong> points in a direction meaning{' '}
          <em>"I carry temporal information."</em>{' '}
          That direction is unrelated to — even opposing — what "faulty" is looking for.
          The dot product will be low or negative.
        </InfoBox>
      </Panel>
    </div>
  );
}

function WorkedExamplePage() {
  const interpretations = {
    'K_controller': 'A high positive score — these vectors are aligned. The model should attend strongly to "controller" when processing "faulty," because "controller" is the hardware component that "faulty" describes.',
    'K_crashed': 'A moderate positive score. "Crashed" is related to "faulty" — both involve hardware failure — but it is not the thing "faulty" directly modifies. The model will give it some attention, but less than "controller."',
    'K_last': 'A negative score — these vectors point in opposing directions. "Last" carries temporal information that "faulty" is not looking for. The model will largely ignore this word.',
  };

  return (
    <div>
      <Panel>
        <PanelHeader>Worked example: Q_faulty matched against three Keys</PanelHeader>
        <InfoBox>
          Let's compute the dot product step by step. We use simplified 4-dimensional vectors
          from our running sentence: <em>"The faulty storage controller crashed last week."</em>{' '}
          Real models like Llama-3 use 128 dimensions per attention head — the same computation,
          just with 128 multiplications instead of 4.
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
                {ex.queryLabel} &middot; {ex.keyLabel}
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
                      <span
                        className="px-2 py-1 rounded border"
                        style={{
                          background: step.product >= 0 ? 'var(--color-teal-bg)' : 'var(--color-red-bg)',
                          borderColor: step.product >= 0 ? 'var(--color-teal)' : 'var(--color-red)',
                          color: step.product >= 0 ? 'var(--color-teal-text)' : 'var(--color-red-text)',
                        }}
                      >
                        {step.a} &times; {step.b} = {step.product}
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

                {/* Interpretation */}
                <div className="mt-3 text-[12px] leading-relaxed text-[var(--color-text-secondary)] italic border-t border-[var(--color-border-light)] pt-3">
                  {interpretations[ex.keyLabel]}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      <Callout
        type="note"
        message='<strong>4 dimensions for clarity, 128 in practice.</strong> The computation is identical — multiply corresponding elements, sum the results. More dimensions means more signal for the model to encode subtle distinctions, but the operation itself does not change.'
      />
    </div>
  );
}

function WhyItWorksPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Why does the dot product capture relevance?</PanelHeader>
        <InfoBox>
          The dot product is just multiplication and addition — it has no inherent knowledge of
          language. So why does it produce high scores for relevant word-pairs and low scores for
          irrelevant ones?
        </InfoBox>
        <InfoBox>
          Because the <strong>entire system upstream is co-trained</strong> to make it work.
          Three layers, learned together:
        </InfoBox>
      </Panel>

      <div className="my-4 space-y-3">
        <Panel>
          <PanelHeader>Layer 1: Embeddings</PanelHeader>
          <InfoBox>
            Before a word enters the Q/K machinery, it is converted from a symbol
            ("controller") into a vector of numbers — its <strong>embedding</strong>.
            These embeddings are learned during training, adjusted so that words with
            similar meanings end up as similar vectors. "Controller" and "processor" point
            in roughly the same direction. "Controller" and "banana" point in unrelated directions.
          </InfoBox>
        </Panel>

        <Panel>
          <PanelHeader>Layer 2: W_Q and W_K projections</PanelHeader>
          <InfoBox>
            The weight matrices <strong>W<sub>Q</sub></strong> and <strong>W<sub>K</sub></strong>{' '}
            (introduced in Stop 3) transform those base embeddings into task-specific Query and
            Key vectors. W<sub>Q</sub> learned to project "faulty" into a direction meaning
            "looking for the hardware I describe." W<sub>K</sub> learned to project "controller"
            into a direction meaning "I am a describable hardware component." These directions
            align — by design.
          </InfoBox>
        </Panel>

        <Panel>
          <PanelHeader>Layer 3: The dot product</PanelHeader>
          <InfoBox>
            The dot product simply <strong>measures the alignment</strong> that the first two
            layers created. It detects the structure — it does not create it. The intelligence
            lives in the embeddings and weight matrices that training shaped to make the simple
            math produce smart results.
          </InfoBox>
        </Panel>
      </div>

      <Panel>
        <PanelHeader>Historical note: Word2Vec (Mikolov, 2013)</PanelHeader>
        <InfoBox>
          The idea that meaning can be encoded as direction in a high-dimensional space was
          popularized by Tomas Mikolov at Google in 2013 with <strong>Word2Vec</strong>. The famous
          demonstration: compute vector("king") &minus; vector("man") + vector("woman"), and the
          nearest vector in the embedding space is "queen." This showed that embeddings capture not
          just similarity but structured <em>relationships</em>.
        </InfoBox>
        <InfoBox>
          Transformers build on this foundation, with a critical difference. In Word2Vec, each word
          gets <strong>one fixed vector</strong> regardless of context — "bank" has the same
          embedding whether it means a riverbank or a financial institution. In a transformer,
          the same word gets <em>different</em> Q, K, and V vectors depending on the surrounding
          sentence — which is what makes attention so powerful. The co-trained system of embeddings
          + W<sub>Q</sub>/W<sub>K</sub> + dot product is the mechanism that makes this work.
        </InfoBox>
      </Panel>
    </div>
  );
}

function ScalingPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The scale problem</PanelHeader>
        <InfoBox>
          As vectors get longer (more dimensions), dot products get larger. With 4 dimensions,
          a strong match scores around 1.26. With 128 dimensions, the same quality of match might
          score 40 or higher — you are summing 128 terms instead of 4.
        </InfoBox>
        <InfoBox>
          This matters because the next step (Stop 6) feeds these scores
          into <strong>softmax</strong>, which converts them to probabilities. Softmax is sensitive
          to magnitude: very large inputs make it "overconfident" — nearly all weight collapses onto
          the single highest-scoring word, everything else ignored. <strong>Without scaling, in 128
          dimensions, the scores would be roughly 11&times; larger.</strong> Softmax would assign
          nearly 100% weight to "controller" and essentially zero to everything else — losing the
          ability to attend to multiple relevant words.
        </InfoBox>
        <InfoBox>
          The fix, from the original "Attention Is All You Need" paper (Vaswani et al., 2017):
          divide every score by <strong>&radic;d</strong>, where d is the vector dimension. This
          is the "scaled" in <strong>"scaled dot-product attention."</strong>
        </InfoBox>
        <InfoBox>
          For d<sub>head</sub> = {SCALING_EXAMPLE.dHead}: &radic;{SCALING_EXAMPLE.dHead} &asymp;{' '}
          {SCALING_EXAMPLE.sqrtDHead}. Scaling keeps the scores in softmax's comfortable zone,
          preserving a spread distribution across multiple relevant words.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Scaling our example scores</PanelHeader>
        <div className="px-4 py-3">
          <div className="text-[12px] text-[var(--color-text-muted)] mb-3">
            Each raw score &divide; {SCALING_EXAMPLE.sqrtDHead} = scaled score
          </div>
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
                    &divide; {SCALING_EXAMPLE.sqrtDHead}
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
        type="note"
        message="<strong>Why &radic;d specifically?</strong> If Q and K elements are independent with variance 1, the variance of their dot product is d. Dividing by &radic;d brings the variance back to 1, keeping scores moderate regardless of dimension count. An elegant normalization rooted in basic statistics."
      />
    </div>
  );
}

function BridgePage() {
  // Compute softmax preview values from our three scores
  const scores = [1.26, 0.83, -0.45];
  const exps = scores.map((s) => Math.exp(s));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  const weights = exps.map((e) => e / sumExp);

  const items = [
    { word: 'controller', score: scores[0], exp: exps[0], weight: weights[0] },
    { word: 'crashed', score: scores[1], exp: exps[1], weight: weights[1] },
    { word: 'last', score: scores[2], exp: exps[2], weight: weights[2] },
  ];

  return (
    <div>
      <Panel>
        <PanelHeader>From scores to weights: a preview of softmax</PanelHeader>
        <InfoBox>
          We now have a raw score for every Query-Key pair — a number measuring relevance. But
          scores are not weights yet. They can be positive, negative, or zero. To blend Values
          proportionally, we need numbers that are all positive and sum to 1 — a proper
          probability distribution.
        </InfoBox>
        <InfoBox>
          The function that does this is called <strong>softmax</strong>. It works in two steps:
          exponentiate each score (making them all positive), then divide each by the total. Let's
          preview it with our three scores.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Softmax preview: our three scores</PanelHeader>
        <div className="px-4 py-3">
          <div className="space-y-3">
            {/* Header row */}
            <div className="flex items-center gap-3 text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border-light)] pb-2">
              <span className="min-w-[100px]">Word</span>
              <span className="min-w-[70px] text-right">Raw score</span>
              <span className="min-w-[10px]">&rarr;</span>
              <span className="min-w-[70px] text-right">e<sup>score</sup></span>
              <span className="min-w-[10px]">&rarr;</span>
              <span className="min-w-[70px] text-right">Weight</span>
              <span className="flex-1">Distribution</span>
            </div>

            {items.map((item) => {
              const barPct = Math.round(item.weight * 100);
              const isTop = item.word === 'controller';
              const color = isTop ? 'var(--color-teal-text)' : item.score < 0 ? 'var(--color-text-muted)' : 'var(--color-blue-text)';

              return (
                <div key={item.word} className="flex items-center gap-3 text-[13px] font-mono">
                  <span className="min-w-[100px] text-[var(--color-text-secondary)]">
                    {item.word}
                  </span>
                  <span className="min-w-[70px] text-right" style={{ color }}>
                    {item.score}
                  </span>
                  <span className="min-w-[10px] text-[var(--color-text-muted)]">&rarr;</span>
                  <span className="min-w-[70px] text-right text-[var(--color-text-secondary)]">
                    {item.exp.toFixed(2)}
                  </span>
                  <span className="min-w-[10px] text-[var(--color-text-muted)]">&rarr;</span>
                  <span className="min-w-[70px] text-right font-bold" style={{ color }}>
                    {(item.weight * 100).toFixed(0)}%
                  </span>
                  <div className="flex-1 h-4 bg-[var(--color-surface-muted)] rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${barPct}%`,
                        background: isTop ? 'var(--color-teal)' : item.score < 0 ? 'var(--color-border)' : 'var(--color-blue)',
                        opacity: isTop ? 1 : 0.6,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Sum row */}
            <div className="flex items-center gap-3 text-[12px] font-mono border-t border-[var(--color-border-light)] pt-2 text-[var(--color-text-muted)]">
              <span className="min-w-[100px]">Total</span>
              <span className="min-w-[70px]" />
              <span className="min-w-[10px]" />
              <span className="min-w-[70px] text-right">{sumExp.toFixed(2)}</span>
              <span className="min-w-[10px]" />
              <span className="min-w-[70px] text-right font-bold text-[var(--color-text-secondary)]">100%</span>
              <span className="flex-1" />
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="good"
        message={`<strong>"controller" gets the most attention — but not all of it.</strong> The ranking from the dot product is preserved: "controller" (${(weights[0] * 100).toFixed(0)}%) > "crashed" (${(weights[1] * 100).toFixed(0)}%) > "last" (${(weights[2] * 100).toFixed(0)}%). Softmax spreads the weight so the model can draw information from multiple words when useful. How softmax achieves this — and what controls how peaked or spread the distribution is — is Stop 6.`}
      />
    </div>
  );
}

// --- Narration text for each page ---

function getNarration(pageId) {
  switch (pageId) {
    case 'intro':
      return '<strong>Stop 5: The Dot Product.</strong> We\'ve seen that each word gets a Query ("what am I looking for?") and every cached word has a Key ("what do I contain?"). Now we need a way to score how well they match. The mechanism is the dot product — multiply element by element, sum the results, get a single number.';
    case 'what-is-dot':
      return 'Think of Q and K as <strong>arrows in high-dimensional space</strong>. The dot product measures how much they point in the same direction. Same direction means high score — strong match. Opposite direction means negative score — no match. Perpendicular means zero — no relationship.';
    case 'worked-example':
      return 'Now the math, step by step. Q<sub>faulty</sub> scored against three Keys from our sentence. Watch how the element-by-element products — <strong>positive times positive, negative times negative</strong> — accumulate into a score that captures relevance.';
    case 'why-it-works':
      return 'The dot product itself is "dumb" math — multiplication and addition. The intelligence lives in <strong>three co-trained layers</strong>: embeddings that place related words nearby, W<sub>Q</sub>/W<sub>K</sub> that create task-specific alignment, and the dot product that measures it. All shaped together during training.';
    case 'scaling':
      return 'In 128 dimensions, dot products produce numbers roughly <strong>11&times; larger</strong> than our 4D examples. These extreme values would cause the next step — softmax — to collapse nearly all weight onto one word. Dividing by &radic;d fixes this. That\'s the "scaled" in "scaled dot-product attention."';
    case 'bridge':
      return 'Our three scores are 1.26, 0.83, and &minus;0.45. To use them as attention weights, we need to convert them into a <strong>probability distribution</strong> — all positive, summing to 1. The function that does this is called <strong>softmax</strong>, and it\'s Stop 6.';
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
