/**
 * Regression tests for issues found in the Phase 6/7 code review (race/state and accessibility reviewers).
 * Each test failed (or would fail) against the pre-review code.
 */
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestApi, isPage } from '../../../tests/msw/controllable';
import { countText, expectedTotal } from '../../../tests/expected';
import { renderApp } from '../../../tests/render';
import { resultSetKey, DEFAULT_STATE } from '../../lib/url-state';
import { ticketPageKey } from './useTicketPages';

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

it('a failed refetch of cached data shows the failure instead of the old rows', async () => {
  const { queryClient } = renderApp('/tickets');
  await screen.findByText(countText(10_000));
  const subject = loadedRows()[0]?.textContent ?? '';
  expect(subject).not.toBe('');

  // Simulate staleTime expiry, then make the refetch fail.
  api.fail(isPage(0));
  await act(() => queryClient.invalidateQueries({ queryKey: ticketPageKey(resultSetKey(DEFAULT_STATE), 0) }));

  // Page 0 is the only page fetched for this viewport, so with it failed nothing about the result set is current:
  // the full error state replaces the old rows. (With other pages loaded it would be a partial failure instead.)
  expect(await screen.findByText('Couldn’t load tickets')).toBeInTheDocument();
  expect(screen.queryByRole('row', { name: subject })).not.toBeInTheDocument();
});

it('sorting keeps keyboard focus on the sort button while the new results load', async () => {
  renderApp('/tickets');
  await screen.findByText(countText(10_000));
  const sortByPriority = screen.getByRole('button', { name: 'Priority' });
  sortByPriority.focus();
  await user.keyboard('{Enter}');
  await waitFor(() =>
    expect(screen.getByRole('columnheader', { name: /Priority/ })).toHaveAttribute('aria-sort'),
  );
  expect(screen.getByRole('button', { name: 'Priority' })).toHaveFocus();
});

it('removing the last filter chip moves focus to the result count instead of losing it', async () => {
  renderApp('/tickets?priority=urgent');
  await screen.findByText(countText(expectedTotal({ priority: ['urgent'] })));
  await user.click(screen.getByRole('button', { name: 'Remove filter Priority: Urgent' }));
  await screen.findByText(countText(10_000));
  expect(screen.getByText(countText(10_000))).toHaveFocus();
});

it('a retry that fails again is announced again', async () => {
  api.fail(() => true);
  renderApp('/tickets');
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load tickets'));
  // Clear the region, retry (fails again): the error must be re-announced.
  await act(async () => {
    screen.getByRole('alert').textContent = '';
  });
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load tickets'));
});

it('Last page stays on the last page and does not keep adding history entries', async () => {
  // 1,201 open+urgent-ish results is not guaranteed; use any filter whose last page is shorter than the viewport.
  const total = expectedTotal({ status: ['open'] });
  const { router } = renderApp('/tickets?status=open');
  await screen.findByText(countText(total));
  const pages = Math.ceil(total / 50);
  await user.click(screen.getByRole('button', { name: 'Last' }));
  await waitFor(() => expect(screen.getByText(`Page ${pages} of ${pages}`)).toBeInTheDocument());
  // Let the scroll anchor settle, then Next must be inert.
  await new Promise((r) => setTimeout(r, 400));
  expect(screen.getByText(`Page ${pages} of ${pages}`)).toBeInTheDocument();
  const before = router.state.location.key;
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(router.state.location.key).toBe(before);
});

it('a scroll anchor pending when a ticket opens is written to the list entry, and closing returns to it', async () => {
  const { router } = renderApp('/tickets');
  await screen.findByText(countText(10_000));
  const body = grid().querySelectorAll('[role="rowgroup"]')[1] as HTMLElement;
  act(() => body.scrollTo({ top: 300 * 56 }));
  // Open a row immediately, before the 250 ms anchor debounce fires.
  const row = await waitFor(() => {
    const r = loadedRows().find((el) => el.getAttribute('aria-rowindex') === String(300 + 2));
    if (!r) throw new Error('row 300 not rendered yet');
    return r;
  });
  await user.click(row);
  await screen.findByRole('dialog');
  await new Promise((r) => setTimeout(r, 400)); // any stray debounce would fire now
  expect(router.state.location.state).toEqual({ fromList: true });

  await user.click(screen.getByRole('button', { name: 'Close ticket details' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(router.state.historyAction).toBe('POP');
  expect(router.state.location.search).toBe('?row=300');
});

it('a search debounce pending when the user presses Back does not overwrite the entry they returned to', async () => {
  const { router } = renderApp('/tickets');
  await screen.findByText(countText(10_000));
  await user.click(screen.getByRole('checkbox', { name: 'Urgent' }));
  await screen.findByText(countText(expectedTotal({ priority: ['urgent'] })));

  await user.type(screen.getByRole('searchbox', { name: 'Search tickets' }), 'ab');
  await act(() => router.navigate(-1)); // within the 300 ms debounce
  await new Promise((r) => setTimeout(r, 400));
  expect(router.state.location.search).toBe('');
  expect(screen.getByRole('searchbox', { name: 'Search tickets' })).toHaveValue('');
});

it('closing the drawer twice in quick succession steps back only once', async () => {
  const { router } = renderApp('/tickets');
  await screen.findByText(countText(10_000));
  const row = loadedRows()[0];
  if (!row) throw new Error('no row');
  await user.click(row);
  const dialog = await screen.findByRole('dialog');
  const closeButton = within(dialog).getByRole('button', { name: 'Close ticket details' });
  act(() => {
    closeButton.click();
    closeButton.click();
  });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(router.state.location.pathname).toBe('/tickets');
  expect(screen.getByText(countText(10_000))).toBeInTheDocument();
});
