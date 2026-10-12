import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { routeApiRequest } from '../../server/handlers';
import { testDeps } from './server';

interface Held {
  url: URL;
  signal: AbortSignal;
  release: () => void;
}

/**
 * MSW over the real handlers, with per-test control: hold matching requests until released (to force any
 * response order), fail matching requests with 503, and inspect every request that was made.
 */
export function createTestApi() {
  const log: { url: URL; signal: AbortSignal }[] = [];
  const held: Held[] = [];
  let holdIf: (url: URL) => boolean = () => false;
  let failIf: (url: URL) => boolean = () => false;

  const server = setupServer(
    http.get('*/api/*', async ({ request }) => {
      const url = new URL(request.url);
      log.push({ url, signal: request.signal });
      if (holdIf(url))
        await new Promise<void>((release) => held.push({ url, signal: request.signal, release }));
      // Evaluated after release, so a test can decide a held request's fate later.
      if (failIf(url)) {
        return HttpResponse.json(
          { code: 'unavailable', message: 'Simulated server failure.', requestId: 'test-req' },
          { status: 503 },
        );
      }
      return routeApiRequest(request, testDeps());
    }),
  );

  const listRequests = () => log.filter((r) => r.url.pathname === '/api/tickets');

  return {
    server,
    log,
    listRequests,
    hold(predicate: (url: URL) => boolean) {
      holdIf = predicate;
    },
    fail(predicate: (url: URL) => boolean) {
      failIf = predicate;
    },
    /** The held request matching `predicate`, if any. */
    findHeld: (predicate: (url: URL) => boolean) => held.find((h) => predicate(h.url)),
    reset() {
      log.length = 0;
      held.splice(0).forEach((h) => h.release());
      holdIf = () => false;
      failIf = () => false;
    },
  };
}

export const hasQ = (q: string) => (url: URL) => url.searchParams.get('q') === q;
export const isPage = (page: number) => (url: URL) => Number(url.searchParams.get('page') ?? 0) === page;
