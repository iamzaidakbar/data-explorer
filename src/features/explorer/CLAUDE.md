# features/explorer — rules

- Grid a11y contract (ADR-0007): `role=grid`, `aria-rowcount = total + 1`, `aria-rowindex = index + 2` on every
  row (placeholders too), exactly one row with `tabIndex=0`, arrows/PageUp/PageDown/Home/End/Enter on rows.
- Row height is fixed per mount (`getRowHeight()` = 3.5rem in px, 56 at default font size); the virtualizer,
  scroll restore and tests depend on it.
- List states come only from `useTicketPages` (loading | error | empty | ready + failedPages). Never render rows
  from a different result set, never use placeholder/previous data (ADR-0004).
- URL writes go through `useExplorerParams`: push for discrete choices, replace for typing/scrolling.
- The grid _shell_ (header row) stays mounted across result sets so header controls keep focus; only `GridBody` is
  keyed by result set (scroll restore relies on its fresh mount).
- A list state only uses pages whose latest fetch succeeded (`status === 'success'`), never stale `data` kept
  after a failed refetch.
- Controls that disappear or disable while focused must hand focus somewhere deliberate (use `aria-disabled`).
- Tests: `explorer.race.test.tsx` (ordering/abort/debounce) and `explorer.states.test.tsx` (states, history,
  keyboard, drawer) and `explorer.review.test.tsx` (review regressions) use the controllable MSW server in tests/msw/controllable.ts. jsdom layout stubs live in
  tests/setup.ts.
