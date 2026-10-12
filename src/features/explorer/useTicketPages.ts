import { useQueries, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import { fetchTicketPage } from '../../lib/api-client';
import { resultSetKey, toTicketQuery, type ExplorerState } from '../../lib/url-state';
import type { Ticket, TicketPage } from '../../shared/contract';

export const PAGE_SIZE = 50;
/** Rows assumed visible before the grid has measured itself. */
const INITIAL_WINDOW_ROWS = 20;
/** Fetch the neighbouring page when the viewport is this close to it, so normal scrolling rarely shows skeletons. */
const PREFETCH_ROWS = 25;

/**
 * Cache key for one page of one result set. `setKey` is the canonical serialization of every parameter that
 * affects results, so a response can only ever be stored under — and rendered for — the query that asked for it.
 * This is the core stale-result guarantee (ADR-0003); request cancellation is an optimisation on top.
 */
export const ticketPageKey = (setKey: string, page: number) => ['tickets', setKey, page] as const;

/** Visible rows as last reported by the grid, tagged with the result set they were measured for. */
export interface RowWindow {
  setKey: string;
  start: number;
  end: number;
}

export type RowState =
  | { kind: 'loaded'; ticket: Ticket }
  | { kind: 'loading' }
  /** The page's request is paused until the browser is back online. */
  | { kind: 'offline' }
  | { kind: 'failed'; page: number };

export type TicketListState =
  | { kind: 'loading' }
  /** Nothing loaded for this result set and the request is paused until the browser is back online. */
  | { kind: 'offline' }
  | { kind: 'error'; error: Error; retrying: boolean; retry: () => void; failedAt: number }
  | { kind: 'empty' }
  | {
      kind: 'ready';
      setKey: string;
      total: number;
      rowAt: (index: number) => RowState;
      /** Pages in view that failed and are not currently retrying: the partial-failure state. */
      failedPages: number[];
      /** Changes on every new page failure, so repeated failures can be announced again. */
      failureStamp: number;
      retryFailed: () => void;
      isFetching: boolean;
    };

/**
 * Total for a result set from any cached page of it whose latest fetch succeeded. Never reads another set's pages,
 * and never trusts a page whose most recent refetch failed.
 */
function cachedTotal(queryClient: QueryClient, setKey: string): number | undefined {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: ['tickets', setKey] })) {
    const page = query.state.data as TicketPage | undefined;
    if (page && query.state.status === 'success') return page.total;
  }
  return undefined;
}

/**
 * A page is usable only if its latest fetch succeeded. TanStack Query keeps the previous `data` when a refetch
 * fails (e.g. after staleTime), and showing it would present old rows as current — the assignment forbids that.
 */
const isUsable = (r: UseQueryResult<TicketPage> | undefined) => !!r?.data && r.status === 'success';
const hasFailed = (r: UseQueryResult<TicketPage> | undefined) => !!r && r.status === 'error' && !r.isFetching;
/** TanStack Query pauses (rather than fails) requests while offline and resumes them on reconnect. */
const isPaused = (r: UseQueryResult<TicketPage> | undefined) => r?.fetchStatus === 'paused';

export function useTicketPages(state: ExplorerState, window: RowWindow | null): TicketListState {
  const queryClient = useQueryClient();
  const setKey = resultSetKey(state);
  const knownTotal = cachedTotal(queryClient, setKey);

  // Until the grid has measured this result set, assume the viewport starts at the URL's anchor row.
  const visible =
    window && window.setKey === setKey && knownTotal !== undefined
      ? window
      : { start: state.row, end: state.row + INITIAL_WINDOW_ROWS };
  const anchorPage = Math.floor(visible.start / PAGE_SIZE);
  const lastPage = knownTotal === undefined ? Infinity : Math.max(0, Math.ceil(knownTotal / PAGE_SIZE) - 1);
  const firstWanted = Math.max(0, Math.floor((visible.start - PREFETCH_ROWS) / PAGE_SIZE));
  const lastWanted = Math.max(
    firstWanted,
    Math.min(lastPage, Math.floor((visible.end + PREFETCH_ROWS) / PAGE_SIZE)),
  );
  const pages: number[] = [];
  for (let p = firstWanted; p <= lastWanted; p++) pages.push(p);

  const results = useQueries({
    queries: pages.map((page) => ({
      queryKey: ticketPageKey(setKey, page),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchTicketPage(toTicketQuery(state, page, PAGE_SIZE), signal),
    })),
  });

  const byPage = new Map(pages.map((page, i) => [page, results[i]]));
  const anchor = byPage.get(anchorPage);
  // knownTotal only counts pages whose latest fetch succeeded, so it stays valid when every *visible* page fails:
  // that is a partial failure (rows marked failed), not a reason to discard the whole result set.
  const total = results.find(isUsable)?.data?.total ?? knownTotal;

  if (total === undefined) {
    if (anchor?.status === 'error') {
      return {
        kind: 'error',
        error: anchor.error,
        retrying: anchor.isFetching,
        retry: () => void anchor.refetch(),
        failedAt: anchor.errorUpdatedAt,
      };
    }
    return isPaused(anchor) ? { kind: 'offline' } : { kind: 'loading' };
  }
  if (total === 0) return { kind: 'empty' };

  const failedPages = pages.filter((page) => hasFailed(byPage.get(page)));

  return {
    kind: 'ready',
    setKey,
    total,
    failedPages,
    failureStamp: failedPages.reduce((sum, page) => sum + (byPage.get(page)?.errorUpdatedAt ?? 0), 0),
    isFetching: results.some((r) => r?.isFetching),
    retryFailed: () => failedPages.forEach((page) => void byPage.get(page)?.refetch()),
    rowAt: (index): RowState => {
      const page = Math.floor(index / PAGE_SIZE);
      const result = byPage.get(page);
      const ticket = isUsable(result) ? result?.data?.items[index - page * PAGE_SIZE] : undefined;
      if (ticket) return { kind: 'loaded', ticket };
      if (isPaused(result)) return { kind: 'offline' };
      if (hasFailed(result)) return { kind: 'failed', page };
      return { kind: 'loading' };
    },
  };
}
