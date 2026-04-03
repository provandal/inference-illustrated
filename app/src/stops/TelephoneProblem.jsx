import { useState, useCallback, useEffect } from 'react';
import {
  WORDS,
  SUBJECT_INDICES,
  TARGET_INDEX,
  HIDDEN_STATE,
  CALLOUTS,
  WORD_NARRATIONS,
  ATTENTION_DATA,
  barColor,
} from '../data/stop1Data';

const TOTAL_STEPS = 19; // 0=setup, 1=mech1, 2=mech2, 3-17=words, 18=done, 19=attention

function useDarkMode() {
  const [dark, setDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return dark;
}

// --- Sub-components ---

function StepNav({ step, totalSteps, onBack, onNext }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={onBack}
        disabled={step === 0}
        className="px-3.5 py-1.5 text-[13px] rounded border border-[var(--color-border)]
                   hover:bg-[var(--color-surface-alt)] disabled:opacity-30
                   disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        ← Back
      </button>
      <button
        onClick={onNext}
        disabled={step >= totalSteps}
        className="px-3.5 py-1.5 text-[13px] rounded border border-[var(--color-border)]
                   hover:bg-[var(--color-surface-alt)] disabled:opacity-30
                   disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        Next →
      </button>

      {/* Progress indicator — only during word processing */}
      {step >= 3 && step <= 17 && (
        <span className="text-xs font-mono text-[var(--color-text-muted)] ml-auto">
          word {step - 2} of 15
        </span>
      )}
    </div>
  );
}

function SentenceRow({ step }) {
  const isSetup = step === 0;
  const isMech = step === 1 || step === 2;
  const isDone = step >= 18;
  const wordIndex = step >= 3 && step <= 17 ? step - 3 : -1;

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
        } else {
          if (i < wordIndex)
            cls +=
              'bg-[var(--color-surface-alt)] border-[var(--color-border-light)] text-[var(--color-text-secondary)] ';
          else if (i === wordIndex)
            cls +=
              'bg-[var(--color-primary-bg)] border-[var(--color-primary)] text-[var(--color-primary-text)] font-medium ';
          else cls += 'border-transparent text-[var(--color-text)] opacity-28 ';
        }

        // Subject/target underlines
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
    <div
      className={`border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] ${className}`}
    >
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
              <span className="text-[9px] text-[var(--color-text-muted)]">
                ???
              </span>
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
        "{WORDS[wordIndex]}"
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
        <PanelHeader>
          Attention from "faulty" — direct lookup
        </PanelHeader>
        <div className="p-4">
          {ATTENTION_DATA.map(([label, value], i) => {
            const pct = Math.round((value / maxVal) * 100);
            const color =
              value >= 40
                ? isDark
                  ? '#5DCAA5'
                  : '#1D9E75'
                : value >= 10
                  ? isDark
                    ? '#85B7EB'
                    : '#378ADD'
                  : isDark
                    ? '#B4B2A9'
                    : '#888780';
            return (
              <div key={i} className="flex items-center gap-2 my-1 text-xs">
                <span
                  className={`min-w-[130px] text-right text-xs ${
                    value >= 40
                      ? 'font-medium text-[var(--color-text)]'
                      : 'text-[var(--color-text-secondary)]'
                  }`}
                >
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

// --- Main Component ---

export default function TelephoneProblem() {
  const [step, setStep] = useState(0);
  const isDark = useDarkMode();

  const go = useCallback(
    (delta) => {
      setStep((s) => Math.max(0, Math.min(TOTAL_STEPS, s + delta)));
    },
    []
  );

  const goBack = useCallback(() => go(-1), [go]);
  const goNext = useCallback(() => go(1), [go]);

  // Local keyboard nav for internal steps
  useEffect(() => {
    function handleKey(e) {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [go]);

  // Derived state
  const isSetup = step === 0;
  const isMech1 = step === 1;
  const isMech2 = step === 2;
  const isWord = step >= 3 && step <= 17;
  const isDone = step === 18;
  const isAttention = step === 19;
  const wordIndex = isWord ? step - 3 : isDone || isAttention ? 14 : -1;

  // Narration
  let narration = '';
  if (isSetup) {
    narration =
      '<strong>Stop 1: The Telephone Problem.</strong> Modern large language models — GPT, Claude, Llama — are built on an architecture called the <strong>transformer</strong>. To understand why transformers were a breakthrough, we need to see what came before them and why it broke down.';
  } else if (isMech1) {
    narration =
      'The hidden state is the <strong>only connection</strong> between words. Everything the model knows must be compressed into this one fixed-size vector. Press <strong>Next</strong> to see how the update works.';
  } else if (isMech2) {
    narration =
      'h<sub>new</sub> is the <strong>same size</strong> as h<sub>old</sub>. No matter how much information accumulates, it must fit in the same number of values. Something has to give. Press <strong>Next</strong> to see the result.';
  } else if (isWord) {
    narration = `<strong>"${WORDS[wordIndex]}"</strong> — ${WORD_NARRATIONS[wordIndex]}`;
  } else if (isDone) {
    narration =
      'All 15 words processed. The fixed-size hidden state couldn\'t hold the critical concept. <strong>Click the button below</strong> to see attention.';
  } else if (isAttention) {
    narration =
      '<strong>Attention eliminates the distance problem.</strong> But for every word to be lookupable, the model stores Key and Value vectors for each one. That storage is the <strong>KV cache</strong>, and its growth with sequence length is the central challenge of this course.';
  }

  return (
    <div>
      {/* Narration — always at top */}
      <div
        className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed
                    px-4 py-3 bg-[var(--color-surface-muted)] rounded-lg
                    border border-[var(--color-border-light)] mb-5"
        dangerouslySetInnerHTML={{ __html: narration }}
      />

      {/* Top nav */}
      <StepNav step={step} totalSteps={TOTAL_STEPS} onBack={goBack} onNext={goNext} />

      {/* Main content area */}
      <div className="mt-5 mb-5">

        {/* Sentence panel — always visible */}
        <Panel className="mb-5">
          <PanelHeader>
            {isSetup ? 'Read the following sentence' : 'Example sentence'}
          </PanelHeader>
          <SentenceRow step={step} />
        </Panel>

        {/* SETUP */}
        {isSetup && (
          <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3">
            <p>
              <strong className="border-b-[2.5px] border-b-[var(--color-amber)] pb-px text-[var(--color-text)]">
                storage controller
              </strong>{' '}
              (words 6–7) is what{' '}
              <strong className="border-b-[2.5px] border-b-[var(--color-primary)] pb-px text-[var(--color-text)]">
                faulty
              </strong>{' '}
              (word 15) describes. You parse that instantly.
            </p>
            <p>
              But what if you could only read{' '}
              <strong className="text-[var(--color-text)]">
                one word at a time
              </strong>
              , carrying everything in a fixed-size block of memory?
            </p>
            <p className="text-[var(--color-text-muted)]">
              Press <strong className="text-[var(--color-text)]">Next</strong>{' '}
              to find out.
            </p>
          </div>
        )}

        {/* MECHANICS 1: Hidden state */}
        {isMech1 && (
          <Panel>
            <PanelHeader>How the RNN works</PanelHeader>
            <InfoBox>
              The first word, <strong>"The"</strong>, is about to enter the
              model. Before we process it, let's understand the machinery.
            </InfoBox>
            <InfoBox>
              We're going to process this sentence using an{' '}
              <strong>RNN (Recurrent Neural Network)</strong> — the dominant
              architecture before transformers. An RNN reads text one word at a
              time, left to right, and carries its understanding forward through
              a <strong>hidden state</strong>.
            </InfoBox>
            <InfoBox>
              The hidden state is a <strong>vector</strong> — an ordered list of
              numbers (typically 512 to 1024 of them). This vector is the
              model's <strong>entire working memory</strong>. There's no separate
              memory bank, no way to look things up, no way to re-read an
              earlier word. Just this one vector, completely rewritten at every
              step.
            </InfoBox>
            <InfoBox>
              Before the first word, the hidden state is all zeros — a blank
              whiteboard.
            </InfoBox>
          </Panel>
        )}

        {/* MECHANICS 2: Update rule */}
        {isMech2 && (
          <div>
            <Panel className="mb-4">
              <PanelHeader>The update rule</PanelHeader>
              <div className="p-4">
                <div className="font-mono text-[13px] px-3.5 py-2.5 bg-[var(--color-surface-muted)] rounded-md text-[var(--color-text)] text-center">
                  h<sub>new</sub> = f( <strong>W</strong> × h<sub>old</sub> +{' '}
                  <strong>U</strong> × word )
                </div>

                <div className="flex items-center justify-center gap-2 my-4 flex-wrap">
                  <div className="px-2.5 py-1.5 rounded-md text-xs text-center leading-snug bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-[var(--color-text-secondary)] min-w-[80px]">
                    <div>
                      h<sub>old</sub>
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      previous state
                      <br />
                      (zeros — first word)
                    </div>
                  </div>
                  <span className="text-sm text-[var(--color-text-muted)]">+</span>
                  <div className="px-2.5 py-1.5 rounded-md text-xs text-center leading-snug bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] min-w-[80px]">
                    <div>"The"</div>
                    <div className="text-[10px] mt-0.5 opacity-70">
                      current word
                      <br />
                      (as an embedding)
                    </div>
                  </div>
                  <span className="text-sm text-[var(--color-text-muted)]">→</span>
                  <div className="px-2.5 py-1.5 rounded-md text-xs text-center leading-snug bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] text-[var(--color-text)] font-medium min-w-[90px]">
                    <div>W, U</div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 font-normal">
                      weight matrices
                    </div>
                  </div>
                  <span className="text-sm text-[var(--color-text-muted)]">→</span>
                  <div className="px-2.5 py-1.5 rounded-md text-xs text-center leading-snug bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)] min-w-[80px]">
                    <div>
                      h<sub>1</sub>
                    </div>
                    <div className="text-[10px] mt-0.5 opacity-70">
                      new hidden state
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader>Key concepts</PanelHeader>
              <InfoBox html={`The current word is first converted to an <strong>embedding</strong> — a vector that captures the word's meaning. Each word in the vocabulary has its own unique embedding, learned during training.`} />
              <InfoBox html={`Two separate <strong>weight matrices</strong> — grids of numbers — control how information mixes:<br/>• <strong>W</strong> controls how the old hidden state is carried forward — what to remember<br/>• <strong>U</strong> controls how the new word is incorporated — what to absorb<br/><br/>They're separate because these are different jobs. W decides how much old context survives; U decides how the new word gets mixed in.`} />
              <InfoBox html={`<strong>Where do W and U come from?</strong> They start as random numbers. During <strong>training</strong>, the model reads billions of sentences, predicts the next word, and when wrong, the error flows backward — <strong>backpropagation</strong> — nudging W and U to improve. After training, W and U encode the model's learned knowledge.<br/><br/><strong>Do they change during use?</strong> No. After training we switch to <strong>inference</strong> — W and U are frozen forever. Only the hidden state changes.`} />
            </Panel>
          </div>
        )}

        {/* WORD-BY-WORD PROCESSING */}
        {isWord && (
          <div>
            <CompactUpdatePill wordIndex={wordIndex} />
            <HiddenStateChain currentIndex={wordIndex} />

            {/* Honesty disclosure on first word */}
            {wordIndex === 0 && (
              <Callout
                type="note"
                message={`<strong>A note on what follows:</strong> The real hidden state is just numbers — no labels. What we show below is an interpretive approximation: our translation of what those numbers collectively encode. The decay pattern is real and well-documented in RNNs.`}
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
              <Callout
                type={CALLOUTS[wordIndex].type}
                message={CALLOUTS[wordIndex].message}
              />
            )}
          </div>
        )}

        {/* DONE */}
        {isDone && (
          <div>
            <div className="my-3 p-3 bg-[var(--color-surface-muted)] rounded-lg border border-[var(--color-border-light)]">
              <SectionLabel>All 15 hidden states</SectionLabel>
              <div className="flex items-center gap-1.5 flex-wrap">
                {WORDS.map((word, j) => (
                  <div key={j} className="flex items-center gap-1.5">
                    {j > 0 && (
                      <span className="text-[9px] text-[var(--color-text-muted)]">
                        →
                      </span>
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

            <Callout
              type="warn"
              message='<strong>"storage controller": 100% → 6%</strong> in 8 steps.'
            />

            <div className="mt-5 text-center">
              <button
                onClick={goNext}
                className="px-6 py-2.5 text-sm bg-[var(--color-primary)] text-white
                           rounded-lg hover:bg-[var(--color-primary-dark)]
                           transition-colors cursor-pointer"
              >
                See how attention solves this →
              </button>
            </div>
          </div>
        )}

        {/* ATTENTION REVEAL */}
        {isAttention && <AttentionView isDark={isDark} />}
      </div>

      {/* Bottom nav */}
      <StepNav step={step} totalSteps={TOTAL_STEPS} onBack={goBack} onNext={goNext} />
    </div>
  );
}
