// Stop 6: Taming the Numbers — Scaling and Softmax
// How raw dot-product scores are converted into attention weights via softmax,
// and how temperature controls the sharpness of the distribution.

export const PAGES = [
  { id: 'intro',       label: 'Introduction',   type: 'static' },
  { id: 'why-softmax', label: 'Why Softmax?',   type: 'static' },
  { id: 'walkthrough', label: 'Step by Step',   type: 'static' },
  { id: 'temperature', label: 'Temperature',    type: 'static' },
  { id: 'bridge',      label: 'Bridge',         type: 'static' },
];

// Worked softmax example using scores from "was" attending to five key words.
// Raw scores come from the dot-product step (Stop 5).
export const SOFTMAX_EXAMPLE = {
  labels: ['controller', 'crashed', 'last', 'server', 'was'],
  rawScores: [1.26, 0.83, -0.45, 0.52, 0.15],
  exponentials: [3.53, 2.29, 0.64, 1.68, 1.16],
  expSum: 9.30,
  weights: [0.379, 0.247, 0.069, 0.181, 0.125],       // fractions (sum to ~1)
  percentages: [37.9, 24.7, 6.9, 18.1, 12.5],          // as percentages
};

// The same raw scores processed at three different temperatures.
// Temperature divides the scores before softmax is applied.
//   Low  (0.1) — very focused, highest score dominates
//   Default (1.0) — standard softmax
//   High (3.0) — very spread, weights more uniform
export const TEMPERATURE_EXAMPLES = [
  {
    temp: 0.1,
    label: 'T = 0.1 (focused)',
    description: 'Almost all weight on the top-scoring word.',
    percentages: [98.6, 1.3, 0.0, 0.1, 0.0],
  },
  {
    temp: 1.0,
    label: 'T = 1.0 (default)',
    description: 'Standard softmax — clear winner, but others still contribute.',
    percentages: [37.9, 24.7, 6.9, 18.1, 12.5],
  },
  {
    temp: 3.0,
    label: 'T = 3.0 (exploratory)',
    description: 'Weights spread more evenly — the model considers all options.',
    percentages: [25.6, 22.2, 14.5, 20.0, 17.7],
  },
];
