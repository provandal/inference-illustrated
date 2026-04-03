# KV Cache & The Network Explorer
## Complete Curriculum Plan

**Project:** Interactive educational tool teaching KV cache concepts and their
networking implications, modeled on the Post-Training Explorer
(github.com/provandal/post-training-explorer).

**Audience:** Infrastructure engineers, storage networking professionals, and
data center architects who are technically strong but not ML specialists.

**Tech Stack:** React (Vite + Tailwind + D3), GitHub Pages deployment,
precomputed data, browser-only (no backend/GPU required).

**Development Workflow:** Claude (research, content, animation prototyping) +
Claude Code (GitHub repo, implementation, deployment).

---

## Pedagogical Principles

### 1. Terminology: Use correct terms, define on first use
Do NOT simplify by removing terms — that infantilizes the user. Instead,
introduce the term AND its meaning together so the user learns both the
concept and the vocabulary simultaneously.

- BAD: "a list of numbers" (avoids the term)
- BAD: "a vector" (uses term without definition)
- GOOD: "a **vector** — an ordered list of numbers, like [0.23, -0.71, 0.44, ...]"

### 2. Explanation quality bar (set by W/U explanation in Stop 1)
Every explanation must:
- State WHAT the thing is
- Explain WHY it's designed that way
- Ground it in consequence (what breaks if you don't have it)
- Answer the natural follow-up questions (where does it come from? when does it change?)

### 3. Show the process, not just the result
Animations must show mechanisms operating step by step, not just before/after
states. The user should watch the system work and see where it breaks down.

### 4. Honest about abstractions
When using simplified representations (like the hidden state bar chart),
disclose once that it's an interpretive approximation, then proceed.

### 5. The "WHY" before the "HOW"
Each stop motivates the problem before showing the solution. The user should
feel the pain of the limitation before seeing the mechanism that addresses it.

---

## Course Structure: Two Acts

### Act 1: "Attention Is All You Need" — Illustrated & Animated (Stops 1–10)
Tells the story of the transformer, building from "why do we need attention?"
through the full mechanism, culminating in "and that's why we have a KV cache."

### Act 2: "KV Cache & The Network" (Stops 11–17, future phase)
Takes the KV cache understanding from Act 1 and explores its infrastructure
implications: memory hierarchy, disaggregated inference, network architectures,
and the 1/2/5 year projections.

This document covers Act 1 in detail. Act 2 will be planned after Act 1 is built.

---

## Act 1: Attention Is All You Need — Illustrated & Animated

### Narrative Arc
Each stop answers a "WHY" question, and each answer creates the next question:

```
Stop 1:  Why do we need attention? → Sequential models lose information
Stop 2:  How does attention work?  → Every token looks at every token
Stop 3:  How does it decide what to look at? → Q, K, V mechanism
Stop 4:  Where do Q, K, V come from? → Weight matrices, learned in training
Stop 5:  What is the dot product doing? → Measuring similarity
Stop 6:  How do scores become weights? → Scaling and softmax
Stop 7:  What happens with the weights? → Weighted sum of Values → output
Stop 8:  Why multiple heads? → Different heads learn different patterns
Stop 9:  Why stack layers? → Progressive refinement of representations
Stop 10: Why cache K and V? → THE BRIDGE to the KV Cache deep-dive
```

---

### STOP 1: The Telephone Problem
**Question answered:** Why do we need attention at all?
**Core concept:** Sequential models (RNNs) lose information over distance.
**Animation type:** Interactive stepper — process sentence word by word.

#### Flow (19 steps)
```
Step 0:    Setup — transformer framing + sentence + dependency identification
Step 1:    Mechanics — what is the hidden state? (introduce RNN, vector, hidden state)
Step 2:    Mechanics — the update rule (W, U, embedding, training, inference, backprop)
Steps 3–17: RNN processing words 1–15, watching decay
Step 18:   Done — punchline (100% → 6%)
Step 19:   Attention reveal + bridge to Stop 2
```

#### Step 0 — Setup
Framing text (before sentence):
> Modern large language models — GPT, Claude, Llama, and others — are all built
> on an architecture called the **transformer**. To understand why transformers
> were such a breakthrough, we need to see what came before them and why it broke down.

Sentence: "The server crashed because the storage controller that the technician
replaced last week was faulty."

Identify dependency: "storage controller" (words 6–7) ↔ "faulty" (word 15).
User parses instantly. Machine must process one word at a time.
No words highlighted. Clean slate.

#### Step 1 — Mechanics: What is the hidden state?
"The" highlights as current word. Before processing, explain:

> We're going to process this sentence using an **RNN (Recurrent Neural Network)** —
> the dominant architecture before transformers. An RNN reads text one word at a time,
> left to right, and carries its understanding forward through a **hidden state**.
>
> The hidden state is a **vector** — an ordered list of numbers (typically 512 to 1024
> of them). This vector is the model's **entire working memory**. There's no separate
> memory bank, no way to look things up, no way to re-read an earlier word. Just this
> one vector, completely rewritten at every step.
>
> Before the first word, the hidden state is all zeros — a blank whiteboard.

Key terms introduced: **transformer**, **RNN**, **hidden state**, **vector**

#### Step 2 — Mechanics: The update rule
Formula: h_new = f( W × h_old + U × word )
Visual diagram: h_old + "The" → [W, U] → h₁

> At each step, the RNN takes two inputs and combines them:
>
> **h_old** — the previous hidden state (what the model remembers so far)
> **word** — the current word, represented as an **embedding** (a vector that captures
> the word's meaning — each word in the vocabulary has its own unique embedding,
> learned during training)
>
> These two inputs are transformed by two separate **weight matrices** — grids of
> numbers that control how information is mixed:
> - **W** controls how the old hidden state is carried forward — what to remember
> - **U** controls how the new word is incorporated — what to absorb
>
> They're separate because these are fundamentally different jobs. W decides how much
> of the old context survives; U decides how the new word gets mixed in. If you used
> one matrix for both, the model couldn't independently balance remembering vs. reading.
>
> **Where do W and U come from?** They start as random numbers before training begins.
> During **training**, the model reads billions of sentences, tries to predict the next
> word, and every time it's wrong, the error signal flows backward through the network —
> a process called **backpropagation** — nudging W and U slightly to make better
> predictions. After billions of these adjustments, W and U encode the model's
> learned knowledge of language.
>
> **Do W and U change when we use the model?** No. After training, we switch to
> **inference** — using the model to process new text. During inference, W and U are
> frozen forever. The same W and U process every sentence. Only the hidden state
> changes as words flow through.

Key terms introduced: **embedding**, **weight matrix**, **training**, **inference**,
**backpropagation**

#### Steps 3–17 — Word-by-word RNN processing
Counter shows: "RNN processing: word N of 15"

Each step shows:
1. Compact update pill: h_old + "word" → W, U → h_new
2. Growing hidden state chain (processed nodes + "???" for future)
3. Hidden state bar chart (what the model holds)
4. Warning callouts at key decay moments
5. Narration referencing RNN mechanics + decay story

**Hidden state bar chart honesty disclosure** (appears once, at Step 3):
> **A note about what you're seeing:** The real hidden state is just numbers —
> no labels, no compartments. What we're showing is an interpretive approximation:
> our best translation of what those numbers collectively encode. Think of it like
> an fMRI scan — useful for intuition, but the actual encoding is distributed.
> The decay pattern, however, is real and well-documented.

**Hidden state evolution (honest, step-accurate):**

| Word | Key concepts entering/in state | "storage controller" strength |
|------|------|------|
| The | expecting a noun: 95% | n/a |
| server | the server: 100% | n/a |
| crashed | server crash event: 95%, the server: 80% | n/a |
| because | causal explanation: 90%, the server: 60% | n/a |
| the | new noun phrase: 85%, the server: 40% | n/a |
| storage | storage (hardware): 95%, the server: 28% | forming |
| controller | **storage controller: 100%**, the server: 20% | **100% — PEAK** |
| that | relative clause: 90% | 78% |
| the | another noun phrase: 80% | 58% |
| technician | the technician: 95% | **40% — WARNING** |
| replaced | replacement action: 90% | 28% |
| last | temporal modifier: 85% | 20% |
| week | last week: 90% | **14% — WARNING** |
| was | linking verb: 85% | 9% |
| faulty | faulty (property): 95% | **6% — PUNCHLINE** |

**Narration quality rule:** Each step must reference:
- What the RNN is doing (combining h_old + new word via W, U)
- What changed in the hidden state (new concepts, decayed concepts)
- Why it matters for the story

#### Step 18 — All words processed
Show full chain. Final hidden state. Punchline:
> "storage controller" went from 100% → 6% in 8 steps. The correct referent for
> "faulty" is the weakest signal in the hidden state.

Button: "See how attention solves this →"

#### Step 19 — Attention reveal + bridge to Stop 2
Attention weights from "faulty": storage controller 48%, crashed 14%, was 12%...

Bridge text:
> The model computes a **Query** vector for "faulty" (what am I looking for?),
> and compares it against a **Key** vector stored for every previous word
> (what do I contain?). High-similarity pairs get high attention. The information
> retrieved uses each word's **Value** vector (what do I carry?).
>
> Those Key and Value vectors must be **stored** for every word so future words
> can look them up. That stored data is the **KV cache**.
>
> How Q, K, V work is our next stop.

---

### STOP 2: Every Token Looks at Every Token
**Question answered:** What does attention actually do, conceptually?
**Core concept:** Self-attention as a direct lookup — every token can read every other.
**Animation type:** Interactive grid/matrix — click any token to see its attention pattern.

#### Key concepts to introduce
- **Self-attention** — the mechanism where every position in a sequence computes
  relevance scores against every other position simultaneously
- **Attention matrix** — the complete grid of attention scores between every pair
  of tokens in the sequence
- **Context window** — the maximum number of tokens the model can attend to in a
  single pass; determined by architecture and available memory for the KV cache
- **Context (in practice)** — system prompt + full conversation history + current
  message; grows with every turn of conversation
- **Quadratic scaling** — when computational cost grows as the square of input size (n²);
  doubling sequence length quadruples computation

#### Flow (7 steps)

##### Step 0 — "You already saw the answer"
Callback to Stop 1. Restate: attention let "faulty" look directly at every word.
But that was one word looking backward. What does the full picture look like?

Narration:
> In Stop 1, we watched an RNN struggle to connect "faulty" back to "storage
> controller" through a chain of hidden states. Then we saw the solution: attention
> let "faulty" look directly at every word and find its referent at full strength.
>
> But that was just one word looking backward. What does the full picture look like
> when *every* word can look at *every* other word — all at the same time?

##### Step 1 — "Self-attention: the core idea"
Animation: Lines fan out from "faulty" (callback), then from "crashed", then from
"replaced" — then ALL words light up simultaneously with lines to all others.

Narration:
> In a transformer, every word simultaneously computes how relevant every other
> word is to it. This mechanism is called **self-attention** — the sequence attends
> to *itself*. Every word computes relevance scores against every other word in the
> same sentence, all simultaneously.
>
> Think of it as a room full of people, each one scanning the room and deciding
> who is most relevant to them, all at the same time. No chain. No telephone game.
> Everyone sees everyone directly.

Term defined: **self-attention**

##### Step 2 — "Click any word to explore its attention"
Interactive fan-of-lines. Click a word, lines fan out to all other words.
Line thickness = attention weight. Narration updates per click explaining WHY
that word attends to those particular words (the linguistic relationship).

Attention data (per word — simplified but linguistically honest):
| Source word | Top attended words |
|---|---|
| The | server (62%), crashed (15%), was (8%) |
| server | The (30%), crashed (35%), controller (12%) |
| crashed | server (40%), because (18%), faulty (15%) |
| because | crashed (35%), controller (20%), was (12%) |
| the (5th) | storage (45%), controller (30%), because (10%) |
| storage | controller (55%), the-5th (20%), server (8%) |
| controller | storage (45%), that (15%), replaced (12%), crashed (10%) |
| that | controller (40%), technician (20%), replaced (18%) |
| the (9th) | technician (50%), replaced (18%), that (10%) |
| technician | replaced (35%), the-9th (25%), controller (15%) |
| replaced | technician (28%), controller (25%), last (15%) |
| last | week (55%), replaced (18%), technician (8%) |
| week | last (50%), replaced (20%), was (10%) |
| was | controller (30%), faulty (25%), crashed (15%) |
| faulty | controller (42%), storage (10%), was (18%), crashed (12%) |

##### Step 3 — "The attention matrix: the complete picture"
Single linked widget: fan-of-lines at top, 15×15 heatmap grid below.
Clicking a word in either view highlights in both. Synchronized interaction.

Narration:
> You've been exploring one word at a time. Now let's see everything at once.
> The **attention matrix** is a grid where each row is a word doing the looking,
> each column is a word being looked at. Brighter cells mean stronger attention.
> Click any word in either view — they're linked.
>
> Notice the patterns: the bright diagonal (words attend to neighbors), the
> bright off-diagonal spots (long-range connections like "faulty" → "controller"),
> and the overall structure that reflects the grammar and meaning of the sentence.
>
> These patterns are **learned** during training — the same type of training process
> we saw with W and U in Stop 1. The model adjusted its weight matrices by reading
> billions of sentences until the attention patterns capture the structure of language.
> In Stop 3, we'll see the specific mechanism (Query, Key, Value vectors) that
> computes these scores. For now, the key insight: these patterns are discovered
> through training, not hardcoded by a programmer.

Term defined: **attention matrix**

##### Step 4 — "The cost of looking everywhere"
Interactive slider + dot grid + numbers table showing n² scaling.

Narration:
> Self-attention's power comes from every token seeing every other token. But that
> power has a cost. For n tokens, you need n × n attention scores. Watch what
> happens as the sequence gets longer.

Numbers table (updates with slider):
| Sequence length | Attention scores | Scale |
|---|---|---|
| 15 (our sentence) | 225 | trivial |
| 100 (a paragraph) | 10,000 | easy |
| 1,000 (short document) | 1,000,000 | manageable |
| 4,096 (GPT-3 context) | 16.8 million | significant |
| 32,768 (Llama-3) | 1.07 billion | massive |
| 128,000 (Claude, GPT-4) | 16.4 billion | enormous |
| 1,000,000 (Gemini 1.5) | 1 trillion | staggering |

Continue:
> 16.4 billion attention scores for a single pass through one layer — and that's
> assuming the full 128K context window is used. A model like Llama-3 70B has
> **80 layers**, each computing its own attention matrix. At full context, that's
> 80 × 16.4 billion = **1.3 trillion** attention computations per forward pass.
>
> In practice, the computation scales with the *actual* sequence length, not the
> maximum. If your prompt and conversation are only 2,000 tokens, you compute
> 2,000 × 2,000 = 4 million scores per layer — much more manageable. But context
> grows over time, which brings us to an important question: what exactly IS the
> context?

Terms defined: **quadratic scaling**

##### Step 5 — "What is context, exactly?"
Narration:
> When you interact with a model like Claude or GPT-4, the **context** isn't just
> your latest message. It's everything the model needs to see to generate a response:
>
> - The **system prompt** — instructions defining the model's behavior, set by the
>   application developer (often hundreds or thousands of tokens)
> - The **full conversation history** — every message you've sent and every response
>   the model has generated, from the very first exchange in this session
> - Your **current message**
>
> This means the context *grows with every turn*. Your first message might need
> 1,500 tokens. By your 20th exchange, the context could exceed 30,000 tokens.
> At every turn, the model must attend across the *entire* accumulated context.
>
> Without caching, the model would recompute Key and Value vectors for all 30,000
> tokens on every turn — even though 29,900 of them haven't changed since the
> last turn. The **KV cache** stores those vectors so only the new tokens need
> fresh computation. That's why it exists, and why it grows throughout a
> conversation.
>
> This is also why long conversations eventually hit a limit — the context window
> is finite, and when it fills up, the oldest messages must be dropped. The model
> literally can't see them anymore.

Visual: Animated conversation timeline showing context growing turn by turn.
System prompt as a fixed block at the top, conversation turns stacking below,
KV cache bar growing alongside. When it hits the context window limit, oldest
turns start fading/dropping.

Term defined: **context** (in practice), reinforced: **KV cache**, **context window**

##### Step 6 — Bridge to Stop 3
Narration:
> We've seen what self-attention does: every token looks at every other token,
> computing relevance scores that capture linguistic structure. We've seen the
> patterns it produces, the quadratic cost, and why caching matters.
>
> But we haven't answered the most important question: **how does the model
> decide that "faulty" should attend to "storage controller" and not to "last
> week"?** It doesn't compare the raw words — it transforms each word into
> specialized vectors designed for matching.
>
> Those vectors are called **Query**, **Key**, and **Value** — and understanding
> them is essential because the Key and Value vectors are exactly what gets
> stored in the KV cache. Let's see how they work.

#### Bridge to Stop 3
"How does the model decide which words to attend to? Through Query, Key, and
Value vectors — the mechanism at the heart of every transformer, and the reason
the KV cache exists."

---

### STOP 3: One Identity Isn't Enough — Q, K, V
**Question answered:** Why does each token need three different representations?
**Core concept:** Q (what am I looking for?), K (what do I contain?), V (what info do I carry?)
**Metaphor:** Conference attendee with a question (Q), a badge (K), and a briefcase (V).

#### Key concepts to introduce
- **Query (Q)** — "what am I looking for?" — computed for the current token
- **Key (K)** — "what do I offer as a match?" — computed for every token, stored in cache
- **Value (V)** — "what information do I carry?" — computed for every token, stored in cache
- **W_Q, W_K, W_V** — the three weight matrices that produce Q, K, V from embeddings
  (same explanation pattern as W/U in Stop 1: what, why, where from, when change)

#### Animation spec
- Conference metaphor: animate a "match" between one attendee's question and
  another's badge, then briefcase contents being shared
- Then show the actual mechanism: token → embedding × W_Q → Q vector,
  embedding × W_K → K vector, embedding × W_V → V vector
- Interactive: modify a Q vector, watch which K vectors it matches with
- Explicitly show: Q is used once and discarded. K and V are stored because
  EVERY future token will need to compare against them. This is why we cache K and V.

#### Bridge to Stop 4
"The weight matrices W_Q, W_K, W_V determine what Q, K, V contain. Where do
they come from, and what do they actually learn?"

---

### STOP 4: Learning to Pay Attention
**Question answered:** Where do the weight matrices come from, and what do they learn?
**Core concept:** Training adjusts W_Q, W_K, W_V from random → meaningful.
**Animation type:** Before/after — random attention patterns vs. trained patterns.

#### Key concepts to introduce
- **Random initialization** — all weight matrices start as random numbers
- **Training loop** — forward pass → loss → backward pass → weight update
- **Loss function** — measures how wrong the model's predictions are
- **Learned representations** — after training, the matrices encode useful patterns

#### Animation spec
- Show randomly initialized W matrices producing garbage attention patterns
  (every token attends roughly equally to every other — no structure)
- Animate training: matrices slowly shift, attention patterns become structured
- Show specific learned patterns: "adjective attends to noun it modifies,"
  "verb attends to its subject"
- Key insight: during inference, these matrices are FROZEN. They're the model's
  permanent knowledge. The KV cache is the per-sentence state they produce.

#### Bridge to Stop 5
"Now that we know Q and K are learned projections, what does the comparison
between them actually compute? It's a dot product — and understanding dot
products is key to understanding why attention works."

---

### STOP 5: The Dot Product as Similarity
**Question answered:** Why does Q·K work as a relevance score?
**Core concept:** Dot product measures alignment between two vectors.
**Animation type:** Interactive — drag vectors, watch dot product change.

#### Key concepts to introduce
- **Dot product** — multiply corresponding elements, sum the results
- **Vector similarity** — same direction = high dot product, perpendicular = zero,
  opposite = negative
- **Geometric interpretation** — the dot product is related to the angle between vectors

#### Animation spec
- Two arrows in 2D space. User drags one. Dot product updates in real-time.
- Parallel arrows → high positive score
- Perpendicular → zero
- Opposite → negative
- Then connect to Q and K: "When Q for 'faulty' and K for 'storage controller'
  point in similar directions, their dot product is high → high attention"
- Show actual numbers: Q = [0.8, -0.3, 0.5] dot K = [0.7, -0.2, 0.6] = step by step

#### Bridge to Stop 6
"The raw dot products can be very large or very small depending on the vector
dimension. We need to tame them before we can use them as weights."

---

### STOP 6: Taming the Numbers — Scaling and Softmax
**Question answered:** How do raw scores become proper attention weights?
**Core concept:** Scale by √d to prevent saturation, then softmax to get probabilities.

#### Key concepts to introduce
- **Scaling factor (√d)** — divide by square root of dimension to keep variance stable
- **Softmax** — converts arbitrary numbers into positive values that sum to 1
  (proper probability distribution)
- **Temperature** — how "peaked" vs. "spread" the distribution is
- **Saturation** — what happens when softmax inputs are too large (gradients vanish)

#### Animation spec
- Show raw dot products: [3.2, 1.1, 0.4, -0.8]
- Show what happens WITHOUT scaling: values get huge as dimension increases,
  softmax becomes nearly one-hot (all weight on one token)
- Show scaling: divide by √d, values become reasonable
- Show softmax step by step: exp each value, sum, divide → probabilities
- Interactive slider for dimension count: watch scores and softmax respond
- Interactive: "temperature" slider showing peaked vs. uniform distributions

#### Bridge to Stop 7
"Now we have proper attention weights — probabilities that sum to 1.
What do we DO with them?"

---

### STOP 7: Blending the Values — The Output
**Question answered:** How do attention weights produce the final output?
**Core concept:** Weighted sum of Value vectors = context-enriched representation.

#### Key concepts to introduce
- **Weighted sum** — each Value vector is multiplied by its attention weight, then
  all are added together
- **Context-enriched representation** — the output vector blends information from
  all attended tokens
- **Residual connection** — the output is ADDED to the original, not replacing it
  (skip connection)

#### Animation spec
- Show Value vectors for each token (columns of numbers)
- Attention weights scale each column (visual: columns growing/shrinking)
- All scaled columns sum into one output vector
- Animate: the output for "faulty" is dominated by V_storage_controller (48% weight)
  but also contains traces of V_crashed (14%), V_was (12%), etc.
- Show: this blended output is now a representation of "faulty" that KNOWS it
  refers to the storage controller — because it contains that information directly

#### Bridge to Stop 8
"One set of Q, K, V matrices learns one 'type' of attention pattern. But language
has many simultaneous relationships — syntax, semantics, coreference. What if we
ran multiple attention computations in parallel?"

---

### STOP 8: Why Multiple Heads?
**Question answered:** Why not just one attention mechanism per layer?
**Core concept:** Different heads learn to attend to different linguistic patterns.
**Animation type:** Side-by-side — 4 heads showing different patterns for same input.

#### Key concepts to introduce
- **Multi-head attention (MHA)** — running multiple attention computations in parallel,
  each with its own W_Q, W_K, W_V
- **Head** — one independent attention computation
- **Concatenation + projection** — outputs from all heads are combined into one vector
- **Specialization** — different heads learn different roles (some syntactic, some
  semantic, some positional)

#### Animation spec
- Same sentence, 4 attention heads shown side by side
- Head 1: syntactic (verb attends to subject)
- Head 2: coreference ("faulty" attends to "storage controller")
- Head 3: positional (nearby words attend to each other)
- Head 4: semantic (hardware-domain words cluster)
- Show: model gets richer understanding by combining all four perspectives
- Critical for KV cache: each head has its OWN K and V → cache size multiplied
  by number of heads. Introduce MQA/GQA preview: "What if heads SHARED K,V?"

#### Key terms for KV cache bridge
- **MHA (Multi-Head Attention)** — every head has its own K, V → largest cache
- **MQA (Multi-Query Attention)** — all heads share one K, V → smallest cache
- **GQA (Grouped-Query Attention)** — groups of heads share K, V → middle ground
- **MLA (Multi-Head Latent Attention)** — compress K, V into a latent vector,
  reconstruct on demand (DeepSeek's approach)

---

### STOP 9: The Stack — Layers on Layers
**Question answered:** Why stack multiple transformer layers?
**Core concept:** Each layer refines the representation further.

#### Key concepts to introduce
- **Layer** — one complete attention + feed-forward block
- **Progressive refinement** — early layers capture local/syntactic patterns,
  deeper layers capture global/semantic patterns
- **Feed-forward network (FFN)** — the other half of each transformer layer,
  processing each position independently
- **Layer norm** — normalization that stabilizes training

#### Animation spec
- Show a token's representation evolving through 4-6 layers
- Layer 1: "The" is just a word
- Layer 3: "The" is "the subject of this sentence, a server"
- Layer 6: "The" is "the server that crashed due to a faulty storage controller
  replaced last week"
- Each layer adds more context, more nuance
- Critical for KV cache: EVERY layer has its own K and V caches.
  For a 70B model with 80 layers and 64 heads per layer, the total KV cache
  is 80 × 64 × 2 (K and V) sets of vectors per token.

---

### STOP 10: And Now, The Cache — The Bridge
**Question answered:** Why do we cache K and V? What does it cost?
**Core concept:** During generation, K and V from all previous tokens are needed at
every step. Caching them avoids recomputation but creates a massive memory footprint.

This stop is the PIVOT from Act 1 to Act 2. It synthesizes everything from the
previous 9 stops into the central problem statement for the rest of the course.

#### Key concepts to introduce
- **Autoregressive generation** — generating one token at a time, each attending to
  all previous tokens
- **KV cache** — the stored Key and Value vectors for all previous tokens across all
  layers and heads
- **Cache size calculation** — 2 (K+V) × layers × heads × head_dim × seq_len × precision
- **Prefill vs. Decode** — the two phases of inference (compute-bound vs. memory-bound)
- **The memory wall** — when KV cache exceeds available GPU HBM

#### Animation spec
- Show autoregressive generation: token 1 → needs 0 cached KV pairs.
  Token 2 → needs 1. Token 100 → needs 99. Token 128,000 → needs 127,999.
- Interactive calculator: plug in model size (7B, 70B, 405B), context length
  (4K, 32K, 128K), number of concurrent users → see KV cache size vs.
  available GPU memory (H100 80GB, B200 192GB)
- Show the O(n) vs O(n²) comparison from Stop 1, but now with real numbers:
  "Without cache: recompute all KV at every step → O(n²) compute.
  With cache: store and reuse → O(n) compute but O(n) memory."
- Concrete example: Llama-70B at 128K context → ~40GB KV cache per request.
  H100 has 80GB HBM. Model weights take ~35GB. That leaves ~45GB for KV cache.
  ONE concurrent user nearly fills the GPU.

#### Bridge to Act 2
> The KV cache is what makes modern LLMs possible — without it, inference would
> be impossibly slow. But it's also what makes inference impossibly expensive
> at scale. The rest of this course explores how the industry is solving this:
> compressing the cache, tiering it across memory hierarchies, moving it across
> networks, and building entirely new infrastructure to manage it.
>
> Welcome to the world of KV cache infrastructure.

---

## Act 2: KV Cache & The Network (Future — to be detailed after Act 1 is built)

### Planned Stops (high-level)

**Stop 11: The Memory Wall** — Interactive calculator. Model size × context length ×
batch size → cache size vs. GPU memory. Show why this breaks at scale.

**Stop 12: Disaggregated Inference** — Separating prefill and decode. The KV cache
must transfer between GPU pools. NVIDIA Dynamo, NIXL. Network bandwidth/latency
tradeoffs.

**Stop 13: The Memory Hierarchy** — G1 (HBM) → G2 (DRAM) → G3 (NVMe) →
G3.5 (ICMS/BlueField-4) → G4 (persistent storage). Latency/capacity at each tier.
NVIDIA ICMS, Pure KVA, VAST, WEKA.

**Stop 14: Compressing the Cache** — MQA, GQA, MLA. Quantization (FP16→FP8→INT4).
Token eviction (H2O, SnapKV). The accuracy/compression tradeoff.

**Stop 15: The Fabric** — RDMA/RoCE (Spectrum-X), CXL memory pooling, NVMe-oF.
Side-by-side comparison of data paths and latency. Penguin Solutions CXL KV cache
server (11TB, production-ready). Beluga CXL system (89.6% TTFT reduction).

**Stop 16: Intelligent Routing** — KV-cache-aware load balancing (llm-d, Red Hat).
Prefix-aware scheduling. Context memory networks. How the network participates
in KV cache placement decisions.

**Stop 17: The Crystal Ball** — 1/2/5 year projections.
- 1 year (2027): BlueField-4 ships, ICMS production, CXL 2.0 expanders, disaggregated
  inference as default
- 2 years (2028): CXL 3.0 multi-rack pooling, standardized KV APIs, MoE/Engram patterns
- 5 years (2031): CXL 4.0 at 128 GT/s, composable memory fabrics, KV cache as
  first-class network service

---

## Master Terminology Bank

Terms are listed in order of first introduction. Each must be defined when first used.

| # | Term | Definition | First appears |
|---|------|-----------|---------------|
| 1 | Transformer | The architecture underlying all modern LLMs (GPT, Claude, Llama) | Stop 1, Step 0 |
| 2 | RNN (Recurrent Neural Network) | Pre-transformer architecture that processes sequences one element at a time | Stop 1, Step 1 |
| 3 | Hidden state | A vector that serves as the RNN's entire working memory, rewritten each step | Stop 1, Step 1 |
| 4 | Vector | An ordered list of numbers, e.g. [0.23, -0.71, 0.44] | Stop 1, Step 1 |
| 5 | Weight matrix | A grid of numbers controlling how inputs are transformed; learned in training, frozen in inference | Stop 1, Step 2 |
| 6 | Embedding | A vector representing a word as numbers; each word has a unique embedding learned in training | Stop 1, Step 2 |
| 7 | Training | The phase where the model learns by adjusting weight matrices on billions of examples | Stop 1, Step 2 |
| 8 | Inference | Using the trained model to process new text; weights are frozen | Stop 1, Step 2 |
| 9 | Backpropagation | Flowing error signals backward to adjust weights, making predictions more accurate | Stop 1, Step 2 |
| 10 | Self-attention | Mechanism where every token computes relevance scores against every other token simultaneously | Stop 2 |
| 11 | Attention matrix | Complete grid of attention scores between every pair of tokens in the sequence | Stop 2 |
| 12 | Context window | Maximum number of tokens the model can attend to; determined by architecture and KV cache memory | Stop 2 |
| 12b | Context (in practice) | System prompt + full conversation history + current message; grows with every turn | Stop 2 |
| 12c | Quadratic scaling | When cost grows as the square of input size (n²); doubling sequence length quadruples computation | Stop 2 |
| 13 | Query (Q) | "What am I looking for?" — vector for the current token | Stop 3 |
| 14 | Key (K) | "What do I offer as a match?" — vector stored for every token | Stop 3 |
| 15 | Value (V) | "What information do I carry?" — vector stored for every token | Stop 3 |
| 16 | W_Q, W_K, W_V | Weight matrices producing Q, K, V from embeddings | Stop 3 |
| 17 | Dot product | Multiply corresponding elements and sum; measures vector alignment | Stop 5 |
| 18 | Scaling factor (√d) | Divides dot products by √dimension to prevent softmax saturation | Stop 6 |
| 19 | Softmax | Converts arbitrary numbers into probabilities summing to 1 | Stop 6 |
| 20 | Weighted sum | Multiplying each Value by its attention weight and summing | Stop 7 |
| 21 | Residual connection | Adding the output back to the input (skip connection) | Stop 7 |
| 22 | Multi-head attention (MHA) | Running multiple attention computations in parallel | Stop 8 |
| 23 | MQA / GQA / MLA | Techniques to reduce KV cache by sharing or compressing K, V across heads | Stop 8 |
| 24 | Layer | One complete attention + feed-forward block in the transformer | Stop 9 |
| 25 | Feed-forward network (FFN) | Per-position processing after attention in each layer | Stop 9 |
| 26 | KV cache | Stored Key and Value vectors for all tokens, across all layers and heads | Stop 10 |
| 27 | Autoregressive generation | Generating tokens one at a time, each attending to all previous | Stop 10 |
| 28 | Prefill / Decode | Two phases of inference: processing the prompt vs. generating tokens | Stop 10 |
| 29 | HBM (High Bandwidth Memory) | GPU memory where KV cache and model weights reside | Stop 10 |
| 30 | Memory wall | When KV cache exceeds available GPU HBM | Stop 10 |

---

## Stop 1: Detailed Refinement Notes

(Incorporated from iterative prototyping sessions — see separate sections below)

### Visual/UX Fixes — Status

**Completed:**
- [x] Step 0 has no highlighted words (clean setup)
- [x] "Next word" correctly highlights word 1 = "The" (off-by-one fixed)
- [x] Trailing pipeline node shows "???" not the next word
- [x] Counter is accurate (word N of 15)

**Still needed for polish build:**
- [ ] Transformer framing in Step 0
- [ ] RNN explicitly named in Mechanics Step 1
- [ ] Two weight matrices explained with WHY (W for remembering, U for absorbing)
- [ ] Counter should say "RNN processing: word N of 15"
- [ ] Compact update pill at every word step
- [ ] Hidden state bar honesty disclosure (one-time, at Step 3)
- [ ] Narration quality: each step references RNN mechanics + decay + story significance
- [ ] Attention reveal bridges to Stop 2 with Q, K, V preview
- [ ] All terms defined on first use per terminology bank

### Sentence used throughout
"The server crashed because the storage controller that the technician
replaced last week was faulty."

Dependency: "faulty" (word 15) describes "storage controller" (words 6–7).
NOT "the server" — this is important and the animation must get it right.
The attention weights should show "storage controller" getting ~48%, not "The."
