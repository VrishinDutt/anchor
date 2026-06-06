# Anchor Viva Cheat Sheet

## One-line definition
Anchor is a metacognitive AI agent that helps users use AI without surrendering their own thinking.

## Why is it an AI agent?
It perceives user input, maintains session state, reasons through a policy layer, and acts through scaffolds, checkpoints, action cards, and optional Claude assist.

## PEAS
Performance: clarity, agency preservation, useful next action  
Environment: academic/digital task context  
Actuators: chat responses, action cards, Claude assist, export  
Sensors: user text, task artifacts, constraints, session state

## Agent type
Model-based, goal-based, utility-aware, rule-based.

## Why Claude?
Claude is used as a restrained language refinement layer. Anchor remains the decision-making agent.

## Why not a GPT wrapper?
Because user input is not directly sent to an LLM. Anchor parses, checks policy, and only calls Claude when explicitly requested.

## What is false mastery?
When the final output looks complete but the user has not understood or owned the reasoning.

## Ethics boundary
Anchor is not a therapist, diagnosis tool, crisis tool, or human replacement.

## SDGs
Primary: SDG 4 and SDG 3  
Supporting: SDG 9 and SDG 12

## Best demo line
Anchor does not replace the user's thinking. It helps the user hold the thread.
