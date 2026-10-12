/**
 * T3, T4 and friends: honest error/partial/empty states, URL history, keyboard grid navigation, detail drawer.
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { createTestApi, isPage } from '../../../tests/msw/controllable';
import { countText, expectedTotal } from '../../../tests/expected';
import { renderApp } from '../../../tests/render';

const api = createTestApi();
beforeAll(() => api.server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => api.reset());
afterAll(() => api.server.close());

const user = userEvent.setup();
const grid = () => screen.getByRole('grid');
const loadedRows = () =>
  within(grid())
    .queryAllByRole('row')
    .filter((r) => r.dataset.ticketId);
const hasStatus = (status: string) => (url: URL) => url.searchParams.get('status') === status;

describe('list states', () => {
  it('replaces old results with an error and Retry when a newer query fails (never shows stale rows)', async () => {
    renderApp('/tickets');
    await screen.findByText(countText(10_000));
    expect(loadedRows().length).toBeGreaterThan(0);

    api.fail(hasStatus('open'));
    await user.click(screen.getByRole('checkbox', { name: 'Open' }));

    expect(await screen.findByText('Couldn’t load tickets')).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(screen.queryByText(countText(10_000))).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load tickets'));

    api.fail(() => false);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText(countText(expectedTotal({ status: ['open'] })));
    for (const row of loadedRows()) expect(row).toHaveTextContent('Open');
  });

  it('shows a partial failure for just the failed page and retries only that page', async () => {
    // Rows ~40–50 are visible, so pages 0 and 1 are fetched; page 1 fails.
    api.fail(isPage(1));
    renderApp('/tickets?row=40');
    expect(await screen.findByText('Some rows couldn’t be loaded')).toBeInTheDocument();
    expect(screen.getByText(/Rows 51–100 failed to load/)).toBeInTheDocument();
    expect(loadedRows().length).toBeGreaterThan(0); // page 0 rows are still shown — they are current
    expect(within(grid()).getAllByText(/couldn’t be loaded/).length).toBeGreaterThan(0);

    api.fail(() => false);
    api.log.length = 0;
    await user.click(screen.getByRole('button', { name: 'Retry failed rows' }));
    await waitFor(() => expect(screen.queryByText('Some rows couldn’t be loaded')).not.toBeInTheDocument());
    expect(api.listRequests().map((r) => r.url.searchParams.get('page'))).toEqual(['1']);
  });

  it('shows an empty state that can clear the search', async () => {
    renderApp('/tickets?q=no-such-ticket-anywhere&priority=urgent');
    expect(await screen.findByText('No tickets match')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No tickets match'));
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    await screen.findByText(countText(10_000));
    expect(screen.getByRole('searchbox', { name: 'Search tickets' })).toHaveValue('');
  });
});

describe('URL state', () => {
  it('pushes filter changes to history so Back restores the previous view', async () => {
    const { router } = renderApp('/tickets');
    await screen.findByText(countText(10_000));
    await user.click(screen.getByRole('checkbox', { name: 'Urgent' }));
    await screen.findByText(countText(expectedTotal({ priority: ['urgent'] })));
    expect(router.state.location.search).toBe('?priority=urgent');

    await act(() => router.navigate(-1));
    await screen.findByText(countText(10_000));
    expect(screen.getByRole('checkbox', { name: 'Urgent' })).not.toBeChecked();

    await act(() => router.navigate(1));
    await screen.findByText(countText(expectedTotal({ priority: ['urgent'] })));
    expect(screen.getByRole('checkbox', { name: 'Urgent' })).toBeChecked();
  });

  it('restores sort and scroll position from a shared link', async () => {
    renderApp('/tickets?sort=subject&row=1200');
    await screen.findByText(countText(10_000));
    expect(screen.getByRole('columnheader', { name: /Subject/ })).toHaveAttribute('aria-sort', 'ascending');
    // Row 1200 is the first visible row; a few overscan rows render above it but nothing from the top of the list.
    await waitFor(() => {
      const indexes = loadedRows().map((r) => Number(r.getAttribute('aria-rowindex')) - 2);
      expect(indexes).toContain(1200);
      expect(Math.min(...indexes)).toBeGreaterThan(1150);
    });
    expect(screen.getByText('Page 25 of 200')).toBeInTheDocument();
  });

  it('pager jumps update the URL and scroll the grid', async () => {
    const { router } = renderApp('/tickets');
    await screen.findByText(countText(10_000));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(router.state.location.search).toBe('?row=50');
    await waitFor(() => {
      const indexes = loadedRows().map((r) => Number(r.getAttribute('aria-rowindex')) - 2);
      expect(indexes).toContain(50);
      expect(Math.min(...indexes)).toBeGreaterThan(30);
    });
  });
});

describe('keyboard grid', () => {
  it('has one tab stop and moves through virtualized rows with arrows and End', async () => {
    renderApp('/tickets');
    await screen.findByText(countText(10_000));
    const tabbable = within(grid())
      .getAllByRole('row')
      .filter((r) => r.tabIndex === 0);
    expect(tabbable).toHaveLength(1);

    tabbable[0]?.focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toHaveAttribute('aria-rowindex', '3');

    await user.keyboard('{End}');
    await waitFor(() => expect(document.activeElement).toHaveAttribute('aria-rowindex', String(10_000 + 1)));
    expect(grid()).toHaveAttribute('aria-rowcount', String(10_000 + 1));
  });
});

describe('detail drawer', () => {
  it('opens from a row, keeps filters, and closing returns to the same list and row', async () => {
    const { router } = renderApp('/tickets?priority=urgent');
    await screen.findByText(countText(expectedTotal({ priority: ['urgent'] })));
    const row = loadedRows()[1];
    if (!row) throw new Error('expected a loaded row');
    const ticketId = row.dataset.ticketId;

    row.focus();
    await user.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog');
    expect(router.state.location.pathname).toBe(`/tickets/${ticketId}`);
    expect(router.state.location.search).toBe('?priority=urgent');
    expect(await within(dialog).findByText(ticketId ?? '')).toBeInTheDocument();
    expect(grid()).toBeInTheDocument(); // the list stays mounted underneath

    await user.click(within(dialog).getByRole('button', { name: 'Close ticket details' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/tickets');
    expect(router.state.location.search).toBe('?priority=urgent');
    expect(document.activeElement).toHaveAttribute('data-ticket-id', ticketId);
  });

  it('supports deep links, including unknown tickets', async () => {
    renderApp('/tickets/TCK-000042?status=open');
    expect(await screen.findByRole('dialog', { name: /./ })).toBeInTheDocument();
    expect(await within(screen.getByRole('dialog')).findByText('TCK-000042')).toBeInTheDocument();

    renderApp('/tickets/TCK-999999');
    expect(await screen.findByRole('dialog', { name: 'Ticket not found' })).toBeInTheDocument();
  });
});
