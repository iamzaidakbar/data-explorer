import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createApiServer } from '../../tests/msw/server';
import { renderApp } from '../../tests/render';

const server = createApiServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

describe('app shell and routing', () => {
  it('redirects / to /tickets, keeping the query string', async () => {
    const { router } = renderApp('/?q=refund&status=open');
    expect(await screen.findByRole('heading', { level: 1, name: 'Support tickets' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/tickets');
    expect(router.state.location.search).toBe('?q=refund&status=open');
  });

  it('shows a not-found page for unknown routes', async () => {
    renderApp('/nope');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to all tickets' })).toHaveAttribute('href', '/tickets');
  });

  it('skip link is the first tab stop and moves focus to main without changing the URL', async () => {
    const { router } = renderApp('/tickets?q=x');
    await screen.findByRole('heading', { name: 'Support tickets' });
    await userEvent.tab();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(router.state.location.hash).toBe('');
  });
});
