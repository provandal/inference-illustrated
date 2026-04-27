import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { tourSteps } from '../data/tourSteps';
import { streamChat } from '../utils/chatApi';
import ChatSettings from './ChatSettings';

/* ------------------------------------------------------------------ */
/* Simple inline markdown: bold, italic, inline code, code blocks     */
/* ------------------------------------------------------------------ */
function renderMarkdown(text) {
  // Split on fenced code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    // Fenced code block
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner = part.slice(3, -3).replace(/^\w*\n?/, ''); // strip optional language tag
      return (
        <pre
          key={i}
          className="my-2 rounded bg-[var(--color-surface-muted)] p-2 text-xs overflow-x-auto font-mono"
        >
          {inner}
        </pre>
      );
    }

    // Inline markdown — process line by line to handle line breaks
    const lines = part.split('\n');
    return lines.map((line, li) => (
      <span key={`${i}-${li}`}>
        {li > 0 && <br />}
        {renderInline(line)}
      </span>
    ));
  });
}

function renderInline(text) {
  // Order matters: bold before italic so ** is matched first
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[4]}</em>);
    } else if (match[5]) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-[var(--color-surface-muted)] px-1 py-0.5 text-xs font-mono"
        >
          {match[6]}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length ? parts : text;
}

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */
function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M13.5 8a5.5 5.5 0 00-.15-.88l1.5-1.18-.97-1.68-1.83.55a5.5 5.5 0 00-1.52-.88L10.15 2H8.22l-.38 1.93a5.5 5.5 0 00-1.52.88l-1.83-.55-.97 1.68 1.5 1.18a5.6 5.6 0 000 1.76l-1.5 1.18.97 1.68 1.83-.55c.44.38.95.68 1.52.88L8.22 14h1.93l.38-1.93a5.5 5.5 0 001.52-.88l1.83.55.97-1.68-1.5-1.18c.1-.29.15-.58.15-.88z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round">
      <path d="M1 1l12 12M13 1L1 13" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2L7 9" />
      <path d="M14 2l-5 12-2-5-5-2z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */
export default function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [input, setInput] = useState('');

  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);
  const currentResponseRef = useRef('');

  const currentStep = useStore((s) => s.currentStep);
  const mode = useStore((s) => s.mode);

  // Auto-scroll on new content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  // Cleanup on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function handleClose() {
    abortRef.current?.abort();
    setIsOpen(false);
    setMessages([]);
    setCurrentResponse('');
    setIsStreaming(false);
    setInput('');
  }

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const apiKey = localStorage.getItem('llmApiKey');
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    const endpoint = localStorage.getItem('llmEndpoint') || 'https://api.openai.com/v1';
    const model = localStorage.getItem('llmModel') || 'gpt-4o';

    // Build context from current page
    const step = tourSteps[currentStep];
    const pageContent = document.querySelector('main')?.textContent?.slice(0, 6000) || '';

    const systemPrompt = mode === 'tour'
      ? `You are a helpful assistant for "Inference Illustrated," an interactive educational tool about LLM architecture and KV cache infrastructure. The user is currently viewing:

Stop: ${step.stopNumber} - ${step.title}
Page content:
${pageContent}

Answer questions about this content. Be concise and accurate. If the question is about something covered in a different stop, mention which stop covers it.`
      : `You are a helpful assistant for "Inference Illustrated," an interactive educational tool about LLM architecture and KV cache infrastructure. The user is on the landing page. Answer questions about LLM inference, attention mechanisms, and KV cache infrastructure. Be concise and accurate.`;

    const newUserMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);
    setCurrentResponse('');
    currentResponseRef.current = '';

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...updatedMessages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const { abort } = streamChat({
      endpoint,
      apiKey,
      model,
      messages: apiMessages,
      onChunk: (chunk) => {
        currentResponseRef.current += chunk;
        setCurrentResponse(currentResponseRef.current);
      },
      onDone: (fullText) => {
        setMessages((prev) => [...prev, { role: 'assistant', content: fullText }]);
        setCurrentResponse('');
        currentResponseRef.current = '';
        setIsStreaming(false);
      },
      onError: (errorMsg) => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: errorMsg, isError: true },
        ]);
        setCurrentResponse('');
        currentResponseRef.current = '';
        setIsStreaming(false);
      },
    });

    abortRef.current = { abort };
  }, [input, isStreaming, messages, currentStep, mode]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /* ---- Collapsed bubble ---- */
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed z-40 flex items-center justify-center
                   w-14 h-14 rounded-full shadow-lg
                   text-white transition-all duration-300 ease-in-out
                   hover:scale-110 cursor-pointer"
        style={{
          right: '1rem',
          bottom: '1rem',
          background: 'var(--color-primary)',
        }}
        title="Ask about this page"
      >
        <ChatIcon />
      </button>
    );
  }

  /* ---- Expanded panel ---- */
  return (
    <>
      {showSettings && (
        <ChatSettings
          onClose={() => setShowSettings(false)}
          onSave={() => setShowSettings(false)}
        />
      )}

      <div
        className="fixed z-40 flex flex-col
                   border border-[var(--color-border)] rounded-xl shadow-2xl
                   bg-[var(--color-surface)]
                   transition-all duration-300 ease-in-out"
        style={{
          right: '1rem',
          bottom: '1rem',
          width: 'min(380px, calc(100vw - 2rem))',
          height: 'min(520px, 80vh)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]
                      rounded-t-xl bg-[var(--color-surface-alt)]"
        >
          <h3 className="text-sm font-semibold flex-1">Ask about this page</h3>
          <button
            onClick={() => setShowSettings(true)}
            className="w-7 h-7 flex items-center justify-center rounded
                       hover:bg-[var(--color-surface-muted)] transition-colors
                       text-[var(--color-text-muted)] cursor-pointer"
            title="Settings"
          >
            <GearIcon />
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded
                       hover:bg-[var(--color-surface-muted)] transition-colors
                       text-[var(--color-text-muted)] cursor-pointer"
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.length === 0 && !currentResponse && (
            <div className="text-center text-xs text-[var(--color-text-muted)] mt-8 px-4">
              Ask a question about the content you're viewing. Your conversation
              will use the current page as context.
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[var(--color-primary)] text-white'
                    : msg.isError
                      ? 'bg-[var(--color-red-bg)] text-[var(--color-red-text)] border border-[var(--color-red)]'
                      : 'bg-[var(--color-surface-alt)] text-[var(--color-text)]'
                }`}
              >
                {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {isStreaming && currentResponse && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed
                              bg-[var(--color-surface-alt)] text-[var(--color-text)]">
                {renderMarkdown(currentResponse)}
              </div>
            </div>
          )}

          {/* Loading dots */}
          {isStreaming && !currentResponse && (
            <div className="flex justify-start">
              <div className="rounded-lg px-3 py-2 text-sm
                              bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[var(--color-border)] p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder={isStreaming ? 'Waiting for response...' : 'Ask a question...'}
              className="flex-1 rounded-lg border border-[var(--color-border)]
                         bg-[var(--color-surface-alt)] px-3 py-2 text-sm
                         text-[var(--color-text)]
                         focus:outline-none focus:border-[var(--color-primary)]
                         placeholder:text-[var(--color-text-muted)]
                         disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-lg
                         bg-[var(--color-primary)] text-white
                         hover:opacity-90 transition-opacity
                         disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Send"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
