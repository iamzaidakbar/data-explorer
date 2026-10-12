import { http } from 'msw';
import { setupServer } from 'msw/node';
import { routeApiRequest, type HandlerDeps } from '../../server/handlers';

/** Deterministic deps: no latency, no random failures, stable ids, silent logs. Override per test as needed. */
export function testDeps(overrides: Partial<HandlerDeps> = {}): HandlerDeps {
  let n = 0;
  return {
    random: () => 0.5,
    sleep: async () => {},
    chaosEnv: 'off',
    requestId: () => `req-${++n}`,
    log: () => {},
    ...overrides,
  };
}

/** MSW adapter over the real handlers (ADR-0002): tests exercise the same engine as production. */
export function createApiServer(deps: HandlerDeps = testDeps()) {
  return setupServer(http.get('*/api/*', ({ request }) => routeApiRequest(request, deps)));
}
