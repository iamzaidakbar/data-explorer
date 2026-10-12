/**
 * The single authority for the mock API's wire format. Both the server (server/) and the client parse with these
 * schemas, so a contract change is a compile error on both sides rather than a runtime surprise.
 *
 * Imports in src/shared, server/ and api/ use explicit `.js` extensions because Vercel runs api/ as native ESM.
 *
 * Uses `zod/mini` (functional API, tree-shakable): the client ships these schemas to validate every response, and
 * the classic API cost ~25 kB gzipped of initial JS (ADR-0008).
 */
import * as z from 'zod/mini';

export const STATUSES = ['open', 'pending', 'on_hold', 'solved', 'closed'] as const;
export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const CHANNELS = ['email', 'chat', 'phone', 'web'] as const;
export const SORT_FIELDS = ['createdAt', 'updatedAt', 'priority', 'status', 'subject'] as const;

export const Status = z.enum(STATUSES);
export const Priority = z.enum(PRIORITIES);
export const Channel = z.enum(CHANNELS);
export const SortField = z.enum(SORT_FIELDS);
export const SortDir = z.enum(['asc', 'desc']);
export const Sort = z.object({ field: SortField, dir: SortDir });

const isoDate = z.iso.date();
const nonNegativeInt = z.int().check(z.minimum(0));

/** Filter value matching tickets whose `assignee` is null. */
export const UNASSIGNED = 'unassigned';
export const DEFAULT_SORT: Sort = { field: 'createdAt', dir: 'desc' };
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const MAX_QUERY_LENGTH = 100;

export const TicketQuery = z
  .object({
    q: z._default(z.string().check(z.trim(), z.maxLength(MAX_QUERY_LENGTH)), ''),
    status: z._default(z.array(Status), []),
    priority: z._default(z.array(Priority), []),
    channel: z._default(z.array(Channel), []),
    assignee: z._default(
      z.array(z.string().check(z.minLength(1), z.maxLength(40))).check(z.maxLength(25)),
      [],
    ),
    from: z.optional(isoDate),
    to: z.optional(isoDate),
    sort: z._default(Sort, DEFAULT_SORT),
    page: z._default(nonNegativeInt, 0),
    pageSize: z._default(z.int().check(z.minimum(10), z.maximum(MAX_PAGE_SIZE)), DEFAULT_PAGE_SIZE),
  })
  .check(
    z.refine((v) => !v.from || !v.to || v.from <= v.to, {
      path: ['to'],
      message: '"to" must not be before "from"',
    }),
  );

export const Ticket = z.object({
  id: z.string(),
  subject: z.string(),
  description: z.string(),
  customer: z.object({ name: z.string(), email: z.string() }),
  status: Status,
  priority: Priority,
  channel: Channel,
  assignee: z.nullable(z.string()),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.int(),
  slaBreached: z.boolean(),
});

export const TicketPage = z.object({
  items: z.array(Ticket),
  total: nonNegativeInt,
  page: nonNegativeInt,
  pageSize: z.int().check(z.minimum(1)),
  requestId: z.string(),
});

export const ApiError = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
  fieldErrors: z.optional(z.record(z.string(), z.array(z.string()))),
});

export type Status = z.infer<typeof Status>;
export type Priority = z.infer<typeof Priority>;
export type Channel = z.infer<typeof Channel>;
export type SortField = z.infer<typeof SortField>;
export type Sort = z.infer<typeof Sort>;
export type TicketQuery = z.output<typeof TicketQuery>;
export type TicketQueryInput = z.input<typeof TicketQuery>;
export type Ticket = z.infer<typeof Ticket>;
export type TicketPage = z.infer<typeof TicketPage>;
export type ApiError = z.infer<typeof ApiError>;

const LIST_KEYS = ['status', 'priority', 'channel', 'assignee'] as const;

export function encodeSort(sort: Sort): string {
  return `${sort.dir === 'desc' ? '-' : ''}${sort.field}`;
}

function decodeSort(raw: string): { field: string; dir: 'asc' | 'desc' } {
  return raw.startsWith('-') ? { field: raw.slice(1), dir: 'desc' } : { field: raw, dir: 'asc' };
}

/**
 * Canonical encoding: keys in fixed order, list values sorted, defaults omitted. Equal queries always produce
 * byte-identical strings, which is what makes them safe to use as cache keys.
 */
export function ticketQueryToSearchParams(query: TicketQuery): URLSearchParams {
  const params = new URLSearchParams();
  const q = query.q.trim();
  if (q) params.set('q', q);
  for (const key of LIST_KEYS) {
    if (query[key].length > 0) params.set(key, [...query[key]].sort().join(','));
  }
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.sort.field !== DEFAULT_SORT.field || query.sort.dir !== DEFAULT_SORT.dir) {
    params.set('sort', encodeSort(query.sort));
  }
  if (query.page !== 0) params.set('page', String(query.page));
  if (query.pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(query.pageSize));
  return params;
}

/** Strict parse of API query parameters: invalid input is reported, never silently corrected. */
export function ticketQueryFromSearchParams(params: URLSearchParams) {
  const list = (key: string) =>
    params
      .get(key)
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  const int = (key: string) => {
    const raw = params.get(key);
    return raw === null ? undefined : Number(raw);
  };
  const sort = params.get('sort');
  return TicketQuery.safeParse({
    q: params.get('q') ?? undefined,
    status: list('status'),
    priority: list('priority'),
    channel: list('channel'),
    assignee: list('assignee'),
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    sort: sort === null ? undefined : decodeSort(sort),
    page: int('page'),
    pageSize: int('pageSize'),
  });
}
