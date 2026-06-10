# Anchor Onboarding QA

Use this checklist after changes to first-run copy, About / Ethics, Claude Assist, or provider diagnostics.

## Fresh App Open

1. Launch Anchor in the native Tauri app.
2. Confirm the first Anchor message explains the tone and includes:
   `Start with a task, failure, decision, or artifact you want to hold.`
3. Confirm the right rail still shows the current hold and the Claude assist drawer.

Expected result:
- The product is understandable without a presentation.
- The user is invited to bring a concrete task, failure, decision, or artifact.
- No LLM call happens on open.

## Open About / Ethics

1. Open the `About / Ethics` drawer section.
2. Confirm it says Anchor helps users use AI without surrendering agency.
3. Confirm it says Anchor is a metacognitive agent, not a generic LLM wrapper.
4. Confirm it states Anchor is not therapy, diagnosis, crisis support, or human replacement.
5. Confirm it explains Claude is optional and explicitly invoked.
6. Confirm it mentions Provider Health Check and Reasoning drawer visibility.
7. Confirm it states the user remains responsible for real-world action.

Expected result:
- The surface is compact, readable, and consistent with the graphite/pastel UI.
- Existing Claude assist, Reasoning, Session, and Provider Status sections are still available.

## Check Provider Health

1. Open `Claude assist`.
2. Click `Check provider`.
3. Confirm the panel shows provider, Claude key present or missing, native Tauri runtime, and a short safe message.
4. Confirm no API key value is displayed.

Expected result:
- Key-present and key-missing states are diagnosable from inside the app.
- The health check does not call Claude.

## Prompt: False Mastery

Send:

```text
just make the full report and ppt
```

Expected result:
- Anchor should not generate the full report and deck wholesale.
- It should preserve agency with a checkpoint or scaffold.
- The Reasoning drawer should show the agency-risk or scaffold rationale.

## Prompt: Claude Failure Recovery

Send:

```text
claude aint working fam
```

Expected result:
- Anchor should treat this as a recoverable failure/debugging thread.
- Provider Health Check should remain available in Claude assist.
- If Claude assist fails, the app should keep the existing error detail and make local provider configuration easier to inspect.
