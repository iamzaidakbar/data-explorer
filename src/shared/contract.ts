/**
 * The single authority for the mock API's wire format. Both the server (server/) and the client parse with these
 * schemas, so a contract change is a compile error on both sides rather than a runtime surprise.
 *
 * Imports in src/shared, server/ and api/ use explicit `.js` extensions because Vercel runs api/ as native ESM.
 */
import { z } from 'zod';

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

/** Filter value matching tickets whose `assignee` is null. */
export const UNASSIGNED = 'unassigned';
export const DEFAULT_SORT: Sort = { field: 'createdAt', dir: 'desc' };
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const MAX_QUERY_LENGTH = 100;

export const TicketQuery = z
  .object({
    q: z.string().trim().max(MAX_QUERY_LENGTH).default(''),
    status: z.array(Status).default([]),
    priority: z.array(Priority).default([]),
    channel: z.array(Channel).default([]),
    assignee: z.array(z.string().min(1).max(40)).max(25).default([]),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    sort: Sort.default(DEFAULT_SORT),
    page: z.number().int().min(0).default(0),
    pageSize: z.number().int().min(10).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    path: ['to'],
    message: '"to" must not be before "from"',
  });

export const Ticket = z.object({
  id: z.string(),
  subject: z.string(),
  description: z.string(),
  customer: z.object({ name: z.string(), email: z.string() }),
  status: Status,
  priority: Priority,
  channel: Channel,
  assignee: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number().int(),
  slaBreached: z.boolean(),
});

export const TicketPage = z.object({
  items: z.array(Ticket),
  total: z.number().int().min(0),
  page: z.number().int().min(0),
  pageSize: z.number().int().min(1),
  requestId: z.string(),
});

export const ApiError = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
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
