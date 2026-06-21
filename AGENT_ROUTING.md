# AGENT_ROUTING.md

## Purpose

This document defines how AI agents are selected for work in this project.

The project does not assume one universal implementation agent. Agent choice depends on task type, risk level, platform constraints, privacy boundary, and available verification tools.

## Authority Model

- Human owner: final authority and merge decision
- ChatGPT: supervisor, architect, task framer, adjudicator
- Codex CLI: bounded implementation contractor
- Local MLX agents: local routing, review, static critique, security/privacy analysis, future patch proposal
- External web models: optional manual second opinion only
- Tests/build/lint/typecheck: objective verification layer

## Default Rule

No implementation begins until the task has an approved route.

Each task should specify:

- task type
- primary agent
- reviewer
- allowed files
- forbidden files
- verification commands
- risk level
- escalation condition

## Routing Matrix

| Task Type | Primary Agent | Reviewer | Verification |
|---|---|---|---|
| Python script or utility | Codex | Local MLX / ChatGPT | `python`, `pytest`, compile check |
| Streamlit app | Codex | ChatGPT / local review | app smoke test |
| HTML/PDF report formatting | ChatGPT + human | visual inspection | browser/PDF print check |
| Documentation cleanup | Codex | human skim | markdown review |
| Shell script | Codex | ChatGPT | run in safe folder, shellcheck if available |
| Git/repo hygiene | Codex | human | `git status`, dry run |
| Swift pure model logic | Codex or human-led | ChatGPT / local MLX | `xcodebuild test` |
| SwiftUI UI polish | human-led | ChatGPT / local MLX | Xcode preview/build |
| macOS permissions | human-led | local security review | entitlement and runtime audit |
| App sandboxing | human-led | local security review | manual checklist |
| Keychain, auth, credentials | human-led | ChatGPT + local review | no secrets exposed |
| Architecture change | ChatGPT + human | local review | decision log |
| Dependency addition | human-approved only | local review | lockfile/build |
| Data/privacy policy | human-led | ChatGPT | written policy review |

## Risk Levels

### Low Risk

Examples:

- small documentation edits
- isolated helper functions
- formatting
- simple tests

Codex may implement after reading task spec.

### Medium Risk

Examples:

- feature logic
- UI state changes
- data model changes
- new scripts

Codex may implement only with explicit allowed files and verification commands.

### High Risk

Examples:

- authentication
- credentials
- sandboxing
- entitlements
- local filesystem access
- telemetry
- privacy-sensitive behavior
- architecture rewrites

Human-led by default. Agents may review, propose, or explain, but should not freely implement.

## Apple-Native Rule

For SwiftUI, macOS, sandboxing, entitlements, Keychain, local permissions, or Apple-native security boundaries:

- Codex is not the default primary agent.
- Human-led or ChatGPT-led planning is required.
- Local MLX review is preferred before patching.
- Xcode build/simulator/manual inspection is mandatory.
- Any file involving entitlements, permissions, signing, Info.plist, or privacy prompts requires explicit approval.

## Agent Communication Protocol

Agents communicate through files, not uncontrolled chat.

Allowed artifacts:

- `TASKS/current-task.md`
- `TASKS/reviews/local-review.md`
- `TASKS/reviews/chatgpt-adjudication.md`
- `TASKS/reviews/implementation-report.md`
- `TASKS/reviews/verification-log.md`
- `DECISIONS/*.md`
- `git diff`
- test/build output

## Task Route Template

Each task should include:

```md
## Agent Route

Task type:
Risk level:
Primary agent:
Reviewer:
Allowed files:
Forbidden files:
Verification commands:
Escalate to human if:
