# ARCHITECTURE.md

## Current Architecture
Lightweight ML/product prototype centered around a Streamlit demo.

Flow:
Data / sample images
-> model or rule-based inference
-> navigation / steering output
-> Streamlit visualization and explanation layer

## Main Areas
- App/UI layer: Streamlit layout, input display, output visualization.
- Model/inference layer: image/data processing and navigation output.
- Dataset/simulation layer: demo images, synthetic data, sample scenarios.
- Governance layer: AGENTS.md, PRODUCT_PRINCIPLES.md, TASKS, DECISIONS, TESTING.md.

## Stability Rules
Architecture changes require:
1. Clear reason.
2. Task spec.
3. Decision record.
4. Human approval.

## Known Risks
- Prototype code may be demo-oriented.
- Streamlit can become cluttered.
- ML output can become opaque.
- Dependency creep can hurt reproducibility.
