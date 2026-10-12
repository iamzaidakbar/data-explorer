import { DATASET_SIZE, DATASET_SEED, generateTickets, getDataset } from './dataset';
import { Ticket } from '../src/shared/contract';

describe('dataset', () => {
  it('has at least 10,000 tickets with unique, ordered ids', () => {
    const { rows, byId } = getDataset();
    expect(rows).toHaveLength(DATASET_SIZE);
    expect(DATASET_SIZE).toBeGreaterThanOrEqual(10_000);
    expect(byId.size).toBe(DATASET_SIZE);
    expect(rows[0]?.ticket.id).toBe('TCK-000001');
    expect(rows.at(-1)?.ticket.id).toBe('TCK-010000');
  });

  it('is deterministic across generations (identical cold starts)', () => {
    expect(generateTickets(500, DATASET_SEED)).toEqual(generateTickets(500, DATASET_SEED));
    expect(generateTickets(50, DATASET_SEED)).not.toEqual(generateTickets(50, DATASET_SEED + 1));
  });

  it('produces tickets that satisfy the wire contract', () => {
    for (const { ticket } of getDataset().rows.slice(0, 1000)) Ticket.parse(ticket);
  });

  it('never has updatedAt before createdAt', () => {
    for (const { createdMs, updatedMs } of getDataset().rows)
      expect(updatedMs).toBeGreaterThanOrEqual(createdMs);
  });
});
