# features/explorer — rules

- Grid a11y contract (ADR-0007): `role=grid`, `aria-rowcount = total + 1`, `aria-rowindex = index + 2` on every
  row (placeholders too), exactly one row with `tabIndex=0`, arrows/PageUp/PageDown/Home/End/Enter on rows.
- Row height is fixed (`ROW_HEIGHT` in columns.ts); the virtualizer, scroll restore and tests depend on it.
- List states come only from `useTicketPages` (loading | error | empty | ready + failedPages). Never render rows
  from a different result set, never use placeholder/previous data (ADR-0004).
- URL writes go through `useExplorerParams`: push for discrete choices, replace for typing/scrolling.
- `TicketGrid` is keyed by result set; don't remove the key (scroll restore relies on a fresh mount).
- Tests: `explorer.race.test.tsx` (ordering/abort/debounce) and `explorer.states.test.tsx` (states, history,
  keyboard, drawer) use the controllable MSW server in tests/msw/controllable.ts. jsdom layout stubs live in
  tests/setup.ts.
