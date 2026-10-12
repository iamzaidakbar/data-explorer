# ADR-0006: Detail view is a nested route rendered in a native <dialog>

Status: Accepted · Date: 2026-10-12

## Context

R9: a row opens a deep-linkable detail view that closes without losing the list's scroll position or filters.
R8: keyboard and screen-reader support.

## Decision

- `/tickets/:ticketId` is a child route of `/tickets`; the list stays mounted beneath the drawer, so scroll position,
  virtualizer state and filters survive without any restore logic. Closing navigates back to `/tickets?<same params>`.
- The drawer uses `<dialog>.showModal()`: the browser supplies focus trapping, an inert background, top-layer
  stacking and Esc. Esc is intercepted (`cancel` event) so the route, not the browser, decides to close.
- The drawer is open for exactly as long as it is mounted; on unmount it returns focus to the opener (or to a
  caller-supplied target, for recycled virtual rows).

## Alternatives

- **Separate page** — unmounts the list; scroll restoration across 10k virtual rows becomes fragile.
- **Local-state drawer** — not deep-linkable.
- **Hand-rolled focus trap / third-party dialog** — more code or another dependency for what the platform provides.

## Consequences

- jsdom lacks `<dialog>`: unit tests use a minimal stand-in (tests/setup.ts); real modal behaviour is covered by
  Playwright in Chromium and WebKit.
