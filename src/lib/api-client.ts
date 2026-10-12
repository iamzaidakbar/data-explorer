import type { ZodMiniType } from 'zod/mini';
import { CHAOS_HEADER } from '../shared/chaos';
import {
  ApiError,
  Ticket,
  TicketPage,
  ticketQueryToSearchParams,
  type TicketQuery,
} from '../shared/contract';
import { getChaosMode } from './chaos-setting';

/** Every failure the UI can show, normalised: HTTP errors, network errors and contract violations. */
export class ApiRequestError extends Error {
  override name = 'ApiRequestError';
  constructor(
    message: string,
    /** HTTP status, or 0 when no response was received. */
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

async function getJson<T>(path: string, schema: ZodMiniType<T>, signal: AbortSignal): Promise<T> {
  const headers = new Headers({ accept: 'application/json' });
  const chaos = getChaosMode();
  if (chaos !== 'default') headers.set(CHAOS_HEADER, chaos);

  let response: Response;
  try {
    response = await fetch(new URL(path, document.baseURI), { signal, headers });
  } catch (error) {
    // Superseded requests must reject with the AbortError so the query layer treats them as cancelled, not failed.
    if (signal.aborted) throw error;
    throw new ApiRequestError('Network error: check your connection and try again.', 0, 'network');
  }

  const requestId = response.headers.get('x-request-id') ?? undefined;
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const parsed = ApiError.safeParse(body);
    throw parsed.success
      ? new ApiRequestError(parsed.data.message, response.status, parsed.data.code, parsed.data.requestId)
      : new ApiRequestError(
          `Request failed (HTTP ${response.status}).`,
          response.status,
          'http_error',
          requestId,
        );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiRequestError(
      'The server sent an unexpected response.',
      response.status,
      'invalid_response',
      requestId,
    );
  }
  return parsed.data;
}

export function fetchTicketPage(query: TicketQuery, signal: AbortSignal): Promise<TicketPage> {
  return getJson(`/api/tickets?${ticketQueryToSearchParams(query)}`, TicketPage, signal);
}

export function fetchTicket(id: string, signal: AbortSignal): Promise<Ticket> {
  return getJson(`/api/tickets/${encodeURIComponent(id)}`, Ticket, signal);
}
