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
 *  - push for discrete choices (filters, sort, page jumps, opening a ticket) so Back undoes them one at a time;
 *  - replace for continuous input (typing, scrolling) so they don't flood history.
 * Any change to the result set resets the scroll anchor to the top.
 *
 * Discrete updates are flushed synchronously: controlled inputs (checkboxes, sort buttons) render from the URL, and
 * React Router's default transition would briefly revert a checkbox before the new URL lands.
 */
export function useExplorerParams() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = useMemo(() => parseExplorerParams(new URLSearchParams(location.search)), [location.search]);

  // The location our next write builds on. Synced from the router after each commit, and also advanced
  // immediately on every write — so two writes in the same tick (e.g. flushing the scroll anchor, then opening a
  // ticket) compose instead of the second one overwriting the first with a stale base.
  const latest = useRef({
    state,
    pathname: location.pathname,
    search: location.search,
    historyState: location.state,
  });
  useLayoutEffect(() => {
    latest.current = {
      state,
      pathname: location.pathname,
      search: location.search,
      historyState: location.state,
    };
  }, [state, location.pathname, location.search, location.state]);

  const update = useCallback(
    (patch: Partial<ExplorerState>, replace: boolean) => {
      const current = latest.current;
      const nextState = { ...current.state, ...patch };
      const next = serializeExplorerState(nextState).toString();
      const nextSearch = next ? `?${next}` : '';
      if (nextSearch === current.search) return;
      latest.current = { ...current, state: nextState, search: nextSearch };
      // Explicit pathname: a search-only `to` would resolve against the route and could drop the open ticket.
      // Replacing keeps the entry's history state (e.g. "opened from list"), which a late debounce must not erase.
      navigate(
        { pathname: current.pathname, search: nextSearch },
        { replace, flushSync: !replace, state: replace ? current.historyState : undefined },
      );
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
      openTicket: (ticketId: string) => {
        const { search } = latest.current;
        latest.current = {
          ...latest.current,
          pathname: `/tickets/${ticketId}`,
          historyState: { fromList: true },
        };
        navigate({ pathname: `/tickets/${ticketId}`, search }, { state: { fromList: true } });
      },
    }),
    [update, navigate],
  );

  return { state, ...actions };
}

export type ExplorerParams = ReturnType<typeof useExplorerParams>;
