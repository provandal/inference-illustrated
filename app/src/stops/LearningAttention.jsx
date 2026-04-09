import { useState, useCallback, useEffect } from 'react';
import { PAGES } from '../data/stop4Data';
import { Panel, PanelHeader, InfoBox, Callout, SectionLabel } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Page Content Components ---

function IntroPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The scale of the problem</PanelHeader>
        <InfoBox>
          Consider just one piece of the machinery we saw in Stop 3: the weight
          matrix W<sub>Q</sub>, which transforms each token&rsquo;s embedding into
          a Query vector. For Llama-3 70B, W<sub>Q</sub> transforms a d_model-sized
          vector (8,192 numbers) into a vector for all 64 Q heads (64 &times; 128 =
          8,192 numbers). That makes W<sub>Q</sub> a grid of 8,192 &times; 8,192 ={' '}
          <strong>67 million numbers</strong> in a single layer.
        </InfoBox>
        <InfoBox>
          But not all attention matrices are the same size. Because Llama-3 uses GQA
          with only 8 KV head groups (from Stop 8), W<sub>K</sub> and W<sub>V</sub>{' '}
          are much smaller &mdash; they transform 8,192 numbers into only 8 &times;
          128 = 1,024 numbers. So W<sub>K</sub> and W<sub>V</sub> are each 8,192
          &times; 1,024 = <strong>~8.4 million numbers</strong>. W<sub>O</sub> (the
          output projection from Stop 8) is 8,192 &times; 8,192 ={' '}
          <strong>67 million</strong>, the same size as W<sub>Q</sub>.
        </InfoBox>
        <InfoBox>
          That&rsquo;s the attention side. But each layer also contains a{' '}
          <strong>feed-forward network (FFN)</strong> &mdash; and it&rsquo;s actually
          larger. Llama uses a variant called <strong>SwiGLU</strong>, which requires
          three matrices instead of the usual two: W<sub>1</sub> (gate projection),
          W<sub>2</sub> (down projection), and W<sub>3</sub> (up projection) &mdash;
          each roughly <strong>235 million numbers</strong>.
        </InfoBox>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>Parameter count &mdash; one layer of Llama-3 70B</PanelHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Matrix</th>
                <th className="px-4 py-2 text-left">Size</th>
                <th className="px-4 py-2 text-right">Parameters</th>
              </tr>
            </thead>
            <tbody className="text-[var(--color-text-secondary)]">
              {[
                ['W_Q', '8,192 × 8,192', '67.1M'],
                ['W_K', '8,192 × 1,024', '8.4M'],
                ['W_V', '8,192 × 1,024', '8.4M'],
                ['W_O', '8,192 × 8,192', '67.1M'],
                ['FFN W₁ (gate)', '8,192 × 28,672', '234.9M'],
                ['FFN W₂ (down)', '28,672 × 8,192', '234.9M'],
                ['FFN W₃ (up)', '8,192 × 28,672', '234.9M'],
                ['RMSNorm', '~16K', 'negligible'],
              ].map(([name, size, params], i) => (
                <tr key={i} className="border-b border-[var(--color-border-light)]">
                  <td className="px-4 py-2 font-mono text-[var(--color-text)]">{name}</td>
                  <td className="px-4 py-2 font-mono">{size}</td>
                  <td className="px-4 py-2 text-right font-mono">{params}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[var(--color-border)] font-medium text-[var(--color-text)]">
                <td className="px-4 py-2">Layer total</td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2 text-right font-mono">~856M</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader>From one layer to 70 billion</PanelHeader>
        <InfoBox>
          The model has 80 layers, each with its own independent set of these
          matrices: 856M &times; 80 = <strong>68.5 billion parameters</strong>{' '}
          across all layers. On top of that, the model has an{' '}
          <strong>embedding table</strong> that maps each of the 128,256 vocabulary
          tokens to a d_model-sized vector: 128,256 &times; 8,192 ={' '}
          <strong>~1.05 billion parameters</strong>.
        </InfoBox>
        <InfoBox>
          Grand total: 68.5B + 1.05B &asymp;{' '}
          <strong>~70 billion parameters</strong>. That is what the &ldquo;70B&rdquo;
          in the name means &mdash; the total count of numbers across every matrix in
          every layer, plus the embedding table.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message='<strong>The FFN dominates.</strong> The three FFN matrices account for ~705 million of the ~856 million parameters per layer — roughly <strong>82%</strong> of each layer. The attention matrices (W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub>, W<sub>O</sub>) account for only ~18%. This will matter when we discuss where the model&rsquo;s knowledge is stored (Stop 9) and the memory budget for model weights vs. KV cache.'
      />

      <Callout
        type="note"
        message='<strong>The journey ahead.</strong> No human chose these numbers. No human could. Every weight matrix starts as random noise — meaningless numbers that produce meaningless attention. Training reshapes them over billions of examples until structured knowledge emerges. Then training stops, and the weights are frozen forever. This stop traces that full arc: random initialization, the training loop, and the frozen model that runs during inference.'
      />
    </div>
  );
}

function RandomStartPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Before training: random noise</PanelHeader>
        <InfoBox>
          Before training begins, every weight matrix — W<sub>Q</sub>,{' '}
          W<sub>K</sub>, W<sub>V</sub>, and all the others — is filled with{' '}
          <strong>random numbers</strong>. Small, arbitrary values drawn from a
          statistical distribution.
        </InfoBox>
        <InfoBox>
          What happens when random W<sub>Q</sub> and W<sub>K</sub> transform our
          sentence? The Query for "faulty" points in a random direction. The Key
          for "controller" points in a different random direction. The Key for
          "last" points in yet another. Every dot product — the operation that
          will score how well a Query matches a Key (covered in Stop 5) — comes
          out roughly the same. The resulting attention pattern looks like static
          on a TV screen: "faulty" attends to "storage," "last," "the," and
          everything else with roughly equal strength. If the model had to predict
          the next word, it might say "banana." It has no knowledge of language
          yet.
        </InfoBox>
      </Panel>

      <div className="my-4 grid grid-cols-2 gap-4">
        <Panel>
          <PanelHeader>Random weights (before training)</PanelHeader>
          <div className="p-4 space-y-1.5">
            {['storage controller', 'crashed', 'was', 'server', 'replaced', 'technician', 'other words'].map(
              (label) => {
                const value = Math.floor(Math.random() * 6) + 12;
                return (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span className="min-w-[120px] text-right text-[var(--color-text-secondary)]">
                      {label}
                    </span>
                    <div className="flex-1 h-3 bg-[var(--color-surface-muted)] rounded-[3px] overflow-hidden">
                      <div
                        className="h-full rounded-[3px]"
                        style={{
                          width: `${value}%`,
                          background: 'var(--color-text-muted)',
                        }}
                      />
                    </div>
                    <span className="min-w-[30px] text-right font-mono text-[11px] text-[var(--color-text-muted)]">
                      ~{value}%
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader>Trained weights (after training)</PanelHeader>
          <div className="p-4 space-y-1.5">
            {[
              ['storage controller', 48, 'var(--color-teal)'],
              ['crashed', 14, 'var(--color-blue)'],
              ['was', 12, 'var(--color-blue)'],
              ['server', 8, 'var(--color-text-muted)'],
              ['replaced', 7, 'var(--color-text-muted)'],
              ['technician', 3, 'var(--color-text-muted)'],
              ['other words', 4, 'var(--color-text-muted)'],
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span
                  className={`min-w-[120px] text-right ${
                    value >= 40
                      ? 'font-medium text-[var(--color-text)]'
                      : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  {label}
                </span>
                <div className="flex-1 h-3 bg-[var(--color-surface-muted)] rounded-[3px] overflow-hidden">
                  <div
                    className="h-full rounded-[3px]"
                    style={{ width: `${value}%`, background: color }}
                  />
                </div>
                <span className="min-w-[30px] text-right font-mono text-[11px] text-[var(--color-text-muted)]">
                  {value}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader>What changed inside W<sub>Q</sub></PanelHeader>
        <InfoBox>
          The two charts above show the same operation — "faulty" attending to
          each word — but with different weight matrices. The random version
          spreads attention uniformly. The trained version concentrates it.
          What happened in between?
        </InfoBox>
        <InfoBox>
          After billions of sentences where adjectives like "faulty,"
          "defective," and "broken" modified hardware nouns like "controller,"
          "drive," and "module," the training process reshaped W<sub>Q</sub> so
          that it projects "faulty" into a Query direction that means{' '}
          <strong>"looking for the component I describe."</strong> Simultaneously,
          W<sub>K</sub> learned to project "controller" into a Key direction that
          means <strong>"I am a hardware component."</strong> These two directions
          align — their dot product is large — so the attention score is high.
          Meanwhile, "last" and "week" produce Keys that point in unrelated
          directions, so their scores stay low.
        </InfoBox>
      </Panel>

      <Callout
        type="good"
        message='<strong>Structure emerged entirely from data.</strong> Nobody wrote a rule that said "adjectives should attend to the nouns they modify." The training process discovered that pattern because it reduced prediction errors — over and over, across billions of examples.'
      />
    </div>
  );
}

function TrainingLoopPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The training loop</PanelHeader>
        <InfoBox>
          Training turns random matrices into useful ones. The idea behind it is
          surprisingly simple, and has a beautiful history. In the 1840s,
          mathematician Augustin-Louis Cauchy asked: "If I am standing on a hilly
          surface in the dark and want to reach the lowest point, which direction
          should I step?" His answer: feel the slope at your feet and step
          downhill. This is <strong>gradient descent</strong> — and it is still
          the core algorithm behind training every modern AI model.
        </InfoBox>
        <InfoBox>
          The "hilly surface" is the <strong>loss landscape</strong> — a terrain
          where every point represents a particular set of weight values, and the
          height is the <strong>loss</strong> (how wrong the model's predictions
          are). Training is the process of walking downhill to find low points —
          weight values that produce good predictions.
        </InfoBox>
      </Panel>

      <Panel className="my-4">
        <PanelHeader>One step of the walk</PanelHeader>
        <InfoBox>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                1
              </span>
              <div>
                <strong>Forward pass:</strong> Feed a sentence through the model.
                With its current weight matrices, the model processes every token
                through all layers and predicts what word comes next at each
                position. Early in training, these predictions are random guesses.
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                2
              </span>
              <div>
                <strong>Measure the loss:</strong> Compare each prediction against
                the actual next word. The <strong>loss</strong> is a single number
                capturing how wrong the model was overall. High loss means very
                wrong.
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                3
              </span>
              <div>
                <strong>Compute gradients (backpropagation):</strong> For each of
                the billions of numbers in W<sub>Q</sub>, W<sub>K</sub>,{' '}
                W<sub>V</sub>, and all other matrices, compute: "If I nudge this
                number slightly, does the loss go up or down?" The answer for each
                weight is its <strong>gradient</strong> — the direction of
                downhill. Computing these gradients efficiently
                is <strong>backpropagation</strong>, popularized by Rumelhart,
                Hinton, and Williams in 1986. The insight: use the chain rule from
                calculus to flow the error signal backward through each layer,
                computing the gradient for every weight without having to test
                each one individually.
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                4
              </span>
              <div>
                <strong>Update weights:</strong> Nudge every weight slightly in
                its downhill direction. The <strong>learning rate</strong> controls
                the step size — too large and you overshoot the valley, too small
                and training takes forever.
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium flex items-center justify-center">
                5
              </span>
              <div>
                <strong>Repeat</strong> with a new batch of sentences. Billions of
                times.
              </div>
            </div>
          </div>
        </InfoBox>
      </Panel>

      <Panel className="my-4">
        <PanelHeader>Worked example: one training step on our sentence</PanelHeader>
        <InfoBox>
          Imagine the model encounters our sentence during training:{' '}
          <em>"The server crashed because the storage controller that the
          technician replaced last week was faulty."</em> At the position after
          "was," the model must predict the next word.
        </InfoBox>
        <InfoBox>
          With its current (partially trained) weights, the model predicts "the"
          — a common word, but wrong. The actual next word is "faulty." The loss
          is high.
        </InfoBox>
        <InfoBox>
          Backpropagation traces the error backward through the layers and
          identifies a key problem: Q<sub>was</sub> did not attend strongly
          enough to "controller." If it had, the model would have known the
          sentence was describing a faulty component, not introducing a new
          noun phrase. The gradient for W<sub>Q</sub> says: "Nudge the matrix so
          that next time, the Query for a word like 'was' — sitting at the end of
          a relative clause — attends more to the subject of that clause." So
          W<sub>Q</sub> is nudged in that direction. Not by much — one tiny step.
          But multiply that by billions of similar examples and the matrix
          converges on weights that reliably connect predicates to their subjects.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message='<strong>Not just Q, K, V.</strong> Each transformer layer also contains a <strong>feed-forward network (FFN)</strong> — two additional large weight matrices that process each token after the attention step. Think of attention as "gather information from other tokens" and the FFN as "digest what you gathered." All of these matrices are adjusted during training, all frozen during inference.'
      />
    </div>
  );
}

function HistoryPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Historical context</PanelHeader>
        <InfoBox>
          <strong>1840s — Cauchy and gradient descent.</strong> Augustin-Louis
          Cauchy developed the method of steepest descent as a general
          optimization technique: measure the slope, step downhill, repeat. This
          same algorithm — nearly two centuries later — is what adjusts every one
          of the 70 billion parameters in a model like Llama-3. The math has not
          changed. The scale has.
        </InfoBox>
        <InfoBox>
          <strong>1986 — Rumelhart, Hinton, and Williams popularize
          backpropagation.</strong> Their paper showed that multi-layer networks
          could learn internal representations, overturning a decade of skepticism
          that had followed Minsky and Papert's critique of simple perceptrons.
          The key insight: use the chain rule from calculus to flow error signals
          backward through layers, computing gradients for every weight
          efficiently. Without backpropagation, training a model with billions of
          weights would be computationally impossible — you would have to test
          each weight individually.
        </InfoBox>
        <InfoBox>
          <strong>2017 — Vaswani et al. introduce the transformer.</strong> The
          breakthrough was not gradient descent (1840s) or backpropagation (1986)
          — those were decades old. It was the <strong>self-attention
          mechanism</strong>. Previous architectures like the RNN (which we saw in
          Stop 1) processed words sequentially — each word had to wait for the
          previous word to finish. Self-attention processes every word in
          parallel: all Queries, all Keys, all Values can be computed at the same
          time. This made training massively parallelizable, which meant it could
          scale to the billions of parameters and trillions of tokens that produce
          today's models.
        </InfoBox>
      </Panel>

      <Callout
        type="good"
        message="<strong>From Cauchy to transformers: 170+ years of mathematical foundations, combined in just the right way.</strong> Gradient descent finds the direction to improve. Backpropagation makes it computationally feasible at scale. Self-attention makes it parallelizable. Together, they turn random numbers into the structured knowledge inside every modern language model."
      />
    </div>
  );
}

function ThreePhasesPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Three life phases of a model</PanelHeader>

        <InfoBox>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-primary-bg)] border border-[var(--color-primary)] text-[var(--color-primary-text)]">
                Phase 1
              </span>
              <strong>Pre-training</strong>
            </div>
            <p className="ml-[60px]">
              The model reads trillions of tokens — books, articles, code,
              conversations — and learns to predict the next word. This is where
              W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub>, and all other matrices
              go from random to useful. Pre-training a 70B model takes{' '}
              <strong>weeks to months on thousands of GPUs</strong> and costs
              millions of dollars. The result is a <strong>base model</strong> —
              it can complete text fluently, but it is not yet good at following
              instructions or being helpful. Ask it a question and it might
              generate ten more questions instead of answering, because
              "questions followed by more questions" is a common pattern in its
              training data.
            </p>
          </div>
        </InfoBox>

        <InfoBox>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-teal-bg)] border border-[var(--color-teal)] text-[var(--color-teal-text)]">
                Phase 2
              </span>
              <strong>Post-training</strong>
            </div>
            <p className="ml-[60px]">
              The base model is refined to become an assistant. Three key
              techniques: <strong>SFT (supervised fine-tuning)</strong> — train on
              curated examples of good instruction-following.{' '}
              <strong>DPO (direct preference optimization)</strong> — show the
              model two responses and teach it which one humans prefer.{' '}
              <strong>GRPO (group relative policy optimization)</strong> — let the
              model generate multiple answers, score them, and reinforce the best
              ones. These further adjust the weight matrices to make the model
              follow instructions, refuse harmful requests, and format answers
              clearly. The weights change, but far less dramatically than during
              pre-training — it is refinement, not learning from scratch.
            </p>
          </div>
        </InfoBox>

        <InfoBox>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)]">
                Phase 3
              </span>
              <strong>Inference</strong>
            </div>
            <p className="ml-[60px]">
              Now the weights are <strong>frozen</strong>. They never change
              again. The frozen matrices process every sentence, every
              conversation, every user's request. Every conversation you have with
              a language model — whether you ask about cooking or quantum
              physics, whether it is your first message or your thousandth —
              happens in this phase, with the exact same weight values.
            </p>
          </div>
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message='<strong>Why three phases?</strong> Pre-training alone produces a model that can predict language but is not helpful or safe. It has absorbed the patterns of the internet — including contradictions, harmful content, and unhelpful formats. Post-training steers the model toward being a useful assistant. Inference is where that finished model meets the world. For a deeper dive into post-training techniques, see the <a href="https://provandal.github.io/post-training-explorer/" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); text-decoration: underline;">Post-Training Explorer</a>.'
      />

      <Callout
        type="note"
        message={'<strong>"Does the model learn from my conversation?"</strong> This question has three layers, and honesty requires addressing all of them.<br/><br/><strong>1. Does the model update its weights in real time?</strong> No. During inference (Phase 3), every weight matrix is frozen. Your conversation cannot change W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub>, or any other parameter. The model that processes your first message is bit-for-bit identical to the one that processes your last.<br/><br/><strong>2. Could my conversation become training data for a future model?</strong> That depends entirely on the vendor\u2019s data retention policies. Some providers (particularly via API access) explicitly commit to not training on your data. Others may use conversation data for future training unless you opt out. These policies vary by provider and by product tier — read the terms of service.<br/><br/><strong>3. Are vendors extracting value from conversations?</strong> Even without training on them, conversation data may be used for safety monitoring, abuse detection, product evaluation, or research. The degree of human review varies by provider.<br/><br/>The technical answer (weights are frozen) is clear. The data-handling answer depends on who you\u2019re talking to and under what terms.'}
      />
    </div>
  );
}

function FrozenVsWorkingPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Frozen knowledge vs. working memory</PanelHeader>
        <InfoBox>
          This distinction is the foundation of everything that follows about
          inference costs. The model has two fundamentally different kinds of
          memory, and they behave in opposite ways.
        </InfoBox>
      </Panel>

      <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader>Model weights</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)] space-y-2">
            <p>
              <strong className="text-[var(--color-text)]">
                W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub>, W<sub>O</sub>{' '}
                (output projection), and FFN matrices (W<sub>1</sub>,{' '}
                W<sub>2</sub>)
              </strong>
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <strong>Fixed</strong> after training. Never change during
                inference.
              </li>
              <li>
                <strong>Same</strong> for every user, every conversation.
              </li>
              <li>
                For Llama-3 70B: ~<strong>140 GB</strong> at FP16 (2 bytes per
                parameter), ~<strong>35 GB</strong> at FP4 quantization (0.5
                bytes per parameter). <strong>Quantization</strong> trades a
                small amount of prediction accuracy for a large memory saving.
              </li>
              <li>
                <strong>Loaded once</strong> into GPU memory, shared across all
                requests.
              </li>
            </ul>
          </div>
        </Panel>

        <Panel>
          <PanelHeader>KV cache</PanelHeader>
          <div className="p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)] space-y-2">
            <p>
              <strong className="text-[var(--color-text)]">
                Stored K and V vectors for each token processed so far
              </strong>
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <strong>Dynamic.</strong> Created fresh for each conversation.
              </li>
              <li>
                <strong>Grows</strong> with every token generated — one new K and
                one new V per layer, per token.
              </li>
              <li>
                <strong>Per-user.</strong> Each conversation has its own cache.
              </li>
              <li>
                This is where the <strong>memory pressure</strong> comes from at
                serving time.
              </li>
            </ul>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader>The numbers that matter</PanelHeader>
        <InfoBox>
          Model weights are a one-time cost, shared by everyone. The KV cache
          is a per-conversation cost that scales with context length and
          concurrent users. Here is what that looks like in practice:
        </InfoBox>
        <InfoBox>
          For a single conversation at <strong>8,192 tokens</strong> on Llama-3
          70B (80 layers, 8 KV heads, 128-dimensional head), the KV cache is
          roughly <strong>2.5 GB</strong>. Ten concurrent users mean 25 GB of
          cache — half of an H100's 80 GB memory, consumed by cache alone.
          At full context length (128K tokens), a single conversation's cache can
          reach <strong>40+ GB</strong> — comparable to the quantized model
          weights themselves.
        </InfoBox>
        <InfoBox>
          This crossover point — where the KV cache rivals the model in memory
          consumption — is when infrastructure management becomes critical.
          Everything we explore in later stops about cache eviction, paging,
          and quantization exists to manage this pressure.
        </InfoBox>
      </Panel>

      <Callout
        type="good"
        message='<strong>The model weights are the frozen knowledge. The KV cache is the working memory.</strong> Understanding this split is essential for understanding why inference infrastructure looks the way it does — and why so much engineering effort goes into managing the cache rather than the weights.'
      />
    </div>
  );
}

function BridgePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>What comes next</PanelHeader>
        <InfoBox>
          We have traced the full arc of the weight matrices: random
          initialization, the training loop that shaped them, and the frozen
          state they live in during inference. We know that W<sub>Q</sub>,{' '}
          W<sub>K</sub>, and W<sub>V</sub> transform embeddings into Query, Key,
          and Value vectors — and that these transformations encode the patterns
          of language learned from trillions of tokens.
        </InfoBox>
        <InfoBox>
          But we have not yet looked inside the matching process itself. In Stop
          3, we said "the model compares Q against each K using a dot product."
          What does that actually look like?
        </InfoBox>
        <InfoBox>
          When "faulty" computes its Query and "controller" has its Key, the dot
          product multiplies them element by element and sums: Q[1]&times;K[1] +
          Q[2]&times;K[2] + Q[3]&times;K[3] + ... If the two vectors point in
          the same direction — as they do when training has aligned the "looking
          for my component" Query with the "I am a component" Key — the products
          are mostly positive and the sum is large. If the vectors are unrelated,
          positive and negative products cancel out and the sum is near zero.
        </InfoBox>
        <InfoBox>
          This simple operation — multiply and sum — is the core of attention
          matching. Stop 5 puts real numbers on the table and lets you see
          exactly how it works.
        </InfoBox>
      </Panel>
    </div>
  );
}

// --- Narration text for each page ---

function getNarration(pageId) {
  switch (pageId) {
    case 'intro':
      return '<strong>Stop 4: Learning to Pay Attention.</strong> In Stop 3, we saw that every word gets three vectors — Query, Key, and Value — each created by multiplying the word\'s embedding by a weight matrix. But where do those weight matrices come from? W<sub>Q</sub> alone has 67 million numbers in a single layer. Who chose them?';
    case 'random-start':
      return 'Before training, every weight matrix is filled with <strong>random numbers</strong>. The attention patterns they produce are pure noise — "faulty" attends to every word with roughly equal strength. Below, compare what random weights produce versus what trained weights produce, and then we will look at what changed inside the matrix to create that structure.';
    case 'training-loop':
      return 'How does training turn random noise into structured knowledge? Through a loop repeated billions of times: <strong>predict, measure error, adjust</strong>. Each cycle nudges the weights slightly toward better predictions. Below is the loop in detail, followed by a worked example showing one training step operating on our sentence.';
    case 'history':
      return 'None of the ideas behind training are new. <strong>Gradient descent</strong> dates to the 1840s. <strong>Backpropagation</strong> was popularized in 1986. What changed in 2017 was the <strong>architecture</strong> — the transformer\'s self-attention mechanism made it possible to parallelize training and scale to billions of parameters.';
    case 'three-phases':
      return 'A model passes through <strong>three life phases</strong>, each with a different relationship to the weight matrices. Understanding these phases is essential for understanding both how models are built and what happens to your data when you use one.';
    case 'frozen-vs-working':
      return 'Here is the key distinction for everything that follows about inference costs. The <strong>model weights</strong> are loaded once and shared across all users — a fixed cost. The <strong>KV cache</strong> is created fresh for every conversation and grows with every token — a variable cost that scales with usage. Below, we put concrete numbers on both.';
    case 'bridge':
      return 'We know the weight matrices exist, we know they were learned from data, and we know they produce Q, K, and V vectors. But how does the model actually decide that "faulty" and "controller" are <strong>relevant</strong> to each other? The answer is a mathematical operation called the <strong>dot product</strong> — and it is the subject of Stop 5.';
    default:
      return '';
  }
}

// --- Main Component ---

export default function LearningAttention() {
  const [pageIndex, setPageIndex] = useState(0);
  const isDark = useStore((s) => s.darkMode);

  const page = PAGES[pageIndex];
  const narration = getNarration(page.id);

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
        {page.id === 'random-start' && <RandomStartPage />}
        {page.id === 'training-loop' && <TrainingLoopPage />}
        {page.id === 'history' && <HistoryPage />}
        {page.id === 'three-phases' && <ThreePhasesPage />}
        {page.id === 'frozen-vs-working' && <FrozenVsWorkingPage />}
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
