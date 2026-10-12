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

## Documentation

- [Requirements & acceptance criteria](docs/requirements.md)
- [Architecture decisions](docs/adr/README.md)

Architecture, tradeoffs, sources and AI-usage sections will be completed as the build progresses.
