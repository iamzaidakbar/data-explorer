import {
  DEFAULT_PAGE_SIZE,
  TicketQuery,
  ticketQueryFromSearchParams,
  ticketQueryToSearchParams,
} from './contract';

const parse = (qs: string) => ticketQueryFromSearchParams(new URLSearchParams(qs));

describe('ticket query codec', () => {
  it('omits defaults, so the default query encodes to an empty string', () => {
    expect(ticketQueryToSearchParams(TicketQuery.parse({})).toString()).toBe('');
  });

  it('is canonical: equivalent queries encode identically regardless of value order', () => {
    const a = TicketQuery.parse({ status: ['pending', 'open'], priority: ['urgent'], q: '  refund ' });
    const b = TicketQuery.parse({ q: 'refund', priority: ['urgent'], status: ['open', 'pending'] });
    expect(ticketQueryToSearchParams(a).toString()).toBe(ticketQueryToSearchParams(b).toString());
  });

  it('round-trips every field', () => {
    const query = TicketQuery.parse({
      q: 'login error',
      status: ['open', 'on_hold'],
      priority: ['high'],
      channel: ['chat', 'email'],
      assignee: ['Alex Rivera', 'unassigned'],
      from: '2026-01-01',
      to: '2026-03-31',
      sort: { field: 'priority', dir: 'asc' },
      page: 4,
      pageSize: 25,
    });
    const result = parse(ticketQueryToSearchParams(query).toString());
    expect(result.success && result.data).toEqual({
      ...query,
      status: ['on_hold', 'open'],
      channel: ['chat', 'email'],
    });
  });

  it('applies defaults for missing parameters', () => {
    const result = parse('');
    expect(result.success && result.data).toMatchObject({
      q: '',
      status: [],
      sort: { field: 'createdAt', dir: 'desc' },
      page: 0,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it.each([
    ['status=bogus', 'status'],
    ['sort=-colour', 'sort'],
    ['page=-1', 'page'],
    ['page=abc', 'page'],
    ['pageSize=1000', 'pageSize'],
    ['from=2026-13-01', 'from'],
    ['from=2026-05-01&to=2026-04-01', 'to'],
    [`q=${'x'.repeat(101)}`, 'q'],
  ])('rejects %s (field: %s) instead of silently correcting it', (qs, field) => {
    const result = parse(qs);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toContain(field);
  });
});
