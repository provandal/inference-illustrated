import { useState } from 'react';

export default function ChatSettings({ onClose, onSave }) {
  const [endpoint, setEndpoint] = useState(
    () => localStorage.getItem('llmEndpoint') || 'https://api.openai.com/v1'
  );
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('llmApiKey') || ''
  );
  const [model, setModel] = useState(
    () => localStorage.getItem('llmModel') || 'gpt-4o'
  );

  function handleSave() {
    localStorage.setItem('llmEndpoint', endpoint);
    localStorage.setItem('llmApiKey', apiKey);
    localStorage.setItem('llmModel', model);
    onSave();
  }

  function handleClear() {
    localStorage.removeItem('llmEndpoint');
    localStorage.removeItem('llmApiKey');
    localStorage.removeItem('llmModel');
    setEndpoint('https://api.openai.com/v1');
    setApiKey('');
    setModel('gpt-4o');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-[var(--color-border)]
                    bg-[var(--color-surface)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Chat Settings</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded
                       hover:bg-[var(--color-surface-alt)] transition-colors
                       text-[var(--color-text-muted)] cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">
              API Endpoint URL
            </span>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)]
                         px-3 py-2 text-sm text-[var(--color-text)]
                         focus:outline-none focus:border-[var(--color-primary)]
                         placeholder:text-[var(--color-text-muted)]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">
              API Key
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)]
                         px-3 py-2 text-sm text-[var(--color-text)]
                         focus:outline-none focus:border-[var(--color-primary)]
                         placeholder:text-[var(--color-text-muted)]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">
              Model
            </span>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o"
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)]
                         px-3 py-2 text-sm text-[var(--color-text)]
                         focus:outline-none focus:border-[var(--color-primary)]
                         placeholder:text-[var(--color-text-muted)]"
            />
          </label>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSave}
            className="flex-1 rounded bg-[var(--color-primary)] px-4 py-2 text-sm
                       font-medium text-white hover:opacity-90 transition-opacity cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={handleClear}
            className="rounded border border-[var(--color-border)] px-4 py-2 text-sm
                       text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]
                       transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>

        <p className="mt-4 text-[10px] leading-snug text-[var(--color-text-muted)]">
          Your API key is stored only in your browser's localStorage and sent
          directly to the endpoint you configure. It is never shared with us or
          any third party.
        </p>
      </div>
    </div>
  );
}
