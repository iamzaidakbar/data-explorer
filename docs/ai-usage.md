# AI usage

**Tool:** Claude Code (Anthropic), used as a pair programmer for planning, implementation, tests, and review.
**Share link:** _to be added (Claude conversation export)_.

## How the AI was directed

1. **Plan first.** The assignment PDF was turned into a written engineering blueprint (requirements R1–R9,
   architecture, ADRs, test plan, phased roadmap) and approved before any code was written. Stack and domain
   choices (Vite SPA + Vercel functions; support tickets) were explicit human decisions.
2. **Small phases with gates.** Each phase ended with `pnpm verify` (+ `pnpm e2e` for UI) and the actual output
   reviewed — "it works" from the AI was never accepted as evidence.
3. **Real-browser checks.** UI flows were driven with Playwright scripts and screenshots, not just unit tests.
4. **Independent reviews.** Separate read-only reviewer agents (race conditions / stale results; accessibility)
   reviewed the explorer; their findings were verified before being acted on.
5. **Mutation checks.** Key invariants were deliberately broken to confirm the tests fail.

## Notable corrections (AI output that was wrong or weak, and what changed)

| Where                             | Problem found                                                                                             | How it was caught                                  | Fix                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| Toolchain                         | Latest TypeScript (7) / ESLint (10) / MSW (3) violated peer ranges of typescript-eslint, jsx-a11y, vitest | `npm view … peerDependencies` before installing    | Pinned TS 6.0, ESLint 9, MSW 2 (documented)                 |
| Date-range test                   | Only checked first/last item — weak                                                                       | Lint error prompted a second look                  | Rewritten to compare against a brute-force count            |
| Filter checkboxes                 | Briefly reverted after click (router navigations are transitions)                                         | Playwright script: "checkbox did not change state" | `flushSync` for discrete URL updates via `react-router/dom` |
| Pager "Rows X–Y"                  | Counted overscan rows as visible                                                                          | Screenshot review                                  | Report the virtualizer's visible range                      |
| Focus return after closing drawer | Could focus an off-screen overscan row and scroll the list                                                | Failing E2E (scrollTop off by 8 rows)              | `preventScroll` + first _visible_ row as fallback tab stop  |
| E2E a11y scan                     | 22 contrast "violations"                                                                                  | Investigated: drawer mid fade-in animation         | Scan after animations settle (no product change)            |
| Bundle                            | 151 kB vs 120 kB budget                                                                                   | size-limit gate                                    | zod/mini (−17 kB) + budget reset with measured ADR-0008     |
| zod/mini                          | Lost readable API error messages                                                                          | Probed the 400 response                            | Server loads Zod's English locale                           |
| _Reviewer findings_               | _see below_                                                                                               |                                                    |                                                             |

## Reviewer findings and dispositions

_Filled in after the review round (Phase 6/7)._
