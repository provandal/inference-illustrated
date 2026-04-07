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
    summary: 'Generic adjective meaning "defective," weakly connected to nearby words.',
  },
  {
    layer: 2,
    summary: 'Defective property now describing a hardware component.',
  },
  {
    layer: 3,
    summary: 'Root cause of a system crash, describing a storage controller.',
  },
  {
    layer: 4,
    summary: 'Persistent hardware defect that survived maintenance last week.',
  },
  {
    layer: 5,
    summary: 'Component failure suggesting a recurring problem or incomplete repair.',
  },
  {
    layer: 6,
    summary: 'Carries integrated context sufficient for prediction.',
  },
];
