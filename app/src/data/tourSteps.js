export const tourSteps = [
  {
    id: 'telephone-problem',
    shortTitle: 'The Telephone Problem',
    title: 'Stop 1: The Telephone Problem',
    narration:
      'Why do we need attention at all? Sequential models lose information over distance.',
    component: 'TelephoneProblem',
    act: 1,
    stopNumber: 1,
  },
  {
    id: 'every-token-looks',
    shortTitle: 'Every Token Looks',
    title: 'Stop 2: Every Token Looks at Every Token',
    narration:
      'Self-attention lets every word examine every other word simultaneously — but at quadratic cost.',
    component: 'EveryTokenLooks',
    act: 1,
    stopNumber: 2,
  },
  {
    id: 'query-key-value',
    shortTitle: 'Query, Key, Value',
    title: 'Stop 3: One Identity Isn\u2019t Enough',
    narration:
      'Each word plays three roles simultaneously — and two of them need to be stored.',
    component: 'QueryKeyValue',
    act: 1,
    stopNumber: 3,
  },
  {
    id: 'learning-attention',
    shortTitle: 'Learning Attention',
    title: 'Stop 4: Learning to Pay Attention',
    narration:
      'Weight matrices start random and learn through billions of training examples.',
    component: 'LearningAttention',
    act: 1,
    stopNumber: 4,
  },
  {
    id: 'dot-product',
    shortTitle: 'The Dot Product',
    title: 'Stop 5: The Dot Product — How Similarity Becomes a Number',
    narration:
      'The dot product measures how similar a Query and Key are — one simple operation that drives all of attention.',
    component: 'DotProduct',
    act: 1,
    stopNumber: 5,
  },
  {
    id: 'softmax-scaling',
    shortTitle: 'Scaling & Softmax',
    title: 'Stop 6: Taming the Numbers \u2014 Scaling and Softmax',
    narration:
      'Raw dot-product scores become attention weights through softmax \u2014 and temperature controls how sharp the distribution is.',
    component: 'SoftmaxScaling',
    act: 1,
    stopNumber: 6,
  },
  {
    id: 'blending-values',
    shortTitle: 'Blending Values',
    title: 'Stop 7: Blending the Values \u2014 The Output',
    narration:
      'Attention weights blend Value vectors into a context-enriched representation \u2014 and a residual connection preserves the original signal.',
    component: 'BlendingValues',
    act: 1,
    stopNumber: 7,
  },
  {
    id: 'multiple-heads',
    shortTitle: 'Multiple Heads',
    title: 'Stop 8: Why Multiple Heads?',
    narration:
      'One attention head learns one pattern. Language has many simultaneous relationships \u2014 so we run many heads in parallel.',
    component: 'MultipleHeads',
    act: 1,
    stopNumber: 8,
  },
  {
    id: 'layers-on-layers',
    shortTitle: 'Layers on Layers',
    title: 'Stop 9: The Stack \u2014 Layers on Layers',
    narration:
      'Each layer refines the representation further. 80 layers deep, with the KV cache growing at every one.',
    component: 'LayersOnLayers',
    act: 1,
    stopNumber: 9,
  },
  {
    id: 'the-bridge',
    shortTitle: 'The Bridge',
    title: 'Stop 10: And Now, The Cache \u2014 The Bridge',
    narration:
      'The KV cache makes inference possible. But it\u2019s also what makes inference expensive at scale.',
    component: 'TheBridge',
    act: 1,
    stopNumber: 10,
  },
  {
    id: 'memory-wall',
    shortTitle: 'The Memory Wall',
    title: 'Stop 11: The Memory Wall \u2014 Up Close',
    narration:
      'How do production systems manage KV cache memory when serving many users simultaneously?',
    component: 'MemoryWall',
    act: 2,
    stopNumber: 11,
  },
  {
    id: 'splitting-work',
    shortTitle: 'Splitting the Work',
    title: 'Stop 12: Splitting the Work \u2014 Parallelism & Disaggregated Inference',
    narration:
      'How do you spread a model across multiple GPUs, and what happens when you separate prefill from decode?',
    component: 'SplittingWork',
    act: 2,
    stopNumber: 12,
  },
  {
    id: 'memory-hierarchy',
    shortTitle: 'Memory Hierarchy',
    title: 'Stop 13: The Memory Hierarchy \u2014 Where Caches Live',
    narration:
      'HBM is fast but scarce. DRAM is abundant but slower. The memory hierarchy determines where KV caches live and how fast they can move.',
    component: 'MemoryHierarchy',
    act: 2,
    stopNumber: 13,
  },
  {
    id: 'compressing-cache',
    shortTitle: 'Compressing the Cache',
    title: 'Stop 14: Compressing the Cache \u2014 Making It Smaller',
    narration:
      'Three families of compression attack the cache from different angles \u2014 architectural changes, quantization, and token eviction. Each trades accuracy for memory, and they can be combined.',
    component: 'CompressingCache',
    act: 2,
    stopNumber: 14,
  },
];
