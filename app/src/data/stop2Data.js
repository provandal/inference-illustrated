// Stop 2: Every Token Looks at Every Token — self-attention data

export const WORDS = [
  'The', 'server', 'crashed', 'because', 'the',
  'storage', 'controller', 'that', 'the', 'technician',
  'replaced', 'last', 'week', 'was', 'faulty',
];

export const PAGES = [
  { id: 'intro',          label: 'Introduction',       type: 'static' },
  { id: 'self-attention', label: 'Self-Attention',     type: 'static' },
  { id: 'explore',        label: 'Explore Attention',  type: 'static' },
  { id: 'matrix',         label: 'The Full Matrix',    type: 'static' },
  { id: 'scaling',        label: 'Quadratic Scaling',  type: 'static' },
  { id: 'context',        label: 'Context Window',     type: 'static' },
  { id: 'bridge',         label: 'Bridge to Q,K,V',    type: 'static' },
];

// Attention weights: for each word (by index), the top attended words with weights.
// Each entry: { targets: [{ index, label, weight }], narration: string }
// Weights are percentages and sum close to 100% for each source word.
export const ATTENTION_WEIGHTS = {
  0: {
    targets: [
      { index: 1, label: 'server', weight: 62 },
      { index: 2, label: 'crashed', weight: 15 },
      { index: 13, label: 'was', weight: 8 },
    ],
    narration:
      '"The" is a determiner — it doesn\'t carry much meaning on its own. Its attention flows overwhelmingly to "server" (62%), the noun it introduces. It also weakly notes the main verb "crashed" and the linking verb "was," both structural anchors in the sentence.',
  },
  1: {
    targets: [
      { index: 2, label: 'crashed', weight: 45 },
      { index: 0, label: 'The', weight: 20 },
      { index: 6, label: 'controller', weight: 12 },
    ],
    narration:
      '"server" attends most strongly to "crashed" (45%) — its verb, the action it performed. It also looks back at its own determiner "The" (20%) and ahead to "controller" (12%), another hardware entity in the same domain.',
  },
  2: {
    targets: [
      { index: 1, label: 'server', weight: 38 },
      { index: 3, label: 'because', weight: 22 },
      { index: 14, label: 'faulty', weight: 15 },
    ],
    narration:
      '"crashed" attends to its subject "server" (38%) — what crashed? — and to "because" (22%), the word that introduces its explanation. It even reaches all the way to "faulty" (15%), the ultimate cause. The model is already connecting the crash to its reason.',
  },
  3: {
    targets: [
      { index: 2, label: 'crashed', weight: 30 },
      { index: 13, label: 'was', weight: 18 },
      { index: 14, label: 'faulty', weight: 16 },
    ],
    narration:
      '"because" is a causal connector. It looks back at "crashed" (30%) — the event being explained — and forward to "was" (18%) and "faulty" (16%), the explanation itself. It\'s bridging the cause and the effect.',
  },
  4: {
    targets: [
      { index: 5, label: 'storage', weight: 55 },
      { index: 6, label: 'controller', weight: 25 },
      { index: 0, label: 'The (word 1)', weight: 8 },
    ],
    narration:
      'The second "the" (word 5) attends heavily to "storage" (55%) and "controller" (25%) — the noun phrase it introduces. It also glances at the first "The" (8%), recognizing a parallel structure: both are determiners opening noun phrases.',
  },
  5: {
    targets: [
      { index: 6, label: 'controller', weight: 58 },
      { index: 1, label: 'server', weight: 15 },
      { index: 4, label: 'the (word 5)', weight: 12 },
    ],
    narration:
      '"storage" attends overwhelmingly to "controller" (58%) — the two form a compound noun. It also notes "server" (15%), another piece of hardware in the same domain, and its own determiner "the" (12%).',
  },
  6: {
    targets: [
      { index: 5, label: 'storage', weight: 52 },
      { index: 7, label: 'that', weight: 14 },
      { index: 1, label: 'server', weight: 12 },
    ],
    narration:
      '"controller" looks back at "storage" (52%) — its modifier, forming the compound "storage controller." It also attends to "that" (14%), which opens the relative clause describing it, and "server" (12%), the other hardware entity.',
  },
  7: {
    targets: [
      { index: 6, label: 'controller', weight: 35 },
      { index: 9, label: 'technician', weight: 25 },
      { index: 10, label: 'replaced', weight: 18 },
    ],
    narration:
      '"that" is a relative pronoun connecting the controller to what happened to it. It attends to "controller" (35%) — what the relative clause modifies — and forward to "technician" (25%) and "replaced" (18%), the actor and action within the clause.',
  },
  8: {
    targets: [
      { index: 9, label: 'technician', weight: 60 },
      { index: 10, label: 'replaced', weight: 18 },
      { index: 7, label: 'that', weight: 8 },
    ],
    narration:
      'The third "the" (word 9) attends strongly to "technician" (60%) — the noun it introduces. Like the other determiners, its job is to point at its noun. It also notes "replaced" (18%) and "that" (8%), the surrounding clause structure.',
  },
  9: {
    targets: [
      { index: 10, label: 'replaced', weight: 40 },
      { index: 6, label: 'controller', weight: 18 },
      { index: 8, label: 'the (word 9)', weight: 15 },
    ],
    narration:
      '"technician" attends to "replaced" (40%) — the action this person performed. It also looks at "controller" (18%) — the object that was replaced — and its own determiner "the" (15%). The model is reconstructing who did what to what.',
  },
  10: {
    targets: [
      { index: 9, label: 'technician', weight: 32 },
      { index: 6, label: 'controller', weight: 22 },
      { index: 11, label: 'last', weight: 18 },
    ],
    narration:
      '"replaced" attends to its subject "technician" (32%) — who did the replacing? — and its object "controller" (22%) — what was replaced? It also looks at "last" (18%), the beginning of the temporal modifier "last week."',
  },
  11: {
    targets: [
      { index: 12, label: 'week', weight: 55 },
      { index: 10, label: 'replaced', weight: 20 },
      { index: 9, label: 'technician', weight: 10 },
    ],
    narration:
      '"last" attends overwhelmingly to "week" (55%) — together they form the time expression "last week." It also looks at "replaced" (20%), the action this time expression modifies, and "technician" (10%), the actor.',
  },
  12: {
    targets: [
      { index: 11, label: 'last', weight: 48 },
      { index: 10, label: 'replaced', weight: 22 },
      { index: 13, label: 'was', weight: 12 },
    ],
    narration:
      '"week" attends to "last" (48%) — its companion in the time expression. It also looks at "replaced" (22%), the action it\'s timing, and forward to "was" (12%), the verb that continues the main clause.',
  },
  13: {
    targets: [
      { index: 14, label: 'faulty', weight: 35 },
      { index: 6, label: 'controller', weight: 20 },
      { index: 2, label: 'crashed', weight: 15 },
    ],
    narration:
      '"was" is a linking verb connecting subject to predicate. It attends to "faulty" (35%) — what follows it — and to "controller" (20%) — the subject of this clause. It also reaches back to "crashed" (15%), linking the two halves of the sentence.',
  },
  14: {
    targets: [
      { index: 6, label: 'controller', weight: 48 },
      { index: 5, label: 'storage', weight: 15 },
      { index: 2, label: 'crashed', weight: 14 },
      { index: 13, label: 'was', weight: 12 },
    ],
    narration:
      '"faulty" — the word the RNN struggled with — attends directly to "controller" (48%) and "storage" (15%). No decay, no telephone game. It also connects to "crashed" (14%), the consequence of being faulty, and "was" (12%), its linking verb. This is the power of self-attention: the answer is retrieved at full strength.',
  },
};

// Quadratic scaling data: [tokens, pairs (n²)]
export const SCALING_DATA = [
  { tokens: 15,        pairs: 225 },
  { tokens: 100,       pairs: 10000 },
  { tokens: 1000,      pairs: 1000000 },
  { tokens: 8000,      pairs: 64000000 },
  { tokens: 128000,    pairs: 16384000000 },
  { tokens: 1000000,   pairs: 1000000000000 },
];

// Color for attention bar magnitude
export function attentionBarColor(value, isDark = false) {
  if (value >= 50) return isDark ? '#FAC775' : '#EF9F27';
  if (value >= 30) return isDark ? '#85B7EB' : '#378ADD';
  if (value >= 15) return isDark ? '#9FE1CB' : '#1D9E75';
  return isDark ? '#B4B2A9' : '#888780';
}
