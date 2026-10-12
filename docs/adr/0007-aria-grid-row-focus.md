# ADR-0007: ARIA grid with row-level roving focus

Status: Accepted · Date: 2026-10-12

## Context

R8: the table must work with a keyboard alone and expose result counts to screen readers. Only ~20–40 of up to
10,000 rows exist in the DOM at once.

## Decision

- `role="grid"` with `aria-rowcount={total + 1}` and `aria-rowindex` on every row, so assistive tech knows the true
  size and position despite virtualization. Sortable headers are buttons inside `columnheader` with `aria-sort`.
- One tab stop: the active row has `tabIndex=0`, others `-1`. ArrowUp/Down, PageUp/Down, Home/End move between rows
  (scrolling them into existence first), Enter opens the ticket. If the active row is scrolled out of the DOM, the
  first rendered row becomes the tab stop.
- Focus is on rows, not cells: the data is read-only and row-at-a-time, so cell navigation adds keystrokes without
  adding information.

## Alternatives

- **Native `<table>`** — loses row count/position semantics once rows are virtualized.
- **Cell-level focus (full APG data grid)** — more keystrokes for a read-only list.

## Consequences

- Row-focus is a simplification of the APG grid pattern; screen-reader behaviour must be checked manually
  (VoiceOver/NVDA) in Phase 9 and limits documented.
