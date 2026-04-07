import { useState, useCallback, useEffect } from 'react';
import { PAGES } from '../data/stop4Data';
import { Panel, PanelHeader, InfoBox, Callout, SectionLabel } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Page Content Components ---

function IntroPage() {
  return (
    <Panel>
      <PanelHeader>The scale of the problem</PanelHeader>
      <InfoBox>
        For Llama-3 70B, W<sub>Q</sub> alone contains over <strong>67 million
        numbers</strong>. W<sub>K</sub> and W<sub>V</sub> have millions more.
        Across all layers and all matrices, the model has roughly{' '}
        <strong>70 billion parameters</strong> &mdash; that&rsquo;s what the
        &ldquo;70B&rdquo; in the name means.
      </InfoBox>
      <InfoBox>
        No human chose these numbers. No human could. Instead, every weight
        matrix starts as random noise and is shaped, over billions of training
        examples, into the structured knowledge that makes the model work. This
        stop traces that journey: from random initialization, through the
        training loop, to the frozen weights that run during inference.
      </InfoBox>
    </Panel>
  );
}

function RandomStartPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Before training: random noise</PanelHeader>
        <InfoBox>
          Nobody chose them. Before training begins, every weight matrix — W<sub>Q</sub>,{' '}
          W<sub>K</sub>, W<sub>V</sub>, W (from the RNN), U — starts as{' '}
          <strong>random numbers</strong>. Completely random.
        </InfoBox>
        <InfoBox>
          The attention patterns produced by random weights look like static on a TV screen: every
          word attends to every other word with roughly equal strength. No structure, no meaning.
        </InfoBox>
      </Panel>

      <div className="my-4 grid grid-cols-2 gap-4">
        <Panel>
          <PanelHeader>Random weights (before training)</PanelHeader>
          <div className="p-4 space-y-1.5">
            {['storage controller', 'crashed', 'was', 'server', 'replaced', 'technician', 'other words'].map(
              (label) => {
                const value = Math.floor(Math.random() * 6) + 12;
                return (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span className="min-w-[120px] text-right text-[var(--color-text-secondary)]">
                      {label}
                    </span>
                    <div className="flex-1 h-3 bg-[var(--color-surface-muted)] rounded-[3px] overflow-hidden">
                      <div
                        className="h-full rounded-[3px]"
                        style={{
                          width: `${value}%`,
                          background: 'var(--color-text-muted)',
                        }}
                      />
                    </div>
                    <span className="min-w-[30px] text-right font-mono text-[11px] text-[var(--color-text-muted)]">
                      ~{value}%
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader>Trained weights (after training)</PanelHeader>
          <div className="p-4 space-y-1.5">
            {[
              ['storage controller', 48, 'var(--color-teal)'],
              ['crashed', 14, 'var(--color-blue)'],
              ['was', 12, 'var(--color-blue)'],
              ['server', 8, 'var(--color-text-muted)'],
              ['replaced', 7, 'var(--color-text-muted)'],
              ['technician', 3, 'var(--color-text-muted)'],
              ['other words', 4, 'var(--color-text-muted)'],
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span
                  className={`min-w-[120px] text-right ${
                    value >= 40
                      ? 'font-medium text-[var(--color-text)]'
                      : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  {label}
                </span>
                <div className="flex-1 h-3 bg-[var(--color-surface-muted)] rounded-[3px] overflow-hidden">
                  <div
                    className="h-full rounded-[3px]"
                    style={{ width: `${value}%`, background: color }}
                  />
                </div>
                <span className="min-w-[30px] text-right font-mono text-[11px] text-[var(--color-text-muted)]">
                  {value}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Callout
        type="good"
        message='<strong>After training on billions of sentences, structure emerges.</strong> The matrices learn to produce Q vectors that ask meaningful questions and K vectors that give useful answers. "faulty" attends strongly to "storage controller" — not because anyone programmed that rule, but because the training process discovered it.'
      />
    </div>
  );
}

function TrainingLoopPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The training loop</PanelHeader>
        <InfoBox>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                1
              </span>
              <div>
                <strong>Forward pass:</strong> Feed a sentence through the model, predict the next
                word. With random weights, the prediction is essentially a guess.
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                2
              </span>
              <div>
                <strong>Compute the loss:</strong> Compare the prediction to the actual next word.
                The <strong>loss</strong> is a single number that measures how wrong the model was.
                Higher loss means worse prediction.
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                3
              </span>
              <div>
                <strong>Backpropagation:</strong> Trace the error backward through every layer,
                computing a <strong>gradient</strong> for each weight — a number that says "if you
                increased this weight slightly, here's how the loss would change."
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                4
              </span>
              <div>
                <strong>Update:</strong> Nudge each weight slightly in the direction that would have
                reduced the error. This is <strong>gradient descent</strong>. The{' '}
                <strong>learning rate</strong> controls how big each nudge is — too big and the model
                overshoots, too small and training takes forever.
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                5
              </span>
              <div>
                <strong>Repeat</strong> billions of times with different sentences.
              </div>
            </div>
          </div>
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message="<strong>Key terms:</strong> <em>loss</em> (how wrong the prediction was), <em>gradient</em> (direction to adjust a weight), <em>gradient descent</em> (the adjustment algorithm), <em>learning rate</em> (step size), <em>forward pass</em> (running input through the model), <em>backpropagation</em> (tracing error backward to compute gradients), <em>parameters</em> (all the learnable numbers in the model — the weights)."
      />

      <Callout
        type="good"
        message="<strong>After billions of updates, the weight matrices encode the patterns of language</strong> — grammar, meaning, facts, reasoning. No one programmed these patterns explicitly. They emerged from the simple loop: predict, measure error, adjust, repeat."
      />
    </div>
  );
}

function HistoryPage() {
  return (
    <Panel>
      <PanelHeader>Historical context</PanelHeader>
      <InfoBox>
        The idea of adjusting weights by gradient descent dates to <strong>Cauchy in the 1840s</strong>.
        He developed the method of steepest descent as a general optimization technique — nearly two
        centuries before anyone applied it to neural networks.
      </InfoBox>
      <InfoBox>
        <strong>Backpropagation</strong> — the method for efficiently computing gradients through
        layered networks — was popularized by <strong>Rumelhart, Hinton, and Williams in 1986</strong>.
        Their paper showed that multi-layer networks could learn internal representations, overturning
        a decade of skepticism that had followed Minsky and Papert's critique of simple perceptrons.
      </InfoBox>
      <InfoBox>
        It took until <strong>2017</strong> for Vaswani et al. to design an architecture — the{' '}
        <strong>transformer</strong> — where these ideas could scale to the models we have today.
        The key innovation wasn't gradient descent or backpropagation (those were decades old). It
        was the <strong>self-attention mechanism</strong> that made training massively parallelizable
        and eliminated the sequential bottleneck of RNNs.
      </InfoBox>
      <InfoBox>
        From Cauchy to transformers: 170+ years of mathematical foundations, combined in just the
        right way.
      </InfoBox>
    </Panel>
  );
}

function ThreePhasesPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Three life phases of a model</PanelHeader>

        <InfoBox>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]">
                Phase 1
              </span>
              <strong>Pre-training</strong>
            </div>
            <p className="ml-[60px]">
              Learn language from massive text data — trillions of tokens. The model reads the
              internet (books, articles, code, conversations) and learns to predict the next word.
              This is where the bulk of the weight matrices are shaped. It takes weeks to months on
              thousands of GPUs.
            </p>
          </div>
        </InfoBox>

        <InfoBox>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)]">
                Phase 2
              </span>
              <strong>Post-training</strong>
            </div>
            <p className="ml-[60px]">
              Refine behavior through <strong>SFT</strong> (supervised fine-tuning),{' '}
              <strong>DPO</strong> (direct preference optimization), and{' '}
              <strong>GRPO</strong> (group relative policy optimization). This is where the model
              learns to be helpful, harmless, and honest — to follow instructions, refuse harmful
              requests, and format answers clearly. The weight matrices continue to change, but more
              surgically.
            </p>
          </div>
        </InfoBox>

        <InfoBox>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)]">
                Phase 3
              </span>
              <strong>Inference</strong>
            </div>
            <p className="ml-[60px]">
              Use the model to process new text. All weight matrices are <strong>frozen</strong>.
              The model applies what it learned — it does not learn anything new. Every conversation
              you have with a language model happens in this phase.
            </p>
          </div>
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message='<strong>The weight matrices change during phases 1 and 2.</strong> Once we switch to inference (phase 3), they are frozen forever. The model you talk to today has the same weights whether you ask it about cooking or quantum physics, whether it&rsquo;s your first message or your thousandth.'
      />
    </div>
  );
}

function FrozenVsWorkingPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Frozen knowledge vs. working memory</PanelHeader>
        <InfoBox>
          This distinction — <strong>frozen weights</strong> vs.{' '}
          <strong>dynamic state</strong> — is fundamental to understanding the KV cache.
        </InfoBox>
      </Panel>

      <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader>Model weights</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)] space-y-2">
            <p>
              <strong className="text-[var(--color-text)]">
                W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub>, and all other weight matrices
              </strong>
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <strong>Fixed</strong> after training. Never change during inference.
              </li>
              <li>
                <strong>Same</strong> for every user, every conversation.
              </li>
              <li>
                For Llama-3 70B: ~<strong>140 GB</strong> at FP16, ~<strong>35 GB</strong> at FP4
                quantization.
              </li>
              <li>
                <strong>Loaded once</strong>, shared across all requests.
              </li>
            </ul>
          </div>
        </Panel>

        <Panel>
          <PanelHeader>KV cache</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)] space-y-2">
            <p>
              <strong className="text-[var(--color-text)]">
                Stored K and V vectors for each token
              </strong>
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <strong>Dynamic.</strong> Created fresh for each conversation.
              </li>
              <li>
                <strong>Grows</strong> with every token generated.
              </li>
              <li>
                <strong>Per-user.</strong> Each conversation has its own cache.
              </li>
              <li>
                This is where the <strong>memory pressure</strong> comes from.
              </li>
            </ul>
          </div>
        </Panel>
      </div>

      <Callout
        type="note"
        message='<strong>The model weights are the frozen knowledge. The KV cache is the working memory.</strong> Understanding this split is essential for understanding why inference infrastructure looks the way it does. The weights are a one-time cost shared by everyone. The KV cache is a per-conversation cost that scales with context length and concurrent users — and it&rsquo;s the reason serving long conversations is expensive.'
      />
    </div>
  );
}

function BridgePage() {
  return (
    <Panel>
      <PanelHeader>What comes next</PanelHeader>
      <InfoBox>
        We know that W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub> transform embeddings into Q, K, V
        vectors. We know these matrices were learned during training — emerging from billions of
        predict-measure-adjust cycles until the weight values encoded the patterns of language.
      </InfoBox>
      <InfoBox>
        But we haven't looked inside the matching process itself. When a Query meets a Key, how does
        the model compute "these are relevant to each other"?
      </InfoBox>
      <InfoBox>
        The answer is a simple mathematical operation called the{' '}
        <strong>dot product</strong> — and understanding it reveals why the system works so well.
        That's Stop 5.
      </InfoBox>
    </Panel>
  );
}

// --- Narration text for each page ---

function getNarration(pageId) {
  switch (pageId) {
    case 'intro':
      return '<strong>Stop 4: Learning to Pay Attention.</strong> In Stop 3, we saw that every word gets three representations — Query, Key, and Value — each created by multiplying the embedding by a weight matrix. But where do those weight matrices come from? W<sub>Q</sub> has millions of numbers. Who chose them?';
    case 'random-start':
      return 'Nobody chose them. Before training begins, every weight matrix starts as <strong>random numbers</strong>. The attention patterns they produce are pure noise. Here we compare what random weights produce versus what trained weights produce — structure that emerged entirely from data.';
    case 'training-loop':
      return 'The weight matrices are shaped by a simple loop repeated billions of times: <strong>predict, measure error, adjust</strong>. Each cycle nudges the weights slightly toward better predictions. After enough cycles, the matrices encode the patterns of language — grammar, meaning, facts, and reasoning.';
    case 'history':
      return 'None of the ideas behind training are new. <strong>Gradient descent</strong> dates to the 1840s. <strong>Backpropagation</strong> was popularized in 1986. What changed in 2017 was the <strong>architecture</strong> — the transformer made it possible to scale these ideas to the models we use today.';
    case 'three-phases':
      return 'A model lives through <strong>three phases</strong>: pre-training (learn language from trillions of tokens), post-training (learn to be helpful and safe), and inference (use the frozen model to process new text). The weight matrices change during phases 1 and 2. During inference, they are <strong>frozen forever</strong>.';
    case 'frozen-vs-working':
      return 'This is the key distinction for understanding inference costs. The <strong>model weights</strong> are loaded once and shared — the same for every user. The <strong>KV cache</strong> is created fresh for every conversation and grows with every token. This is where the memory pressure comes from.';
    case 'bridge':
      return 'We know the weight matrices exist, we know they were learned, and we know they produce Q, K, V vectors. But how does the model actually decide that two words are <strong>relevant</strong> to each other? The answer is the <strong>dot product</strong> — and it\'s the subject of Stop 5.';
    default:
      return '';
  }
}

// --- Main Component ---

export default function LearningAttention() {
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
        {page.id === 'random-start' && <RandomStartPage />}
        {page.id === 'training-loop' && <TrainingLoopPage />}
        {page.id === 'history' && <HistoryPage />}
        {page.id === 'three-phases' && <ThreePhasesPage />}
        {page.id === 'frozen-vs-working' && <FrozenVsWorkingPage />}
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
