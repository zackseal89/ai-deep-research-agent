# Start here: developing with Codex and the engineering skills

This is a user guide for the **coding assistant**. The skills help Codex plan, build, test, and review code. They do not run inside the Meridian application's research assistant.

There are two kinds of commands below:

- **Chat request**: type it into Codex. A skill name starts with `$mattpocock-skills:`. Replace text in `[square brackets]` with your details. If your agent shows slash commands instead, use `/skill-name`.
- **Terminal command**: run it in PowerShell from the project folder. You can also ask Codex to run it for you.

You only need to remember five starting points: `setup-matt-pocock-skills` once per repository, `grill-with-docs` for an unclear idea, `implement` for defined work, `diagnosing-bugs` for a bug, and `code-review` for an independent review. If unsure, use `ask-matt`.

The plugin is already installed in your current Codex environment. On a different machine or installation, follow section 6 first.

## 1. Start a project from zero

1. **Create and open a folder.** In PowerShell:

   ```powershell
   New-Item -ItemType Directory -Path .\my-project
   Set-Location .\my-project
   git init
   git branch -M main
   ```

   Open this folder as a project in Codex. Pick a meaningful folder name in place of `my-project`. If Codex creates the project folder for you, skip these terminal commands.

2. **Choose where work will be tracked.** For GitHub Issues, create an empty repository on GitHub (leave its README, `.gitignore`, and license options unchecked), copy its HTTPS URL, then connect this folder:

   ```powershell
   git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
   ```

   Replace the URL with your repository's URL. If this folder already has an `origin` remote, skip this command. You can ask Codex to inspect and connect the remote for you. If you do not want a GitHub repository yet, choose local markdown in the next step.

3. **Set up this skill suite once for the new repository.** Chat request:

   > Use `$mattpocock-skills:setup-matt-pocock-skills` in this repository. Use GitHub Issues for work tracking and the default triage labels. Put the agent instructions in `AGENTS.md` if there is no existing instruction file. Show me the draft requested by the skill, then complete the setup.

   If you have no GitHub repository, replace “Use GitHub Issues” with “Use local markdown.” You can switch later by rerunning setup. The plugin is installed once in your coding environment; this repository setup is done once **per project**.

4. **Describe the product before requesting code.** Chat request:

   > Use `$mattpocock-skills:grill-with-docs` to define [the product and its first useful feature]. Ask about users, expected behavior, constraints, and how we will know it works. Record settled domain terms and decisions.

   Answer its questions. You do not need a full specification at the start. The goal is a small first feature that can be run and checked.

5. **Ask Codex to scaffold the project.** Chat request:

   > Create the smallest runnable version of [the product] using [your preferred stack, or choose a suitable one]. Add a README with run and test commands, a `.gitignore`, and one meaningful check for the first feature. Run it and tell me what works.

   If you have no preferred stack, say so. Codex should make a reasonable choice and explain it. Do not install a framework manually unless you want to.

6. **Build the first small feature.** Chat request:

   > Use `$mattpocock-skills:implement` to build [one defined, user-visible behavior]. Run the relevant checks, review the change, and explain how I can try it.

7. **Save and publish the result.** Run `git status --short` to see changed files. Then ask Codex: “Commit only the reviewed project files and push `main` to `origin`.” On the first push, the terminal equivalent is `git push -u origin main`. If you chose local markdown and have no remote, commit locally and skip the push.

## 2. Start in an existing codebase

Open the repository in Codex. Ask:

> Read the README and agent instructions, inspect the current Git status, and explain how to run and test this project. Do not change code yet.

If `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, and `docs/agents/domain.md` are absent, run `$mattpocock-skills:setup-matt-pocock-skills` once. If they exist, do **not** run setup again for normal development.

**For this Meridian repository, setup is already complete.** Open the project and go straight to a feature, bug, or review request.

## 3. Everyday development: choose one path

| What you have | Start with | Copyable chat request |
| --- | --- | --- |
| An idea that needs decisions | `grill-with-docs` | “Use `$mattpocock-skills:grill-with-docs` to define [feature]. Help me settle behavior and terminology before implementation.” |
| A clear, small task | `implement` | “Use `$mattpocock-skills:implement` to [specific change]. Run relevant checks and show me the result.” |
| A bug with an unknown cause | `diagnosing-bugs` | “Use `$mattpocock-skills:diagnosing-bugs` to reproduce [symptom], find its cause, fix it, and verify the fix.” |
| A change that needs review | `code-review` | “Use `$mattpocock-skills:code-review` to review this branch against `main`. Report actionable findings with file locations.” |
| You do not know which path fits | `ask-matt` | “Use `$mattpocock-skills:ask-matt` to choose the right workflow for [goal].” |

Give Codex the **symptom or desired behavior**, one concrete example, and any constraint that matters. For a bug, include how to reproduce it. For an existing GitHub issue, say “issue #12” or paste its link. The assistant can inspect files and run commands; you do not need to list every file it should edit.

## 4. When a feature is too large for one session

Use this sequence only when a feature has several parts or decisions:

1. `grill-with-docs`: settle requirements and domain language.
2. `to-spec`: turn the agreed conversation into a specification on the configured issue tracker.
3. `to-tickets`: split the specification into small, verifiable GitHub issues.
4. `implement`: finish one ready ticket at a time, using its issue number. For a coordinated build of all tickets, explicitly request `implement-spec`.
5. `code-review`: review the completed branch or pull request when you want another focused review.

You can say, for example:

> Use `$mattpocock-skills:to-spec` to turn our agreed design into a spec issue. Then use `$mattpocock-skills:to-tickets` to split it into independently verifiable work. Show me the ticket order.

The spec and tickets live in GitHub Issues for this repository. `implement` includes testing and review in its own workflow, so you normally do not need to request separate `tdd` and `code-review` steps for every small task.

## 5. Run and check this Meridian project

From the repository root, install frontend dependencies once and check the frontend:

```powershell
npm ci
npm run typecheck
npm run build
```

From the `agent` folder, install locked Python dependencies once and run backend tests:

```powershell
Set-Location agent
uv sync --locked
uv run --locked python -m unittest discover -s tests -v
```

Use `Set-Location ..` to return to the repository root. For local app startup and required environment variables, follow `README.md`. Ask Codex to run only checks relevant to a small change; a full build is useful before shipping.

Useful Git commands from the repository root:

```powershell
git status --short       # See changed files
git diff                 # See unstaged edits
git log -1 --oneline     # See the latest commit
git push                 # Publish committed changes
```

Codex can run these for you. Before asking it to commit, check that the changed files are the ones you intended. If it created a pull request, ask for a link and a short summary of what passed.

## 6. If a skill is missing in a new Codex installation

The repository contains **configuration**, not the plugin itself. Install the plugin once in that Codex environment, then reopen the project:

```powershell
codex plugin marketplace add mattpocock/skills
codex plugin add mattpocock-skills@mattpocock
```

These installation commands come from the installed plugin's README. You do not run them for every repository. If you use Claude Code or another coding assistant, install the same skill suite using that assistant's plugin mechanism; the repository's `AGENTS.md` and `docs/agents/` remain useful project context.

## Less common skills

- `triage`: sort incoming issues and prepare clear briefs for an agent.
- `tdd`: focus on a test-first change.
- `research`: investigate external technical facts and save findings.
- `improve-codebase-architecture`: survey structure before a larger refactor.
- `wayfinder`: resolve decisions for a project too large to plan in one session.
- `retro`: improve instructions and checks after a difficult build.

For this repository, the assistant should read `AGENTS.md`, `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, and `docs/agents/domain.md` as relevant. `GLOSSARY.md` and `docs/adr/` may be created later when domain language or decisions are settled.
