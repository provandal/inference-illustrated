// Shared UI components used across all stops

export function Panel({ children, className = '' }) {
  return (
    <div className={`border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] ${className}`}>
      {children}
    </div>
  );
}

export function PanelHeader({ children }) {
  return (
    <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] rounded-t-lg">
      <span className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
        {children}
      </span>
    </div>
  );
}

export function InfoBox({ html, children, className = '' }) {
  const base = `px-4 py-3 text-[13px] leading-relaxed border-b border-[var(--color-border-light)] last:border-b-0 text-[var(--color-text-secondary)] ${className}`;
  if (html) {
    return <div className={base} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <div className={base}>{children}</div>;
}

export function Callout({ type, message }) {
  const styles = {
    note: 'bg-[var(--color-blue-bg)] text-[var(--color-blue-text)] border-l-[var(--color-blue)] border-[var(--color-blue)]',
    warn: 'bg-[var(--color-red-bg)] text-[var(--color-red-text)] border-l-[var(--color-red)] border-[var(--color-red)]',
    good: 'bg-[var(--color-teal-bg)] text-[var(--color-teal-text)] border-l-[var(--color-teal)] border-[var(--color-teal)]',
  };
  return (
    <div
      className={`px-4 py-3 text-[13px] leading-relaxed my-4 rounded-r-lg border border-l-[3px] ${styles[type]}`}
      dangerouslySetInnerHTML={{ __html: message }}
    />
  );
}

export function SectionLabel({ children }) {
  return (
    <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2 mt-1">
      {children}
    </div>
  );
}
