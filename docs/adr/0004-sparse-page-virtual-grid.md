# ADR-0004: Sparse-page virtualized grid with a URL row anchor

Status: Accepted · Date: 2026-10-12

## Context

R5 (URL restores the exact view, including scroll), R6 (smooth over thousands of rows) and R7 (distinct loading,
empty, error and partial-failure states; never show old data as current).

## Decision

- The grid virtualizes **all** `total` rows (TanStack Virtual, fixed 56 px rows) and fetches only the 50-row pages
  in view plus a 25-row prefetch margin. Each page is its own query keyed `['tickets', resultSetKey, page]`.
- Scroll position is the URL's `row=` (top visible row), written with replaceState after scrolling pauses (250 ms).
  Pager buttons and Back/Forward change `row=` and scroll the grid; the grid ignores echoes of its own writes.
- The grid body is remounted per result set (`key={resultSetKey}`) and starts at `row × rowHeight` via
  `initialOffset`; the header row stays mounted so focused sort buttons survive (review finding A1).
- A page counts as loaded only if its latest fetch succeeded: TanStack Query keeps old `data` after a failed
  refetch, and showing it would present old rows as current (review finding R1).
- States: no page of the current set settled → loading; the anchor page failed → error (no rows); total 0 → empty;
  some pages failed → those rows show as failed plus a partial-failure banner with "Retry failed rows".
- **Previous results are never shown while a new query loads** (we dropped the earlier "dimmed old rows" idea):
  with per-page queries, placeholder data from the old set could mix old and new pages in one view.

## Alternatives

- **Infinite scroll** — restoring row 5,000 needs 100 sequential fetches; partial failure is awkward.
- **Classic numbered pages** — no continuous scrolling through thousands of rows.
- **keepPreviousData/placeholderData** — risks mixing result sets (above); a brief skeleton is the honest choice.

## Consequences

- Requires `total` up front (the API returns it on every page). Fixed row height.
- A new search shows a short loading state instead of the previous results.
