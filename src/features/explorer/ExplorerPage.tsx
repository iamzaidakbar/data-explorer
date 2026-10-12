import { useCallback, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { formatCount } from '../../lib/format';
import { countActiveFilters, resultSetKey } from '../../lib/url-state';
import { Button } from '../../ui';
import { ActiveFilters } from './ActiveFilters';
import { FiltersPanel } from './FiltersPanel';
import { EmptyState, ErrorState, LoadingState, PartialFailureBanner } from './ListStates';
import { Pager } from './Pager';
import { SearchBox } from './SearchBox';
import { TicketGrid } from './TicketGrid';
import { useExplorerParams, type ExplorerParams } from './useExplorerParams';
import { useListAnnouncements } from './useListAnnouncements';
import { PAGE_SIZE, useTicketPages, type RowWindow } from './useTicketPages';
import styles from './explorer.module.css';

const HEADING_ID = 'tickets-heading';
const FILTERS_ID = 'ticket-filters';

export function ExplorerPage() {
  const explorer = useExplorerParams();
  const { state } = explorer;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = countActiveFilters(state);

  return (
    <div className={styles.page}>
      <div className={styles.titleBar}>
        <h1 id={HEADING_ID} className={styles.title}>
          Support tickets
        </h1>
        <SearchBox value={state.q} onCommit={explorer.setSearch} />
        <Button
          className={styles.filtersToggle}
          aria-expanded={filtersOpen}
          aria-controls={FILTERS_ID}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
        </Button>
      </div>
      <div className={styles.layout}>
        <FiltersPanel
          id={FILTERS_ID}
          open={filtersOpen}
          filters={state}
          onChange={explorer.setFilters}
          onClear={explorer.clearFilters}
        />
        <Results explorer={explorer} />
      </div>
      {/* Nested detail route (drawer) renders here, over the still-mounted list. */}
      <Outlet />
    </div>
  );
}

function Results({ explorer }: { explorer: ExplorerParams }) {
  const { state } = explorer;
  const setKey = resultSetKey(state);
  const [window, setWindow] = useState<RowWindow | null>(null);
  const list = useTicketPages(state, window);
  useListAnnouncements(setKey, list);

  const navigate = useNavigate();
  const { search } = useLocation();
  const openTicket = useCallback(
    (ticketId: string) =>
      navigate({ pathname: `/tickets/${ticketId}`, search }, { state: { fromList: true } }),
    [navigate, search],
  );

  const visible = window?.setKey === setKey ? window : { start: state.row, end: state.row };
  const hasQuery = state.q !== '' || countActiveFilters(state) > 0;

  return (
    <section className={styles.results} aria-labelledby={HEADING_ID}>
      <div className={styles.summary}>
        <p className={styles.count}>
          {list.kind === 'ready' && `${formatCount(list.total)} ${list.total === 1 ? 'ticket' : 'tickets'}`}
          {list.kind === 'empty' && '0 tickets'}
          {list.kind === 'loading' && <span className={styles.muted}>Loading…</span>}
        </p>
        <ActiveFilters filters={state} onChange={explorer.setFilters} />
      </div>

      {list.kind === 'loading' && <LoadingState query={state.q} />}
      {list.kind === 'error' && (
        <ErrorState error={list.error} retrying={list.retrying} onRetry={list.retry} />
      )}
      {list.kind === 'empty' && <EmptyState canClear={hasQuery} onClear={explorer.clearAll} />}
      {list.kind === 'ready' && (
        <>
          {list.failedPages.length > 0 && (
            <PartialFailureBanner pages={list.failedPages} pageSize={PAGE_SIZE} onRetry={list.retryFailed} />
          )}
          <TicketGrid
            key={setKey}
            list={list}
            row={state.row}
            sort={state.sort}
            labelledBy={HEADING_ID}
            onSort={explorer.setSort}
            onWindowChange={setWindow}
            onAnchorRowChange={explorer.setAnchorRow}
            onOpen={openTicket}
          />
          <Pager
            total={list.total}
            pageSize={PAGE_SIZE}
            row={state.row}
            visible={visible}
            onJump={explorer.jumpToRow}
          />
        </>
      )}
    </section>
  );
}
