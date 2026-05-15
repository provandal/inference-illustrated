// Stop 9: The Stack — Layers on Layers

export const PAGES = [
  { id: 'intro',         label: 'Introduction',          type: 'static' },
  { id: 'layer-anatomy', label: 'Inside Each Layer',     type: 'static' },
  { id: 'evolution',     label: 'Watching a Token Evolve', type: 'static' },
  { id: 'ffn',           label: 'The FFN',               type: 'static' },
  { id: 'full-stack',    label: 'The Full Stack',        type: 'static' },
  { id: 'architecture',  label: 'Complete Architecture', type: 'static' },
  { id: 'bridge',        label: 'Bridge',                type: 'static' },
];

export const LAYER_COUNTS = [
  { model: 'Llama-3 8B',   layers: 32 },
  { model: 'Llama-3 70B',  layers: 80 },
  { model: 'Llama-3 405B', layers: 126 },
];

export const FAULTY_EVOLUTION = [
  {
    layer: 1,
    title: 'Basic syntax and local connections',
    summary: '"faulty" is recognized as an adjective meaning defective or broken. Attention connects it weakly to nearby words — "was" (the linking verb immediately before) and "week" (positionally close). The model knows the word\'s basic grammatical role but has no understanding of what it describes.',
    attention: '"was" (linking verb), nearby words',
    ffn: 'Classifies as adjective, activates basic "defective" semantics',
  },
  {
    layer: 2,
    title: 'Coreference begins',
    summary: '"faulty" begins to connect to "controller." The coreference head (from Stop 8) recognizes that "faulty" is a predicate adjective that needs a subject — and "controller" is the most recent noun that fits. Meanwhile, "controller" already carries traces of "storage" from its own layer-1 attention. So "faulty" starts to absorb not just "controller" but the compound concept "storage controller."',
    attention: '"controller" (coreference), "storage" (through controller)',
    ffn: 'Strengthens the "describing a hardware component" pattern',
  },
  {
    layer: 3,
    title: 'Causal chain forms',
    summary: 'The causal structure clicks into place. "faulty" now connects through the chain: "faulty" → "controller" → "crashed" → "server." The model understands that a faulty storage controller caused a server crash. This required multiple hops — "faulty" didn\'t attend directly to "crashed" in layer 1, but by layer 3 the information has propagated through intermediate tokens.',
    attention: '"crashed" (through enriched "controller"), "server" (indirect)',
    ffn: 'Integrates cause-and-effect pattern: defective component → system failure',
  },
  {
    layer: 4,
    title: 'Temporal context integrates',
    summary: '"faulty" now incorporates the temporal clause: the technician replaced this component last week, and it is still faulty. This suggests either the replacement failed or the problem is recurring. The "last week" information reached "faulty" through the relative clause "that the technician replaced last week" — a long-range dependency that required several layers of progressive enrichment.',
    attention: '"replaced," "last," "week" (through relative clause chain)',
    ffn: 'Combines temporal context with failure pattern: recent maintenance didn\'t fix it',
  },
  {
    layer: 5,
    title: 'Inferential reasoning emerges',
    summary: 'The representation now supports inference. A component was replaced last week but is still faulty — this suggests a recurring problem, an incomplete repair, or a misdiagnosis. The model hasn\'t been told this explicitly; the inference emerges from patterns learned during pre-training across millions of similar maintenance-failure narratives.',
    attention: 'Refines connections established in earlier layers',
    ffn: 'Activates patterns from training data: "replaced but still broken" → recurring issue',
  },
  {
    layer: 6,
    title: 'Full contextual integration',
    summary: '"faulty" now carries the integrated understanding of the entire sentence: it describes a storage controller, that controller caused a server crash, a technician replaced it last week, and it remains defective — suggesting an unresolved hardware problem. This representation is rich enough for the model to answer questions, generate continuations, or make predictions about what comes next.',
    attention: 'Final refinement of all connections',
    ffn: 'Produces representation sufficient for downstream tasks',
  },
];
