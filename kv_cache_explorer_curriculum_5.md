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

### 6. "See the next ledge" — no blind cliffs
When previewing a concept that will be covered in a later stop, always include
a one-sentence description of WHAT it does, not just "we'll cover it later."
The user needs to see the landing pad before stepping off the current ledge.

- BAD: "We'll see how scores become weights in Stop 6."
- GOOD: "Scores are converted to weights using a function called **softmax** —
  which normalizes them into probabilities that sum to 1. We'll explore the
  mechanics in Stop 6."

This applies within steps too: before introducing any new concept, briefly
preview what we're about to see and why it matters.

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

### STOP 3: One Identity Isn't Enough — Query, Key, Value
**Question answered:** Why does each token need three different representations?
**Core concept:** Q (what am I looking for?), K (what do I offer as a match?),
V (what information do I carry?). Three is the minimum to separate the essential roles.
**Animation type:** Interactive — explore how Q matches against K, see V content flow.

#### Key concepts to introduce
- **Query (Q)** — "what am I looking for?" — computed for the current token, used once
- **Key (K)** — "what do I offer as a match?" — computed for every token, stored in cache
- **Value (V)** — "what information do I carry?" — computed for every token, stored in cache
- **W_Q, W_K, W_V** — three weight matrices producing Q, K, V from embeddings
- **Token vs. word** — brief clarification that LLMs operate on tokens (sub-word pieces),
  not whole words; we use "word" for readability throughout
- **KV cache (fully explained)** — why K and V are cached but Q is not

#### Flow (7 steps)

##### Step 0 — "One representation isn't enough"
Narration:
> In Stop 2, we saw that "faulty" attends strongly to "storage controller" and
> "replaced" also attends to "storage controller." But they attend for different
> reasons:
>
> - "faulty" needs to know: **what is being described as faulty?** → the controller
> - "replaced" needs to know: **what was acted upon?** → the controller
> - "that" needs to know: **what is the relative clause modifying?** → the controller
>
> Same word being looked at. Different questions being asked. If the model had
> one fixed representation for "controller," it couldn't distinguish these
> different types of relevance.
>
> The solution: give every word three separate representations, each designed
> for a different job.

Visual: "controller" in center, three words looking at it with different questions.

##### Step 1 — "The three roles every word plays"
Narration:
> Every word gets transformed into three separate vectors — three different lists
> of numbers, each serving a distinct purpose:
>
> **Query (Q)** — "What am I looking for?"
> The Query is the question a word asks when it's the one doing the looking.
> "Faulty's" Query encodes something like "I'm an adjective — which noun am I
> describing?" "Crashed's" Query encodes "I'm a verb — what is my subject?"
> The Query is computed purely from the word itself — it doesn't yet know
> which other words will match. That's determined by comparing Q against the Keys.
>
> **Key (K)** — "What do I offer as a match?"
> The Key is the label a word presents to be matched against Queries. The Key
> for "controller" encodes "I'm a noun, a hardware component, the object of
> this clause." When a Query and a Key are similar, the attention score between
> them is high.
>
> **Value (V)** — "What information do I carry?"
> The Value is the actual content a word shares when it's matched. If "controller"
> gets high attention from "faulty," the Value for "controller" is what gets
> blended into "faulty's" output — the semantic content: this is a storage
> controller, part of the server infrastructure, recently replaced.
>
> **Why exactly three — why not more?** Three is the minimum number that separates
> the essential roles. You need at least two for matching: Q (searching) and K
> (being found) — because searching for something and being findable require
> different representations. You need a third (V) because what you match on
> isn't the same as what you carry — "controller" is found via its syntactic role
> (K) but shares its semantic content (V). Could you add more? In principle yes,
> but the model gets additional richness through a different mechanism: running
> multiple parallel sets of Q, K, V (called **attention heads** — Stop 8) and
> stacking layers (Stop 9). So instead of 5 or 7 vectors per word, you get
> dozens of three-vector systems each specializing differently.

Visual: Three columns showing "controller" with Q, K, V. Different colors per role.

Terms defined: **Query (Q)**, **Key (K)**, **Value (V)**

Brief note on tokens vs. words (appears once, collapsible):
> **A note on terminology:** We've been saying "words," but transformers actually
> operate on **tokens** — sub-word pieces. Common words like "the" and "server"
> are single tokens, but less common words get split: "technician" might become
> "tech" + "nician." The attention mechanism handles this naturally — sub-word
> tokens attend strongly to their siblings, reconstructing whole-word meaning
> through the same Q, K, V process. We'll continue using "words" for clarity,
> but the precise term is "token."

##### Step 2 — "How Q, K, V are created"
Narration:
> Each of the three vectors is produced by multiplying the word's **embedding**
> by a different **weight matrix**:
>
> - embedding × **W_Q** → Query vector
> - embedding × **W_K** → Key vector
> - embedding × **W_V** → Value vector
>
> **W_Q, W_K, and W_V** are three separate weight matrices, just like the W and U
> we saw in the RNN (Stop 1). Each one learns to extract a different aspect of
> the word during training.
>
> **Why three separate matrices?** Because each matrix learns a different
> transformation. W_Q learns to extract "what this word looks for." W_K learns
> to extract "what this word offers." W_V learns to extract "what information
> this word carries." Using one matrix for all three would force the model to
> use the same transformation for asking, answering, and carrying — three
> fundamentally different jobs.
>
> **Where do W_Q, W_K, W_V come from?** Same story as W and U in Stop 1: random
> initialization → training via backpropagation → frozen during inference. They're
> part of the model's permanent learned knowledge.

Visual: Animated flow — same embedding splits three ways through three matrices.
Show the shape: a vector of N numbers × a grid of N×M numbers = a vector of M numbers.

Optional "see the math" expandable: small numerical example showing a 4-number
embedding multiplied by a 4×3 weight matrix producing a 3-number Q vector.
Not required to proceed, but available for users who want to see the actual
arithmetic (similar to the dot product math we prototyped earlier).

Terms defined: **W_Q, W_K, W_V**

##### Step 3 — "The matching process"
Narration:
> Now we can see how attention decisions are made. When "faulty" wants to know
> which words to attend to:
>
> 1. Compute the **Query** for "faulty": embedding("faulty") × W_Q → Q_faulty
> 2. Compare that Query against the **Key** for every other word using a
>    **dot product** — a mathematical operation that measures how similar two
>    vectors are (high dot product = similar direction = strong match).
>    We'll explore dot products in detail in Stop 5.
> 3. The comparisons produce **attention scores**: Q_faulty · K_controller = high,
>    Q_faulty · K_last = low
> 4. Convert scores to **attention weights** using a function called **softmax**
>    — which normalizes the scores into probabilities that sum to 1.
>    We'll explore softmax in detail in Stop 6.
> 5. Use the weights to blend the **Values**: high-weight words contribute more
>    of their V content to the output. This produces a context-enriched
>    representation of "faulty" that knows it refers to the storage controller.

Visual: Interactive. "Faulty" highlighted. Its Q vector shown. K vectors for
several words shown alongside. Similarity indicators (lines of varying thickness)
from Q to each K. User can click different source words to see how their Q
matches differently against the same K vectors.

Note: Steps 4, 5, and 6 in this list are previewed with enough detail that the
user can see the next ledge ("dot product measures similarity", "softmax converts
to probabilities") without needing to understand the full mechanics yet.

##### Step 4 — "Why K and V get cached (and Q doesn't)"
This is the pivotal step for the entire course.

Narration:
> Here's the critical asymmetry that creates the KV cache.
>
> During generation, the model produces tokens one at a time. When generating
> "faulty," it needs:
>
> - **Q for "faulty"** — computed fresh, used once, then discarded
> - **K for every previous word** — needed so "faulty's" Query can be compared
>   against them to find matches
> - **V for every previous word** — needed so the matched information can be
>   blended into "faulty's" output
>
> At the next step, generating whatever comes after "faulty," the model needs
> K and V for ALL words again — including "faulty" itself, which is now a
> previous word.
>
> **Q is ephemeral** — only needed for the current token, then discarded.
> Each new token computes its own fresh Q.
>
> **K and V are persistent** — needed by every future token. The K and V
> for "The" (word 1) are used when generating word 2, word 3, word 4...
> all the way to the end. They must be kept around.
>
> This is why we **cache** K and V but not Q. The **KV cache** stores the Key
> and Value vectors for every token that has been processed, so they don't
> need to be recomputed when the next token attends to them.
>
> Think of it this way: Q is a question asked once and forgotten. K is a name
> badge worn for the entire event. V is a briefcase kept at your side the
> whole time. Questions are momentary. Badges and briefcases need storage.

Visual: Token-by-token generation animation:
- Token 1 generated: compute Q₁, K₁, V₁. Q₁ used and discarded. K₁, V₁ → cache.
- Token 2: compute Q₂, K₂, V₂. Q₂ compares against cached K₁. Blends V₁.
  Q₂ discarded. K₂, V₂ → cache.
- Token 3: Q₃ compares against cached K₁, K₂. Cache grows: [K₁V₁, K₂V₂, K₃V₃].
- Show cache growing visually.

Contrast:
- Without cache at token 15: recompute K,V for all 14 previous tokens = 28
  matrix multiplications
- With cache at token 15: compute only K₁₅, V₁₅ = 2 matrix multiplications,
  look up 14 from cache
- At token 128,000: 2 vs. 255,998 matrix multiplications

##### Step 5 — "The size of the cache"
Brief preview connecting to Stop 10:

Narration:
> Each cached K and V vector is a list of numbers — typically 128 numbers per
> attention head, stored in 16-bit precision (2 bytes per number). For each
> token, the model stores K and V across every attention head in every layer.
>
> For a model like Llama-3 70B:
> - 80 layers × 64 heads × 128 numbers × 2 bytes = 1.3 MB per token (K only)
> - Double for K + V = 2.6 MB per token
> - At 128,000 tokens = **333 GB** of KV cache for one user's conversation
>
> A single GPU (H100) has 80 GB of memory. The model weights alone take ~35 GB.
> This is why KV cache management is the central challenge of modern LLM
> infrastructure — and the subject of the rest of this course.
>
> We'll explore this in much more depth in Stops 10-17, including how the
> industry compresses, tiers, and moves KV cache data across networks.

##### Step 6 — Bridge to Stop 4
Narration:
> We now understand the Q, K, V mechanism:
> - Three weight matrices transform each word into three specialized vectors
> - Q asks the question (ephemeral), K provides the label (persistent),
>   V carries the information (persistent)
> - K and V are cached for every token — this is the KV cache
> - The match between Q and K determines attention weights
> - The weights blend V vectors into a context-enriched output
>
> But we said W_Q, W_K, W_V are "learned during training." How does the model
> go from random matrices producing random attention patterns to trained matrices
> that capture language structure? What does the learning process actually look like?
>
> That's Stop 4.

#### Design notes
- **Metaphor:** Use "name badge and briefcase" for K and V consistently. Drop the
  librarian reference. The conference metaphor is concrete and maps cleanly.
- **"See the next ledge" rule:** Every time a future concept is mentioned (dot product,
  softmax), include a one-sentence preview of WHAT it does, not just "we'll cover it
  later." Users need to see the landing pad.
- **Matrix multiplication animation in Step 2:** Include as optional expandable.
  Main flow shows the shape (vector × matrix → vector). Expandable shows actual
  numbers multiplying. Similar to our earlier dot product math prototype.

---

### STOP 4: Learning to Pay Attention
**Question answered:** Where do the weight matrices come from, and what do they learn?
**Core concept:** Training adjusts W_Q, W_K, W_V from random → meaningful attention patterns.
**Animation type:** Slider showing attention heatmap evolving from noise to structure.

#### Key concepts to introduce
- **Random initialization** — all weight matrices start as random numbers
- **Forward pass** — feeding a sentence through the model to get a prediction
- **Loss** — a single number measuring how wrong the prediction was
- **Gradient** — the direction to nudge each weight to reduce the loss
- **Gradient descent** — the algorithm: measure slope, step downhill, repeat
- **Learning rate** — how big each adjustment step is
- **Backpropagation** — efficiently computing gradients for all weights by flowing
  the error signal backward through layers using the chain rule
- **Pre-training vs. post-training vs. inference** — the three phases of a model's life
- **Parameters** — the total count of numbers in all weight matrices (e.g., 70 billion)
- **Quantization** — reducing precision (FP16 → FP4) to save memory, at small accuracy cost

#### Flow (6 steps)

##### Step 0 — "What does random attention look like?"
Show our sentence with a random attention heatmap — flat, no structure.

Narration:
> Before training, W_Q, W_K, and W_V are filled with random numbers. Every
> word's Query, Key, and Value are meaningless random transformations.
> The result: "faulty" attends equally to "storage," "last," "the," and
> everything else. It has no idea that "controller" is relevant. The model
> might predict the next word is "banana" — it has no knowledge of language yet.

Visual: Side-by-side or toggle: "Random (untrained)" vs. "Trained (from Stop 2)."
Trained version has clear structure. Random version is a flat, meaningless wash.

##### Step 1 — "The training loop"
Narration:
> Training turns random matrices into useful ones. The idea behind it is
> surprisingly simple, and has a beautiful history.
>
> In the 1840s, mathematician Augustin-Louis Cauchy asked: "If I'm standing
> on a hilly surface in the dark and want to find the lowest point, which
> direction should I step?" His answer: feel the slope at your feet and step
> downhill. This is **gradient descent** — and it's still the core algorithm
> behind training every modern AI model.
>
> The "hilly surface" is the **loss landscape** — a terrain where every point
> represents a particular set of weight values, and the height is the
> **loss** (how wrong the model's predictions are). Training is the process
> of walking downhill to find the lowest point — the weight values that
> produce the best predictions.
>
> Here's how each step of the walk works:
>
> **Forward pass** — Feed a sentence into the model. With its current weight
> matrices, the model processes every token through all layers and predicts
> what word comes next at each position. Early in training, these predictions
> are random guesses.
>
> **Measure the loss** — Compare each prediction against the actual next word
> (which we know, because we're training on real text). The **loss** is a single
> number capturing how wrong the model was overall. High loss = very wrong.
>
> **Compute gradients (backpropagation)** — For each of the billions of numbers
> in W_Q, W_K, W_V, and all the other matrices, compute: "If I nudge this
> number slightly, does the loss go up or down?" The answer for each weight
> is its **gradient** — the direction of downhill.
>
> Computing these gradients efficiently is **backpropagation**, developed by
> Rumelhart, Hinton, and Williams in 1986. The insight: use the chain rule
> from calculus to flow the error signal backward through each layer,
> computing the gradient for every weight without having to test each one
> individually. Without backpropagation, training a model with billions of
> weights would be computationally impossible.
>
> **Update weights** — Nudge every weight slightly in its downhill direction.
> The **learning rate** controls the step size — too large and you overshoot
> the valley, too small and training takes forever.
>
> **Repeat** — Do it again with a new batch of sentences. Billions of times.
>
> **What other matrices get updated?** Not just W_Q, W_K, W_V. Each transformer
> layer also contains a **feed-forward network (FFN)** — two additional large
> weight matrices that process each token's representation after the attention
> step. Think of attention as "gather information from other tokens" and the
> FFN as "digest what you gathered." There are also matrices for the output
> projection (recombining attention heads) and layer normalization. All of
> them are adjusted during training, all frozen during inference.

Visual: Animated cycle: Sentence → Forward Pass → Prediction → Loss →
Backpropagation → Weight Update → next sentence. Pulse of light traveling
the cycle. Loss curve descending alongside. Training step counter.

Terms defined: **loss**, **gradient**, **gradient descent**, **learning rate**,
**backpropagation**, **forward pass**, **feed-forward network (FFN)**

##### Step 2 — "Watch attention patterns emerge"
Interactive slider showing attention heatmap at different training stages.

Narration:
> As the weight matrices get adjusted step by step, the attention patterns
> evolve from random noise to structured language understanding:

Heatmaps at different stages:
- Step 0 (random): flat noise, no structure
- Step 1,000: faint diagonal (nearby-word attention — easiest pattern)
- Step 100,000: clear diagonal + compound nouns linking ("storage" ↔ "controller")
- Step 10,000,000: syntactic relationships (verb-subject), semantic patterns
- Trained: the structured heatmap from Stop 2

> The simplest patterns emerge first: attend to nearby words. Then syntactic
> structure: verbs find subjects. Then complex relationships: coreference
> across clauses ("faulty" → "controller"). Each training step nudges
> W_Q, W_K, W_V slightly. Billions of tiny adjustments transform random
> matrices into ones that capture the structure of language.
>
> A natural question: if there are multiple attention heads (which we'll
> explore in Stop 8), how does each one get its purpose? The answer: the
> purpose **emerges naturally**. Each head starts with different random
> numbers, so the gradients push each one in a different direction. One
> head discovers that tracking syntax reduces the loss. Another discovers
> positional patterns. They specialize because specialization reduces the
> overall error — similar to how neurons in the visual cortex specialize
> for edges, colors, or motion without being assigned those roles.

Note: data is approximated but the progression is realistic and labeled as such.

##### Step 3 — "The model's three life phases"
Narration:
> A model's life has three phases:
>
> **Phase 1: Pre-training.** The model reads billions of sentences and learns
> to predict the next word. This is where W_Q, W_K, W_V and all other matrices
> go from random to useful. Pre-training a 70B model takes weeks on thousands
> of GPUs and costs millions of dollars. The result is a **base model** — it
> can complete text but isn't yet good at following instructions or being helpful.
>
> **Phase 2: Post-training.** The base model is refined using techniques like
> **SFT (supervised fine-tuning)**, **DPO (direct preference optimization)**,
> and **GRPO (group relative policy optimization)** — the techniques covered
> in the Post-Training Explorer. These further adjust the weight matrices to
> make the model follow instructions, be helpful, and refuse harmful requests.
> The weights change during post-training, but much less dramatically than
> during pre-training — it's refinement, not learning from scratch.
>
> **Phase 3: Inference.** NOW the weights are frozen. They never change again.
> The frozen matrices process every sentence, every conversation, every user's
> request. They ARE the model's permanent learned knowledge.

##### Step 4 — "Frozen knowledge vs. working memory"
Narration:
> This distinction is critical for understanding the KV cache:
>
> **Model weights** — the frozen matrices (W_Q, W_K, W_V, FFN, and all others).
> When people say a model has "70 billion parameters," they're counting the
> total numbers across ALL matrices in ALL layers. A single W_Q matrix in one
> layer might have ~67 million numbers. Across 80 layers, with attention
> matrices, FFN matrices, and everything else, you reach 70 billion total.
>
> At **FP16** precision (16-bit floating point, 2 bytes per number), storing
> 70 billion parameters takes 70B × 2 = **140 GB**. This is why large models
> need multiple GPUs. **Quantization** reduces precision to save memory:
> at FP4 (4-bit, 0.5 bytes per number), the same 70B model fits in **35 GB**
> — small enough for a single GPU. The tradeoff: slightly less accurate
> predictions, because each weight has less precision.
>
> **KV cache** — the Key and Value vectors produced when the frozen matrices
> process a specific conversation. Created fresh for each conversation. Grows
> with every token. Per-user, per-session. When the conversation ends, the
> cache is discarded.
>
> The relationship between model size and KV cache size: they share
> architectural dimensions (number of layers, head dimension), but they
> scale differently. Model weights are fixed regardless of conversation
> length. KV cache grows linearly with tokens. At short conversations
> (1,000 tokens), the KV cache is tiny — maybe 3 MB. At full context
> (128,000 tokens), it can reach 40+ GB for a 70B model — comparable to
> the quantized model weights themselves. This crossover point — where
> the KV cache rivals the model in memory consumption — is when
> infrastructure management becomes critical.

Visual: Two-panel comparison.
Left: "Model weights" — static block. "70B params. 35-140 GB depending on
precision. Loaded once. Shared across all users. Never changes."
Right: "KV cache" — multiple bars, one per user, growing at different rates.
"Per conversation. Starts empty. Grows with every token. Could reach 40+ GB."
Interactive slider for "number of concurrent users" showing total KV cache
memory growing multiplicatively.

##### Step 5 — Bridge to Stop 5
Narration:
> We've seen how training transforms random matrices into ones that produce
> meaningful attention patterns. We understand the three phases of a model's
> life and the critical distinction between frozen weights and dynamic
> KV cache.
>
> In Stops 1 through 4, we built the conceptual picture. Now it's time to
> go inside the math. When we said "Q and K are compared using a dot product,"
> we previewed that the dot product measures similarity between vectors.
> But what does that actually mean? What does it look like with real numbers?
> And why does this particular mathematical operation capture relevance
> between words?
>
> Stop 5 puts real numbers on the table and lets you manipulate them.

#### Design notes
- The training slider (Step 2) is the centerpiece animation — data is
  approximated and labeled as such, but progression is realistic.
- Historical perspective on gradient descent (Cauchy 1840s, Rumelhart/Hinton/
  Williams 1986 backpropagation) adds depth without slowing the flow.
- Post-training reference connects to the Post-Training Explorer project
  without requiring it as a prerequisite.
- Quantization is introduced briefly here (FP16 vs FP4 for model weights)
  and will recur in Act 2 when discussing KV cache quantization.
- The "emergent specialization" preview for attention heads bridges to Stop 8
  while satisfying immediate curiosity.

---

### STOP 5: The Dot Product — How Similarity Becomes a Number
**Question answered:** Why does Q·K work as a relevance score?
**Core concept:** The dot product measures alignment between vectors. It works because
training shapes embeddings and weight matrices so that relevant word-pairs align.
**Animation type:** 3D interactive vector drag + step-by-step arithmetic.

#### Key concepts to introduce
- **Dot product** — multiply corresponding elements of two vectors and sum; produces
  a single number measuring alignment
- **Vector similarity** — same direction = high dot product, perpendicular = zero,
  opposite = negative
- **Embeddings (deeper)** — why related words end up as similar vectors; the training
  process co-optimizes embeddings, W_Q, W_K so that dot products are meaningful
- **Word2Vec** — historical context: Mikolov 2013, "king - man + woman ≈ queen",
  showed that embeddings capture structured relationships
- **Scaled dot-product attention** — dividing by √d to keep scores in softmax's
  comfortable range; the exact formula from "Attention Is All You Need"

#### Flow (7 steps)

##### Step 0 — "Where we are in the pipeline"
Narration:
> In Stop 3, we saw the attention pipeline at a high level:
>
> 1. Compute Q for the current word
> 2. **Compare Q against each K using a dot product** ← we are here
> 3. Scale the scores (Stop 6)
> 4. Convert to probabilities with softmax (Stop 6)
> 5. Blend Values using the weights (Stop 7)
>
> The dot product turns two vectors — a Query and a Key — into a single number
> representing how well they match. Understanding it is the key to understanding
> why certain words attend to others.

Visual: 5-step pipeline as a horizontal flow, step 2 highlighted. This pipeline
visual should persist as a compact bar through Stops 5, 6, and 7.

##### Step 1 — "The operation itself"
Narration:
> The **dot product** of two vectors is computed in two steps:
>
> 1. Multiply each pair of corresponding numbers
> 2. Add up all the products
>
> That's it. Let's see it with real numbers.
>
> Q_faulty = [0.8, -0.3, 0.5, 0.2] and K_controller = [0.7, -0.2, 0.6, 0.1]
>
>   0.8 × 0.7 = 0.56
>  -0.3 × -0.2 = 0.06
>   0.5 × 0.6 = 0.30
>   0.2 × 0.1 = 0.02
>
> Sum: 0.56 + 0.06 + 0.30 + 0.02 = **0.94**
>
> Now compare with a word that ISN'T relevant:
>
> Q_faulty = [0.8, -0.3, 0.5, 0.2] and K_last = [-0.1, 0.4, -0.3, 0.7]
>
>   0.8 × -0.1 = -0.08
>  -0.3 × 0.4 = -0.12
>   0.5 × -0.3 = -0.15
>   0.2 × 0.7 = 0.14
>
> Sum: -0.08 + -0.12 + -0.15 + 0.14 = **-0.21**
>
> High score (0.94) for "controller" — strong match. Low score (-0.21) for "last"
> — not a match. The dot product captured the relevance difference.

Visual: Animated step-by-step calculation. Two columns of numbers with × between
them, products appearing to the right (amber for positive, blue for negative),
summing into final number. Both calculations side by side for contrast.

Term defined: **dot product**

##### Step 2 — "Why does this measure similarity?"
Narration:
> Why does multiplying-and-summing capture similarity? Consider three cases:
>
> **Case 1: Vectors point the same direction.** Q and K have the same pattern —
> both positive in the same positions, both negative in the same positions.
> Every product is positive (positive × positive = positive, negative × negative
> = positive). The sum is large and positive. **High dot product = strong match.**
>
> **Case 2: Vectors point opposite directions.** Q is positive where K is negative
> and vice versa. Every product is negative. The sum is large and negative.
> **Negative dot product = not a match.**
>
> **Case 3: Vectors are unrelated.** No pattern — some products positive, some
> negative, roughly balanced. They cancel out. Sum is near zero.
> **Zero dot product = no particular relationship.**

Visual: 3D interactive. Two arrows in 3D space with orbit controls to rotate the
view. User drags one arrow. As it rotates:
- Parallel → dot product is high positive (number + bar display)
- Perpendicular → zero
- Opposite → negative
The actual vector components and element-by-element products update in real time.

3D is better than 2D here because it shows partial similarity more naturally:
two vectors can agree on two axes but disagree on the third, showing nuanced
relationships that map better to 128D intuition.

Note displayed prominently:
> We're showing 3D for visual intuition. Real Q and K vectors have 128 dimensions
> — far too many to visualize as arrows. The principle is identical: vectors that
> "point in the same direction" in 128-dimensional space produce high dot products.

##### Step 3 — "Why are relevant words encoded as similar vectors?"
This step fills the gap: the dot product only works because the upstream
system is designed to make it work.

Narration:
> The dot product is just multiplication and addition — it has no inherent
> knowledge of language. So why does it produce high scores for relevant
> word-pairs and low scores for irrelevant ones?
>
> Because the entire system upstream is co-trained to make it work.
>
> It starts with **embeddings**. Before a word enters the Q, K, V machinery,
> it's converted from a symbol ("controller") into a vector of numbers.
> These embeddings are themselves learned during training — another set of
> parameters in the model. The training process adjusts them so that words
> with similar meanings end up as similar vectors in a high-dimensional space.
> "Controller" and "processor" end up pointing in roughly the same direction.
> "Controller" and "banana" point in unrelated directions.
>
> Then W_Q and W_K transform those embeddings into Q and K vectors where
> linguistically relevant pairs align. The dot product measures that alignment.
>
> It's a three-layer system, all co-trained:
> 1. **Embeddings** place related words nearby in vector space
> 2. **W_Q and W_K** transform embeddings so relevant pairs align
> 3. **Dot product** measures the alignment → attention score
>
> None of these layers works alone. The dot product is "dumb" math. The
> intelligence lives in the embeddings and weight matrices that training
> shaped to make the dumb math produce smart results.
>
> **Historical note:** Word embeddings were popularized by Tomas Mikolov at
> Google in 2013 with **Word2Vec**. The famous demonstration: compute
> vector("king") - vector("man") + vector("woman"), and the nearest vector
> in the embedding space is "queen." This showed that embeddings capture not
> just similarity but structured *relationships* — and it was one of the key
> insights that made attention mechanisms possible four years later in
> "Attention Is All You Need."

Visual: A simplified 2D scatter plot showing word embeddings as dots.
Clusters visible: hardware words near each other ("server," "controller,"
"storage"), time words together ("last," "week"), people words together
("technician"). Lines showing the Q·K comparison as arrows between
specific word-pairs, with thickness indicating the dot product score.

##### Step 4 — "Our sentence, scored"
Full table showing all scores for "faulty."

Visual: Table with four columns:

| Q (word) | K (word) | Q · K score | Interpretation |
|----------|----------|-------------|----------------|
| faulty | storage controller | 0.94 | Strong — describes this |
| faulty | crashed | 0.41 | Moderate — related failure concept |
| faulty | was | 0.38 | Moderate — linking verb |
| faulty | server | 0.22 | Weak — related but not referent |
| faulty | replaced | 0.18 | Weak — action, not described thing |
| faulty | the (word 5) | 0.08 | Near zero — function word |
| faulty | technician | 0.05 | Near zero — not what's faulty |
| faulty | last | -0.21 | Negative — temporal, not descriptive |

Each row expandable to show the full element-by-element calculation.

Narration:
> These raw scores capture the essential ranking: "storage controller" scores
> highest, linguistically irrelevant words score near zero or negative.
>
> But these are not yet attention weights. They're raw numbers that need two
> more transformations. And there's a problem with them that becomes critical
> at scale...

##### Step 5 — "The scale problem"
Narration:
> As vectors get longer (more dimensions), dot products get larger. With 4
> dimensions, a perfect match might score 1.0. With 128 dimensions, the same
> quality match might score 32.0. This is inevitable — you're summing more terms.
>
> This matters because the next step (Stop 6) feeds these scores into
> **softmax**, which converts them to probabilities. Softmax is sensitive to
> magnitude: very large inputs make it "overconfident" — nearly all weight on
> the single highest score, everything else ignored. Moderate inputs produce
> a smoother distribution that can attend to multiple words.
>
> The fix, from the original "Attention Is All You Need" paper: divide every
> score by **√d**, where d is the vector dimension. This is the "scaled" in
> **scaled dot-product attention**.
>
> With d = 128: √128 ≈ 11.3. A raw score of 32.0 becomes 2.83 — manageable.
>
> **Why √d specifically?** If Q and K elements are independent with variance 1,
> the variance of their dot product is d. Dividing by √d brings the variance
> back to 1, keeping scores in softmax's comfortable zone regardless of
> dimension. An elegant normalization rooted in basic statistics.

Visual: Interactive slider for vector dimension (4, 16, 64, 128, 512). As
dimension increases, show:
- Raw dot product scores growing
- What softmax produces from raw scores (nearly one-hot at high dimensions)
- Scaled scores (÷ √d)
- What softmax produces from scaled scores (smooth distribution)
This previews Stop 6 while completing the scaling story.

##### Step 6 — Bridge to Stop 6
Narration:
> The dot product gives us raw attention scores. Scaling by √d keeps them
> in a reasonable range. But we still don't have proper attention weights —
> we have numbers that could be positive, negative, or zero.
>
> To blend Values (step 5 of the pipeline), we need weights that are:
> - All positive — negative attention has no clear meaning
> - Summing to 1 — so the blend is a proper weighted average
>
> The function that converts raw scaled scores into proper probability
> weights is **softmax**. It takes any list of numbers — positive, negative,
> large, small — and produces positive values that sum to exactly 1.
> Larger inputs get proportionally larger outputs, preserving the ranking.
>
> Stop 6 takes us inside softmax, step by step.

#### Design notes
- The pipeline bar (step 0) persists through Stops 5, 6, 7 to maintain context.
- 3D vector widget uses Three.js with orbit controls. Shows three axes,
  two arrow vectors, labels for dot product value. Interactive drag on one arrow.
  Prominent note about real dimensionality (128D).
- Word2Vec historical note is organic to the flow, not a tangent — it directly
  answers "why do similar words have similar vectors?" which is the prerequisite
  for understanding why dot products work as attention scores.
- The dimension slider in Step 5 bridges naturally to Stop 6 by showing softmax
  behavior, creating a "see the next ledge" moment.

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
| 12d | Token | The actual unit transformers operate on — sub-word pieces. Common words are single tokens; rare words get split (e.g., "technician" → "tech" + "nician") | Stop 3 |
| 13 | Query (Q) | "What am I looking for?" — vector for the current token | Stop 3 |
| 14 | Key (K) | "What do I offer as a match?" — vector stored for every token | Stop 3 |
| 15 | Value (V) | "What information do I carry?" — vector stored for every token | Stop 3 |
| 16 | W_Q, W_K, W_V | Weight matrices producing Q, K, V from embeddings | Stop 3 |
| 16b | Forward pass | Feeding input through the model to produce a prediction | Stop 4 |
| 16c | Loss | A single number measuring how wrong the model's prediction was | Stop 4 |
| 16d | Gradient | The direction to nudge each weight to reduce the loss; computed via backpropagation | Stop 4 |
| 16e | Gradient descent | The optimization algorithm: measure slope (gradient), step downhill, repeat (Cauchy, 1840s) | Stop 4 |
| 16f | Learning rate | Controls the size of each weight adjustment step; too large = overshoot, too small = slow | Stop 4 |
| 16g | Feed-forward network (FFN) | Two weight matrices per layer that process each token after attention; "digest what you gathered" | Stop 4 |
| 16h | Pre-training | Phase 1: learning from billions of sentences to predict next words; produces a base model | Stop 4 |
| 16i | Post-training (SFT, DPO, GRPO) | Phase 2: refining the base model to follow instructions and be helpful | Stop 4 |
| 16j | Parameters | Total count of numbers across all weight matrices (e.g., 70B); each stored at some precision | Stop 4 |
| 16k | Quantization (model weights) | Reducing precision of stored weights (FP16 → FP4) to save memory at small accuracy cost | Stop 4 |
| 17 | Dot product | Multiply corresponding elements of two vectors, sum the results; measures alignment | Stop 5 |
| 17b | Embeddings (deeper) | Learned vectors placing related words nearby in high-dimensional space; co-trained with W_Q, W_K so dot products capture relevance | Stop 5 |
| 17c | Word2Vec | Mikolov 2013; demonstrated embeddings capture structured relationships (king - man + woman ≈ queen); key precursor to attention | Stop 5 |
| 17d | Scaled dot-product attention | The attention formula from "Attention Is All You Need": score = Q·K / √d; dividing by √d normalizes variance across dimensions | Stop 5 |
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
