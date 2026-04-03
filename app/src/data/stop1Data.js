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
export const WORD_NARRATIONS = [
  'The hidden state is fresh. "Expecting a noun" — the model knows a specific thing is coming.',
  'The RNN reads "server" and combines it with h\u2081 via W and U. "The server" at full strength: 100%.',
  'The RNN reads "crashed." "The server" drops 100%→80%. State must hold subject AND event.',
  '"because" pivots toward explanation. "The server" at 60%.',
  'Second "the" starts a new noun phrase. "The server" at 40% — half gone.',
  'New hardware entity forming. "The server" at 28%.',
  'Phrase complete: "storage controller" at 100%. "The server" down to 20%.',
  'Relative clause opens. "Storage controller" drops to 78% — one word later.',
  '"the" again. "Storage controller" at 58%. Nearly half gone in two words.',
  'New actor enters at 95%. "Storage controller" drops to 40%.',
  'Action verb. "Storage controller" below 30%.',
  'Time modifier. "Storage controller" at 20%.',
  'Time complete. "Storage controller" at 14%. From 100% in six words.',
  'Linking verb. "Storage controller" at 9%. Nearly gone.',
  'The critical moment. "Storage controller" at 6%. This is the telephone problem.',
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

// Color for bar magnitude
export function barColor(value, isDark = false) {
  if (value >= 80) return isDark ? '#FAC775' : '#EF9F27';
  if (value >= 50) return isDark ? '#85B7EB' : '#378ADD';
  if (value >= 25) return isDark ? '#9FE1CB' : '#1D9E75';
  if (value >= 10) return isDark ? '#B4B2A9' : '#888780';
  return isDark ? '#5F5E5A' : '#D3D1C7';
}
