# AGENTS.md

## Purpose
This file defines how AI coding agents must operate inside this repository.

Agents are subordinate assistants. The human owner is the final product manager, architect, and merge authority.

## Roles
- ChatGPT: strategy, task specs, architecture, review adjudication.
- Codex CLI: implementation agent. It must read this file and TASKS/current-task.md before editing.
- Gemini / secondary reviewer: adversarial reviewer by pasted diff/context.
- Human owner: final approval, commit, merge, and product judgment.

## Product Principles
- Preserve clarity over cleverness.
- Keep the demo understandable and presentation-friendly.
- Avoid generic AI-wrapper bloat.
- Keep UI clean, minimal, and explainable.
- Do not obscure the core DroNet / visual navigation story.

## Engineering Principles
- Make the smallest correct change.
- Do not modify unrelated files.
- Avoid unnecessary dependencies.
- Do not rewrite architecture unless explicitly instructed.
- Keep local development compatible with .venv.
- Do not hardcode user-specific absolute paths.
- Do not commit secrets, credentials, tokens, caches, or environment folders.

## Scope Rules
Codex must implement only TASKS/current-task.md.

Do not:
- Expand scope.
- Add dependencies without approval.
- Refactor unrelated code.
- Change product behavior silently.
- Touch .venv, caches, generated files, or secrets.
- Commit or push unless explicitly instructed.

## Testing Requirements
Run the checks listed in TESTING.md and TASKS/current-task.md.

If checks cannot be run, say why.

## Definition of Done
A task is done only when:
1. Requested behavior is implemented.
2. Scope is respected.
3. Checks/tests were run or clearly explained.
4. Changed files are listed.
5. Risks are stated.
6. Human owner can inspect the diff cleanly.

## Completion Report
Every implementation must report:
- Summary
- Files changed
- Commands run
- Results
- Risks
- Out-of-scope recommendations
