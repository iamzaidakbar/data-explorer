import { ApiError, Ticket, TicketPage } from '../src/shared/contract';
import { CHAOS_HEADER } from './chaos';
import { routeApiRequest, type HandlerDeps } from './handlers';
import { testDeps } from '../tests/msw/server';

const call = (path: string, init?: RequestInit, deps: HandlerDeps = testDeps()) =>
  routeApiRequest(new Request(`http://localhost${path}`, init), deps);

describe('API handlers', () => {
  it('returns a contract-valid page with no-store caching and a request id', async () => {
    const res = await call('/api/tickets?status=open&sort=-priority&page=2&pageSize=20');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const page = TicketPage.parse(await res.json());
    expect(page).toMatchObject({ page: 2, pageSize: 20 });
    expect(page.items).toHaveLength(20);
    expect(res.headers.get('x-request-id')).toBe(page.requestId);
  });

  it('maps invalid parameters to a 400 with per-field errors', async () => {
    const res = await call('/api/tickets?status=bogus&pageSize=5000');
    expect(res.status).toBe(400);
    const body = ApiError.parse(await res.json());
    expect(body.code).toBe('invalid_query');
    expect(Object.keys(body.fieldErrors ?? {}).sort()).toEqual(['pageSize', 'status']);
    expect(body.fieldErrors?.status?.[0]).toMatch(/expected one of/i);
    expect(body.fieldErrors?.pageSize?.[0]).toMatch(/100/);
  });

  it('injects a 503 failure when the failure roll hits', async () => {
    const res = await call('/api/tickets', undefined, testDeps({ chaosEnv: undefined, random: () => 0.05 }));
    expect(res.status).toBe(503);
    expect(ApiError.parse(await res.json()).code).toBe('unavailable');
  });

  it('honours the x-chaos header for demos', async () => {
    const res = await call('/api/tickets', { headers: { [CHAOS_HEADER]: 'fail' } });
    expect(res.status).toBe(503);
  });

  it('waits the injected latency, and stops waiting when the client aborts', async () => {
    const sleep = vi.fn<HandlerDeps['sleep']>(async () => {});
    await call('/api/tickets', undefined, testDeps({ chaosEnv: undefined, random: () => 0.5, sleep }));
    expect(sleep).toHaveBeenCalledWith(1600, expect.any(AbortSignal));

    const controller = new AbortController();
    controller.abort();
    const res = await call('/api/tickets', { signal: controller.signal });
    expect(res.status).toBe(499);
  });

  it('serves a single ticket, 404 for unknown ids and 400 for malformed ids', async () => {
    const ok = await call('/api/tickets/TCK-000123');
    expect(ok.status).toBe(200);
    expect(Ticket.parse(await ok.json()).id).toBe('TCK-000123');
    expect((await call('/api/tickets/TCK-999999')).status).toBe(404);
    expect((await call('/api/tickets/drop-table')).status).toBe(400);
  });

  it('rejects unknown routes and non-GET methods', async () => {
    expect((await call('/api/nope')).status).toBe(404);
    expect((await call('/api/tickets', { method: 'POST' })).status).toBe(405);
  });
});
