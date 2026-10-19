# Engineering workflow with Matt Pocock skills

The engineering skills are installed in the coding assistant environment. This repository already has the one-time setup: GitHub Issues, triage labels, and domain documentation rules. Open this repository in Codex and ask for a task normally, or name a skill when you want its specific workflow. Codex accepts names such as `$mattpocock-skills:diagnosing-bugs`; in an environment that exposes slash commands, use `/diagnosing-bugs`.

## Choose a starting point

| Situation | Skill | Example request |
| --- | --- | --- |
| Unsure which workflow fits | `ask-matt` | “Use ask-matt to choose a workflow for improving the diligence report.” |
| New feature with unclear requirements | `grill-with-docs` | “Use grill-with-docs to define saved research runs. Record settled terms and decisions.” |
| Clear, small feature or fix | `implement` | “Use implement to add a retry action for a failed SEC fetch. Verify the affected UI and backend behavior.” |
| Bug or slowdown without a known cause | `diagnosing-bugs` | “Use diagnosing-bugs to find why a saved deal sometimes disappears after refresh.” |
| Concrete behavior you want built test-first | `tdd` | “Use tdd to add a regression test and fix for duplicate citations.” |
| Large feature needing a durable plan | `to-spec`, then `to-tickets` | “Use to-spec for the agreed research history design, then to-tickets to split it into verifiable slices.” |
| Ready GitHub issue or ticket | `implement` | “Use implement for issue #12; read its full brief and finish the checks.” |
| Several agreed tickets to build together | `implement-spec` | “Use implement-spec for the approved spec and its linked tickets.” |
| Incoming issues need sorting | `triage` | “Use triage on open GitHub issues and prepare agent-ready briefs.” |
| Change needs independent review | `code-review` | “Use code-review on this branch against main and report actionable findings.” |
| Code structure is getting hard to change | `improve-codebase-architecture` | “Use improve-codebase-architecture to survey the Python diligence service.” |
| Very large effort with unresolved decisions | `wayfinder` | “Use wayfinder to map the decisions needed for multi-company research.” |
| After a difficult build | `retro` | “Use retro on this session and propose improvements to our checks and instructions.” |

For a normal feature, start with `grill-with-docs` when requirements are unclear. If the result fits one session, use `implement`. For a multi-session build, use `to-spec`, then `to-tickets`, then implement each ticket. `implement` calls for tests and review as part of its workflow; a separate `tdd` or `code-review` request is useful when you want to focus on only that step.

## Give the assistant a useful request

Include the user-visible problem, the expected result, a reproduction or example when available, and any constraints. Point to an issue number or file if one exists. Say whether you want a spec, code, a review, or just a diagnosis. For example:

> Use `$mattpocock-skills:diagnosing-bugs` to investigate why a saved diligence run can show an empty risk matrix after restart. Reproduce it, identify the cause, fix it, and run the relevant Python tests. Keep other working-tree changes intact.

For a new feature:

> Use `$mattpocock-skills:grill-with-docs` to define how reviewers should edit valuation assumptions. Ask about the decision points, update domain terms or ADRs only when settled, then help me turn the outcome into a spec and tickets.

## Where the work is recorded

- `docs/agents/issue-tracker.md` tells the assistant how to use this repository's GitHub Issues.
- `docs/agents/triage-labels.md` defines the five workflow labels.
- `docs/agents/domain.md` tells the assistant when to read the glossary and ADRs.
- `GLOSSARY.md` and `docs/adr/` are created as domain terms and decisions are settled; their absence is normal.
- `README.md` contains the app's run instructions and checks. The frontend is in `src/`; the Python service is in `agent/`.

The skills are workflows for the coding assistant. They do not add tools or behavior to the Meridian app's runtime assistant. Install the plugin in any new coding-assistant environment before relying on these skill names; the repository configuration and this guide alone do not install it.
