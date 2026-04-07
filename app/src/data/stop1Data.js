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
// Written as natural storytelling prose — the visuals (update pill, chain, bars)
// show the mechanics; the narration helps the reader understand what they're seeing.
export const WORD_NARRATIONS = [
  'The first word enters the model. The RNN combines its blank starting state with the embedding for "The" to produce a new hidden state. Right now, that state mostly encodes one thing: a noun is coming next.',
  '"server" arrives and the RNN rewrites the hidden state. As shown in the hidden state bar graph below, the dominant concept is now "the server" at full strength. The model has identified a hardware entity \u2014 the subject of whatever comes next.',
  'The hidden state absorbs "crashed" and now holds two things: a server crash event (the new information) and "the server" as its subject. But "the server" has already dropped from 100% to 80% \u2014 the state had to make room for the event.',
  '"because" signals that an explanation is coming. The state shifts to hold this causal framing, and "the server" drops further to 60%. Every new word forces older information to compress.',
  'A second "the" begins a new noun phrase. "The server" \u2014 the original subject from just three words ago \u2014 is now at 40%. Half its original strength, gone in three steps.',
  'A new hardware concept starts forming. "storage" enters strongly at 95%, and "the server" drops to 28%. The old subject is being steadily overwritten by the new one.',
  'The phrase completes: "storage controller" enters the hidden state at 100%. This is the concept that "faulty" will need to find, eight words from now. But "the server" is already down to 20%. Watch what happens to "storage controller" from here.',
  '"that" opens a relative clause. It seems harmless \u2014 just a grammatical connector \u2014 but "storage controller" has already dropped to 78%. It lost over a fifth of its strength in a single step.',
  'Another "the." "Storage controller" falls to 58% \u2014 nearly half its peak strength, gone in just two words.',
  'A new actor enters the scene: "the technician" arrives at 95%. This pushes "storage controller" down to 40%. The fixed-size state can only hold so much, and the new concept is crowding out the old one.',
  'The action verb "replaced" brings new information about what the technician did. "Storage controller" drops below 28% \u2014 less than a third of its peak.',
  'A temporal modifier. Each new word forces the state to compress further. "Storage controller" is at 20%, down from 100% just six words ago.',
  '"last week" completes as a time reference. "Storage controller" is now at 14%. The fixed-size state simply cannot preserve information across this many steps.',
  'A linking verb \u2014 the sentence is about to deliver its conclusion. "Storage controller" drops to 9%. It\u2019s nearly gone, buried under layers of more recent information.',
  'This is the critical moment. "faulty" enters the hidden state \u2014 but faulty what? The model needs to connect this word back to "storage controller." After eight words of intervening text, "storage controller" has decayed to just 6% \u2014 the weakest signal in the entire state. The correct answer is barely a whisper. This is the telephone problem.',
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
