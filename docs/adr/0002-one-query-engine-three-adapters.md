# ADR-0002: One pure query engine, three adapters

Status: Accepted · Date: 2026-10-12

## Context

Search/filter/sort/pagination must behave identically in local dev, tests and production, and must be testable
without HTTP or timers.

## Decision

`server/query-engine.ts` is a pure, synchronous function over a seeded in-memory dataset. `server/handlers.ts`
exposes it as `(Request) => Promise<Response>` with Zod validation and chaos (latency/failure) injection. Three thin
adapters call the handlers: Vercel functions (`api/`), a Vite dev-server middleware, and MSW in tests.

## Alternatives

- **json-server** — no control over failure injection semantics; another process to run.
- **Supabase table** — real DB, but an external account and network dependency for a read-only mock.

## Consequences

- Same semantics everywhere; the engine gets fast unit tests.
- Risk of adapter drift — mitigated by keeping each adapter < 30 lines and contract-parsing responses with
  `src/shared/contract.ts`.
