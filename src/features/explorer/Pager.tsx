import { useId, useState } from 'react';
import { useAnnounce } from '../../lib/announcer';
import { formatCount } from '../../lib/format';
import { Button, TextField } from '../../ui';
import styles from './explorer.module.css';

export interface PagerProps {
  total: number;
  pageSize: number;
  /** Current anchor row (from the URL). */
  row: number;
  /** Rows currently visible, for the "Rows X–Y" summary. */
  visible: { start: number; end: number };
  onJump: (row: number) => void;
}

/** aria-disabled instead of disabled: a button that becomes disabled while focused would drop keyboard focus. */
function PageButton({ label, off, onGo }: { label: string; off: boolean; onGo: () => void }) {
  return (
    <Button size="sm" aria-disabled={off} onClick={() => !off && onGo()}>
      {label}
    </Button>
  );
}

/** Keyboard-friendly paging over the virtual list: each page jump scrolls to that page's first row. */
export function Pager({ total, pageSize, row, visible, onJump }: PagerProps) {
  const announce = useAnnounce();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  // When the end of the list is visible we are on the last page, even though the top visible row (the URL anchor)
  // may belong to an earlier page — the last page is often shorter than the viewport.
  const atEnd = visible.end >= total - 1;
  const page = atEnd ? pageCount - 1 : Math.min(pageCount - 1, Math.floor(row / pageSize));
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();
  const formId = useId();
  const go = (p: number) => onJump(Math.max(0, Math.min(pageCount - 1, p)) * pageSize);

  return (
    <nav aria-label="Pagination" className={styles.pager}>
      <p className={styles.muted}>
        Rows {formatCount(Math.min(visible.start + 1, total))}–{formatCount(Math.min(visible.end + 1, total))}{' '}
        of {formatCount(total)}
      </p>
      <div className={styles.pagerControls}>
        <PageButton label="First" off={page === 0} onGo={() => go(0)} />
        <PageButton label="Previous" off={page === 0} onGo={() => go(page - 1)} />
        <span aria-current="page">
          Page {formatCount(page + 1)} of {formatCount(pageCount)}
        </span>
        <PageButton label="Next" off={page >= pageCount - 1} onGo={() => go(page + 1)} />
        <PageButton label="Last" off={page >= pageCount - 1} onGo={() => go(pageCount - 1)} />
        <form
          id={formId}
          className={styles.pageJump}
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(draft);
            if (!Number.isInteger(n) || n < 1 || n > pageCount) {
              const message = `Enter a page from 1 to ${formatCount(pageCount)}`;
              setError(message);
              announce(message, 'assertive');
              return;
            }
            setError(undefined);
            setDraft('');
            go(n - 1);
          }}
        >
          <TextField
            className={styles.pageInput}
            label="Go to page"
            type="number"
            inputMode="numeric"
            min={1}
            max={pageCount}
            value={draft}
            error={error}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(undefined);
            }}
          />
          <Button size="sm" type="submit">
            Go
          </Button>
        </form>
      </div>
    </nav>
  );
}
