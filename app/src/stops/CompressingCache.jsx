import { useState, useCallback, useEffect } from 'react';
import {
  PAGES,
  COMPRESSION_DIMENSIONS,
  ARCH_COMPARISON,
  QUANTIZATION_LEVELS,
  QUANTIZATION_BENCHMARKS,
  ATTENTION_DISTRIBUTION,
  COMBINED_PRESETS,
  ACCURACY_BY_TASK,
  INFRA_IMPACT,
  SUMMARY_TABLE,
} from '../data/stop14Data';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Narration text for each page ---

const NARRATIONS = {
  cascading:
    'In our scenario, Llama-3 70B&rsquo;s KV cache takes 320 KB per token at FP16. For a 28,000-token conversation, that&rsquo;s 8.96 GB. If we could cut that in half &mdash; to 160 KB per token, 4.48 GB total &mdash; the effect cascades through every tier we saw in Stop 13: <strong>G1 (HBM):</strong> fit 288 active users instead of 144. <strong>G2 (DRAM):</strong> fit 1,600 warm conversations instead of 800. <strong>Transfer time:</strong> the P/D transfer from Stop 12 drops from 180 ms to 90 ms. <strong>Cache hit rate:</strong> more conversations maintained = fewer misses = fewer costly recomputes. <strong>Network bandwidth:</strong> every promotion/demotion moves half the data. Compression doesn&rsquo;t just save memory. It improves latency, throughput, network utilization, and cost at every level of the stack. That&rsquo;s why it&rsquo;s one of the most actively researched areas in LLM inference.',

  architectural:
    'We introduced GQA in Stop 8 &mdash; grouping attention heads to share K and V. Now let&rsquo;s see all three architectural approaches in depth, with concrete cache sizes for our scenario. These techniques are <strong>built into the model architecture</strong>. They&rsquo;re chosen during model design and training, not applied afterward. If a model was trained with GQA, you can&rsquo;t switch it to MHA or MLA later &mdash; the weight matrices were shaped for one specific approach.',

  quantization:
    'Architectural compression reduces the <em>number</em> of vectors stored per token. Quantization reduces the <em>precision</em> of each number within those vectors. Every number in the KV cache is stored as a floating-point value. At FP16 (16-bit), each number uses 2 bytes. At FP8 (8-bit), just 1 byte. At INT4 (4-bit), half a byte. Each step halves the memory &mdash; and each step loses some numerical precision.',

  eviction:
    'The third family takes a radical approach: instead of making each entry smaller, remove entire token entries from the cache. If a token contributed almost nothing to attention in the past, it probably won&rsquo;t matter in the future. Why store it? This sounds dangerous &mdash; and it can be. But research shows that attention is highly skewed: a small fraction of tokens receive the vast majority of attention weight. Most tokens contribute almost nothing. The challenge is identifying which tokens are important and which can be safely evicted.',

  combined:
    'The three compression families are independent &mdash; you can stack them. Let&rsquo;s see the combined effect on our scenario&rsquo;s 28,000-token conversation with Llama-3 70B.',

  accuracy:
    'Every compression technique promises &ldquo;minimal accuracy loss.&rdquo; But &ldquo;minimal&rdquo; means different things for different tasks. A chatbot answering general questions is more forgiving than a reasoning model solving math problems. Here&rsquo;s what the benchmarks actually show.',

  infrastructure:
    'Let&rsquo;s trace the impact of compression through every component we&rsquo;ve built in Stops 11&ndash;13. For our scenario, comparing GQA + FP16 (the baseline from Stops 11&ndash;13) with GQA + FP8 (the recommended production setting).',

  summary:
    'Three families of compression, each attacking a different dimension of the cache. Architectural changes are chosen at model design time. Quantization and eviction are applied at inference time. All three can be combined.',
};

// --- Page Content Components ---

function CascadingPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Three dimensions of compression</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The KV cache for one token can be visualized as a grid: rows = layers (80),
            columns = KV head groups (8), each cell = d<sub>head</sub> numbers (128)
            at some precision (2 bytes for FP16). Three arrows point to three independent
            dimensions of compression:
          </p>
        </div>

        <div className="px-4 pb-4 space-y-3">
          {COMPRESSION_DIMENSIONS.map((dim) => (
            <div
              key={dim.id}
              className="p-3 rounded-lg border border-[var(--color-border-light)]"
              style={{ borderLeftWidth: 4, borderLeftColor: dim.color }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ background: `${dim.color}22`, color: dim.color }}
                >
                  {dim.arrow}
                </span>
                <span className="text-[13px] font-medium text-[var(--color-text)]">
                  {dim.label}
                </span>
              </div>
              <div className="text-[12px] text-[var(--color-text-muted)] flex gap-4">
                <span>{dim.techniques}</span>
                <span>&mdash; {dim.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout
        type="note"
        message="These three dimensions are <strong>independent</strong> &mdash; you can apply all three simultaneously. A model with GQA (8 KV groups instead of 64), FP8 quantization (1 byte instead of 2), and 50% token eviction would have a cache that&rsquo;s 8&times; smaller (from GQA) &times; 2&times; smaller (from FP8) &times; 2&times; smaller (from eviction) = <strong>32&times; smaller</strong> than full MHA at FP16 with no eviction. That turns our 8.96 GB conversation into 280 MB."
      />

      <Callout
        type="warn"
        message="Of course, each compression costs accuracy. The rest of this stop explores each family, what it costs, and how far you can push it."
      />
    </div>
  );
}

function ArchitecturalPage() {
  const [selected, setSelected] = useState('gqa');
  const selectedArch = ARCH_COMPARISON.find((a) => a.id === selected);

  // Bar width relative to MHA baseline
  const mhaBytes = ARCH_COMPARISON[0].perTokenBytes;

  return (
    <div>
      {/* Architecture selector */}
      <Panel>
        <PanelHeader>Select an architecture</PanelHeader>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {ARCH_COMPARISON.map((arch) => (
              <button
                key={arch.id}
                onClick={() => setSelected(arch.id)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded border transition-colors cursor-pointer ${
                  selected === arch.id
                    ? 'bg-[var(--color-primary-bg)] border-[var(--color-primary)] text-[var(--color-primary-text)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                }`}
              >
                {arch.name}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* Selected architecture detail */}
      {selectedArch && (
        <Panel className="mt-4">
          <PanelHeader>{selectedArch.name} &mdash; {selectedArch.fullName}</PanelHeader>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-2 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
                <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">KV Heads</div>
                <div className="text-[16px] font-mono font-bold text-[var(--color-text)]">{selectedArch.kvHeads}</div>
              </div>
              <div className="p-2 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
                <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Per Token</div>
                <div className="text-[16px] font-mono font-bold text-[var(--color-text)]">{selectedArch.perToken}</div>
              </div>
              <div className="p-2 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
                <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">28K Tokens</div>
                <div className="text-[16px] font-mono font-bold text-[var(--color-text)]">{selectedArch.at28K}</div>
              </div>
              <div className="p-2 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
                <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">vs MHA</div>
                <div className="text-[16px] font-mono font-bold text-[var(--color-teal-text)]">{selectedArch.reduction}</div>
              </div>
            </div>

            {/* Size bar visualization */}
            <div className="space-y-1">
              <div className="text-[11px] text-[var(--color-text-muted)]">Cache size relative to MHA baseline</div>
              <div className="h-8 rounded overflow-hidden border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]">
                <div
                  className="h-full rounded flex items-center px-2 text-[11px] font-medium text-white transition-all duration-500"
                  style={{
                    width: `${Math.max(2, (selectedArch.perTokenBytes / mhaBytes) * 100)}%`,
                    background: 'var(--color-teal)',
                  }}
                >
                  {selectedArch.perToken}
                </div>
              </div>
            </div>

            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              {selectedArch.qualityNote}
            </div>
          </div>
        </Panel>
      )}

      {/* Full comparison table */}
      <Panel className="mt-4">
        <PanelHeader>All architectures compared</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Approach</th>
                <th className="px-4 py-2 text-right">KV Heads</th>
                <th className="px-4 py-2 text-right">Per Token</th>
                <th className="px-4 py-2 text-right">28K Tokens</th>
                <th className="px-4 py-2 text-right">Reduction</th>
              </tr>
            </thead>
            <tbody>
              {ARCH_COMPARISON.map((arch) => (
                <tr
                  key={arch.id}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    arch.id === selected ? 'bg-[var(--color-primary-bg)]' : ''
                  }`}
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{arch.name}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{arch.kvHeads}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{arch.perToken}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{arch.at28K}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-teal-text)]">{arch.reduction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <InfoBox>
        <strong>MHA</strong> gives every Q head its own K and V &mdash; 64 KV heads for Llama-3 70B.
        Per token: 2 &times; 80 layers &times; 64 heads &times; 128 d<sub>head</sub> &times; 2 bytes = <strong>2.62 MB</strong>.
        At 28K tokens, one user nearly fills an H100.
      </InfoBox>

      <InfoBox>
        <strong>GQA</strong> (what Llama-3 actually uses) shares one KV group across every 8 Q heads.
        The insight: K and V are less head-specific than Q. Multiple Q heads asking different questions
        can effectively share the same K, V representation. Ablation studies show performance nearly
        indistinguishable from MHA.
      </InfoBox>

      <InfoBox>
        <strong>MLA</strong> (DeepSeek&rsquo;s approach) compresses K, V into a smaller <strong>latent vector</strong> and
        reconstructs them on demand during attention. The compression is trained end-to-end, so the model
        learns to preserve the information that matters. The tradeoff: more compute at attention time,
        but ~2.5&times; smaller blocks than GQA &mdash; meaning faster transfers, more conversations per tier,
        and higher cache hit rates.
      </InfoBox>
    </div>
  );
}

function QuantizationPage() {
  const [selectedLevel, setSelectedLevel] = useState('fp8');

  return (
    <div>
      {/* Concrete example */}
      <Panel>
        <PanelHeader>What quantization actually does</PanelHeader>
        <div className="p-4 space-y-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Take one K vector value: <strong className="text-[var(--color-text)]">0.7342529296875</strong> (in FP16, stored as 2 bytes).
            Here&rsquo;s what happens at each precision level:
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Format</th>
                <th className="px-4 py-2 text-right">Bits</th>
                <th className="px-4 py-2 text-right">Bytes</th>
                <th className="px-4 py-2 text-left">Stored Value</th>
                <th className="px-4 py-2 text-right">Error</th>
                <th className="px-4 py-2 text-right">Per Token (GQA-8)</th>
              </tr>
            </thead>
            <tbody>
              {QUANTIZATION_LEVELS.map((lvl) => (
                <tr
                  key={lvl.id}
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 cursor-pointer transition-colors ${
                    selectedLevel === lvl.id ? 'bg-[var(--color-primary-bg)]' : 'hover:bg-[var(--color-surface-alt)]'
                  }`}
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{lvl.format}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{lvl.bits}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{lvl.bytes}</td>
                  <td className="px-4 py-2 font-mono text-[var(--color-text-secondary)]">{lvl.storedValue}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{lvl.error}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[var(--color-text)]">{lvl.perToken}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <InfoBox>
        Each number individually loses very little precision. But there are billions of numbers
        in the cache, and the errors accumulate across layers. The question is: how much accuracy
        does the model lose overall?
      </InfoBox>

      {/* Benchmark results */}
      <Panel className="mt-4">
        <PanelHeader>Benchmark results (2025&ndash;2026 research)</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Method</th>
                <th className="px-4 py-2 text-right">Compression</th>
                <th className="px-4 py-2 text-right">Accuracy</th>
                <th className="px-4 py-2 text-left">Best For</th>
              </tr>
            </thead>
            <tbody>
              {QUANTIZATION_BENCHMARKS.map((row) => (
                <tr
                  key={row.method}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-[var(--color-text)]">{row.method}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.compression}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--color-teal-text)]">{row.accuracy}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>The practical takeaway:</strong> FP8 KV cache quantization is essentially free on modern GPUs (H100, B200) &mdash; it halves the cache with negligible accuracy loss and is natively supported in hardware. Every production deployment should use it. Beyond FP8, the accuracy/compression tradeoff becomes workload-dependent."
      />

      <Callout
        type="note"
        message="<strong>For our scenario:</strong> Switching from FP16 to FP8 halves our cache. 28,000 tokens goes from 8.96 GB to 4.48 GB. The P/D transfer from Stop 12 drops from 180 ms to 90 ms. The number of active users per GPU doubles from 18 to 36. This single change has the highest impact-to-effort ratio of any optimization in this course."
      />
    </div>
  );
}

function EvictionPage() {
  const [showEvicted, setShowEvicted] = useState(false);

  // Top 3 account for 74%, bottom 5 account for 8%
  const evictThreshold = 3; // tokens with pct <= 3 are "safe to evict"
  const keptTokens = ATTENTION_DISTRIBUTION.filter((t) => t.pct > evictThreshold);
  const evictedTokens = ATTENTION_DISTRIBUTION.filter((t) => t.pct <= evictThreshold);
  const keptPct = keptTokens.reduce((s, t) => s + t.pct, 0);
  const evictedPct = evictedTokens.reduce((s, t) => s + t.pct, 0);

  return (
    <div>
      {/* Attention distribution animation */}
      <Panel>
        <PanelHeader>
          Attention from &ldquo;faulty&rdquo; to all other tokens
        </PanelHeader>
        <div className="p-4 space-y-2">
          {ATTENTION_DISTRIBUTION.map((tok) => {
            const isEvicted = showEvicted && tok.pct <= evictThreshold;
            return (
              <div
                key={tok.token}
                className={`flex items-center gap-3 text-[12px] transition-opacity duration-500 ${
                  isEvicted ? 'opacity-20' : ''
                }`}
              >
                <span className="min-w-[120px] font-mono text-[var(--color-text)]">
                  {tok.token}
                </span>
                <div className="flex-1 h-5 bg-[var(--color-surface-muted)] rounded overflow-hidden border border-[var(--color-border-light)]">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                      width: `${tok.pct * 2}%`,
                      background: isEvicted
                        ? 'var(--color-red)'
                        : tok.pct >= 12
                          ? 'var(--color-teal)'
                          : tok.pct >= 4
                            ? 'var(--color-blue)'
                            : 'var(--color-text-muted)',
                    }}
                  />
                </div>
                <span className="min-w-[40px] text-right font-mono text-[var(--color-text-secondary)]">
                  {tok.weight}
                </span>
                <span className={`min-w-[90px] text-[11px] ${
                  isEvicted ? 'text-[var(--color-red-text)] font-medium' : 'text-[var(--color-text-muted)]'
                }`}>
                  {isEvicted ? 'EVICTED' : tok.action}
                </span>
              </div>
            );
          })}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={() => setShowEvicted(!showEvicted)}
            className="px-4 py-2 text-[12px] font-medium rounded border border-[var(--color-primary)]
                       bg-[var(--color-primary-bg)] text-[var(--color-primary-text)]
                       hover:bg-[var(--color-primary)] hover:text-white
                       transition-colors cursor-pointer"
          >
            {showEvicted ? 'Show all tokens' : 'Evict low-attention tokens'}
          </button>
          {showEvicted && (
            <div className="mt-3 text-[12px] text-[var(--color-text-secondary)]">
              Top {keptTokens.length} tokens retain <strong className="text-[var(--color-teal-text)]">{keptPct}%</strong> of attention.
              Bottom {evictedTokens.length} tokens accounted for just <strong className="text-[var(--color-red-text)]">{evictedPct}%</strong>.
              The model would still strongly attend to &ldquo;storage controller&rdquo; &mdash; the correct answer.
            </div>
          )}
        </div>
      </Panel>

      <InfoBox>
        This is a toy example with 15 tokens. At 28,000 tokens, the skew is even more extreme:
        typically 5&ndash;10% of tokens receive 80&ndash;90% of the attention mass. The rest is noise.
      </InfoBox>

      {/* Two eviction strategies */}
      <Panel className="mt-4">
        <PanelHeader>Two major eviction strategies</PanelHeader>
        <div className="p-4 space-y-4">
          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
            <div className="text-[14px] font-medium text-[var(--color-text)] mb-2">
              H2O (Heavy-Hitter Oracle)
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed space-y-2">
              <p>
                Track cumulative attention scores for each token across all queries.
                Keep the &ldquo;heavy hitters&rdquo; (high cumulative attention) plus a window
                of recent tokens (the last N tokens, which might become important). Evict everything else.
              </p>
              <p>
                Fixed cache budget: e.g., keep the top 20% of tokens by attention score plus the
                last 128 tokens. Result: <strong className="text-[var(--color-text)]">80% of tokens evicted, cache shrinks by 5&times;</strong>.
                Retains 90&ndash;95% of full-cache performance on most tasks.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-light)]">
            <div className="text-[14px] font-medium text-[var(--color-text)] mb-2">
              SnapKV
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed space-y-2">
              <p>
                Similar to H2O but uses a smarter observation window: instead of tracking attention
                across all queries, it examines attention patterns from a window of recent queries and
                selects tokens that are consistently important within that window.
              </p>
              <p>
                Uses clustering to identify representative tokens rather than keeping every high-scorer.
                Can achieve similar compression with <strong className="text-[var(--color-text)]">better accuracy retention on long-context tasks</strong>.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        type="warn"
        message="Eviction is powerful but risky. When it works, it&rsquo;s the most aggressive compression available &mdash; 5&times; to 10&times; reduction. When it fails, it fails hard: the model can&rsquo;t attend to an evicted token, period. Unlike quantization, where information is degraded but still present, evicted information is <strong>gone</strong>."
      />

      {/* Adaptive precision */}
      <Panel className="mt-4">
        <PanelHeader>Beyond binary: adaptive precision instead of eviction</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            The keep-or-evict choice is a blunt instrument. A token that gets 3% attention
            isn&rsquo;t worthless &mdash; it&rsquo;s just less important than one getting 48%.
            What if instead of evicting it entirely, you stored it at lower precision? The
            important tokens get FP8 or FP16. The moderate tokens get INT4. The barely-relevant
            tokens get 2-bit or even a codebook index. The token is still <em>present</em> &mdash;
            it can still be attended to &mdash; but its representation is lossy.
          </p>
          <p>
            This is <strong className="text-[var(--color-text)]">adaptive precision allocation</strong>,
            and it&rsquo;s an active frontier of research:
          </p>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="p-3 rounded-lg border border-[var(--color-border-light)]" style={{ borderLeftWidth: 4, borderLeftColor: 'var(--color-teal)' }}>
            <div className="text-[13px] font-medium text-[var(--color-text)] mb-1">
              ThinKV (2025)
            </div>
            <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
              Classifies tokens by their role in reasoning chains and assigns precision accordingly:
              FP8 for reasoning tokens (highest importance), NVFP4 for execution tokens (moderate),
              2-bit ternary for transitional phrases (lowest). Classification happens dynamically
              during inference.
            </div>
          </div>

          <div className="p-3 rounded-lg border border-[var(--color-border-light)]" style={{ borderLeftWidth: 4, borderLeftColor: 'var(--color-blue)' }}>
            <div className="text-[13px] font-medium text-[var(--color-text)] mb-1">
              VQKV &mdash; Vector Quantization (2026)
            </div>
            <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
              Replaces groups of floating-point values with indices into a learned <strong className="text-[var(--color-text)]">codebook</strong> &mdash;
              a table of representative vectors trained during calibration. Instead of storing 128 FP16
              numbers (256 bytes) for a K or V vector, store a codebook index (a few bytes). Result:
              82.8% compression ratio with 98.6% accuracy retention on LongBench.
            </div>
          </div>
        </div>
      </Panel>

      <InfoBox>
        The direction is clear: the binary &ldquo;full precision vs. gone&rdquo; choice is being replaced
        by a <strong>precision gradient</strong> that matches compression aggressiveness to each token&rsquo;s
        importance. This is analogous to variable bitrate encoding in video compression &mdash; allocate
        precision where the content is complex, compress harder where it&rsquo;s simple.
      </InfoBox>

      <Callout
        type="note"
        message="<strong>For our scenario:</strong> Applying H2O with 50% eviction to our 28,000-token document analysis: the cache drops from 8.96 GB to 4.48 GB. Combined with FP8 quantization: 4.48 GB / 2 = 2.24 GB. Combined with GQA (already built in): our 2.24 GB cache is already 32&times; smaller than hypothetical MHA at FP16. A single user&rsquo;s full document context now fits in a fraction of one GPU&rsquo;s memory."
      />
    </div>
  );
}

function CombinedPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Combined compression calculator</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Architecture</th>
                <th className="px-3 py-2 text-left">Quant</th>
                <th className="px-3 py-2 text-left">Eviction</th>
                <th className="px-3 py-2 text-right">Per Token</th>
                <th className="px-3 py-2 text-right">28K Tokens</th>
                <th className="px-3 py-2 text-right">Users/H100</th>
                <th className="px-3 py-2 text-right">P/D Transfer</th>
              </tr>
            </thead>
            <tbody>
              {COMBINED_PRESETS.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.highlight ? 'bg-[var(--color-teal-bg)]' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">{row.arch}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.quant}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.eviction}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.perToken}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.at28K}</td>
                  <td className={`px-3 py-2 text-right font-mono font-medium ${
                    row.highlight ? 'text-[var(--color-teal-text)]' : 'text-[var(--color-text)]'
                  }`}>
                    {row.usersPerH100}
                    {row.usersNote && (
                      <span className="text-[10px] text-[var(--color-text-muted)] ml-1">({row.usersNote})</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.transferTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <InfoBox>
        The last row is theoretical &mdash; MQA at INT4 with 75% eviction would compress the
        cache by over 1,000&times; from MHA + FP16. In practice, the accuracy loss at that extreme
        would make the model nearly useless for complex tasks. But it illustrates the design space:
        there are many viable points between &ldquo;no compression&rdquo; and &ldquo;maximum compression.&rdquo;
      </InfoBox>

      {/* Visual: compression spectrum */}
      <Panel className="mt-4">
        <PanelHeader>The compression spectrum</PanelHeader>
        <div className="p-4 space-y-3">
          {COMBINED_PRESETS.map((row) => {
            // Normalize bar width: log scale to make differences visible
            const sizeGB = parseFloat(row.at28K.replace('~', '').replace(' GB', '').replace(' MB', '')) *
              (row.at28K.includes('MB') ? 0.001 : 1);
            const maxGB = 73.3;
            const pct = Math.max(1, (sizeGB / maxGB) * 100);
            return (
              <div key={row.id} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--color-text)]">
                    {row.arch} + {row.quant} + {row.eviction}
                  </span>
                  <span className="font-mono text-[var(--color-text-muted)]">{row.at28K}</span>
                </div>
                <div className="h-4 bg-[var(--color-surface-muted)] rounded overflow-hidden border border-[var(--color-border-light)]">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${pct}%`,
                      background: row.highlight ? 'var(--color-teal)' : 'var(--color-primary)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>The production sweet spot for most deployments in 2026:</strong> GQA-8 (built into the model) + FP8 quantization (hardware-accelerated, negligible quality loss) = 16&times; compression vs. MHA + FP16. This is what Llama-3 already does (GQA) combined with what every H100/B200 deployment should enable (FP8 KV cache)."
      />
    </div>
  );
}

function AccuracyPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Accuracy retention by task type</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Compression</th>
                <th className="px-3 py-2 text-right">Chat/QA</th>
                <th className="px-3 py-2 text-right">Summarization</th>
                <th className="px-3 py-2 text-right">Code Gen</th>
                <th className="px-3 py-2 text-right">Math Reasoning</th>
                <th className="px-3 py-2 text-right">Long Retrieval</th>
              </tr>
            </thead>
            <tbody>
              {ACCURACY_BY_TASK.map((row) => (
                <tr
                  key={row.compression}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">{row.compression}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-teal-text)]">{row.chatQA}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.summarization}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.codeGen}</td>
                  <td className={`px-3 py-2 text-right font-mono ${
                    parseFloat(row.mathReasoning) < 90 ? 'text-[var(--color-red-text)] font-medium' : 'text-[var(--color-text-secondary)]'
                  }`}>
                    {row.mathReasoning}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono ${
                    parseFloat(row.longRetrieval) < 85 ? 'text-[var(--color-red-text)] font-medium' : 'text-[var(--color-text-secondary)]'
                  }`}>
                    {row.longRetrieval}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="warn"
        message="The pattern: <strong>reasoning and retrieval degrade fastest.</strong> Math reasoning requires precise numerical values in the cache (quantization hurts) and precise recall of specific tokens (eviction hurts). General chat is the most forgiving because the model relies on broad context rather than specific token recall."
      />

      <Panel className="mt-4">
        <PanelHeader>What this means for our scenario</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Our 500 engineers use the assistant for <strong className="text-[var(--color-text)]">code review</strong> (sensitive
            to code generation accuracy), <strong className="text-[var(--color-text)]">documentation</strong> (summarization),
            and <strong className="text-[var(--color-text)]">debugging</strong> (reasoning). FP8 is safe across all tasks.
            INT4 is acceptable for chat and documentation but risky for debugging. Eviction beyond 25%
            would degrade code review quality.
          </p>
          <p>
            Our production configuration: <strong className="text-[var(--color-teal-text)]">GQA-8 + FP8 + no eviction</strong> &mdash;
            the conservative, high-quality choice that still delivers 16&times; compression.
          </p>
        </div>
      </Panel>

      {/* Thought-adaptive compression */}
      <Panel className="mt-4">
        <PanelHeader>An emerging approach: thought-adaptive compression</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            Recent work (ThinKV, 2025) applies different precision levels to different parts
            of the conversation: reasoning tokens get FP8 (high precision), routine context
            gets INT4, and transitional phrases get 2-bit. This mixed-precision approach preserves
            quality where it matters while compressing aggressively where it doesn&rsquo;t.
          </p>
          <p>
            This is analogous to <strong className="text-[var(--color-text)]">variable-bitrate encoding in video compression</strong> &mdash;
            allocate precision where the content is complex, compress harder where it&rsquo;s simple.
          </p>
        </div>
      </Panel>
    </div>
  );
}

function InfrastructurePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>FP16 vs. FP8: impact across the full stack</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Component</th>
                <th className="px-3 py-2 text-right">GQA + FP16</th>
                <th className="px-3 py-2 text-right">GQA + FP8</th>
                <th className="px-3 py-2 text-left">Improvement</th>
              </tr>
            </thead>
            <tbody>
              {INFRA_IMPACT.map((row) => (
                <tr
                  key={row.component}
                  className="border-b border-[var(--color-border-light)] last:border-b-0"
                >
                  <td className="px-3 py-2 text-[var(--color-text)]">{row.component}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.fp16}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-text-secondary)]">{row.fp8}</td>
                  <td className="px-3 py-2 font-medium text-[var(--color-teal-text)]">{row.improvement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout
        type="good"
        message="Every single metric improves. This is why FP8 KV cache quantization is sometimes called &ldquo;the free lunch&rdquo; of inference optimization &mdash; it improves everything with virtually no downside on modern hardware."
      />

      <Callout
        type="note"
        message="<strong>[Forward ref: Stop 15]</strong> When we examine the network fabric in detail, the bandwidth requirements for KV cache transfers will be calculated at FP8 precision &mdash; halving the data that flows over the wire compared to FP16. This affects fabric sizing, switch selection, and congestion management."
      />
    </div>
  );
}

function SummaryPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Three families of compression</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Family</th>
                <th className="px-3 py-2 text-left">Compresses</th>
                <th className="px-3 py-2 text-left">When Applied</th>
                <th className="px-3 py-2 text-right">Reduction</th>
                <th className="px-3 py-2 text-left">Accuracy Cost</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_TABLE.map((row) => (
                <tr
                  key={row.family}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 ${
                    row.highlight ? 'bg-[var(--color-teal-bg)]' : ''
                  }`}
                >
                  <td className={`px-3 py-2 ${row.highlight ? 'font-bold' : 'font-medium'} text-[var(--color-text)]`}>
                    {row.family}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.compresses}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.whenApplied}</td>
                  <td className="px-3 py-2 text-right font-mono font-medium text-[var(--color-teal-text)]">
                    {row.typicalReduction}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.accuracyCost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Bridge to Stop 15 */}
      <Panel className="mt-4">
        <PanelHeader>Bridge to Stop 15</PanelHeader>
        <div className="p-4 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            We now understand what the KV cache <strong className="text-[var(--color-text)]">IS</strong> (Stops 8&ndash;10),
            how it&rsquo;s <strong className="text-[var(--color-text)]">MANAGED</strong> in memory (Stop 11),
            how it <strong className="text-[var(--color-text)]">TRANSFERS</strong> between GPU pools (Stop 12),
            where it <strong className="text-[var(--color-text)]">LIVES</strong> in the memory hierarchy (Stop 13),
            and how to make it <strong className="text-[var(--color-text)]">SMALLER</strong> (this stop).
          </p>
          <p>
            The remaining question: <strong className="text-[var(--color-text)]">HOW</strong> does the cache
            physically move between all these components? What protocols carry it? What switches forward it?
            What bandwidth does each path provide?
          </p>
          <p>
            For our scenario with FP8 compression, a 28,000-token P/D transfer is 4.48 GB. At 400 Gbps
            RDMA (50 GB/s), that&rsquo;s 90 ms. But what <em>IS</em> &ldquo;400 Gbps RDMA&rdquo;?
            It&rsquo;s RoCEv2 running over Spectrum-X Ethernet with lossless flow control. Or it&rsquo;s
            InfiniBand NDR with adaptive routing. Or it&rsquo;s CXL 2.0 for sub-microsecond
            memory-semantic access. Or it&rsquo;s NVMe-oF for storage-tier access. Each protocol has
            different latency, bandwidth, and deployment characteristics.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">
              Stop 15 maps the network fabric that connects every tier and every GPU pool &mdash;
              the data paths that make everything we&rsquo;ve discussed physically possible.
            </strong>
          </p>
        </div>
      </Panel>

      <Callout
        type="good"
        message="<strong>The story so far:</strong> We&rsquo;ve traced the KV cache from a single attention dot product (Stop 2) through multi-head and multi-layer growth (Stops 8&ndash;9), memory management (Stop 11), disaggregated transfer (Stop 12), the storage hierarchy (Stop 13), and now compression (Stop 14). With GQA + FP8, our 28,000-token conversation occupies 4.48 GB instead of the 73.3 GB it would need with MHA + FP16. Next: the physical fabric that carries it."
      />
    </div>
  );
}

// --- Main Component ---

export default function CompressingCache() {
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
        {page.id === 'cascading' && <CascadingPage />}
        {page.id === 'architectural' && <ArchitecturalPage />}
        {page.id === 'quantization' && <QuantizationPage />}
        {page.id === 'eviction' && <EvictionPage />}
        {page.id === 'combined' && <CombinedPage />}
        {page.id === 'accuracy' && <AccuracyPage />}
        {page.id === 'infrastructure' && <InfrastructurePage />}
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
