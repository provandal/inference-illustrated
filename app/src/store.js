import { create } from 'zustand';
import { tourSteps } from './data/tourSteps';

function getInitialDarkMode() {
  // Check localStorage first (user's explicit choice persists)
  const stored = localStorage.getItem('darkMode');
  if (stored !== null) return stored === 'true';
  // Default to dark
  return true;
}

function applyDarkMode(dark) {
  document.documentElement.classList.toggle('dark', dark);
}

export const useStore = create((set, get) => ({
  // Mode: 'landing' | 'tour' | 'explore'
  mode: 'landing',

  // Tour navigation (stop-level)
  currentStep: 0,

  // Dark mode — defaults to dark, persists user choice
  darkMode: getInitialDarkMode(),

  setMode: (mode) => set({ mode }),

  startTour: () => set({ mode: 'tour', currentStep: 0 }),

  goToStep: (n) => {
    const clamped = Math.max(0, Math.min(n, tourSteps.length - 1));
    set({ currentStep: clamped });
  },

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < tourSteps.length - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  toggleDarkMode: () => {
    const next = !get().darkMode;
    applyDarkMode(next);
    localStorage.setItem('darkMode', String(next));
    set({ darkMode: next });
  },

  initDarkMode: () => {
    applyDarkMode(get().darkMode);
  },
}));
