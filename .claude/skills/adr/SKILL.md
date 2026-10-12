---
name: adr
description: Create a new Architecture Decision Record in docs/adr and add it to the index. Use when making a significant or hard-to-reverse technical decision, or when adding a dependency.
---

1. Find the next number from docs/adr/README.md.
2. Create `docs/adr/NNNN-kebab-title.md` with: title line `# ADR-NNNN: Title`, `Status: Proposed · Date: <today>`,
   then sections Context, Decision, Alternatives, Consequences. Keep it under ~40 lines; cite requirement IDs (R1–R9).
3. Add a row to the index table in docs/adr/README.md.
4. Ask the user to accept before changing Status to Accepted.
