# server/ — mock API rules

- Latency 200–3000 ms and a 10% failure rate are **assignment requirements (R3)**. Never remove them or change
  the defaults in `chaos.ts`. Overrides exist only via the `x-chaos` header or `CHAOS` env (off | fail | slow).
- `query-engine.ts` stays pure and synchronous. Sorts must stay stable with the ascending-id tiebreaker — the
  pagination test proves no duplicates/gaps across pages.
- The dataset must stay deterministic (fixed seed and fixed epoch, never `Date.now()`).
- Wire format comes only from `src/shared/contract.ts`. Change the contract first, then the server.
- Use explicit `.js` extensions in relative imports here and in `api/` (Vercel runs them as native ESM).
- Anything non-deterministic goes through `HandlerDeps` so tests can control it.
- Adapters (`api/`, `vite-plugin.ts`, `tests/msw/server.ts`) stay thin: no logic beyond request/response translation.
