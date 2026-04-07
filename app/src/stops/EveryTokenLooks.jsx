import React, { useState, useCallback, useEffect } from 'react';
import {
  WORDS,
  PAGES,
  ATTENTION_WEIGHTS,
  SCALING_DATA,
  attentionBarColor,
} from '../data/stop2Data';
import { useStore } from '../store';
import { Panel, PanelHeader, InfoBox, Callout, SectionLabel } from '../components/ui';
import PageNav from '../components/PageNav';

// --- Helpers ---

function useDarkMode() {
  return useStore((s) => s.darkMode);
}

function formatNumber(n) {
  if (n >= 1e12) return `${(n / 1e12).toLocaleString()}T`;
  if (n >= 1e9) return `${(n / 1e9).toLocaleString()}B`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString()}M`;
  return n.toLocaleString();
}

// --- Sub-components ---

/** Horizontal attention bar — similar to HiddenStateBar from Stop 1 */
function AttentionBar({ label, value, isDark }) {
  const color = attentionBarColor(value, isDark);
  const isStrong = value >= 30;
  return (
    <div className="flex items-center gap-2 my-[3px] text-xs">
      <span
        className={`min-w-[130px] text-right whitespace-nowrap overflow-hidden text-ellipsis
                    ${isStrong ? 'font-medium text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}
      >
        {label}
      </span>
      <div className="flex-1 h-[18px] bg-[var(--color-surface-muted)] rounded-[3px] overflow-hidden">
        <div
          className="h-full rounded-[3px] transition-[width] duration-500"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="min-w-[36px] text-right font-mono text-[11px] text-[var(--color-text-muted)]">
        {value}%
      </span>
    </div>
  );
}

/** Interactive sentence row — click a word to select it */
function InteractiveSentence({ selectedWord, onSelect }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-3">
      {WORDS.map((word, i) => {
        const isSelected = selectedWord === i;
        const isTarget =
          selectedWord !== null &&
          ATTENTION_WEIGHTS[selectedWord]?.targets.some((t) => t.index === i);

        let cls =
          'px-2.5 py-1 text-[13px] rounded-[5px] border transition-all duration-300 leading-tight cursor-pointer ';

        if (isSelected) {
          cls +=
            'bg-[var(--color-primary-bg)] border-[var(--color-primary)] text-[var(--color-primary-text)] font-medium ';
        } else if (isTarget) {
          cls +=
            'bg-[var(--color-teal-bg)] border-[var(--color-teal)] text-[var(--color-teal-text)] font-medium ';
        } else if (selectedWord !== null) {
          cls += 'border-transparent text-[var(--color-text)] opacity-40 ';
        } else {
          cls +=
            'border-[var(--color-border-light)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] ';
        }

        return (
          <span key={i} className={cls} onClick={() => onSelect(i)}>
            {word}
            {(i === 4 || i === 8) && (
              <sub className="text-[9px] text-[var(--color-text-muted)] ml-0.5">
                {i + 1}
              </sub>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** Fan-of-lines SVG connecting source word to attended words */
function AttentionLines({ selectedWord }) {
  if (selectedWord === null) return null;
  const data = ATTENTION_WEIGHTS[selectedWord];
  if (!data) return null;

  const totalWords = WORDS.length;
  const maxWeight = Math.max(...data.targets.map((t) => t.weight));

  return (
    <div className="relative w-full h-[60px] my-2">
      <svg
        viewBox={`0 0 ${totalWords * 60} 60`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {data.targets.map((t) => {
          const x1 = selectedWord * 60 + 30;
          const x2 = t.index * 60 + 30;
          const opacity = 0.3 + 0.7 * (t.weight / maxWeight);
          const strokeWidth = 1 + 3 * (t.weight / maxWeight);
          return (
            <line
              key={t.index}
              x1={x1}
              y1={5}
              x2={x2}
              y2={55}
              stroke="var(--color-primary)"
              strokeWidth={strokeWidth}
              opacity={opacity}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </div>
  );
}

/** Heatmap cell color — returns an rgba string based on weight */
function heatmapColor(weight, isDark) {
  if (isDark) {
    // Gold tones for dark mode
    const alpha = Math.min(weight / 65, 1);
    return `rgba(250, 199, 117, ${alpha})`;
  }
  // Blue tones for light mode
  const alpha = Math.min(weight / 65, 1);
  return `rgba(55, 138, 221, ${alpha})`;
}

/** Build a full 15x15 weight lookup from ATTENTION_WEIGHTS (sparse → dense) */
function buildFullMatrix() {
  const matrix = [];
  for (let row = 0; row < 15; row++) {
    const rowData = new Array(15).fill(0);
    const data = ATTENTION_WEIGHTS[row];
    if (data) {
      // Distribute remaining weight evenly across non-target cells for realism
      const targetSum = data.targets.reduce((s, t) => s + t.weight, 0);
      const remainder = 100 - targetSum;
      const nonTargetCount = 15 - data.targets.length;
      const baseWeight = nonTargetCount > 0 ? remainder / nonTargetCount : 0;

      for (let col = 0; col < 15; col++) {
        rowData[col] = baseWeight;
      }
      for (const t of data.targets) {
        rowData[t.index] = t.weight;
      }
    }
    matrix.push(rowData);
  }
  return matrix;
}

const FULL_MATRIX = buildFullMatrix();

// --- Page Content Components ---

function IntroPage() {
  return (
    <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3 mt-4">
      <p>
        In Stop 1, we watched an RNN struggle to connect{' '}
        <strong className="text-[var(--color-text)]">"faulty"</strong> back to{' '}
        <strong className="text-[var(--color-text)]">"storage controller"</strong>.
        Information decayed at every step of the chain — by the time the model needed it,
        the signal had faded to just 6%.
      </p>
      <p>
        Then we saw attention let{' '}
        <strong className="text-[var(--color-text)]">"faulty"</strong> look
        directly at every word, retrieving{' '}
        <strong className="text-[var(--color-text)]">"storage controller"</strong> at
        full strength. No chain, no decay.
      </p>
      <p>
        But that was just <strong className="text-[var(--color-text)]">one word</strong>{' '}
        looking backward. What does the full picture look like when{' '}
        <strong className="text-[var(--color-text)]">every word</strong> can look at{' '}
        <strong className="text-[var(--color-text)]">every other word</strong> — all at
        the same time?
      </p>
    </div>
  );
}

function SelfAttentionPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Self-Attention</PanelHeader>
        <InfoBox>
          In a transformer, every word simultaneously computes how relevant every
          other word is to it. This mechanism is called{' '}
          <strong>self-attention</strong> — the sequence attends to itself.
        </InfoBox>
        <InfoBox>
          Think of it as a room full of people, each one scanning the room and
          deciding who is most relevant to them, all at the same time. No chain.
          No telephone game. Everyone sees everyone directly.
        </InfoBox>
        <InfoBox>
          This is the key difference from the RNN we saw in Stop 1. The RNN
          processed words one at a time, compressing everything into a single
          hidden state that had to be passed forward. By the time "faulty"
          needed "storage controller," the signal had decayed through eight
          intermediate steps.
        </InfoBox>
        <InfoBox>
          With self-attention, there are no intermediate steps. "faulty" can
          look directly at "storage controller" — and at every other word in
          the sentence. Every word can do this simultaneously. No waiting,
          no compression, no loss.
        </InfoBox>
      </Panel>

      <Callout
        type="good"
        message='<strong>Self-attention replaces the chain with direct access.</strong> Instead of passing information through a bottleneck at every step, every word gets to examine every other word and decide for itself what matters.'
      />
    </div>
  );
}

function ExplorePage({ isDark }) {
  const [selectedWord, setSelectedWord] = useState(null);
  const data = selectedWord !== null ? ATTENTION_WEIGHTS[selectedWord] : null;

  return (
    <div>
      <Panel className="mb-4">
        <PanelHeader>
          {selectedWord !== null
            ? `Attention from "${WORDS[selectedWord]}"${selectedWord === 4 || selectedWord === 8 ? ` (word ${selectedWord + 1})` : ''}`
            : 'Click any word to explore its attention'}
        </PanelHeader>
        <InteractiveSentence selectedWord={selectedWord} onSelect={setSelectedWord} />

        {/* SVG lines removed — bar chart + narration below are clearer */}
      </Panel>

      {data && (
        <>
          <Panel className="mb-4">
            <PanelHeader>
              What "{WORDS[selectedWord]}" attends to
            </PanelHeader>
            <div className="p-4">
              {data.targets.map((t) => (
                <AttentionBar
                  key={t.index}
                  label={t.label}
                  value={t.weight}
                  isDark={isDark}
                />
              ))}
            </div>
          </Panel>

          <div
            className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed
                        px-4 py-3 bg-[var(--color-surface-muted)] rounded-lg
                        border border-[var(--color-border-light)]"
          >
            {data.narration}
          </div>
        </>
      )}

      {selectedWord === null && (
        <Callout
          type="note"
          message="<strong>Try it:</strong> Click any word in the sentence above to see where its attention flows. Each word attends to every other word, but some connections are much stronger than others."
        />
      )}
    </div>
  );
}

function MatrixPage({ isDark }) {
  const truncate = (w) => (w.length > 10 ? w.slice(0, 8) + '.' : w);
  return (
    <div>
      <Panel>
        <PanelHeader>The 15 x 15 Attention Matrix</PanelHeader>
        <div className="p-4 overflow-x-auto">
          <div
            className="inline-grid gap-px"
            style={{
              gridTemplateColumns: `80px repeat(${WORDS.length}, 1fr)`,
              minWidth: '600px',
            }}
          >
            {/* Header row: empty corner + column labels */}
            <div className="h-[40px]" />
            {WORDS.map((w, i) => (
              <div
                key={`col-${i}`}
                className="h-[60px] flex items-end justify-center text-[11px] text-[var(--color-text-muted)] pb-1 font-mono"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                {truncate(w)}
              </div>
            ))}

            {/* Data rows */}
            {WORDS.map((rowWord, row) => (
              <React.Fragment key={`row-${row}`}>
                {/* Row label */}
                <div
                  className="h-[28px] flex items-center justify-end pr-2 text-[11px] text-[var(--color-text-muted)] font-mono whitespace-nowrap"
                >
                  {truncate(rowWord)}
                </div>
                {/* Cells */}
                {FULL_MATRIX[row].map((weight, col) => (
                  <div
                    key={`${row}-${col}`}
                    className="h-[28px] rounded-[2px] transition-colors duration-200"
                    style={{
                      background: heatmapColor(weight, isDark),
                      minWidth: '28px',
                    }}
                    title={`${WORDS[row]} → ${WORDS[col]}: ${Math.round(weight)}%`}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Panel>

      <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3 mt-4">
        <p>
          This grid — called the <strong className="text-[var(--color-text)]">attention matrix</strong> —
          shows every word's attention to every other word, all computed simultaneously.
        </p>
        <p>
          Each <strong className="text-[var(--color-text)]">row</strong> is a word asking{' '}
          <em>"who matters to me?"</em> Each <strong className="text-[var(--color-text)]">column</strong> is
          a word being evaluated. The brighter the cell, the stronger the attention.
        </p>
        <p>
          Notice the bright spots along certain columns — "controller" and "storage"
          attract attention from many words because they are central to the sentence's
          meaning. The diagonal tends to be moderate — words attend somewhat to themselves,
          but the real information flows between different positions.
        </p>
      </div>

      <Callout
        type="note"
        message="<strong>Everything at once.</strong> The RNN computed one hidden state per word, sequentially. The attention matrix computes all of these relationships in parallel — every word evaluating every other word in a single step."
      />
    </div>
  );
}

function ScalingPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Quadratic Scaling: n x n Pairs</PanelHeader>
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Tokens
                </th>
                <th className="text-right py-2 text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Pairs (n²)
                </th>
                <th className="text-right py-2 text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider pl-4">
                  Scale
                </th>
              </tr>
            </thead>
            <tbody>
              {SCALING_DATA.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="py-2.5 font-mono text-[var(--color-text)]">
                    {row.tokens.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.pairs.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono text-[11px] text-[var(--color-text-muted)] pl-4">
                    {formatNumber(row.pairs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3 mt-4">
        <p>
          Our 15-word sentence requires{' '}
          <strong className="text-[var(--color-text)]">225 attention pairs</strong> — trivial.
          But scale up to a real conversation, and the numbers explode.
        </p>
        <p>
          At <strong className="text-[var(--color-text)]">128,000 tokens</strong> — roughly the
          context window of GPT-4 Turbo or Claude — the model must compute over{' '}
          <strong className="text-[var(--color-text)]">16 billion pairs</strong>. At a million
          tokens, it's a <strong className="text-[var(--color-text)]">trillion</strong>.
        </p>
        <p>
          This is <strong className="text-[var(--color-text)]">n² scaling</strong>: doubling the
          sequence length quadruples the work. Self-attention gives every word direct
          access to every other word, but that power comes at a steep computational cost.
        </p>
      </div>

      <Callout
        type="warn"
        message="<strong>This quadratic cost is one reason context windows have practical limits.</strong> Even with modern GPUs, there is a ceiling on how many tokens can attend to each other before the computation becomes prohibitively expensive."
      />
    </div>
  );
}

function ContextPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The Context Window</PanelHeader>
        <InfoBox>
          The <strong>context window</strong> is the maximum number of tokens a model
          can process at once. Everything the model can "see" must fit inside
          this window. If information falls outside it, the model simply doesn't
          know it exists.
        </InfoBox>
        <InfoBox>
          In practice, context = <strong>system prompt</strong> + <strong>conversation
          history</strong> + <strong>current message</strong>. The system prompt is
          the hidden instructions that tell the model how to behave. The conversation
          history is every message exchanged so far. And the current message is what
          you just typed.
        </InfoBox>
        <InfoBox>
          Every time you send a follow-up message, the context grows. The model
          re-processes the entire conversation from scratch — system prompt,
          all previous messages, and your new one — recomputing the full attention
          matrix each time. Nothing is "remembered" between calls; the model
          rebuilds its understanding from the full text every time.
        </InfoBox>
        <InfoBox>
          This means the attention matrix isn't computed once. It's computed on{' '}
          <strong>every single inference call</strong>. As the conversation grows,
          each response requires more computation than the last — because the
          attention matrix grows quadratically with the total context length.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message="<strong>Context window size is a design tradeoff.</strong> A larger window lets the model consider more information, but the quadratic cost of self-attention means doubling the window roughly quadruples the compute required. This tension — between seeing more and computing more — is a central challenge in modern LLM design."
      />
    </div>
  );
}

function BridgePage() {
  return (
    <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3 mt-4">
      <p>
        We've seen that self-attention lets every word look at every other word
        simultaneously, and that this produces an attention matrix of relevance
        scores. We've seen the quadratic cost this creates, and why context
        windows have limits.
      </p>
      <p>
        But we've been glossing over a critical question:{' '}
        <strong className="text-[var(--color-text)]">
          how does the model decide what's relevant?
        </strong>
      </p>
      <p>
        How does "faulty" <em>know</em> to attend to "storage controller"? It can't
        just compare the words as raw text — "faulty" and "controller" don't look
        similar as strings. The model needs a mechanism for computing relevance
        between any two words, regardless of their surface form.
      </p>
      <p>
        That mechanism involves{' '}
        <strong className="text-[var(--color-text)]">three separate roles</strong> that
        each word plays simultaneously:
      </p>
      <div className="flex flex-col gap-2 my-3 pl-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]">
            Query
          </span>
          <span className="text-[var(--color-text-secondary)]">— "What am I looking for?"</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)]">
            Key
          </span>
          <span className="text-[var(--color-text-secondary)]">— "What do I contain?"</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--color-amber-bg)] border border-[var(--color-amber)] text-[var(--color-amber-text)]">
            Value
          </span>
          <span className="text-[var(--color-text-secondary)]">— "What information do I carry?"</span>
        </div>
      </div>
      <p>
        Each word produces all three vectors. The Query of one word is compared
        against the Keys of every other word to produce the attention weights
        we've been exploring. Then those weights determine how much of each
        word's Value gets mixed into the result.
      </p>
      <p>
        Those Key and Value vectors need to be{' '}
        <strong className="text-[var(--color-text)]">stored</strong> for every word in
        the context — and that storage is the{' '}
        <strong className="text-[var(--color-text)]">KV cache</strong>, the topic at the
        heart of this entire tour.
      </p>

      <Callout
        type="good"
        message="<strong>Next stop:</strong> How Q, K, V actually work — the mechanism that turns raw word embeddings into the attention patterns you just explored."
      />
    </div>
  );
}

// --- Main Component ---

export default function EveryTokenLooks() {
  const [pageIndex, setPageIndex] = useState(0);
  const isDark = useDarkMode();

  const page = PAGES[pageIndex];

  // Narration text for each page
  let narration = '';
  if (page.id === 'intro') {
    narration =
      '<strong>Stop 2: Every Token Looks at Every Token.</strong> In Stop 1, we saw the telephone problem — information decaying through a chain. Attention solved that for one word. Now let\u2019s see what happens when <em>every</em> word gets that same power, all at the same time.';
  } else if (page.id === 'self-attention') {
    narration =
      'The mechanism that gives every word direct access to every other word has a name: <strong>self-attention</strong>. It\u2019s the foundation of the transformer architecture, and the reason these models can handle long-range dependencies that RNNs could not.';
  } else if (page.id === 'explore') {
    narration =
      'Time to see self-attention in action. Click any word in the sentence below to see <strong>where its attention flows</strong> — which words it considers most relevant, and why. Every word has its own pattern.';
  } else if (page.id === 'matrix') {
    narration =
      'Each word attending to every other word produces a grid of numbers — the <strong>attention matrix</strong>. For our 15-word sentence, that\u2019s a 15\u00d715 grid, with 225 attention scores computed simultaneously.';
  } else if (page.id === 'scaling') {
    narration =
      'A 15-word sentence means 225 attention pairs. But real conversations aren\u2019t 15 words. What happens when the sequence grows to thousands — or hundreds of thousands — of tokens?';
  } else if (page.id === 'context') {
    narration =
      'The attention matrix is computed over the model\u2019s <strong>context window</strong> — everything the model can see at once. Understanding what goes into that window is key to understanding the cost.';
  } else if (page.id === 'bridge') {
    narration =
      'We\u2019ve seen <em>what</em> self-attention does. But we haven\u2019t explained <em>how</em> the model decides what\u2019s relevant. That mechanism — <strong>Queries, Keys, and Values</strong> — is our next stop.';
  }

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

      {/* Sentence panel — visible on intro and self-attention pages */}
      {(page.id === 'intro' || page.id === 'self-attention') && (
        <Panel className="mb-5">
          <PanelHeader>Example sentence</PanelHeader>
          <div className="flex flex-wrap gap-1.5 px-4 py-3">
            {WORDS.map((word, i) => (
              <span
                key={i}
                className="px-2.5 py-1 text-[13px] rounded-[5px] border border-[var(--color-border-light)] text-[var(--color-text)] leading-tight"
              >
                {word}
              </span>
            ))}
          </div>
        </Panel>
      )}

      {/* Page content */}
      <div className="min-h-[200px]">
        {page.id === 'intro' && <IntroPage />}
        {page.id === 'self-attention' && <SelfAttentionPage />}
        {page.id === 'explore' && <ExplorePage isDark={isDark} />}
        {page.id === 'matrix' && <MatrixPage isDark={isDark} />}
        {page.id === 'scaling' && <ScalingPage />}
        {page.id === 'context' && <ContextPage />}
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
