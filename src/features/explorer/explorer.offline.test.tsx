/**
 * Offline handling: requests pause (not fail) while offline, the UI says so honestly, and everything resumes on
 * reconnect. Online state is driven through TanStack's onlineManager — the same signal the browser's
 * online/offline events feed in production.
 */
import { onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestApi, hasQ, isPage } from '../../../tests/msw/controllable';
import { countText, expectedTotal } from '../../../tests/expected';
import { renderApp } from '../../../tests/render';

const api = createTestApi();
beforeAll(() => api.server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  act(() => onlineManager.setOnline(true));
  api.reset();
});
afterAll(() => api.server.close());

const user = userEvent.setup();
const goOffline = () => act(() => onlineManager.setOnline(false));
const goOnline = () => act(() => onlineManager.setOnline(true));
const loadedRows = () =>
  within(screen.getByRole('grid'))
    .queryAllByRole('row')
    .filter((r) => r.dataset.ticketId);

it('a search made offline waits honestly, makes no request, and loads on reconnect', async () => {
  renderApp('/tickets');
  await screen.findByText(countText(10_000));
  goOffline();
  expect(screen.getByText('You’re offline.')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('You’re offline'));

  await user.type(screen.getByRole('searchbox', { name: 'Search tickets' }), 'desk');
  expect(await screen.findByText('You’re offline', { selector: 'p' })).toBeInTheDocument();
  expect(screen.queryByRole('grid')).not.toBeInTheDocument(); // no stale rows from the previous search
  expect(api.listRequests().some((r) => hasQ('desk')(r.url))).toBe(false);

  goOnline();
  await screen.findByText(countText(expectedTotal({ q: 'desk' })));
  expect(screen.getByText('Back online')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/found|Back online/));
});

it('keeps loaded rows visible while offline, marks unloaded pages as waiting, and fills them on reconnect', async () => {
  renderApp('/tickets');
  await screen.findByText(countText(10_000));
  const before = loadedRows().length;
  goOffline();
  expect(loadedRows()).toHaveLength(before);

  // Scroll to rows whose page has not been fetched yet.
  const body = screen.getByRole('grid').querySelectorAll('[role="rowgroup"]')[1] as HTMLElement;
  act(() => body.scrollTo({ top: 400 * 56 }));
  expect((await screen.findAllByText(/waiting for connection/)).length).toBeGreaterThan(0);
  expect(api.listRequests().some((r) => isPage(8)(r.url))).toBe(false);

  goOnline();
  await waitFor(() => expect(screen.queryAllByText(/waiting for connection/)).toHaveLength(0));
  await waitFor(() =>
    expect(loadedRows().some((r) => r.getAttribute('aria-rowindex') === String(400 + 2))).toBe(true),
  );
});

it('a failure while online is retried automatically when the connection returns', async () => {
  api.fail(() => true);
  renderApp('/tickets');
  expect(await screen.findByText('Couldn’t load tickets')).toBeInTheDocument();

  api.fail(() => false);
  goOffline();
  goOnline();
  await screen.findByText(countText(10_000));
});

it('the ticket drawer explains that it is waiting for the connection', async () => {
  renderApp('/tickets');
  await screen.findByText(countText(10_000));
  goOffline();
  await user.click(loadedRows()[0] as HTMLElement);
  const dialog = await screen.findByRole('dialog');
  expect(
    await within(dialog).findByText(/will load automatically when your connection returns/),
  ).toBeInTheDocument();
  goOnline();
  await waitFor(() => expect(within(dialog).queryByText(/connection returns/)).not.toBeInTheDocument());
});
