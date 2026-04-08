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
    '<strong>Stop 8: Why Multiple Heads?</strong> In Stop 7, the complete attention pipeline processed "faulty" through one set of W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub> &mdash; one attention "head." That head connected "faulty" to "storage controller," discovering a coreference pattern. But our sentence has many simultaneous relationships that one head cannot capture all at once.',

  'heads-divide':
    'Each head doesn\u2019t get a <strong>copy</strong> of the full embedding &mdash; it gets a <strong>slice</strong>. The model\u2019s embedding dimension d<sub>model</sub> is divided evenly among all heads, keeping total computation roughly constant while forcing each head to specialize on its portion.',

  specializations:
    'Different heads learn to track different linguistic relationships. No engineer assigns roles &mdash; specialization <strong>emerges from training</strong> because each head starts with different random weights and follows different gradient paths.',

  reassembly:
    'After each head independently computes its attention output, the results must merge back into a single vector the rest of the model can use. This takes two operations: <strong>concatenation</strong> and a learned <strong>output projection W<sub>O</sub></strong>.',

  'cache-cost':
    'Multiple heads mean multiple Key and Value vectors per token &mdash; and every one must be cached, in <strong>every layer</strong>. This is the pivotal moment where multi-head attention\u2019s power becomes infrastructure\u2019s burden. Let\u2019s calculate the real cost.',

  gqa:
    'If every Q head stored its own K and V, the cache would be unmanageable. The industry\u2019s answer: let groups of Q heads <strong>share</strong> K/V vectors. Three approaches have emerged, each trading expressiveness for memory.',

  bridge:
    '<strong>Looking ahead.</strong> Everything we\u2019ve seen so far &mdash; embedding, Q/K/V projections, dot-product scoring, softmax, value blending, multi-head parallelism, concatenation, output projection &mdash; happens in a <strong>single layer</strong>. Stop 9 shows what happens when you stack 80 of them.',
};

// --- Page Content Components ---

function IntroPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>One head, many relationships</PanelHeader>
        <InfoBox>
          The head we tracked in Stops 5&ndash;7 connected &ldquo;faulty&rdquo;
          to &ldquo;controller&rdquo; &mdash; a <strong>coreference</strong> pattern
          where an adjective finds the noun it describes across a clause boundary.
          But in the same sentence, other relationships are happening simultaneously
          that this head cannot capture:
        </InfoBox>

        {/* Concrete word-to-word relationships from the running example */}
        <div className="px-4 pb-2">
          <div className="space-y-2.5 px-3 py-3 bg-[var(--color-surface-muted)] rounded-md text-[13px]">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 font-medium text-[var(--color-text)] min-w-[70px]">Syntax</span>
              <span className="text-[var(--color-text-secondary)]">
                &ldquo;crashed&rdquo; needs to find its subject &ldquo;server&rdquo;
                &mdash; a verb-subject link that spans six words
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 font-medium text-[var(--color-text)] min-w-[70px]">Position</span>
              <span className="text-[var(--color-text-secondary)]">
                &ldquo;last&rdquo; modifies &ldquo;week&rdquo; &mdash; an adjacent-word
                pattern where proximity signals the relationship
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 font-medium text-[var(--color-text)] min-w-[70px]">Causal</span>
              <span className="text-[var(--color-text-secondary)]">
                &ldquo;because&rdquo; links cause and effect across the entire sentence
                &mdash; the crash happened because the controller was faulty
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 font-medium text-[var(--color-text)] min-w-[70px]">Semantic</span>
              <span className="text-[var(--color-text-secondary)]">
                &ldquo;server,&rdquo; &ldquo;storage,&rdquo; and &ldquo;controller&rdquo;
                form a domain cluster &mdash; all infrastructure hardware, regardless
                of position
              </span>
            </div>
          </div>
        </div>

        <InfoBox>
          A single set of W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub> weight matrices
          can only learn <strong>one</strong> pattern. A single W<sub>Q</sub> can only
          transform a word&rsquo;s embedding to ask one type of question. But language
          requires asking many different questions simultaneously. The solution:
          run multiple attention computations in parallel, each with its own weight
          matrices, each free to discover a different specialization.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message="<strong>No new mechanisms.</strong> Multi-head attention runs the same Q/K/V pipeline from Stops 3&ndash;7 multiple times in parallel, each on a different slice of the embedding. Everything you learned about one head &mdash; dot products, softmax, value blending, residual connections &mdash; applies identically inside every head."
      />
    </div>
  );
}

function HeadsDividePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Grounding d<sub>model</sub></PanelHeader>
        <InfoBox>
          In Stop 3, when embeddings were transformed into Q, K, and V vectors,
          we described the embedding as &ldquo;a vector of N numbers&rdquo; and
          named that N the <strong>model dimension (d<sub>model</sub>)</strong>.
          Now we can put concrete values on it. d<sub>model</sub> is a fixed
          architectural constant &mdash; every token, in every layer, is represented
          as a vector of exactly d<sub>model</sub> numbers.
        </InfoBox>
      </Panel>

      {/* Full d_model table with layers and KV groups */}
      <Panel className="my-4">
        <PanelHeader>Llama-3 family dimensions</PanelHeader>
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

      <Panel>
        <PanelHeader>Slice, don&rsquo;t copy</PanelHeader>
        <InfoBox>
          You might expect 64 heads to mean 64&times; the computation. It
          doesn&rsquo;t. Instead of giving each head the full 8,192-number
          embedding, the model <strong>slices</strong> it into equal pieces. For
          Llama-3 70B: 8,192 &divide; 64 = <strong>128</strong> numbers per head.
          This slice is the <strong>head dimension (d<sub>head</sub>)</strong>.
        </InfoBox>
        <InfoBox>
          Remember in Stop 5 when we said &ldquo;real Q and K vectors have 128
          dimensions&rdquo;? Now you can see where that number comes from &mdash;
          it&rsquo;s d<sub>model</sub> &divide; n<sub>heads</sub>. And here is
          a striking fact: <strong>d<sub>head</sub> = 128 across all three
          models</strong>. The 8B, 70B, and 405B all give each head the same
          128-number slice. Bigger models don&rsquo;t give each head more
          dimensions &mdash; they add <strong>more heads</strong>.
        </InfoBox>
      </Panel>

      <Panel className="my-4">
        <PanelHeader>Why slice instead of copy?</PanelHeader>
        <div className="p-4 space-y-2.5">
          <div className="flex gap-3 items-start p-2.5 rounded-lg border bg-[var(--color-surface-muted)] border-[var(--color-border-light)]">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
              1
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[var(--color-text)]">
                Efficiency
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                Each head has its own W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub> &mdash;
                but these are smaller matrices. Instead of transforming an 8,192-number
                vector, each transforms a 128-number slice. The total computation across
                all 64 heads is roughly the same as one head operating on the full embedding.
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-start p-2.5 rounded-lg border bg-[var(--color-surface-muted)] border-[var(--color-border-light)]">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
              2
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[var(--color-text)]">
                Forced specialization
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                Each head sees only a portion of the information. It must learn to
                make the most of its slice, which pushes different heads toward
                different strategies &mdash; like assigning smaller territories to
                scouts, forcing each to know their area deeply rather than covering
                everything shallowly.
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>d<sub>head</sub> = 128 has a direct cache consequence.</strong> The head dimension is also the size of each K and V vector stored in the KV cache. Because d<sub>head</sub> is constant across all Llama-3 models, the cache per-head is constant. Total cache scales with the number of heads and the number of layers &mdash; not the size of each head."
      />
    </div>
  );
}

function SpecializationsPage() {
  return (
    <div>
      {/* Honesty disclosure BEFORE the visualization */}
      <Callout
        type="warn"
        message="<strong>Honesty note:</strong> The specializations below are simplified for illustration. Real attention heads rarely fall into clean categories. Many heads show mixed behavior, some focus on patterns we don&rsquo;t fully understand, and the same head can behave differently for different inputs. Research into head interpretability (e.g., Anthropic&rsquo;s work on circuits and features) is an active field. The key insight stands: different heads learn different things, and that diversity is what gives the model its power."
      />

      <Panel className="mt-4">
        <PanelHeader>Four heads, one sentence</PanelHeader>
        <InfoBox>
          Each head starts with different random weight matrices. During training,
          gradient descent (the process from Stop 4) pushes each in the direction
          that reduces prediction error. Because they start in different places and
          see different slices of the embedding, they converge on different
          specializations. Here are four patterns, all operating on our sentence
          simultaneously:
        </InfoBox>
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

      <Panel className="mt-4">
        <PanelHeader>Why specialization emerges</PanelHeader>
        <InfoBox>
          No one told the syntax head to learn syntax. It emerged because syntactic
          structure helps predict next words &mdash; and predicting next words is the
          training objective (Stop 4). Each head independently discovered that a
          certain kind of attention pattern reduces the loss. This is analogous to
          how neurons in the visual cortex specialize for edges, colors, or motion
          without being assigned those roles.
        </InfoBox>
      </Panel>
    </div>
  );
}

function ReassemblyPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Concatenation + W<sub>O</sub></PanelHeader>
        <InfoBox>
          Each head produces an output vector of size d<sub>head</sub> (128
          dimensions) &mdash; its own perspective on the token, shaped by
          whatever pattern it specialized in. For Llama-3 70B, that&rsquo;s 64
          separate 128-dimensional vectors: one from the syntax head, one from the
          coreference head, one from the positional head, and so on.
        </InfoBox>
      </Panel>

      {/* Reassembly pipeline */}
      <Panel className="my-4">
        <PanelHeader>The reassembly pipeline</PanelHeader>
        <div className="p-4 space-y-2.5">
          <div className="flex gap-3 items-start p-2.5 rounded-lg border bg-[var(--color-surface-muted)] border-[var(--color-border-light)]">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
              1
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[var(--color-text)]">
                Concatenate
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                Line up all head outputs end-to-end:
                [head<sub>1</sub> | head<sub>2</sub> | ... | head<sub>64</sub>].
                That&rsquo;s 64 &times; 128 = <strong>8,192</strong> numbers &mdash;
                exactly d<sub>model</sub>. Not a coincidence; the dimensions were
                designed to reconstruct the full embedding size.
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-start p-2.5 rounded-lg border bg-[var(--color-surface-muted)] border-[var(--color-border-light)]">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
              2
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[var(--color-text)]">
                Multiply by W<sub>O</sub>
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                Concatenation alone just stacks perspectives side by side &mdash;
                it doesn&rsquo;t integrate them. <strong>W<sub>O</sub></strong> (the
                output projection matrix, learned during training) learns which
                head combinations are useful. If Head&nbsp;A (syntax) and Head&nbsp;B
                (coreference) both found relevant information about &ldquo;faulty,&rdquo;
                W<sub>O</sub> learns to combine their insights &mdash; perhaps
                emphasizing coreference over syntax when predicting the next word
                after an adjective.
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-start p-2.5 rounded-lg border bg-[var(--color-surface-muted)] border-[var(--color-border-light)]">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
              3
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[var(--color-text)]">
                Add residual
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                The result is added back to the original input via the residual
                connection from Stop 7, preserving the token&rsquo;s identity while
                enriching it with context from all heads.
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader>Callback to Stop 4</PanelHeader>
        <InfoBox>
          In Stop 4, we said a single W<sub>Q</sub> matrix has roughly
          67 million numbers. Now you can see where that comes from. In Llama-3
          70B, there are 64 separate W<sub>Q</sub> matrices per layer (one per
          head), each of size d<sub>model</sub> &times; d<sub>head</sub> = 8,192
          &times; 128 &asymp; 1 million numbers. Across all 64 heads: 64 &times; 1
          million &asymp; <strong>67 million numbers</strong> for W<sub>Q</sub>
          alone. The same for W<sub>K</sub>, W<sub>V</sub>, and W<sub>O</sub>
          &mdash; so the attention mechanism in one layer has roughly
          268 million weight parameters, before counting the feed-forward network.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message="<strong>MultiHead(Q, K, V) = Concat(head<sub>1</sub>, ..., head<sub>n</sub>) &times; W<sub>O</sub></strong><br/>Each head independently runs the full attention pipeline (Stops 3&ndash;7). The concatenation + W<sub>O</sub> step is the only place where information flows <em>between</em> heads."
      />
    </div>
  );
}

function CacheCostPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The KV cache formula</PanelHeader>
        <InfoBox>
          In Stop 3, we learned that K and V are cached for every token so future
          tokens can look them up without recomputing. With multi-head attention,{' '}
          <strong>each KV head stores its own K and V</strong> &mdash; and it does
          this in every layer. Llama-3 doesn&rsquo;t use full MHA for K and V;
          it uses <strong>GQA</strong> (explained on the next page) with 8 KV groups
          instead of 64. That makes these numbers manageable &mdash; but still large.
        </InfoBox>
        <InfoBox>
          <div className="font-mono text-[12px] bg-[var(--color-surface-muted)] px-3 py-2 rounded border border-[var(--color-border-light)] text-center">
            KV cache per token = 2 (K+V) &times; layers &times; KV_heads &times; d<sub>head</sub> &times; precision
          </div>
        </InfoBox>
      </Panel>

      {/* Worked calculation — step by step */}
      <Panel className="my-4">
        <PanelHeader>Worked example: Llama-3 70B</PanelHeader>
        <div className="p-4 space-y-2">
          <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            <div className="font-mono text-[12px] space-y-1">
              <div className="flex gap-2">
                <span className="text-[var(--color-text-muted)] min-w-[100px] text-right">2</span>
                <span className="text-[var(--color-text-muted)]">&times;</span>
                <span className="text-[var(--color-text)]">
                  80 layers
                </span>
              </div>
              <div className="flex gap-2">
                <span className="min-w-[100px]" />
                <span className="text-[var(--color-text-muted)]">&times;</span>
                <span className="text-[var(--color-text)]">
                  8 KV heads (GQA groups, not the full 64)
                </span>
              </div>
              <div className="flex gap-2">
                <span className="min-w-[100px]" />
                <span className="text-[var(--color-text-muted)]">&times;</span>
                <span className="text-[var(--color-text)]">
                  128 dimensions (d<sub>head</sub>)
                </span>
              </div>
              <div className="flex gap-2">
                <span className="min-w-[100px]" />
                <span className="text-[var(--color-text-muted)]">&times;</span>
                <span className="text-[var(--color-text)]">
                  2 bytes (FP16 precision)
                </span>
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

      {/* Same for 8B for comparison */}
      <Panel className="my-4">
        <PanelHeader>Comparison: Llama-3 8B</PanelHeader>
        <div className="p-4 space-y-2">
          <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            <div className="font-mono text-[12px] space-y-1">
              <div className="flex gap-2">
                <span className="text-[var(--color-text-muted)] min-w-[100px] text-right">2</span>
                <span className="text-[var(--color-text-muted)]">&times;</span>
                <span className="text-[var(--color-text)]">
                  32 layers
                </span>
              </div>
              <div className="flex gap-2">
                <span className="min-w-[100px]" />
                <span className="text-[var(--color-text-muted)]">&times;</span>
                <span className="text-[var(--color-text)]">
                  8 KV heads
                </span>
              </div>
              <div className="flex gap-2">
                <span className="min-w-[100px]" />
                <span className="text-[var(--color-text-muted)]">&times;</span>
                <span className="text-[var(--color-text)]">
                  128 dimensions
                </span>
              </div>
              <div className="flex gap-2">
                <span className="min-w-[100px]" />
                <span className="text-[var(--color-text-muted)]">&times;</span>
                <span className="text-[var(--color-text)]">
                  2 bytes (FP16)
                </span>
              </div>
              <div className="border-t border-[var(--color-border-light)] mt-2 pt-2 flex gap-2">
                <span className="min-w-[100px] text-right text-[var(--color-text-muted)]">=</span>
                <span className="text-[var(--color-primary-text)] font-medium">
                  131,072 bytes &asymp; 128 KB per token
                </span>
              </div>
            </div>
          </div>
          <div className="text-[12px] text-[var(--color-text-secondary)] mt-2 leading-relaxed">
            The 70B model has 2.5&times; the cache per token compared to 8B &mdash;
            driven entirely by having 2.5&times; more layers (80 vs. 32). The KV
            head count and d<sub>head</sub> are identical.
          </div>
        </div>
      </Panel>

      {/* Cache scaling table */}
      <Panel className="my-4">
        <PanelHeader>Scaling by context length</PanelHeader>
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
              {[
                { context: 'Per token', llama8b: '128 KB', llama70b: '320 KB' },
                ...CACHE_SCALING,
              ].map((row) => (
                <tr
                  key={row.context}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">
                    {row.context}{row.context !== 'Per token' ? ' tokens' : ''}
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
        message="<strong>These are per-user numbers.</strong> Every concurrent conversation needs its own KV cache &mdash; the cached K and V vectors are specific to that conversation&rsquo;s tokens. Ten users at 8K tokens on Llama-3 70B means 25 GB of cache alone. At 128K tokens, a single user&rsquo;s cache (40 GB) consumes an entire H100&rsquo;s memory before you even load the model weights."
      />
    </div>
  );
}

function GqaPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>MHA vs GQA vs MQA vs MLA</PanelHeader>
        <InfoBox>
          The original transformer (2017) gave every Q head its own K and V heads
          &mdash; <strong>Multi-Head Attention (MHA)</strong>. Researchers discovered
          that Q heads can <strong>share</strong> K/V heads with surprisingly little
          quality loss and massive cache savings. Every Q head still asks its own
          question (its own W<sub>Q</sub>), but groups of heads search and read
          from the same K, V.
        </InfoBox>
      </Panel>

      {/* GQA comparison table */}
      <Panel className="my-4">
        <PanelHeader>Attention sharing strategies</PanelHeader>
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

      {/* Detailed notes per method */}
      <Panel className="my-4">
        <PanelHeader>How each approach works</PanelHeader>
        <InfoBox>
          <strong>MHA</strong> (GPT-3, early Llama): {GQA_COMPARISON[0].notes}{' '}
          For Llama-3 70B dimensions, full MHA would mean 64 K + 64 V vectors
          per layer &mdash; 32 KB per layer per token.
        </InfoBox>
        <InfoBox>
          <strong>GQA</strong> (Llama-3, Gemma, Mistral): {GQA_COMPARISON[1].notes}{' '}
          Llama-3 uses 8 KV groups for all model sizes. For the 70B: 64 Q heads
          &divide; 8 KV groups = 8 Q heads per group, each sharing one set of K, V.
          Cache per layer: 8 K + 8 V = 4 KB per token.
        </InfoBox>
        <InfoBox>
          <strong>MQA</strong> (PaLM, Falcon): {GQA_COMPARISON[2].notes}{' '}
          Just 1 K + 1 V per layer. Cache per layer: 512 bytes per token.
        </InfoBox>
        <InfoBox>
          <strong>MLA</strong> (DeepSeek-V2/V3): {GQA_COMPARISON[3].notes}{' '}
          Instead of storing K and V directly, compress them into a smaller latent
          vector and reconstruct on demand. Trades compute for memory &mdash; more
          arithmetic per token, but dramatically smaller cache.
        </InfoBox>
      </Panel>

      {/* The counterfactual that makes GQA's importance vivid */}
      <Panel className="my-4">
        <PanelHeader>The counterfactual: what if Llama-3 70B used full MHA?</PanelHeader>
        <InfoBox>
          With GQA (8 KV groups), we calculated{' '}
          <strong>320 KB per token</strong> and{' '}
          <strong>40 GB at full 128K context</strong>.
        </InfoBox>
        <InfoBox>
          If Llama-3 70B used full MHA instead of GQA, it would need 64 KV heads
          instead of 8 &mdash; <strong>8&times; the cache</strong>:
        </InfoBox>
        <div className="px-4 pb-4">
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center gap-3 px-3 py-2 bg-[var(--color-surface-muted)] rounded-md">
              <span className="text-[var(--color-text-secondary)] min-w-[120px]">Per token</span>
              <span className="font-mono text-[var(--color-text-secondary)]">320 KB &rarr;</span>
              <span className="font-mono font-medium text-[var(--color-text)]" style={{ color: 'var(--color-amber)' }}>2.56 MB</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-[var(--color-surface-muted)] rounded-md">
              <span className="text-[var(--color-text-secondary)] min-w-[120px]">8K tokens</span>
              <span className="font-mono text-[var(--color-text-secondary)]">2.5 GB &rarr;</span>
              <span className="font-mono font-medium text-[var(--color-text)]" style={{ color: 'var(--color-amber)' }}>20 GB</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-[var(--color-surface-muted)] rounded-md">
              <span className="text-[var(--color-text-secondary)] min-w-[120px]">128K tokens</span>
              <span className="font-mono text-[var(--color-text-secondary)]">40 GB &rarr;</span>
              <span className="font-mono font-medium text-[var(--color-text)]" style={{ color: 'var(--color-amber)' }}>320 GB</span>
            </div>
          </div>
        </div>
        <InfoBox>
          320 GB for a single user&rsquo;s cache &mdash; that&rsquo;s{' '}
          <strong>four H100 GPUs</strong> just for the KV cache of one
          conversation. GQA is not a minor optimization. It is what makes serving
          these models possible at all.
        </InfoBox>
      </Panel>

      <Callout
        type="good"
        message="<strong>GQA is the current sweet spot.</strong> It preserves most of MHA&rsquo;s quality while cutting the KV cache by 8&times;. MLA (DeepSeek) pushes further with compression, trading compute for memory. Full treatment of these techniques comes in Act 2, Stop 14."
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
        Llama-3 70B has{' '}
        <strong className="text-[var(--color-text)]">80 layers</strong>, each
        with its own set of heads and its own KV cache. The 320 KB per token
        we calculated already accounts for all 80 layers &mdash; that&rsquo;s
        80 separate caches, each storing K and V vectors for every token. The
        cache multiplies by layer count.
      </p>
      <p>
        Why so many layers? Each layer takes the output of the previous layer
        and runs the full multi-head attention + feed-forward pipeline again.
        Early layers capture surface patterns (syntax, position). Middle layers
        build semantic relationships. Deep layers handle abstract reasoning and
        long-range dependencies. The representation gets progressively refined.
      </p>
      <p>
        <strong className="text-[var(--color-text)]">Stop 9</strong> shows
        why stacking layers is worth this cost &mdash; and how the feed-forward
        network in each layer digests what attention gathered.
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
