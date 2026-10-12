# ADR-0008: Bundle budget of 140 kB gzipped; zod/mini for the shared contract

Status: Accepted · Date: 2026-10-12

## Context

The initial 120 kB budget (set before any feature code) was exceeded at 151 kB after Phase 6. Measured breakdown
(gzipped): react-dom 68.1, react-router 30.5, zod (classic) 25.2, app 12.1, @tanstack/react-query 10.9,
@tanstack/react-virtual 7.9.

## Decision

- Switch the shared contract to `zod/mini` (functional, tree-shakable API): −17 kB, same validation on both sides.
  The server loads Zod's English locale so 400 responses keep readable field messages; the client doesn't need them.
- Set the budget to **140 kB** gzipped (134 kB at decision time), enforced by size-limit in CI.

## Alternatives

- **Replace React Router with a hand-rolled history hook** (−30 kB) — reimplements history/back-forward handling,
  the highest-risk area of the app. Rejected.
- **Skip client-side response validation** — breaks invariant 6 (contract parsed on both sides). Rejected.
- **Keep 120 kB and lazy-load** — the explorer _is_ the initial route; splitting saves little.

## Consequences

- ~6 kB headroom; any further growth needs a deliberate decision (a new ADR), not a silent bump.
