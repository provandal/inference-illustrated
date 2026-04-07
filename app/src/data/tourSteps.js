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
  // Stops 5-10 will be added as they're built
];
