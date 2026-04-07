// Stop 1: The Telephone Problem — all authoritative data from curriculum + prototype

export const WORDS = [
  'The', 'server', 'crashed', 'because', 'the',
  'storage', 'controller', 'that', 'the', 'technician',
  'replaced', 'last', 'week', 'was', 'faulty',
];

// Subject dependency indices: "storage controller" (6-7) ↔ "faulty" (15)
export const SUBJECT_INDICES = [5, 6]; // 0-indexed: "storage", "controller"
export const TARGET_INDEX = 14; // "faulty"

// Hidden state memory at each word step — [concept, strength%]
export const HIDDEN_STATE = [
  { concepts: [['expecting a noun', 95], ['sentence starting', 80]] },
  { concepts: [['the server', 100], ['hardware entity', 85], ['expecting a verb', 75]] },
  { concepts: [['server crash event', 95], ['the server', 80], ['past tense event', 70], ['expecting explanation', 50]] },
  { concepts: [['causal explanation coming', 90], ['server crash event', 75], ['the server', 60], ['past tense event', 45]] },
  { concepts: [['new noun phrase starting', 85], ['causal explanation', 70], ['server crash event', 55], ['the server', 40]] },
  { concepts: [['storage (hardware)', 95], ['new component forming', 80], ['causal explanation', 55], ['server crash event', 40], ['the server', 28]] },
  { concepts: [['storage controller', 100], ['causal link to crash', 70], ['hardware domain', 55], ['server crash event', 35], ['the server', 20]] },
  { concepts: [['relative clause opening', 90], ['storage controller', 78], ['modifying the controller', 70], ['server crash event', 25], ['the server', 14]] },
  { concepts: [['another noun phrase', 80], ['relative clause', 65], ['storage controller', 58], ['modifier context', 50], ['server crash event', 18], ['the server', 9]] },
  { concepts: [['the technician', 95], ['human actor', 80], ['relative clause', 50], ['storage controller', 40], ['server crash event', 12], ['the server', 5]] },
  { concepts: [['replacement action', 90], ['the technician', 72], ['past action', 65], ['storage controller', 28], ['relative clause', 35], ['the server', 3]] },
  { concepts: [['temporal modifier', 85], ['replacement action', 60], ['the technician', 50], ['time reference forming', 70], ['storage controller', 20], ['the server', 2]] },
  { concepts: [['last week (time)', 90], ['replacement event', 50], ['the technician', 38], ['temporal context', 65], ['storage controller', 14], ['the server', 1]] },
  { concepts: [['linking verb', 85], ['returning to main clause', 70], ['temporal context', 45], ['the technician', 25], ['storage controller', 9], ['replacement event', 30]] },
  { concepts: [['faulty (property)', 95], ['something is faulty', 80], ['linking verb', 60], ['temporal context', 25], ['the technician', 15], ['storage controller', 6], ['the server', 1]] },
];

// Warning/note callouts at specific word indices
export const CALLOUTS = {
  6: {
    type: 'note',
    message: '<strong>"storage controller"</strong> is now at 100%. This is what "faulty" will need 8 words from now. Watch it fade.',
  },
  9: {
    type: 'warn',
    message: '<strong>"storage controller" drops to 40%.</strong> "The technician" at 95% is pushing it out.',
  },
  12: {
    type: 'warn',
    message: '<strong>"storage controller" at 14%.</strong> Was 100% just 6 words ago.',
  },
  14: {
    type: 'warn',
    message: '<strong>"faulty" needs: faulty WHAT?</strong> "Storage controller" at 6%. "The technician" at 15%. The model may get this wrong.',
  },
};

// Per-word narration during RNN processing
// Each narration must reference: (a) the mechanical action (W, U combining),
// (b) what changed in the hidden state, (c) why it matters for the story.
export const WORD_NARRATIONS = [
  'W and U combine the zero vector with "The" to produce h\u2081. The hidden state is fresh — "expecting a noun" at 95%. The model knows a specific thing is coming, but has no content yet.',
  'W carries h\u2081 forward while U absorbs "server." The hidden state now holds "the server" at full strength: 100%. This is the subject of our sentence.',
  'W and U rewrite the state again: "server crash event" enters at 95%, but "the server" drops from 100% to 80%. The state must hold both the subject AND the event — space is already getting tight.',
  'W carries the prior state forward while U mixes in "because." The sentence pivots toward explanation. "Causal explanation" enters at 90%, but "the server" drops further to 60% — it\u2019s fading to make room.',
  'W and U process the second "the," starting a new noun phrase. "The server" is now at 40% — half gone after just two words. Every new word forces the fixed-size state to compress what came before.',
  'W carries the decaying state forward while U absorbs "storage." A new hardware entity begins forming at 95%. "The server" drops to 28%. The old subject is being overwritten by the new one.',
  'W and U produce h\u2087: "storage controller" enters at 100% — this is the critical phrase that "faulty" will need 8 words from now. But "the server" is already down to 20%. Watch what happens next.',
  'W carries h\u2087 forward while U absorbs "that," opening a relative clause at 90%. "Storage controller" drops to 78% — it lost over a fifth of its strength in a single step.',
  'Another "the" — W and U rewrite the state again. "Storage controller" falls to 58%. It\u2019s lost nearly half its strength in just two words since its peak.',
  'W and U absorb "technician" — a new actor enters at 95%, pushing everything else down. "Storage controller" drops to 40%. The new concept is crowding out the old one because the state has a fixed capacity.',
  'W carries forward while U absorbs "replaced." The replacement action enters at 90%, but "storage controller" falls below 28%. It\u2019s now less than a third of what it was at its peak.',
  'W and U process "last" — a temporal modifier at 85%. "Storage controller" drops to 20%. Each new word forces W to compress the existing state further to make room.',
  'W and U produce h\u2081\u2083: "last week" completes at 90%. "Storage controller" is at 14% — down from 100% just six words ago. The fixed-size state simply cannot preserve information across this distance.',
  'W carries forward while U absorbs "was" — a linking verb. "Storage controller" drops to 9%. It\u2019s nearly gone, buried under layers of more recent information.',
  'The critical moment. W and U produce h\u2081\u2085: "faulty" enters at 95%. But what is faulty? "Storage controller" sits at just 6% — the weakest signal in the entire state. This is the telephone problem.',
];

// Attention weights from "faulty" for the reveal
export const ATTENTION_DATA = [
  ['storage controller', 48],
  ['crashed', 14],
  ['was', 12],
  ['server', 8],
  ['replaced', 7],
  ['the (word 5)', 4],
  ['technician', 3],
  ['other words', 4],
];

// Page structure for Stop 1 — separates page-level nav from animation stepping
export const PAGES = [
  { id: 'setup',     label: 'Setup',           type: 'static' },
  { id: 'mech1',     label: 'Hidden State',    type: 'static' },
  { id: 'mech2',     label: 'Update Rule',     type: 'static' },
  { id: 'animation', label: 'Word Processing', type: 'animation', animSteps: 15 },
  { id: 'done',      label: 'Result',          type: 'static' },
  { id: 'attention', label: 'Attention',       type: 'static' },
];

// Color for bar magnitude
export function barColor(value, isDark = false) {
  if (value >= 80) return isDark ? '#FAC775' : '#EF9F27';
  if (value >= 50) return isDark ? '#85B7EB' : '#378ADD';
  if (value >= 25) return isDark ? '#9FE1CB' : '#1D9E75';
  if (value >= 10) return isDark ? '#B4B2A9' : '#888780';
  return isDark ? '#5F5E5A' : '#D3D1C7';
}
