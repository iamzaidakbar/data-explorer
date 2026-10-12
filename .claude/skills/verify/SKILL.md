---
name: verify
description: Run the project's quality gate (typecheck, lint, unit tests, build, bundle size, optionally e2e) and report results faithfully. Use before claiming any task is done.
---

1. Run `pnpm verify`. If the change touched UI, routing or the API, also run `pnpm e2e`.
2. Report each stage as pass/fail with the relevant output lines verbatim. Never summarise a failure as a pass.
3. For failures: identify the root cause from the output before changing code; do not weaken tests, thresholds or lint rules to get green.
4. List anything you could not verify (e.g. manual screen-reader checks, production deploy).
