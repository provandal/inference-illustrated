import { useState, useCallback, useEffect } from 'react';
import { PAGES } from '../data/stop0Data';
import { useStore } from '../store';
import { Panel, PanelHeader, InfoBox, Callout } from '../components/ui';
import PageNav from '../components/PageNav';

// --- Page Content Components ---

function WelcomePage() {
  return (
    <div className="space-y-4 mt-4">
      <Panel>
        <PanelHeader>Who this is for</PanelHeader>
        <InfoBox>
          This course is built for infrastructure engineers, storage networking
          professionals, and data center architects. You're technically strong —
          you understand networking, storage systems, memory hierarchies, and
          distributed computing. But you may not have a deep background in
          machine learning.
        </InfoBox>
        <InfoBox>
          By the end of these 17 stops, you'll understand exactly how LLM
          inference works, why the KV cache is the central challenge, and how it
          connects to the infrastructure you already know.
        </InfoBox>
      </Panel>

      <Panel>
        <PanelHeader>What you don't need</PanelHeader>
        <InfoBox>
          No ML background. No linear algebra. No Python. We introduce every
          concept from first principles and build progressively — each stop
          answers one question, and the answer creates the next question.
        </InfoBox>
      </Panel>

      <Panel>
        <PanelHeader>Time commitment</PanelHeader>
        <InfoBox>
          The full tour is approximately 60–90 minutes. Each stop is
          self-contained — you can pause and return at any time. Your progress
          is preserved.
        </InfoBox>
      </Panel>
    </div>
  );
}

function WhatYoullBuildPage() {
  return (
    <div className="space-y-4 mt-4">
      <Panel>
        <PanelHeader>Two Acts</PanelHeader>
        <div className="flex flex-col sm:flex-row gap-4 p-4">
          <div className="flex-1 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-4">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
              Act 1 — Stops 1–10
            </div>
            <div className="text-sm font-medium text-[var(--color-text)] mb-2">
              Attention Is All You Need
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              Build the transformer from scratch. Understand why attention exists,
              how Q/K/V enables direct lookup, why the KV cache is both essential
              and expensive.
            </div>
          </div>
          <div className="flex-1 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-4">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
              Act 2 — Stops 11–17
            </div>
            <div className="text-sm font-medium text-[var(--color-text)] mb-2">
              KV Cache & The Network
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              Take the KV cache into production. Memory management, disaggregated
              inference, tiered memory, compression, network fabric, intelligent
              routing, and the complete system.
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader>One sentence, all the way through</PanelHeader>
        <div className="px-4 py-3">
          <div className="flex flex-wrap gap-1.5 px-3 py-2.5 bg-[var(--color-surface-muted)] rounded-lg border border-[var(--color-border-light)]">
            {[
              'The', 'server', 'crashed', 'because', 'the',
              'storage', 'controller', 'that', 'the', 'technician',
              'replaced', 'last', 'week', 'was', 'faulty',
            ].map((word, i) => {
              let extra = '';
              if (i === 5 || i === 6)
                extra = 'border-b-[2.5px] border-b-[var(--color-amber)] ';
              if (i === 14)
                extra = 'border-b-[2.5px] border-b-[var(--color-primary)] ';
              return (
                <span
                  key={i}
                  className={`px-2.5 py-1 text-[13px] rounded-[5px] border border-transparent leading-tight text-[var(--color-text)] ${extra}`}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>
        <InfoBox>
          This sentence is our running example throughout Act 1. We'll process
          it word by word through an RNN (and watch it fail), then through a
          transformer (and see why it succeeds). Every concept — attention,
          Q/K/V, dot products, softmax, multi-head attention — is demonstrated
          on this one sentence.
        </InfoBox>
      </Panel>

      <Panel>
        <PanelHeader>One scenario, all the way through</PanelHeader>
        <InfoBox>
          In Act 2, every concept is grounded in a concrete deployment scenario:
          your company deploying Llama-3 70B for 500 engineers on 8x H100 GPUs.
          By Stop 17, you'll have designed the complete inference infrastructure.
        </InfoBox>
      </Panel>
    </div>
  );
}

function HowItWorksPage() {
  return (
    <div className="space-y-4 mt-4">
      <Panel>
        <PanelHeader>Navigation</PanelHeader>
        <InfoBox>
          Use the <strong>Next Page</strong> / <strong>Previous Page</strong>{' '}
          buttons at the bottom of each page, or press{' '}
          <strong>PageDown</strong> / <strong>PageUp</strong> on your keyboard.
        </InfoBox>
        <InfoBox>
          Some pages have animations with their own controls — play/pause
          buttons and scrubbers. Use arrow keys or the scrubber to step through
          animations.
        </InfoBox>
        <InfoBox>
          The header shows which stop you're on. Use{' '}
          <strong>Prev Stop</strong> / <strong>Next Stop</strong> to jump
          between stops.
        </InfoBox>
      </Panel>

      <Panel>
        <PanelHeader>A note on honesty</PanelHeader>
        <InfoBox>
          Throughout this course, we use simplified examples and interpretive
          approximations. When we do, we tell you. The decay pattern in Stop 1
          is real; the hidden state labels are our interpretation. The head
          specializations in Stop 8 are illustrative; real heads are messier. We
          believe in teaching with honest simplifications rather than false
          precision.
        </InfoBox>
      </Panel>

      <Callout
        type="good"
        message='<strong>Ready?</strong> Let\u2019s start with a question: what happens when a model can only read one word at a time?'
      />
    </div>
  );
}

// --- Main Component ---

export default function Welcome() {
  const [pageIndex, setPageIndex] = useState(0);

  const page = PAGES[pageIndex];

  // Narration text
  let narration = '';
  if (page.id === 'welcome') {
    narration =
      'Welcome to <strong>Inference Illustrated</strong> \u2014 an interactive journey through the architecture and infrastructure of large language models.';
  } else if (page.id === 'what-youll-build') {
    narration =
      'Over 17 stops, you\u2019ll build a complete mental model of LLM inference \u2014 from the transformer mechanism to a production GPU cluster.';
  } else if (page.id === 'how-it-works') {
    narration =
      'Each stop has multiple pages. Some pages are text. Some are interactive \u2014 with animations, calculators, and explorable diagrams.';
  }

  // Page navigation
  const goToPage = useCallback((idx) => {
    setPageIndex(idx);
  }, []);

  const prevPage = useCallback(() => {
    goToPage(Math.max(0, pageIndex - 1));
  }, [pageIndex, goToPage]);

  const nextPage = useCallback(() => {
    goToPage(Math.min(PAGES.length - 1, pageIndex + 1));
  }, [pageIndex, goToPage]);

  // Keyboard: PageDown/PageUp for pages
  useEffect(() => {
    function handleKey(e) {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'PageDown' || e.key === ']') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'PageUp' || e.key === '[') {
        e.preventDefault();
        prevPage();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nextPage, prevPage]);

  return (
    <div>
      {/* Narration — always at top */}
      <div
        className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed
                    px-4 py-3 bg-[var(--color-surface-muted)] rounded-lg
                    border border-[var(--color-border-light)] mb-5"
        dangerouslySetInnerHTML={{ __html: narration }}
      />

      {/* Page content */}
      <div className="min-h-[200px]">
        {page.id === 'welcome' && <WelcomePage />}
        {page.id === 'what-youll-build' && <WhatYoullBuildPage />}
        {page.id === 'how-it-works' && <HowItWorksPage />}
      </div>

      {/* Page navigation — always at bottom */}
      <PageNav
        pageIndex={pageIndex}
        totalPages={PAGES.length}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        pageLabel={`Page ${pageIndex + 1} of ${PAGES.length}: ${page.label}`}
      />

      {/* Keyboard hint */}
      <div className="text-center mt-3 mb-2 text-[10px] text-[var(--color-text-muted)]">
        PageDown / PageUp to turn pages
      </div>
    </div>
  );
}
