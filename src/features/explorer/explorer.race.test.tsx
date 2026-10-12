/**
 * T1, T2, T5: stale results, cancellation and debounce under adversarial response ordering.
 * Requests are held by a controllable MSW server and released in whatever order the test chooses.
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestApi, hasQ } from '../../../tests/msw/controllable';
import { countText, expectedTotal } from '../../../tests/expected';
import { renderApp } from '../../../tests/render';

const api = createTestApi();
beforeAll(() => api.server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => api.reset());
afterAll(() => api.server.close());

const user = userEvent.setup();
const searchbox = () => screen.getByRole('searchbox', { name: 'Search tickets' });
const loadedRows = () =>
  within(screen.getByRole('grid'))
    .queryAllByRole('row')
    .filter((r) => r.dataset.ticketId);

async function search(term: string) {
  await user.clear(searchbox());
  await user.type(searchbox(), term);
}

describe('never shows stale results', () => {
  it('ignores a slow response for an older search that arrives after the newer one', async () => {
    const { router } = renderApp('/tickets');
    await screen.findByText(countText(10_000));
    api.hold((url) => url.searchParams.has('q'));

    await search('refund');
    await waitFor(() => expect(api.findHeld(hasQ('refund'))).toBeDefined());
    await search('headphones');
    await waitFor(() => expect(api.findHeld(hasQ('headphones'))).toBeDefined());

    // Newer request answers first…
    api.findHeld(hasQ('headphones'))?.release();
    const headphones = expectedTotal({ q: 'headphones' });
    await screen.findByText(countText(headphones));

    // …then the older, slower one finally answers.
    api.findHeld(hasQ('refund'))?.release();
    await new Promise((r) => setTimeout(r, 50));

    expect(screen.getByText(countText(headphones))).toBeInTheDocument();
    expect(screen.queryByText(countText(expectedTotal({ q: 'refund' })))).not.toBeInTheDocument();
    for (const row of loadedRows()) expect(row).toHaveTextContent(/headphones/i);
    expect(router.state.location.search).toBe('?q=headphones');
  });

  it('stays correct even when the superseded request is not actually aborted on the network', async () => {
    // Strip AbortSignals so the old response really is delivered to the client.
    const realFetch = globalThis.fetch;
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input, init) => realFetch(input, { ...init, signal: undefined }));
    try {
      renderApp('/tickets');
      await screen.findByText(countText(10_000));
      api.hold((url) => url.searchParams.has('q'));
      await search('login');
      await waitFor(() => expect(api.findHeld(hasQ('login'))).toBeDefined());
      await search('billing');
      await waitFor(() => expect(api.findHeld(hasQ('billing'))).toBeDefined());

      api.findHeld(hasQ('billing'))?.release();
      const billing = expectedTotal({ q: 'billing' });
      await screen.findByText(countText(billing));
      api.findHeld(hasQ('login'))?.release();
      await new Promise((r) => setTimeout(r, 50));

      expect(screen.getByText(countText(billing))).toBeInTheDocument();
      for (const row of loadedRows()) expect(row).toHaveTextContent(/billing/i);
    } finally {
      spy.mockRestore();
    }
  });

  it('aborts the superseded request', async () => {
    renderApp('/tickets');
    await screen.findByText(countText(10_000));
    api.hold((url) => url.searchParams.has('q'));
    await search('refund');
    await waitFor(() => expect(api.findHeld(hasQ('refund'))).toBeDefined());
    const superseded = api.findHeld(hasQ('refund'));
    await search('desk');
    await waitFor(() => expect(superseded?.signal.aborted).toBe(true));
  });

  it('debounces typing into a single request and a single announcement', async () => {
    renderApp('/tickets');
    await screen.findByText(countText(10_000));
    api.log.length = 0;

    await user.type(searchbox(), 'thermo'); // six keystrokes, well inside the debounce window
    const total = expectedTotal({ q: 'thermo' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(`${countText(total)} found`));

    const searched = api.listRequests().map((r) => r.url.searchParams.get('q'));
    expect(searched.filter((q) => q !== null)).toEqual(['thermo']);
  });
});
