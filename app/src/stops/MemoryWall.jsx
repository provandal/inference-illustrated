import { useState, useCallback, useEffect } from 'react';
import {
  PAGES,
  SCENARIO_CALCULATOR,
  BATCH_UTILIZATION,
  STATIC_BATCHING_USERS,
  STATIC_BATCHING_WASTE,
  CONTINUOUS_VS_STATIC,
  TRADITIONAL_ALLOCATION,
  TRADITIONAL_TOTALS,
  PAGED_ALLOCATION,
  PAGED_TOTALS,
  MEMORY_OPTIONS,
  SUMMARY_TABLE,
} from '../data/stop11Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Narration text for each page ---

const NARRATIONS = {
  'math-works':
    'In our scenario, we&rsquo;re serving 32 concurrent users on 8&times; H100 GPUs with Llama-3 70B. Let&rsquo;s check the arithmetic from Stop 10. Model weights (FP4 quantized): ~35 GB. That fits on a single H100 with 45 GB left over. But we have 8 GPUs &mdash; we could shard the weights across them, or replicate the model and serve users in parallel. KV cache per user at 8K tokens: 320 KB/token &times; 8,000 = 2.5 GB. For 32 users: 32 &times; 2.5 GB = 80 GB of KV cache. Total: 35 GB weights + 80 GB cache = 115 GB. Across 8 GPUs (640 GB), that&rsquo;s only 18% utilization. The math says we have room to spare. So why is this hard?',

  'math-lies':
    'The calculation on the previous page assumed every conversation uses exactly 8K tokens. In reality, right now across those 32 users: one is asking a quick question (200 tokens). Another uploaded a 40-page spec and asked for a summary (28,000 tokens). Most are somewhere in between. And you don&rsquo;t know in advance how long any response will be &mdash; the model generates tokens until it produces an end-of-sequence token, which could happen after 10 tokens or 10,000.',

  'batching-why':
    'Before we solve the memory problem, we need to understand why serving multiple users per GPU isn&rsquo;t just nice to have &mdash; it&rsquo;s the only way to make the economics work. During decode, the GPU reads 35 GB of model weights from HBM to process ONE token for ONE user. The actual arithmetic for that token takes a fraction of the time the read takes. The GPU&rsquo;s compute cores are mostly idle, waiting for data.',

  'static-batching':
    'The simplest batching strategy is <strong>static batching</strong>: collect a group of requests, process them together, wait for ALL to finish, then start the next batch. Here&rsquo;s what that looks like with four of our users.',

  'continuous-batching':
    '<strong>Continuous batching</strong> eliminates head-of-line blocking by operating at the granularity of individual decode steps. When a user finishes, their slot is immediately filled by the next waiting request &mdash; no idle steps.',

  'paged-attention':
    'Traditional KV cache allocation wastes 60&ndash;80% of memory. In 2023, researchers at UC Berkeley solved this by applying a technique from 1960s operating systems to GPU memory: <strong>virtual memory paging.</strong> If you&rsquo;ve worked with storage systems, you already know this pattern. It&rsquo;s thin provisioning. It&rsquo;s scatter-gather DMA. Same principle, applied to KV cache.',

  'memory-runs-out':
    'Even with PagedAttention, GPU memory is finite. In our scenario, imagine 5 of our 32 users simultaneously upload large documents &mdash; each conversation jumps to 32K tokens (10 GB cache each). Those 5 users alone consume 50 GB, more than a single H100 can provide for cache. Something has to give.',

  summary:
    'We&rsquo;ve solved the single-GPU memory management problem. Batching makes GPUs economically viable. Continuous batching eliminates idle slots. PagedAttention eliminates fragmentation. Preemption and offloading handle overflow. But we&rsquo;ve been treating each GPU independently. In our scenario, 8 GPUs each run the full model and independently serve a subset of users. This works &mdash; but it ignores the fact that prefill and decode have fundamentally different hardware needs.',
};

// --- Page Content Components ---

function MathWorksPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Scenario calculator</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Parameter</th>
                <th className="px-4 py-2 text-right">Value</th>
                <th className="px-4 py-2 text-left">Source</th>
              </tr>
            </thead>
            <tbody>
              {SCENARIO_CALCULATOR.map((row) => (
                <tr
                  key={row.label}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.highlight
                      ? 'bg-[var(--color-teal-bg)]'
                      : ''
                  }`}
                >
                  <td className={`px-4 py-2 ${row.highlight ? 'font-medium text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}>
                    {row.label}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono ${row.highlight ? 'font-bold text-[var(--color-teal-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {row.value}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)] text-[12px]">
                    {row.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>Everything fits.</strong> 115 GB needed across 640 GB available &mdash; only 18% utilization. On paper, this is comfortable. We could serve 32 users with headroom to spare."
      />

      <Callout
        type="warn"
        message="<strong>But paper is not production.</strong> The next page reveals three problems that turn this comfortable margin into a crisis."
      />
    </div>
  );
}

function MathLiesPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Problem 1 &mdash; Over-allocation</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Each conversation is allocated a contiguous block sized for the{' '}
            <strong className="text-[var(--color-text)]">maximum</strong> possible context
            (128K tokens = 40 GB). But the actual conversation only uses 8K tokens (2.5 GB).
            The allocated block is <strong className="text-[var(--color-text)]">94% empty</strong>.
          </p>
        </div>

        {/* Visual: over-allocation bar */}
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-[var(--color-border-light)] overflow-hidden">
            <div className="flex items-center h-10">
              <div
                className="h-full flex items-center justify-center text-[11px] font-medium text-white"
                style={{ width: '6.25%', background: 'var(--color-teal)' }}
              >
                2.5 GB
              </div>
              <div
                className="h-full flex items-center justify-center text-[11px] font-medium"
                style={{ width: '93.75%', background: 'var(--color-red-bg)', color: 'var(--color-red-text)' }}
              >
                37.5 GB wasted
              </div>
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)] px-3 py-1.5 bg-[var(--color-surface-muted)] border-t border-[var(--color-border-light)]">
              One conversation: 40 GB allocated, 2.5 GB used
            </div>
          </div>
        </div>

        <InfoBox>
          With this allocation strategy, a single H100 can only serve{' '}
          <strong>one conversation</strong> (40 GB allocation + 35 GB weights = 75 GB,
          nearly full). Our 8 GPUs serve 8 users, not 32.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Problem 2 &mdash; Fragmentation</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Even with conservative allocation (say, 8K max per conversation), when
            conversations finish at different times, they leave{' '}
            <strong className="text-[var(--color-text)]">holes</strong> in memory.
            New conversations may not fit in the holes.
          </p>
        </div>

        {/* Visual: fragmented memory bar */}
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-[var(--color-border-light)] overflow-hidden">
            <div className="flex items-center h-10">
              <div className="h-full flex items-center justify-center text-[10px] font-medium text-white" style={{ width: '15%', background: 'var(--color-teal)' }}>
                Conv B
              </div>
              <div className="h-full flex items-center justify-center text-[10px]" style={{ width: '10%', background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)' }}>
                free
              </div>
              <div className="h-full flex items-center justify-center text-[10px] font-medium text-white" style={{ width: '25%', background: 'var(--color-blue)' }}>
                Conv C
              </div>
              <div className="h-full flex items-center justify-center text-[10px]" style={{ width: '8%', background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)' }}>
                free
              </div>
              <div className="h-full flex items-center justify-center text-[10px] font-medium text-white" style={{ width: '20%', background: 'var(--color-primary)' }}>
                Conv E
              </div>
              <div className="h-full flex items-center justify-center text-[10px]" style={{ width: '12%', background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)' }}>
                free
              </div>
              <div className="h-full flex items-center justify-center text-[10px] font-medium text-white" style={{ width: '10%', background: 'var(--color-teal)' }}>
                F
              </div>
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)] px-3 py-1.5 bg-[var(--color-surface-muted)] border-t border-[var(--color-border-light)]">
              30% free total &mdash; but no single gap large enough for a new 12K-token conversation
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Problem 3 &mdash; Unpredictable growth</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            A conversation allocated for 8K tokens suddenly needs 32K (the user uploaded
            a document mid-conversation). The contiguous block can&rsquo;t grow &mdash;
            there&rsquo;s another conversation&rsquo;s block right next to it.
          </p>
        </div>
      </Panel>

      <Callout
        type="warn"
        message="Traditional inference systems waste <strong>60&ndash;80%</strong> of allocated KV cache memory through this combination of over-allocation and fragmentation. On our 8&times; H100 cluster, that means 384&ndash;512 GB of our 640 GB is wasted. Instead of serving 32 users comfortably, we&rsquo;re struggling to serve 8."
      />
    </div>
  );
}

function BatchingWhyPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Same weight read, more useful work</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-right">Batch size</th>
                <th className="px-4 py-2 text-right">Weight read</th>
                <th className="px-4 py-2 text-right">Tokens processed</th>
                <th className="px-4 py-2 text-right">GPU compute utilization</th>
              </tr>
            </thead>
            <tbody>
              {BATCH_UTILIZATION.map((row) => (
                <tr
                  key={row.batchSize}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-text)]">
                    {row.batchSize} user{row.batchSize > 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.weightRead}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">
                    {row.tokensProcessed}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-text)]">
                    {row.utilization}
                    {row.note && (
                      <span className="text-[11px] text-[var(--color-text-muted)] ml-1">
                        ({row.note})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>The economics of batching</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Same 35 GB read from memory. 128&times; more useful work.{' '}
            <strong className="text-[var(--color-text)]">Batching</strong> means
            processing multiple users&rsquo; tokens through the same weight matrices in a
            single GPU operation. It&rsquo;s the difference between paying $1 per token and
            $0.008 per token.
          </p>
          <p>
            But each user in the batch needs their own KV cache in HBM. Adding a user to
            the batch adds 2.5 GB (at 8K tokens). The batch size is limited not by
            compute &mdash; the GPU can handle hundreds of tokens per step &mdash; but by{' '}
            <strong className="text-[var(--color-text)]">how many KV caches fit in memory</strong>{' '}
            alongside the weights.
          </p>
          <p>
            This is why KV cache memory management isn&rsquo;t just a technical detail.
            It&rsquo;s the lever that controls batch size, which controls GPU utilization,
            which controls cost per token.
          </p>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>For our scenario:</strong> With 35 GB weights on one H100 (45 GB remaining), we can fit 45 GB / 2.5 GB = 18 users per GPU at 8K tokens. Across 8 GPUs, that&rsquo;s 144 users &mdash; well above our 32. But only if we actually <em>use</em> the 45 GB efficiently, which the naive allocator from the previous page doesn&rsquo;t."
      />
    </div>
  );
}

function StaticBatchingPage() {
  const maxStep = Math.max(...STATIC_BATCHING_USERS.map((u) => u.finishStep));

  return (
    <div>
      <Panel>
        <PanelHeader>Four users, one batch</PanelHeader>
        <div className="p-4 space-y-3">
          {STATIC_BATCHING_USERS.map((user) => {
            const pct = (user.finishStep / maxStep) * 100;
            const idlePct = 100 - pct;
            return (
              <div key={user.id} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-[var(--color-text)]">
                    User {user.id}
                  </span>
                  <span className="text-[var(--color-text-muted)]">
                    {user.generateTokens} tokens &mdash; finishes at step {user.finishStep}
                  </span>
                </div>
                <div className="flex h-6 rounded overflow-hidden border border-[var(--color-border-light)]">
                  <div
                    className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                    style={{ width: `${pct}%`, background: 'var(--color-teal)' }}
                  >
                    {user.generateTokens}
                  </div>
                  {idlePct > 0 && (
                    <div
                      className="h-full flex items-center justify-center text-[10px]"
                      style={{
                        width: `${idlePct}%`,
                        background: 'var(--color-red-bg)',
                        color: 'var(--color-red-text)',
                      }}
                    >
                      {idlePct > 15 ? 'idle' : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="text-[11px] text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border-light)]">
            All four start together. After step 20, User A is done &mdash; but their slot
            sits idle for 480 more steps. Users B and D finish next, their slots idle too.
            The GPU spends most of its time generating tokens only for User C while three
            slots waste memory and compute.
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Utilization drops over time</PanelHeader>
        <div className="p-4 space-y-2">
          {[
            { range: 'Steps 1\u201320',    active: '4/4', pct: 100, color: 'var(--color-teal)' },
            { range: 'Steps 21\u201330',   active: '3/4', pct: 75,  color: 'var(--color-blue)' },
            { range: 'Steps 31\u201350',   active: '2/4', pct: 50,  color: 'var(--color-primary)' },
            { range: 'Steps 51\u2013500', active: '1/4', pct: 25,  color: 'var(--color-red)' },
          ].map((step) => (
            <div key={step.range} className="flex items-center gap-3 text-[12px]">
              <span className="min-w-[100px] text-[var(--color-text-muted)]">{step.range}</span>
              <div className="flex-1 h-4 bg-[var(--color-surface-muted)] rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{ width: `${step.pct}%`, background: step.color }}
                />
              </div>
              <span className="min-w-[50px] text-right font-mono text-[var(--color-text)]">
                {step.active}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>The waste</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <tbody>
              {STATIC_BATCHING_WASTE.map((row) => (
                <tr
                  key={row.metric}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.highlight ? 'bg-[var(--color-red-bg)]' : ''
                  }`}
                >
                  <td className={`px-4 py-2 ${row.highlight ? 'font-bold text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}>
                    {row.metric}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono ${row.highlight ? 'font-bold text-[var(--color-red-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="warn"
        message="This is <strong>head-of-line blocking</strong> &mdash; the same problem that shows up in network packet queues and SCSI command queues. The slowest request holds everything up. In a batch of 32 users where response lengths vary from 20 to 2,000 tokens, average GPU utilization might be 30&ndash;40%."
      />
    </div>
  );
}

function ContinuousBatchingPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Same four users &mdash; with continuous batching</PanelHeader>
        <div className="p-4 space-y-3">
          {[
            { range: 'Steps 1\u201320',   slots: 'A, B, C, D',    note: 'All active. 4/4 slots used.' },
            { range: 'Step 20',            slots: 'E, B, C, D',    note: 'User A finishes. Cache freed. User E immediately takes the slot.' },
            { range: 'Step 30',            slots: 'E, B, C, F',    note: 'User D finishes. User F takes the slot. Still 4/4.' },
            { range: 'Step 50',            slots: 'E, G, C, F',    note: 'User B finishes. User G takes the slot. Still 4/4.' },
            { range: 'Step 500',           slots: 'E, G, H, F',    note: 'User C finishes. User H takes the slot. Still 4/4.' },
          ].map((step) => (
            <div key={step.range} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 min-w-[90px] font-mono text-[12px] text-[var(--color-text-muted)]">
                {step.range}
              </span>
              <div>
                <span className="font-medium text-[var(--color-text)]">
                  [{step.slots}]
                </span>
                <span className="text-[var(--color-text-secondary)]"> &mdash; {step.note}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Utilization bar: constant ~100% */}
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-[var(--color-border-light)] overflow-hidden">
            <div className="flex items-center h-8">
              <div
                className="h-full flex items-center justify-center text-[11px] font-medium text-white"
                style={{ width: '100%', background: 'var(--color-teal)' }}
              >
                ~100% utilization throughout
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Static vs. continuous batching</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-right">Static batching</th>
                <th className="px-4 py-2 text-right">Continuous batching</th>
              </tr>
            </thead>
            <tbody>
              {CONTINUOUS_VS_STATIC.map((row) => (
                <tr
                  key={row.metric}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 text-[var(--color-text)]">{row.metric}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-muted)]">
                    {row.staticVal}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-teal-text)]">
                    {row.continuousVal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Continuous batching is now the standard in all major inference serving
            systems: <strong className="text-[var(--color-text)]">vLLM</strong>,{' '}
            <strong className="text-[var(--color-text)]">TensorRT-LLM</strong>,{' '}
            <strong className="text-[var(--color-text)]">NVIDIA Dynamo</strong>. The key
            insight: operate at token-level granularity, not request-level.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">But continuous batching makes the
            memory problem harder.</strong> With static batching, you know exactly which
            requests are in the batch. With continuous batching, requests arrive and leave
            dynamically. Each request&rsquo;s cache grows at a different rate. You need a
            memory allocator that can handle this churn without fragmenting.
          </p>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>[Forward ref: Stop 12]</strong> When requests finish, their freed KV cache memory can also be used by <em>chunked prefill</em> &mdash; processing new arrivals&rsquo; prompts in pieces, interleaved with ongoing decode. This avoids a latency spike from a large prefill blocking the decode batch."
      />
    </div>
  );
}

function PagedAttentionPage() {
  return (
    <div>
      {/* Two panels side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Traditional */}
        <Panel>
          <PanelHeader>Traditional (contiguous allocation)</PanelHeader>
          <div className="p-4 space-y-2">
            {TRADITIONAL_ALLOCATION.map((conv) => (
              <div key={conv.id} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-[var(--color-text)]">Conv {conv.id}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {conv.used} / {conv.allocated} &mdash; {conv.waste} waste
                  </span>
                </div>
                <div className="flex h-5 rounded overflow-hidden border border-[var(--color-border-light)]">
                  {(() => {
                    const usedGB = parseFloat(conv.used);
                    const allocGB = parseFloat(conv.allocated);
                    const usedPct = (usedGB / allocGB) * 100;
                    return (
                      <>
                        <div
                          className="h-full"
                          style={{ width: `${usedPct}%`, background: 'var(--color-teal)' }}
                        />
                        <div
                          className="h-full"
                          style={{ width: `${100 - usedPct}%`, background: 'var(--color-red-bg)' }}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-[var(--color-border-light)] space-y-1 text-[12px] text-[var(--color-text-secondary)]">
              <div>Total allocated: <strong className="text-[var(--color-text)]">{TRADITIONAL_TOTALS.allocated}</strong></div>
              <div>Total used: <strong className="text-[var(--color-text)]">{TRADITIONAL_TOTALS.used}</strong></div>
              <div>
                Waste: <strong className="text-[var(--color-red-text)]">{TRADITIONAL_TOTALS.waste} ({TRADITIONAL_TOTALS.wastePercent})</strong>
              </div>
              <div>Room for: <strong className="text-[var(--color-text)]">{TRADITIONAL_TOTALS.maxConversations} conversations</strong></div>
            </div>
          </div>
        </Panel>

        {/* Right: Paged */}
        <Panel>
          <PanelHeader>PagedAttention (paged allocation)</PanelHeader>
          <div className="p-4 space-y-2">
            {PAGED_ALLOCATION.map((conv) => (
              <div key={conv.id} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-[var(--color-text)]">Conv {conv.id}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {conv.pages} pages &mdash; {conv.used}
                  </span>
                </div>
                <div className="flex h-5 rounded overflow-hidden border border-[var(--color-border-light)]">
                  {/* Show scattered pages as a set of small blocks */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const filledCount = Math.round((parseFloat(conv.used) / 15.5) * 12);
                    const isFilled = i < filledCount;
                    return (
                      <div
                        key={i}
                        className="h-full flex-1"
                        style={{
                          background: isFilled ? 'var(--color-teal)' : 'var(--color-surface-muted)',
                          borderRight: i < 11 ? '1px solid var(--color-surface)' : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-[var(--color-border-light)] space-y-1 text-[12px] text-[var(--color-text-secondary)]">
              <div>Total used: <strong className="text-[var(--color-text)]">{PAGED_TOTALS.used}</strong></div>
              <div>Total free: <strong className="text-[var(--color-teal-text)]">{PAGED_TOTALS.free}</strong> (all usable &mdash; no fragments)</div>
              <div>
                Waste: <strong className="text-[var(--color-teal-text)]">{PAGED_TOTALS.wastePercent}</strong>
              </div>
              <div>Room for: <strong className="text-[var(--color-teal-text)]">up to {PAGED_TOTALS.maxConversations} conversations</strong></div>
            </div>
          </div>
        </Panel>
      </div>

      {/* How it works */}
      <Panel className="mt-4">
        <PanelHeader>How PagedAttention works</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The same 45 GB of available memory is divided into fixed-size{' '}
            <strong className="text-[var(--color-text)]">pages</strong>, each holding K
            and V for {PAGED_TOTALS.pageSize} ({PAGED_TOTALS.pageSizeBytes} per page for
            Llama-3 70B with GQA). Each conversation is a set of pages scattered across
            memory.
          </p>
          <p>
            A <strong className="text-[var(--color-text)]">block table</strong> for each
            conversation maps logical token positions to physical page locations:
            &ldquo;Conv A tokens 1&ndash;16 &rarr; page 47, tokens 17&ndash;32 &rarr;
            page 203, tokens 33&ndash;48 &rarr; page 12&hellip;&rdquo;
          </p>
          <p>
            When a conversation finishes, its individual pages are freed. Each is immediately
            available. No fragmentation &mdash; every freed page is the same size.
          </p>
        </div>
      </Panel>

      {/* Analogies */}
      <Panel className="mt-4">
        <div className="p-4 space-y-3">
          <div className="flex gap-3 items-start text-[13px]">
            <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]">
              Storage
            </span>
            <div className="text-[var(--color-text-secondary)] leading-relaxed">
              <strong className="text-[var(--color-text)]">This is thin provisioning.</strong>{' '}
              You don&rsquo;t allocate the full LUN up front &mdash; you allocate blocks as
              data is written. The block map tracks logical-to-physical mappings.
            </div>
          </div>
          <div className="flex gap-3 items-start text-[13px]">
            <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)]">
              Network
            </span>
            <div className="text-[var(--color-text-secondary)] leading-relaxed">
              <strong className="text-[var(--color-text)]">This is scatter-gather DMA.</strong>{' '}
              The data doesn&rsquo;t need to be contiguous &mdash; the controller follows a
              descriptor list.
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="good"
        message="PagedAttention is the core innovation behind <strong>vLLM</strong>, which has become the dominant open-source inference serving system. It reduced KV cache waste from 60&ndash;80% to under 4%, enabling 2&ndash;4&times; more concurrent conversations on the same hardware."
      />

      <Callout
        type="note"
        message="<strong>For our scenario:</strong> With PagedAttention on our 8&times; H100 cluster, each GPU with 45 GB available can serve ~18 conversations at 8K tokens with minimal waste. Across 8 GPUs: 144 concurrent conversations. Our requirement of 32 is well within reach &mdash; and we have headroom for the users who spike to 32K tokens (10 GB each, still fits)."
      />
    </div>
  );
}

function MemoryRunsOutPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Three options when HBM is full</PanelHeader>
        <div className="p-4 space-y-4">
          {MEMORY_OPTIONS.map((opt, i) => (
            <div
              key={opt.id}
              className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-[14px] font-medium text-[var(--color-text)]">
                  {opt.label}
                </span>
              </div>
              <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-2">
                {opt.description}
              </p>
              <div className="flex gap-4 text-[12px]">
                <div>
                  <span className="text-[var(--color-red-text)] font-medium">Cost:</span>{' '}
                  <span className="text-[var(--color-text-secondary)]">{opt.cost}</span>
                </div>
                <div>
                  <span className="text-[var(--color-teal-text)] font-medium">Benefit:</span>{' '}
                  <span className="text-[var(--color-text-secondary)]">{opt.benefit}</span>
                </div>
              </div>
              {opt.analogy && (
                <p className="text-[12px] text-[var(--color-text-muted)] mt-2 italic">
                  {opt.analogy}
                </p>
              )}
              {opt.forwardRef && (
                <p className="text-[12px] text-[var(--color-primary)] mt-1 font-medium">
                  [Forward ref: {opt.forwardRef}]
                </p>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>[Forward ref: Stop 13]</strong> The offload option extends to multiple tiers: HBM &rarr; CPU DRAM &rarr; NVMe SSD &rarr; networked storage. Each tier offers more capacity at higher latency. NVIDIA Dynamo&rsquo;s KV Block Manager orchestrates this hierarchy, and companies like WEKA and VAST are building RDMA-based storage that can serve KV cache back to GPUs at up to 270 GB/s aggregate throughput."
      />

      <Callout
        type="good"
        message="<strong>For our scenario:</strong> With 8 GPUs, each having ~2 TB of CPU DRAM available for overflow, our total KV cache capacity extends from 640 GB (HBM only) to ~16 TB (HBM + DRAM). The 5 users with 32K contexts (50 GB total) are easily absorbed &mdash; their less-recently-used cache pages can be offloaded to DRAM while active decode reads from HBM."
      />
    </div>
  );
}

function SummaryPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>What we solved</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Problem</th>
                <th className="px-4 py-2 text-left">Solution</th>
                <th className="px-4 py-2 text-left">Impact</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_TABLE.map((row) => (
                <tr
                  key={row.problem}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 text-[var(--color-text)]">{row.problem}</td>
                  <td className="px-4 py-2 font-medium text-[var(--color-teal-text)]">
                    {row.solution}
                  </td>
                  <td className="px-4 py-2 font-mono text-[var(--color-text-secondary)]">
                    {row.impact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Evolving diagram — Stop 11 version */}
      <Panel className="mt-4">
        <PanelHeader>The picture so far</PanelHeader>
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* Users */}
            <div className="flex-shrink-0 p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
              <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                32 Users
              </div>
              <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-sm bg-[var(--color-primary-bg)] border border-[var(--color-primary)]"
                    title={`User ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center text-[var(--color-text-muted)] text-lg">
              &rarr;
            </div>

            {/* Scheduler */}
            <div className="flex-shrink-0 p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
              <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider">
                Continuous Batching
              </div>
              <div className="text-[11px] text-[var(--color-teal-text)] mt-1">
                Scheduler
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center text-[var(--color-text-muted)] text-lg">
              &rarr;
            </div>

            {/* GPUs */}
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                8&times; H100 GPUs
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-2 rounded border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]"
                  >
                    <div className="text-[10px] font-medium text-[var(--color-text)]">
                      GPU {i}
                    </div>
                    <div className="mt-1 h-2 rounded bg-[var(--color-primary-bg)] border border-[var(--color-primary)]" title="Weights (35 GB, fixed)" />
                    <div className="mt-0.5 h-2 rounded bg-[var(--color-teal-bg)] border border-[var(--color-teal)]" title="KV Cache (paged)" />
                    <div className="text-[8px] text-[var(--color-text-muted)] mt-0.5">
                      Weights + Paged KV
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Bridge to Stop 12 */}
      <Panel className="mt-4">
        <PanelHeader>Bridge to Stop 12</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            In our current setup, all 8 GPUs run both prefill and decode. But prefill
            is compute-bound (GPU cores fully busy) and decode is memory-bound (GPU cores
            waiting for cache reads). When a user submits a 28,000-token document for
            analysis, the prefill phase saturates the GPU for several seconds &mdash; and
            during that time, all decode users on that GPU see their token generation stall.
          </p>
          <p>
            What if we dedicated some GPUs to prefill and others to decode? The prefill
            GPUs would stay compute-saturated. The decode GPUs would be optimized for
            memory bandwidth. But after prefill completes, the KV cache &mdash; 28,000
            tokens &times; 320 KB ={' '}
            <strong className="text-[var(--color-text)]">8.96 GB</strong> &mdash; must
            transfer from the prefill GPU to the decode GPU. At 400 Gbps RDMA (50 GB/s),
            that transfer takes{' '}
            <strong className="text-[var(--color-text)]">~180 ms</strong>.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">
              That 180 ms transfer &mdash; and how to shrink it &mdash; is the subject
              of Stop 12.
            </strong>
          </p>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>The single-GPU story is complete.</strong> Batching, continuous batching, PagedAttention, and overflow management. Next: what happens when prefill and decode need different hardware &mdash; and the KV cache must travel across the network."
      />
    </div>
  );
}

// --- Main Component ---

export default function MemoryWall() {
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
        {page.id === 'math-works' && <MathWorksPage />}
        {page.id === 'math-lies' && <MathLiesPage />}
        {page.id === 'batching-why' && <BatchingWhyPage />}
        {page.id === 'static-batching' && <StaticBatchingPage />}
        {page.id === 'continuous-batching' && <ContinuousBatchingPage />}
        {page.id === 'paged-attention' && <PagedAttentionPage />}
        {page.id === 'memory-runs-out' && <MemoryRunsOutPage />}
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
