// Stop 8: Why Multiple Heads?

export const PAGES = [
  { id: 'intro',            label: 'Introduction',             type: 'static' },
  { id: 'heads-divide',     label: 'How Heads Divide Work',    type: 'static' },
  { id: 'specializations',  label: 'What Heads Learn',         type: 'static' },
  { id: 'reassembly',       label: 'Putting It Back Together', type: 'static' },
  { id: 'cache-cost',       label: 'The Cache Cost',           type: 'static' },
  { id: 'gqa',              label: 'Sharing K and V',          type: 'static' },
  { id: 'bridge',           label: 'Bridge',                   type: 'static' },
];

export const MODEL_DIMENSIONS = [
  { model: 'Llama-3 8B',   d_model: 4096,  qHeads: 32,  kvGroups: 8, d_head: 128, layers: 32 },
  { model: 'Llama-3 70B',  d_model: 8192,  qHeads: 64,  kvGroups: 8, d_head: 128, layers: 80 },
  { model: 'Llama-3 405B', d_model: 16384, qHeads: 128, kvGroups: 8, d_head: 128, layers: 126 },
];

// Sentence: "The server crashed last week because a faulty storage controller was replaced by a technician"
// Each head focuses on a different linguistic relationship.

export const HEAD_SPECIALIZATIONS = [
  {
    name: 'Syntax head',
    description: 'Tracks grammatical subject-verb and object relationships.',
    patterns: [
      { from: 'crashed', to: 'server', weight: 0.61 },
      { from: 'replaced', to: 'technician', weight: 0.54 },
    ],
  },
  {
    name: 'Coreference head',
    description: 'Links adjectives and modifiers to the nouns they describe.',
    patterns: [
      { from: 'faulty', to: 'storage controller', weight: 0.42 },
    ],
  },
  {
    name: 'Positional head',
    description: 'Attends strongly to immediately neighboring tokens.',
    patterns: [
      { from: 'each word', to: 'immediate neighbors', weight: null },
    ],
  },
  {
    name: 'Semantic head',
    description: 'Clusters words with related meaning regardless of position.',
    patterns: [
      { from: 'server', to: 'storage', weight: 0.35 },
      { from: 'server', to: 'controller', weight: 0.30 },
      { from: 'storage', to: 'controller', weight: 0.38 },
    ],
  },
];

export const CACHE_SCALING = [
  { context: '1K',   llama8b: '128 MB',  llama70b: '320 MB' },
  { context: '8K',   llama8b: '1.0 GB',  llama70b: '2.5 GB' },
  { context: '32K',  llama8b: '4.0 GB',  llama70b: '10.0 GB' },
  { context: '128K', llama8b: '16.0 GB', llama70b: '40.0 GB' },
];

export const GQA_COMPARISON = [
  {
    method: 'MHA',
    fullName: 'Multi-Head Attention',
    kvHeads: 'Same as Q heads',
    cacheSize: '1x (baseline)',
    quality: 'Best',
    notes: 'Original transformer design. Every Q head has its own K and V.',
  },
  {
    method: 'GQA',
    fullName: 'Grouped-Query Attention',
    kvHeads: 'Groups of Q heads share K/V',
    cacheSize: '1/4x \u2013 1/8x',
    quality: 'Near-MHA',
    notes: 'Used by Llama-3, Gemma, Mistral. Best balance of quality and efficiency.',
  },
  {
    method: 'MQA',
    fullName: 'Multi-Query Attention',
    kvHeads: '1 (all Q heads share)',
    cacheSize: '1/Nx (minimal)',
    quality: 'Lower',
    notes: 'Extreme sharing. Used by PaLM, Falcon. Fastest inference but some quality loss.',
  },
  {
    method: 'MLA',
    fullName: 'Multi-head Latent Attention',
    kvHeads: 'Compressed latent',
    cacheSize: '~1/8x \u2013 1/16x',
    quality: 'Near-MHA',
    notes: 'Used by DeepSeek-V2/V3. Compresses KV into a low-rank latent instead of sharing heads.',
  },
];
