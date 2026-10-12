import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router';
import { formatCount } from '../../lib/format';
import { countActiveFilters, resultSetKey } from '../../lib/url-state';
import { encodeSort, Sort } from '../../shared/contract';
import { Button, Drawer, SelectField } from '../../ui';
import { ActiveFilters } from './ActiveFilters';
import { SORT_OPTIONS } from './columns';
import { FiltersPanel } from './FiltersPanel';
import { EmptyState, ErrorState, PartialFailureBanner } from './ListStates';
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
  const filtersToggleRef = useRef<HTMLButtonElement>(null);
  const activeFilters = countActiveFilters(state);
  const location = useLocation();
  const navigationType = useNavigationType();
  // Counts Back/Forward moves (a key comparison alone misses returning to the first entry). Unchanged by our own
  // push/replace writes. Derived during render from the previous location, per React's guidance.
  const [history, setHistory] = useState({ key: location.key, pops: 0 });
  if (location.key !== history.key) {
    setHistory({ key: location.key, pops: history.pops + (navigationType === 'POP' ? 1 : 0) });
  }
  const historyKey = String(history.pops);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 id={HEADING_ID} className={styles.title}>
            Support tickets
          </h1>
          <p className={styles.subtitle}>
            Search, filter and sort every ticket. Your view is saved in the URL.
          </p>
        </div>
      </header>
      <div className={styles.layout}>
        <FiltersPanel
          id={FILTERS_ID}
          variant="sidebar"
          filters={state}
          onChange={explorer.setFilters}
          onClear={explorer.clearFilters}
        />
        <Results
          explorer={explorer}
          toolbar={
            <div className={styles.toolbar}>
              <SearchBox value={state.q} onCommit={explorer.setSearch} historyKey={historyKey} />
              {/* Narrow screens: the sidebar is hidden and filters open in a sheet (modal dialog). */}
              <Button
                ref={filtersToggleRef}
                className={styles.filtersToggle}
                icon="sliders"
                aria-haspopup="dialog"
                onClick={() => setFiltersOpen(true)}
              >
                Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
              </Button>
              {/* Narrow layouts hide some sortable columns; this keeps every sort reachable (WCAG 1.4.10). */}
              <SelectField
                className={styles.sortSelect}
                label="Sort by"
                hideLabel
                options={SORT_OPTIONS}
                value={encodeSort(state.sort)}
                onChange={(e) => {
                  const raw = e.target.value;
                  const parsed = Sort.safeParse({
                    field: raw.replace(/^-/, ''),
                    dir: raw.startsWith('-') ? 'desc' : 'asc',
                  });
                  if (parsed.success) explorer.setSort(parsed.data);
                }}
              />
            </div>
          }
        />
      </div>
      {filtersOpen && (
        <Drawer
          title="Filters"
          closeLabel="Close filters"
          onClose={() => setFiltersOpen(false)}
          // Explicit: Safari doesn't focus buttons on click, so "previously focused" may be <body>.
          returnFocus={() => filtersToggleRef.current?.focus()}
        >
          <FiltersPanel
            id={`${FILTERS_ID}-sheet`}
            variant="sheet"
            filters={state}
            onChange={explorer.setFilters}
            onClear={explorer.clearFilters}
            onDone={() => setFiltersOpen(false)}
          />
        </Drawer>
      )}
      {/* Nested detail route (drawer) renders here, over the still-mounted list. */}
      <Outlet />
    </div>
  );
}

function Results({ explorer, toolbar }: { explorer: ExplorerParams; toolbar: ReactNode }) {
  const { state } = explorer;
  const setKey = resultSetKey(state);
  const [window, setWindow] = useState<RowWindow | null>(null);
  const list = useTicketPages(state, window);
  useListAnnouncements(setKey, list);

  // Controls that disappear while focused (Retry banners, the last filter chip) hand focus to the result count.
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const focusSummaryWhenSettled = useRef(false);
  const bannerShown = list.kind === 'error' || (list.kind === 'ready' && list.failedPages.length > 0);
  useEffect(() => {
    if (focusSummaryWhenSettled.current && !bannerShown && list.kind !== 'loading') {
      focusSummaryWhenSettled.current = false;
      summaryRef.current?.focus();
    }
  }, [bannerShown, list.kind]);
  const retry = (run: () => void) => () => {
    focusSummaryWhenSettled.current = true;
    run();
  };

  const visible = window?.setKey === setKey ? window : { start: state.row, end: state.row };
  const hasQuery = state.q !== '' || countActiveFilters(state) > 0;

  return (
    <section className={styles.results} aria-labelledby={HEADING_ID}>
      {toolbar}
      <div className={styles.summary}>
        <p ref={summaryRef} tabIndex={-1} className={styles.count}>
          {list.kind === 'ready' && `${formatCount(list.total)} ${list.total === 1 ? 'ticket' : 'tickets'}`}
          {list.kind === 'empty' && '0 tickets'}
          {list.kind === 'loading' && <span className={styles.muted}>Loading…</span>}
        </p>
        <ActiveFilters
          filters={state}
          onChange={explorer.setFilters}
          onAllRemoved={() => summaryRef.current?.focus()}
        />
      </div>

      {list.kind === 'ready' && list.failedPages.length > 0 && (
        <PartialFailureBanner
          pages={list.failedPages}
          pageSize={PAGE_SIZE}
          onRetry={retry(list.retryFailed)}
        />
      )}
      <div className={styles.card}>
        {list.kind === 'error' && (
          <ErrorState error={list.error} retrying={list.retrying} onRetry={retry(list.retry)} />
        )}
        {list.kind === 'empty' && <EmptyState canClear={hasQuery} onClear={explorer.clearAll} />}
        {(list.kind === 'loading' || list.kind === 'ready') && (
          <TicketGrid
            list={list}
            row={state.row}
            sort={state.sort}
            query={state.q}
            labelledBy={HEADING_ID}
            onSort={explorer.setSort}
            onWindowChange={setWindow}
            onAnchorRowChange={explorer.setAnchorRow}
            onOpen={explorer.openTicket}
          />
        )}
        {list.kind === 'ready' && (
          <Pager
            total={list.total}
            pageSize={PAGE_SIZE}
            row={state.row}
            visible={visible}
            onJump={explorer.jumpToRow}
          />
        )}
      </div>
    </section>
  );
}
