import { useId, useState } from 'react';
import { useAnnounce } from '../../lib/announcer';
import { formatCount } from '../../lib/format';
import { Button, IconButton, TextField, type IconName } from '../../ui';
import styles from './explorer.module.css';

export interface PagerProps {
  total: number;
  pageSize: number;
  /** Rows currently visible, for the "Rows X–Y" summary. */
  visible: { start: number; end: number };
  onJump: (row: number) => void;
}

/** aria-disabled instead of disabled: a button that becomes disabled while focused would drop keyboard focus. */
function PageButton({
  label,
  icon,
  showLabel,
  off,
  onGo,
}: {
  label: string;
  icon: IconName;
  showLabel?: boolean;
  off: boolean;
  onGo: () => void;
}) {
  if (!showLabel) {
    return (
      <IconButton
        label={label}
        icon={icon}
        size="sm"
        variant="ghost"
        aria-disabled={off}
        onClick={() => !off && onGo()}
      />
    );
  }
  const iconProps = icon === 'chevronLeft' ? { icon } : { iconEnd: icon };
  // The visible text collapses to the icon on phones; aria-label keeps the same accessible name everywhere.
  return (
    <Button
      size="sm"
      variant="ghost"
      {...iconProps}
      aria-label={label}
      aria-disabled={off}
      onClick={() => !off && onGo()}
    >
      <span className={styles.pageLabel}>{label}</span>
    </Button>
  );
}

/** Keyboard-friendly paging over the virtual list: each page jump scrolls to that page's first row. */
export function Pager({ total, pageSize, visible, onJump }: PagerProps) {
  const announce = useAnnounce();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  // When the end of the list is visible we are on the last page, even though the top visible row (the URL anchor)
  // may belong to an earlier page — the last page is often shorter than the viewport.
  const atEnd = visible.end >= total - 1;
  // The visible range updates on every scroll frame; the URL anchor (`row`) only after scrolling pauses.
  const page = atEnd ? pageCount - 1 : Math.min(pageCount - 1, Math.floor(visible.start / pageSize));
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();
  const formId = useId();
  const go = (p: number) => onJump(Math.max(0, Math.min(pageCount - 1, p)) * pageSize);

  return (
    <nav aria-label="Pagination" className={styles.pager}>
      <p className={styles.rowsInfo}>
        Rows{' '}
        <strong>
          {formatCount(Math.min(visible.start + 1, total))}–{formatCount(Math.min(visible.end + 1, total))}
        </strong>{' '}
        of <strong>{formatCount(total)}</strong>
      </p>
      <div className={styles.pagerControls}>
        <PageButton label="First" icon="chevronsLeft" off={page === 0} onGo={() => go(0)} />
        <PageButton
          label="Previous"
          icon="chevronLeft"
          showLabel
          off={page === 0}
          onGo={() => go(page - 1)}
        />
        <span aria-current="page" className={styles.pageStatus}>
          Page {formatCount(page + 1)} of {formatCount(pageCount)}
        </span>
        <PageButton
          label="Next"
          icon="chevronRight"
          showLabel
          off={page >= pageCount - 1}
          onGo={() => go(page + 1)}
        />
        <PageButton
          label="Last"
          icon="chevronsRight"
          off={page >= pageCount - 1}
          onGo={() => go(pageCount - 1)}
        />
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
            size="sm"
            inline
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
