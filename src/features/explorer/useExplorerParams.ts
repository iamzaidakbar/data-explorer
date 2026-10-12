import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  EMPTY_FILTERS,
  parseExplorerParams,
  serializeExplorerState,
  type ExplorerFilters,
  type ExplorerState,
} from '../../lib/url-state';
import type { Sort } from '../../shared/contract';

/**
 * Reads and writes explorer state in the URL. History policy:
 *  - push for discrete choices (filters, sort, page jumps) so Back undoes them one at a time;
 *  - replace for continuous input (typing, scrolling) so they don't flood history.
 * Discrete updates are flushed synchronously: controlled inputs (checkboxes, sort buttons) render from the URL, and
 * React Router's default transition would briefly revert a checkbox before the new URL lands.
 * Any change to the result set resets the scroll anchor to the top.
 */
export function useExplorerParams() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = useMemo(() => parseExplorerParams(new URLSearchParams(location.search)), [location.search]);

  // Latest values for callbacks fired from timers/scroll handlers, without re-creating the callbacks.
  const latest = useRef({ state, pathname: location.pathname, search: location.search });
  useLayoutEffect(() => {
    latest.current = { state, pathname: location.pathname, search: location.search };
  });

  const update = useCallback(
    (patch: Partial<ExplorerState>, replace: boolean) => {
      const { state: current, pathname, search } = latest.current;
      const next = serializeExplorerState({ ...current, ...patch }).toString();
      const nextSearch = next ? `?${next}` : '';
      if (nextSearch === search) return;
      // Explicit pathname: a search-only `to` would resolve against the route and could drop the open ticket.
      navigate({ pathname, search: nextSearch }, { replace, flushSync: !replace });
    },
    [navigate],
  );

  const actions = useMemo(
    () => ({
      setSearch: (q: string) => update({ q, row: 0 }, true),
      setFilters: (patch: Partial<ExplorerFilters>) => update({ ...patch, row: 0 }, false),
      setSort: (sort: Sort) => update({ sort, row: 0 }, false),
      clearFilters: () => update({ ...EMPTY_FILTERS, row: 0 }, false),
      clearAll: () => update({ ...EMPTY_FILTERS, q: '', row: 0 }, false),
      jumpToRow: (row: number) => update({ row }, false),
      setAnchorRow: (row: number) => update({ row }, true),
    }),
    [update],
  );

  return { state, ...actions };
}

export type ExplorerParams = ReturnType<typeof useExplorerParams>;
