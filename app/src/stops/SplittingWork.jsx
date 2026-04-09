import { useState, useCallback, useEffect } from 'react';
import {
  PAGES,
  DATA_PARALLEL_GPUS,
  TENSOR_PARALLEL_GPUS,
  PIPELINE_PARALLEL_GPUS,
  MICRO_BATCH_TIMELINE,
  PARALLELISM_COMPARISON,
  SCENARIO_CONFIGS,
  TRANSFER_TIMES,
  DYNAMO_COMPONENTS,
  CACHE_LIFECYCLE,
  LIFECYCLE_STOP_MAP,
  SUMMARY_TABLE,
  TP_ANIMATION_STEPS,
  SUPER_LINEAR_SCALING,
} from '../data/stop12Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Narration text for each page ---

const NARRATIONS = {
  'one-gpu':
    'In Stop 11, we treated each of our 8 H100 GPUs as independent &mdash; each running its own copy of Llama-3 70B, each serving its own subset of users. That works when the model fits on one GPU (35 GB at FP4). But what if we want to run at FP16 for better quality? Llama-3 70B at FP16 is 140 GB &mdash; nearly two full H100s just for the weights, before any KV cache. And Llama-3 405B at FP4 is still ~100 GB &mdash; more than one H100 can hold. When a model doesn&rsquo;t fit on one GPU, you must split it. But HOW you split it determines everything: where the KV cache lives, what data moves between GPUs, how much bandwidth you need, and how many users you can serve. There are three fundamental ways to split a model across GPUs. Each one cuts along a different dimension &mdash; and the KV cache follows the cut differently.',

  'data-parallel':
    'The simplest approach: make complete copies of the model. Each GPU gets the full model and serves different users independently. This is what we were doing in Stop 11 &mdash; we just didn&rsquo;t name it. For our scenario with Llama-3 70B at FP4 (35 GB): each of our 8 H100s holds one complete copy. Each GPU serves 4 of our 32 users (32 &divide; 8 = 4 per GPU). No GPU needs to talk to any other GPU during inference.',

  'tensor-parallel':
    'What if the model doesn&rsquo;t fit on one GPU? Tensor parallelism splits each layer&rsquo;s weight matrices across GPUs. Every GPU holds a SLICE of every layer &mdash; and all GPUs work together to process every single token. For Llama-3 70B at FP16 (140 GB): split across 4 GPUs, each holds 35 GB of weights. But now all 4 GPUs must collaborate on every computation &mdash; and they must synchronize after every layer.',

  'pipeline-parallel':
    'Pipeline parallelism takes a different approach: instead of splitting each layer, it splits the STACK of layers. GPU 0 gets layers 1&ndash;20, GPU 1 gets layers 21&ndash;40, GPU 2 gets layers 41&ndash;60, GPU 3 gets layers 61&ndash;80. Each GPU runs its assigned layers sequentially &mdash; then passes the result to the next GPU. The communication pattern is completely different from tensor parallelism: instead of all-reduce between all GPUs at every layer, you have a simple point-to-point send from one GPU to the next, once per stage boundary.',

  'choosing':
    'In practice, production systems combine these strategies. The rule of thumb used by every major inference framework: tensor parallelism WITHIN a node (where NVLink provides 900 GB/s), pipeline parallelism ACROSS nodes (where network bandwidth is 50&ndash;400 GB/s). Data parallelism on top of both for multi-user throughput.',

  'disaggregated':
    'All three parallelism strategies split the MODEL. Disaggregated inference splits the WORKLOAD &mdash; separating the prefill phase and the decode phase onto different GPU pools, each optimized for its computational profile. In our scenario, consider what happens when User 17 submits a 28,000-token document for analysis while Users 1&ndash;16 are mid-conversation. On a shared GPU, User 17&rsquo;s prefill &mdash; processing 28,000 tokens through all 80 layers &mdash; takes several seconds of intense computation, during which all 16 decode users on that GPU see their token generation stall. Disaggregated inference eliminates this interference.',

  'dynamo':
    'NVIDIA Dynamo, released at GTC 2025, is the open-source framework that turns a GPU cluster into a coordinated disaggregated inference system. It doesn&rsquo;t replace the inference engine (vLLM, TensorRT-LLM, SGLang) &mdash; it orchestrates above them. For our scenario, here&rsquo;s how Dynamo would organize our 8 H100 GPUs:',

  'lifecycle':
    'Let&rsquo;s trace the complete lifecycle of one user&rsquo;s KV cache through a disaggregated system &mdash; from the moment they send a message to the moment they receive a response. This is the data path that every optimization in Act 2 will touch.',

  'summary':
    'We&rsquo;ve seen four ways to split inference work across GPUs. Three split the model (data, tensor, pipeline). One splits the workload (prefill vs. decode). Production systems combine all four.',
};

// --- Page Content Components ---

function OneGpuPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The size problem</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Llama-3 70B has 70 billion parameters. At FP16 (2 bytes each), the model
            weights alone consume <strong className="text-[var(--color-text)]">140 GB</strong> &mdash;
            nearly two full H100 GPUs (80 GB each) just for the weights, before any KV cache.
            Even at FP4 quantization (0.5 bytes each), the model is 35 GB &mdash; it fits, but
            leaves only 45 GB for cache.
          </p>
          <p>
            Llama-3 405B at FP4 is still ~100 GB &mdash; more than one H100 can hold.
            When a model doesn&rsquo;t fit on one GPU, you must split it.
          </p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Three axes of splitting</PanelHeader>
        <div className="p-4 space-y-3">
          <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-3">
            Think of the full model as a 3D block. Three colored planes show where each
            parallelism type cuts:
          </div>
          {[
            {
              color: 'var(--color-red)',
              bgColor: 'var(--color-red-bg)',
              textColor: 'var(--color-red-text)',
              axis: 'Width (horizontal)',
              cut: 'Vertical slice through weight matrices within each layer',
              name: 'Tensor Parallelism',
            },
            {
              color: 'var(--color-blue)',
              bgColor: 'var(--color-blue-bg)',
              textColor: 'var(--color-blue-text)',
              axis: 'Depth (vertical)',
              cut: 'Horizontal slice through the stack of 80 layers',
              name: 'Pipeline Parallelism',
            },
            {
              color: 'var(--color-teal)',
              bgColor: 'var(--color-teal-bg)',
              textColor: 'var(--color-teal-text)',
              axis: 'Users (into the screen)',
              cut: 'Replicates the entire block for different conversations',
              name: 'Data Parallelism',
            },
          ].map((item) => (
            <div
              key={item.name}
              className="flex gap-3 items-start p-3 rounded-lg border"
              style={{ background: item.bgColor, borderColor: item.color }}
            >
              <div
                className="flex-shrink-0 w-3 h-12 rounded-sm"
                style={{ background: item.color }}
              />
              <div className="min-w-0">
                <div className="text-[13px] font-medium" style={{ color: item.textColor }}>
                  {item.name}
                </div>
                <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                  <strong className="text-[var(--color-text)]">{item.axis}:</strong> {item.cut}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="note"
        message="Each of the next three pages shows one cut. Watch what happens to the data &mdash; the weight matrices, the activations flowing between layers, and most importantly, the KV cache."
      />
    </div>
  );
}

function DataParallelPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Data parallelism in action</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            32 user requests arrive. A router distributes them: Users 1&ndash;4 to GPU 0,
            Users 5&ndash;8 to GPU 1, and so on through Users 29&ndash;32 to GPU 7. Each GPU
            processes its 4 users&rsquo; prompts independently &mdash; all 8 GPUs prefill
            simultaneously. No data moves between GPUs.
          </p>
          <p>
            Each GPU builds its own KV cache for its 4 users, then generates tokens
            independently. The result: 8 independent inference engines, each with 45 GB
            available for KV cache (80 &minus; 35). At 2.5 GB per user (8K tokens), that
            fits 18 users per GPU. We&rsquo;re only using 4 &mdash; plenty of headroom.
          </p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Memory layout across 8 GPUs</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">GPU</th>
                <th className="px-4 py-2 text-right">Weights</th>
                <th className="px-4 py-2 text-right">KV Cache</th>
                <th className="px-4 py-2 text-right">Free</th>
                <th className="px-4 py-2 text-left">Comm.</th>
              </tr>
            </thead>
            <tbody>
              {DATA_PARALLEL_GPUS.map((row) => (
                <tr key={row.gpu} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 font-mono font-medium text-[var(--color-text)]">{row.gpu}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.weights}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.cache}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.free}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.communication}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[var(--color-border)] font-medium text-[var(--color-text)]">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right font-mono">280 GB</td>
                <td className="px-4 py-2 text-right font-mono">80 GB</td>
                <td className="px-4 py-2 text-right font-mono">280 GB</td>
                <td className="px-4 py-2">Zero</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Strengths and weaknesses</PanelHeader>
        <div className="p-4 space-y-3">
          <div className="p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
            <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider mb-2">
              Strengths
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed space-y-1">
              <p>No inter-GPU communication. Each GPU is fully independent. Simple to operate.
                Scales linearly &mdash; add GPUs, serve more users.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-red-bg)] border border-[var(--color-red)]">
            <div className="text-[11px] font-medium text-[var(--color-red-text)] uppercase tracking-wider mb-2">
              Weaknesses
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed space-y-1">
              <p>Every GPU stores a complete copy of the weights. With 8 GPUs, we&rsquo;re storing
                280 GB of weights total &mdash; the same 35 GB repeated 8 times. That&rsquo;s memory
                that could be used for KV cache.</p>
              <p>Doesn&rsquo;t help when the model doesn&rsquo;t FIT on one GPU. If the model is
                140 GB (FP16), data parallelism alone can&rsquo;t help &mdash; you need to split
                the model itself.</p>
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="note"
        message="<strong>KV cache implication:</strong> Each GPU holds the COMPLETE cache for its users. The cache never moves between GPUs. If a user is assigned to GPU 3, all their KV data lives on GPU 3 for the duration of the conversation. This is simple but inflexible &mdash; if GPU 3 runs out of cache space while GPU 5 has plenty, there&rsquo;s no way to rebalance."
      />
    </div>
  );
}

function TensorParallelPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Tensor parallelism &mdash; one layer, one token</PanelHeader>
        <div className="p-4 space-y-2">
          {TP_ANIMATION_STEPS.map((step) => (
            <div
              key={step.step}
              className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]"
            >
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                  {step.step}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[var(--color-text)]">
                    {step.label}
                  </div>
                  <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-1">
                    {step.description}
                  </div>
                  <div className="mt-2 space-y-0.5">
                    {step.gpuWork.map((work, i) => (
                      <div key={i} className="text-[11px] font-mono text-[var(--color-text-muted)]">
                        {work}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Key number</PanelHeader>
        <InfoBox>
          For Llama-3 70B with TP=4 across 80 layers:{' '}
          <strong>160 all-reduce operations per forward pass</strong> (2 per layer &times; 80
          layers). At NVLink speeds (900 GB/s within a node), each all-reduce is fast.
          Cross-node (InfiniBand at ~400 Gbps = 50 GB/s), it&rsquo;s 18&times; slower &mdash;
          which is why <strong>tensor parallelism should stay within a single node</strong>.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Memory layout (TP=4)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">GPU</th>
                <th className="px-4 py-2 text-right">Weights</th>
                <th className="px-4 py-2 text-left">KV Cache</th>
                <th className="px-4 py-2 text-left">KV Groups</th>
                <th className="px-4 py-2 text-left">Comm.</th>
              </tr>
            </thead>
            <tbody>
              {TENSOR_PARALLEL_GPUS.map((row) => (
                <tr key={row.gpu} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 font-mono font-medium text-[var(--color-text)]">{row.gpu}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.weights}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.cacheDesc}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.kvGroups}</td>
                  <td className="px-4 py-2 font-mono text-[var(--color-text-secondary)]">{row.communication}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[var(--color-border)] font-medium text-[var(--color-text)]">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right font-mono">140 GB</td>
                <td className="px-4 py-2">Distributed</td>
                <td className="px-4 py-2">All 8 KV groups</td>
                <td className="px-4 py-2 font-mono">Heavy</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Strengths and weaknesses</PanelHeader>
        <div className="p-4 space-y-3">
          <div className="p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
            <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider mb-2">
              Strengths
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              The model fits! 140 GB split across 4 GPUs = 35 GB each. Each GPU now has
              45 GB free for KV cache. Lower latency per token &mdash; 4 GPUs computing in
              parallel finish faster than 1.
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-red-bg)] border border-[var(--color-red)]">
            <div className="text-[11px] font-medium text-[var(--color-red-text)] uppercase tracking-wider mb-2">
              Weakness
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              Massive communication. 160 all-reduce operations per forward pass. This is fine
              over NVLink (900 GB/s) within a node, but across nodes it becomes the bottleneck.
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Bonus &mdash; super-linear KV cache scaling</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            This is a non-obvious effect that surprises most engineers. Consider what happens to
            memory when you go from TP=1 (one GPU running the full model) to TP=2 (two GPUs
            splitting the model):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
              <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                {SUPER_LINEAR_SCALING.tp1.label}
              </div>
              <div className="font-mono text-[12px]">
                <div>Weights: <span className="text-[var(--color-text)]">{SUPER_LINEAR_SCALING.tp1.weightsMem}</span></div>
                <div>Free for cache: <span className="text-[var(--color-text)]">{SUPER_LINEAR_SCALING.tp1.freeMem}</span></div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
              <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider mb-2">
                {SUPER_LINEAR_SCALING.tp2.label}
              </div>
              <div className="font-mono text-[12px]">
                <div>Weights: <span className="text-[var(--color-text)]">{SUPER_LINEAR_SCALING.tp2.weightsMem}</span></div>
                <div>Free for cache: <span className="text-[var(--color-text)]">{SUPER_LINEAR_SCALING.tp2.freeMem}</span></div>
              </div>
            </div>
          </div>
          <p>
            You added 1 GPU (2&times; hardware), but cache capacity went from 10 GB to 90 GB &mdash;
            a <strong className="text-[var(--color-text)]">9&times; increase</strong>. The reason: the weights
            were consuming most of the memory, and splitting them freed a disproportionately larger
            fraction of each GPU for cache. In practice, vLLM measured{' '}
            <strong className="text-[var(--color-text)]">13.9&times; more KV cache blocks</strong> at TP=2
            vs. TP=1 (even higher than our simplified calculation because distributing the model also
            reduces activation memory and internal buffers). That 13.9&times; more cache enabled{' '}
            <strong className="text-[var(--color-text)]">3.9&times; higher throughput</strong> &mdash; because
            more cache means larger batches, and larger batches mean better GPU utilization.
          </p>
        </div>
      </Panel>

      <Callout
        type="note"
        message='<strong>KV cache implication:</strong> The cache is split across the <strong>heads dimension</strong>. Each GPU stores K,V for only its assigned attention heads. For GQA with 8 KV groups and TP=4: each GPU stores 2 KV groups. A token&rsquo;s complete cache (all heads, all layers) is distributed across all 4 GPUs. If you need to move this cache (e.g., for disaggregated inference), you must gather it from all TP GPUs &mdash; a coordination challenge.'
      />
    </div>
  );
}

function PipelineParallelPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Pipeline parallelism &mdash; one token through the stack</PanelHeader>
        <div className="p-4 space-y-2">
          {[
            {
              num: '1',
              label: 'Stage 1 (GPU 0, Layers 1-20)',
              text: 'The token enters GPU 0. It processes through layers 1\u201320 (attention + FFN at each layer). The KV cache for layers 1\u201320 is stored on GPU 0. GPUs 1, 2, 3 are idle.',
            },
            {
              num: '2',
              label: 'Handoff 1\u21922',
              text: 'After layer 20, GPU 0 sends the token\u2019s representation (one d_model-sized vector = 8,192 \u00d7 2 bytes = 16 KB) to GPU 1. This is tiny \u2014 16 KB vs. the megabytes moved in tensor parallelism\u2019s all-reduce.',
            },
            {
              num: '3',
              label: 'Stage 2 (GPU 1, Layers 21-40)',
              text: 'GPU 1 processes layers 21\u201340. KV cache for these layers is stored on GPU 1. GPU 0 is now idle (unless processing another token \u2014 see micro-batching below).',
            },
            {
              num: '4',
              label: 'Stages 3\u20134',
              text: 'Same pattern repeats. 16 KB handoff to GPU 2 (layers 41\u201360), then 16 KB to GPU 3 (layers 61\u201380). After layer 80: output projection \u2192 softmax \u2192 sampling \u2192 next token selected.',
            },
            {
              num: '5',
              label: 'Total latency',
              text: 'The token must traverse ALL 4 stages sequentially. Pipeline latency = sum of all stage compute times + 3 handoff latencies. This is SLOWER than tensor parallelism for a single token (where all GPUs work in parallel). The advantage is in total communication volume: 3 handoffs of 16 KB each = 48 KB total, vs. 160 all-reduce operations for tensor parallelism.',
            },
          ].map((step) => (
            <div key={step.num} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {step.num}
              </span>
              <div className="text-[var(--color-text-secondary)] leading-relaxed">
                <strong className="text-[var(--color-text)]">{step.label}.</strong>{' '}
                {step.text}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Micro-batching fills the pipeline</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            With multiple tokens from different users, all stages stay busy simultaneously:
          </p>
        </div>
        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-center">Stage 1 (L1-20)</th>
                <th className="px-3 py-2 text-center">Stage 2 (L21-40)</th>
                <th className="px-3 py-2 text-center">Stage 3 (L41-60)</th>
                <th className="px-3 py-2 text-center">Stage 4 (L61-80)</th>
              </tr>
            </thead>
            <tbody>
              {MICRO_BATCH_TIMELINE.map((row) => (
                <tr key={row.time} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-3 py-2 font-mono font-medium text-[var(--color-text)]">{row.time}</td>
                  <td className="px-3 py-2 text-center font-mono text-[var(--color-text-secondary)]">{row.stage1}</td>
                  <td className="px-3 py-2 text-center font-mono text-[var(--color-text-secondary)]">{row.stage2}</td>
                  <td className="px-3 py-2 text-center font-mono text-[var(--color-text-secondary)]">{row.stage3}</td>
                  <td className="px-3 py-2 text-center font-mono text-[var(--color-text-secondary)]">{row.stage4}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <InfoBox>
          Once the pipeline is full (T4 onward), all 4 GPUs are busy simultaneously &mdash; each
          processing a different token at a different stage. Throughput approaches that of tensor
          parallelism, while per-token latency is higher.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Memory layout (PP=4)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">GPU</th>
                <th className="px-4 py-2 text-left">Layers</th>
                <th className="px-4 py-2 text-right">Weights</th>
                <th className="px-4 py-2 text-left">KV Cache</th>
                <th className="px-4 py-2 text-left">Comm.</th>
              </tr>
            </thead>
            <tbody>
              {PIPELINE_PARALLEL_GPUS.map((row) => (
                <tr key={row.gpu} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 font-mono font-medium text-[var(--color-text)]">{row.gpu}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.layers}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.weights}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.cacheDesc}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.communication}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[var(--color-border)] font-medium text-[var(--color-text)]">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2">All 80 layers</td>
                <td className="px-4 py-2 text-right font-mono">140 GB</td>
                <td className="px-4 py-2">Distributed by layer</td>
                <td className="px-4 py-2">Minimal</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Strengths and weaknesses</PanelHeader>
        <div className="p-4 space-y-3">
          <div className="p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
            <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider mb-2">
              Strengths
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              Minimal communication &mdash; just one point-to-point send of ~16 KB per stage
              boundary per token. Works across nodes (doesn&rsquo;t need NVLink). Good for
              memory &mdash; each GPU stores only 1/4 of the layers.
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-red-bg)] border border-[var(--color-red)]">
            <div className="text-[11px] font-medium text-[var(--color-red-text)] uppercase tracking-wider mb-2">
              Weakness
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              Higher per-token latency &mdash; the token must traverse all stages sequentially.
              Pipeline bubbles at the start (stages 2&ndash;4 idle while stage 1 processes the
              first token) and end (stage 1 idle while stage 4 finishes the last token).
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="note"
        message='<strong>KV cache implication:</strong> The cache is split across the <strong>layer dimension</strong>. GPU 0&rsquo;s cache contains layers 1&ndash;20 for ALL tokens. GPU 3&rsquo;s cache contains layers 61&ndash;80 for ALL tokens. A token&rsquo;s complete cache is distributed across all pipeline stages. To move a full user&rsquo;s cache (e.g., for disaggregated inference), you must gather from all stages &mdash; but the data at each stage is contiguous by layer, which maps naturally to the tier structure we&rsquo;ll see in Stop 13.'
      />
    </div>
  );
}

function ChoosingPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Side-by-side comparison</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Dimension</th>
                <th className="px-3 py-2 text-left">Data Parallel</th>
                <th className="px-3 py-2 text-left">Tensor Parallel</th>
                <th className="px-3 py-2 text-left">Pipeline Parallel</th>
              </tr>
            </thead>
            <tbody>
              {PARALLELISM_COMPARISON.map((row) => (
                <tr key={row.dimension} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">{row.dimension}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.data}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.tensor}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.pipeline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Three configurations for our scenario</PanelHeader>
        <div className="p-4 space-y-3">
          {SCENARIO_CONFIGS.map((config) => (
            <div
              key={config.label}
              className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]"
            >
              <div className="text-[13px] font-medium text-[var(--color-text)] mb-1">
                {config.label}
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                {config.description}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <div>
                  <span className="text-[var(--color-text-muted)]">Total cache: </span>
                  <span className="font-mono text-[var(--color-text)]">{config.totalCache}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Max users @8K: </span>
                  <span className="font-mono text-[var(--color-text)]">{config.maxUsersAt8K}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[var(--color-text-muted)]">Communication: </span>
                  <span className="font-mono text-[var(--color-text)]">{config.communication}</span>
                </div>
              </div>
              <div className="mt-1 text-[11px] text-[var(--color-text-muted)] italic">
                {config.tradeoff}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="note"
        message="The right choice depends on your priorities: latency (TP), throughput (DP), model size (PP), or some combination. But all of these strategies still run prefill and decode on the same GPUs. The next question is: what if we separated them?"
      />
    </div>
  );
}

function DisaggregatedPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Aggregated vs. disaggregated</PanelHeader>
        <div className="p-4 space-y-3">
          <div className="p-3 rounded-lg bg-[var(--color-red-bg)] border border-[var(--color-red)]">
            <div className="text-[11px] font-medium text-[var(--color-red-text)] uppercase tracking-wider mb-2">
              Aggregated (current)
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed space-y-2">
              <p>
                One GPU handling both prefill and decode. When User 17&rsquo;s 28,000-token
                document arrives for prefill, the GPU is fully occupied for several seconds.
                Users 1&ndash;4 on that GPU see their token generation stall &mdash; no new
                tokens until the prefill completes.
              </p>
              <div className="text-[11px] text-[var(--color-text-muted)] italic">
                Prefill blocks decode. Users see latency spikes.
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-teal-bg)] border border-[var(--color-teal)]">
            <div className="text-[11px] font-medium text-[var(--color-teal-text)] uppercase tracking-wider mb-2">
              Disaggregated
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed space-y-2">
              <p>
                Two separate GPU pools. The <strong className="text-[var(--color-text)]">Prefill Pool</strong> (2
                GPUs, optimized for compute throughput) processes User 17&rsquo;s prompt with all
                compute cores busy. The <strong className="text-[var(--color-text)]">Decode Pool</strong> (6
                GPUs, optimized for memory bandwidth) gives Users 1&ndash;16 steady token
                generation with no prefill bursts to stall them.
              </p>
              <div className="text-[11px] text-[var(--color-text-muted)] italic">
                Prefill and decode run independently. No interference.
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>What transfers between pools</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The KV cache is the <strong className="text-[var(--color-text)]">ONLY artifact that must
            transfer</strong> between prefill and decode. The model weights don&rsquo;t move (both
            pools have their own copies or shards). The token embeddings don&rsquo;t move
            (they&rsquo;re recreated from the token IDs). Only the K and V vectors &mdash; the
            pre-computed results stored at every layer &mdash; must travel from the prefill GPU
            to the decode GPU.
          </p>
          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] font-mono text-[12px] text-[var(--color-text)] text-center leading-loose">
            28,000 tokens &times; 320 KB/token = <strong>8.96 GB</strong>
          </div>
          <p>
            This is a substantial network transfer. The time it takes directly impacts{' '}
            <strong className="text-[var(--color-text)]">Time-to-First-Token (TTFT)</strong> &mdash;
            the delay between the user submitting their prompt and seeing the first word of
            the response.
          </p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Transfer time for 8.96 GB across network types</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Network</th>
                <th className="px-4 py-2 text-right">Bandwidth</th>
                <th className="px-4 py-2 text-right">Transfer time</th>
              </tr>
            </thead>
            <tbody>
              {TRANSFER_TIMES.map((row) => (
                <tr key={row.network} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 text-[var(--color-text)]">{row.network}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.bandwidth}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-text)]">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="warn"
        message="The network between prefill and decode pools is on the <strong>critical path</strong> of every inference request. This is the moment the KV cache becomes a networking story &mdash; the transfer latency directly determines how fast the user sees their first token."
      />
    </div>
  );
}

function DynamoPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>NVIDIA Dynamo architecture</PanelHeader>
        <div className="p-4 space-y-3">
          {DYNAMO_COMPONENTS.map((comp) => (
            <div
              key={comp.name}
              className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-medium text-[var(--color-text)]">
                  {comp.name}
                </span>
                {comp.gpus !== '\u2014' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]">
                    {comp.gpus} &mdash; {comp.config}
                  </span>
                )}
                {comp.gpus === '\u2014' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                    {comp.config}
                  </span>
                )}
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                {comp.role}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Dynamic pool sizing</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The Planner&rsquo;s ability to dynamically resize the pools is what makes
            disaggregated inference adaptive. During peak hours (many new conversations),
            more GPUs handle prefill. During off-peak (existing conversations continuing),
            more GPUs handle decode.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">For our scenario at steady state:</strong>{' '}
            With 32 concurrent users and an average of 2 new conversations per minute, 2 prefill
            GPUs handle the load easily (each prefill of an 8K-token prompt takes ~100 ms on 2 TP
            GPUs). The 6 decode GPUs each serve ~5 users with continuous batching, well within
            their memory and throughput capacity.
          </p>
        </div>
      </Panel>

      <Callout
        type="good"
        message="Dynamo doesn&rsquo;t replace the inference engine (vLLM, TensorRT-LLM, SGLang). It orchestrates <strong>above</strong> them &mdash; managing GPU pools, routing requests, transferring caches, and dynamically balancing the prefill/decode ratio."
      />
    </div>
  );
}

function LifecyclePage() {
  const frames = [
    {
      num: '1',
      label: 'Request arrives',
      text: 'User 17 submits prompt (28,000 tokens). Smart Router directs it to the Prefill Pool.',
    },
    {
      num: '2',
      label: 'Prefill begins',
      text: 'Prefill GPU 0 and GPU 1 (TP=2) receive the prompt. 28,000 tokens enter Layer 1 simultaneously. At each of the 80 layers, K and V vectors are computed, stored in PagedAttention pages, and attention is computed. Total cache size: 8.96 GB (4.48 GB per GPU in TP=2).',
    },
    {
      num: '3',
      label: 'Prefill complete \u2014 transfer begins',
      text: 'Output projection \u2192 softmax \u2192 first token selected. NIXL begins transferring the 8.96 GB KV cache from Prefill GPUs to Decode GPU 3. Transfer takes ~180 ms at 400G RDMA. During transfer, Decode GPU 3\u2019s other users (Users 13\u201316) continue generating tokens normally.',
    },
    {
      num: '4',
      label: 'Decode begins',
      text: 'Transfer complete. User 17\u2019s KV cache is now in Decode GPU 3\u2019s PagedAttention page table. User 17 joins the continuous batch. Decode GPU 3 now serves Users 13\u201317, processing 5 tokens per step (one per user), appending 5 new K, V entries per step.',
    },
    {
      num: '5',
      label: 'Response complete',
      text: 'After User 17\u2019s response is fully generated (2,000 tokens later): the 30,000-token cache (28,000 + 2,000) pages are freed, becoming available for the next conversation. If User 17 sends a follow-up, only the new message goes through prefill (incremental prefill, from Stop 10).',
    },
  ];

  return (
    <div>
      <Panel>
        <PanelHeader>User 17&rsquo;s request &mdash; end to end</PanelHeader>
        <div className="p-4 space-y-2">
          {frames.map((frame) => (
            <div key={frame.num} className="flex gap-3 items-start text-[13px]">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                {frame.num}
              </span>
              <div className="text-[var(--color-text-secondary)] leading-relaxed">
                <strong className="text-[var(--color-text)]">{frame.label}.</strong>{' '}
                {frame.text}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Cache lifecycle summary</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Phase</th>
                <th className="px-4 py-2 text-left">Where cache lives</th>
                <th className="px-4 py-2 text-right">Size</th>
                <th className="px-4 py-2 text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {CACHE_LIFECYCLE.map((row) => (
                <tr key={row.phase} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.phase}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.where}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.size}</td>
                  <td className="px-4 py-2 text-right text-[var(--color-text-secondary)]">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Born, moved, grows, persists, dies</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The cache is <strong className="text-[var(--color-text)]">born</strong> in prefill,{' '}
            <strong className="text-[var(--color-text)]">moved</strong> to decode,{' '}
            <strong className="text-[var(--color-text)]">grows</strong> during generation,{' '}
            <strong className="text-[var(--color-text)]">persists</strong> across turns, and{' '}
            <strong className="text-[var(--color-text)]">dies</strong> when the conversation ends.
            Every stop in Act 2 touches a different phase of this lifecycle:
          </p>
          <div className="space-y-2">
            {LIFECYCLE_STOP_MAP.map((item) => (
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function SummaryPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Four ways to split inference work</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Split type</th>
                <th className="px-4 py-2 text-left">What&rsquo;s split</th>
                <th className="px-4 py-2 text-left">KV cache effect</th>
                <th className="px-4 py-2 text-left">Network requirement</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_TABLE.map((row) => (
                <tr key={row.splitType} className="border-b border-[var(--color-border-light)] last:border-b-0">
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.splitType}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.whatsSplit}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.cacheEffect}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.networkReq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Bridge to Stop 13</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The KV cache transfer between prefill and decode takes ~180 ms in our scenario.
            But what happens when the Decode GPU&rsquo;s HBM fills up? With 5 users at 8K
            tokens each (12.5 GB), plus User 17&rsquo;s 10.56 GB document cache, we&rsquo;re
            using ~23 GB of the 45 GB available. Comfortable now &mdash; but add 10 more users,
            or let conversations grow to 32K tokens, and we&rsquo;ll hit the memory wall again.
          </p>
          <p>
            Stop 11 showed one answer: preempt or queue. But there&rsquo;s another option: move
            less-recently-used cache pages to cheaper, larger memory. An H100 server has{' '}
            <strong className="text-[var(--color-text)]">~2 TB of CPU DRAM</strong> alongside its
            80 GB of HBM. At 200 GB/s PCIe bandwidth, swapping a 2.5 GB cache to DRAM takes{' '}
            <strong className="text-[var(--color-text)]">~12.5 ms</strong>. That&rsquo;s slow
            compared to HBM access (0.1 ms), but far better than recomputing the entire cache
            from scratch (~100 ms of prefill).
          </p>
          <p>
            This multi-tier approach &mdash; HBM for hot caches, DRAM for warm, SSD for cold,
            networked storage for frozen &mdash; is the subject of{' '}
            <strong className="text-[var(--color-text)]">Stop 13</strong>.
          </p>
        </div>
      </Panel>

      <Callout
        type="good"
        message="The KV cache is no longer a GPU-local optimization. It is data in flight &mdash; born in prefill, transferred between pools, grown during decode, swapped between memory tiers, and routed across clusters. The engineering challenges of LLM inference are fundamentally shaped by the size, structure, and lifecycle of the KV cache."
      />
    </div>
  );
}

// --- Main Component ---

export default function SplittingWork() {
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
        {page.id === 'one-gpu' && <OneGpuPage />}
        {page.id === 'data-parallel' && <DataParallelPage />}
        {page.id === 'tensor-parallel' && <TensorParallelPage />}
        {page.id === 'pipeline-parallel' && <PipelineParallelPage />}
        {page.id === 'choosing' && <ChoosingPage />}
        {page.id === 'disaggregated' && <DisaggregatedPage />}
        {page.id === 'dynamo' && <DynamoPage />}
        {page.id === 'lifecycle' && <LifecyclePage />}
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
