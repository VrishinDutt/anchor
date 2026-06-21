# TASKS/current-task.md

## Task Title
TBD

## Goal
Describe the exact outcome required.

## Background
Explain why this task matters.

## Non-Goals
- Do not broaden scope.
- Do not refactor unrelated code.
- Do not add dependencies unless approved.

## Files Likely Involved
- TBD

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## UX Requirements
Describe user-facing expectations if applicable.

## Engineering Constraints
- Preserve existing architecture unless explicitly stated.
- Keep changes small and inspectable.
- Avoid user-specific absolute paths.
- Do not touch .venv, caches, secrets, or generated files.

## Tests / Checks To Run
- python -m compileall .
- st, if Streamlit behavior is affected.

## Risks
TBD

## Rollback Plan
Use git checkout -- <changed-files> or revert the commit.

## Open Questions
- TBD
