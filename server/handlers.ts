import { getDataset } from './dataset.js';
import { queryTickets } from './query-engine.js';
import { CHAOS_HEADER, decideChaos, resolveChaosMode, sleep } from './chaos.js';
import { ticketQueryFromSearchParams, type ApiError, type TicketPage } from '../src/shared/contract.js';

/** Everything non-deterministic is injectable so tests can control time, randomness and chaos. */
export interface HandlerDeps {
  random: () => number;
  sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  chaosEnv: string | undefined;
  requestId: () => string;
  log: (entry: Record<string, unknown>) => void;
}

export function defaultDeps(): HandlerDeps {
  return {
    random: Math.random,
    sleep,
    chaosEnv: process.env.CHAOS,
    requestId: () => crypto.randomUUID(),
    log: (entry) => console.log(JSON.stringify(entry)),
  };
}

const TICKET_ID = /^TCK-\d{6}$/;

function json(status: number, body: unknown, requestId: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-request-id': requestId,
    },
  });
}

function error(status: number, body: Omit<ApiError, 'requestId'>, requestId: string): Response {
  return json(status, { ...body, requestId } satisfies ApiError, requestId);
}

/**
 * Applies latency, then the failure roll. Returns a Response to short-circuit with, or null to continue.
 * An aborted request gets 499 (client closed request); nobody reads it, but it ends the work early.
 */
async function applyChaos(request: Request, deps: HandlerDeps, requestId: string) {
  const mode = resolveChaosMode(request.headers.get(CHAOS_HEADER), deps.chaosEnv);
  const decision = decideChaos(mode, deps.random);
  await deps.sleep(decision.latencyMs, request.signal);
  if (request.signal.aborted) return { decision, mode, response: new Response(null, { status: 499 }) };
  if (decision.fail) {
    const response = error(
      503,
      { code: 'unavailable', message: 'The server could not complete this request. Please try again.' },
      requestId,
    );
    return { decision, mode, response };
  }
  return { decision, mode, response: null };
}

async function handle(
  name: string,
  request: Request,
  deps: HandlerDeps,
  body: (requestId: string) => Response,
): Promise<Response> {
  const requestId = deps.requestId();
  const chaos = await applyChaos(request, deps, requestId);
  const response = chaos.response ?? body(requestId);
  deps.log({
    handler: name,
    requestId,
    path: new URL(request.url).pathname + new URL(request.url).search,
    status: response.status,
    chaos: chaos.mode,
    latencyMs: chaos.decision.latencyMs,
    injectedFailure: chaos.decision.fail,
  });
  return response;
}

export function listTickets(request: Request, deps: HandlerDeps = defaultDeps()): Promise<Response> {
  return handle('listTickets', request, deps, (requestId) => {
    const parsed = ticketQueryFromSearchParams(new URL(request.url).searchParams);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? 'query');
        (fieldErrors[field] ??= []).push(issue.message);
      }
      return error(
        400,
        { code: 'invalid_query', message: 'Invalid query parameters.', fieldErrors },
        requestId,
      );
    }
    const query = parsed.data;
    const { items, total } = queryTickets(getDataset().rows, query);
    const page: TicketPage = { items, total, page: query.page, pageSize: query.pageSize, requestId };
    return json(200, page, requestId);
  });
}

export function getTicket(request: Request, deps: HandlerDeps = defaultDeps()): Promise<Response> {
  return handle('getTicket', request, deps, (requestId) => {
    const id = decodeURIComponent(new URL(request.url).pathname.split('/').pop() ?? '');
    if (!TICKET_ID.test(id)) {
      return error(400, { code: 'invalid_id', message: 'Ticket ids look like TCK-000123.' }, requestId);
    }
    const ticket = getDataset().byId.get(id);
    if (!ticket) return error(404, { code: 'not_found', message: `Ticket ${id} does not exist.` }, requestId);
    return json(200, ticket, requestId);
  });
}

/** Path router shared by the Vite dev/preview middleware and MSW. Vercel routes by file instead (api/). */
export async function routeApiRequest(
  request: Request,
  deps: HandlerDeps = defaultDeps(),
): Promise<Response> {
  const { pathname } = new URL(request.url);
  const isList = pathname === '/api/tickets' || pathname === '/api/tickets/';
  const isItem = /^\/api\/tickets\/[^/]+$/.test(pathname);
  if (!isList && !isItem) {
    return error(404, { code: 'not_found', message: `No API route for ${pathname}.` }, deps.requestId());
  }
  if (request.method !== 'GET') {
    return error(405, { code: 'method_not_allowed', message: 'Only GET is supported.' }, deps.requestId());
  }
  return isList ? listTickets(request, deps) : getTicket(request, deps);
}
