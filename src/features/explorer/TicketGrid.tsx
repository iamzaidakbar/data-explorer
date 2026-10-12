import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Sort } from '../../shared/contract';
import { Skeleton } from '../../ui';
import { COLUMNS, getRowHeight, type Column } from './columns';
import { SLOW_HINT_MS } from './ListStates';
import { TicketRow } from './TicketRow';
import type { RowWindow, TicketListState } from './useTicketPages';
import styles from './explorer.module.css';

/** How long scrolling must pause before the anchor row is written to the URL (replaceState). */
export const ANCHOR_DEBOUNCE_MS = 250;
const OVERSCAN = 8;

type ReadyList = Extract<TicketListState, { kind: 'ready' }>;

export interface TicketGridProps {
  /** Loading renders the header with a loading body, so header controls (sort) keep focus across result sets. */
  list: ReadyList | { kind: 'loading' };
  /** Anchor row from the URL. Changes not caused by our own scrolling (pager, Back/Forward) scroll the grid. */
  row: number;
  sort: Sort;
  query: string;
  labelledBy: string;
  onSort: (sort: Sort) => void;
  onWindowChange: (window: RowWindow) => void;
  onAnchorRowChange: (row: number) => void;
  onOpen: (ticketId: string) => void;
}

function nextSort(column: Column, current: Sort): Sort | null {
  if (!column.sortField) return null;
  if (current.field === column.sortField)
    return { field: column.sortField, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { field: column.sortField, dir: column.defaultDir ?? 'asc' };
}

const colClass = (id: string) => `${styles.cell} ${styles[`col-${id}`] ?? ''}`;

/**
 * ARIA grid (ADR-0004, ADR-0007). The shell — grid element and header row — stays mounted while results load and
 * across result sets, so a focused sort button keeps focus. Only the virtualized body is remounted per result set
 * (`key`), which gives every new search a clean scroll position and virtualizer.
 */
export function TicketGrid({ list, row, sort, query, labelledBy, onSort, ...bodyProps }: TicketGridProps) {
  return (
    <div
      role="grid"
      aria-labelledby={labelledBy}
      aria-rowcount={list.kind === 'ready' ? list.total + 1 : -1}
      aria-colcount={COLUMNS.length}
      aria-busy={list.kind === 'loading' || undefined}
      className={styles.grid}
    >
      <div role="rowgroup" className={styles.head}>
        <div role="row" aria-rowindex={1} className={`${styles.row} ${styles.headRow}`}>
          {COLUMNS.map((column, i) => {
            const active = sort.field === column.sortField;
            const next = nextSort(column, sort);
            return (
              <div
                key={column.id}
                role="columnheader"
                aria-colindex={i + 1}
                aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={colClass(column.id)}
              >
                {next ? (
                  <button
                    type="button"
                    className={`${styles.sortButton} ${active ? styles.sortActive : ''}`}
                    onClick={() => onSort(next)}
                  >
                    {column.label}
                    <span aria-hidden="true" className={styles.sortIcon}>
                      {active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                ) : (
                  column.label
                )}
              </div>
            );
          })}
        </div>
      </div>
      {list.kind === 'ready' ? (
        <GridBody key={list.setKey} list={list} row={row} {...bodyProps} />
      ) : (
        <LoadingBody query={query} />
      )}
    </div>
  );
}

function LoadingBody({ query }: { query: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_HINT_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <div role="rowgroup" className={styles.body}>
      <div role="row" className={`${styles.row} ${styles.loadingRow}`}>
        <div role="gridcell" aria-colindex={1} aria-colspan={COLUMNS.length} className={styles.loadingCell}>
          <p className={styles.stateTitle}>{query ? `Searching for “${query}”…` : 'Loading tickets…'}</p>
          {slow && (
            <p className={styles.muted}>The server is responding slowly. Still waiting for results…</p>
          )}
          <div className={styles.skeletonRows} aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <Skeleton width={`${55 + ((i * 17) % 40)}%`} />
                <Skeleton />
                <Skeleton />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type GridBodyProps = Pick<TicketGridProps, 'row' | 'onWindowChange' | 'onAnchorRowChange' | 'onOpen'> & {
  list: ReadyList;
};

/**
 * Virtualized rows (~20–40 in the DOM). Focus model: one tab stop (roving tabindex on rows); arrows,
 * PageUp/PageDown and Home/End move between rows, Enter opens the ticket.
 */
function GridBody({ list, row, onWindowChange, onAnchorRowChange, onOpen }: GridBodyProps) {
  const { total, setKey } = list;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rowHeight] = useState(getRowHeight);
  const [initialRow] = useState(() => Math.min(row, total - 1));
  const [activeIndex, setActiveIndex] = useState(initialRow);
  const reportedRow = useRef(row);
  const pendingFocus = useRef(false);
  const anchorTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep the latest callbacks in refs: the virtualizer's onChange fires from scroll handlers.
  const callbacks = useRef({ onWindowChange, onAnchorRowChange });
  useEffect(() => {
    callbacks.current = { onWindowChange, onAnchorRowChange };
  });

  // TanStack Virtual returns a mutable instance, so the React Compiler can't memoize this component; we don't use
  // the compiler, and rows are memoized by hand instead (TicketRow).
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: total,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN,
    initialOffset: initialRow * rowHeight,
    onChange: (instance) => {
      // Visible rows only (no overscan): drives page fetching (which adds its own prefetch margin) and "Rows X–Y".
      const range = instance.range;
      if (range) callbacks.current.onWindowChange({ setKey, start: range.startIndex, end: range.endIndex });
      clearTimeout(anchorTimer.current);
      anchorTimer.current = setTimeout(writeAnchor, ANCHOR_DEBOUNCE_MS);
    },
  });

  function writeAnchor() {
    clearTimeout(anchorTimer.current);
    // Read the real scroll position: right after mount the virtualizer's range can lag it (by the overscan).
    const top = Math.floor((scrollRef.current?.scrollTop ?? 0) / rowHeight);
    if (top === reportedRow.current) return;
    reportedRow.current = top;
    callbacks.current.onAnchorRowChange(top);
  }

  useEffect(() => () => clearTimeout(anchorTimer.current), []);

  // External anchor changes (pager, Back/Forward, edited URL) scroll the grid; our own writes are ignored.
  useEffect(() => {
    if (row === reportedRow.current) return;
    reportedRow.current = row;
    virtualizer.scrollToIndex(Math.min(row, total - 1), { align: 'start' });
  }, [row, total, virtualizer]);

  // Move DOM focus to the active row once it has been rendered (it may need to scroll into existence first).
  useEffect(() => {
    if (!pendingFocus.current) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (el) {
      el.focus({ preventScroll: true });
      pendingFocus.current = false;
    }
  });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const pageRows = Math.max(
      1,
      Math.floor((scrollRef.current?.clientHeight ?? rowHeight * 10) / rowHeight) - 1,
    );
    const moves: Record<string, number> = {
      ArrowDown: activeIndex + 1,
      ArrowUp: activeIndex - 1,
      PageDown: activeIndex + pageRows,
      PageUp: activeIndex - pageRows,
      Home: 0,
      End: total - 1,
    };
    const target = moves[e.key];
    if (target === undefined) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(total - 1, target));
    setActiveIndex(next);
    pendingFocus.current = true;
    virtualizer.scrollToIndex(next, { align: 'auto' });
  };

  const onFocusRow = useCallback((index: number) => setActiveIndex(index), []);
  // Record the current scroll position on the list's own history entry *before* opening a ticket, so a pending
  // debounced write can't land on the ticket's entry instead.
  const openRow = useCallback(
    (ticketId: string) => {
      if (anchorTimer.current !== undefined) writeAnchor();
      onOpen(ticketId);
    },
    // writeAnchor only touches refs and the stable virtualizer instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onOpen],
  );

  const items = virtualizer.getVirtualItems();
  // Exactly one row is tabbable. If the active row has scrolled out of the DOM, the first *visible* row stands in
  // (not the first rendered one: overscan rows are off-screen, and focusing one would scroll the list).
  const tabbableIndex = items.some((i) => i.index === activeIndex)
    ? activeIndex
    : (virtualizer.range?.startIndex ?? items[0]?.index);

  return (
    // Arrow-key handling for the whole grid body; rows themselves handle Enter.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div role="rowgroup" ref={scrollRef} className={styles.body} onKeyDown={onKeyDown}>
      <div role="presentation" style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {items.map((item) => {
          const state = list.rowAt(item.index);
          return (
            <TicketRow
              key={item.key}
              index={item.index}
              start={item.start}
              height={rowHeight}
              status={state.kind}
              ticket={state.kind === 'loaded' ? state.ticket : undefined}
              tabbable={item.index === tabbableIndex}
              onOpen={openRow}
              onFocusRow={onFocusRow}
            />
          );
        })}
      </div>
    </div>
  );
}
