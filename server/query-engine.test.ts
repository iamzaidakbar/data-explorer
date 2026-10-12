import { TicketQuery, type TicketQueryInput } from '../src/shared/contract';
import { getDataset } from './dataset';
import { queryTickets } from './query-engine';

const { rows } = getDataset();
const run = (input: TicketQueryInput) => queryTickets(rows, TicketQuery.parse(input));
/** All matches, ignoring pagination. */
const all = (input: TicketQueryInput) => run({ ...input, page: 0, pageSize: 100 }).total;

function collectAllPages(input: TicketQueryInput, pageSize: number) {
  const ids: string[] = [];
  const total = run({ ...input, pageSize }).total;
  for (let page = 0; page * pageSize < total; page++) {
    ids.push(...run({ ...input, page, pageSize }).items.map((t) => t.id));
  }
  return { ids, total };
}

describe('queryTickets', () => {
  it('returns the full dataset total and one page of items by default', () => {
    const result = run({});
    expect(result.total).toBe(rows.length);
    expect(result.items).toHaveLength(50);
  });

  it('filters by multiple statuses (OR within a filter)', () => {
    const { items, total } = run({ status: ['open', 'pending'], pageSize: 100 });
    expect(total).toBeGreaterThan(0);
    expect(total).toBe(all({ status: ['open'] }) + all({ status: ['pending'] }));
    for (const t of items) expect(['open', 'pending']).toContain(t.status);
  });

  it('combines different filters with AND', () => {
    const { items, total } = run({
      status: ['open'],
      priority: ['urgent'],
      channel: ['chat'],
      pageSize: 100,
    });
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(all({ status: ['open'], priority: ['urgent'] }));
    for (const t of items) expect([t.status, t.priority, t.channel]).toEqual(['open', 'urgent', 'chat']);
  });

  it('matches "unassigned" against null assignees', () => {
    const { items, total } = run({ assignee: ['unassigned'], pageSize: 100 });
    expect(total).toBeGreaterThan(0);
    for (const t of items) expect(t.assignee).toBeNull();
  });

  it('searches case-insensitively across id, subject and customer, requiring every term', () => {
    const refund = run({ q: 'REFUND', pageSize: 100 });
    expect(refund.total).toBeGreaterThan(0);
    for (const t of refund.items) expect(t.subject.toLowerCase()).toContain('refund');

    const both = run({ q: 'refund headphones', pageSize: 100 });
    expect(both.total).toBeGreaterThan(0);
    expect(both.total).toBeLessThan(refund.total);
    for (const t of both.items) expect(t.subject.toLowerCase()).toMatch(/refund.*headphones/);

    expect(run({ q: 'tck-000042' }).items.map((t) => t.id)).toEqual(['TCK-000042']);
    expect(run({ q: 'zzz-no-such-ticket' }).total).toBe(0);
  });

  it('treats the date range as inclusive calendar days (UTC)', () => {
    const expected = rows.filter(
      (r) => r.ticket.createdAt >= '2026-03-01' && r.ticket.createdAt < '2026-04-01',
    ).length;
    expect(expected).toBeGreaterThan(0);
    expect(all({ from: '2026-03-01', to: '2026-03-31' })).toBe(expected);
    // A single day is a valid range (from === to).
    const oneDay = rows.filter((r) => r.ticket.createdAt.startsWith('2026-03-15')).length;
    expect(all({ from: '2026-03-15', to: '2026-03-15' })).toBe(oneDay);
  });

  it.each([
    ['createdAt', (t: { createdAt: string }) => t.createdAt],
    ['subject', (t: { subject: string }) => t.subject.toLowerCase()],
  ] as const)('sorts by %s in both directions', (field, key) => {
    const asc = run({ sort: { field, dir: 'asc' }, pageSize: 100 }).items.map(key);
    const desc = run({ sort: { field, dir: 'desc' }, pageSize: 100 }).items.map(key);
    expect(asc).toEqual([...asc].sort());
    expect(desc).toEqual([...desc].sort().reverse());
  });

  it('sorts priority by severity, not alphabetically', () => {
    const top = run({ sort: { field: 'priority', dir: 'desc' } }).items;
    expect(top.every((t) => t.priority === 'urgent')).toBe(true);
  });

  // The critical pagination property: with heavy ties (status has 5 values over 10k rows) a non-stable sort
  // would duplicate or drop rows across page boundaries.
  const tieCases: TicketQueryInput[] = [
    { sort: { field: 'status', dir: 'asc' } },
    { sort: { field: 'priority', dir: 'desc' }, status: ['open'] },
  ];
  it.each(tieCases)('paginates without duplicates or gaps under ties (%j)', (input) => {
    const { ids, total } = collectAllPages(input, 100);
    expect(ids).toHaveLength(total);
    expect(new Set(ids).size).toBe(total);
  });

  it('returns an empty page (with the real total) past the end', () => {
    const result = run({ page: 10_000 });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(rows.length);
  });
});
