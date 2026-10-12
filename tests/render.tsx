import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AnnouncerProvider } from '../src/lib/announcer';
import { routes } from '../src/app/router';

/** Renders the real route tree at `path` with fresh providers. Retries off so failures surface immediately. */
export function renderApp(path = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AnnouncerProvider>
        <RouterProvider router={router} />
      </AnnouncerProvider>
    </QueryClientProvider>,
  );
  return { ...utils, router, queryClient };
}
