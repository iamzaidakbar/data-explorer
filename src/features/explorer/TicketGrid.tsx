import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Sort } from '../../shared/contract';
import { COLUMNS, ROW_HEIGHT, type Column } from './columns';
import { TicketRow } from './TicketRow';
import type { RowWindow, TicketListState } from './useTicketPages';
import styles from './explorer.module.css';

/** How long scrolling must pause before the anchor row is written to the URL (replaceState). */
export const ANCHOR_DEBOUNCE_MS = 250;
const OVERSCAN = 8;

type ReadyList = Extract<TicketListState, { kind: 'ready' }>;

export interface TicketGridProps {
  list: ReadyList;
  /** Anchor row from the URL. Changes not caused by our own scrolling (pager, Back/Forward) scroll the grid. */
  row: number;
  sort: Sort;
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

/**
 * Virtualized ARIA grid (ADR-0004, ADR-0007). Mounted once per result set (keyed by the parent), so a new search
 * always starts from a clean scroll position and virtualizer state. Only ~20–40 rows exist in the DOM.
 *
 * Focus model: one tab stop (roving tabindex on rows); arrows, PageUp/PageDown and Home/End move between rows,
 * Enter opens the ticket.
 */
export function TicketGrid({
  list,
  row,
  sort,
  labelledBy,
  onSort,
  onWindowChange,
  onAnchorRowChange,
  onOpen,
}: TicketGridProps) {
  const { total, setKey } = list;
  const scrollRef = useRef<HTMLDivElement>(null);
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
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
    initialOffset: initialRow * ROW_HEIGHT,
    onChange: (instance) => {
      // Visible rows only (no overscan): drives page fetching (which adds its own prefetch margin) and "Rows X–Y".
      const range = instance.range;
      if (range) callbacks.current.onWindowChange({ setKey, start: range.startIndex, end: range.endIndex });
      clearTimeout(anchorTimer.current);
      anchorTimer.current = setTimeout(() => {
        const top = instance.range?.startIndex ?? 0;
        if (top === reportedRow.current) return;
        reportedRow.current = top;
        callbacks.current.onAnchorRowChange(top);
      }, ANCHOR_DEBOUNCE_MS);
    },
  });

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
      Math.floor((scrollRef.current?.clientHeight ?? ROW_HEIGHT * 10) / ROW_HEIGHT) - 1,
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

  const items = virtualizer.getVirtualItems();
  // Exactly one row is tabbable. If the active row has scrolled out of the DOM, the first *visible* row stands in
  // (not the first rendered one: overscan rows are off-screen, and focusing one would scroll the list).
  const tabbableIndex = items.some((i) => i.index === activeIndex)
    ? activeIndex
    : (virtualizer.range?.startIndex ?? items[0]?.index);

  return (
    <div
      role="grid"
      aria-labelledby={labelledBy}
      aria-rowcount={total + 1}
      aria-colcount={COLUMNS.length}
      aria-busy={list.isFetching || undefined}
      className={styles.grid}
    >
      <div role="rowgroup" className={styles.head}>
        <div role="row" aria-rowindex={1} className={`${styles.row} ${styles.headRow}`}>
          {COLUMNS.map((column) => {
            const active = sort.field === column.sortField;
            const next = nextSort(column, sort);
            return (
              <div
                key={column.id}
                role="columnheader"
                aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={`${styles.cell} ${styles[`col-${column.id}`] ?? ''}`}
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
      {/* Arrow-key handling for the whole grid body; rows themselves handle Enter. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div role="rowgroup" ref={scrollRef} className={styles.body} onKeyDown={onKeyDown}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {items.map((item) => {
            const state = list.rowAt(item.index);
            return (
              <TicketRow
                key={item.key}
                index={item.index}
                start={item.start}
                status={state.kind}
                ticket={state.kind === 'loaded' ? state.ticket : undefined}
                tabbable={item.index === tabbableIndex}
                onOpen={onOpen}
                onFocusRow={onFocusRow}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
