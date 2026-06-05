# Anchor

**Anchor** is a metacognitive AI agent prototype for digital autonomy and grounded action.

It is not designed to replace thinking, therapy, human connection, or real-world action. Instead, it introduces useful friction so users remain active participants in their own reasoning.

## Core Idea

Most AI assistants reduce friction by immediately giving answers. Anchor takes a different approach:

> Help the user use AI without surrendering agency to AI.

Anchor helps users clarify loaded tasks, detect possible false mastery, preserve project boundaries, and move toward one grounded next action.

## Current Prototype Features

- Tauri + React + TypeScript desktop app
- Local-first rule-based agent engine
- Task parser for domain, artifacts, constraints, and complexity
- Agency risk detection
- Metacognitive checkpointing
- Active task continuity
- Artifact routing for:
  - project definition
  - code scaffold
  - report structure
  - PPT flow
  - demo script
  - viva explanation
- Decision Lens scoring
- Optional Claude assist through a constrained policy layer
- Session summary copy/export
- Optional reasoning drawer
- About / Ethics drawer
- Minimal Apple-widget-like UI

## Agent Architecture

```text
User input
  ↓
Anchor local task parser
  ↓
Cognitive state mapper
  ↓
Agency risk detector
  ↓
Response policy engine
  ↓
Task-specific local response generator
  ↓
Action card generator
  ↓
Optional Claude assist only when explicitly requested
```

## LLM Policy Layer

Anchor does not send every message directly to a model.

The flow is:

```text
User message
  ↓
Anchor policy layer decides allowed help type
  ↓
Claude is called only when the user clicks "Deepen with Claude"
  ↓
Claude generates bounded language support
  ↓
Anchor preserves agency, task context, and next-action framing
```

Claude is a subordinate language module, not the agent.

## Anchor Loop

```text
Notice → Name → Narrow → Choose → Act → Return
```

## Ethical Boundary

Anchor is not a therapist, clinical tool, diagnosis system, crisis tool, or replacement for human support.

It avoids claiming to fix mental health or productivity. Its goal is narrower and more honest: help the user clarify the thread, preserve agency, and take one grounded step.

## Running with Claude Assist

Anchor can run as a local-first agent without any LLM provider. Claude Assist is optional and only runs when the user explicitly clicks **Deepen with Claude**.

For local Claude testing:

```bash
export ANCHOR_LLM_PROVIDER="claude"
export ANTHROPIC_API_KEY="your-anthropic-key"
npm run tauri dev
```

Do not commit real API keys. Keep secrets in the shell environment or a local untracked environment file.

## Development

Install dependencies:

```bash
npm install
```

Run development build:

```bash
npm run tauri dev
```

Build frontend:

```bash
npm run build
```

Check Rust backend:

```bash
cd src-tauri
cargo check
cd ..
```

## Tech Stack

- Tauri v2
- React
- TypeScript
- Rust-backed native shell
- Local rule-based reasoning engine
- Optional Claude API provider

## Status

Prototype stage. Built initially for an IAI AAT project, but structured as a future production-minded digital autonomy assistant.
