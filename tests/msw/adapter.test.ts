import { TicketPage, TicketQuery, ticketQueryToSearchParams } from '../../src/shared/contract';
import { createApiServer } from './server';

// Proves the MSW adapter serves the real engine over fetch, as the app will consume it.
const server = createApiServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

test('fetching through MSW returns contract-valid, filtered results', async () => {
  const qs = ticketQueryToSearchParams(TicketQuery.parse({ priority: ['urgent'], pageSize: 10 }));
  const res = await fetch(`http://localhost/api/tickets?${qs}`);
  const page = TicketPage.parse(await res.json());
  expect(page.items).toHaveLength(10);
  expect(page.items.every((t) => t.priority === 'urgent')).toBe(true);
});
