import { AGENTS } from '../src/shared/agents.js';
import type { Channel, Priority, Status, Ticket } from '../src/shared/contract.js';

export const DATASET_SIZE = 10_000;
export const DATASET_SEED = 20_261_012;
const DAY_MS = 86_400_000;
/** Fixed (not Date.now()) so every cold start produces byte-identical data. */
const EPOCH_END_MS = Date.UTC(2026, 9, 1);

/** Small, fast, seedable PRNG. Not cryptographic; only used for mock data and chaos. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

type Rng = () => number;

function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error('pick() from empty list');
  return item;
}

function weighted<T extends string>(rng: Rng, weights: Readonly<Record<T, number>>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [value, w] of entries) {
    roll -= w;
    if (roll < 0) return value;
  }
  const last = entries.at(-1);
  if (!last) throw new Error('weighted() with no weights');
  return last[0];
}

const ISSUES = [
  'Refund request for',
  'Cannot log in to',
  'Billing error on',
  'Shipping delay for',
  'Question about',
  'Cancel',
  'Upgrade request for',
  'Password reset fails on',
  'Damaged item:',
  'Missing invoice for',
  'Feature request for',
  'Duplicate charge on',
  'Account locked on',
  'Slow performance in',
  'Error message in',
] as const;
const PRODUCTS = [
  'mobile app',
  'web dashboard',
  'Pro plan',
  'annual subscription',
  'wireless headphones',
  'smart thermostat',
  'standing desk',
  'gift card',
  'API access',
  'team workspace',
  'checkout page',
  'loyalty points',
  'family plan',
  'desktop client',
] as const;
const FIRST = [
  'Aisha',
  'Ben',
  'Chen',
  'Diego',
  'Elena',
  'Farah',
  'Gabriel',
  'Hana',
  'Ivan',
  'Jamal',
  'Keiko',
  'Liam',
  'Maya',
  'Noah',
  'Olu',
  'Priya',
  'Quinn',
  'Rosa',
  'Sven',
  'Tariq',
  'Uma',
  'Victor',
  'Wen',
  'Ximena',
  'Yusuf',
  'Zara',
  'Arjun',
  'Bea',
  'Caleb',
  'Dana',
] as const;
const LAST = [
  'Abara',
  'Bianchi',
  'Costa',
  'Dubois',
  'Eriksen',
  'Fischer',
  'Garcia',
  'Hassan',
  'Ito',
  'Jensen',
  'Khan',
  'Lopez',
  'Moreau',
  'Nakamura',
  'Okafor',
  'Patel',
  'Quintero',
  'Rossi',
  'Singh',
  'Tanaka',
  'Usman',
  'Varga',
  'Wagner',
  'Xu',
  'Yilmaz',
  'Zhang',
  'Mensah',
  'Novak',
  'Kowalski',
  'Haddad',
] as const;
const TAGS = [
  'billing',
  'refund',
  'login',
  'shipping',
  'bug',
  'feature-request',
  'vip',
  'escalated',
  'mobile',
  'api',
  'account',
  'hardware',
] as const;
const SENTENCES = [
  'The customer reports the problem started after the latest update.',
  'They have already tried clearing their cache and signing in again.',
  'This is the second time they have contacted us about this.',
  'Order details and screenshots are attached to the first message.',
  'They are asking for an update within the next business day.',
  'The issue affects several people on their team.',
  'They would like a call back rather than an email reply.',
  'A workaround was suggested but did not resolve the problem.',
] as const;

const STATUS_WEIGHTS: Record<Status, number> = { open: 30, pending: 20, on_hold: 8, solved: 27, closed: 15 };
const PRIORITY_WEIGHTS: Record<Priority, number> = { low: 25, normal: 45, high: 22, urgent: 8 };
const CHANNEL_WEIGHTS: Record<Channel, number> = { email: 40, chat: 25, phone: 15, web: 20 };
const SLA_RISK: Record<Priority, number> = { low: 0.03, normal: 0.06, high: 0.2, urgent: 0.4 };

/** Deterministic: the same (size, seed) always yields the same tickets, in the same order. */
export function generateTickets(size: number, seed: number): Ticket[] {
  const rng = mulberry32(seed);
  const tickets: Ticket[] = [];
  for (let i = 0; i < size; i++) {
    const first = pick(rng, FIRST);
    const last = pick(rng, LAST);
    const issue = pick(rng, ISSUES);
    const product = pick(rng, PRODUCTS);
    const withOrder = rng() < 0.3;
    const status = weighted(rng, STATUS_WEIGHTS);
    const priority = weighted(rng, PRIORITY_WEIGHTS);
    const channel = weighted(rng, CHANNEL_WEIGHTS);
    const assignee = rng() < 0.12 ? null : pick(rng, AGENTS);
    const tagCount = Math.floor(rng() * 4);
    const tags = new Set<string>();
    for (let t = 0; t < tagCount; t++) tags.add(pick(rng, TAGS));
    const createdMs = EPOCH_END_MS - Math.floor(rng() * 365 * DAY_MS);
    const updatedMs = createdMs + Math.floor(rng() * Math.min(30 * DAY_MS, EPOCH_END_MS - createdMs));
    const sentenceCount = 2 + Math.floor(rng() * 2);
    const sentences: string[] = [];
    for (let s = 0; s < sentenceCount; s++) sentences.push(pick(rng, SENTENCES));
    const active = status === 'open' || status === 'pending' || status === 'on_hold';

    tickets.push({
      id: `TCK-${String(i + 1).padStart(6, '0')}`,
      subject: `${issue} ${product}${withOrder ? ` (order #${100_000 + Math.floor(rng() * 900_000)})` : ''}`,
      description: `Received via ${channel}. ${sentences.join(' ')}`,
      customer: {
        name: `${first} ${last}`,
        email: `${first}.${last}${i % 97}@example.com`.toLowerCase(),
      },
      status,
      priority,
      channel,
      assignee,
      tags: [...tags].sort(),
      createdAt: new Date(createdMs).toISOString(),
      updatedAt: new Date(updatedMs).toISOString(),
      messageCount: 1 + Math.floor(rng() ** 2 * 40),
      slaBreached: active && rng() < SLA_RISK[priority],
    });
  }
  return tickets;
}

/** Ticket plus precomputed keys so per-request filtering and sorting do no string/date parsing. */
export interface IndexedTicket {
  readonly ticket: Ticket;
  /** Lowercased "id subject customer-name customer-email" used for substring search. */
  readonly haystack: string;
  readonly subjectKey: string;
  readonly createdMs: number;
  readonly updatedMs: number;
}

export function indexTickets(tickets: readonly Ticket[]): IndexedTicket[] {
  return tickets.map((ticket) => ({
    ticket,
    haystack: `${ticket.id} ${ticket.subject} ${ticket.customer.name} ${ticket.customer.email}`.toLowerCase(),
    subjectKey: ticket.subject.toLowerCase(),
    createdMs: Date.parse(ticket.createdAt),
    updatedMs: Date.parse(ticket.updatedAt),
  }));
}

let dataset: { rows: IndexedTicket[]; byId: Map<string, Ticket> } | undefined;

/** Built once per process (per serverless cold start), ~10 ms for 10k rows. */
export function getDataset() {
  if (!dataset) {
    const rows = indexTickets(generateTickets(DATASET_SIZE, DATASET_SEED));
    dataset = { rows, byId: new Map(rows.map((r) => [r.ticket.id, r.ticket])) };
  }
  return dataset;
}
