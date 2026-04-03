### STOP 8: Why Multiple Heads?
**Question answered:** Why not just one attention mechanism per layer?
**Core concept:** One set of W_Q, W_K, W_V learns one type of attention pattern, but
language has many simultaneous relationships. Multi-head attention runs many parallel
attention computations, each specializing in a different kind of pattern. The cost:
each head stores its own K and V, multiplying the cache.
**Animation type:** Side-by-side heatmaps (4 heads) + head-combination animation +
KV cache multiplier visual.

#### Key concepts to introduce
- **Multi-head attention (MHA)** — running multiple independent attention computations
  in parallel, each with its own W_Q, W_K, W_V. The number of heads is a design
  choice: typically 32 (8B models) to 128 (largest models)
- **Head** — one independent attention computation with its own weight matrices,
  producing its own K, V, and attention pattern
- **Model dimension (d_model)** — the fixed number of dimensions in every token's
  embedding; an architectural constant. This was previewed in Stop 3 ("the N in
  a vector of N numbers") and is now fully explained with concrete values
- **Head dimension (d_head)** — each head operates on a *slice* of the full
  embedding, not a copy. d_head = d_model ÷ n_heads. For all Llama-3 models,
  d_head = 128
- **Concatenation + output projection (W_O)** — all head outputs are concatenated
  back into one full-size vector, then multiplied by one more weight matrix (W_O)
  that learns how to combine the perspectives
- **Emergent specialization** — heads are not *assigned* roles; they discover
  specializations during training because each starts with different random values
  and follows different gradient paths
- **MQA, GQA, MLA** (preview) — techniques that reduce KV cache by sharing or
  compressing K and V across heads instead of storing separate K, V per head

#### Flow (7 steps)

##### Step 0 — "One head isn't enough"

Callback to Stop 7. The complete pipeline from Step 5 showed *one* attention head
processing "faulty." It learned a coreference pattern — "faulty" attends to
"storage controller."

Narration:
> In Stop 7, we saw the complete attention pipeline: Query matches against Keys,
> scores become weights via softmax, weights blend Values, residual connection
> preserves the original. That pipeline used **one** set of W_Q, W_K, W_V —
> one attention "head."
>
> But consider what that one head learned to do. It connected "faulty" to
> "storage controller" — a **coreference** pattern. That's one type of
> linguistic relationship. In the same sentence, there are others happening
> simultaneously:
>
> - **Syntactic:** "crashed" needs to find its subject ("server")
> - **Positional:** "last" modifies "week" (adjacent words)
> - **Semantic:** "storage," "controller," and "server" form a domain cluster
>   (all infrastructure hardware)
> - **Causal:** "because" links cause and effect across the sentence
>
> One set of weight matrices can only learn ONE pattern of attention. A single
> W_Q can only transform a word's embedding to ask ONE type of question. But
> language requires asking many different questions simultaneously.
>
> The solution: run multiple attention computations in parallel, each with its
> own W_Q, W_K, W_V, each free to discover a different specialization.

Visual: Our sentence with *one* attention pattern shown (the coreference pattern
from Stop 7). Then: "But this is just one perspective. What about these?" — other
relationships light up as colored overlays, each representing a different type of
pattern that a single head can't capture simultaneously.

##### Step 1 — "How heads divide the work"

This is where the "slice, don't copy" insight lands. But first, we need to
ground d_model — the concept seeded in Stop 3.

Narration:
> Before we see how heads divide the work, we need one architectural detail
> we've been building toward.
>
> In Stop 3, when we showed how embeddings are transformed into Q, K, and V
> vectors, we described the embedding as "a vector of N numbers" and named
> that N the **model dimension (d_model)**. Now we can put concrete values
> on it.
>
> d_model is a fixed architectural constant — every token, in every layer, is
> represented as a vector of exactly d_model numbers. Different models use
> different sizes:
>
> | Model | d_model | Why |
> |-------|---------|-----|
> | Llama-3 8B | 4,096 | Smaller model, fewer dimensions |
> | Llama-3 70B | 8,192 | Larger model, richer representations |
> | Llama-3 405B | 16,384 | Largest, most expressive |
>
> A larger d_model means each token's embedding can encode more nuance — more
> dimensions to capture meaning, syntax, domain, position, and all the other
> properties the model needs. But it also means larger weight matrices and more
> computation at every step. The choice of d_model is one of the fundamental
> tradeoffs in model architecture.
>
> Now — with d_model in hand — here's where multi-head attention is clever.
>
> You might expect 32 heads to mean 32× the computation. It doesn't.
>
> Instead of giving each head the full embedding, the model **slices** the
> embedding into equal pieces. For Llama-3 70B with d_model = 8,192 and 64
> Q heads, each head gets 8,192 ÷ 64 = 128 numbers. This slice is called the
> **head dimension (d_head)**.
>
> Remember in Stop 5 when we said "real Q and K vectors have 128 dimensions"?
> Now you can see where that number comes from — it's d_model ÷ n_heads.
> And here's a striking fact: d_head = 128 across ALL Llama-3 models,
> regardless of size:
>
> | Model | d_model | Q heads | d_head |
> |-------|---------|---------|--------|
> | Llama-3 8B | 4,096 | 32 | 128 |
> | Llama-3 70B | 8,192 | 64 | 128 |
> | Llama-3 405B | 16,384 | 128 | 128 |
>
> Bigger models don't give each head more dimensions — they add more heads.
> Each head works with the same 128-number slice, but there are more of them,
> providing more parallel perspectives on the same input.
>
> Each head has its own W_Q, W_K, W_V — but these are smaller matrices.
> Instead of transforming an 8,192-number vector, each transforms a 128-number
> slice. The total computation across all heads is roughly the same as one head
> operating on the full embedding.
>
> **Why slice instead of copy?** Two reasons:
>
> First, **efficiency** — the total number of multiplications stays comparable.
> Each head does less work, but there are more of them.
>
> Second, and more importantly, **forced specialization**. Each head sees only
> a portion of the information. It must learn to make the most of its slice,
> which pushes different heads toward different strategies — just as assigning
> smaller territories to scouts forces each scout to know their area deeply
> rather than covering everything shallowly.
>
> The head dimension (d_head = 128) is also the size of each K and V
> vector that gets stored in the KV cache — this number will matter a lot
> when we calculate cache sizes in Step 4.

Visual: Animated diagram. Full embedding vector (8,192 numbers for 70B, shown
as a long colored bar) splits into 64 slices. Each slice flows into its own
mini-pipeline (W_Q, W_K, W_V → Q, K, V → attention → output). The slices are
visually distinct colors so the user can track them through the heads.

Terms defined: **model dimension (d_model)**, **head dimension (d_head)**

##### Step 2 — "What different heads learn"

The centerpiece interactive. Four heads shown side-by-side, same sentence,
different attention patterns.

Narration:
> Each head starts with different random weight matrices. During training,
> gradient descent pushes each in the direction that reduces prediction error.
> Because they start in different places and see different slices of the
> embedding, they converge on different specializations.
>
> Researchers have studied what heads learn by examining their attention
> patterns in trained models. Here are four common types of specialization
> that have been well-documented in the interpretability literature,
> illustrated on our sentence:

**Head A — "Syntax head":**
"crashed" → "server" (verb finds subject), "replaced" → "technician"
(verb finds agent)
Pattern: strong verb-to-noun connections following English syntactic structure.

**Head B — "Coreference head":**
"faulty" → "storage controller" (adjective finds the noun it describes
across a clause boundary), "was" → "controller" (linking verb to subject)
Pattern: long-range connections that cross clause boundaries.

**Head C — "Positional/local head":**
Each word attends primarily to its immediate neighbors. "last" → "week,"
"storage" → "controller"
Pattern: strong diagonal — nearby words attend to each other, with weight
decaying quickly by distance.

**Head D — "Semantic domain head":**
"server," "storage," "controller" all attend to each other. "last," "week"
attend to each other.
Pattern: clusters of semantically related words light up, ignoring
syntactic position.

> These specializations are **not programmed**. No one told Head A to learn
> syntax. It emerged because syntactic structure helps predict next words —
> and predicting next words is the training objective. Each head independently
> discovered that a certain kind of attention pattern reduces the loss.
>
> This is analogous to how neurons in the visual cortex specialize for edges,
> colors, or motion without being assigned those roles — the specialization
> emerges from the structure of the data and the learning objective.

Visual: Four side-by-side heatmaps or fan-of-lines diagrams, each with a label
and a brief description. Interactive: user can click any word and see how its
attention differs across all four heads.

Important note (shown once):
> **An honest disclosure:** These head specializations are simplified for
> illustration. Real attention heads rarely fall into clean categories.
> Many heads show mixed behavior, some focus on patterns we don't fully
> understand, and the same head can behave differently for different inputs.
> Research into attention head interpretability (e.g., Anthropic's work on
> circuits and features) is an active field. The key insight stands: different
> heads learn different things, and that diversity is what gives the model its
> richness.

Terms defined: **multi-head attention (MHA)**, reinforced: **emergent
specialization**

##### Step 3 — "Putting the heads back together"

How the outputs recombine.

Narration:
> Each head produces its own output — a 128-number vector representing its
> perspective on each word. Now those perspectives need to merge into a single
> representation the rest of the model can use.
>
> The process has two steps:
>
> **Concatenate:** Line up all head outputs end-to-end. For Llama-3 70B:
> each head contributed 128 numbers → 64 heads × 128 numbers = 8,192 numbers.
> We're back to the full d_model.
>
> **Project:** Multiply the concatenated vector by one more weight matrix called
> **W_O** (the output projection, also learned during training). This matrix
> learns how to blend the different heads' perspectives into a single coherent
> representation.
>
> **Why do we need W_O?** Concatenation alone just stacks perspectives side by
> side — it doesn't integrate them. W_O learns which head combinations are
> useful. If Head A (syntax) and Head B (coreference) both found relevant
> information about "faulty," W_O learns to combine their insights — perhaps
> emphasizing the coreference finding over the syntactic one when the model
> is predicting the next word after an adjective.
>
> **A callback to Stop 4:** Remember when we said a single W_Q matrix has
> ~67 million numbers? Now you can see the shape more precisely. In Llama-3
> 70B, there are 64 separate W_Q matrices per layer (one per head), each
> of size d_model × d_head = 8,192 × 128 ≈ 1 million numbers. Across all
> 64 heads: 64 × 1 million ≈ 67 million numbers for W_Q alone. The same
> for W_K, W_V, and W_O — so the attention mechanism in one layer has roughly
> 268 million weight parameters, before counting the feed-forward network.

Visual: Animation showing 64 small output vectors (colored by head) sliding
together into one long vector (concatenation), then passing through W_O and
emerging as the final attention output. This feeds into the residual connection
from Stop 7.

Term defined: **concatenation + output projection (W_O)**

##### Step 4 — "The cost: KV cache × heads"

The pivotal moment for the KV cache story. This is where multi-head attention's
beauty becomes infrastructure's burden.

Narration:
> Here's the consequence for the KV cache.
>
> In Stop 3, we learned that K and V are cached for every token so future
> tokens can look them up. With a single head, that's one K vector and one V
> vector per token per layer. With multi-head attention, **each head stores
> its own K and V**. Let's calculate the real cost.
>
> But first, an important detail. Llama-3 doesn't actually use full
> multi-head attention for K and V. It uses a technique called **GQA
> (Grouped-Query Attention)** — which we'll explain in Step 5. What this
> means for our calculation: while Llama-3 70B has 64 Q heads (each asking
> its own question), there are only **8 KV groups** (sets of stored K, V
> vectors). Every 8 Q heads share one set of K and V. This dramatically
> reduces the cache.
>
> The formula is:
>
> **KV cache per token = 2 (K + V) × layers × KV heads × d_head × precision**
>
> Let's run the numbers for two models:

**Llama-3 8B:**

> - d_head = 128 numbers per vector
> - KV heads per layer = 8 (GQA)
> - Layers = 32
> - Precision = FP16 (2 bytes per number)
>
> Per token: 2 × 32 layers × 8 KV heads × 128 numbers × 2 bytes
> = **131,072 bytes ≈ 128 KB**

**Llama-3 70B:**

> - d_head = 128 numbers per vector
> - KV heads per layer = 8 (GQA)
> - Layers = 80
> - Precision = FP16 (2 bytes per number)
>
> Per token: 2 × 80 layers × 8 KV heads × 128 numbers × 2 bytes
> = **327,680 bytes ≈ 320 KB**

> Now scale by context length:
>
> | | Llama-3 8B | Llama-3 70B |
> |---|---|---|
> | **Per token** | 128 KB | 320 KB |
> | **1K tokens** (short prompt) | 128 MB | 320 MB |
> | **8K tokens** (typical conversation) | 1.0 GB | 2.5 GB |
> | **32K tokens** (long conversation) | 4.0 GB | 10.0 GB |
> | **128K tokens** (full context window) | 16.0 GB | 40.0 GB |
>
> These numbers are for **one user's conversation**. Every concurrent session
> needs its own KV cache — the cached K and V vectors are specific to that
> conversation's tokens.
>
> Now put this in the context of actual GPU memory:
>
> | GPU | HBM capacity | Model weights (FP16) | Remaining for KV cache | Max tokens (one user, 70B) |
> |---|---|---|---|---|
> | H100 | 80 GB | ~140 GB (needs 2 GPUs) | ~20 GB per GPU | ~62K tokens |
> | H100 (FP4 quantized) | 80 GB | ~35 GB (fits 1 GPU) | ~45 GB | ~140K tokens |
> | B200 | 192 GB | ~140 GB | ~52 GB | ~162K tokens |
>
> With quantized weights on a single H100, Llama-3 70B can serve one user
> at roughly full context. **One user fills the GPU.** Add a second concurrent
> user and you've exceeded memory — even with quantized weights.
>
> The 70B model has 2.5× the KV cache per token compared to the 8B model,
> driven primarily by having 2.5× more layers (80 vs. 32). The KV head count
> and d_head are identical — both use 8 KV groups with d_head = 128. The
> difference is pure depth.
>
> **But wait — these models use GQA, not full MHA.** Llama-3 70B has 64 Q
> heads but only 8 KV groups. If it used full MHA — 64 independent K, V
> per layer — the cache would be 8× larger: **2.56 MB per token, 320 GB at
> full context.** That would require four H100s just for the KV cache of a
> single conversation.
>
> The fact that modern models use GQA instead of MHA is not a minor
> optimization. It's what makes serving these models possible at all.
> Let's see how it works.

Visual: Two-panel interactive.

**Panel A — "Cache filling":** A GPU memory bar (80 GB for H100) with model
weights as a fixed block at the bottom. KV cache grows upward as a slider
moves from 0 to 128K tokens. Two overlaid fills — one for 8B (lighter), one
for 70B (darker) — so the user sees the rate difference. Red line at the
top = GPU memory limit. The 70B line hits it around 140K tokens (quantized
weights); the 8B line has much more headroom.

**Panel B — "MHA vs. GQA":** Same GPU memory bar, but now two fills for the
*same* model (70B): one showing hypothetical MHA cache (64 KV heads), one
showing actual GQA cache (8 KV groups). The MHA fill blows past the GPU
limit almost immediately. The GQA fill is the manageable version from Panel A.

Controls:
- Model selector: Llama-3 8B / Llama-3 70B
- Context length slider: 0 to 128K
- Concurrent users: 1 / 2 / 4 / 8 (multiplies KV cache)
- Toggle: "What if this model used full MHA?"

##### Step 5 — "What if heads shared their K and V?"

The MQA/GQA/MLA preview. This bridges to the deeper Act 2 treatment while
satisfying immediate curiosity.

Narration:
> The industry noticed this problem early. If the KV cache is proportional to
> the number of heads, could heads **share** K and V instead of each storing
> their own?
>
> Three approaches have emerged:
>
> **MHA (Multi-Head Attention)** — the original. Every head has its own K, V.
> Maximum expressiveness, maximum cache. This is what GPT-3 and early
> Llama models used.
>
> **MQA (Multi-Query Attention)** — all heads share a *single* K and V.
> Every head still has its own Q (so they still ask different questions), but
> they all search and read from the same K, V. Cache shrinks to 1/n_heads
> of MHA. The tradeoff: some loss in attention quality because heads can no
> longer specialize their Keys and Values. Introduced by Noam Shazeer (2019).
>
> **GQA (Grouped-Query Attention)** — a middle ground. Heads are organized
> into groups (e.g., 8 groups of 8 heads). Within each group, heads share
> K, V. Across groups, K, V are independent. Cache shrinks by the group
> factor. This is what Llama-3 actually uses — all three sizes (8B, 70B,
> 405B) use 8 KV groups. For the 70B model: 64 Q heads ÷ 8 KV groups =
> 8 Q heads per group, each sharing one set of K, V.
>
> **MLA (Multi-Head Latent Attention)** — DeepSeek's approach. Instead of
> storing K and V directly, compress them into a smaller **latent vector**
> and reconstruct K, V on demand when needed. Trades compute for memory —
> more arithmetic per token, but dramatically smaller cache.

Visual: Four-panel comparison, one per approach:
- MHA: 64 K arrows, 64 V arrows → big cache block
- MQA: 1 K arrow, 1 V arrow → tiny cache block, but 64 Q arrows
- GQA: 8 K arrows, 8 V arrows → medium cache block, 64 Q arrows
- MLA: 1 small "latent" arrow → smallest block, with a "decompress" step

Each panel shows the cache size for 128K tokens with Llama-3 70B dimensions:

| Approach | KV vectors per layer | Cache/token (one layer, FP16) | At 128K tokens (one layer) |
|----------|---------------------|-------------------------------|---------------------------|
| MHA (64 heads) | 64 K + 64 V | 32 KB | 4.1 GB |
| GQA (8 groups) | 8 K + 8 V | 4 KB | 512 MB |
| MQA (1 shared) | 1 K + 1 V | 512 B | 64 MB |
| MLA (latent) | 1 compressed | ~256 B | ~32 MB |

> Most modern models use GQA because it preserves most of MHA's quality
> while cutting the KV cache by 4–8×. When we calculate real cache sizes
> in Stop 10, we'll use GQA numbers — because that's what production
> models actually deploy. MLA and other compression techniques will be
> explored in depth in Act 2, Stop 14.

Terms defined: **MQA**, **GQA**, **MLA**

##### Step 6 — Bridge to Stop 9

Narration:
> Multi-head attention is the mechanism that gives transformers their depth
> of understanding — multiple perspectives combining into a rich
> representation. It's also the mechanism that makes the KV cache a
> serious engineering challenge.
>
> But everything we've seen so far — Q, K, V, dot products, softmax,
> weighted sums, multiple heads — happens in a single **layer**. A
> production transformer doesn't have one layer. It has 32 (for an 8B
> model), 80 (for 70B), or 126 (for 405B).
>
> Each layer takes the output of the previous layer and runs the full
> multi-head attention + feed-forward pipeline again. The representation
> gets progressively refined: early layers capture surface patterns, deeper
> layers build abstract understanding.
>
> And critically: **every layer maintains its own KV cache**. The cache
> we calculated in Step 4 was per-token across all heads in one layer —
> about 4 KB for Llama-3 70B with GQA. Multiply by 80 layers, and a
> single token's total KV footprint is ~320 KB. That's the number from
> our table.
>
> Stop 9 shows why stacking layers is worth this cost.

#### Design notes

- **Step 1 is the longest step** because it carries both the d_model grounding
  and the "slice, don't copy" insight. These must be in the same step because
  the slicing explanation requires d_model. Breaking them into two steps would
  leave Step 1 feeling incomplete — "here's a number, now wait for why it
  matters."

- **Step 2 is the centerpiece.** The four-head side-by-side is the visual that
  makes multi-head attention click. The interactivity (click a word, see four
  different attention patterns) transforms this from a lecture to an experience.

- **Honesty disclosure in Step 2** is critical — we must not oversell head
  interpretability. Real heads are messy. The simplified categories serve
  pedagogy but shouldn't become the user's mental model of how all heads work.

- **Step 3 callback to Stop 4** ("~67 million numbers") closes a loop. The user
  heard that number in Stop 4 without derivation. Now they see where it comes
  from: 64 heads × (8,192 × 128) = ~67M. This rewards attention and builds
  trust that the curriculum is precise.

- **Step 4 leads with GQA numbers (the real architecture)** instead of MHA.
  This is a deliberate correction from earlier drafts that used MHA as the
  primary calculation. Leading with the real architecture prevents the user
  from forming a wrong mental model that must then be corrected. The MHA
  counterfactual ("what if") appears only as contrast, making GQA feel like
  a relief rather than an abstract optimization.

- **d_head = 128 across all model sizes** is a non-obvious, satisfying fact.
  It connects Stop 5's "128 dimensions" to an architectural reason, and it
  reveals that scaling happens by adding heads, not widening them. This has
  direct KV cache implications: cache-per-head is constant; total cache
  scales with heads and layers.

- **The two-model comparison (8B vs 70B)** reveals that the cache difference
  between models comes from depth (layers), not from head dimension or KV
  group count (both identical). This insight sets up Stop 9 perfectly.

- **MQA/GQA/MLA preview (Step 5)** follows the "see the next ledge" principle.
  Each technique is explained enough that the user understands WHAT it does
  and WHY it exists. The per-layer cache table makes the tradeoffs concrete.
  Full treatment deferred to Act 2, Stop 14.

---

### STOP 9: The Stack — Layers on Layers
**Question answered:** Why stack multiple transformer layers?
**Core concept:** Each layer refines the representation further. Early layers capture
surface patterns (syntax, local structure), deeper layers capture abstract patterns
(meaning, reasoning, world knowledge). The feed-forward network in each layer
digests what attention gathered. Each layer adds its own KV cache, multiplying the
memory footprint by the number of layers.
**Animation type:** Vertical layer stack with a token's representation evolving
through layers + feed-forward network explanation + KV cache accumulation visual.

#### Key concepts to introduce
- **Layer** — one complete block in the transformer, consisting of multi-head
  attention followed by a feed-forward network, with residual connections and
  normalization around each
- **Progressive refinement** — early layers capture local/syntactic patterns,
  middle layers capture semantic relationships, deep layers capture abstract
  reasoning and world knowledge
- **Feed-forward network (FFN)** — the other half of each transformer layer.
  Two large weight matrices that process each token independently after
  attention. Attention gathers information from other tokens; the FFN digests
  and transforms what was gathered
- **Layer normalization (LayerNorm / RMSNorm)** — normalization applied before
  each sub-block (attention and FFN) that stabilizes values across dimensions.
  Without it, values would drift and explode across 80+ layers. Llama uses
  RMSNorm (Root Mean Square Normalization), a simplified variant
- **The complete transformer block** — the full repeating unit:
  normalize → multi-head attention → residual add → normalize → FFN →
  residual add

#### Flow (7 steps)

##### Step 0 — "One layer isn't enough"

Callback to Stop 8. We've built one complete attention mechanism with multiple
heads. But one layer of attention can only capture relationships visible in the
raw embeddings.

Narration:
> In Stop 8, we saw multi-head attention: many parallel perspectives combining
> into a rich representation. One head finds syntax, another finds coreference,
> another finds semantic clusters.
>
> But there's a limitation. In that single layer, every head is working from
> the **original embeddings** — the raw representations of individual words.
> "Controller" is represented as a hardware component. "Faulty" is represented
> as an adjective meaning defective. The attention mechanism connects them,
> but each word's representation is still grounded in its original meaning.
>
> What if the model needs to understand something more abstract? Consider:
>
> *"The server crashed because the storage controller that the technician
> replaced last week was faulty."*
>
> After one layer, the model might understand:
> - "faulty" describes "controller" (coreference)
> - "crashed" happened to "server" (syntax)
> - "replaced" was done by "technician" (agent)
>
> But can it understand: **the crash was caused by a maintenance failure** —
> the technician's replacement didn't fix the problem, and the controller
> remained faulty? That requires combining the coreference finding with the
> causal "because" with the temporal "last week" into an integrated
> understanding that no single attention pass can produce.
>
> The solution: run the entire multi-head attention pipeline again — but this
> time, each word's representation already carries context from the first
> layer. Layer 2 doesn't see raw words. It sees words enriched by layer 1.
> Layer 3 sees words enriched by layers 1 and 2. And so on, through 32,
> 80, or 126 layers.

Visual: Our sentence with layer-1 attention patterns shown (from Stop 8). Then
zoom out to show this is just one layer in a tall stack. The stack is drawn
vertically with an arrow indicating "we are here" at the bottom.

##### Step 1 — "What happens inside each layer"

Before showing the stack, ensure the user knows what one layer actually
contains. Attention is only half the story.

Narration:
> Each transformer layer has two major components, not one. We've spent
> Stops 3–8 on the first. Now we need the second.
>
> **Component 1: Multi-head attention** — everything we've built so far.
> Each token gathers information from other tokens. Think of it as a
> meeting: everyone in the room exchanges notes. After attention, each
> token's representation has been enriched by the tokens it attended to.
>
> **Component 2: Feed-forward network (FFN)** — two large weight matrices
> that process each token **independently**, after the attention step.
> If attention is the meeting, the FFN is what happens when everyone goes
> back to their desk and processes what they heard.
>
> The FFN takes the attention-enriched representation and transforms it
> through two matrix multiplications with a non-linear activation function
> (Llama uses **SwiGLU**) in between. The first matrix expands the
> representation to a larger internal dimension (14,336 for Llama-3 8B,
> 28,672 for 70B) — providing more "workspace" for processing. The second
> matrix compresses it back to d_model.
>
> **Why is the FFN needed?** Attention is powerful at gathering information
> across tokens, but it's a **linear** operation — weighted sums can only
> combine information, not transform it in complex ways. The FFN adds
> **non-linear** processing that can detect patterns, apply learned rules,
> and transform representations in ways that linear mixing cannot. Research
> suggests that FFN layers store much of the model's factual knowledge —
> the "world knowledge" the model learned during pre-training.
>
> **Why process tokens independently?** Each token's FFN computation uses
> only that token's own representation. This is by design: attention handles
> the cross-token communication; the FFN handles per-token reasoning. This
> separation keeps the architecture clean and parallelizable.
>
> Each component is wrapped in two architectural elements we've already met:
>
> - **Residual connection** (from Stop 7) — the output of each component
>   is added to its input, preserving the original signal
> - **Layer normalization** — applied before each component, this
>   stabilizes the values across dimensions. Without it, numbers would
>   drift and potentially overflow across 80+ layers. Llama uses a
>   simplified variant called **RMSNorm** (Root Mean Square Normalization)

Visual: A single transformer layer shown as a clean block diagram:

```
Input
  ↓
[RMSNorm] → [Multi-Head Attention] → + (residual)
                                      ↓
                              [RMSNorm] → [FFN] → + (residual)
                                                    ↓
                                                  Output
```

Each component labeled clearly. The KV cache box from Stop 7's pipeline diagram
is visible inside the attention block. The residual connections are drawn as
bypass paths (callback to Stop 7, Step 4).

Terms defined: **feed-forward network (FFN)**, **layer normalization (RMSNorm)**,
**layer** (the complete block)

##### Step 2 — "Watching a token evolve through layers"

The centerpiece animation. Show progressive refinement in action.

Narration:
> Now let's stack these layers and watch what happens to a single word's
> representation as it passes through. We'll track "faulty" through six
> layers (simplified from the real 80, but the principle is identical).

**Layer 1 output:**
> "faulty" = an adjective meaning defective + weakly connected to nearby words
> (The layer captured basic positional and syntactic relationships.)

**Layer 2 output:**
> "faulty" = a defective property describing a hardware component
> (The coreference head in layer 2 had enriched representations to work
> with — "controller" already carried traces of "storage" from layer 1.
> So layer 2's coreference is stronger and more specific.)

**Layer 3 output:**
> "faulty" = the root cause of a system crash, describing a storage
> controller
> (Layer 3 connected the causal chain: "faulty" → "controller" →
> "crashed" → "server." The causal "because" now links these elements.)

**Layer 4 output:**
> "faulty" = a persistent hardware defect that survived a maintenance
> action performed by a technician last week
> (Layer 4 integrated the temporal context: the replacement happened in
> the past, yet the fault persists. This requires combining coreference,
> causality, and temporal reasoning — something no single layer could do.)

**Layer 5 output:**
> "faulty" = a component failure with maintenance history suggesting
> either a recurring problem or an incomplete repair
> (Deeper layers begin to encode inferential reasoning — conclusions
> that go beyond what the sentence literally says.)

**Layer 6 output:**
> "faulty" = carries integrated context sufficient for the model to
> predict what might come next in the text and answer questions about the
> scenario
> (The representation is now rich enough to support downstream tasks.)

> Each layer builds on the previous one's work. Layer 1 can only see raw
> words. Layer 4 sees words that have already been enriched by three rounds
> of attention and feed-forward processing. The "distance" that attention
> can span effectively increases with depth — not because the mechanism
> changes, but because the representations it operates on are progressively
> richer.
>
> This is why deeper models are more capable. A 32-layer model (Llama-3 8B)
> can perform 32 rounds of this progressive refinement. An 80-layer model
> (Llama-3 70B) gets 80 rounds — enough to build deeper abstractions,
> handle more complex reasoning, and integrate more context.

Visual: Vertical animation. "Faulty" starts at the bottom as a single-color bar.
At each layer, it passes through the attention block (arrows fan out to other
words — visible but faded since this is about "faulty's" journey) and the FFN
block. After each layer, the bar gains additional colors/texture representing the
accumulated context. By layer 6, the bar is a rich multi-colored representation.

Side panel: "What 'faulty' knows at this layer" — text description updating at
each step, showing the progressive enrichment.

Important note (shown once):
> **An honest disclosure:** These layer-by-layer descriptions are interpretive
> approximations — the same caveat as our hidden state visualization in Stop 1.
> Real representations are distributed across thousands of dimensions with no
> clean labels. The progressive-refinement pattern, however, is well-documented:
> probing studies consistently show that syntactic information concentrates in
> early layers while semantic and reasoning capabilities emerge in deeper layers.

##### Step 3 — "What the FFN contributes"

Give the FFN its due. Without this step, users might think attention does
everything and the FFN is just overhead.

Narration:
> It's tempting to think attention does all the interesting work and the FFN
> is just housekeeping. Research tells a different story.
>
> **Attention** excels at: finding relationships between tokens, routing
> information across positions, building context-aware representations.
>
> **FFN** excels at: storing and retrieving factual knowledge, applying
> learned transformations, pattern detection that operates on individual
> token representations.
>
> A striking finding from interpretability research: when researchers probe
> where factual knowledge lives in a transformer (e.g., "The capital of France
> is ___"), the answer is predominantly in the FFN layers, not in attention.
> The attention mechanism identifies that a capital-city question is being asked
> and routes the relevant context. The FFN supplies the answer from its learned
> weights.
>
> Think of it this way: attention is the communication network — it moves
> information between tokens. The FFN is the processor at each node — it
> transforms information locally. Both are essential. A network without
> processors can move data but not compute anything. Processors without a
> network can compute but each in isolation.
>
> **Size-wise, the FFN is the larger component.** For Llama-3 70B, the FFN
> in each layer has two matrices of size d_model × d_ff (8,192 × 28,672),
> totaling ~470 million parameters per layer. The attention matrices total
> ~268 million per layer. Roughly 63% of the model's parameters are in FFN
> layers. This is where most of the model's "knowledge" is stored.
>
> **But the FFN has no KV cache.** It processes each token independently
> using only the frozen weight matrices — no per-conversation state to store.
> The KV cache problem is purely an attention-side phenomenon. The FFN's
> cost is in the weight matrices themselves (contributing to the ~140 GB
> model weight footprint), not in per-token state.

Visual: Side-by-side comparison within one layer.
Left: "Attention" — arrows between tokens, KV cache box growing.
Right: "FFN" — each token processed independently through two matrix blocks,
no cache. Weight matrices shown as large fixed blocks.

Caption: "Attention moves information between tokens and creates the KV cache.
FFN processes each token independently and stores no per-conversation state."

##### Step 4 — "The full stack: 80 layers deep"

Zoom out to the complete model.

Narration:
> Now let's see the full picture. A production model repeats this
> layer — multi-head attention + FFN + residual connections + normalization —
> many times:
>
> | Model | Layers | What this means |
> |-------|--------|----------------|
> | Llama-3 8B | 32 | 32 rounds of refinement |
> | Llama-3 70B | 80 | 80 rounds of refinement |
> | Llama-3 405B | 126 | 126 rounds of refinement |
>
> Each layer has its own independent weight matrices — its own W_Q, W_K, W_V,
> W_O, and FFN matrices. None are shared between layers. Layer 1's attention
> matrices are completely different from layer 40's. This is how each layer
> specializes: early layers develop matrices tuned for surface patterns, deep
> layers develop matrices tuned for abstract reasoning.
>
> And each layer has its own independent KV cache.
>
> In Stop 8, we calculated the KV cache per token for one layer of Llama-3
> 70B with GQA: 8 KV groups × 128 d_head × 2 (K + V) × 2 bytes = 4,096
> bytes ≈ 4 KB per layer.
>
> Across 80 layers: 4 KB × 80 = **320 KB per token**. This matches the
> number from Stop 8's table — now you can see exactly where it comes from.
>
> The KV cache scales with three dimensions simultaneously:
> - **Tokens** — grows linearly as the conversation lengthens
> - **Heads** (or KV groups) — set by the architecture, reduced by GQA
> - **Layers** — set by the architecture, no shortcut to reduce this
>
> Of these three, layers is often the largest multiplier. The 70B model has
> 2.5× the cache of the 8B model, and the difference is entirely due to
> 80 vs. 32 layers — the KV groups and d_head are identical.

Visual: The full layer stack shown vertically. 80 layers for Llama-3 70B,
with a KV cache column running alongside it — one KV cache block per layer,
stacking upward. The total height of the KV column is visually proportional
to the total cache size. An interactive slider lets the user switch between
8B (32 layers — shorter stack), 70B (80 layers), and 405B (126 layers).

For comparison, the model weights column runs on the other side — showing
that model weights also scale with layers, but are fixed regardless of
conversation length.

##### Step 5 — "The complete transformer"

The definitive reference diagram for the full model architecture. This is the
diagram the user should carry in their head for the rest of the course.

Narration:
> Let's assemble everything from Stops 1 through 9 into the complete picture.
> This is a modern transformer language model:

Visual: Full architecture diagram, clean and definitive:

```
Input text
  ↓
[Tokenizer] → token IDs
  ↓
[Embedding lookup] → d_model-sized vectors (one per token)
  ↓
┌─────────────── Layer 1 ───────────────┐
│ [RMSNorm] → [Multi-Head Attention] → +│  ← KV Cache (layer 1)
│                                       │
│ [RMSNorm] → [FFN]                → +│
└───────────────────────────────────────┘
  ↓
┌─────────────── Layer 2 ───────────────┐
│ [RMSNorm] → [Multi-Head Attention] → +│  ← KV Cache (layer 2)
│                                       │
│ [RMSNorm] → [FFN]                → +│
└───────────────────────────────────────┘
  ↓
  ... (× 80 for Llama-3 70B)
  ↓
┌─────────────── Layer 80 ──────────────┐
│ [RMSNorm] → [Multi-Head Attention] → +│  ← KV Cache (layer 80)
│                                       │
│ [RMSNorm] → [FFN]                → +│
└───────────────────────────────────────┘
  ↓
[RMSNorm] → [Output projection] → vocabulary-sized vector
  ↓
[Softmax] → probability distribution over next token
  ↓
Select next token
```

Annotations on the diagram:
- The KV cache column on the right, with "grows per token, per layer"
- Model weights (frozen) labeled on the left
- "d_model = 8,192 throughout" spanning the full stack
- "All layers independent — different weights, different KV caches"

> Every token in the input passes through all layers. At each layer,
> multi-head attention gathers information from other tokens (consulting
> and updating the KV cache for that layer), and the FFN processes what was
> gathered. After the final layer, the enriched representation is projected
> into a probability distribution over the vocabulary — predicting the next
> token.
>
> During generation, this entire stack runs once per token produced. To
> generate 100 tokens of response, the full stack runs 100 times. Each run
> adds one new set of K, V entries to the cache at every layer.

##### Step 6 — Bridge to Stop 10

Narration:
> We've now seen the complete transformer from input to output:
>
> - **Embeddings** turn words into vectors (Stop 1, 3)
> - **Q, K, V** enable matching and information retrieval (Stops 3, 5, 6, 7)
> - **Multi-head attention** provides parallel perspectives (Stop 8)
> - **FFN** adds non-linear processing and factual knowledge (this stop)
> - **Layers** stack for progressive refinement (this stop)
> - **Residual connections** preserve information across depth (Stop 7)
>
> Throughout this journey, one structure has been growing quietly in the
> background: the **KV cache**. Every layer, every head group, every token
> adds to it. We've calculated its size piece by piece. Now it's time to
> put it all together and see the full picture.
>
> Stop 10 asks the question that bridges Act 1 to Act 2: the KV cache makes
> inference possible — without it, the model would recompute all K and V
> vectors for every previous token at every generation step. But the cache
> that makes inference fast is also the structure that makes inference
> expensive at scale. How expensive? What are the two phases of inference?
> And what happens when the cache exceeds the GPU's memory?
>
> That's the story of the KV cache — and the beginning of Act 2.

#### Design notes

- **Step 0 motivation** uses the same sentence from all previous stops but pushes
  the understanding beyond what any single layer could produce. The "maintenance
  failure" interpretation requires integrating coreference, causality, and temporal
  reasoning — motivating why depth matters.

- **Step 1 (FFN introduction)** is deliberately placed here, not earlier, because
  the user needed multi-head attention (Stop 8) to understand the full layer
  structure. Introducing FFN earlier would have been premature — the user wouldn't
  have known what it was "after." Now the flow is: attention (we know this) → FFN
  (new, let's understand it) → together they form a layer.

- **Step 2 (layer-by-layer evolution)** is the centerpiece. The progressive
  enrichment of "faulty" is the payoff for the entire Act 1 arc — the user watches
  a word's representation transform from a simple adjective into a carrier of
  complex, integrated meaning. The honesty disclosure about interpretive
  approximation is essential — same principle as Stop 1's hidden state bar chart.

- **Step 3 (FFN contribution)** prevents the misconception that attention does
  everything. The "63% of parameters" fact is striking and will matter in Act 2
  when discussing model weight memory. The key fact for the KV cache story:
  FFN has no cache. This cleanly delineates what creates memory pressure (attention)
  from what doesn't (FFN).

- **Step 4 (full stack)** closes the cache arithmetic loop that's been building
  across Stops 8 and 9. The user can now trace the full derivation:
  d_head (128) × KV groups (8) × 2 (K+V) × 2 bytes × 80 layers = 327,680 bytes
  = 320 KB per token. Every number in that chain has been motivated and explained.

- **Step 5 (complete transformer diagram)** is the definitive reference visual.
  It should be clean enough to screenshot and save. The KV cache is prominently
  shown as a column growing alongside the layer stack — making the infrastructure
  problem visually tangible.

- **The FFN dimensions** (14,336 for 8B, 28,672 for 70B) are mentioned once in
  Step 1 but not belabored. The key insight is that FFN is large and stores
  knowledge, not the specific arithmetic. The dimensions become relevant in Act 2
  when discussing model weight memory budgets.

- **Layer normalization** is introduced minimally. The user needs to know it exists
  (so the architecture diagram is complete), why it's needed (stability across
  deep stacks), and what variant Llama uses (RMSNorm). The mathematics of
  normalization are not needed for the KV cache story and would slow the flow.

- **"No shortcut to reduce layers"** in Step 4 is deliberately stated. GQA
  reduces the head dimension of the cache. Quantization reduces precision.
  But nothing reduces the layer count — it's the one dimension of the KV cache
  that's architecturally fixed. This sets up Act 2's memory hierarchy discussion
  (the cache can't be made smaller on this axis; it must be managed).

---

## Terminology Bank Additions (Stops 8 and 9)

| # | Term | Definition | First appears |
|---|------|-----------|---------------|
| 16l | Model dimension (d_model) | The fixed number of dimensions in every token's embedding; an architectural constant (e.g., 4,096 for Llama-3 8B, 8,192 for 70B, 16,384 for 405B) | Stop 3, Step 2 (seeded); Stop 8, Step 1 (fully explained) |
| 22 | Multi-head attention (MHA) | Running multiple independent attention computations in parallel, each with its own W_Q, W_K, W_V, each operating on a d_head-sized slice of the embedding | Stop 8, Step 2 |
| 22b | Head dimension (d_head) | The number of dimensions each attention head operates on; d_head = d_model ÷ n_heads. Fixed at 128 for all Llama-3 models | Stop 8, Step 1 |
| 22c | Output projection (W_O) | Weight matrix that combines concatenated head outputs into a single vector; learns how to integrate multiple heads' perspectives | Stop 8, Step 3 |
| 22d | Emergent specialization | Different attention heads learning different roles (syntax, coreference, position, semantics) without being explicitly programmed — specialization emerges from training | Stop 8, Step 2 |
| 23 | MQA (Multi-Query Attention) | All heads share one K, V — smallest cache, some quality loss. Introduced by Shazeer (2019) | Stop 8, Step 5 |
| 23b | GQA (Grouped-Query Attention) | Heads organized into groups sharing K, V — middle ground between MHA and MQA. Used by Llama-3 (8 KV groups across all sizes) | Stop 8, Step 5 |
| 23c | MLA (Multi-Head Latent Attention) | DeepSeek's approach: compress K, V into a smaller latent vector, reconstruct on demand. Trades compute for memory | Stop 8, Step 5 |
| 24 | Layer | One complete transformer block: RMSNorm → multi-head attention → residual → RMSNorm → FFN → residual | Stop 9, Step 1 |
| 25 | Feed-forward network (FFN) | Two weight matrices per layer processing each token independently after attention; stores factual knowledge; uses SwiGLU activation in Llama. Contains ~63% of model parameters | Stop 9, Step 1 |
| 25b | Layer normalization (RMSNorm) | Normalization applied before each sub-block to stabilize values across dimensions; prevents numerical drift across deep layer stacks | Stop 9, Step 1 |

## Upstream Modifications (to be applied to existing stops)

### Stop 3, Step 2 — Seed d_model

Add after the shape description ("a vector of N numbers × a grid of N×M
numbers = a vector of M numbers"):

> That **N** — the number of numbers in the embedding — is a fixed
> architectural choice called the **model dimension (d_model)**. It's the
> same for every token in every layer of a given model — typically somewhere
> between 4,096 and 16,384 for modern large language models. A larger d_model
> means richer representations but more computation. We'll see specific values
> and how d_model shapes the rest of the architecture in Stop 8.

### Stop 5, Step 2 — Add forward reference

Change:
> Real Q and K vectors have 128 dimensions — far too many to visualize as arrows.

To:
> Real Q and K vectors have 128 dimensions (we'll see where this number comes
> from in Stop 8) — far too many to visualize as arrows.

### Stop 7, Step 6 (Bridge to Stop 8) — Correct head/KV language

The existing bridge text says "A model with 64 heads stores 64 K vectors and
64 V vectors per token, per layer." This is true for MHA but Llama-3 uses GQA.
At this point in the curriculum, GQA hasn't been introduced yet, so the bridge
should not say "64 K vectors" without qualification.

Change to:
> Multi-head attention is where the model gets its depth of understanding.
> It's also where the KV cache gets its size: in the original design, each
> head stores its own K and V vectors for every token. Multiply across many
> heads and many layers, and the cache grows to tens of gigabytes. Modern
> models have found ways to share K and V across heads to reduce this —
> we'll see exactly how in Stop 8.
>
> Stop 8 shows how multiple heads work together, why they specialize, and
> what this means for the KV cache.
