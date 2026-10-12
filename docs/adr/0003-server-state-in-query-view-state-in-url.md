# ADR-0003: Server state in TanStack Query, view state in the URL

Status: Accepted · Date: 2026-10-12

## Context

R4 (never show stale results) and R5 (URL restores the exact view) are the core correctness requirements.

## Decision

- **View state** (q, filters, sort, row anchor, open ticket) lives only in the URL, parsed/serialized canonically.
- **Server state** lives in TanStack Query, keyed `['tickets', canonicalParams, pageIndex]`, with the query's
  `AbortSignal` passed to `fetch`. No global client store.

## Alternatives

- **Redux/Zustand** — would duplicate URL state and need hand-written request sequencing.
- **Hand-rolled fetch hooks with request ids** — workable, but re-implements caching, abort and retry.

## Consequences

- A late response for an old query can only populate the old key's cache entry; it cannot render under the current
  query. Abort is a bandwidth optimisation on top, not the correctness mechanism.
- Canonical serialization is load-bearing: equal views must produce equal keys (tested by URL round-trip tests).
- `staleTime` 30 s; cache entries for abandoned keys are garbage-collected by Query.
