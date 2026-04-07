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
  // Stops 8-10 will be added as they're built
];
