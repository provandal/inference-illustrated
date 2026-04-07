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
        <PanelHeader>Why raw scores cannot be attention weights</PanelHeader>
        <InfoBox>
          In Stop 5, we computed dot-product scores measuring how strongly
          "faulty" matches each word. Here are the scores for five key words:
        </InfoBox>

        {/* Show the actual raw scores */}
        <div className="px-4 pb-2">
          <div className="font-mono text-[13px] space-y-1 px-3 py-3 bg-[var(--color-surface-muted)] rounded-md">
            <div className="flex items-center gap-2">
              <span className="min-w-[80px] text-right text-[var(--color-text-secondary)]">controller</span>
              <span className="font-medium text-[var(--color-text)]">1.26</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="min-w-[80px] text-right text-[var(--color-text-secondary)]">crashed</span>
              <span className="text-[var(--color-text)]">0.83</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="min-w-[80px] text-right text-[var(--color-text-secondary)]">server</span>
              <span className="text-[var(--color-text)]">0.52</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="min-w-[80px] text-right text-[var(--color-text-secondary)]">was</span>
              <span className="text-[var(--color-text)]">0.15</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="min-w-[80px] text-right text-[var(--color-text-secondary)]">last</span>
              <span className="text-[var(--color-text)]" style={{ color: 'var(--color-amber)' }}>&minus;0.45</span>
            </div>
          </div>
        </div>

        <InfoBox>
          We cannot use these numbers directly as attention weights. Two problems
          make that impossible:
        </InfoBox>

        <InfoBox>
          <strong>Problem 1: Negative values.</strong> The score for "last"
          is &minus;0.45. A negative weight would mean "subtract information
          from 'last'" — remove its contribution from the output. That does not
          make sense. Attention weights need to say "use this much," not "undo
          this much." Every weight must be zero or positive.
        </InfoBox>

        <InfoBox>
          <strong>Problem 2: They do not sum to 1.</strong> These five scores
          add up to 1.26 + 0.83 + 0.52 + 0.15 + (&minus;0.45)
          = <strong>2.31</strong>. We need proportions that sum to 100% — a
          proper probability distribution — so the weighted blend of Value
          vectors (the information payloads computed back in Stop 3) produces
          a meaningful average, not an inflated or deflated result.
        </InfoBox>

        <InfoBox>
          We need a function that takes any list of numbers — positive, negative,
          large, small — and converts them into valid probabilities: all positive,
          summing to exactly 1. That function is <strong>softmax</strong>, and it
          appears in every transformer model ever built.
        </InfoBox>
      </Panel>
    </div>
  );
}

function WhySoftmaxPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The naive approach fails</PanelHeader>
        <InfoBox>
          The simplest idea is to divide each score by the sum of all scores.
          But our sum is 2.31, and "last" has a score of &minus;0.45.
          Dividing: &minus;0.45 / 2.31 = &minus;0.19. That is still negative —
          Problem 1 is unsolved. And if some scores were larger negatives, the sum
          could land near zero, making the division explode. We need something
          fundamentally different.
        </InfoBox>
        <InfoBox>
          The solution is to pass every score through the <strong>exponential
          function</strong> e<sup>x</sup> before dividing. This single change
          solves both problems at once, and it gives attention a useful property
          that simple normalization cannot.
        </InfoBox>
      </Panel>

      <div className="my-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel>
          <PanelHeader>Always positive</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            <p>
              No matter the input — positive, negative, or zero —
              e<sup>x</sup> always produces a number greater than zero.
            </p>
            <p className="mt-2">
              Our most problematic score is "last" at &minus;0.45.
              After exponentiation:
            </p>
            <p className="mt-1 font-mono text-[var(--color-text)]">
              e<sup>&minus;0.45</sup> = 0.64
            </p>
            <p className="mt-2">
              The negative score becomes a small positive number. "last"
              will contribute a little to the output rather than subtracting
              from it. Problem 1 is solved.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader>Amplifies differences</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            <p>
              The exponential grows faster than any linear function, which
              means it widens gaps between scores:
            </p>
            <div className="mt-2 font-mono text-[var(--color-text)] space-y-1">
              <div>e<sup>1.26</sup> = 3.53 &nbsp;(controller)</div>
              <div>e<sup>0.83</sup> = 2.29 &nbsp;(crashed)</div>
            </div>
            <p className="mt-2">
              The raw difference between "controller" and "crashed" was only
              1.26 &minus; 0.83 = 0.43. After exponentiation, "controller"
              is 3.53 / 2.29 = <strong>1.54&times;</strong> larger than
              "crashed." The exponential amplifies the winner's lead,
              giving attention a useful "winner-take-more" shape: the
              highest-scoring word gets disproportionately more weight.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader>Smooth gradients</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            <p>
              The derivative of e<sup>x</sup> is itself: d/dx e<sup>x</sup> =
              e<sup>x</sup>. This mathematical elegance means the gradient of
              softmax has a clean closed-form expression, making{' '}
              <strong>backpropagation</strong> — the process that flows error
              signals backward to adjust the weight matrices during
              training — computationally efficient through the softmax layer.
            </p>
            <p className="mt-2">
              Other positive-valued functions could work in principle (like
              x<sup>2</sup> or |x|), but their gradient properties make
              training less stable. The exponential is both mathematically
              elegant and practically essential.
            </p>
          </div>
        </Panel>
      </div>

      <Callout
        type="note"
        message="<strong>Softmax is not the only option, but it is the best tradeoff.</strong> Alternatives like sparsemax and entmax exist, but softmax's combination of guaranteed positivity, amplification, differentiability, and numerical stability has made it the universal default in transformer architectures."
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
        <InfoBox>
          We take each raw score from "faulty" attending to these five words and
          pass it through e<sup>x</sup>. Every output is positive, regardless of
          whether the input was negative.
        </InfoBox>
        <div className="px-4 pb-4">
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
                {rawScores[i] < 0 && (
                  <span className="text-[11px] text-[var(--color-text-muted)] italic">
                    negative in, positive out
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Step 2: Sum all exponentials</PanelHeader>
        <InfoBox>
          Add up all the exponentiated values. This sum becomes the denominator
          that will turn raw exponentials into fractions summing to exactly 1.
        </InfoBox>
        <div className="px-4 pb-4 text-[13px]">
          <div className="font-mono text-[var(--color-text-secondary)]">
            {exponentials.map((e) => e.toFixed(2)).join(' + ')}{' '}
            <span className="text-[var(--color-text-muted)]">=</span>{' '}
            <span className="font-medium text-[var(--color-text)]">{expSum.toFixed(2)}</span>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Step 3: Divide each by the sum</PanelHeader>
        <InfoBox>
          Each exponentiated value divided by the total gives that word's share
          of attention — a percentage that says "draw this much of your
          information from this word's Value vector."
        </InfoBox>
        <div className="px-4 pb-4">
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
        <PanelHeader>Result: Attention weights for "faulty"</PanelHeader>
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

      <Panel className="mt-4">
        <PanelHeader>What these weights mean</PanelHeader>
        <InfoBox>
          "controller" gets <strong>37.9%</strong> — the model will draw about
          38% of its information from "controller" when processing "faulty." It
          had the highest raw score (1.26), and the exponential amplified that
          lead into the largest share.
        </InfoBox>
        <InfoBox>
          "crashed" gets <strong>24.7%</strong> — the second-highest relevance.
          The failure event is important context for understanding what "faulty"
          describes.
        </InfoBox>
        <InfoBox>
          Even "last" gets <strong>6.9%</strong>. Its raw score was
          negative (&minus;0.45), but softmax converted it to a small positive
          weight. Softmax never completely zeros out any word — every word in
          the sequence contributes at least a trace. This is a deliberate feature:
          the model keeps a faint channel open to every word, just in case.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message='<strong>A note on precision.</strong> Mathematically, these weights sum to exactly 1.0. In practice, computer arithmetic may produce 0.99999998 or 1.00000001 due to floating-point precision. This is negligible and has no effect on the model&rsquo;s behavior — neural network math is approximate by nature, unlike storage protocols where bit-level precision matters.'
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
        <PanelHeader>Temperature: the focus dial</PanelHeader>
        <InfoBox>
          When you use ChatGPT or Claude's API, you may have seen a
          "temperature" parameter. Temperature controls exactly the distribution
          we just computed — not in the attention layer specifically, but in the
          final token-prediction step, which uses the same softmax function. The
          principle is identical: temperature controls the tradeoff between
          focus and exploration.
        </InfoBox>
        <InfoBox>
          Mathematically, instead of computing softmax(scores), we compute
          softmax(scores / T) where T is the temperature. When T is small,
          dividing by it <em>magnifies</em> the differences between scores —
          the highest score pulls further ahead. When T is large, dividing
          by it <em>compresses</em> the differences — scores become more
          similar, and attention spreads more evenly.
        </InfoBox>
        <InfoBox>
          Let's see this with our actual scores. At T = 0.1,
          "controller's" score becomes 1.26 / 0.1 = 12.6 while "last"
          becomes &minus;0.45 / 0.1 = &minus;4.5. The gap explodes from 1.71
          to 17.1, and the exponential amplifies it even further. At T = 3.0,
          the scores become 1.26 / 3.0 = 0.42 and &minus;0.45 / 3.0
          = &minus;0.15 — a gap of just 0.57, barely noticeable after
          exponentiation.
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

      <Panel className="mt-4">
        <PanelHeader>The practical effect</PanelHeader>
        <InfoBox>
          <strong>T = 0.1 (focused):</strong> "controller" gets 98.6% of the
          attention — the model draws almost all of its information from this
          single word. It is extremely confident about which word matters, but
          if it is wrong, there is no fallback. This produces sharp, decisive
          outputs at the cost of flexibility.
        </InfoBox>
        <InfoBox>
          <strong>T = 1.0 (default):</strong> "controller" leads at 37.9%, but
          "crashed" (24.7%), "server" (18.1%), and "was" (12.5%) all
          contribute meaningfully. The model is confident about the winner
          while still drawing context from supporting words.
        </InfoBox>
        <InfoBox>
          <strong>T = 3.0 (exploratory):</strong> The distribution flattens —
          "controller" gets only 25.6% while "last" rises from 6.9% to 14.5%.
          The model hedges, drawing more evenly from multiple words. This
          captures broader context but risks diluting the signal from the most
          relevant word.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message='<strong>Temperature = 0 is a special case called "greedy decoding."</strong> The model always puts 100% weight on the single highest-scoring option. In practice, values near 0 (like 0.01) approximate this. Most production systems use temperature between 0 and 1 for predictable, focused outputs.'
      />
    </div>
  );
}

function BridgePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>From weights to information</PanelHeader>
        <InfoBox>
          We now have attention weights — valid probabilities that tell the model
          how much to draw from each word when processing "faulty":
        </InfoBox>

        <div className="px-4 pb-2">
          <div className="font-mono text-[13px] space-y-1 px-3 py-3 bg-[var(--color-surface-muted)] rounded-md">
            <div>controller: 37.9%</div>
            <div>crashed: 24.7%</div>
            <div>server: 18.1%</div>
            <div>was: 12.5%</div>
            <div>last: 6.9%</div>
          </div>
        </div>

        <InfoBox>
          The next step is using these weights to actually gather information.
          Each word has a <strong>Value vector</strong> — the information payload
          created back in Stop 3 by multiplying the word's embedding by
          W<sub>V</sub>. The Value vector for "controller" carries
          information about hardware components. The Value vector for "crashed"
          carries information about failure events. The Value vector for "last"
          carries temporal information.
        </InfoBox>

        <InfoBox>
          The model will multiply each Value vector by its weight and sum
          them all together:
        </InfoBox>

        <div className="px-4 pb-2">
          <div className="font-mono text-[13px] px-3 py-3 bg-[var(--color-surface-muted)] rounded-md leading-relaxed">
            0.379 &times; V<sub>controller</sub> + 0.247 &times; V<sub>crashed</sub> + 0.181 &times; V<sub>server</sub> + 0.125 &times; V<sub>was</sub> + 0.069 &times; V<sub>last</sub>
          </div>
        </div>

        <InfoBox>
          The result is a single vector that blends information from every word
          in proportion to its relevance. "faulty" will no longer be a generic
          adjective meaning "broken" — it will become "faulty as it appears in
          this sentence, describing the storage controller that crashed." That
          blending, and the <strong>residual connection</strong> that preserves
          the original signal alongside it, is <strong>Stop 7</strong>.
        </InfoBox>
      </Panel>

      <Callout
        type="good"
        message="<strong>The full attention pipeline is almost complete.</strong> Embed &rarr; project to Q, K, V &rarr; dot-product scores &rarr; softmax &rarr; weight the Values &rarr; sum. We have covered everything up through softmax. The final step &mdash; weighting and summing the Value vectors &mdash; completes the picture."
      />
    </div>
  );
}

// --- Narration text for each page ---

const NARRATIONS = {
  intro:
    '<strong>Stop 6: Taming the Numbers &mdash; Scaling and Softmax.</strong> In Stop 5, we measured how strongly "faulty" matches each word using dot products. The scores came out as raw numbers &mdash; some positive, some negative, summing to whatever they happen to sum to. Before these scores can guide attention, we need to convert them into proper weights: all positive, summing to 1.',

  'why-softmax':
    'Simple division will not work &mdash; negative scores stay negative, and sums near zero blow up. The solution is the <strong>exponential function</strong>, applied before dividing. Below, we see exactly how it solves both problems using our scores for "faulty."',

  walkthrough:
    'Three operations, applied to five real scores. Exponentiate each score, sum the results, divide each by that sum. The output is a valid probability distribution &mdash; positive numbers summing to exactly 1 &mdash; that tells the model how much to draw from each word.',

  temperature:
    'Temperature is a single number that divides the scores <strong>before</strong> softmax is applied. Small temperature magnifies differences; large temperature compresses them. Below, see how the same five scores produce dramatically different attention patterns at three temperature settings.',

  bridge:
    'Softmax gave us attention weights &mdash; "controller" 37.9%, "crashed" 24.7%, and so on. The next step is using those weights to blend each word\'s <strong>Value vector</strong> into a single output. That blending is <strong>Stop 7</strong>.',
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
