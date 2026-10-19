# Validation record

Date: 19 October 2026. Baseline commit: `d42fb962d886fa552a5c2c03fbb9b4c9f7b613da`.

- Baseline `npm run typecheck`: **failed**, with two existing errors in `next.config.ts` (unused `@ts-expect-error` on line 6 and implicit `any` on line 8).
- `python docs/ma-diligence/build_proposal.py`: **passed**. Generates a proposal for nine existing files; parses the three candidate Python files with `ast.parse`.
- `git apply --check docs/ma-diligence/01-discovery-foundation.patch`: **passed** against the inspected working tree.
- `git diff --stat`: no tracked application changes. Only the new `docs/` deliverables appear in `git status --short`.

Patch applicability and Python syntax do not establish runtime correctness. The proposal was not applied. Candidate TypeScript typechecking, dependency installation/lockfile regeneration, live tools, browser workflows and numerical extraction are not tested. The patch deliberately exposes discovery-only functionality and unavailable metrics; production acceptance gates are in REPORT.md.

Research used official vendor/SEC pages cited in the report. The agent-reach skill's Exa CLI route was unavailable (`mcporter` missing), so research used the available web search tool. Agent Reach update check reported installed v1.5.0 current; no updates or software installations were performed.
