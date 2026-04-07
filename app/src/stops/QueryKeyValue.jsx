import { useState, useCallback, useEffect } from 'react';
import { WORDS, PAGES } from '../data/stop3Data';
import { Panel, PanelHeader, InfoBox, Callout, SectionLabel } from '../components/ui';
import PageNav from '../components/PageNav';
import { useStore } from '../store';

// --- Helpers ---

function useDarkMode() {
  return useStore((s) => s.darkMode);
}

// --- Sub-components ---

function SentenceRow({ highlightQ, highlightK }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-3">
      {WORDS.map((word, i) => {
        let cls =
          'px-2.5 py-1 text-[13px] rounded-[5px] border transition-all duration-300 leading-tight ';

        if (highlightQ && i === 14) {
          cls +=
            'bg-[var(--color-primary-bg)] border-[var(--color-primary)] text-[var(--color-primary-text)] font-medium ';
        } else if (highlightK && i === 6) {
          cls +=
            'bg-[var(--color-teal-bg)] border-[var(--color-teal)] text-[var(--color-teal-text)] font-medium ';
        } else {
          cls += 'border-transparent text-[var(--color-text)] ';
        }

        return (
          <span key={i} className={cls}>
            {word}
          </span>
        );
      })}
    </div>
  );
}

function RoleCard({ letter, color, borderColor, bgColor, question, description }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${borderColor} ${bgColor}`}>
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center
                    text-lg font-bold shrink-0 ${color}`}
      >
        {letter}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--color-text)] mb-0.5">
          {question}
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {description}
        </div>
      </div>
    </div>
  );
}

function MatrixDiagram({ inputLabel, matrixLabel, outputLabel, matrixColor, outputColor }) {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap my-4">
      <div className="px-2.5 py-1.5 rounded-md text-xs text-center leading-snug bg-[var(--color-surface-muted)] border border-[var(--color-border-light)] text-[var(--color-text-secondary)] min-w-[80px]">
        <div>{inputLabel}</div>
        <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">embedding</div>
      </div>
      <span className="text-sm text-[var(--color-text-muted)]">&times;</span>
      <div className={`px-2.5 py-1.5 rounded-md text-xs text-center leading-snug border-[1.5px] font-medium min-w-[80px] ${matrixColor}`}>
        <div>{matrixLabel}</div>
        <div className="text-[10px] mt-0.5 font-normal opacity-70">weight matrix</div>
      </div>
      <span className="text-sm text-[var(--color-text-muted)]">=</span>
      <div className={`px-2.5 py-1.5 rounded-md text-xs text-center leading-snug border font-medium min-w-[80px] ${outputColor}`}>
        <div>{outputLabel}</div>
        <div className="text-[10px] mt-0.5 font-normal opacity-70">vector</div>
      </div>
    </div>
  );
}

// --- Page Content Components ---

function IntroPage() {
  return (
    <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3 mt-4">
      <p>
        In Stop 2, we saw self-attention let every word look at every other word
        simultaneously. But we glossed over a critical question:{' '}
        <strong className="text-[var(--color-text)]">
          how does the model decide what&rsquo;s relevant?
        </strong>
      </p>
      <p>
        When{' '}
        <strong className="text-[var(--color-text)]">&ldquo;faulty&rdquo;</strong>{' '}
        looks at{' '}
        <strong className="text-[var(--color-text)]">&ldquo;storage controller,&rdquo;</strong>{' '}
        how does it know that&rsquo;s the right match? What mechanism lets it
        score &ldquo;storage controller&rdquo; at 48% attention while giving
        &ldquo;technician&rdquo; only 3%?
      </p>
      <p>
        The answer lies in giving each word not one identity, but{' '}
        <strong className="text-[var(--color-text)]">three</strong>.
      </p>
    </div>
  );
}

function ThreeRolesPage() {
  return (
    <div>
      <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3 mt-4 mb-5">
        <p>
          Each word gets <strong className="text-[var(--color-text)]">three separate vector
          representations</strong>, created by multiplying its <strong className="text-[var(--color-text)]">embedding</strong> — the
          vector that captures the word's meaning, from Stop 1 — by three
          different weight matrices. Each representation serves a distinct role:
        </p>
      </div>

      <div className="space-y-3 mb-5">
        <RoleCard
          letter="Q"
          color="text-[var(--color-primary)]"
          borderColor="border-[var(--color-primary)]"
          bgColor="bg-[var(--color-primary-bg)]"
          question={'"What am I looking for?"'}
          description="The Query — encodes what information this word needs from other words."
        />
        <RoleCard
          letter="K"
          color="text-[var(--color-teal-text)]"
          borderColor="border-[var(--color-teal)]"
          bgColor="bg-[var(--color-teal-bg)]"
          question={'"What do I contain?"'}
          description="The Key — encodes what information this word advertises to other words."
        />
        <RoleCard
          letter="V"
          color="text-[var(--color-amber-text,var(--color-text))]"
          borderColor="border-[var(--color-amber)]"
          bgColor="bg-[var(--color-amber-bg,var(--color-surface-muted))]"
          question={'"What information do I carry?"'}
          description="The Value — carries the actual content that gets passed along when a match is found."
        />
      </div>

      <Panel>
        <PanelHeader>The library analogy</PanelHeader>
        <InfoBox>
          Think of a library. The <strong>Query</strong> is the question you bring
          to the librarian. The <strong>Key</strong> is the label on each
          book&rsquo;s spine. The <strong>Value</strong> is the actual content
          inside the book. You match your question against the labels to find
          relevant books, then read their contents.
        </InfoBox>
        <InfoBox>
          Every word simultaneously plays all three roles. &ldquo;faulty&rdquo;
          has its own Query (for when it needs information from other words),
          its own Key (so other words can find it), and its own Value (the
          information it delivers when found).
        </InfoBox>
      </Panel>
    </div>
  );
}

function QueryPage() {
  return (
    <div>
      <MatrixDiagram
        inputLabel={'"faulty"'}
        matrixLabel={<>W<sub>Q</sub></>}
        outputLabel="Q"
        matrixColor="border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-text)]"
        outputColor="border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-text)]"
      />

      <Panel>
        <PanelHeader>Query: &ldquo;What am I looking for?&rdquo;</PanelHeader>
        <InfoBox>
          The Query vector is created by multiplying a word&rsquo;s embedding by{' '}
          <strong>W<sub>Q</sub></strong> &mdash; a weight matrix learned during
          training. It encodes what this word is &ldquo;looking for&rdquo; in the
          context of the current sentence.
        </InfoBox>
        <InfoBox>
          The Query is position-specific and context-dependent. The same word in a
          different sentence might produce a different Query, because it&rsquo;s
          looking for different information.
        </InfoBox>
        <InfoBox html={`Consider <strong>"faulty"</strong> in our sentence. Its Query essentially
          encodes: <em>"What property am I describing? What was faulty?"</em> This
          Query will be compared against every other word's Key to find the best
          match — and "storage controller" will score highest because its Key
          advertises exactly the kind of information the Query is seeking.`}
        />
      </Panel>
    </div>
  );
}

function KeyPage() {
  return (
    <div>
      <MatrixDiagram
        inputLabel={'"controller"'}
        matrixLabel={<>W<sub>K</sub></>}
        outputLabel="K"
        matrixColor="border-[var(--color-teal)] bg-[var(--color-teal-bg)] text-[var(--color-teal-text)]"
        outputColor="border-[var(--color-teal)] bg-[var(--color-teal-bg)] text-[var(--color-teal-text)]"
      />

      <Panel>
        <PanelHeader>Key: &ldquo;What do I contain?&rdquo;</PanelHeader>
        <InfoBox>
          The Key vector is created by multiplying the embedding for
          &ldquo;controller&rdquo; by{' '}
          <strong>W<sub>K</sub></strong>. It encodes what information the word
          &ldquo;controller&rdquo; &ldquo;advertises&rdquo; to other words &mdash;
          a summary of what it offers to any word that might be looking for it.
        </InfoBox>
        <InfoBox>
          The Key for &ldquo;controller&rdquo; would advertise something
          like: <em>&ldquo;I am a hardware component that could have properties
          like working, broken, or faulty.&rdquo;</em> It&rsquo;s not the full
          information &mdash; just enough to be found by the right Query.
        </InfoBox>
        <InfoBox>
          This is why the library analogy works so well. You don&rsquo;t need to
          read an entire book to know it&rsquo;s relevant &mdash; you just check
          the spine. The Key is the spine label: compact, descriptive, designed
          to help searchers decide if this word is worth attending to.
        </InfoBox>
      </Panel>
    </div>
  );
}

function ValuePage() {
  return (
    <div>
      <MatrixDiagram
        inputLabel={'"controller"'}
        matrixLabel={<>W<sub>V</sub></>}
        outputLabel="V"
        matrixColor="border-[var(--color-amber)] bg-[var(--color-surface-muted)] text-[var(--color-text)]"
        outputColor="border-[var(--color-amber)] bg-[var(--color-surface-muted)] text-[var(--color-text)]"
      />

      <Panel>
        <PanelHeader>Value: &ldquo;What information do I carry?&rdquo;</PanelHeader>
        <InfoBox>
          The Value vector is created by multiplying the embedding by{' '}
          <strong>W<sub>V</sub></strong>. It carries the actual information that
          will be passed along if this word is found to be relevant.
        </InfoBox>
        <InfoBox>
          The Value is the payload &mdash; the content inside the book. Once
          &ldquo;faulty&rdquo;&rsquo;s Query matches &ldquo;controller&rdquo;&rsquo;s
          Key, the model retrieves &ldquo;controller&rdquo;&rsquo;s{' '}
          <strong>Value</strong> vector. That Value carries the rich semantic
          information: what a controller is, that it&rsquo;s a hardware component,
          that it&rsquo;s the subject being described.
        </InfoBox>
        <InfoBox>
          Notice the separation of concerns: the Key helped <em>find</em> this
          word, but the Value is what gets <em>delivered</em>. They&rsquo;re
          computed by different weight matrices because finding and delivering
          are fundamentally different jobs.
        </InfoBox>
      </Panel>
    </div>
  );
}

function WhyThreePage() {
  return (
    <div>
      <Panel>
        <PanelHeader>Why three separate representations?</PanelHeader>
        <InfoBox>
          Why not just one vector per word? If the same vector had to serve as
          the search term <strong>and</strong> the thing being searched{' '}
          <strong>and</strong> the information delivered, these conflicting demands
          would compromise all three functions.
        </InfoBox>
        <InfoBox html={`Consider what each role optimizes for:<br/><br/>
          <strong>Query</strong> needs to encode <em>what's missing</em> — what this word needs from context.<br/><br/>
          <strong>Key</strong> needs to encode <em>what's available</em> — what this word offers to others.<br/><br/>
          <strong>Value</strong> needs to encode <em>rich content</em> — the full information payload.<br/><br/>
          These are three different optimization targets. A single vector forced to serve all three roles would be a mediocre compromise at each one.`}
        />
        <InfoBox>
          Three is the minimum for clean separation of concerns. You need a way
          to search (Query), a way to be found (Key), and a way to deliver
          information (Value). Fewer than three, and at least two of these jobs
          collide. This isn&rsquo;t an arbitrary design choice &mdash; it&rsquo;s
          the minimum architecture that lets searching, matching, and
          information transfer each be optimized independently.
        </InfoBox>
      </Panel>
    </div>
  );
}

function CacheRevealPage() {
  return (
    <div>
      <Panel>
        <PanelHeader>The insight that drives the rest of this course</PanelHeader>
        <InfoBox>
          <strong>Query vectors are ephemeral.</strong> Each word computes its Q,
          uses it once for matching against every Key, and discards it. The Query
          has done its job &mdash; it found the relevant words. There&rsquo;s no
          reason to keep it around.
        </InfoBox>
        <InfoBox>
          <strong>Key and Value vectors are persistent.</strong> Once computed,
          they need to be stored so that every <em>future</em> word can match
          against them and retrieve their information. When the model processes
          word 15 (&ldquo;faulty&rdquo;), it needs the Key and Value vectors for{' '}
          <strong>all 14 previous words</strong> to compute attention. Those K and
          V vectors must be stored somewhere.
        </InfoBox>
        <InfoBox>
          That storage is the <strong>KV cache</strong>.
        </InfoBox>
      </Panel>

      <Callout
        type="note"
        message={`<strong>This is why it's called the KV cache — not QKV cache.</strong> Q is computed fresh for each new word and then thrown away. K and V are computed once and cached, because every subsequent word will need them. The asymmetry between Q (ephemeral) and K/V (persistent) is the entire reason the cache exists — and the entire reason it grows with every word the model processes.`}
      />

      <Panel className="mt-4">
        <PanelHeader>What the KV cache stores</PanelHeader>
        <div className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            {WORDS.map((word, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-[22px] h-[22px] rounded flex items-center justify-center text-[9px] font-bold border border-[var(--color-teal)] bg-[var(--color-teal-bg)] text-[var(--color-teal-text)]">
                    K
                  </div>
                  <div className="w-[22px] h-[22px] rounded flex items-center justify-center text-[9px] font-bold border border-[var(--color-amber)] bg-[var(--color-surface-muted)] text-[var(--color-text)]">
                    V
                  </div>
                </div>
                <span className="text-[9px] text-[var(--color-text-muted)] max-w-[48px] text-center overflow-hidden text-ellipsis whitespace-nowrap">
                  {word}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-[var(--color-text-secondary)]">
            Every word&rsquo;s Key and Value vectors are stored in the cache. When
            a new word arrives, it computes a fresh Query and matches it against
            all cached Keys to find relevant words, then retrieves their Values.
          </div>
        </div>
      </Panel>
    </div>
  );
}

function BridgePage() {
  return (
    <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3 mt-4">
      <p>
        We now know that Q, K, and V come from weight matrices &mdash;{' '}
        <strong className="text-[var(--color-text)]">W<sub>Q</sub></strong>,{' '}
        <strong className="text-[var(--color-text)]">W<sub>K</sub></strong>, and{' '}
        <strong className="text-[var(--color-text)]">W<sub>V</sub></strong> &mdash;
        that transform each word&rsquo;s embedding into three specialized vectors.
      </p>
      <p>
        But where do those weight matrices come from? How did W<sub>Q</sub> learn
        to produce Queries that find the right Keys? How did W<sub>K</sub> learn
        to advertise the right information? How did W<sub>V</sub> learn to carry
        the right payload?
      </p>
      <p>
        The answer is <strong className="text-[var(--color-text)]">training</strong>{' '}
        &mdash; billions of examples where the model predicted the next word, got
        it wrong, and adjusted those matrices slightly to do better next time.
        That&rsquo;s the story of our next stop.
      </p>
    </div>
  );
}

// --- Narration text for each page ---

const NARRATIONS = {
  intro:
    '<strong>Stop 3: One Identity Isn\u2019t Enough.</strong> In Stop 2, we saw that attention lets every word check every other word directly. But we left a question unanswered: how does the model actually decide which words are relevant? The answer requires giving each word not one representation, but three.',

  'three-roles':
    'Every word in the sentence gets <strong>three separate vectors</strong> \u2014 Query, Key, and Value \u2014 each created by a different weight matrix. These three roles are the mechanism that makes attention work. Let\u2019s see what each one does.',

  query:
    'The <strong>Query</strong> vector encodes what a word is looking for. When "faulty" needs to figure out <em>what</em> is faulty, its Query captures that search intent \u2014 and it will be compared against every other word\u2019s Key to find the answer.',

  key:
    'The <strong>Key</strong> vector encodes what a word advertises to other words. "controller" needs a Key that says "I\u2019m a component that could have properties" \u2014 so that when "faulty"\u2019s Query comes looking, it gets a strong match.',

  value:
    'The <strong>Value</strong> vector carries the actual information payload. Once a Query matches a Key, the corresponding Value is what gets delivered. The Key gets you found; the Value is what you deliver.',

  'why-three':
    'Why three vectors instead of one? Because searching, being found, and delivering information are three fundamentally different jobs. A single vector trying to do all three would be a compromise at each. <strong>Three is the minimum for clean separation of concerns.</strong>',

  'cache-reveal':
    'Here is the insight that drives the rest of this course. Query vectors are used once and discarded. But <strong>Key and Value vectors must persist</strong> \u2014 every future word needs them. That persistent storage is the <strong>KV cache</strong>, and it\u2019s why this course exists.',

  bridge:
    'Q, K, and V come from learned weight matrices. But how did those matrices learn to produce the right vectors? How did W<sub>Q</sub> learn to ask good questions and W<sub>K</sub> learn to give good answers? That\u2019s the story of <strong>training</strong> \u2014 our next stop.',
};

// --- Main Component ---

export default function QueryKeyValue() {
  const [pageIndex, setPageIndex] = useState(0);
  const isDark = useDarkMode();

  const page = PAGES[pageIndex];
  const narration = NARRATIONS[page.id] || '';

  // Whether to highlight Q/K words in sentence display
  const showQuery = page.id === 'query' || page.id === 'cache-reveal';
  const showKey = page.id === 'key' || page.id === 'value' || page.id === 'cache-reveal';

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

  // Keyboard: PageDown/PageUp or [ ] for pages
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

      {/* Sentence panel — always visible */}
      <Panel className="mb-5">
        <PanelHeader>Example sentence</PanelHeader>
        <SentenceRow highlightQ={showQuery} highlightK={showKey} />
      </Panel>

      {/* Page content */}
      <div className="min-h-[200px]">
        {page.id === 'intro' && <IntroPage />}
        {page.id === 'three-roles' && <ThreeRolesPage />}
        {page.id === 'query' && <QueryPage />}
        {page.id === 'key' && <KeyPage />}
        {page.id === 'value' && <ValuePage />}
        {page.id === 'why-three' && <WhyThreePage />}
        {page.id === 'cache-reveal' && <CacheRevealPage />}
        {page.id === 'bridge' && <BridgePage />}
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
