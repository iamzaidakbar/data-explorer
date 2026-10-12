# Data Explorer — Claude instructions

## What this is

Support-ticket explorer (assignment Problem Statement 1). Requirements & acceptance criteria: docs/requirements.md.
Decisions: docs/adr/. Do not restate them here.

## Commands

- pnpm dev # Vite dev server + mock API at /api (same handlers as Vercel)
- pnpm verify # typecheck + lint + unit + build + size (MUST pass before claiming done)
- pnpm test -- <path> # targeted unit/component tests
- pnpm e2e # Playwright (Chromium + WebKit, CHAOS=off), incl. axe checks

## Invariants (never break; each will have a test)

1. Server data is cached under a key derived ONLY from canonical URL params + pageIndex.
2. View state (q, filters, sort, row, ticketId) lives in the URL; no duplicate component/global state.
3. On a failed refetch, previous rows are removed, never shown as current.
4. Every fetch passes the AbortSignal it is given.
5. The detail drawer is a nested route; ExplorerPage must not unmount when it opens.
6. Contracts live only in src/shared/contract.ts; both client and server parse with them.

## Conventions

- TypeScript strict + noUncheckedIndexedAccess; no `any`; no non-null `!` without a comment.
- Module boundaries are lint-enforced: server/ imports only src/shared; features don't import each other;
  src/ui has no router or data fetching.
- New dependency → ask first and add an ADR. Version pins: TS 6.0.x (typescript-eslint cap), ESLint 9 (jsx-a11y cap), MSW 2 (vitest peer).
- Tests query by role/name; never by class; test-id only when unavoidable.

## Workflow

- Read only the files you need; start from docs/ for orientation instead of scanning the tree.
- Plan mode for anything touching >2 files or a contract.
- Small Conventional Commits; one concern per commit. Do not push without being asked.
- Before reporting done: run `pnpm verify` (and `pnpm e2e` if UI changed), report output verbatim, list anything unverified.
