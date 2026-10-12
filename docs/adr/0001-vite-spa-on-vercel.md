# ADR-0001: Vite + React SPA deployed on Vercel

Status: Accepted · Date: 2026-10-12

## Context

The explorer is entirely client-interactive (search, filters, virtualized grid). The assignment requires a mock API
with latency and failures, and a live deployment on a free tier. Graders will throttle the network in DevTools.

## Decision

Vite + React 19 + TypeScript single-page app, React Router for URL state, deployed to Vercel with the mock API as
Vercel serverless functions under `/api`.

## Alternatives

- **Next.js App Router** — familiar from other projects, but SSR/RSC brings no benefit here and adds Suspense
  boundaries around `useSearchParams` and more framework surface to reason about.
- **Static SPA + MSW service worker in production** — fewest moving parts, but the "server" runs in the same tab,
  which is less convincing and hides real HTTP behaviour from DevTools.

## Consequences

- Real HTTP requests that can be throttled, blocked and inspected in DevTools.
- Function cold starts add latency; acceptable since the mock already injects 200 ms–3 s.
- Toolchain pins: TypeScript 6.0 (typescript-eslint supports < 6.1), ESLint 9 (jsx-a11y peer), MSW 2 (vitest peer).
