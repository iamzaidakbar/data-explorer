# Requirements — Ticket Explorer (Problem Statement 1)

Source of truth: _Frontend Developer Assignment.pdf_, Problem Statement 1. Rows R1–R9 are confirmed requirements;
"Acceptance criteria" are our testable interpretation. Assumptions are listed separately.

| ID  | Requirement (condensed from PDF)                                                                                              | Acceptance criteria                                                                                                                                                            | Test         |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| R1  | ≥10,000 records from a mock API we control                                                                                    | Seeded generator yields 10,000 tickets, identical across cold starts                                                                                                           | T7           |
| R2  | Server-side search, filtering, sorting, pagination                                                                            | `GET /api/tickets` supports `q`, `status`, `priority`, `channel`, `assignee`, `from`/`to`, `sort`, `page`, `pageSize`; stable sort (id tiebreaker), no dupes/gaps across pages | T7           |
| R3  | Random latency 200 ms–3 s; ~1 in 10 requests fail                                                                             | Uniform latency in [200, 3000] ms; 10% → 503 JSON; overridable only via `x-chaos` header / `CHAOS` env                                                                         | T7, manual   |
| R4  | Never show stale results; debounce search; cancel/ignore superseded requests                                                  | Slow response for an older query resolving after a newer one never renders; superseded request aborted; ≤1 request per debounce window                                         | T1, T2, T5   |
| R5  | Search, filters, sort and page/scroll in URL; refresh, back/forward and shared links restore the exact view                   | Reload/back/forward/shared URL reproduce filters, sort, scroll row and open ticket                                                                                             | T6, T8       |
| R6  | Smooth scrolling through thousands of rows; virtualization or infinite loading; no unnecessary re-renders                     | ~40 row DOM nodes regardless of total; no long tasks >50 ms while scrolling (4× CPU throttle)                                                                                  | manual trace |
| R7  | Distinct loading, empty, error and partial-failure states; failed request shows message + retry; old data never looks current | State machine in ADR-0004; failed refetch removes old rows; per-page error rows with retry                                                                                     | T3, T4       |
| R8  | Keyboard-only table, filters, pagination; visible focus; result counts and errors announced                                   | Keyboard-only E2E passes; axe 0 serious/critical; live region announces counts and errors                                                                                      | T9           |
| R9  | Row opens deep-linkable detail view; closing keeps list scroll and filters                                                    | `/tickets/:id?…` works cold; close returns focus to origin row, same scroll                                                                                                    | T8           |

## Deliverables (from PDF "What to Submit")

- [x] D1 Live deployment (Vercel free tier): https://data-explorer-puce.vercel.app (auto-deploys from `main`)
- [ ] D2 Demo video ≤ 5 min including a live failure/edge case — _to record_
- [x] D3 Public GitHub repo; README: run locally, architecture & state-management decisions, tradeoffs
- [x] D4 Targeted automated tests (races, rollback/failure handling) — see docs/testing.md
- [x] D5 Sources & references list (README)
- [ ] D6 AI usage disclosure (docs/ai-usage.md) + shared chat history — _share link to add_

## Assumptions (ours, not in the PDF)

- **Partial failure** = some pages of a result set loaded while others failed.
- **Scroll position in URL** = `row=` anchor (top visible row index), written with replaceState.
- **History granularity**: typing replaces history; discrete actions (filter, sort, page jump, open drawer) push.
- **Retry**: one silent automatic retry for GETs, then a visible error with Retry (ADR-0005).
- **Out of scope**: auth/RBAC, persistence, mutations, charts, export — not requested.
