# Coding assistant instructions

This repository is Meridian, a Next.js frontend with a Python diligence service. Read `README.md` for the current product behavior, local run steps, and checks before changing code.

## Engineering skills

The Matt Pocock engineering skills are installed in this coding assistant environment. Use a skill the user names. Reach for a model-invocable skill when its workflow helps the task; user-invoked skills require the user to name them. The setup has already been run; do not rerun it for ordinary work. See `docs/agents/engineering-workflow.md` for the skill chooser and examples.

- GitHub Issues is the issue tracker. Read `docs/agents/issue-tracker.md` before creating, reading, or changing an issue.
- Read `docs/agents/triage-labels.md` before triage or applying an engineering state label.
- Read `docs/agents/domain.md` before changing domain terms or decisions. Use the root `GLOSSARY.md` and relevant `docs/adr/` records when they exist.
- Preserve unrelated working-tree changes. Make each change reviewable and run checks that cover the behavior changed.
- For frontend changes, use `npm run typecheck` and `npm run build` when relevant. For backend changes, use `uv run --locked python -m unittest discover -s tests -v` from `agent/` when relevant. Report what ran and any check you could not run.

The skills guide the coding assistant working on this repository. They are not part of the Meridian application's runtime research assistant.
