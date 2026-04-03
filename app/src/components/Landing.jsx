import { useStore } from '../store';

export default function Landing() {
  const startTour = useStore((s) => s.startTour);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-semibold tracking-tight mb-4">
          Inference Illustrated
        </h1>
        <p className="text-lg text-[var(--color-text-secondary)] mb-2">
          An interactive journey from attention mechanisms to infrastructure
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mb-10 max-w-lg mx-auto">
          Built for infrastructure engineers, storage networking professionals,
          and data center architects. No ML background required.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
          <div className="text-left max-w-[14rem]">
            <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
              Act 1
            </div>
            <div className="text-sm font-medium mb-0.5">
              Attention Is All You Need
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              Build the transformer from scratch. See why the KV cache exists.
            </div>
          </div>

          <div className="hidden sm:block w-px h-12 bg-[var(--color-border)]" />

          <div className="text-left max-w-[14rem]">
            <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
              Act 2
            </div>
            <div className="text-sm font-medium mb-0.5">
              KV Cache & The Network
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              Memory hierarchy, disaggregated inference, and network fabric.
            </div>
          </div>
        </div>

        <button
          onClick={startTour}
          className="px-8 py-3 bg-[var(--color-primary)] text-white rounded-lg
                     text-base font-medium hover:bg-[var(--color-primary-dark)]
                     transition-colors cursor-pointer"
        >
          Start the Tour
        </button>

        <p className="text-xs text-[var(--color-text-muted)] mt-4">
          10 interactive stops &middot; ~30 minutes &middot; keyboard navigation supported
        </p>
      </div>
    </div>
  );
}
