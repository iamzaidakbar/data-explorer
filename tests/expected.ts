import { getDataset } from '../server/dataset';
import { queryTickets } from '../server/query-engine';
import { TicketQuery, type TicketQueryInput } from '../src/shared/contract';
import { formatCount } from '../src/lib/format';

/** Ground truth from the real engine, so assertions don't hard-code dataset-dependent numbers. */
export function expectedTotal(input: TicketQueryInput): number {
  return queryTickets(getDataset().rows, TicketQuery.parse(input)).total;
}

export const countText = (n: number) => `${formatCount(n)} ${n === 1 ? 'ticket' : 'tickets'}`;
