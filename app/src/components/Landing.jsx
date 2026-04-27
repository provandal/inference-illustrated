import { useState } from 'react';
import { useStore } from '../store';
import { tourSteps } from '../data/tourSteps';

export default function Landing() {
  const startTour = useStore((s) => s.startTour);
  const goToStep = useStore((s) => s.goToStep);
  const setMode = useStore((s) => s.setMode);
  const [act1Open, setAct1Open] = useState(true);
  const [act2Open, setAct2Open] = useState(true);

  function jumpToStop(index) {
    goToStep(index);
    setMode('tour');
  }

  // Group stops by act
  const intro = tourSteps.filter((s) => s.act === 0);
  const act1 = tourSteps.filter((s) => s.act === 1);
  const act2 = tourSteps.filter((s) => s.act === 2);

  return (
    <div className="min-h-dvh flex flex-col items-center px-6 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-semibold tracking-tight mb-4">
            Inference Illustrated
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] mb-2">
            An interactive journey from attention mechanisms to infrastructure
          </p>
          <p className="text-sm text-[var(--color-text-muted)] max-w-lg mx-auto">
            Built for infrastructure engineers, storage networking professionals,
            and data center architects. No ML background required.
          </p>
        </div>

        {/* Start button */}
        <div className="text-center mb-10">
          <button
            onClick={startTour}
            className="px-8 py-3 bg-[var(--color-primary)] text-white rounded-lg
                       text-base font-medium hover:bg-[var(--color-primary-dark)]
                       transition-colors cursor-pointer"
          >
            Start from the Beginning
          </button>
          <p className="text-xs text-[var(--color-text-muted)] mt-3">
            17 interactive stops &middot; ~60-90 minutes &middot; keyboard navigation supported
          </p>
        </div>

        {/* Table of Contents */}
        <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
            <h2 className="text-sm font-medium text-[var(--color-text)]">
              Table of Contents
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Jump directly to any stop
            </p>
          </div>

          {/* Introduction */}
          {intro.map((stop) => {
            const idx = tourSteps.indexOf(stop);
            return (
              <button
                key={stop.id}
                onClick={() => jumpToStop(idx)}
                className="w-full text-left px-4 py-2.5 border-b border-[var(--color-border-light)]
                           hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer
                           flex items-start gap-3"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--color-surface-muted)]
                               border border-[var(--color-border)] text-[var(--color-text-muted)]
                               text-[11px] font-medium flex items-center justify-center mt-0.5">
                  {stop.stopNumber}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[var(--color-text)]">
                    {stop.title}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-1">
                    {stop.narration.replace(/<[^>]*>/g, '')}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Act 1 */}
          <button
            onClick={() => setAct1Open(!act1Open)}
            className="w-full text-left px-4 py-2.5 border-b border-[var(--color-border-light)]
                       bg-[var(--color-primary-bg)] hover:opacity-90 transition-opacity cursor-pointer
                       flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-primary-text)]">
                Act 1 &mdash; Stops 1&ndash;10
              </span>
              <span className="text-[11px] text-[var(--color-primary-text)] ml-2 opacity-70">
                Attention Is All You Need
              </span>
            </div>
            <span className="text-[var(--color-primary-text)] text-xs">
              {act1Open ? '▼' : '▶'}
            </span>
          </button>

          {act1Open && act1.map((stop) => {
            const idx = tourSteps.indexOf(stop);
            return (
              <button
                key={stop.id}
                onClick={() => jumpToStop(idx)}
                className="w-full text-left px-4 py-2 border-b border-[var(--color-border-light)]
                           hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer
                           flex items-start gap-3"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--color-primary-bg)]
                               border border-[var(--color-primary)] text-[var(--color-primary-text)]
                               text-[11px] font-medium flex items-center justify-center mt-0.5">
                  {stop.stopNumber}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[var(--color-text)]">
                    {stop.title}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-1">
                    {stop.narration.replace(/<[^>]*>/g, '')}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Act 2 */}
          <button
            onClick={() => setAct2Open(!act2Open)}
            className="w-full text-left px-4 py-2.5 border-b border-[var(--color-border-light)]
                       bg-[var(--color-teal-bg)] hover:opacity-90 transition-opacity cursor-pointer
                       flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-teal-text)]">
                Act 2 &mdash; Stops 11&ndash;17
              </span>
              <span className="text-[11px] text-[var(--color-teal-text)] ml-2 opacity-70">
                KV Cache & The Network
              </span>
            </div>
            <span className="text-[var(--color-teal-text)] text-xs">
              {act2Open ? '▼' : '▶'}
            </span>
          </button>

          {act2Open && act2.map((stop) => {
            const idx = tourSteps.indexOf(stop);
            return (
              <button
                key={stop.id}
                onClick={() => jumpToStop(idx)}
                className="w-full text-left px-4 py-2 border-b border-[var(--color-border-light)]
                           hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer
                           flex items-start gap-3 last:border-b-0"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--color-teal-bg)]
                               border border-[var(--color-teal)] text-[var(--color-teal-text)]
                               text-[11px] font-medium flex items-center justify-center mt-0.5">
                  {stop.stopNumber}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[var(--color-text)]">
                    {stop.title}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-1">
                    {stop.narration.replace(/<[^>]*>/g, '')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
