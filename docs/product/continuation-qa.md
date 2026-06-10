# Anchor Continuation Memory QA

Use this checklist after changes to short continuation, recovery, or session-memory behavior.

## Fresh Continuation With No Active Task

Send:

```text
proceed
```

Expected result:
- Anchor should ask for a task boundary: build, debug, report, present, or decide.
- It should not invent a project thread.

## Continue Active Product Thread

1. Start with a concrete Anchor product task, such as:

```text
Build the next Anchor product behavior. Keep Claude optional and preserve the reasoning drawer.
```

2. Then send:

```text
proceed
```

Expected result:
- Anchor should continue the current thread.
- The reply should say the next useful step and stay concise.
- The Reasoning drawer should show a continuation signal.

## Next

After an active task exists, send:

```text
next
```

Expected result:
- Anchor should continue the current task rather than ask generic clarification.

## Done

After a report, presentation, or product task step, send:

```text
done
```

Expected result:
- Anchor should acknowledge the checkpoint.
- It should move to the next bounded step.

## Works After Provider Debugging

1. Send:

```text
claude aint working fam
```

2. Use the Provider Health Check or fix the environment.
3. Then send:

```text
works
```

Expected result:
- Anchor should confirm the provider path is alive.
- It should suggest one real Claude assist prompt before changing code.
- It should not expose or request API key values.

## Cool

After a feature or task step, send:

```text
cool
```

Expected result:
- Anchor should lock the checkpoint and move to a next bounded product step.

## Huh

After Anchor gives a step, send:

```text
huh
```

Expected result:
- Anchor should simplify the previous step.
- It should not restart the whole task.

## Oops

Send:

```text
oops
```

Expected result:
- Anchor should enter recovery mode.
- It should ask for the exact failure or the action that happened just before the break.
