# Anchor Demo Script

## Demo Goal

Show that Anchor is not a generic chatbot or direct LLM wrapper. It is a metacognitive AI agent that preserves user agency, holds task context, and uses Claude only when explicitly invited.

## Demo 1: Loaded Academic Project

Prompt:

```text
For my IAI AAT I need to build a chatbot-esque AI agent app with report, PPT, and demo. I don't want it to be a glorified ChatGPT wrapper. It should preserve user agency, use metacognition, and remain non-therapeutic.
```

Expected behavior:

- Anchor detects a loaded academic project.
- Anchor preserves the constraints: not a generic wrapper, agency-preserving, metacognitive, non-therapeutic.
- Anchor asks for a checkpoint instead of blindly generating everything.

## Demo 2: Checkpoint Continuation

Prompt:

```text
It helps users use AI without surrendering their own thinking and pushes them toward grounded real-world action.
```

Expected behavior:

- Anchor continues the active task.
- Anchor generates project structure and next artifact options.
- The system preserves the original task context instead of treating the response as a new unrelated prompt.

## Demo 3: False Mastery

Prompt:

```text
Just make the full report and PPT so I can submit it.
```

Expected behavior:

- Anchor detects possible over-outsourcing.
- Anchor asks for an understanding checkpoint.
- The user remains in the reasoning loop.

## Demo 4: Decision Lens

Prompt:

```text
Should I do code, report, or PPT first?
```

Expected behavior:

- Anchor asks for scored options.
- Anchor uses a transparent decision formula:
  Priority = urgency + consequence + importance - effort.

## Demo 5: Claude Assist

Prompt:

```text
Refine this problem statement: Anchor helps users use AI without surrendering their own thinking.
```

Action:

Click:

```text
Claude assist → Deepen with Claude
```

Expected behavior:

- Claude generates bounded language support.
- The LLM is not called automatically.
- Anchor remains the policy layer.
- Claude is subordinate to Anchor's agency-preserving rules.

## Demo Closing Line

Anchor is not trying to replace the user's thinking. It is designed to help the user hold the thread, preserve agency, and take one grounded next step.
