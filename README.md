# Ticket Explorer

A searchable, filterable, sortable explorer over 10,000 support tickets, built to stay correct under slow networks,
failed requests, fast typing, large data, keyboard-only use and screen readers.
(Assignment: Frontend Developer — Problem Statement 1.)

> Status: foundations in place (tooling, CI, docs). Features are being built in phases — see docs/requirements.md.

## Run locally

Prerequisites: Node ≥ 20, pnpm 9.

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm verify     # typecheck, lint, unit tests, build, bundle-size budget
pnpm exec playwright install chromium webkit && pnpm e2e
```

## Mock API

Served by Vercel functions in production and by the Vite dev/preview server locally. Both call the same
handlers in `server/`, and tests call them through MSW ([ADR-0002](docs/adr/0002-one-query-engine-three-adapters.md)).

| Endpoint               | Description                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/tickets`     | `q`, `status`, `priority`, `channel`, `assignee` (comma lists; `unassigned` matches no assignee), `from`/`to` (inclusive `YYYY-MM-DD`), `sort` (`createdAt`, `-createdAt`, `priority`, …), `page` (0-based), `pageSize` (10–100). Returns `{ items, total, page, pageSize, requestId }`. Invalid params → 400 with `fieldErrors`. |
| `GET /api/tickets/:id` | One ticket (`TCK-000123`), or 404.                                                                                                                                                                                                                                                                                                |

Every request waits a random 200 ms–3 s and fails with a 503 about 1 time in 10. For demos and deterministic tests,
send the header `x-chaos: off | fail | slow` (or set `CHAOS=off` for the whole server).

```sh
curl -H 'x-chaos: off' 'http://localhost:5173/api/tickets?q=refund&status=open,pending&sort=-priority&pageSize=10'
```

## Documentation

- [Requirements & acceptance criteria](docs/requirements.md)
- [Architecture decisions](docs/adr/README.md)

Architecture, tradeoffs, sources and AI-usage sections will be completed as the build progresses.
