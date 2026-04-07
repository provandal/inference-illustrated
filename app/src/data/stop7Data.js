// Stop 7: Blending the Values — The Output
// Value vectors and attention weights consistent with Stop 6 softmax output.

export const PAGES = [
  { id: 'intro',            label: 'Introduction',        type: 'static' },
  { id: 'weighted-sum',     label: 'The Weighted Sum',    type: 'static' },
  { id: 'worked-example',   label: 'Worked Example',      type: 'static' },
  { id: 'context-enriched', label: 'Context-Enriched',    type: 'static' },
  { id: 'residual',         label: 'Residual Connection', type: 'static' },
  { id: 'pipeline',         label: 'The Full Pipeline',   type: 'static' },
  { id: 'bridge',           label: 'Bridge',              type: 'static' },
];

// Value vectors (simplified to 4 dimensions) and attention weights from Stop 6.
// Weights match the softmax output: controller 37.9%, crashed 24.7%, server 18.1%,
// was 12.5%, last 6.9%.
const V_controller = [0.3, 0.7, -0.2, 0.4];
const V_crashed    = [-0.1, 0.5, 0.3, 0.6];
const V_server     = [0.4, -0.2, 0.5, 0.3];
const V_was        = [0.2, 0.3, 0.1, -0.4];
const V_last       = [-0.3, 0.1, 0.4, 0.2];

const entries = [
  { label: 'controller', vector: V_controller, weight: 0.379 },
  { label: 'crashed',    vector: V_crashed,    weight: 0.247 },
  { label: 'server',     vector: V_server,     weight: 0.181 },
  { label: 'was',        vector: V_was,        weight: 0.125 },
  { label: 'last',       vector: V_last,       weight: 0.069 },
];

// Compute weighted vectors and final output
function computeWeightedVector(vector, weight) {
  return vector.map((v) => +(v * weight).toFixed(4));
}

function sumVectors(vectors) {
  const dim = vectors[0].length;
  return Array.from({ length: dim }, (_, i) =>
    +vectors.reduce((sum, vec) => sum + vec[i], 0).toFixed(4)
  );
}

const weightedVectors = entries.map((e) => ({
  ...e,
  weighted: computeWeightedVector(e.vector, e.weight),
}));

const output = sumVectors(weightedVectors.map((e) => e.weighted));

export const WEIGHTED_SUM_EXAMPLE = {
  entries: weightedVectors,
  output,
};
