# Testing strategy

A few targeted tests for the riskiest behaviour, over broad shallow coverage. Every test runs the **real** query
engine and handlers (through MSW in jsdom, through Vite preview in Playwright); only time, ordering and failures
are controlled.

| ID  | What it proves                                                                                                                             | Where                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| T1  | A slow response for an older search that arrives after the newer one never renders — also when the network request is not actually aborted | `src/features/explorer/explorer.race.test.tsx`             |
| T2  | The superseded request is aborted                                                                                                          | same                                                       |
| T3  | When a new query fails, old rows disappear and an error + Retry is shown and announced                                                     | `explorer.states.test.tsx`                                 |
| T4  | Partial failure marks only the failed page; Retry refetches only that page                                                                 | same                                                       |
| T5  | Fast typing → one request, one announcement                                                                                                | `explorer.race.test.tsx`                                   |
| T6  | URL parse/serialize round-trips; invalid/hostile params degrade to defaults; canonical keys                                                | `src/lib/url-state.test.ts`, `src/shared/contract.test.ts` |
| T7  | Engine: filters, search, inclusive dates, stable sort, no duplicates/gaps across pages under ties                                          | `server/query-engine.test.ts`                              |
| T8  | Filters + sort + scroll + open ticket survive reload; Back/Forward walk history                                                            | `e2e/explorer.spec.ts`                                     |
| T9  | Keyboard-only flow; modal focus never reaches the background; axe scans of results/error/partial/empty/drawer                              | `e2e/explorer.spec.ts`, `e2e/smoke.spec.ts`                |

**Do the tests catch regressions?** Checked by breaking the code on purpose (mutation check):
removing `q` from the cache key fails all four race tests; not passing the AbortSignal fails only the abort test
(the stale-result tests still pass — showing that keying, not cancellation, is what guarantees correctness).

## Determinism

- Unit/integration: `tests/msw/controllable.ts` holds requests until the test releases them (forcing any response
  order) and fails requests on demand. No wall-clock sleeps decide outcomes.
- jsdom has no layout: `tests/setup.ts` stubs element sizes, `scrollHeight` and `scrollTo` for the virtualizer, and a
  minimal `<dialog>`; real modal/focus behaviour is covered by Playwright.
- E2E runs the preview server with `CHAOS=off`; failure tests opt in via the "Simulated network" menu
  (`x-chaos` header).

## Quality gates (`pnpm verify`, and CI)

| Gate                                                                        | Threshold                                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `tsc` strict + `noUncheckedIndexedAccess`                                   | 0 errors                                                                                   |
| ESLint (typescript-eslint strict, react-hooks, jsx-a11y, module boundaries) | 0 errors, 0 warnings                                                                       |
| Vitest                                                                      | all pass; ≥ 90% lines on query engine, URL state, page loading hook (`pnpm test:coverage`) |
| Build + size-limit                                                          | initial JS ≤ 140 kB gzipped                                                                |
| Playwright (Chromium + WebKit) + axe                                        | all pass; 0 serious/critical violations                                                    |

## Performance (measured on production, 2026-10-12)

Chromium, 1280×800, **CPU throttled 4×** via DevTools protocol, network simulation off:

| Scenario                                     | Result                                      |
| -------------------------------------------- | ------------------------------------------- |
| Wheel-scrolling ~2,500 rows over 5.8 s       | **59.9 fps average, 0 long tasks (>50 ms)** |
| Jump straight to row 9,000 (scrollbar drag)  | 0 long tasks                                |
| Row elements in the DOM at any time          | 25 (of 10,000)                              |
| First rows on screen (production, chaos off) | ~2 s incl. cold function + network          |

Script: drives `page.mouse.wheel`, counts `requestAnimationFrame` frames and `PerformanceObserver('longtask')`
entries. Re-run it after changes that touch rows or the grid.

## Accessibility tree (automated inspection)

Chromium's accessibility tree for the grid (what screen readers consume) was dumped on production: grid named
"Support tickets", ~24 rows exposed (virtualized), each row read as one line of its cells, six column headers,
polite `status` + assertive `alert` live regions present at load. This found one issue — CSS `text-transform:
uppercase` leaked into header names ("SUBJECT"), which some screen readers spell letter by letter — now fixed.

## Manual screen-reader checks (needs a human)

Automated checks can't hear what a screen reader says. Five-minute script for each pairing:

1. Load `/tickets`. Expect "10,000 tickets found" to be announced.
2. Tab to the table. Expect the grid name, a row position (e.g. "row 2 of 10,001") and the row's content.
3. Arrow Down twice, then End. Expect position to update to the last row.
4. Type "refund" in search. Expect one announcement with the new count (not one per keystroke).
5. Set Simulated network → Always fail, tick a filter. Expect the error to be announced immediately.
6. Enter on a row. Expect the dialog's title (ticket subject) announced; Esc returns to the same row.
7. Note whether rows read sensibly in browse vs focus mode (open question from review A11: `grid` vs `treegrid`).

| Check                              | Result                       |
| ---------------------------------- | ---------------------------- |
| VoiceOver + Safari (macOS)         | _pending — needs manual run_ |
| NVDA + Firefox or Chrome (Windows) | _pending — needs manual run_ |
