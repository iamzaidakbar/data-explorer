import { useId, useState } from 'react';
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

/** Keyboard-friendly paging over the virtual list: each page jump scrolls to that page's first row. */
export function Pager({ total, pageSize, row, visible, onJump }: PagerProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pageCount - 1, Math.floor(row / pageSize));
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
        <Button size="sm" onClick={() => go(0)} disabled={page === 0}>
          First
        </Button>
        <Button size="sm" onClick={() => go(page - 1)} disabled={page === 0}>
          Previous
        </Button>
        <span aria-current="page">
          Page {formatCount(page + 1)} of {formatCount(pageCount)}
        </span>
        <Button size="sm" onClick={() => go(page + 1)} disabled={page >= pageCount - 1}>
          Next
        </Button>
        <Button size="sm" onClick={() => go(pageCount - 1)} disabled={page >= pageCount - 1}>
          Last
        </Button>
        <form
          id={formId}
          className={styles.pageJump}
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(draft);
            if (!Number.isInteger(n) || n < 1 || n > pageCount) {
              setError(`Enter a page from 1 to ${formatCount(pageCount)}`);
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
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button size="sm" type="submit">
            Go
          </Button>
        </form>
      </div>
    </nav>
  );
}
