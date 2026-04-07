// Stop 5: The Dot Product — How Similarity Becomes a Number

export const PAGES = [
  { id: 'intro',           label: 'Introduction',    type: 'static' },
  { id: 'what-is-dot',     label: 'The Dot Product', type: 'static' },
  { id: 'worked-example',  label: 'Worked Example',  type: 'static' },
  { id: 'why-it-works',    label: 'Why It Works',    type: 'static' },
  { id: 'scaling',         label: 'Scaling',         type: 'static' },
  { id: 'bridge',          label: 'Bridge',          type: 'static' },
];

// Concrete 4D vectors from the curriculum
const Q_faulty = [0.8, -0.3, 0.7, 0.2];
const K_controller = [0.7, -0.4, 0.8, 0.1];
const K_last = [-0.2, 0.6, -0.3, 0.5];
const K_crashed = [0.5, -0.1, 0.4, 0.6];

function dotProduct(a, b) {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function elementProducts(a, b) {
  return a.map((val, i) => ({ a: val, b: b[i], product: +(val * b[i]).toFixed(2) }));
}

export const DOT_PRODUCT_EXAMPLES = [
  {
    queryLabel: 'Q_faulty',
    keyLabel: 'K_controller',
    queryVector: Q_faulty,
    keyVector: K_controller,
    steps: elementProducts(Q_faulty, K_controller),
    score: +dotProduct(Q_faulty, K_controller).toFixed(2), // 1.26
    interpretation: 'High — good match',
  },
  {
    queryLabel: 'Q_faulty',
    keyLabel: 'K_crashed',
    queryVector: Q_faulty,
    keyVector: K_crashed,
    steps: elementProducts(Q_faulty, K_crashed),
    score: +dotProduct(Q_faulty, K_crashed).toFixed(2), // 0.83
    interpretation: 'Moderate',
  },
  {
    queryLabel: 'Q_faulty',
    keyLabel: 'K_last',
    queryVector: Q_faulty,
    keyVector: K_last,
    steps: elementProducts(Q_faulty, K_last),
    score: +dotProduct(Q_faulty, K_last).toFixed(2), // -0.45
    interpretation: 'Negative — poor match',
  },
];

// Scaling: divide by sqrt(d_head)
const D_HEAD = 128;
const SQRT_D_HEAD = Math.sqrt(D_HEAD); // ~11.3137...

export const SCALING_EXAMPLE = {
  dHead: D_HEAD,
  sqrtDHead: +SQRT_D_HEAD.toFixed(1), // 11.3
  raw: DOT_PRODUCT_EXAMPLES.map((ex) => ({
    label: `${ex.queryLabel} · ${ex.keyLabel}`,
    rawScore: ex.score,
    scaledScore: +(ex.score / SQRT_D_HEAD).toFixed(3),
  })),
};
