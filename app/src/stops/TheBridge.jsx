import { useState, useCallback, useEffect } from 'react';
import {
  PAGES,
  CACHE_FORMULA,
  CACHE_SIZES,
  MEMORY_WALL_SCENARIOS,
  PREFILL_VS_DECODE,
  ACT2_PREVIEW,
} from '../data/stop10Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Narration text for each page ---

const NARRATIONS = {
  intro:
    '<strong>Stop 10: And Now, The Cache &mdash; The Bridge.</strong> Over nine stops we built the attention mechanism piece by piece. At every step, one structure has been growing in the background: the KV cache. Now it\u2019s time to put the full picture together.',

  'two-phases':
    'Inference has <strong>two fundamentally different phases</strong>: prefill and decode. Understanding the mechanical difference between them is the single most important concept for everything that follows.',

  'multi-turn':
    'In a multi-turn conversation, the model doesn\u2019t start from scratch each time you reply. The KV cache from previous turns persists &mdash; only the new tokens need processing. But what exactly does the cache store?',

  tradeoff:
    'The KV cache is a classic <strong>space-time tradeoff</strong>. Without it, generating each token requires recomputing attention over the entire context from scratch. With it, generation is fast &mdash; but the cache consumes memory that grows linearly with context length.',

  calculation:
    'Let\u2019s compute the exact size of the KV cache for Llama-3 70B. The formula involves every architectural parameter we\u2019ve discussed: layers, KV heads, head dimension, sequence length, and numerical precision.',

  'memory-wall':
    'A single H100 GPU has 80 GB of memory. After loading the model weights, what\u2019s left is all that exists for KV caches &mdash; and it runs out faster than you\u2019d expect. This is the <strong>memory wall</strong>.',

  infrastructure:
    'Prefill and decode have opposite computational profiles &mdash; one is compute-bound, the other is memory-bound. Running both on the same hardware means <strong>neither</strong> is optimized. This insight leads to a radical architectural decision.',

  bridge:
    'Act 1 is complete. You now understand why the KV cache exists, what it stores, how large it gets, and why it creates the central bottleneck of LLM inference. <strong>Act 2</strong> is about the engineering solutions.',
};

// --- Page Content Components ---

function IntroPage() {
  const stops = [
    { num: 1, title: 'The Telephone Problem', point: 'Sequential models lose information over distance.' },
    { num: 2, title: 'Every Token Looks at Every Token', point: 'Self-attention solves this, but at quadratic cost.' },
    { num: 3, title: 'Query, Key, Value', point: 'Each token plays three roles — and K and V must be stored.' },
    { num: 4, title: 'Learning to Pay Attention', point: 'Weight matrices learn what to attend to from data.' },
    { num: 5, title: 'The Dot Product', point: 'Similarity between Q and K becomes a number.' },
    { num: 6, title: 'Scaling & Softmax', point: 'Raw scores become probabilities that sum to 1.' },
    { num: 7, title: 'Blending the Values', point: 'Attention weights blend Value vectors into enriched output.' },
    { num: 8, title: 'Why Multiple Heads?', point: 'Parallel heads specialize — and GQA shares K/V to reduce cache.' },
    { num: 9, title: 'The Stack', point: '80 layers deep, each one reading from and writing to the cache.' },
  ];

  return (
    <div>
      <Panel>
        <PanelHeader>Nine stops, one destination</PanelHeader>
        <div className="p-4 space-y-2">
          {stops.map((s) => (
            <div
              key={s.num}
              className="flex gap-3 items-start text-[13px]"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {s.num}
              </span>
              <div className="min-w-0">
                <span className="font-medium text-[var(--color-text)]">{s.title}.</span>{' '}
                <span className="text-[var(--color-text-secondary)]">{s.point}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="note"
        message="At every step, one structure has been growing in the background: the <strong>KV cache</strong>. Keys and Values stored at every layer, for every token, across the entire context. Now it&rsquo;s time to put the full picture together &mdash; and understand why this structure dominates the cost of running large language models."
      />
    </div>
  );
}

function TwoPhasesPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Phase 1: Prefill</PanelHeader>
        <InfoBox>
          Your message arrives as part of a larger context &mdash; say, 2,000 tokens including
          the system prompt and conversation history. All 2,000 tokens enter the model{' '}
          <strong>simultaneously</strong>. At each of the 80 layers, every token gets its own
          Q, K, and V vectors computed by the layer&rsquo;s weight matrices.
        </InfoBox>
        <InfoBox>
          The K and V vectors are stored in that layer&rsquo;s cache. Each token&rsquo;s Q
          matches against all K vectors at its position or earlier &mdash; this is{' '}
          <strong>causal masking</strong>, the rule that prevents tokens from attending to the
          future.
        </InfoBox>
        <InfoBox>
          After all 80 layers, the cache holds <strong>655 MB</strong> of key-value data for
          those 2,000 tokens, computed in one burst. This phase is{' '}
          <strong>compute-bound</strong> &mdash; GPUs love it. The arithmetic units are fully
          utilized, processing thousands of tokens in parallel through massive matrix
          multiplications.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Token selection</PanelHeader>
        <InfoBox>
          After the final layer, an <strong>output projection</strong> converts the last
          token&rsquo;s representation into a score for every token in the vocabulary &mdash;
          128,256 entries for Llama-3. Softmax converts these scores into probabilities. A
          token is sampled from this distribution.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Phase 2: Decode</PanelHeader>
        <InfoBox>
          Now the model generates <strong>one token at a time</strong>. Each new token passes
          through all 80 layers. At each layer, it computes its own Q, K, V &mdash; then reads
          the <strong>entire cache</strong> for that layer to compute attention, and appends its
          new K and V entry.
        </InfoBox>
        <InfoBox>
          Layers cannot pipeline &mdash; layer 1 cannot start processing the next token while
          layer 80 is still working on the current one, because the next token&rsquo;s{' '}
          <strong>identity</strong> depends on layer 80&rsquo;s output. The model must finish
          the full 80-layer forward pass, select a token, and only then begin the next one.
        </InfoBox>
        <InfoBox>
          This phase is <strong>memory-bound</strong>. The GPU spends most of its time reading
          the cache from memory, not computing. For each new token, it reads hundreds of
          megabytes (or gigabytes) of cached K and V vectors, but performs only a tiny
          amount of arithmetic per byte read.
        </InfoBox>
      </Panel>

      <Callout
        type="warn"
        message="<strong>Prefill is compute-bound. Decode is memory-bound.</strong> This asymmetry is the root cause of nearly every optimization technique in Act 2. The same hardware cannot serve both phases efficiently &mdash; a fact with profound consequences for inference infrastructure."
      />
    </div>
  );
}

function MultiTurnPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Incremental prefill</PanelHeader>
        <InfoBox>
          When you send a follow-up message in a conversation, the model does not reprocess
          the entire history from scratch. The KV cache from previous turns{' '}
          <strong>already exists in GPU memory</strong>. Only the new tokens &mdash; your
          latest message &mdash; need to go through prefill. Their K and V vectors are computed
          and appended to the existing cache at each layer.
        </InfoBox>
        <InfoBox>
          This is why multi-turn conversations feel fast once the first response arrives. The
          initial prefill might process thousands of tokens, but each subsequent turn only
          processes the delta &mdash; the new tokens since the last turn.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>What the cache stores (and what it does not)</PanelHeader>
        <div className="p-4 space-y-3">
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)]">
              Stored
            </span>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              <strong className="text-[var(--color-text)]">Key vectors</strong> and{' '}
              <strong className="text-[var(--color-text)]">Value vectors</strong> &mdash; one
              pair per token, per layer, per KV head group. These are the projections computed
              by W<sub>K</sub> and W<sub>V</sub> at each layer.
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-red-bg)] border border-[var(--color-red)] text-[var(--color-red-text)]">
              Not stored
            </span>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              <strong className="text-[var(--color-text)]">Tokens</strong> themselves (just
              integer IDs, trivially small).{' '}
              <strong className="text-[var(--color-text)]">Embeddings</strong> (consumed by
              layer 1 and not needed again).{' '}
              <strong className="text-[var(--color-text)]">Query vectors</strong> (computed
              fresh for each new token and discarded after use &mdash; they never need to be
              looked up later).
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>Only K and V persist.</strong> The Query is ephemeral &mdash; it exists only for the current token&rsquo;s attention computation and is then discarded. Keys and Values must persist because every future token will need to attend to them."
      />
    </div>
  );
}

function TradeoffPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The space-time tradeoff</PanelHeader>
        <InfoBox>
          <strong>Without the cache:</strong> to generate the next token, the model must
          reprocess the entire context from scratch &mdash; recomputing every K and V at every
          layer for every previous token. The total compute per generated token scales as{' '}
          <strong>O(T&sup2;)</strong> where T is the context length, because each of the T
          tokens must attend to all T tokens.
        </InfoBox>
        <InfoBox>
          <strong>With the cache:</strong> only the new token passes through the model. It
          reads cached K and V vectors from all previous tokens, computes attention, and
          appends its own K and V. The compute per generated token scales as{' '}
          <strong>O(T)</strong> &mdash; linear, not quadratic. But the cache itself consumes{' '}
          <strong>O(T) memory</strong> that grows with every token generated.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Worked example: generating the 10,000th token</PanelHeader>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-[var(--color-red-bg)] border border-[var(--color-red)]">
              <div className="text-[11px] font-medium text-[var(--color-red-text)] uppercase tracking-wider mb-2">
                Without cache
              </div>
              <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed space-y-2">
                <p>
                  Reprocess all 10,000 tokens through 80 layers. Each token at each layer
                  computes Q, K, V and runs attention against all prior tokens.
                </p>
                <p className="font-mono text-[12px] text-[var(--color-text)]">
                  10,000 tokens &times; 80 layers &times; ~2 matmuls
                  = <strong>~1,600,000</strong> matrix operations
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
              <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider mb-2">
                With cache
              </div>
              <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed space-y-2">
                <p>
                  Process only the 1 new token through 80 layers. At each layer, read
                  cached K and V, compute attention, append new K and V.
                </p>
                <p className="font-mono text-[12px] text-[var(--color-text)]">
                  1 token &times; 80 layers &times; 2 matmuls
                  = <strong>160</strong> matrix operations
                </p>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>10,000&times; fewer operations</strong> &mdash; from 1.6 million matrix multiplications down to 160. The KV cache turns a quadratic nightmare into a linear scan. But that linear scan reads an enormous amount of data from memory, and the cache itself must be stored somewhere. That &ldquo;somewhere&rdquo; is GPU HBM &mdash; the scarcest resource in inference."
      />
    </div>
  );
}

function CalculationPage() {
  const { layers, kvHeads, dHead, precision, coefficient } = CACHE_FORMULA;

  return (
    <div>
      <Panel>
        <PanelHeader>The full formula</PanelHeader>
        <div className="p-4 space-y-3">
          <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            The KV cache stores <strong>two</strong> vectors (K and V) at every layer, for
            every KV head group, with each vector having d<sub>head</sub> dimensions, at the
            chosen numerical precision:
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] font-mono text-[13px] text-[var(--color-text)] text-center leading-loose">
            Cache = 2 &times; layers &times; KV_heads &times; d<sub>head</sub> &times; seq_len &times; precision
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Llama-3 70B coefficient</PanelHeader>
        <div className="p-4 space-y-3">
          <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            Plugging in the architectural parameters:
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] font-mono text-[12px] text-[var(--color-text)] text-center leading-loose">
            2 &times; {layers} layers &times; {kvHeads} KV heads &times; {dHead} d<sub>head</sub> &times; {precision} bytes
            = <strong>{coefficient.toLocaleString()} bytes per token</strong>
          </div>
          <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            That is roughly <strong>320 KB per token</strong>. Multiply by context length to
            get total cache size.
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Cache sizes by context length (FP16)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Context</th>
                <th className="px-4 py-2 text-right">8B</th>
                <th className="px-4 py-2 text-right">70B</th>
                <th className="px-4 py-2 text-left">Typical use</th>
              </tr>
            </thead>
            <tbody>
              {CACHE_SIZES.map((row) => (
                <tr
                  key={row.context}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-mono font-medium text-[var(--color-text)]">
                    {row.context}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.size8b}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-text)]">
                    {row.size70b}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                    {row.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="warn"
        message="<strong>These are per-user numbers.</strong> Every concurrent user gets their own KV cache. Serve 10 users at 8K context on a 70B model and the caches alone consume 25 GB &mdash; before counting the model weights themselves."
      />
    </div>
  );
}

function MemoryWallPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Scenario: Llama-3 70B on a single H100</PanelHeader>
        <InfoBox>
          An NVIDIA H100 has <strong>80 GB</strong> of HBM3 memory. Loading Llama-3 70B with
          FP4 quantized weights takes roughly <strong>35 GB</strong>. That leaves about{' '}
          <strong>45 GB</strong> for everything else &mdash; KV caches, activations, and
          operating overhead.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Can it fit?</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-right">Users</th>
                <th className="px-4 py-2 text-right">Context</th>
                <th className="px-4 py-2 text-right">Total cache</th>
                <th className="px-4 py-2 text-center">Fits?</th>
                <th className="px-4 py-2 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {MEMORY_WALL_SCENARIOS.map((row, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.fits
                      ? ''
                      : 'bg-[var(--color-red-bg)]'
                  }`}
                >
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text)]">
                    {row.users}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.context}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-text)]">
                    {row.cache}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                        row.fits
                          ? 'bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)]'
                          : 'bg-[var(--color-red-bg)] border border-[var(--color-red)] text-[var(--color-red-text)]'
                      }`}
                    >
                      {row.fits ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                    {row.note || '\u2014'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="warn"
        message="<strong>At full context, one user nearly fills the GPU.</strong> Two users at 128K are impossible. Even at shorter contexts, scaling to dozens of concurrent users exhausts memory quickly. This is the <strong>memory wall</strong> &mdash; the point where GPU memory, not compute, becomes the binding constraint. The memory wall isn&rsquo;t a future problem. It&rsquo;s the central operational challenge of running LLM inference today."
      />
    </div>
  );
}

function InfrastructurePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Prefill vs. decode: two different problems</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Property</th>
                <th className="px-4 py-2 text-left">Prefill</th>
                <th className="px-4 py-2 text-left">Decode</th>
              </tr>
            </thead>
            <tbody>
              {PREFILL_VS_DECODE.map((row) => (
                <tr
                  key={row.property}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">
                    {row.property}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                    {row.prefill}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                    {row.decode}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Disaggregated inference</PanelHeader>
        <InfoBox>
          If prefill is compute-bound and decode is memory-bound, running both on the same
          GPU means <strong>neither phase gets optimal hardware</strong>. Prefill wants maximum
          FLOPS &mdash; big GPUs with fast arithmetic units. Decode wants maximum memory
          bandwidth &mdash; or simply more total memory to hold caches for many users.
        </InfoBox>
        <InfoBox>
          The emerging solution is <strong>disaggregated inference</strong>: run prefill on
          compute-optimized hardware, then <strong>transfer the KV cache</strong> over the
          network to decode-optimized hardware. The cache becomes a data structure that must
          be serialized, transmitted, and deserialized &mdash; potentially many gigabytes
          per request.
        </InfoBox>
        <InfoBox>
          <strong className="text-[var(--color-text)]">
            And that is how the KV cache became a networking story.
          </strong>{' '}
          The cache is no longer just a GPU-local optimization. It is data in flight &mdash;
          shipped between machines, compressed for transit, paged into and out of memory,
          scheduled across clusters. The engineering challenges of LLM inference are
          fundamentally shaped by the size, structure, and lifecycle of the KV cache.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message="<strong>Two phases, two bottlenecks, two hardware profiles.</strong> This split is the organizing principle of modern inference infrastructure. Every technique in Act 2 &mdash; quantization, paging, batching, speculation, disaggregation &mdash; targets one side of this divide or the other."
      />
    </div>
  );
}

function BridgePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Act 1 complete</PanelHeader>
        <InfoBox>
          You now know what the KV cache is, why it exists, and why it matters. You&rsquo;ve
          seen how attention works &mdash; from the dot product through softmax to the
          weighted sum of Value vectors. You understand that multi-head attention multiplies
          the cache cost, that GQA reduces it, and that 80 layers of this structure create a
          memory footprint measured in gigabytes per user.
        </InfoBox>
        <InfoBox>
          You understand the two phases of inference &mdash; prefill and decode &mdash; and
          why they have opposite hardware requirements. You&rsquo;ve seen the memory wall:
          a single user at full context nearly fills an H100.
        </InfoBox>
        <InfoBox>
          <strong className="text-[var(--color-text)]">Act 2 is about what we do about
          it.</strong> The engineering techniques that make serving LLMs to millions of users
          economically viable &mdash; all of which center on managing the KV cache.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Coming in Act 2</PanelHeader>
        <div className="p-4 space-y-2.5">
          {ACT2_PREVIEW.map((item) => (
            <div
              key={item.stop}
              className="flex gap-3 items-start p-2.5 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {item.stop}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[var(--color-text)]">
                  {item.title}
                </div>
                <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                  {item.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>Welcome to the world of KV cache infrastructure.</strong> The attention mechanism you learned in Act 1 creates the data structure. Act 2 is about the systems engineering required to manage it at scale."
      />
    </div>
  );
}

// --- Main Component ---

export default function TheBridge() {
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
        {page.id === 'two-phases' && <TwoPhasesPage />}
        {page.id === 'multi-turn' && <MultiTurnPage />}
        {page.id === 'tradeoff' && <TradeoffPage />}
        {page.id === 'calculation' && <CalculationPage />}
        {page.id === 'memory-wall' && <MemoryWallPage />}
        {page.id === 'infrastructure' && <InfrastructurePage />}
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
