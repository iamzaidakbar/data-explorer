/**
 * The page URL is the single source of truth for what the explorer shows (ADR-0003):
 *   /tickets?q=refund&status=open,pending&priority=urgent&sort=-updatedAt&row=1200
 *
 * Parsing is lenient (a hand-edited or stale link degrades to sensible defaults, never an error page);
 * serialization is canonical (equal views always produce byte-identical URLs and therefore equal cache keys).
 */
import { AGENTS } from '../shared/agents';
import {
  CHANNELS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  MAX_QUERY_LENGTH,
  PRIORITIES,
  SORT_FIELDS,
  STATUSES,
  UNASSIGNED,
  ticketQueryToSearchParams,
  type Channel,
  type Priority,
  type Sort,
  type Status,
  type TicketQuery,
} from '../shared/contract';

export interface ExplorerFilters {
  status: Status[];
  priority: Priority[];
  channel: Channel[];
  assignee: string[];
  from?: string;
  to?: string;
}

export interface ExplorerState extends ExplorerFilters {
  q: string;
  sort: Sort;
  /** Index of the top visible row: the "scroll position" that refresh, back/forward and shared links restore. */
  row: number;
}

export const EMPTY_FILTERS: ExplorerFilters = {
  status: [],
  priority: [],
  channel: [],
  assignee: [],
  from: undefined,
  to: undefined,
};

export const DEFAULT_STATE: ExplorerState = { ...EMPTY_FILTERS, q: '', sort: DEFAULT_SORT, row: 0 };

const KNOWN_ASSIGNEES: readonly string[] = [UNASSIGNED, ...AGENTS];

/** Keeps only allowed values, deduplicated, in the allowed list's order. */
function pickList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  const requested = new Set(raw.split(',').map((s) => s.trim()));
  return allowed.filter((value) => requested.has(value));
}

function pickDate(raw: string | null): string | undefined {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const ms = Date.parse(`${raw}T00:00:00Z`);
  // Reject impossible dates such as 2026-02-30 that some engines roll over into the next month.
  return Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== raw ? undefined : raw;
}

function pickSort(raw: string | null): Sort {
  if (!raw) return DEFAULT_SORT;
  const dir = raw.startsWith('-') ? 'desc' : 'asc';
  const field = SORT_FIELDS.find((f) => f === raw.replace(/^-/, ''));
  return field ? { field, dir } : DEFAULT_SORT;
}

function pickRow(raw: string | null): number {
  const n = Number(raw);
  return raw !== null && Number.isSafeInteger(n) && n > 0 ? n : 0;
}

export function parseExplorerParams(params: URLSearchParams): ExplorerState {
  const from = pickDate(params.get('from'));
  let to = pickDate(params.get('to'));
  if (from && to && from > to) to = undefined;
  return {
    q: (params.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH),
    status: pickList(params.get('status'), STATUSES),
    priority: pickList(params.get('priority'), PRIORITIES),
    channel: pickList(params.get('channel'), CHANNELS),
    assignee: pickList(params.get('assignee'), KNOWN_ASSIGNEES),
    from,
    to,
    sort: pickSort(params.get('sort')),
    row: pickRow(params.get('row')),
  };
}

export function toTicketQuery(state: ExplorerState, page = 0, pageSize = DEFAULT_PAGE_SIZE): TicketQuery {
  const { q, status, priority, channel, assignee, from, to, sort } = state;
  return { q, status, priority, channel, assignee, from, to, sort, page, pageSize };
}

/** Identity of the result set: everything except the scroll position. Used as the cache-key base. */
export function resultSetKey(state: ExplorerState): string {
  return ticketQueryToSearchParams(toTicketQuery(state)).toString();
}

export function serializeExplorerState(state: ExplorerState): URLSearchParams {
  const params = ticketQueryToSearchParams(toTicketQuery(state));
  if (state.row > 0) params.set('row', String(state.row));
  return params;
}

export function countActiveFilters(state: ExplorerFilters): number {
  return (
    state.status.length +
    state.priority.length +
    state.channel.length +
    state.assignee.length +
    (state.from ? 1 : 0) +
    (state.to ? 1 : 0)
  );
}
