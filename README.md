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
- Session summary copy/export
- Optional reasoning panel
- About / Ethics panel

## Agent Architecture

```text
User input
  ↓
Task parser
  ↓
Cognitive state mapper
  ↓
Agency risk detector
  ↓
Response policy engine
  ↓
Task-specific response generator
  ↓
Action card generator
  ↓
Optional session summary/export
