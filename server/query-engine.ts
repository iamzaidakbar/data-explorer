import {
  UNASSIGNED,
  type Priority,
  type Status,
  type Ticket,
  type TicketQuery,
} from '../src/shared/contract.js';
import type { IndexedTicket } from './dataset.js';

const DAY_MS = 86_400_000;
const PRIORITY_RANK: Record<Priority, number> = { low: 0, normal: 1, high: 2, urgent: 3 };
const STATUS_RANK: Record<Status, number> = { open: 0, pending: 1, on_hold: 2, solved: 3, closed: 4 };

type Comparator = (a: IndexedTicket, b: IndexedTicket) => number;

const byField: Record<TicketQuery['sort']['field'], Comparator> = {
  createdAt: (a, b) => a.createdMs - b.createdMs,
  updatedAt: (a, b) => a.updatedMs - b.updatedMs,
  priority: (a, b) => PRIORITY_RANK[a.ticket.priority] - PRIORITY_RANK[b.ticket.priority],
  status: (a, b) => STATUS_RANK[a.ticket.status] - STATUS_RANK[b.ticket.status],
  subject: (a, b) => (a.subjectKey < b.subjectKey ? -1 : a.subjectKey > b.subjectKey ? 1 : 0),
};

/** Ties always break on ascending id, so page boundaries are stable: no row appears on two pages or none. */
function comparator(sort: TicketQuery['sort']): Comparator {
  const primary = byField[sort.field];
  const dir = sort.dir === 'asc' ? 1 : -1;
  return (a, b) =>
    primary(a, b) * dir || (a.ticket.id < b.ticket.id ? -1 : a.ticket.id > b.ticket.id ? 1 : 0);
}

function toSet<T>(values: readonly T[]): Set<T> | null {
  return values.length > 0 ? new Set(values) : null;
}

/**
 * Pure server-side search/filter/sort/paginate. Filters combine with AND; values within one filter with OR.
 * Search terms are whitespace-separated, case-insensitive substrings that must all match.
 */
export function queryTickets(
  rows: readonly IndexedTicket[],
  query: TicketQuery,
): { items: Ticket[]; total: number } {
  const terms = query.q.toLowerCase().split(/\s+/).filter(Boolean);
  const status = toSet(query.status);
  const priority = toSet(query.priority);
  const channel = toSet(query.channel);
  const assignee = toSet(query.assignee);
  const fromMs = query.from ? Date.parse(`${query.from}T00:00:00Z`) : -Infinity;
  // `to` is an inclusive calendar date, so the bound is the start of the following day (exclusive).
  const toMs = query.to ? Date.parse(`${query.to}T00:00:00Z`) + DAY_MS : Infinity;

  const matched = rows.filter((row) => {
    const t = row.ticket;
    return (
      (!status || status.has(t.status)) &&
      (!priority || priority.has(t.priority)) &&
      (!channel || channel.has(t.channel)) &&
      (!assignee || assignee.has(t.assignee ?? UNASSIGNED)) &&
      row.createdMs >= fromMs &&
      row.createdMs < toMs &&
      terms.every((term) => row.haystack.includes(term))
    );
  });

  matched.sort(comparator(query.sort));
  const start = query.page * query.pageSize;
  return {
    items: matched.slice(start, start + query.pageSize).map((row) => row.ticket),
    total: matched.length,
  };
}
