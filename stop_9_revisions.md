# Stop 9 — Corrections and Revisions

Based on feedback review. These replace the corresponding sections in the
full Stop 9 draft.

---

## 1. Token/word transition — new opening for Step 1

Insert at the beginning of Step 1, before "Each transformer layer has two
major components":

> **A terminology shift.** Since Stop 3, we've been saying "words" for
> readability, while noting that transformers actually operate on **tokens**
> — sub-word pieces. Up to now, the distinction didn't affect the concepts.
> From here forward, it starts to matter: cache sizes are calculated per
> token, not per word, and a single word like "technician" may be two tokens
> ("tech" + "nician"), each with its own K, V vectors in the cache. So from
> this point on, we'll use **token** — the precise term — whenever we're
> talking about what the transformer processes and what the KV cache stores.

After this transition, ALL references in Stops 9 and 10 (and Act 2) use
"token" consistently. Stops 1–8 retain "word" as promised.

---

## 2. Step 1 — Restructured FFN introduction

Replace the entire FFN explanation in Step 1 with this version. The key
change: concept first, details deferred to Step 3.

> **Component 1: Multi-head attention** — everything we've built so far.
> Each token gathers information from other tokens at earlier positions
> in the sequence. After attention, each token's representation has been
> enriched by the tokens it attended to.
>
> **Component 2: Feed-forward network (FFN)** — the other half of each
> layer, applied to each token **independently** after the attention step.
>
> If attention is a meeting where everyone exchanges notes, the FFN is
> what happens when each person goes back to their desk and processes what
> they heard. Attention handles communication between tokens. The FFN
> handles reasoning within each token — transforming and digesting the
> information that attention gathered.
>
> The FFN consists of two weight matrices per layer — call them W₁ (the
> expansion matrix) and W₂ (the compression matrix). W₁ expands the token's
> representation into a larger internal workspace. A non-linear activation
> function (Llama uses **SwiGLU**) is applied. Then W₂ compresses the result
> back to d_model. Like all weight matrices we've seen — W_Q, W_K, W_V, W_O —
> these are learned during training and frozen during inference.
>
> We'll see the FFN's size and what it contributes to the model's knowledge
> in Step 3. For now, the key point: every transformer layer is a two-part
> rhythm — **gather** (attention), then **process** (FFN).
>
> Each component is wrapped in two architectural elements we've already met:
>
> - **Residual connection** (from Stop 7) — the output of each component
>   is added to its input, preserving the original signal
> - **Layer normalization** — applied before each component, this
>   stabilizes values across dimensions. Without it, numbers would
>   drift and potentially overflow across 80+ layers. Llama uses a
>   simplified variant called **RMSNorm** (Root Mean Square Normalization)

---

## 3. Step 1 — Revised block diagram spec

Replace the text-art diagram and its context with:

Visual: A single transformer layer shown as a clean block diagram. Every
arrow is annotated with what it carries:

```
Input (d_model-sized vector, one per token)
  │
  ├──────────────────────────────────┐
  ↓                                  │ (residual: original input)
[RMSNorm]                            │
  ↓                                  │
  d_model-sized vector               │
  ↓                                  │
[Multi-Head Attention]  ←→ KV Cache  │
  ↓                                  │
  d_model-sized vector               │
  ↓                                  │
  + ←────────────────────────────────┘ (add residual)
  │
  ├──────────────────────────────────┐
  ↓                                  │ (residual: attention output)
[RMSNorm]                            │
  ↓                                  │
  d_model-sized vector               │
  ↓                                  │
[FFN: W₁ → SwiGLU → W₂]            │
  ↓                                  │
  d_model-sized vector               │
  ↓                                  │
  + ←────────────────────────────────┘ (add residual)
  │
  ↓
Output (d_model-sized vector, one per token)
        → feeds into the next layer as input
```

Key annotations on the diagram:
- Every arrow between blocks carries a d_model-sized vector (8,192 numbers
  for Llama-3 70B), one per token being processed
- The KV cache connection to the attention block is bidirectional: K, V
  written in from the current token, K, V read out from all earlier tokens
- The residual paths are visually distinct (e.g., lighter color, dashed)
  to show they bypass the processing blocks
- W₁ and W₂ are labeled inside the FFN block so the user can see the
  two-matrix structure

---

## 4. Step 2 — Use "token" consistently

Replace all instances of "word" and "word's" in Step 2 with "token" and
"token's". Specifically:

Change: "watch what happens to a single word's representation"
To: "watch what happens to a single token's representation"

Change: "We'll track 'faulty' through six layers"
To: "We'll track the token 'faulty' through six layers"

The layer-by-layer narration ("Layer 1 output", "Layer 2 output", etc.)
should refer to the token "faulty" — e.g., "the token 'faulty' now carries..."
This is consistent with the transition made in Step 1.

---

## 5. Step 3 — FFN details now land here (moved from Step 1)

Replace the current Step 3 opening with an expanded version that carries
the size and parameter details originally in Step 1:

##### Step 3 — "What the FFN contributes"

Narration:
> Now that we've seen attention and FFN work together across layers, let's
> look more closely at the FFN — because it's larger and more important
> than it might seem.
>
> **Size.** For Llama-3 70B, the FFN's expansion matrix W₁ is
> d_model × d_ff = 8,192 × 28,672, and the compression matrix W₂ is
> d_ff × d_model = 28,672 × 8,192. Together, that's roughly 470 million
> parameters per layer — compared to roughly 268 million for all the
> attention matrices (W_Q, W_K, W_V, W_O) combined. **About 63% of the
> model's total parameters live in FFN layers.** The FFN isn't a minor
> appendage to attention — it's the larger component.
>
> **What it stores.** Research tells a striking story about what those
> parameters encode...

[continue with the existing "attention excels at / FFN excels at" content
and the factual knowledge discussion]

Then add, at the end of Step 3:

> **And critically for the KV cache story: the FFN creates no cache.**
> It processes each token independently using only its own frozen weight
> matrices — W₁ and W₂, the same two matrices for every token in every
> conversation. No per-conversation state. No per-token storage. The memory
> cost of the FFN is in the model weights themselves (contributing to the
> ~140 GB weight footprint), not in anything that grows during a conversation.
>
> The KV cache is purely an attention-side phenomenon. The FFN's weight
> matrices are loaded once and shared across all users and all conversations.

---

## 6. Step 5 — Revised "complete transformer" narration

Replace the passage beginning "Every token in the input passes through all
layers" with:

> The model processes tokens through this stack in two distinct phases:
>
> **Phase 1: Prefill (processing the prompt).** When you send a message
> to a model like Claude or Llama, the entire prompt — system instructions,
> conversation history, and your new message — is processed through all
> layers **in parallel**. Every prompt token passes through every layer
> simultaneously. This is where GPUs shine: thousands of tokens processed
> at once through massive parallel matrix multiplications. During prefill,
> the KV cache for every prompt token, at every layer, is computed and
> stored. If the prompt is 2,000 tokens and the model has 80 layers, that's
> 2,000 × 80 = 160,000 sets of K, V vectors computed and cached in one
> burst.
>
> **Phase 2: Decode (generating the response).** Now the model produces
> new tokens one at a time. Each new token passes through the full stack
> of layers. At each layer, multi-head attention computes Q for the new
> token and compares it against **all cached K vectors** from earlier
> tokens — finding what to attend to. It blends the corresponding cached
> V vectors into the output. Then the FFN processes the result. After the
> final layer, the model predicts the next token.
>
> Each decode step adds one new set of K, V entries to the cache at every
> layer. To generate 100 tokens of response, the full stack runs 100 times —
> and after those 100 steps, the cache has grown by 100 tokens' worth of
> K, V at every layer.
>
> These two phases have very different computational profiles. Prefill is
> **compute-bound** — lots of matrix multiplications processing thousands
> of tokens in parallel. Decode is **memory-bound** — each step processes
> only one new token, but must read the entire KV cache at every layer.
> This distinction has major infrastructure implications that we'll explore
> in Stop 10 and Act 2.

This replaces the misleading "this entire stack runs once per token
produced" with the accurate two-phase picture. The prefill/decode
distinction is named and briefly characterized here, with the full
treatment (disaggregation, compute vs. memory boundedness) deferred to
Stop 10.

---

## 7. Step 6 bridge — minor adjustment

The existing bridge text already works well. One small addition to
acknowledge the prefill/decode distinction just introduced:

After "the KV cache makes inference fast is also the structure that makes
inference expensive at scale," add:

> We've just seen that inference has two phases — prefill and decode — with
> different computational profiles. Stop 10 explores what this means for
> infrastructure: why some systems separate the two phases onto different
> hardware, how the KV cache must be transferred between them, and what
> happens when the cache outgrows the GPU's memory.

---

## 8. Upstream adjustment — Stop 7, Step 6 bridge

The existing bridge to Stop 8 says "A model with 64 heads stores 64 K
vectors and 64 V vectors per token, per layer." This uses "token" before
the formal transition in Stop 9. Since Stop 7 is still in "word" territory,
change to:

> Multi-head attention is where the model gets its depth of understanding.
> It's also where the KV cache gets its size: in the original design, each
> head stores its own K and V vectors for every word processed. Multiply
> across many heads and many layers, and the cache grows to tens of
> gigabytes. Modern models have found ways to share K and V across heads
> to reduce this — we'll see exactly how in Stop 8.
>
> Stop 8 shows how multiple heads work together, why they specialize, and
> what this means for the KV cache.

---

## Summary of all changes

| Location | What changed | Why |
|----------|-------------|-----|
| Stop 9, Step 1 opening | Added token/word transition paragraph | Clean, deliberate terminology shift |
| Stop 9, Step 1 FFN section | Restructured: concept first, size deferred to Step 3 | User needs lattice before details |
| Stop 9, Step 1 diagram | Annotated every arrow with what it carries | Arrows were doing too much invisible work |
| Stop 9, Step 2 | "word" → "token" throughout | Consistency after Step 1 transition |
| Stop 9, Step 3 | Receives FFN size/parameter details from Step 1 | Details land after framework is built |
| Stop 9, Step 3 | FFN "no cache" point explicitly names W₁ and W₂ | Answers "which frozen weight matrices?" |
| Stop 9, Step 5 | Replaced "stack runs once per token" with prefill/decode | Prompt must be processed first; two phases |
| Stop 9, Step 6 bridge | Added prefill/decode reference | Connects new Step 5 content to Stop 10 |
| Stop 7, Step 6 bridge | Removed "64 K vectors" claim, used "word" not "token" | Consistency; accuracy before GQA introduced |
