import { useState, useCallback, useEffect } from 'react';
import { PAGES, SOFTMAX_EXAMPLE, TEMPERATURE_EXAMPLES } from '../data/stop6Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Helpers ---

function useDarkMode() {
  return useStore((s) => s.darkMode);
}

/** Horizontal bar for showing a weight percentage */
function WeightBar({ label, percentage, highlight, color }) {
  const isStrong = percentage >= 25;
  const barColor = color || (isStrong ? 'var(--color-teal)' : 'var(--color-blue)');
  return (
    <div className="flex items-center gap-2 my-[3px] text-xs">
      <span
        className={`min-w-[90px] text-right whitespace-nowrap overflow-hidden text-ellipsis
                    ${highlight || isStrong ? 'font-medium text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}
      >
        {label}
      </span>
      <div className="flex-1 h-[18px] bg-[var(--color-surface-muted)] rounded-[3px] overflow-hidden">
        <div
          className="h-full rounded-[3px] transition-[width] duration-500"
          style={{ width: `${percentage}%`, background: barColor }}
        />
      </div>
      <span className="min-w-[42px] text-right font-mono text-[11px] text-[var(--color-text-muted)]">
        {percentage}%
      </span>
    </div>
  );
}

// --- Page Content Components ---

function IntroPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>From raw scores to attention weights</PanelHeader>
        <InfoBox>
          In Stop 5, we computed dot-product scores between Query and Key vectors —
          numbers measuring how relevant each word is to the current word. But these raw
          scores can be any number, positive or negative. Before they can guide attention,
          we need to convert them into something more useful: a set of weights that are all
          non-negative and sum to 1. That's the job of <strong>softmax</strong>.
        </InfoBox>
        <InfoBox>
          Think of the raw scores as rough rankings — "controller scored 1.26, crashed
          scored 0.83, last scored &minus;0.45." These numbers tell us the relative
          ordering, but they aren't probabilities. We can't directly use them to blend
          Value vectors, because we need weights that behave like percentages: all positive,
          summing to 100%.
        </InfoBox>
        <InfoBox>
          Softmax is the standard function that converts any list of real numbers into a
          valid probability distribution. It's used in virtually every transformer model,
          and understanding it is essential for understanding how attention weights are
          formed.
        </InfoBox>
      </Panel>
    </div>
  );
}

function WhySoftmaxPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Why the exponential function?</PanelHeader>
        <InfoBox>
          You might wonder: why not just divide each score by the sum of all scores? Because
          raw scores can be negative, and dividing by a sum that might be near zero is
          numerically unstable. The exponential function solves both problems at once.
        </InfoBox>
        <InfoBox>
          The exponential function e<sup>x</sup> has several properties that make it the
          right choice for converting scores into weights:
        </InfoBox>
      </Panel>

      <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader>Always positive</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            No matter what the input is — positive, negative, or zero — e<sup>x</sup> is
            always greater than zero. This guarantees no negative weights. Even a score
            of &minus;10 produces a tiny positive number (e<sup>&minus;10</sup> &asymp; 0.00005),
            never a negative one.
          </div>
        </Panel>

        <Panel>
          <PanelHeader>Amplifies differences</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            The exponential function grows faster than any polynomial. A score of 2.0
            doesn't just get <em>twice</em> the weight of a score of 1.0 — it gets{' '}
            <em>e</em> times as much (&asymp; 2.7&times;). The highest score gets
            disproportionately more weight, which is exactly what attention needs: a clear
            winner that stands out from the crowd.
          </div>
        </Panel>

        <Panel>
          <PanelHeader>Smooth and differentiable</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            The exponential function has no sharp corners or discontinuities. This is
            essential for training via backpropagation — the gradient flows smoothly
            through softmax, which means the model can learn to adjust its scores
            incrementally during training.
          </div>
        </Panel>

        <Panel>
          <PanelHeader>Clean gradients</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            The derivative of e<sup>x</sup> is itself: e<sup>x</sup>. This mathematical
            elegance makes gradient computation through softmax efficient and numerically
            stable — important when training models with billions of parameters over
            trillions of tokens.
          </div>
        </Panel>
      </div>

      <Callout
        type="note"
        message="<strong>Softmax isn't the only option — but it's the best tradeoff.</strong> Alternatives like sparsemax or entmax exist, but softmax's combination of simplicity, differentiability, and numerical stability has made it the universal default in transformer architectures."
      />
    </div>
  );
}

function WalkthroughPage() {
  const { labels, rawScores, exponentials, expSum, percentages } = SOFTMAX_EXAMPLE;

  return (
    <div>
      <Panel>
        <PanelHeader>Step 1: Exponentiate each score</PanelHeader>
        <div className="p-4">
          <div className="space-y-2">
            {labels.map((label, i) => (
              <div key={label} className="flex items-center gap-3 text-[13px]">
                <span className="min-w-[80px] text-right text-[var(--color-text-secondary)]">
                  {label}
                </span>
                <span className="font-mono text-[var(--color-text-muted)]">
                  e<sup>{rawScores[i]}</sup>
                </span>
                <span className="text-[var(--color-text-muted)]">=</span>
                <span className="font-mono font-medium text-[var(--color-text)]">
                  {exponentials[i].toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Step 2: Sum all exponentials</PanelHeader>
        <div className="p-4 text-[13px]">
          <div className="font-mono text-[var(--color-text-secondary)]">
            {exponentials.map((e) => e.toFixed(2)).join(' + ')}{' '}
            <span className="text-[var(--color-text-muted)]">=</span>{' '}
            <span className="font-medium text-[var(--color-text)]">{expSum.toFixed(2)}</span>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Step 3: Divide each by the sum</PanelHeader>
        <div className="p-4">
          <div className="space-y-2">
            {labels.map((label, i) => (
              <div key={label} className="flex items-center gap-3 text-[13px]">
                <span className="min-w-[80px] text-right text-[var(--color-text-secondary)]">
                  {label}
                </span>
                <span className="font-mono text-[var(--color-text-muted)]">
                  {exponentials[i].toFixed(2)} / {expSum.toFixed(2)}
                </span>
                <span className="text-[var(--color-text-muted)]">=</span>
                <span className="font-mono font-medium text-[var(--color-text)]">
                  {percentages[i]}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Result: Attention weights</PanelHeader>
        <div className="p-4">
          {labels.map((label, i) => (
            <WeightBar
              key={label}
              label={label}
              percentage={percentages[i]}
              highlight={i === 0}
            />
          ))}
        </div>
      </Panel>

      <Callout
        type="good"
        message='<strong>"controller" gets the highest weight at 37.9%.</strong> It had the highest raw score (1.26), and the exponential function amplified that lead. "last" had a negative score (&minus;0.45), but softmax still gives it a small positive weight (6.9%) — it contributes a little, rather than being harshly cut off.'
      />
    </div>
  );
}

function TemperaturePage() {
  const [selectedTemp, setSelectedTemp] = useState(1);
  const { labels } = SOFTMAX_EXAMPLE;

  return (
    <div>
      <Panel>
        <PanelHeader>What is temperature?</PanelHeader>
        <InfoBox>
          If you've used ChatGPT or Claude's API, you may have seen a "temperature"
          parameter. Temperature divides the scores <strong>before</strong> softmax is
          applied. Low temperature (like 0.1) makes the model more focused — the
          highest-scoring word dominates. High temperature (like 3.0) makes the model
          more exploratory — weights spread more evenly.
        </InfoBox>
        <InfoBox>
          Mathematically, instead of computing softmax(scores), we compute
          softmax(scores / T) where T is the temperature. When T is small, the
          differences between scores are magnified. When T is large, the differences
          are compressed.
        </InfoBox>
      </Panel>

      {/* Temperature selector tabs */}
      <div className="flex gap-2 my-4">
        {TEMPERATURE_EXAMPLES.map((ex, i) => (
          <button
            key={ex.temp}
            onClick={() => setSelectedTemp(i)}
            className={`flex-1 px-3 py-2.5 text-xs rounded-lg border transition-colors cursor-pointer
              ${selectedTemp === i
                ? 'bg-[var(--color-primary-bg)] border-[var(--color-primary)] text-[var(--color-primary-text)] font-medium'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]'
              }`}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* Show bars for selected temperature */}
      <Panel>
        <PanelHeader>{TEMPERATURE_EXAMPLES[selectedTemp].label}</PanelHeader>
        <div className="p-4">
          {labels.map((label, i) => (
            <WeightBar
              key={label}
              label={label}
              percentage={TEMPERATURE_EXAMPLES[selectedTemp].percentages[i]}
              highlight={i === 0}
            />
          ))}
          <div className="mt-3 text-xs text-[var(--color-text-secondary)] italic">
            {TEMPERATURE_EXAMPLES[selectedTemp].description}
          </div>
        </div>
      </Panel>

      {/* Side-by-side comparison */}
      <div className="my-4 grid grid-cols-3 gap-3">
        {TEMPERATURE_EXAMPLES.map((ex) => (
          <Panel key={ex.temp}>
            <PanelHeader>{ex.label}</PanelHeader>
            <div className="p-3 space-y-1">
              {labels.map((label, i) => {
                const pct = ex.percentages[i];
                const isTop = i === 0;
                return (
                  <div key={label} className="flex items-center gap-1.5 text-[10px]">
                    <span
                      className={`min-w-[58px] text-right whitespace-nowrap overflow-hidden text-ellipsis
                        ${isTop ? 'font-medium text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}
                    >
                      {label}
                    </span>
                    <div className="flex-1 h-[12px] bg-[var(--color-surface-muted)] rounded-[2px] overflow-hidden">
                      <div
                        className="h-full rounded-[2px]"
                        style={{
                          width: `${pct}%`,
                          background: isTop ? 'var(--color-teal)' : 'var(--color-blue)',
                        }}
                      />
                    </div>
                    <span className="min-w-[32px] text-right font-mono text-[10px] text-[var(--color-text-muted)]">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>

      <Callout
        type="note"
        message='<strong>Temperature = 0 is a special case called "greedy decoding"</strong> — the model always picks the single highest-scoring option with 100% weight. In practice, values near 0 (like 0.01) approximate this. Most production systems use temperature between 0 and 1 for predictable, focused outputs.'
      />
    </div>
  );
}

function BridgePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>From scores to blending</PanelHeader>
        <InfoBox>
          We started with raw dot-product scores and converted them into attention
          weights — probabilities that tell the model how much to listen to each word.
          Now comes the final step: using those weights to actually gather information.
        </InfoBox>
        <InfoBox>
          Each word's <strong>Value</strong> vector carries its payload — the rich
          semantic information that was created back in Stop 3 by multiplying the
          embedding by W<sub>V</sub>. The attention weights determine how to blend
          those Value vectors into a single output.
        </InfoBox>
        <InfoBox>
          That blending — and the residual connection that preserves the original
          signal — is <strong>Stop 7</strong>.
        </InfoBox>
      </Panel>

      <Callout
        type="good"
        message="<strong>The full attention pipeline is almost complete.</strong> Embed &rarr; project to Q, K, V &rarr; dot-product scores &rarr; scale &rarr; softmax &rarr; weight the Values &rarr; sum. We have covered everything up through softmax. The final step — weighting and summing the Value vectors — completes the picture."
      />
    </div>
  );
}

// --- Narration text for each page ---

const NARRATIONS = {
  intro:
    '<strong>Stop 6: Taming the Numbers &mdash; Scaling and Softmax.</strong> We have raw dot-product scores from Stop 5. Now we need to convert them into proper attention weights &mdash; non-negative numbers that sum to 1. The function that does this is <strong>softmax</strong>, and it appears in every transformer ever built.',

  'why-softmax':
    'Why use the exponential function instead of something simpler? Because it solves two problems at once: it guarantees positive outputs, and it <strong>amplifies differences</strong> so the highest-scoring word gets disproportionately more weight. It\u2019s also smooth and differentiable &mdash; essential for training.',

  walkthrough:
    'Let\u2019s walk through softmax step by step on real numbers. We take five raw scores, exponentiate each one, sum the results, and divide. Three simple operations that convert arbitrary numbers into a valid probability distribution.',

  temperature:
    'Temperature is a single number that controls how <strong>sharp or flat</strong> the attention distribution is. Low temperature concentrates weight on the winner. High temperature spreads weight across all options. It\u2019s the same softmax &mdash; just applied to scaled scores.',

  bridge:
    'Softmax gave us attention weights. The final step is using those weights to blend Value vectors into a single output &mdash; the actual information that flows forward through the network. That blending, and the residual connection that preserves the original signal, is <strong>Stop 7</strong>.',
};

// --- Main Component ---

export default function SoftmaxScaling() {
  const [pageIndex, setPageIndex] = useState(0);
  const isDark = useDarkMode();

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
        {page.id === 'why-softmax' && <WhySoftmaxPage />}
        {page.id === 'walkthrough' && <WalkthroughPage />}
        {page.id === 'temperature' && <TemperaturePage />}
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
