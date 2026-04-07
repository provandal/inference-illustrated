import { useState, useCallback, useEffect } from 'react';
import {
  PAGES,
  MODEL_DIMENSIONS,
  HEAD_SPECIALIZATIONS,
  CACHE_SCALING,
  GQA_COMPARISON,
} from '../data/stop8Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Narration text for each page ---

const NARRATIONS = {
  intro:
    '<strong>Stop 8: Why Multiple Heads?</strong> In Stop 7, we traced the complete attention pipeline for a single "head" \u2014 one set of W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub>. That head connected "faulty" to "storage controller" \u2014 a coreference pattern. But consider what other relationships exist in our sentence simultaneously: "crashed" needs to find its subject "server" (syntax), "last" modifies "week" (position), and "because" links cause and effect (causal). One set of weight matrices can only learn one pattern. The solution: run multiple attention computations in parallel.',

  'heads-divide':
    'Each head doesn\u2019t get a <strong>copy</strong> of the full embedding \u2014 it gets a <strong>slice</strong>. The model\u2019s embedding dimension d<sub>model</sub> is divided evenly among all heads, so d<sub>head</sub> = d<sub>model</sub> / n<sub>heads</sub>. For every Llama-3 model \u2014 8B, 70B, and 405B \u2014 d<sub>head</sub> is always 128. Bigger models don\u2019t give each head more dimensions; they add more heads.',

  specializations:
    'Different heads learn to track different linguistic relationships. Here are four heads attending to the same sentence, each capturing a pattern the others miss. These patterns <strong>emerge from training</strong> \u2014 heads aren\u2019t assigned roles by engineers.',

  reassembly:
    'After each head independently computes its attention output, the results are <strong>concatenated</strong> end-to-end and then multiplied by a learned output projection matrix W<sub>O</sub>. This blends each head\u2019s perspective into a single vector of dimension d<sub>model</sub>.',

  'cache-cost':
    'Multiple heads mean multiple Key and Value vectors per token \u2014 and every one must be cached. This is where multi-head attention meets the KV cache: the cache grows with the number of KV heads, the number of layers, and the context length. Modern models use <strong>Grouped-Query Attention (GQA)</strong> to share KV heads and reduce this cost.',

  gqa:
    'Not every Q head needs its own K and V. <strong>Grouped-Query Attention (GQA)</strong> lets groups of Q heads share a single set of K/V vectors, cutting cache size by 4\u20138x with minimal quality loss. Most modern models \u2014 Llama-3, Gemma, Mistral \u2014 use GQA.',

  bridge:
    '<strong>Looking ahead.</strong> Everything we\u2019ve seen so far happens in a single layer. Production transformers have 32 to 126 layers. And critically: every layer maintains its own KV cache. Stop 9 shows why stacking layers is worth this cost.',
};

// --- Page Content Components ---

function IntroPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>One head, one pattern</PanelHeader>
        <InfoBox>
          In Stop 7, we watched a single attention head connect &ldquo;faulty&rdquo;
          to &ldquo;storage controller&rdquo; &mdash; a <strong>coreference</strong> pattern.
          But our sentence carries many simultaneous relationships that one head cannot
          capture all at once.
        </InfoBox>
        <InfoBox>
          <strong>&ldquo;crashed&rdquo;</strong> needs to find its subject{' '}
          <strong>&ldquo;server&rdquo;</strong> (syntax).{' '}
          <strong>&ldquo;last&rdquo;</strong> modifies <strong>&ldquo;week&rdquo;</strong>{' '}
          (position). <strong>&ldquo;because&rdquo;</strong> links a cause to an
          effect (causal reasoning). Each of these is a different <em>kind</em> of
          relationship.
        </InfoBox>
        <InfoBox>
          A single set of W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub> weight matrices
          can only learn one pattern. The solution is
          straightforward: <strong>run multiple attention computations in parallel</strong>,
          each with its own weight matrices, each free to specialize in a different
          type of relationship.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message="<strong>Multi-head attention</strong> doesn't add new mechanisms &mdash; it runs the same Q/K/V pipeline from Stops 3&ndash;7 multiple times in parallel, each on a different slice of the embedding."
      />
    </div>
  );
}

function HeadsDividePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Slice, don&rsquo;t copy</PanelHeader>
        <InfoBox>
          Each head doesn&rsquo;t get a full copy of the embedding. Instead, the
          model&rsquo;s embedding dimension d<sub>model</sub> is <strong>divided
          evenly</strong> among all heads. Each head operates on its own slice of
          size d<sub>head</sub> = d<sub>model</sub> / n<sub>heads</sub>.
        </InfoBox>
        <InfoBox>
          For <strong>every</strong> Llama-3 model &mdash; 8B, 70B, and 405B &mdash;
          d<sub>head</sub> is always <strong>128</strong>. Bigger models don&rsquo;t
          give each head more dimensions. They add <strong>more heads</strong>.
        </InfoBox>
      </Panel>

      {/* Model dimensions table */}
      <Panel className="my-4">
        <PanelHeader>Llama-3 family: head dimensions</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <th className="text-left px-3 py-2 font-medium text-[var(--color-text-muted)]">Model</th>
                <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">d<sub>model</sub></th>
                <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">Q heads</th>
                <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">KV groups</th>
                <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">d<sub>head</sub></th>
                <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">Layers</th>
              </tr>
            </thead>
            <tbody>
              {MODEL_DIMENSIONS.map((row) => (
                <tr
                  key={row.model}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">{row.model}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.d_model.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.qHeads}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.kvGroups}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium text-[var(--color-primary-text)]">
                    {row.d_head}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.layers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>d<sub>head</sub> = 128 in all three models.</strong> Llama-3 8B has 32 Q heads, 70B has 64, and 405B has 128 &mdash; but each head always works with a 128-dimensional slice. The total compute scales with the number of heads, not the size of each head."
      />
    </div>
  );
}

function SpecializationsPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Four heads, one sentence</PanelHeader>
        <div className="p-4 space-y-3">
          {HEAD_SPECIALIZATIONS.map((head) => (
            <div
              key={head.name}
              className="p-3 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]"
            >
              <div className="text-[13px] font-medium text-[var(--color-text)] mb-1">
                {head.name}
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] mb-2">
                {head.description}
              </div>
              <div className="flex flex-wrap gap-2">
                {head.patterns.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[11px] font-mono"
                  >
                    <span className="text-[var(--color-text)]">{p.from}</span>
                    <span className="text-[var(--color-text-muted)]">&rarr;</span>
                    <span className="text-[var(--color-primary-text)] font-medium">{p.to}</span>
                    {p.weight !== null && (
                      <span className="text-[var(--color-text-muted)]">
                        ({(p.weight * 100).toFixed(0)}%)
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="warn"
        message="<strong>Honesty note:</strong> These specializations are simplified for illustration. Real attention heads rarely fall into clean categories. Heads develop messy, overlapping roles during training &mdash; they aren&rsquo;t assigned jobs by engineers, they <em>discover</em> useful patterns through gradient descent."
      />
    </div>
  );
}

function ReassemblyPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Concatenation + output projection</PanelHeader>
        <InfoBox>
          Each head produces an output vector of size d<sub>head</sub> (128 dimensions).
          With 64 heads in Llama-3 70B, that&rsquo;s 64 separate 128-dimensional
          vectors &mdash; one from the syntax head, one from the coreference head,
          one from the positional head, and so on.
        </InfoBox>
        <InfoBox>
          All head outputs are lined up <strong>end-to-end</strong> (concatenation),
          producing a single vector of size 64 &times; 128 = 8,192 &mdash; exactly
          d<sub>model</sub>. This is not a coincidence; the dimensions were designed
          to reconstruct the full embedding size.
        </InfoBox>
        <InfoBox>
          The concatenated vector is then multiplied by{' '}
          <strong>W<sub>O</sub></strong> (the output projection matrix), which learns
          how to blend different heads&rsquo; perspectives into a single output. Some
          heads&rsquo; contributions might be amplified, others dampened &mdash; W<sub>O</sub>{' '}
          decides.
        </InfoBox>
      </Panel>

      {/* Visual representation of concatenation */}
      <Panel className="my-4">
        <PanelHeader>The reassembly pipeline</PanelHeader>
        <div className="p-4 space-y-2.5">
          {[
            { num: 1, title: 'Head outputs', desc: 'Each head produces a 128-dim vector from its own Q/K/V computation.' },
            { num: 2, title: 'Concatenate', desc: 'Line up all head outputs end-to-end: [head_1 | head_2 | ... | head_n] = d_model dimensions.' },
            { num: 3, title: 'Multiply by W_O', desc: 'The output projection matrix blends heads\u2019 perspectives into a single d_model vector.' },
            { num: 4, title: 'Add residual', desc: 'The result is added back to the original input (residual connection from Stop 7).' },
          ].map((step) => (
            <div
              key={step.num}
              className="flex gap-3 items-start p-2.5 rounded-lg border bg-[var(--color-surface-muted)] border-[var(--color-border-light)]"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {step.num}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[var(--color-text)]">
                  {step.title}
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
        message="<strong>MultiHead(Q, K, V) = Concat(head<sub>1</sub>, ..., head<sub>n</sub>) &times; W<sub>O</sub></strong><br/>Each head independently runs the full attention pipeline (Stops 3&ndash;7). The concatenation + W<sub>O</sub> step is the only place where information flows between heads."
      />
    </div>
  );
}

function CacheCostPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The KV cache multiplication</PanelHeader>
        <InfoBox>
          Every KV head stores a Key vector and a Value vector for every token in the
          context &mdash; and it does this in <strong>every layer</strong>. The cache
          size per token is determined by a simple formula:
        </InfoBox>
        <InfoBox>
          <div className="font-mono text-[12px] bg-[var(--color-surface-muted)] px-3 py-2 rounded border border-[var(--color-border-light)] text-center">
            KV cache per token = 2 &times; layers &times; KV_heads &times; d<sub>head</sub> &times; precision
          </div>
        </InfoBox>
        <InfoBox>
          Llama-3 uses <strong>Grouped-Query Attention</strong> with 8 KV groups
          (instead of a full KV head per Q head), which is what makes the cache
          manageable. Without GQA, the 70B model would need 8&times; more cache.
        </InfoBox>
      </Panel>

      {/* Worked calculation */}
      <Panel className="my-4">
        <PanelHeader>Worked example: Llama-3 70B</PanelHeader>
        <div className="p-4 space-y-2">
          <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            <div className="font-mono text-[12px] space-y-1">
              <div className="flex gap-2">
                <span className="text-[var(--color-text-muted)] min-w-[100px] text-right">2</span>
                <span className="text-[var(--color-text-muted)]">&times;</span>
                <span className="text-[var(--color-text)]">80 layers</span>
              </div>
              <div className="flex gap-2">
                <span className="min-w-[100px]" />
                <span className="text-[var(--color-text-muted)]">&times;</span>
                <span className="text-[var(--color-text)]">8 KV heads</span>
              </div>
              <div className="flex gap-2">
                <span className="min-w-[100px]" />
                <span className="text-[var(--color-text-muted)]">&times;</span>
                <span className="text-[var(--color-text)]">128 dimensions</span>
              </div>
              <div className="flex gap-2">
                <span className="min-w-[100px]" />
                <span className="text-[var(--color-text-muted)]">&times;</span>
                <span className="text-[var(--color-text)]">2 bytes (FP16)</span>
              </div>
              <div className="border-t border-[var(--color-border-light)] mt-2 pt-2 flex gap-2">
                <span className="min-w-[100px] text-right text-[var(--color-text-muted)]">=</span>
                <span className="text-[var(--color-primary-text)] font-medium">
                  327,680 bytes &asymp; 320 KB per token
                </span>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Cache scaling table */}
      <Panel className="my-4">
        <PanelHeader>KV cache at scale</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <th className="text-left px-3 py-2 font-medium text-[var(--color-text-muted)]">Context length</th>
                <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">Llama-3 8B</th>
                <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">Llama-3 70B</th>
              </tr>
            </thead>
            <tbody>
              {CACHE_SCALING.map((row) => (
                <tr
                  key={row.context}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">
                    {row.context} tokens
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.llama8b}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.llama70b}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="warn"
        message="<strong>128K context on Llama-3 70B needs 40 GB just for the KV cache</strong> &mdash; that&rsquo;s an entire high-end GPU&rsquo;s memory, before you even load the model weights. This is why KV cache management is one of the central challenges of LLM deployment."
      />
    </div>
  );
}

function GqaPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Sharing K and V: MHA vs GQA vs MQA vs MLA</PanelHeader>
        <InfoBox>
          The original transformer gave every Q head its own K and V heads (MHA). But
          researchers discovered that Q heads can <strong>share</strong> K/V heads
          with surprisingly little quality loss &mdash; and massive cache savings.
        </InfoBox>
        <InfoBox>
          Most modern models use <strong>Grouped-Query Attention (GQA)</strong> because
          it preserves most of MHA&rsquo;s quality while cutting the KV cache by
          4&ndash;8&times;.
        </InfoBox>
      </Panel>

      {/* GQA comparison table */}
      <Panel className="my-4">
        <PanelHeader>Comparison of attention sharing strategies</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <th className="text-left px-3 py-2 font-medium text-[var(--color-text-muted)]">Method</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--color-text-muted)]">KV heads</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--color-text-muted)]">Cache</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--color-text-muted)]">Quality</th>
              </tr>
            </thead>
            <tbody>
              {GQA_COMPARISON.map((row) => (
                <tr
                  key={row.method}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.method === 'GQA'
                      ? 'bg-[var(--color-teal-bg)]'
                      : ''
                  }`}
                >
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium text-[var(--color-text)]">{row.method}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">{row.fullName}</div>
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)] align-top">
                    {row.kvHeads}
                  </td>
                  <td className="px-3 py-2 font-mono text-[var(--color-text-secondary)] align-top">
                    {row.cacheSize}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)] align-top">
                    {row.quality}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Notes per method */}
      <Panel className="my-4">
        <PanelHeader>Details</PanelHeader>
        {GQA_COMPARISON.map((row) => (
          <InfoBox key={row.method}>
            <strong>{row.method} ({row.fullName}):</strong>{' '}
            {row.notes}
          </InfoBox>
        ))}
      </Panel>

      <Callout
        type="good"
        message="<strong>GQA is the current sweet spot.</strong> Llama-3 uses 8 KV groups for all model sizes. With 64 Q heads and 8 KV groups, the 70B model needs only 1/8th the KV cache that MHA would require &mdash; without meaningful quality loss."
      />
    </div>
  );
}

function BridgePage() {
  return (
    <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3 mt-4">
      <p>
        Everything we&rsquo;ve seen so far &mdash; embedding, Q/K/V projections,
        dot-product scoring, softmax, value blending, multi-head parallelism,
        concatenation, output projection &mdash; happens in a{' '}
        <strong className="text-[var(--color-text)]">single layer</strong>.
      </p>
      <p>
        Production transformers have{' '}
        <strong className="text-[var(--color-text)]">32 to 126 layers</strong>.
        And critically: every layer maintains{' '}
        <strong className="text-[var(--color-text)]">its own KV cache</strong>.
        The 320 KB per token we calculated for Llama-3 70B already accounts for
        all 80 layers &mdash; that&rsquo;s 80 separate caches, each storing K
        and V vectors for every token.
      </p>
      <p>
        Why so many layers? Each layer refines the representation further.
        Early layers capture surface patterns (syntax, position). Middle layers
        build semantic relationships. Deep layers handle abstract reasoning and
        long-range dependencies.
      </p>
      <p>
        <strong className="text-[var(--color-text)]">Stop 9</strong> shows
        why stacking layers is worth this cost &mdash; and how the KV cache
        at every layer makes it all possible.
      </p>
    </div>
  );
}

// --- Main Component ---

export default function MultipleHeads() {
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
        {page.id === 'heads-divide' && <HeadsDividePage />}
        {page.id === 'specializations' && <SpecializationsPage />}
        {page.id === 'reassembly' && <ReassemblyPage />}
        {page.id === 'cache-cost' && <CacheCostPage />}
        {page.id === 'gqa' && <GqaPage />}
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
