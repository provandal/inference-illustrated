import { useEffect } from 'react';
import { useStore } from '../store';
import { tourSteps } from '../data/tourSteps';
import TelephoneProblem from '../stops/TelephoneProblem';

const STOP_COMPONENTS = {
  TelephoneProblem,
};

export default function TourView() {
  const currentStep = useStore((s) => s.currentStep);
  const nextStep = useStore((s) => s.nextStep);
  const prevStep = useStore((s) => s.prevStep);
  const setMode = useStore((s) => s.setMode);

  const step = tourSteps[currentStep];
  const StopComponent = STOP_COMPONENTS[step.component];

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e) {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nextStep, prevStep]);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Sticky header */}
      <header
        className="sticky top-0 z-50 border-b border-[var(--color-border)]
                    bg-[var(--color-surface)] px-4 py-2"
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3 flex-wrap">
          {/* Home button */}
          <button
            onClick={() => setMode('landing')}
            className="text-xs text-[var(--color-text-muted)]
                       hover:text-[var(--color-text)] transition-colors cursor-pointer"
            title="Back to home"
          >
            ← Home
          </button>

          {/* Step title */}
          <h1 className="text-sm font-medium flex-1 min-w-0 truncate">
            {step.title}
          </h1>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  background:
                    i === currentStep
                      ? 'var(--color-primary)'
                      : i < currentStep
                        ? 'var(--color-teal)'
                        : 'var(--color-border)',
                }}
              />
            ))}
          </div>

          {/* Step counter */}
          <span className="text-xs font-mono text-[var(--color-text-muted)]">
            {currentStep + 1}/{tourSteps.length}
          </span>

          {/* Nav buttons */}
          <div className="flex gap-1.5">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="px-3 py-1 text-xs rounded border border-[var(--color-border)]
                         hover:bg-[var(--color-surface-alt)] disabled:opacity-30
                         disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ← Prev
            </button>
            <button
              onClick={nextStep}
              disabled={currentStep === tourSteps.length - 1}
              className="px-3 py-1 text-xs rounded border border-[var(--color-border)]
                         hover:bg-[var(--color-surface-alt)] disabled:opacity-30
                         disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next →
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {StopComponent && <StopComponent />}
        </div>
      </main>
    </div>
  );
}
