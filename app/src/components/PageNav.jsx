import { useStore } from '../store';
import { tourSteps } from '../data/tourSteps';

export default function PageNav({ pageIndex, totalPages, onPrevPage, onNextPage, pageLabel }) {
  const nextStop = useStore((s) => s.nextStep);
  const prevStop = useStore((s) => s.prevStep);
  const currentStop = useStore((s) => s.currentStep);

  const isFirst = pageIndex === 0;
  const isLast = pageIndex === totalPages - 1;
  const hasNextStop = currentStop < tourSteps.length - 1;
  const hasPrevStop = currentStop > 0;

  function handlePrev() {
    if (isFirst) {
      if (hasPrevStop) prevStop();
    } else {
      onPrevPage();
    }
  }

  function handleNext() {
    if (isLast) {
      if (hasNextStop) nextStop();
    } else {
      onNextPage();
    }
  }

  return (
    <div className="flex items-center justify-between mt-8 pt-5 border-t border-[var(--color-border-light)]">
      <button
        onClick={handlePrev}
        disabled={isFirst && !hasPrevStop}
        className="px-5 py-2 text-sm rounded-lg border border-[var(--color-border)]
                   text-[var(--color-text-secondary)]
                   hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]
                   disabled:opacity-30 disabled:cursor-not-allowed
                   transition-colors cursor-pointer"
      >
        ← Previous Page
      </button>

      <span className="text-xs text-[var(--color-text-muted)] font-mono">
        {pageLabel || `Page ${pageIndex + 1} of ${totalPages}`}
      </span>

      <button
        onClick={handleNext}
        disabled={isLast && !hasNextStop}
        className="px-5 py-2 text-sm rounded-lg
                   bg-[var(--color-primary)] text-white
                   hover:bg-[var(--color-primary-dark)]
                   disabled:opacity-30 disabled:cursor-not-allowed
                   transition-colors cursor-pointer"
      >
        {isLast ? (hasNextStop ? 'Next Stop →' : 'Coming Soon') : 'Next Page →'}
      </button>
    </div>
  );
}
