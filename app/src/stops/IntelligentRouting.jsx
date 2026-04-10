import { useState, useCallback, useEffect } from 'react';
import {
  PAGES,
  ROUTING_COMPARISON,
  GPU_STATUS,
  SCORING_EXAMPLE,
  PREFIX_ROUTING_SAVINGS,
  PREFIX_BENCHMARKS,
  LLMD_STRATEGIES,
  LLMD_BENCHMARKS,
  LLMD_VS_DYNAMO,
  ROUTING_SCENARIOS,
  FEEDBACK_LOOP_STEPS,
  SUMMARY_TABLE,
} from '../data/stop16Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Narration text for each page ---

const NARRATIONS = {
  'round-robin-cost':
    'In our scenario, 32 concurrent users on 8 GPUs. User 17 has been chatting for 20 minutes. Their KV cache (8K tokens, 1.28 GB at FP8) is warm on Decode GPU 3. User 17 sends a follow-up message. A round-robin load balancer picks the next GPU in rotation &mdash; say, GPU 5. GPU 5 has no idea who User 17 is. It has no cached context. It must run full prefill on the entire conversation history: 8K tokens through all 80 layers. Cost: ~500 ms of GPU compute, consuming GPU 5&rsquo;s full capacity during that time. Meanwhile, GPU 3 has User 17&rsquo;s entire cache sitting in HBM, ready to go. If the request had gone to GPU 3, the follow-up would have needed only incremental prefill on the new message (~200 tokens, ~12 ms). The cache hit saves 488 ms of GPU compute and avoids blocking GPU 5&rsquo;s other users. One wrong routing decision. 40&times; more compute. And this happens on every request in a round-robin system.',

  'routing-decision':
    'A cache-aware router must answer three questions for every incoming request: Which GPU has the relevant cache? How loaded is that GPU? And is the cache benefit worth sending to a busier GPU? These questions are in tension. The GPU with the best cache match might also be the most loaded. The least loaded GPU might have no relevant cache at all. The router must balance these competing signals in real time, for every request.',

  'prefix-sharing':
    'So far we&rsquo;ve looked at routing for individual users &mdash; sending User 17 to the GPU that has User 17&rsquo;s cache. But there&rsquo;s a second, even more powerful optimization: recognizing when multiple users share the SAME tokens at the beginning of their prompts. To understand this, we need to define what a <strong>prefix</strong> is in the context of KV cache, and why it creates such a large opportunity for reuse.',

  'llm-d':
    'The <strong>llm-d</strong> project (Red Hat, Google Cloud, IBM Research, NVIDIA, CoreWeave) is the most mature open-source implementation of KV-cache-aware routing for Kubernetes-native inference. It achieved <strong>57&times; faster response times</strong> and <strong>2&times; throughput</strong> on identical hardware by replacing round-robin with intelligent scheduling. Here&rsquo;s how it works.',

  'dynamo-router':
    'NVIDIA Dynamo includes its own KV-aware routing layer, with some capabilities that complement or overlap with llm-d&rsquo;s approach. Here&rsquo;s how they compare.',

  'decision-tree':
    'Let&rsquo;s walk through the complete routing logic for several request types in our scenario, showing how the router handles each one differently.',

  'feedback-loop':
    'Routing doesn&rsquo;t just react to cache placement &mdash; it DRIVES cache placement. The router&rsquo;s decisions determine which GPUs accumulate which users&rsquo; caches. Over time, a well-tuned router creates natural cache affinity groups: sets of users whose conversations are co-located on the same GPU, maximizing cache reuse and minimizing cross-GPU transfers.',

  summary:
    'Intelligent routing turns the KV cache from a per-GPU optimization into a cluster-wide resource. The router is the control plane that connects everything from Stops 11 through 15: it decides which GPU gets the request (batching from Stop 11), whether it goes to prefill or decode pools (disaggregation from Stop 12), which tier the cache is retrieved from (hierarchy from Stop 13), and which fabric carries the data (protocols from Stop 15).',
};

// --- Page Content Components ---

function RoundRobinCostPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Round-robin vs. cache-aware routing &mdash; User 17&rsquo;s follow-up</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-left">Round-robin (GPU 5, no cache)</th>
                <th className="px-4 py-2 text-left">Cache-aware (GPU 3, cache hit)</th>
              </tr>
            </thead>
            <tbody>
              {ROUTING_COMPARISON.map((row) => (
                <tr
                  key={row.metric}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.highlight ? 'bg-[var(--color-red-bg)]' : ''
                  }`}
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.metric}</td>
                  <td className={`px-4 py-2 ${row.highlight ? 'font-bold text-[var(--color-red-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {row.roundRobin}
                  </td>
                  <td className={`px-4 py-2 ${row.highlight ? 'font-bold text-[var(--color-teal-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {row.cacheAware}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="warn"
        message="From Stop 13: a cache miss costs ~10&times; more than a hit when you factor in compute, stalling, and opportunity cost. In this example, it&rsquo;s even worse because the cache is <strong>right there on GPU 3</strong> &mdash; the system just didn&rsquo;t know to look."
      />

      <Panel className="mt-4">
        <PanelHeader>The blind spot</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Traditional load balancers don&rsquo;t know about KV cache. They see
            GPU utilization, queue depth, connection count. They don&rsquo;t see
            that GPU 3 has User 17&rsquo;s context and GPU 5 doesn&rsquo;t. This blindness
            is what makes standard load balancing fundamentally wrong for LLM inference.
          </p>
        </div>
      </Panel>

      {/* Visual: Two GPUs side-by-side */}
      <Panel className="mt-4">
        <PanelHeader>The wrong choice vs. the right choice</PanelHeader>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* GPU 5 — no cache */}
            <div
              className="rounded-lg border-2 p-3 text-center space-y-2"
              style={{ borderColor: 'var(--color-red)', background: 'var(--color-red-bg)' }}
            >
              <div className="text-[12px] font-bold" style={{ color: 'var(--color-red-text)' }}>
                GPU 5 (round-robin)
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)]">No User 17 cache</div>
              <div className="h-6 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] flex items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                empty &mdash; must recompute 8K tokens
              </div>
              <div className="text-[13px] font-mono font-bold" style={{ color: 'var(--color-red-text)' }}>
                TTFT: ~500 ms
              </div>
            </div>
            {/* GPU 3 — cache hit */}
            <div
              className="rounded-lg border-2 p-3 text-center space-y-2"
              style={{ borderColor: 'var(--color-teal)', background: 'var(--color-teal-bg)' }}
            >
              <div className="text-[12px] font-bold" style={{ color: 'var(--color-teal-text)' }}>
                GPU 3 (cache-aware)
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)]">User 17&rsquo;s 8K cache warm</div>
              <div
                className="h-6 rounded flex items-center justify-center text-[10px] font-medium text-white"
                style={{ background: 'var(--color-teal)' }}
              >
                1.28 GB cached &mdash; only 200 new tokens
              </div>
              <div className="text-[13px] font-mono font-bold" style={{ color: 'var(--color-teal-text)' }}>
                TTFT: ~12 ms
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function RoutingDecisionPage() {
  return (
    <div>
      {/* GPU status overview */}
      <Panel>
        <PanelHeader>8 GPUs &mdash; real-time status when User 17&rsquo;s request arrives</PanelHeader>
        <div className="p-4 space-y-2">
          {GPU_STATUS.map((gpu) => (
            <div key={gpu.id} className="flex items-center gap-3 text-[12px]">
              <span className="min-w-[50px] font-medium text-[var(--color-text)]">
                GPU {gpu.id}
              </span>
              <div className="flex-1 h-5 bg-[var(--color-surface-muted)] rounded overflow-hidden border border-[var(--color-border-light)]">
                <div
                  className="h-full rounded-l flex items-center pl-2 text-[10px] font-medium text-white"
                  style={{
                    width: `${gpu.load}%`,
                    background: gpu.load >= 70 ? 'var(--color-red)' : gpu.load >= 50 ? 'var(--color-primary)' : 'var(--color-teal)',
                  }}
                >
                  {gpu.load}%
                </div>
              </div>
              <span className="min-w-[120px] text-[11px] text-[var(--color-text-muted)]">
                {gpu.users}
              </span>
              {gpu.cacheNote && (
                <span className="text-[10px] text-[var(--color-teal-text)] font-medium">
                  {gpu.cacheNote}
                </span>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* Step 1: Cache affinity */}
      <Panel className="mt-4">
        <PanelHeader>Step 1 &mdash; Cache affinity scoring</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The router queries the KV cache index: &ldquo;Which GPUs have User 17&rsquo;s
            prefix cached?&rdquo; Answer: GPU 3 has 100% of User 17&rsquo;s cache (8K tokens).
            No other GPU has any of it.
          </p>
          <div className="flex gap-2 flex-wrap">
            <span
              className="px-3 py-1 rounded-full text-[11px] font-medium border-2"
              style={{ borderColor: 'var(--color-teal)', color: 'var(--color-teal-text)', background: 'var(--color-teal-bg)' }}
            >
              GPU 3: 100% match
            </span>
            {[0, 1, 2, 4, 5, 6, 7].map((id) => (
              <span
                key={id}
                className="px-3 py-1 rounded-full text-[11px] text-[var(--color-text-muted)] border border-[var(--color-border-light)]"
              >
                GPU {id}: 0%
              </span>
            ))}
          </div>
        </div>
      </Panel>

      {/* Step 2: Load scoring */}
      <Panel className="mt-4">
        <PanelHeader>Step 2 &mdash; Load scoring</PanelHeader>
        <div className="p-4 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p className="mb-2">Score each GPU on available capacity (100% &minus; load):</p>
          <div className="grid grid-cols-4 gap-2 text-[11px] text-center">
            {[
              { id: 5, cap: 80 }, { id: 2, cap: 70 }, { id: 7, cap: 60 }, { id: 0, cap: 55 },
              { id: 3, cap: 35 }, { id: 4, cap: 45 }, { id: 1, cap: 28 }, { id: 6, cap: 20 },
            ].map((g) => (
              <div key={g.id} className="px-2 py-1 rounded border border-[var(--color-border-light)]">
                <div className="font-medium text-[var(--color-text)]">GPU {g.id}</div>
                <div className="font-mono text-[var(--color-text-secondary)]">{g.cap}% capacity</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Step 3: Combined scoring */}
      <Panel className="mt-4">
        <PanelHeader>Step 3 &mdash; Combined decision (cache &times; 0.8 + load &times; 0.2)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">GPU</th>
                <th className="px-4 py-2 text-right">Cache score</th>
                <th className="px-4 py-2 text-right">Capacity score</th>
                <th className="px-4 py-2 text-left">Weighted total</th>
              </tr>
            </thead>
            <tbody>
              {SCORING_EXAMPLE.map((row) => (
                <tr
                  key={row.gpu}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.winner ? 'bg-[var(--color-teal-bg)]' : ''
                  }`}
                >
                  <td className={`px-4 py-2 font-medium ${row.winner ? 'text-[var(--color-teal-text)]' : 'text-[var(--color-text)]'}`}>
                    {row.gpu} {row.winner && '\u2190 winner'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.cacheScore}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.loadCapacity}</td>
                  <td className={`px-4 py-2 font-mono ${row.winner ? 'font-bold text-[var(--color-teal-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {row.combined}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>But what if GPU 3 were at 95% load?</strong> The weights shift. If GPU 3 is nearly full, sending more work risks queue delays for all of GPU 3&rsquo;s users. The router might decide: &ldquo;Cache miss on GPU 5 costs 500 ms of prefill, but GPU 3&rsquo;s queue would add 800 ms of waiting. GPU 5 is the better choice despite the miss.&rdquo; This is the tension the router navigates continuously."
      />
    </div>
  );
}

function PrefixSharingPage() {
  return (
    <div>
      {/* What is a prefix? */}
      <Panel>
        <PanelHeader>What is a prefix?</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            When a user sends a request to an LLM, the full prompt is a sequence of tokens. In many
            deployments, the first N tokens of that sequence are identical across multiple users or
            requests. This shared beginning is called the <strong className="text-[var(--color-text)]">prefix</strong>.
          </p>
          <p>
            The prefix is not a special configuration or a separate data structure &mdash; it&rsquo;s
            simply the observation that multiple prompts start with the same token sequence. The KV
            cache for those shared tokens is mathematically identical regardless of which user sent
            the request, because the attention computation for token N depends only on tokens 1
            through N, not on anything that comes after.
          </p>
          <p>
            This means: if GPU 3 has already computed and cached the KV for tokens 1 through
            2,000 (the prefix), and a new request arrives with the same first 2,000 tokens, GPU 3
            can skip prefill for those tokens entirely. Only the tokens AFTER the shared prefix
            need fresh computation.
          </p>
        </div>
      </Panel>

      {/* Three sources */}
      <Panel className="mt-4">
        <PanelHeader>Where do prefixes come from?</PanelHeader>
        <div className="px-4 py-3 space-y-4">
          {/* Source 1 */}
          <div className="text-[13px]">
            <div className="font-medium text-[var(--color-text)] mb-1">1. System prompts (our scenario)</div>
            <p className="text-[var(--color-text-secondary)] leading-relaxed mb-2">
              In our scenario, every conversation with the 500-engineer assistant begins with the same
              system prompt &mdash; ~2,000 tokens of instructions. Every single user&rsquo;s conversation
              starts with these identical tokens. The KV cache for these tokens is the same for User 1
              as it is for User 500. If GPU 3 has already computed this prefix&rsquo;s KV cache, any new
              user routed to GPU 3 can reuse it &mdash; saving ~12 ms of prefill computation.
            </p>
            <div className="rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-2 text-[11px] font-mono text-[var(--color-text-muted)]">
              <span style={{ color: 'var(--color-teal)' }}>[System prompt: ~2K tokens &mdash; shared]</span>
              {' + '}
              <span style={{ color: 'var(--color-primary)' }}>[User message: ~200 tokens &mdash; unique]</span>
            </div>
          </div>

          {/* Source 2 */}
          <div className="text-[13px]">
            <div className="font-medium text-[var(--color-text)] mb-1">2. RAG (Retrieval-Augmented Generation) contexts</div>
            <p className="text-[var(--color-text-secondary)] leading-relaxed mb-2">
              In RAG pipelines, the system retrieves relevant documents and prepends them to the
              user&rsquo;s question. When 20 engineers all query the same policy document, the first
              10K tokens (system prompt + document) are shared. Only the 200-token question differs.
            </p>
            <div className="rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-2 text-[11px] font-mono text-[var(--color-text-muted)]">
              <span style={{ color: 'var(--color-teal)' }}>[System: 2K]</span>
              {' + '}
              <span style={{ color: 'var(--color-blue)' }}>[Document: 8K &mdash; shared across 20 users]</span>
              {' + '}
              <span style={{ color: 'var(--color-primary)' }}>[Question: 200 &mdash; unique]</span>
            </div>
          </div>

          {/* Source 3 */}
          <div className="text-[13px]">
            <div className="font-medium text-[var(--color-text)] mb-1">3. Multi-turn conversations (history as prefix)</div>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              In a multi-turn conversation, each new message includes all previous turns as context.
              Turn 5 contains turns 1&ndash;4 as its prefix. If the KV cache for turns 1&ndash;4 is still
              in HBM, the model only needs to compute the new message&rsquo;s tokens. This is
              the &ldquo;returning user&rdquo; case from Page 2, viewed through the prefix lens.
            </p>
          </div>
        </div>
      </Panel>

      {/* Prefix routing savings table */}
      <Panel className="mt-4">
        <PanelHeader>Savings in our scenario (32 users, 2K-token system prompt)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-left">Without prefix routing</th>
                <th className="px-4 py-2 text-left">With prefix routing</th>
              </tr>
            </thead>
            <tbody>
              {PREFIX_ROUTING_SAVINGS.map((row) => (
                <tr
                  key={row.metric}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.metric}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.without}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.withRouting}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>4&times; reduction</strong> in redundant system prompt computation. For RAG workloads (20 engineers querying the same 10K-token document), the savings are even larger: ~8&times; reduction in redundant prefill."
      />

      {/* How prefix caching works */}
      <Panel className="mt-4">
        <PanelHeader>How prefix caching works mechanically</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The inference engine (vLLM, SGLang, TRT-LLM) stores KV cache in
            a <strong className="text-[var(--color-text)]">prefix tree</strong> (also called
            a radix tree). Each node in the tree represents a sequence of tokens and points
            to the cached KV blocks for that sequence. When a new request arrives, the engine
            walks the tree from the root, matching the request&rsquo;s tokens against existing nodes:
          </p>
          <div className="space-y-2 pl-3">
            {[
              { label: 'Full match', text: 'The entire prefix is cached. Skip to the first uncached token and begin prefill from there.' },
              { label: 'Partial match', text: 'Some prefix tokens are cached, others aren\u2019t. Resume prefill from the first uncached token.' },
              { label: 'No match', text: 'No shared prefix exists on this GPU. Full prefill required.' },
            ].map((item) => (
              <div key={item.label} className="flex gap-2 items-start">
                <span className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: 'var(--color-primary)' }} />
                <span>
                  <strong className="text-[var(--color-text)]">{item.label}:</strong> {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Production benchmarks */}
      <Panel className="mt-4">
        <PanelHeader>Production results (llm-d, 16&times; H100, 150 enterprise customers)</PanelHeader>
        <div className="p-4 space-y-2">
          {PREFIX_BENCHMARKS.map((b) => (
            <div key={b.metric} className="flex items-center gap-3 text-[13px]">
              <span className="min-w-[140px] font-medium text-[var(--color-text)]">{b.metric}</span>
              <span className="font-mono font-bold text-[var(--color-teal-text)]">{b.value}</span>
              <span className="text-[11px] text-[var(--color-text-muted)]">{b.note}</span>
            </div>
          ))}
        </div>
      </Panel>

      <InfoBox>
        These numbers are achievable because the benchmark workload has high prefix overlap
        (many users sharing the same customer-specific context). Workloads with less sharing
        see smaller but still significant gains (3&ndash;5&times; TTFT improvement even with
        moderate prefix overlap).
      </InfoBox>
    </div>
  );
}

function LlmdPage() {
  return (
    <div>
      {/* Three components */}
      <Panel>
        <PanelHeader>llm-d architecture &mdash; three key components</PanelHeader>
        <div className="px-4 py-3 space-y-4">
          {[
            {
              num: 1,
              title: 'KV Cache Indexer',
              text: 'A high-performance service maintaining a near-real-time global view of KV cache block locality across all vLLM pods. It subscribes to KVEvents streamed from each vLLM instance \u2014 structured metadata emitted as KV blocks are created or evicted. The indexer tracks which blocks reside on which pods and on which tier (GPU, CPU, storage).',
              detail: 'For infrastructure architects: this is conceptually a distributed key-value store where the keys are token-sequence hashes and the values are (pod_id, tier, block_address) tuples. The memory overhead is negligible \u2014 llm-d documents a 1,000,000:1 data-to-metadata ratio.',
            },
            {
              num: 2,
              title: 'Inference Scheduler (EPP)',
              text: 'Sits behind the Kubernetes Gateway API and makes routing decisions for every incoming request. For each request, it tokenizes the prompt prefix, queries the KV Cache Indexer, scores each candidate pod on cache affinity + load + predicted latency, and routes to the highest-scoring pod.',
              detail: null,
            },
            {
              num: 3,
              title: 'Disaggregated Serving Sidecar',
              text: 'For disaggregated deployments (Stop 12), the scheduler also decides which prefill instance handles a new request and which decode instance receives the KV cache afterward. The sidecar coordinates the P/D handoff, instructing vLLM to transfer KV cache via NIXL over the appropriate interconnect (NVLink within domain, RDMA across domains).',
              detail: null,
            },
          ].map((item) => (
            <div key={item.num} className="text-[13px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-bold flex items-center justify-center">
                  {item.num}
                </span>
                <strong className="text-[var(--color-text)]">{item.title}</strong>
              </div>
              <p className="ml-8 text-[var(--color-text-secondary)] leading-relaxed">{item.text}</p>
              {item.detail && (
                <p className="ml-8 mt-1 text-[12px] text-[var(--color-text-muted)] leading-relaxed italic">{item.detail}</p>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* Scoring strategies */}
      <Panel className="mt-4">
        <PanelHeader>Scoring strategies (simplest to most sophisticated)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Strategy</th>
                <th className="px-4 py-2 text-left">How it works</th>
                <th className="px-4 py-2 text-left">Best for</th>
              </tr>
            </thead>
            <tbody>
              {LLMD_STRATEGIES.map((row) => (
                <tr
                  key={row.strategy}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.strategy}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.howItWorks}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Benchmark results */}
      <Panel className="mt-4">
        <PanelHeader>Benchmark results (16&times; H100 GPUs)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-right">Round-robin</th>
                <th className="px-4 py-2 text-right">Load + prefix</th>
                <th className="px-4 py-2 text-right">Precise prefix-cache</th>
              </tr>
            </thead>
            <tbody>
              {LLMD_BENCHMARKS.map((row) => (
                <tr
                  key={row.metric}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.highlight ? 'bg-[var(--color-teal-bg)]' : ''
                  }`}
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.metric}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.roundRobin}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.loadPrefix}</td>
                  <td className={`px-4 py-2 text-right font-mono ${row.highlight ? 'font-bold text-[var(--color-teal-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {row.precisePrefix}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="good"
        message="The 57&times; improvement comes from eliminating nearly all redundant prefill computation. With 87% cache hit rate, only 13% of requests require fresh prefill. The remaining 87% reuse existing cache and go straight to incremental prefill (just the new tokens) or immediate decode."
      />
    </div>
  );
}

function DynamoRouterPage() {
  return (
    <div>
      {/* Dynamo description */}
      <Panel>
        <PanelHeader>Dynamo Smart Router</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Dynamo&rsquo;s router tracks KV cache across large fleets using
            a <strong className="text-[var(--color-text)]">Radix Tree</strong> &mdash; a prefix
            tree data structure optimized for matching shared prefixes. It hashes incoming
            requests and matches against the tree to find pods with relevant cached prefixes.
          </p>
          <p>
            The router integrates with the Dynamo Planner for dynamic prefill/decode pool
            sizing (Stop 12), and supports specialized algorithms for KV cache insertion and
            eviction, ensuring the most relevant blocks are retained.
          </p>
        </div>
      </Panel>

      {/* Comparison table */}
      <Panel className="mt-4">
        <PanelHeader>llm-d vs. Dynamo Smart Router</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Property</th>
                <th className="px-4 py-2 text-left">llm-d</th>
                <th className="px-4 py-2 text-left">Dynamo Smart Router</th>
              </tr>
            </thead>
            <tbody>
              {LLMD_VS_DYNAMO.map((row) => (
                <tr
                  key={row.property}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.property}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.llmd}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.dynamo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="note"
        message="Both systems solve the same fundamental problem: making the routing layer KV-cache-aware. llm-d is more portable (works across hardware vendors and integrates with Kubernetes ecosystem tools). Dynamo is more integrated (tighter coupling with NVIDIA&rsquo;s hardware and software stack). In practice, they&rsquo;re converging: llm-d uses NIXL for KV transfer, and Dynamo&rsquo;s components are being contributed to the open-source ecosystem."
      />
    </div>
  );
}

function DecisionTreePage() {
  return (
    <div>
      <div className="space-y-4">
        {ROUTING_SCENARIOS.map((s) => (
          <Panel key={s.id}>
            <PanelHeader>Scenario {s.id}: {s.title}</PanelHeader>
            <div className="p-4 space-y-3 text-[13px]">
              {/* Situation */}
              <p className="text-[var(--color-text-secondary)] leading-relaxed">{s.description}</p>

              {/* Decision steps */}
              <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-3 space-y-2 text-[12px]">
                <div className="flex gap-2 items-start">
                  <span className="flex-shrink-0 text-[var(--color-text-muted)]">Router:</span>
                  <span className="text-[var(--color-text-secondary)]">{s.routerDecision}</span>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="flex-shrink-0 text-[var(--color-text-muted)]">Action:</span>
                  <span className="font-medium text-[var(--color-text)]">{s.action}</span>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="flex-shrink-0 text-[var(--color-text-muted)]">Data movement:</span>
                  <span className="text-[var(--color-text-secondary)]">{s.dataMovement}</span>
                </div>
              </div>

              {/* TTFT comparison */}
              <div className="flex gap-4 text-[12px]">
                <div className="flex-1 rounded border border-[var(--color-teal)] bg-[var(--color-teal-bg)] px-3 py-2 text-center">
                  <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">Cache-aware TTFT</div>
                  <div className="font-mono font-bold text-[var(--color-teal-text)]">{s.ttft}</div>
                </div>
                <div className="flex-1 rounded border border-[var(--color-red)] bg-[var(--color-red-bg)] px-3 py-2 text-center">
                  <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">Round-robin TTFT</div>
                  <div className="font-mono font-bold text-[var(--color-red-text)]">{s.roundRobinTtft}</div>
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <InfoBox>
        Every scenario except E (truly new, unique content with no cache anywhere) benefits from
        cache-aware routing. Even Scenario D (new user, shared prefix) cuts TTFT in half by reusing
        the system prompt cache. The router doesn&rsquo;t need complex logic for most cases &mdash;
        it just needs to know where the cache is.
      </InfoBox>
    </div>
  );
}

function FeedbackLoopPage() {
  return (
    <div>
      {/* Feedback loop visual */}
      <Panel>
        <PanelHeader>The feedback loop</PanelHeader>
        <div className="px-4 py-3 space-y-0">
          {FEEDBACK_LOOP_STEPS.map((step, i) => (
            <div key={i}>
              <div className="flex gap-3 items-start text-[13px] py-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-[var(--color-text-secondary)] leading-relaxed">{step}</span>
              </div>
              {i < FEEDBACK_LOOP_STEPS.length - 1 && (
                <div className="ml-3 text-[var(--color-text-muted)] text-[11px]">&darr;</div>
              )}
            </div>
          ))}
          {/* Loop-back arrow */}
          <div className="ml-3 text-[var(--color-primary)] text-[11px] font-medium pt-1">
            &uarr; loop repeats &mdash; affinity strengthens with each request
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Sticky routing &mdash; the risk</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            This creates a <strong className="text-[var(--color-text)]">sticky routing</strong> pattern
            where users naturally accumulate on specific GPUs. But stickiness creates a risk: if
            User 17&rsquo;s conversations are always long and GPU 3 always gets User 17, GPU 3 may
            become overloaded while other GPUs are underutilized.
          </p>
          <p>
            The router must balance two forces:
          </p>
          <div className="space-y-2 pl-3">
            <div className="flex gap-2 items-start">
              <span className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: 'var(--color-teal)' }} />
              <span>
                <strong className="text-[var(--color-text)]">Cache affinity</strong> pulls requests
                toward GPUs with existing cache (reduces TTFT, saves compute)
              </span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: 'var(--color-blue)' }} />
              <span>
                <strong className="text-[var(--color-text)]">Load balancing</strong> pushes requests
                toward less-loaded GPUs (prevents hotspots, ensures fairness)
              </span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>The workload-dependent balance</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The optimal balance depends on workload: prefix-heavy workloads (shared system prompts,
            RAG) favor strong cache affinity. Diverse workloads (many unique contexts, little sharing)
            favor load balancing because cache hits are rare anyway.
          </p>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>The predicted latency approach</strong> (llm-d experimental) resolves this tension elegantly: instead of manually weighting cache vs. load, an ML model trained on live traffic directly predicts &ldquo;if I send this request to GPU N, what will the TTFT and TPOT be?&rdquo; The router simply picks the GPU with the lowest predicted latency. The model implicitly learns the right tradeoff for the current workload pattern."
      />
    </div>
  );
}

function SummaryPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Routing strategy comparison</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Routing strategy</th>
                <th className="px-4 py-2 text-left">TTFT impact</th>
                <th className="px-4 py-2 text-right">Cache hit rate</th>
                <th className="px-4 py-2 text-left">Complexity</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_TABLE.map((row) => (
                <tr
                  key={row.strategy}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.highlight ? 'bg-[var(--color-teal-bg)]' : ''
                  }`}
                >
                  <td className={`px-4 py-2 font-medium ${row.highlight ? 'text-[var(--color-teal-text)]' : 'text-[var(--color-text)]'}`}>
                    {row.strategy}
                  </td>
                  <td className={`px-4 py-2 ${row.highlight ? 'font-bold text-[var(--color-teal-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {row.ttftImpact}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.cacheHitRate}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.complexity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Evolving diagram description */}
      <Panel className="mt-4">
        <PanelHeader>Evolving diagram &mdash; Stop 16 version</PanelHeader>
        <div className="p-4">
          {/* Visual: Smart Router connecting users to GPU pools */}
          <div className="space-y-3">
            {/* Users */}
            <div className="flex justify-center gap-2 text-[10px]">
              {['User 1', 'User 17', 'User 32', '...'].map((u) => (
                <div key={u} className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                  {u}
                </div>
              ))}
            </div>
            <div className="text-center text-[var(--color-text-muted)] text-[10px]">&darr; requests</div>

            {/* Smart Router */}
            <div
              className="rounded-lg border-2 p-3 text-center"
              style={{ borderColor: 'var(--color-primary)', background: 'var(--color-primary-bg)' }}
            >
              <div className="text-[12px] font-bold" style={{ color: 'var(--color-primary)' }}>Smart Router</div>
              <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
                cache match % &middot; load % &middot; predicted TTFT
              </div>
            </div>

            {/* Connection to Indexer */}
            <div className="flex items-center justify-center gap-3">
              <div className="text-center text-[var(--color-text-muted)] text-[10px]">&darr; routes</div>
              <div
                className="px-3 py-1.5 rounded border border-dashed text-[10px]"
                style={{ borderColor: 'var(--color-blue)', color: 'var(--color-blue)' }}
              >
                KV Cache Indexer &larr; KVEvents from all GPUs
              </div>
            </div>

            {/* GPU Pools */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[var(--color-teal)] bg-[var(--color-teal-bg)] p-2 text-center">
                <div className="text-[11px] font-bold" style={{ color: 'var(--color-teal-text)' }}>Prefill Pool</div>
                <div className="text-[10px] text-[var(--color-text-muted)]">GPUs 0&ndash;3</div>
              </div>
              <div className="rounded-lg border border-[var(--color-blue)] bg-[var(--color-blue-bg)] p-2 text-center">
                <div className="text-[11px] font-bold" style={{ color: 'var(--color-blue-text)' }}>Decode Pool</div>
                <div className="text-[10px] text-[var(--color-text-muted)]">GPUs 4&ndash;7</div>
              </div>
            </div>

            {/* ICMS */}
            <div className="flex justify-center">
              <div className="px-3 py-1.5 rounded border border-dashed border-[var(--color-text-muted)] text-[10px] text-[var(--color-text-muted)]">
                ICMS (shared cache tier) &mdash; accessible from any GPU via router decision
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Bridge to Stop 17 */}
      <Panel className="mt-4">
        <PanelHeader>Bridge to Stop 17</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            We&rsquo;ve now built the complete inference infrastructure &mdash; from transformer
            mechanism (Act 1) through memory management (Stop 11), parallelism and disaggregation
            (Stop 12), tiered storage (Stop 13), compression (Stop 14), network fabric (Stop 15),
            and intelligent routing (this stop).
          </p>
          <p>
            Stop 17 assembles the full picture and looks forward: where is this going in the next 1,
            2, and 5 years? What happens when scale-up domains span 576+ GPUs? When CXL pools reach
            petabytes? When KV cache becomes a first-class network service? And what does all of this
            mean for the infrastructure professionals building these systems?
          </p>
          <p>
            That&rsquo;s the final stop &mdash; and the capstone interactive diagram that puts
            every component together in one view.
          </p>
        </div>
      </Panel>
    </div>
  );
}

// --- Main Component ---

export default function IntelligentRouting() {
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
        {page.id === 'round-robin-cost' && <RoundRobinCostPage />}
        {page.id === 'routing-decision' && <RoutingDecisionPage />}
        {page.id === 'prefix-sharing' && <PrefixSharingPage />}
        {page.id === 'llm-d' && <LlmdPage />}
        {page.id === 'dynamo-router' && <DynamoRouterPage />}
        {page.id === 'decision-tree' && <DecisionTreePage />}
        {page.id === 'feedback-loop' && <FeedbackLoopPage />}
        {page.id === 'summary' && <SummaryPage />}
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
