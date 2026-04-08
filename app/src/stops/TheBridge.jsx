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
    '<strong>Stop 10: And Now, The Cache &mdash; The Bridge.</strong> Over nine stops we assembled the transformer from the ground up. At every step, one structure has been growing in the background: the KV cache. Now it is time to trace how inference actually works &mdash; step by step, token by token &mdash; and confront what the cache costs.',

  'two-phases':
    'You send a 2,000-token message to a model like Claude or Llama. What happens next unfolds in two phases with fundamentally different computational profiles. Tracing the full mechanical sequence &mdash; from prompt entry through token selection to autoregressive generation &mdash; is the single most important concept for everything that follows.',

  'multi-turn':
    'You read the model&rsquo;s response and send a follow-up. The KV cache from the first exchange is still in GPU memory &mdash; nothing needs to be recomputed. Only the new tokens pass through prefill.',

  tradeoff:
    'The KV cache is a classic <strong>space-time tradeoff</strong>: spend memory to save computation. Without it, generating the 10,000th token would require 1.6 million matrix multiplications. With it: 160.',

  calculation:
    'Every architectural parameter we have discussed &mdash; layers, KV heads, head dimension, numerical precision &mdash; feeds into a single formula. For Llama-3 70B, the coefficient is 327,680 bytes per token. Multiply by context length to get total cache size.',

  'memory-wall':
    'A single NVIDIA H100 has 80 GB of memory. After loading FP4-quantized weights for a 70B model (~35 GB), roughly 45 GB remains. The table below shows how fast that fills up &mdash; and how few users it takes to exceed it.',

  infrastructure:
    'Prefill saturates the GPU&rsquo;s arithmetic units. Decode starves them while flooding the memory bus. Running both on the same hardware means neither is optimized &mdash; a mismatch with profound consequences.',

  bridge:
    'Act 1 is complete. You now understand why the KV cache exists, what it stores, how large it gets, and why it creates the central bottleneck of LLM inference. Act 2 is about what we do about it.',
};

// --- Page Content Components ---

function IntroPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Nine stops, one structure</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            <strong className="text-[var(--color-text)]">Embeddings</strong> give tokens
            a numerical identity (Stops 1, 3). <strong className="text-[var(--color-text)]">Q, K, V</strong> enable
            matching and information retrieval (Stops 3, 5, 6, 7). <strong className="text-[var(--color-text)]">Multi-head
            attention</strong> provides parallel perspectives (Stop 8). <strong className="text-[var(--color-text)]">FFN</strong> adds
            non-linear processing and stores learned knowledge (Stop 9). <strong className="text-[var(--color-text)]">Layers</strong> stack
            for progressive refinement (Stop 9). <strong className="text-[var(--color-text)]">Residual
            connections</strong> preserve information across depth (Stop 7).
          </p>
          <p>
            At every step, K and V vectors were cached. We first met the KV cache
            in Stop 3, when we learned that K and V are persistent while Q is
            ephemeral. We calculated its per-token size in Stop 8. We saw it
            multiply across layers in Stop 9.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Now it&rsquo;s time to put the
            full picture together.</strong>
          </p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Three questions</PanelHeader>
        <div className="p-4 space-y-2">
          {[
            'How does inference actually work, step by step?',
            'Why is the cache necessary?',
            'What happens when it outgrows the GPU\u2019s memory?',
          ].map((q, i) => (
            <div key={i} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-[var(--color-text)]">{q}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="note"
        message="This stop is the longest and most detailed in Act 1. It synthesizes everything from the previous nine stops into the central problem statement for the rest of the course. Take your time &mdash; every concept here will be referenced in Act 2."
      />
    </div>
  );
}

function TwoPhasesPage() {
  return (
    <div>
      {/* PREFILL */}
      <Panel>
        <PanelHeader>Phase 1: Prefill &mdash; processing the prompt</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Your message arrives as part of a larger context: system instructions +
            any conversation history + your new message. Say this totals{' '}
            <strong className="text-[var(--color-text)]">2,000 tokens</strong>. No KV cache
            exists yet &mdash; the conversation is just starting.
          </p>
          <p>
            All 2,000 tokens are processed <strong className="text-[var(--color-text)]">in parallel within each layer</strong>,
            but the layers themselves run sequentially &mdash; layer 1 must finish all 2,000 tokens
            before layer 2 can begin, because layer 2&rsquo;s input is layer 1&rsquo;s output.
            Here is what happens at each layer:
          </p>
        </div>

        <div className="px-4 pb-4 space-y-2">
          {[
            {
              num: '1',
              text: 'All 2,000 tokens are transformed through W_Q, W_K, W_V \u2014 producing 2,000 Q vectors, 2,000 K vectors, and 2,000 V vectors.',
            },
            {
              num: '2',
              text: 'All 2,000 K and V vectors are stored in that layer\u2019s KV cache.',
            },
            {
              num: '3',
              text: 'Each token\u2019s Q is compared against the K vectors of all tokens at its position or earlier. Token 1 sees only itself. Token 500 sees tokens 1\u2013500. Token 2,000 sees all 2,000. A token always attends to its own K \u2014 this ensures its identity contributes to the attention output alongside context from other tokens.',
            },
            {
              num: '4',
              text: 'Attention weights are computed via softmax (Stop 6), Values are blended using those weights (Stop 7), and the FFN processes each token (Stop 9). The 2,000 enriched representations flow into the next layer.',
            },
          ].map((step) => (
            <div key={step.num} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {step.num}
              </span>
              <span className="text-[var(--color-text-secondary)] leading-relaxed">{step.text}</span>
            </div>
          ))}
        </div>

        <InfoBox>
          The restriction in step 3 is called <strong>causal masking</strong>. The term
          &ldquo;causal&rdquo; comes from signal processing, where a &ldquo;causal
          system&rdquo; depends only on past and present inputs, never future ones.
          It does not refer to cause and effect &mdash; it refers
          to <strong>time-ordering</strong>. The mask enforces what would be true during
          real generation: when the model produces token N, tokens N+1, N+2, ...
          do not exist yet. During prefill, those future tokens <em>are</em> present
          (the user already typed them), but the mask is applied so the model produces
          the same result it would during step-by-step generation.
        </InfoBox>

        <InfoBox>
          After all 80 layers, the cache holds K and V vectors for all 2,000 tokens at
          all 80 layers &mdash; that is 2,000 &times; 80 layers &times; 8 KV groups
          &times; 128 d<sub>head</sub> &times; 2 bytes &times; 2 (K+V)
          = <strong>655 MB</strong>, computed in one parallel burst.
        </InfoBox>

        <InfoBox>
          All 2,000 tokens can be processed in parallel because they are
          all <em>known</em> &mdash; the user already typed them. The model does not
          need to wait for one token&rsquo;s output to know what the next token is.
          GPUs are built for exactly this kind of massive parallel matrix multiplication.
          Prefill is <strong>compute-bound</strong>: the bottleneck is arithmetic
          throughput, not memory bandwidth.
        </InfoBox>
      </Panel>

      {/* TOKEN SELECTION */}
      <Panel className="mt-4">
        <PanelHeader>How the first response token is selected</PanelHeader>
        <InfoBox>
          After prefill, the final layer produces a d<sub>model</sub>-sized vector
          (8,192 numbers for Llama-3 70B) for every token position. But only
          the <strong>last position</strong> matters for generation &mdash; thanks to
          causal masking, it is the only one that has attended to the entire prompt.
          Its representation encodes everything the model has seen.
        </InfoBox>

        <div className="px-4 pb-4 space-y-2">
          {[
            {
              num: '1',
              label: 'Output projection',
              text: 'A weight matrix of size d_model \u00d7 vocab_size (8,192 \u00d7 128,256 for Llama-3) multiplies the vector, producing a score for every token in the vocabulary. These scores are called logits \u2014 raw, unnormalized numbers. A high logit means the model considers that vocabulary entry a likely next token.',
            },
            {
              num: '2',
              label: 'Softmax',
              text: 'The same function from Stop 6, applied here to 128,256 logits instead of attention scores. It converts them into a probability distribution \u2014 128,256 probabilities summing to 1. "The" might be 0.12, "A" might be 0.08, "banana" might be 0.000001.',
            },
            {
              num: '3',
              label: 'Sampling',
              text: 'A token is selected from this distribution. The temperature parameter (from Stop 6) controls how: low temperature favors the highest-probability token, high temperature allows more variety, temperature 0 always picks the top token (greedy decoding).',
            },
          ].map((step) => (
            <div key={step.num} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)] text-xs font-medium flex items-center justify-center">
                {step.num}
              </span>
              <div className="text-[var(--color-text-secondary)] leading-relaxed">
                <strong className="text-[var(--color-text)]">{step.label}.</strong>{' '}
                {step.text}
              </div>
            </div>
          ))}
        </div>

        <InfoBox>
          The vocabulary is the fixed set of all tokens the model knows &mdash; 128,256
          for Llama-3. It is established before training and never changes. Every
          possible output is a selection from this vocabulary. The model cannot
          produce a token outside its vocabulary &mdash; this is why rare words get
          split into sub-word tokens (Stop 3).
        </InfoBox>
      </Panel>

      {/* DECODE */}
      <Panel className="mt-4">
        <PanelHeader>Phase 2: Decode &mdash; generating the response</PanelHeader>
        <InfoBox>
          Now the model generates the rest of the response, one token at a time.
          This is <strong>autoregressive generation</strong> &mdash; each new token
          depends on the prediction from the previous step.
        </InfoBox>

        <div className="px-4 pb-4 space-y-2">
          {[
            {
              num: '1',
              text: 'The selected first response token is embedded (looked up in the embedding table, producing a d_model-sized vector \u2014 the same process prompt tokens went through) and fed into Layer 1.',
            },
            {
              num: '2',
              text: 'This single new token computes its Q, K, V through the weight matrices. Its K and V are appended to the existing cache (which already has 2,000 entries at this layer). Its Q is compared against all 2,001 cached K vectors \u2014 including its own.',
            },
            {
              num: '3',
              text: 'The enriched representation passes through the FFN, then into Layer 2. The same process repeats at every layer: compute Q, K, V; append K, V to that layer\u2019s cache; attend to all cached K vectors; blend Values; FFN; pass to the next layer.',
            },
            {
              num: '4',
              text: 'The token must pass through all 80 layers before the next token can begin. There is no way to pipeline this \u2014 Layer 1 cannot start on the next token while Layer 2 works on the current one \u2014 because the next token\u2019s identity is determined by the output of Layer 80. It does not exist yet.',
            },
            {
              num: '5',
              text: 'After Layer 80, the last-position vector passes through the same output projection \u2192 softmax \u2192 sampling sequence. The selected token is embedded and fed back into Layer 1. The cycle repeats.',
            },
          ].map((step) => (
            <div key={step.num} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {step.num}
              </span>
              <span className="text-[var(--color-text-secondary)] leading-relaxed">{step.text}</span>
            </div>
          ))}
        </div>

        <InfoBox>
          Each decode step produces one token. To generate a 500-token response, the
          full 80-layer stack runs 500 times &mdash; sequentially. After those 500
          steps, the cache has grown from 2,000 to 2,500 tokens&rsquo; worth of K, V at
          every layer.
        </InfoBox>

        <InfoBox>
          Each new token&rsquo;s identity depends on the prediction at the previous step.
          The model cannot process token 2,002 until it knows what token 2,001 <em>is</em>.
          This inherent sequentiality is why generating long responses takes time, even on
          powerful hardware.
        </InfoBox>

        <InfoBox>
          Decode is <strong>memory-bound</strong>: each step involves only one new
          token&rsquo;s worth of matrix multiplications (fast), but as the token passes
          through each layer sequentially, it must <strong>read that layer&rsquo;s
          KV cache entries</strong> for all previous tokens to compute attention. Across
          all 80 layers, this means the entire cache is read once per decode step &mdash;
          but the access pattern is 80 sequential reads, one layer&rsquo;s portion at a time.
          As the cache grows, each decode step gets slower &mdash; there is more data to read
          from HBM. The GPU&rsquo;s arithmetic units are mostly idle, waiting for cache
          data to arrive from memory.
        </InfoBox>
      </Panel>

      <Callout
        type="warn"
        message="<strong>Prefill is compute-bound. Decode is memory-bound.</strong> The same hardware cannot serve both phases efficiently. This asymmetry is the root cause of nearly every optimization technique in Act 2."
      />
    </div>
  );
}

function MultiTurnPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Incremental prefill</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The context is now: system prompt + your first message + the model&rsquo;s
            response + your new second message. But the KV cache already contains K, V
            for everything through the model&rsquo;s response &mdash; those were computed
            during the first prefill and the subsequent decode steps.
          </p>
          <p>
            Only your <strong className="text-[var(--color-text)]">new tokens</strong> (the
            second message) need to go through prefill. This is <strong className="text-[var(--color-text)]">incremental
            prefill</strong>. The new tokens are processed through all 80 layers in
            parallel, and at each layer, their K and V are appended to the existing cache.
            When their Q vectors compute attention, they attend to the <strong className="text-[var(--color-text)]">entire
            cache</strong> &mdash; all the K vectors from the first exchange plus their own.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Nothing from the first exchange is
            recomputed.</strong> The cached K and V vectors from the system prompt, your
            first message, and the model&rsquo;s first response are all still there, still
            valid. The new tokens simply add to them.
          </p>
        </div>
      </Panel>

      {/* Conversation timeline */}
      <Panel className="mt-4">
        <PanelHeader>Conversation timeline</PanelHeader>
        <div className="p-4 space-y-2">
          {[
            { phase: 'First prefill', desc: 'System prompt + first message', color: 'var(--color-teal)', action: 'Cache fills' },
            { phase: 'First decode', desc: 'Model generates response', color: 'var(--color-blue)', action: 'Cache extends' },
            { phase: 'Second prefill', desc: 'New message only', color: 'var(--color-teal)', action: 'Cache extends' },
            { phase: 'Second decode', desc: 'Model generates second response', color: 'var(--color-blue)', action: 'Cache extends further' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-[13px]">
              <div
                className="flex-shrink-0 w-3 h-3 rounded-sm"
                style={{ background: item.color }}
              />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-[var(--color-text)]">{item.phase}</span>
                <span className="text-[var(--color-text-muted)]"> &mdash; {item.desc}</span>
              </div>
              <span className="flex-shrink-0 text-[12px] text-[var(--color-text-secondary)] italic">
                {item.action}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {/* What the cache stores */}
      <Panel className="mt-4">
        <PanelHeader>What the cache stores (and what it does not)</PanelHeader>
        <div className="p-4 space-y-3">
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)]">
              Stored
            </span>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              <strong className="text-[var(--color-text)]">Pre-computed K and V vectors</strong> &mdash; the
              results of multiplying each token&rsquo;s embedding by W<sub>K</sub> and
              W<sub>V</sub> at each layer. One pair per token, per layer, per KV head group.
              When a new token attends to the cache, it reads K vectors (to compute attention
              scores) and V vectors (to blend information). It does not re-process earlier
              tokens. Those tokens&rsquo; contributions are fully captured in their cached K and V.
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
              Layer 1 and not needed again).{' '}
              <strong className="text-[var(--color-text)]">Q vectors</strong> (computed fresh
              for each new token and discarded after use &mdash; they never need to be
              looked up later).
            </div>
          </div>
        </div>
      </Panel>

      <InfoBox>
        This is exactly why the KV cache exists: <strong>to avoid recomputation</strong>.
        Without it, every time the model generates a new token, it would need to run all
        previous tokens through W<sub>K</sub> and W<sub>V</sub> again at every layer &mdash;
        just to reconstruct the K and V vectors it already computed. With 2,500 tokens in
        the conversation and 80 layers, that&rsquo;s <strong>200,000 matrix
        multiplications</strong> the cache eliminates.
      </InfoBox>

      <Callout
        type="note"
        message="<strong>The cache must persist.</strong> It must stay in GPU memory for the duration of the conversation. It cannot be discarded after each turn because the next turn needs it. And it grows with every token &mdash; your messages, the model&rsquo;s responses, all accumulating."
      />
    </div>
  );
}

function TradeoffPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>O(T&sup2;) becomes O(T)</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            <strong className="text-[var(--color-text)]">Without the cache,</strong> every
            decode step requires recomputing K and V for all previous tokens. At step N,
            that is N&minus;1 tokens &times; 2 (K+V) &times; 80 layers of matrix
            multiplications &mdash; just to reconstruct what was already computed in
            previous steps. Total computation across a generation of T tokens:
            proportional to <strong>T&sup2;</strong> (the sum 1 + 2 + 3 + ... + T&minus;1).
            The same quadratic scaling from Stop 2 &mdash; now applied to compute cost,
            not attention scores.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">With the cache,</strong> each decode
            step computes only the new token&rsquo;s K and V (2 matrix multiplications per
            layer) and reads the existing cache. Total computation across T tokens:
            proportional to <strong>T</strong> &mdash; linear, not quadratic.
          </p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Worked example: generating the 10,000th token (Llama-3 70B)</PanelHeader>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-[var(--color-red-bg)] border border-[var(--color-red)]">
              <div className="text-[11px] font-medium text-[var(--color-red-text)] uppercase tracking-wider mb-2">
                Without cache
              </div>
              <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed space-y-2">
                <p>
                  Recompute K, V for all 9,999 previous tokens through all 80 layers.
                </p>
                <p className="font-mono text-[12px] text-[var(--color-text)]">
                  9,999 &times; 2 &times; 80
                  = 1,599,840 &asymp; <strong>1.6M</strong> matrix multiplications
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)]">
                  Read from memory: nothing (all recomputed from scratch)
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)]">
                  Bottleneck: compute (massive redundant arithmetic)
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
              <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider mb-2">
                With cache
              </div>
              <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed space-y-2">
                <p>
                  Process only the 1 new token through 80 layers. Read cached K and V
                  at each layer.
                </p>
                <p className="font-mono text-[12px] text-[var(--color-text)]">
                  1 &times; 2 &times; 80
                  = <strong>160</strong> matrix multiplications
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)]">
                  Read from memory: 9,999 entries per layer &times; 80 layers
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)]">
                  Bottleneck: memory bandwidth (reading the cache)
                </p>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>10,000&times; fewer K, V computations.</strong> The cache turns O(T&sup2;) compute into O(T) compute &mdash; at the cost of O(T) memory. For a 128K context, that is the difference between feasible and impossible. But that O(T) memory is not free &mdash; it must be stored in the scarcest resource in inference: GPU HBM."
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
          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] font-mono text-[13px] text-[var(--color-text)] text-center leading-loose">
            Cache = 2 &times; layers &times; KV_heads &times; d<sub>head</sub> &times; seq_len &times; precision
          </div>
          <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed space-y-1">
            <div className="flex gap-2">
              <span className="font-mono text-[var(--color-text)] min-w-[90px] text-right">2</span>
              <span>= K + V (both cached)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono text-[var(--color-text)] min-w-[90px] text-right">layers</span>
              <span>= number of transformer layers</span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono text-[var(--color-text)] min-w-[90px] text-right">KV_heads</span>
              <span>= number of KV head groups (GQA &mdash; Stop 8)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono text-[var(--color-text)] min-w-[90px] text-right">d<sub>head</sub></span>
              <span>= head dimension (128 for all Llama-3)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono text-[var(--color-text)] min-w-[90px] text-right">seq_len</span>
              <span>= total tokens processed so far (prompt + generated)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono text-[var(--color-text)] min-w-[90px] text-right">precision</span>
              <span>= bytes per number (2 for FP16, 1 for FP8)</span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Llama-3 70B: the coefficient</PanelHeader>
        <div className="p-4 space-y-3">
          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] font-mono text-[12px] text-[var(--color-text)] text-center leading-loose">
            2 &times; {layers} &times; {kvHeads} &times; {dHead} &times; {precision} bytes
            = <strong>{coefficient.toLocaleString()} bytes per token</strong> (~320 KB)
          </div>
          <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed space-y-2">
            <p>
              That coefficient &mdash; 327,680 bytes &mdash; is the amount of cache added
              for each additional token. This is the same per-token number from Stop 8;
              now you can see every factor in the formula and trace where each one comes from.
            </p>
            <div className="font-mono text-[12px] text-[var(--color-text)] space-y-1 pl-4">
              <div>At 1 token: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;327,680 &times; 1 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 320 KB</div>
              <div>At 1,000 tokens: &nbsp;327,680 &times; 1,000 &nbsp;&nbsp;&nbsp;= 320 MB</div>
              <div>At 128,000 tokens: 327,680 &times; 128,000 = <strong>40 GB</strong></div>
            </div>
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
                <th className="px-4 py-2 text-right">8B cache</th>
                <th className="px-4 py-2 text-right">70B cache</th>
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
        message="<strong>These are per-user numbers.</strong> Every concurrent conversation needs its own KV cache &mdash; the cached vectors are specific to that conversation&rsquo;s tokens. Ten concurrent users at 32K tokens each = 10 &times; 10 GB = <strong>100 GB</strong> of KV cache for the 70B model alone."
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
          An NVIDIA H100 has <strong>80 GB</strong> of HBM3 &mdash; <strong>High Bandwidth
          Memory</strong>, the GPU&rsquo;s main memory pool. Loading Llama-3 70B with FP4
          quantized weights takes roughly <strong>35 GB</strong>. That
          leaves <strong>45 GB</strong> for everything else &mdash; KV caches, activations,
          and operating overhead.
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
                    row.fits ? '' : 'bg-[var(--color-red-bg)]'
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

      <InfoBox>
        At full context, <strong>one user nearly fills the GPU.</strong> At typical
        conversation lengths (8K to 32K), you can serve a handful of users. At production
        scale &mdash; thousands of concurrent conversations &mdash; you run out of memory
        constantly.
      </InfoBox>

      <InfoBox>
        Consider Llama-3 70B at 32K tokens: the cache alone is <strong>10 GB</strong>.
        That 10 GB of cache is read at every single decode step, just to produce one token.
        And HBM is a <strong>shared resource</strong> &mdash; two tenants competing for the
        same pool: model weights and KV cache. Every gigabyte consumed by the cache is a
        gigabyte unavailable for serving additional users.
      </InfoBox>

      <Panel className="mt-4">
        <PanelHeader>When the wall is hit</PanelHeader>
        <div className="p-4 space-y-2">
          {[
            { label: 'Evict oldest conversation', detail: 'One user\u2019s cache disappears. They must re-prefill.' },
            { label: 'Reduce context window', detail: 'Conversation history is truncated. The model forgets.' },
            { label: 'Spill to slower memory', detail: 'Cache migrates to DRAM or NVMe. Latency increases.' },
            { label: 'Add more GPUs', detail: 'Cost increases. The cache must be distributed.' },
          ].map((option, i) => (
            <div key={i} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-5 h-5 rounded bg-[var(--color-red-bg)] border border-[var(--color-red)] text-[var(--color-red-text)] text-[10px] font-medium flex items-center justify-center">
                {i + 1}
              </span>
              <div className="text-[var(--color-text-secondary)] leading-relaxed">
                <strong className="text-[var(--color-text)]">{option.label}.</strong>{' '}
                {option.detail}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="warn"
        message="<strong>At full context, one user nearly fills the GPU.</strong> The <strong>memory wall</strong> &mdash; the point where KV cache demand exceeds available HBM &mdash; is not a future problem. It is the central operational challenge of running LLM inference today. Every production inference system is fundamentally a system for managing KV cache memory."
      />
    </div>
  );
}

function InfrastructurePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Prefill vs. decode: two different problems</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            <strong className="text-[var(--color-text)]">Prefill</strong> processes hundreds or
            thousands of tokens in parallel. The GPU&rsquo;s arithmetic units are fully
            saturated &mdash; every core is busy with matrix multiplications. The bottleneck
            is <strong className="text-[var(--color-text)]">compute throughput</strong>: how fast
            the GPU can multiply. Memory bandwidth matters less because the data being processed
            is compact relative to the computation performed on it.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Decode</strong> processes one token per
            step. The arithmetic per step is small &mdash; one token&rsquo;s Q, K, V computation
            plus one row of attention. But as the token passes through each layer, it must{' '}
            <strong className="text-[var(--color-text)]">read that layer&rsquo;s cached K and V
            entries</strong> for all previous tokens. Across all 80 layers, the total data read
            per decode step equals the full cache size. For Llama-3 70B at 32K tokens:{' '}
            <strong className="text-[var(--color-text)]">10 GB of cache read per
            decode step</strong>, just to produce one token. The GPU&rsquo;s arithmetic units are
            mostly idle, waiting for data to arrive from memory. The bottleneck
            is <strong className="text-[var(--color-text)]">memory bandwidth</strong>.
          </p>
        </div>
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
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Prefill wants maximum FLOPS &mdash; GPUs with fast arithmetic units, fully
            saturated by the parallel matrix multiplications of thousands of prompt tokens.
            Decode wants maximum memory bandwidth &mdash; or simply more total memory to
            hold caches for many users. A GPU optimized for one phase is not optimal for
            the other.
          </p>
          <p>
            This mismatch has led to <strong className="text-[var(--color-text)]">disaggregated
            inference</strong>: separating prefill and decode onto different hardware, each
            optimized for its phase. Prefill runs on compute-optimized GPU pools. Decode runs
            on bandwidth-optimized GPU pools.
          </p>
          <p>
            The catch: after prefill completes on GPU Pool A, the KV cache &mdash; potentially
            tens of gigabytes &mdash; must be <strong className="text-[var(--color-text)]">transferred
            over the network</strong> to GPU Pool B where decode will run. The speed of that
            transfer is a networking problem.
          </p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <div className="p-4">
          <div className="text-[15px] font-medium text-[var(--color-text)] text-center leading-relaxed py-3">
            And that is how the KV cache became a networking story.
          </div>
          <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mt-2">
            The cache is no longer just a GPU-local optimization. It is data in
            flight &mdash; shipped between machines, compressed for transit, paged into
            and out of memory, scheduled across clusters. The engineering challenges of
            LLM inference are fundamentally shaped by the size, structure, and lifecycle
            of the KV cache.
          </div>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>Two phases, two bottlenecks, two hardware profiles.</strong> This split is the organizing principle of modern inference infrastructure. Every technique in Act 2 targets one side of this divide or the other."
      />
    </div>
  );
}

function BridgePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Act 1: the complete picture</PanelHeader>
        <div className="p-4 space-y-2">
          {[
            { num: 1, text: 'Sequential models (RNNs) lose information over distance.' },
            { num: 2, text: 'Attention lets every token see every other token directly.' },
            { num: 3, text: 'Q, K, V separate matching, being found, and carrying information \u2014 and K, V must be stored.' },
            { num: 4, text: 'Weight matrices learn meaningful attention patterns through training.' },
            { num: 5, text: 'Dot products measure the alignment that training created.' },
            { num: 6, text: 'Scaling and softmax convert raw scores to proper weights.' },
            { num: 7, text: 'The weighted sum blends Values into context-enriched representations.' },
            { num: 8, text: 'Multiple heads provide parallel perspectives \u2014 and each stores its own K, V.' },
            { num: 9, text: 'Stacking layers enables progressive refinement \u2014 and each layer has its own cache.' },
            { num: 10, text: 'The resulting KV cache makes inference possible \u2014 and creates the central infrastructure challenge.' },
          ].map((item) => (
            <div key={item.num} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {item.num}
              </span>
              <span className="text-[var(--color-text-secondary)] leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>The thesis</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            <strong className="text-[var(--color-text)]">The KV cache is what makes modern LLMs
            possible.</strong> Without it, inference would be impossibly slow &mdash; O(T&sup2;)
            compute for every conversation. With it, inference is fast &mdash; O(T) compute.
            But fast is not free. The cache that enables speed creates a memory footprint that
            grows with every token, every user, every conversation.
          </p>
          <p>
            At production scale &mdash; thousands of concurrent users, long contexts, multiple
            models &mdash; KV cache management <em>is</em> the inference problem. Every other
            optimization operates within the constraints that the KV cache imposes.
          </p>
        </div>
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

      <Panel className="mt-4">
        <div className="p-4 text-center">
          <div className="text-[15px] font-medium text-[var(--color-text)] leading-relaxed">
            That&rsquo;s the story of the KV cache &mdash; and the beginning of Act 2.
          </div>
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
