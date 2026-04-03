### STOP 10: And Now, The Cache — The Bridge
**Question answered:** Why do we cache K and V? What does it cost?
**Core concept:** During generation, K and V from all previous tokens are needed at
every step. Caching them avoids recomputation but creates a massive memory footprint.
The two phases of inference — prefill and decode — have fundamentally different
computational profiles, and the KV cache is what connects them.

This stop is the PIVOT from Act 1 to Act 2. It synthesizes everything from the
previous 9 stops into the central problem statement for the rest of the course.

**Animation type:** Step-by-step autoregressive generation with cache growth +
prefill/decode phase comparison + interactive memory calculator.

#### Key concepts to introduce
- **Autoregressive generation** — generating tokens one at a time, each conditioned
  on all tokens that came before it; the model can't generate token N+1 until it
  knows what token N is
- **Output projection (LM head)** — a weight matrix (d_model × vocab_size) that
  converts the final layer's representation into a score for every token in the
  vocabulary
- **Logits** — the raw scores produced by the output projection, one per vocabulary
  entry; fed into softmax to produce a probability distribution
- **Sampling** — selecting the next token from the probability distribution;
  controlled by the temperature parameter from Stop 6
- **Causal masking** — restricting each token to attend only to tokens at its
  position or earlier; the term "causal" comes from signal processing (meaning
  "time-ordered"), not from cause-and-effect
- **Prefill** — the first phase of inference: processing all prompt tokens through
  every layer in parallel, populating the KV cache for the entire prompt in one burst.
  Compute-bound (massive parallel matrix multiplications)
- **Decode** — the second phase: generating response tokens one at a time, each
  attending to the full cache and appending its own K, V. Memory-bound (reading
  the growing cache at every layer, every step)
- **Incremental prefill** — on follow-up messages in a conversation, only new tokens
  need prefill; cached K, V from earlier exchanges are already stored
- **KV cache (complete picture)** — the stored Key and Value vectors for all
  processed tokens, across all layers and all KV head groups, growing with each
  new token
- **Cache size formula** — 2 (K+V) × layers × KV_heads × d_head × seq_len × precision
- **The memory wall** — when KV cache + model weights exceed available GPU HBM
- **HBM (High Bandwidth Memory)** — the GPU's main memory pool (80 GB for H100,
  192 GB for B200), shared between model weights and KV cache
- **Compute-bound vs. memory-bound** — two bottleneck regimes:
  compute-bound = limited by arithmetic throughput (prefill);
  memory-bound = limited by memory bandwidth for reading data (decode)

#### Flow (8 steps)

##### Step 0 — "Everything we've built, in one question"

Narration:
> Over nine stops, we've built the transformer from the ground up:
>
> - Embeddings give tokens a numerical identity (Stops 1, 3)
> - Q, K, V enable matching and information retrieval (Stops 3, 5, 6, 7)
> - Multi-head attention provides parallel perspectives (Stop 8)
> - FFN adds non-linear processing and stores learned knowledge (Stop 9)
> - Layers stack for progressive refinement (Stop 9)
> - Residual connections preserve information across depth (Stop 7)
>
> At every step, one structure has been growing in the background: the
> **KV cache**. We first met it in Stop 3 when we learned that K and V
> are persistent while Q is ephemeral. We calculated its per-token size
> in Stop 8. We saw it multiply across layers in Stop 9.
>
> Now it's time to put the full picture together: How does inference
> actually work, step by step? Why is the cache necessary? And what
> happens when it outgrows the GPU's memory?

##### Step 1 — "Two phases of inference"

This step must be concrete and mechanical — the user should be able to trace
every operation.

Narration:
> When you send a message to a model like Claude or Llama, inference
> happens in two distinct phases. Understanding these phases is essential
> because they have completely different computational profiles — and the
> KV cache is what connects them.
>
> **Phase 1: Prefill — processing the prompt**
>
> Your message arrives as part of a larger context: system instructions +
> any conversation history + your new message. Let's say this totals 2,000
> tokens. At this point, no KV cache exists — the conversation is just
> starting.
>
> All 2,000 tokens enter the model simultaneously. Here's what happens at
> each layer:
>
> 1. All 2,000 tokens are transformed through W_Q, W_K, W_V — producing
>    2,000 Q vectors, 2,000 K vectors, and 2,000 V vectors.
>
> 2. All 2,000 K and V vectors are stored in that layer's KV cache.
>
> 3. Each token's Q is compared against the K vectors of all tokens at
>    its position or earlier. Token 1 can only see itself. Token 500 can
>    see tokens 1 through 500. Token 2,000 can see all 2,000 (including
>    itself — a token always attends to its own K, which ensures its
>    identity contributes to the attention output alongside context from
>    other tokens).
>
>    This restriction is called **causal masking**. The term "causal"
>    comes from signal processing, where a "causal system" is one that
>    depends only on past and present inputs, never future ones. It does
>    not refer to cause and effect — it refers to **time-ordering**. The
>    mask enforces what would be true during real generation: when the
>    model is producing token N, tokens N+1, N+2, ... don't exist yet.
>    During prefill, those future tokens *are* present (the user already
>    typed them), but the mask is still applied so the model produces the
>    same result it would during step-by-step generation.
>
> 4. Attention weights are computed via softmax, Values are blended using
>    those weights, and the FFN processes each token. The 2,000 enriched
>    representations flow into the next layer.
>
> This repeats through all 80 layers (for Llama-3 70B). After the final
> layer, the KV cache contains K and V vectors for all 2,000 tokens at
> all 80 layers — that's 2,000 × 80 × 8 KV groups × 128 d_head × 2 bytes
> × 2 (K+V) = **655 MB** of cache, computed in one parallel burst.
>
> **Why can all tokens be processed in parallel?** Because all 2,000
> tokens are *known* — the user already typed them. The model doesn't
> need to wait for one token's output to know what the next token is.
> It processes the entire prompt as a single batch of matrix
> multiplications — the kind of operation GPUs are built for. Prefill is
> **compute-bound**: the bottleneck is arithmetic throughput (how fast the
> GPU can multiply matrices), not memory bandwidth.
>
> **How the first response token is selected**
>
> After prefill completes, the model needs to produce the first token of
> its response. Here's how.
>
> The final layer produces a d_model-sized vector (8,192 numbers for
> Llama-3 70B) for every token position. But only the **last position**
> matters for generation — because, thanks to causal masking, the last
> position is the only one that has attended to the entire prompt. Its
> representation encodes everything the model has seen.
>
> That last-position vector passes through two final operations:
>
> 1. **Output projection** — a weight matrix of size d_model × vocab_size
>    (8,192 × 128,256 for Llama-3) multiplies the vector, producing a
>    score for every token in the model's vocabulary. These scores are
>    called **logits** — raw, unnormalized numbers, one per vocabulary
>    entry. A high logit means the model considers that vocabulary entry
>    a likely next token. A low logit means unlikely.
>
> 2. **Softmax** — the same function from Stop 6, applied here to
>    128,256 logits instead of attention scores. It converts them into
>    a probability distribution — 128,256 probabilities summing to 1.
>    The model now has a probability for every possible next token:
>    "The" might be 0.12, "A" might be 0.08, "banana" might be 0.000001.
>
> 3. **Sampling** — a token is selected from this distribution. The
>    **temperature** parameter (from Stop 6) controls how: low temperature
>    favors the highest-probability token, high temperature allows more
>    variety, temperature 0 always picks the top token (called "greedy
>    decoding").
>
> The selected token is the first token of the response.
>
> The vocabulary is the fixed set of all tokens the model knows — 128,256
> for Llama-3. It is established before training and never changes. Every
> possible output is a selection from this vocabulary. The model cannot
> produce a token that isn't in its vocabulary — this is why rare words get
> split into sub-word tokens, as we discussed in Stop 3.
>
> **Phase 2: Decode — generating the response**
>
> Now the model generates the rest of the response, one token at a time.
> This is **autoregressive generation** — each new token depends on the
> prediction from the previous step:
>
> 1. The selected first response token is embedded (looked up in the
>    embedding table, producing a d_model-sized vector — the same process
>    that prompt tokens went through) and fed into Layer 1.
>
> 2. This single new token computes its Q, K, V through the weight
>    matrices. Its K and V are **appended** to the existing cache (which
>    already has 2,000 entries at this layer). Its Q is compared against
>    all 2,001 cached K vectors — including its own, since its K was
>    just appended.
>
> 3. The enriched representation passes through the FFN, then into Layer 2.
>    The same process repeats at every layer: compute Q, K, V; append K, V
>    to that layer's cache; attend to all cached K vectors; blend Values;
>    FFN; pass to the next layer.
>
> 4. The token must pass through **all 80 layers** before the next token
>    can begin. There is no way to pipeline this — Layer 1 cannot start
>    on the next token while Layer 2 works on the current one — because
>    the next token's identity is determined by the output of Layer 80.
>    It doesn't exist yet.
>
> 5. After Layer 80, the last-position vector passes through the same
>    output projection → softmax → sampling sequence. The selected token
>    becomes the next token to generate. It is embedded and fed back into
>    Layer 1, and the cycle repeats.
>
> Each decode step produces one token. To generate a 500-token response,
> the full 80-layer stack runs 500 times — sequentially, one token after
> the other. After those 500 steps, the cache has grown from 2,000 to
> 2,500 tokens' worth of K, V at every layer.
>
> **Why can't decode be parallel?** Because each new token's identity
> depends on the prediction at the previous step. The model can't process
> token 2,002 until it knows what token 2,001 *is*. The model is writing
> the response as it goes — it can't look ahead because the future
> doesn't exist yet. This inherent sequentiality is why generating long
> responses takes time, even on powerful hardware.
>
> Decode is **memory-bound**: each step involves only one new token's
> worth of matrix multiplications (fast), but it must *read the entire
> KV cache* at every layer to compute attention (slow). As the cache
> grows, each decode step gets slower because there's more data to read
> from HBM. The GPU's arithmetic units are mostly idle, waiting for
> cache data to arrive from memory.

Visual: Two-panel animation.

**Panel A — Prefill:** 2,000 tokens shown as a block entering the layer
stack simultaneously. At each layer, the block passes through the attention
mechanism (arrows to KV cache: "write 2,000 K, V") and the FFN, then
flows to the next layer. KV cache fills in a burst — one layer's cache
block lights up, then the next, cascading through all 80 layers. After
the final layer, the last-position vector flows through the output
projection (labeled "d_model → vocab_size") → softmax → a single token
emerges (labeled "first response token"). A "compute utilization" meter
shows the GPU near 100% — all cores busy.

**Panel B — Decode:** The first response token enters Layer 1 alone. At
each layer, it reads the full cache (arrows fanning to all cached entries
labeled "read all K") and appends one entry (arrow to cache labeled
"write 1 K, V"). The token must complete all 80 layers before the cycle
can repeat (a "waiting..." indicator on Layer 1 while Layer 80 processes).
After Layer 80: output projection → softmax → next token selected → embed
→ back to Layer 1. A "memory bandwidth" meter shows the bottleneck — cache
reads dominate. The compute meter drops to a fraction of prefill's
utilization.

Counter: "Cache size: 2,000 tokens → 2,001 → 2,002 → ..." growing with
each decode step.

Terms defined: **autoregressive generation**, **prefill**, **decode**,
**causal masking**, **output projection (LM head)**, **logits**, **sampling**

Terms reinforced: **softmax** (callback to Stop 6), **temperature**
(callback to Stop 6), **compute-bound**, **memory-bound**

##### Step 2 — "What happens on your second message"

This extends the prefill/decode story to multi-turn conversations.

Narration:
> Now you read the model's response and send a second message. What
> happens to the KV cache?
>
> The context is now: system prompt + your first message + the model's
> response + your new second message. But the KV cache already contains
> K, V for everything through the model's response — those were computed
> during the first prefill and the subsequent decode steps.
>
> Only your **new tokens** (the second message) need to go through
> prefill. This is sometimes called **incremental prefill**. The new
> tokens are processed through all 80 layers in parallel, and at each
> layer, their K and V are appended to the existing cache. When their
> Q vectors compute attention, they attend to the **entire cache** —
> all the K vectors from the first exchange plus their own.
>
> Nothing from the first exchange is recomputed. The cached K and V
> vectors from the system prompt, your first message, and the model's
> first response are all still there, still valid. The new tokens simply
> add to them.
>
> To be precise about what the cache stores and what it doesn't: the
> KV cache stores **pre-computed K and V vectors** — the results of
> multiplying each token's embedding by W_K and W_V at each layer. It
> does not store the tokens themselves, nor their embeddings, nor their
> Q vectors. When a new token attends to the cache, it reads K vectors
> (to compute attention scores) and V vectors (to blend information).
> It does not "re-process" earlier tokens. Those tokens' contributions
> are fully captured in their cached K and V.
>
> This is exactly why the KV cache exists: **to avoid recomputation**.
> Without it, every time the model generates a new token, it would need
> to run all previous tokens through W_K and W_V again at every layer —
> just to reconstruct the K and V vectors it already computed. With
> 2,500 tokens in the conversation and 80 layers, that's 200,000 matrix
> multiplications that the cache eliminates.
>
> **But the cache must persist.** It must stay in GPU memory for the
> duration of the conversation. It can't be discarded after each turn
> because the next turn needs it. And it grows with every token —
> your messages, the model's responses, all accumulating.

Visual: Conversation timeline. Four phases shown:
1. First prefill: system prompt + first message → cache fills (green block)
2. First decode: response generated → cache extends (blue block appended)
3. Second prefill: new message only → cache extends (green block appended)
4. Second decode: second response → cache extends further (blue block)

The cache bar grows continuously. Old sections (green, blue) stay in place.
New sections are appended. A "recompute?" label on the old sections with a
red X — "No. Already cached."

A separate callout: "What the cache stores: K and V vectors (the results of
W_K × embedding and W_V × embedding). What it does NOT store: tokens,
embeddings, Q vectors."

Term reinforced: **KV cache**, defined: **incremental prefill**

##### Step 3 — "The cost of caching: compute saved vs. memory spent"

The tradeoff at the heart of the entire course.

Narration:
> The KV cache is a classic **space-time tradeoff**: spend memory to
> save computation.
>
> **Without the cache**, every decode step would require recomputing K
> and V for all previous tokens. At step N, that's N-1 tokens × 2 (K+V)
> × 80 layers of matrix multiplications — just to reconstruct what was
> already computed in previous steps. Total computation across an entire
> generation of T tokens: proportional to **T²** (the sum 1 + 2 + 3 + ...
> + T-1 = T(T-1)/2). Remember quadratic scaling from Stop 2? This is the
> same phenomenon — but now applied to compute cost, not attention scores.
>
> **With the cache**, each decode step computes only the new token's K
> and V (2 matrix multiplications per layer) and reads the existing cache.
> Total computation across T tokens: proportional to **T** — linear, not
> quadratic.
>
> Let's put real numbers on this.
>
> For Llama-3 70B generating the 10,000th token:
>
> | | Without cache | With cache |
> |---|---|---|
> | K, V matrix multiplications | 9,999 × 2 × 80 = 1.6 million | 1 × 2 × 80 = 160 |
> | What's read from memory | Nothing (all recomputed) | 9,999 entries per layer × 80 layers |
> | Bottleneck | Compute (massive redundant arithmetic) | Memory bandwidth (reading the cache) |
>
> The cache turns O(T²) compute into O(T) compute — at the cost of O(T)
> memory. For a 128K context, that's the difference between feasible and
> impossible. But that O(T) memory is not free...

##### Step 4 — "The full cache calculation"

Synthesize all the numbers from Stops 8 and 9 into the complete formula.

Narration:
> We've calculated KV cache size piece by piece across Stops 8 and 9.
> Now let's assemble the complete formula and see the full picture.
>
> **KV cache size = 2 × layers × KV_heads × d_head × seq_len × precision**
>
> Where:
> - 2 = K + V (both cached)
> - layers = number of transformer layers
> - KV_heads = number of KV head groups (GQA)
> - d_head = head dimension (128 for all Llama-3)
> - seq_len = total tokens processed so far (prompt + generated)
> - precision = bytes per number (2 for FP16, 1 for FP8)
>
> Plugging in Llama-3 70B:
> 2 × 80 × 8 × 128 × seq_len × 2 bytes = **327,680 × seq_len bytes**
>
> The coefficient — 327,680 bytes, or about **320 KB** — is the amount
> of cache added for each additional token. Multiply by the number of
> tokens to get the total cache size:
>
> - At seq_len = 1 token: 327,680 × 1 = 320 KB
> - At seq_len = 1,000 tokens: 327,680 × 1,000 = 320 MB
> - At seq_len = 128,000 tokens: 327,680 × 128,000 = 40 GB
>
> This is the same per-token number from Stop 8 — now you can see every
> factor in the formula and trace where each one comes from.

Full table (updates the Stop 8 table with additional context):

| Context | Llama-3 8B cache | Llama-3 70B cache | What this looks like |
|---------|-----------------|-------------------|---------------------|
| 1K tokens | 128 MB | 320 MB | A short prompt + brief answer |
| 8K tokens | 1.0 GB | 2.5 GB | A typical multi-turn conversation |
| 32K tokens | 4.0 GB | 10.0 GB | A long conversation or document analysis |
| 128K tokens | 16.0 GB | 40.0 GB | Full context window utilized |

> **These are per-user numbers.** Every concurrent conversation needs its
> own KV cache — the cached vectors are specific to that conversation's
> tokens. Ten concurrent users at 32K tokens each = 10 × 10 GB = 100 GB
> of KV cache for the 70B model alone.

Visual: Interactive calculator.
Controls:
- Model: Llama-3 8B / 70B / 405B (auto-populates layers, KV heads, d_head)
- Context length: slider from 1K to 128K
- Concurrent users: 1 / 2 / 4 / 8 / 16 / 32
- Precision: FP16 / FP8

Output:
- KV cache per user (with formula shown: "320 KB × seq_len = ...")
- Total KV cache (all users)
- GPU memory bar: model weights (fixed block) + total KV cache (growing)
  + remaining
- Red zone when cache exceeds available HBM

The calculator should show specific GPU configurations:
- 1× H100 (80 GB)
- 2× H100 (160 GB)
- 1× B200 (192 GB)
- 8× H100 (640 GB, typical multi-GPU deployment)

##### Step 5 — "The memory wall"

Narration:
> Let's watch what happens as you try to serve more users.
>
> **Scenario: Llama-3 70B on a single H100 (80 GB HBM), FP4 quantized
> weights (~35 GB)**
>
> Available for KV cache: 80 - 35 = **45 GB**
>
> | Concurrent users | Context per user | Total KV cache | Fits? |
> |-----------------|-----------------|----------------|-------|
> | 1 | 128K | 40 GB | Yes (barely) |
> | 1 | 140K | 44.8 GB | Barely |
> | 2 | 64K | 40 GB | Yes |
> | 2 | 128K | 80 GB | No — 35 GB over |
> | 8 | 8K | 20 GB | Yes |
> | 8 | 32K | 80 GB | No — 35 GB over |
> | 32 | 8K | 80 GB | No — 35 GB over |
>
> At full context, **one user nearly fills the GPU.** At typical
> conversation lengths (8K to 32K), you can serve a handful of users
> before hitting the limit. At the scale of a production service
> handling thousands of concurrent conversations, the math is
> devastating.
>
> This is the **memory wall** — the point where KV cache demand exceeds
> available GPU **HBM (High Bandwidth Memory)**. HBM is the GPU's main
> memory pool, and it's shared between two tenants that both need to be
> there: model weights and KV cache.
>
> The memory wall isn't a future problem. It's the central operational
> challenge of running LLM inference today. Every production inference
> system — whether run by Anthropic, OpenAI, Google, or any cloud
> provider — is fundamentally a system for managing KV cache memory.

Visual: The GPU memory bar from the calculator, now animated to tell a story.
Start with one user at short context — comfortable. Extend context — cache
grows. Add a second user — cache doubles. Add more users — the bar fills.
The red line approaches. When exceeded, show the consequence options:

- "Evict oldest conversation" (one user's cache disappears)
- "Reduce context window" (conversation history truncated)
- "Spill to slower memory" (cache migrates, latency increases)
- "Add more GPUs" (cost increases)

These consequence options directly preview Act 2 topics.

Terms defined: **memory wall**, **HBM (High Bandwidth Memory)**

##### Step 6 — "Prefill vs. decode: two different problems"

Extend the Phase 1/Phase 2 distinction from Step 1 into its infrastructure
implications.

Narration:
> The memory wall is one problem. But prefill and decode create *different*
> problems — and understanding this distinction is key to understanding
> modern inference infrastructure.
>
> **Prefill** processes hundreds or thousands of tokens in parallel. The
> GPU's arithmetic units are fully saturated — every core is busy with
> matrix multiplications. The bottleneck is **compute throughput**: how
> fast the GPU can multiply. Memory bandwidth matters less because the
> data being processed (the prompt tokens) is compact relative to the
> computation performed on it.
>
> **Decode** processes one token per step. The arithmetic per step is
> small — one token's Q, K, V computation plus one row of attention. But
> each step must **read the entire KV cache** at every layer to compute
> that attention. For Llama-3 70B at 32K tokens: 10 GB of cache read at
> every decode step, just to produce one token. The GPU's arithmetic units
> are mostly idle, waiting for data to arrive from memory. The bottleneck
> is **memory bandwidth**: how fast data can flow from HBM to the
> processing cores.
>
> | | Prefill | Decode |
> |---|---|---|
> | Tokens processed | Hundreds/thousands (prompt) | One (the new token) |
> | Bottleneck | Compute (matrix multiplication speed) | Memory (cache read bandwidth) |
> | GPU utilization | High (cores busy) | Low (cores waiting for data) |
> | Duration | Fast burst (one pass) | Slow drip (many sequential steps) |
> | KV cache role | Created (bulk write) | Read + extended (read all, write one) |
>
> These are fundamentally different workloads with different hardware
> demands. A GPU optimized for prefill (high compute throughput) isn't
> optimal for decode (high memory bandwidth), and vice versa.
>
> This mismatch has led to one of the most important architectural
> innovations in modern inference systems: **disaggregated inference** —
> separating prefill and decode onto different hardware, each optimized
> for its phase. The catch? After prefill completes on GPU Pool A, the
> KV cache — potentially tens of gigabytes — must be **transferred** to
> GPU Pool B where decode will run. The speed of that transfer is a
> networking problem.
>
> And that is how the KV cache became a networking story.

Visual: Split-screen showing prefill and decode running on different GPU
pools, connected by a network pipe. The KV cache (large data block)
transfers from prefill pool to decode pool. Bandwidth and latency numbers
annotated on the pipe.

Terms reinforced: **prefill**, **decode**, **compute-bound**, **memory-bound**
New concept previewed: **disaggregated inference**

##### Step 7 — Bridge to Act 2

Narration:
> Let's take stock of where we are.
>
> Over ten stops, we've built the complete picture:
>
> 1. Sequential models (RNNs) lose information over distance (Stop 1)
> 2. Attention lets every token see every other token directly (Stop 2)
> 3. Q, K, V separate the roles of searching, being found, and carrying
>    information — and K, V must be stored (Stop 3)
> 4. Weight matrices learn meaningful attention patterns through training
>    (Stop 4)
> 5. Dot products measure the alignment that training created (Stop 5)
> 6. Scaling and softmax convert raw scores to proper weights (Stop 6)
> 7. The weighted sum blends Values into context-enriched representations
>    (Stop 7)
> 8. Multiple heads provide parallel perspectives — and each stores its
>    own K, V (Stop 8)
> 9. Stacking layers enables progressive refinement — and each layer has
>    its own cache (Stop 9)
> 10. The resulting KV cache makes inference possible — and creates the
>     central infrastructure challenge of serving LLMs (this stop)
>
> **The KV cache is what makes modern LLMs possible.** Without it,
> inference would be impossibly slow — O(T²) compute for every
> conversation. With it, inference is fast — O(T) compute. But fast
> isn't free. The cache that enables speed creates a memory footprint
> that grows with every token, every user, every conversation.
>
> At production scale — thousands of concurrent users, long contexts,
> multiple models — KV cache management IS the inference problem. Every
> other optimization (model quantization, speculative decoding, request
> batching) operates within the constraints that the KV cache imposes.
>
> The rest of this course explores how the industry is responding:
>
> **Stop 11: The Memory Wall** — an interactive calculator that lets
> you explore exactly when and why GPU memory runs out, with real model
> and hardware configurations.
>
> **Stop 12: Disaggregated Inference** — separating prefill and decode
> onto different hardware. The KV cache must transfer between GPU pools.
> NVIDIA Dynamo, NIXL. Network bandwidth and latency tradeoffs.
>
> **Stop 13: The Memory Hierarchy** — tiering the cache across HBM →
> DRAM → NVMe → CXL-attached memory → persistent storage. Each tier
> trades latency for capacity.
>
> **Stop 14: Compressing the Cache** — MQA, GQA, MLA in depth.
> Quantization (FP16 → FP8 → INT4). Token eviction strategies. The
> accuracy/compression tradeoff.
>
> **Stop 15: The Fabric** — RDMA/RoCE, CXL memory pooling, NVMe-oF.
> The data paths and protocols that move KV cache data between tiers
> and between machines.
>
> **Stop 16: Intelligent Routing** — KV-cache-aware load balancing.
> Prefix-aware scheduling. How the network participates in cache
> placement decisions.
>
> **Stop 17: The Crystal Ball** — 1/2/5 year projections for KV cache
> infrastructure.
>
> **Welcome to the world of KV cache infrastructure.**

Visual: The complete Act 1 summary as a clean diagram — the transformer
architecture from Stop 9's Step 5, but now with the KV cache highlighted
as the central structure, with arrows radiating outward to the Act 2 topics:
memory hierarchy, compression, fabric, routing. Each arrow labeled with its
Stop number and a one-line description.

This is the last visual of Act 1. It should feel like a map of the territory
ahead — the user can see all the destinations and understands why each one
matters.

#### Design notes

- **Step 1 is the longest and most important step** in the entire curriculum.
  It carries the prefill/decode distinction, the token selection mechanism, the
  causal masking explanation, and the layer sequentiality constraint. These all
  belong together because they form one continuous mechanical sequence — breaking
  them into separate steps would fracture the user's understanding of how one
  complete inference cycle works. The user should be able to trace the full path:
  prompt enters → prefill processes all tokens in parallel through all layers →
  output projection converts to logits → softmax converts to probabilities →
  sampling selects a token → that token enters Layer 1 → completes all 80
  layers → output projection → softmax → sampling → repeat.

- **Token selection mechanism** (output projection → logits → softmax → sampling)
  closes two loops: softmax from Stop 6 reappears in its most user-visible role
  (choosing the next word), and temperature from Stop 6 reappears as the
  parameter users adjust in API calls. Same math, different application.

- **Causal masking** clarification addresses a real pedagogical trap. "Causal"
  in everyday English means "relating to cause and effect." In signal processing
  it means "time-ordered." Without this clarification, the user would search for
  a cause-and-effect relationship that doesn't exist and feel confused. The
  one-sentence etymology ("from signal processing") resolves this cleanly.

- **Self-attention to own K** is explicitly stated because the natural question
  "does a token attend to itself?" deserves a direct answer. Yes. This is how
  the token's own identity participates in the attention output. The parenthetical
  keeps it brief.

- **Layer sequentiality** is explicitly stated in Step 1's decode section because
  the natural question "can layers pipeline?" deserves a direct answer. No.
  Token N+1 doesn't exist until Layer 80 finishes Token N. This constraint is
  what makes decode inherently sequential and explains why long responses take
  time.

- **Step 2 (second message)** explicitly addresses what the KV cache stores and
  what it does NOT store. This prevents the misconception that tokens "come from"
  the cache. Tokens come from text. K and V vectors come from processing tokens
  through weight matrices. The cache stores those vectors so they don't need to
  be recomputed. This distinction is fundamental and the callout visual reinforces
  it.

- **Step 4 (formula)** now explicitly shows the coefficient interpretation: 327,680
  bytes is the per-token rate, and multiplying by seq_len gives the total. Three
  worked examples (1 token, 1,000 tokens, 128,000 tokens) make the scaling
  concrete and prevent the confusion about whether seq_len is always 1.

- **Step 6 thesis statement** — "And that is how the KV cache became a networking
  story" — is the single most important sentence in the curriculum. Everything
  before it builds understanding of WHY the cache exists. Everything after it
  explores the infrastructure consequences. It should land with weight and
  without rushing.

- **Batching is deliberately omitted** from Stop 10. The single-user mental model
  must be solid before introducing multi-user batching optimizations. Batching
  belongs in Act 2 (Stop 11 or 12) where the user is ready to think about
  multi-user serving. The concurrent-user slider in the calculator hints at the
  multi-user dimension without explaining the batching mechanism.

---

## Terminology Bank Additions (Stop 10)

| # | Term | Definition | First appears |
|---|------|-----------|---------------|
| 26 | KV cache (complete) | The stored Key and Value vectors for all processed tokens, across all layers and KV head groups; grows with each new token; persists for the duration of a conversation; per-user, per-session | Stop 3 (introduced); Stop 10 (complete picture) |
| 26b | Output projection (LM head) | A weight matrix (d_model × vocab_size) that converts the final layer's representation into a logit for every token in the vocabulary | Stop 10, Step 1 |
| 26c | Logits | Raw, unnormalized scores produced by the output projection, one per vocabulary entry; fed into softmax to produce a probability distribution for the next token | Stop 10, Step 1 |
| 26d | Sampling | Selecting the next token from the softmax probability distribution; controlled by temperature (low = focused, high = exploratory, 0 = always pick the top token / greedy decoding) | Stop 10, Step 1 |
| 27 | Autoregressive generation | Generating tokens one at a time, each conditioned on all previous tokens; the model can't produce token N+1 until token N completes all layers and is sampled | Stop 10, Step 1 |
| 27b | Causal masking | Restricting each token to attend only to tokens at its position or earlier; the term "causal" comes from signal processing (meaning "time-ordered"), not cause-and-effect; applied during both prefill and decode | Stop 10, Step 1 |
| 28 | Prefill | First phase of inference: processing all prompt tokens through every layer in parallel, populating the KV cache; compute-bound | Stop 9 (previewed); Stop 10, Step 1 (fully explained) |
| 28b | Decode | Second phase of inference: generating response tokens one at a time, each reading the full cache and appending its own K, V; memory-bound; inherently sequential (each token must complete all layers before the next can begin) | Stop 9 (previewed); Stop 10, Step 1 (fully explained) |
| 28c | Incremental prefill | On follow-up messages, only new tokens need prefill; cached K, V from earlier exchanges are already stored and do not need recomputation | Stop 10, Step 2 |
| 29 | HBM (High Bandwidth Memory) | The GPU's main memory pool (80 GB for H100, 192 GB for B200); shared between model weights and KV cache | Stop 10, Step 5 |
| 30 | Memory wall | The point where KV cache + model weights exceed available GPU HBM; the central operational challenge of LLM inference | Stop 10, Step 5 |
| 30b | Compute-bound | Bottleneck regime where arithmetic throughput limits performance; characteristic of prefill (GPU cores fully busy) | Stop 10, Step 6 |
| 30c | Memory-bound | Bottleneck regime where memory bandwidth (speed of reading data from HBM) limits performance; characteristic of decode (GPU cores mostly idle, waiting for cache data) | Stop 10, Step 6 |
| 30d | Disaggregated inference | Separating prefill and decode onto different hardware pools, each optimized for its phase; requires transferring the KV cache between pools via the network | Stop 10, Step 6 (previewed); Stop 12 (fully explained) |
