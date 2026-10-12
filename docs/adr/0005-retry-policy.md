# ADR-0005: One automatic retry, then a visible error

Status: Accepted · Date: 2026-10-12

## Context

The mock API fails ~10% of requests by design (R3). R7 requires failed requests to show a clear message and a
Retry. TanStack Query's default (3 retries) would make failures nearly invisible (0.1⁴ ≈ 0.01%) and slow to surface
(each attempt can take up to 3 s).

## Decision

Queries retry once with jittered exponential backoff (~400–700 ms), then surface the error with a manual Retry.
`refetchOnWindowFocus` is off so settled results never flip into a refreshing state unprompted.

## Alternatives

- **0 retries** — every transient blip becomes a user-facing error (10% of page loads).
- **Default 3 retries** — hides the failure behaviour the assignment asks us to handle; up to ~12 s to show an error.

## Consequences

- A visible error appears on ~1% of page fetches under default chaos; the `x-chaos: fail` header forces it for demos.
- Tests disable retries so failure paths are deterministic.
