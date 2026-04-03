import { useState, useEffect, useRef, useCallback } from 'react';

export default function AnimationControls({
  currentStep,
  totalSteps,
  onStepChange,
  stepLabel,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  const stop = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    if (currentStep >= totalSteps - 1) {
      // Start from beginning if at end
      onStepChange(0);
    }
    setIsPlaying(true);
  }, [currentStep, totalSteps, onStepChange]);

  // Auto-advance timer
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        onStepChange((prev) => {
          if (prev >= totalSteps - 1) {
            stop();
            return prev;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, totalSteps, onStepChange, stop]);

  // Stop playing if user manually changes step
  const handleManualStep = useCallback(
    (newStep) => {
      stop();
      onStepChange(newStep);
    },
    [stop, onStepChange]
  );

  // Keyboard: arrows for stepping, space for play/pause
  useEffect(() => {
    function handleKey(e) {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleManualStep(Math.min(currentStep + 1, totalSteps - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleManualStep(Math.max(currentStep - 1, 0));
      } else if (e.key === ' ') {
        e.preventDefault();
        if (isPlaying) stop();
        else play();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentStep, totalSteps, isPlaying, handleManualStep, stop, play]);

  const btnBase =
    'w-8 h-8 flex items-center justify-center rounded text-xs border border-[var(--color-border)] ' +
    'hover:bg-[var(--color-surface-alt)] disabled:opacity-30 disabled:cursor-not-allowed ' +
    'transition-colors cursor-pointer text-[var(--color-text-secondary)]';

  return (
    <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-muted)] p-4 my-4">
      {/* Top row: step buttons + label */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <button
          onClick={() => handleManualStep(0)}
          disabled={currentStep === 0}
          className={btnBase}
          title="First word"
        >
          ⏮
        </button>
        <button
          onClick={() => handleManualStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className={btnBase}
          title="Previous word"
        >
          ◀
        </button>

        <span className="mx-3 text-xs font-mono text-[var(--color-text-secondary)] min-w-[140px] text-center">
          {stepLabel || `step ${currentStep + 1} of ${totalSteps}`}
        </span>

        <button
          onClick={() => handleManualStep(Math.min(totalSteps - 1, currentStep + 1))}
          disabled={currentStep >= totalSteps - 1}
          className={btnBase}
          title="Next word"
        >
          ▶
        </button>
        <button
          onClick={() => handleManualStep(totalSteps - 1)}
          disabled={currentStep >= totalSteps - 1}
          className={btnBase}
          title="Last word"
        >
          ⏭
        </button>
      </div>

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={totalSteps - 1}
        value={currentStep}
        onChange={(e) => handleManualStep(Number(e.target.value))}
        className="anim-scrubber w-full mb-3"
      />

      {/* Play/Pause */}
      <div className="flex justify-center">
        <button
          onClick={isPlaying ? stop : play}
          className="px-4 py-1.5 text-xs rounded border border-[var(--color-border)]
                     hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer
                     text-[var(--color-text-secondary)] flex items-center gap-1.5"
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>
    </div>
  );
}
