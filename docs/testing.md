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

## Manual checks (not automatable)

- Screen readers: VoiceOver (Safari) and NVDA (Firefox/Chrome) — grid position announcements, count/error
  announcements, drawer labelling. Results recorded below.
- DevTools: Slow 3G throttling and Offline while typing and paging.

| Check              | Result              |
| ------------------ | ------------------- |
| VoiceOver + Safari | _pending (Phase 9)_ |
| NVDA + Firefox     | _pending (Phase 9)_ |
