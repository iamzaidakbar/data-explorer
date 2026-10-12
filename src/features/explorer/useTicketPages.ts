import { useQueries, useQueryClient, type QueryClient } from '@tanstack/react-query';
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
  { kind: 'loaded'; ticket: Ticket } | { kind: 'loading' } | { kind: 'failed'; page: number };

export type TicketListState =
  | { kind: 'loading' }
  | { kind: 'error'; error: Error; retrying: boolean; retry: () => void }
  | { kind: 'empty' }
  | {
      kind: 'ready';
      setKey: string;
      total: number;
      rowAt: (index: number) => RowState;
      /** Pages in view that failed and are not currently retrying: the partial-failure state. */
      failedPages: number[];
      retryFailed: () => void;
      isFetching: boolean;
    };

/** Total for a result set from any cached page of it. Never reads another set's pages. */
function cachedTotal(queryClient: QueryClient, setKey: string): number | undefined {
  for (const [, page] of queryClient.getQueriesData<TicketPage>({ queryKey: ['tickets', setKey] })) {
    if (page) return page.total;
  }
  return undefined;
}

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
  const total = results.find((r) => r?.data)?.data?.total ?? knownTotal;

  if (total === undefined) {
    const anchor = byPage.get(anchorPage);
    if (anchor?.isError) {
      return {
        kind: 'error',
        error: anchor.error,
        retrying: anchor.isFetching,
        retry: () => void anchor.refetch(),
      };
    }
    return { kind: 'loading' };
  }
  if (total === 0) return { kind: 'empty' };

  const failedPages = pages.filter((page) => {
    const r = byPage.get(page);
    return r?.isError && !r.data && !r.isFetching;
  });

  return {
    kind: 'ready',
    setKey,
    total,
    failedPages,
    isFetching: results.some((r) => r?.isFetching),
    retryFailed: () => failedPages.forEach((page) => void byPage.get(page)?.refetch()),
    rowAt: (index) => {
      const page = Math.floor(index / PAGE_SIZE);
      const result = byPage.get(page);
      const ticket = result?.data?.items[index - page * PAGE_SIZE];
      if (ticket) return { kind: 'loaded', ticket };
      if (result?.isError && !result.isFetching) return { kind: 'failed', page };
      return { kind: 'loading' };
    },
  };
}
