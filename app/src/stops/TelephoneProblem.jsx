import { useState, useCallback, useEffect } from 'react';
import {
  WORDS,
  SUBJECT_INDICES,
  TARGET_INDEX,
  HIDDEN_STATE,
  CALLOUTS,
  WORD_NARRATIONS,
  ATTENTION_DATA,
  PAGES,
  barColor,
} from '../data/stop1Data';
import { useStore } from '../store';
import PageNav from '../components/PageNav';
import AnimationControls from '../components/AnimationControls';

// --- Helpers ---

function useDarkMode() {
  return useStore((s) => s.darkMode);
}

// --- Sub-components ---

function SentenceRow({ pageId, animStep }) {
  const isSetup = pageId === 'setup';
  const isMech = pageId === 'mech1' || pageId === 'mech2';
  const isDone = pageId === 'done' || pageId === 'attention';

  // During animation, animStep = word index (0-14)
  const wordIndex = pageId === 'animation' ? animStep : -1;

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-3">
      {WORDS.map((word, i) => {
        let cls =
          'px-2.5 py-1 text-[13px] rounded-[5px] border transition-all duration-300 leading-tight ';

        if (isDone) {
          cls += 'bg-[var(--color-surface-alt)] border-[var(--color-border-light)] text-[var(--color-text-secondary)] ';
        } else if (isSetup) {
          cls += 'border-transparent text-[var(--color-text)] ';
        } else if (isMech) {
          if (i === 0)
            cls +=
              'bg-[var(--color-primary-bg)] border-[var(--color-primary)] text-[var(--color-primary-text)] font-medium ';
          else cls += 'border-transparent text-[var(--color-text)] opacity-28 ';
        } else if (pageId === 'animation') {
          if (i < wordIndex)
            cls +=
              'bg-[var(--color-surface-alt)] border-[var(--color-border-light)] text-[var(--color-text-secondary)] ';
          else if (i === wordIndex)
            cls +=
              'bg-[var(--color-primary-bg)] border-[var(--color-primary)] text-[var(--color-primary-text)] font-medium ';
          else cls += 'border-transparent text-[var(--color-text)] opacity-28 ';
        }

        let underline = '';
        if (SUBJECT_INDICES.includes(i))
          underline = 'border-b-[2.5px] border-b-[var(--color-amber)] ';
        if (i === TARGET_INDEX)
          underline = 'border-b-[2.5px] border-b-[var(--color-primary)] ';

        return (
          <span key={i} className={cls + underline}>
            {word}
          </span>
        );
      })}
    </div>
  );
}

function Panel({ children, className = '' }) {
  return (
    <div className={`border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] ${className}`}>
      {children}
    </div>
  );
}

function PanelHeader({ children }) {
  return (
    <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] rounded-t-lg">
      <span className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
        {children}
      </span>
    </div>
  );
}

function InfoBox({ html, children, className = '' }) {
  const base = `px-4 py-3 text-[13px] leading-relaxed border-b border-[var(--color-border-light)] last:border-b-0 text-[var(--color-text-secondary)] ${className}`;
  if (html) {
    return <div className={base} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <div className={base}>{children}</div>;
}

function Callout({ type, message }) {
  const styles = {
    note: 'bg-[var(--color-blue-bg)] text-[var(--color-blue-text)] border-l-[var(--color-blue)] border-[var(--color-blue)]',
    warn: 'bg-[var(--color-red-bg)] text-[var(--color-red-text)] border-l-[var(--color-red)] border-[var(--color-red)]',
    good: 'bg-[var(--color-teal-bg)] text-[var(--color-teal-text)] border-l-[var(--color-teal)] border-[var(--color-teal)]',
  };
  return (
    <div
      className={`px-4 py-3 text-[13px] leading-relaxed my-4 rounded-r-lg border border-l-[3px] ${styles[type]}`}
      dangerouslySetInnerHTML={{ __html: message }}
    />
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2 mt-1">
      {children}
    </div>
  );
}

function HiddenStateBar({ concept, value, isKey, isDark }) {
  return (
    <div className="flex items-center gap-2 my-[3px] text-xs">
      <span
        className={`min-w-[140px] whitespace-nowrap overflow-hidden text-ellipsis
                    ${isKey ? 'font-medium text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}
      >
        {concept}
      </span>
      <div className="flex-1 h-3.5 bg-[var(--color-surface-muted)] rounded-[3px] overflow-hidden">
        <div
          className="h-full rounded-[3px] transition-[width] duration-500"
          style={{ width: `${value}%`, background: barColor(value, isDark) }}
        />
      </div>
      <span className="min-w-[30px] text-right font-mono text-[11px] text-[var(--color-text-muted)]">
        {value}%
      </span>
    </div>
  );
}

function HiddenStateChain({ currentIndex }) {
  return (
    <div className="my-3">
      <SectionLabel>Hidden state chain</SectionLabel>
      <div className="flex items-center gap-1.5 flex-wrap p-3 bg-[var(--color-surface-muted)] rounded-lg border border-[var(--color-border-light)]">
        {WORDS.slice(0, currentIndex + 1).map((word, j) => (
          <div key={j} className="flex items-center gap-1.5">
            {j > 0 && (
              <span className="text-[9px] text-[var(--color-text-muted)]">→</span>
            )}
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-[34px] h-[34px] rounded-md flex items-center justify-center
                            text-[9px] font-medium font-mono transition-all duration-300
                            ${
                              j < currentIndex
                                ? 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                                : 'border-[1.5px] border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-text)]'
                            }`}
              >
                h{j + 1}
              </div>
              <span className="text-[9px] text-[var(--color-text-muted)] max-w-[40px] text-center overflow-hidden text-ellipsis whitespace-nowrap">
                {word}
              </span>
            </div>
          </div>
        ))}
        {currentIndex < WORDS.length - 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-[var(--color-text-muted)]">→</span>
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-[34px] h-[34px] rounded-md flex items-center justify-center text-[9px] font-mono border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
                ?
              </div>
              <span className="text-[9px] text-[var(--color-text-muted)]">???</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CompactUpdatePill({ wordIndex }) {
  return (
    <div className="flex items-center gap-1.5 my-3 text-xs text-[var(--color-text-secondary)] flex-wrap justify-center
                    py-2.5 px-3 bg-[var(--color-surface-muted)] rounded-lg border border-[var(--color-border-light)]">
      <span className="px-2 py-[3px] rounded bg-[var(--color-surface)] border border-[var(--color-border-light)]">
        h<sub>{wordIndex}</sub>
        {wordIndex === 0 ? ' (zeros)' : ''}
      </span>
      <span className="text-[var(--color-text-muted)]">+</span>
      <span className="px-2 py-[3px] rounded bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] font-medium">
        &ldquo;{WORDS[wordIndex]}&rdquo;
      </span>
      <span className="text-[var(--color-text-muted)]">→ W, U →</span>
      <span className="px-2 py-[3px] rounded bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)]">
        h<sub>{wordIndex + 1}</sub>
      </span>
    </div>
  );
}

function AttentionView({ isDark }) {
  const maxVal = 48;
  return (
    <div>
      <Callout
        type="good"
        message={'<strong>With attention, "faulty" doesn\u2019t rely on the chain.</strong> It scores every word directly. No decay.'}
      />
      <Panel className="my-4">
        <PanelHeader>Attention from "faulty" — direct lookup</PanelHeader>
        <div className="p-4">
          {ATTENTION_DATA.map(([label, value], i) => {
            const pct = Math.round((value / maxVal) * 100);
            const color =
              value >= 40 ? (isDark ? '#5DCAA5' : '#1D9E75')
              : value >= 10 ? (isDark ? '#85B7EB' : '#378ADD')
              : (isDark ? '#B4B2A9' : '#888780');
            return (
              <div key={i} className="flex items-center gap-2 my-1 text-xs">
                <span className={`min-w-[130px] text-right text-xs ${
                  value >= 40 ? 'font-medium text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'
                }`}>
                  {label}
                </span>
                <div className="flex-1 h-[18px] bg-[var(--color-surface-muted)] rounded-[3px] overflow-hidden">
                  <div
                    className="h-full rounded-[3px] transition-[width] duration-500"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                <span className="min-w-[36px] text-right font-mono text-[11px] text-[var(--color-text-muted)]">
                  {value}%
                </span>
              </div>
            );
          })}
        </div>
      </Panel>
      <Callout
        type="good"
        message={`<strong>"storage controller" gets 48%.</strong> The model computes a <strong>Query</strong> vector for "faulty" (what am I looking for?) and compares it against a <strong>Key</strong> vector stored for every word (what do I contain?). The information comes from each word's <strong>Value</strong> vector (what do I carry?). Those Key and Value vectors must be <strong>stored</strong> for every word — that storage is the <strong>KV cache</strong>. How Q, K, V work is our next stop.`}
      />
    </div>
  );
}

// --- Page Content Components ---

function SetupPage() {
  return (
    <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3 mt-4">
      <p>
        Notice that the phrase{' '}
        <strong className="border-b-[2.5px] border-b-[var(--color-amber)] pb-px text-[var(--color-text)]">
          storage controller
        </strong>{' '}
        (words 6–7) is what{' '}
        <strong className="border-b-[2.5px] border-b-[var(--color-primary)] pb-px text-[var(--color-text)]">
          faulty
        </strong>{' '}
        (word 15) describes. As humans, we can parse this instantly.
      </p>
      <p>
        But what if you could only read{' '}
        <strong className="text-[var(--color-text)]">one word at a time</strong>{' '}
        and had to carry everything in a single fixed-size block of memory? Like
        a game of telephone, the message degrades as it passes through each step.
      </p>
    </div>
  );
}

function Mech1Page() {
  return (
    <Panel>
      <PanelHeader>How the RNN works</PanelHeader>
      <InfoBox>
        The first word, <strong>"The"</strong>, is about to enter the model.
        Before we process it, let's understand the machinery. The RNN reads
        text one word at a time, left to right, and carries its understanding
        forward through a <strong>hidden state</strong>.
      </InfoBox>
      <InfoBox>
        The hidden state is a <strong>vector</strong> — an ordered list of
        numbers (typically 512 to 1024 of them). This vector is the model's{' '}
        <strong>entire working memory</strong>. There's no separate memory bank,
        no way to look things up, no way to re-read an earlier word. Just this
        one vector, completely rewritten at every step.
      </InfoBox>
      <InfoBox>
        Before the first word, the hidden state is all zeros — a blank
        whiteboard.
      </InfoBox>
    </Panel>
  );
}

function Mech2Page() {
  return (
    <Panel>
      <PanelHeader>The Update Rule</PanelHeader>

      {/* 1. Explain the two inputs first */}
      <InfoBox html={`At each step, the RNN takes <strong>two inputs</strong> and combines them:<br/><br/><strong>h<sub>old</sub></strong> — the previous hidden state (what the model remembers so far)<br/><br/><strong>word</strong> — the current word, represented as an <strong>embedding</strong> — a vector that captures the word's meaning. Each word in the vocabulary has its own unique embedding, learned during training.`} />

      {/* 2. Explain weight matrices with WHY + consequence */}
      <InfoBox html={`These two inputs are transformed by two separate <strong>weight matrices</strong> — grids of numbers that control how information is mixed:<br/><br/>• <strong>W</strong> controls how the old hidden state is carried forward — what to remember<br/>• <strong>U</strong> controls how the new word is incorporated — what to absorb<br/><br/>They're separate because these are fundamentally different jobs. W decides how much of the old context survives; U decides how the new word gets mixed in. If you used one matrix for both, the model couldn't independently balance remembering vs. reading.`} />

      {/* 3. Formula — NOW a summary the user can parse */}
      <div className="px-4 py-4 border-b border-[var(--color-border-light)]">
        <div className="text-xs text-[var(--color-text-muted)] mb-2">Putting it together as a formula:</div>
        <div className="font-mono text-[14px] px-4 py-3 bg-[var(--color-surface-muted)] rounded-md text-[var(--color-text)] text-center">
          h<sub>new</sub> = f( <strong>W</strong> × h<sub>old</sub> +{' '}
          <strong>U</strong> × word )
        </div>
      </div>

      {/* 4. Visual diagram — reinforcement, not introduction */}
      <div className="px-4 py-4 border-b border-[var(--color-border-light)]">
        <div className="text-xs text-[var(--color-text-muted)] mb-2">Visually, for the first word "The":</div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className="px-2.5 py-1.5 rounded-md text-xs text-center leading-snug bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-[var(--color-text-secondary)] min-w-[80px]">
            <div>h<sub>old</sub></div>
            <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">previous state<br />(zeros — first word)</div>
          </div>
          <span className="text-sm text-[var(--color-text-muted)]">+</span>
          <div className="px-2.5 py-1.5 rounded-md text-xs text-center leading-snug bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] min-w-[80px]">
            <div>"The"</div>
            <div className="text-[10px] mt-0.5 opacity-70">current word<br />(as an embedding)</div>
          </div>
          <span className="text-sm text-[var(--color-text-muted)]">→</span>
          <div className="px-2.5 py-1.5 rounded-md text-xs text-center leading-snug bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] text-[var(--color-text)] font-medium min-w-[90px]">
            <div>W, U</div>
            <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 font-normal">weight matrices</div>
          </div>
          <span className="text-sm text-[var(--color-text-muted)]">→</span>
          <div className="px-2.5 py-1.5 rounded-md text-xs text-center leading-snug bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)] min-w-[80px]">
            <div>h<sub>1</sub></div>
            <div className="text-[10px] mt-0.5 opacity-70">new hidden state</div>
          </div>
        </div>
      </div>

      {/* 5. Training & inference lifecycle */}
      <InfoBox html={`<strong>Where do W and U come from?</strong> They start as random numbers before training begins. During <strong>training</strong>, the model reads billions of sentences, tries to predict the next word, and every time it's wrong, the error signal flows backward through the network — a process called <strong>backpropagation</strong> — nudging W and U slightly to make better predictions. After billions of these adjustments, W and U encode the model's learned knowledge of language.<br/><br/><strong>Do W and U change when we use the model?</strong> No. After training, we switch to <strong>inference</strong> — using the model to process new text. During inference, W and U are frozen forever. The same W and U process every sentence. Only the hidden state changes as words flow through.`} />

      {/* 6. The constraint — closing */}
      <InfoBox html={`<strong>The critical constraint:</strong> h<sub>new</sub> is the <strong>same size</strong> as h<sub>old</sub>. No matter how much information accumulates — subjects, verbs, relationships, context — it must all fit in the same fixed number of values. When new information enters, something old must be compressed or lost. This is the bottleneck we're about to watch in action.`} />
    </Panel>
  );
}

function AnimationPage({ animStep, isDark }) {
  const wordIndex = animStep;

  return (
    <div>
      <CompactUpdatePill wordIndex={wordIndex} />
      <HiddenStateChain currentIndex={wordIndex} />

      {wordIndex === 0 && (
        <Callout
          type="note"
          message={`<strong>A note about what you're seeing below:</strong> The real hidden state is just numbers — no labels, no compartments. What we're showing is an interpretive approximation: our best translation of what those numbers collectively encode. Think of it like an fMRI scan — useful for intuition, but the actual encoding is distributed. The decay pattern, however, is real and well-documented.`}
        />
      )}

      <Panel className="mt-3">
        <PanelHeader>
          Hidden state after "{WORDS[wordIndex]}" — what the model holds
        </PanelHeader>
        <div className="p-4">
          {HIDDEN_STATE[wordIndex].concepts.map(([concept, value], j) => (
            <HiddenStateBar
              key={j}
              concept={concept}
              value={value}
              isKey={concept === 'storage controller'}
              isDark={isDark}
            />
          ))}
        </div>
      </Panel>

      {CALLOUTS[wordIndex] && (
        <Callout type={CALLOUTS[wordIndex].type} message={CALLOUTS[wordIndex].message} />
      )}
    </div>
  );
}

function DonePage({ isDark }) {
  return (
    <div>
      <div className="my-3 p-3 bg-[var(--color-surface-muted)] rounded-lg border border-[var(--color-border-light)]">
        <SectionLabel>All 15 hidden states</SectionLabel>
        <div className="flex items-center gap-1.5 flex-wrap">
          {WORDS.map((word, j) => (
            <div key={j} className="flex items-center gap-1.5">
              {j > 0 && (
                <span className="text-[9px] text-[var(--color-text-muted)]">→</span>
              )}
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-[34px] h-[34px] rounded-md flex items-center justify-center text-[9px] font-medium font-mono border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
                  h{j + 1}
                </div>
                <span className="text-[9px] text-[var(--color-text-muted)] max-w-[40px] text-center overflow-hidden text-ellipsis whitespace-nowrap">
                  {word}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Panel>
        <PanelHeader>Final hidden state</PanelHeader>
        <div className="p-4">
          {HIDDEN_STATE[14].concepts.map(([concept, value], j) => (
            <HiddenStateBar
              key={j}
              concept={concept}
              value={value}
              isKey={concept === 'storage controller'}
              isDark={isDark}
            />
          ))}
        </div>
      </Panel>

      <Callout type="warn" message='<strong>"storage controller": 100% → 6%</strong> in 8 steps.' />
    </div>
  );
}

// --- Main Component ---

export default function TelephoneProblem() {
  const [pageIndex, setPageIndex] = useState(0);
  const [animStep, setAnimStep] = useState(0);
  const isDark = useDarkMode();

  const page = PAGES[pageIndex];
  const isAnimation = page.type === 'animation';

  // Narration text
  let narration = '';
  if (page.id === 'setup') {
    narration =
      '<strong>Stop 1: The Telephone Problem.</strong> Modern large language models — GPT, Claude, Llama — are built on an architecture called the <strong>transformer</strong>. To understand why transformers were a breakthrough, we need to see what came before them and why it broke down.';
  } else if (page.id === 'mech1') {
    narration =
      'Before transformers, the dominant architecture was the <strong>RNN</strong> — a model that reads one word at a time. Let\u2019s see how it works, and where it breaks down.';
  } else if (page.id === 'mech2') {
    narration =
      'Now that we know the RNN carries a single hidden state vector, let\u2019s see <strong>how it updates</strong> at each word — and why that fixed size becomes a problem.';
  } else if (page.id === 'animation') {
    narration = `<strong>"${WORDS[animStep]}"</strong> — ${WORD_NARRATIONS[animStep]}`;
  } else if (page.id === 'done') {
    narration =
      'The RNN processed all 15 words, rewriting its hidden state at every step. <strong>"storage controller"</strong> entered at 100% strength — but by the time <strong>"faulty"</strong> needed it, only <strong>6%</strong> remained. If the model had to answer "faulty <em>what</em>?" right now, the strongest candidate in the hidden state is "the technician" at 15% — not "storage controller." The chain of compressions didn\u2019t just weaken the right answer; it made the wrong answer more likely.';
  } else if (page.id === 'attention') {
    narration =
      'The RNN\u2019s problem is structural: information must flow through every intermediate step, decaying at each one. What if there were a different approach — one where "faulty" could skip the chain entirely and check every word in the sentence directly? Instead of relying on whatever survived the hidden state, each word could ask: "which other words in this sentence are most relevant to me?" and retrieve their information at full strength. This is the core idea behind <strong>attention</strong>, and it\u2019s the reason transformers replaced RNNs.';
  }

  // Page navigation
  const goToPage = useCallback((idx) => {
    setPageIndex(idx);
    setAnimStep(0); // Reset animation when changing pages
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

      {/* Sentence panel — always visible */}
      <Panel className="mb-5">
        <PanelHeader>
          {page.id === 'setup' ? 'Read the following sentence' : 'Example sentence'}
        </PanelHeader>
        <SentenceRow pageId={page.id} animStep={animStep} />
      </Panel>

      {/* Page content */}
      <div className="min-h-[200px]">
        {page.id === 'setup' && <SetupPage />}
        {page.id === 'mech1' && <Mech1Page />}
        {page.id === 'mech2' && <Mech2Page />}
        {page.id === 'animation' && <AnimationPage animStep={animStep} isDark={isDark} />}
        {page.id === 'done' && <DonePage isDark={isDark} />}
        {page.id === 'attention' && <AttentionView isDark={isDark} />}
      </div>

      {/* Animation controls — below content, only on animation page */}
      {isAnimation && (
        <AnimationControls
          currentStep={animStep}
          totalSteps={15}
          onStepChange={setAnimStep}
          stepLabel={`word ${animStep + 1} of 15: "${WORDS[animStep]}"`}
        />
      )}

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
        {isAnimation && ' · Arrow keys to step through words · Space to play/pause'}
      </div>
    </div>
  );
}
