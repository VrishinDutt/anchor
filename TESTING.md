# TESTING.md

## Environment
Default workflow:

cd ~/dronet_ml_project
venv

If .venv is missing:

mkvenv
python -m pip install -r requirements.txt

## Baseline Checks
Run:

python -m compileall .

## Streamlit Smoke Test
Run:

st

Verify:
- App launches.
- Affected page/section renders.
- No visible traceback appears.
- Modified behavior works.

Stop with Ctrl+C.

## Git Checks
Before and after implementation:

git status --short
git diff

## Dependencies
Do not add/update dependencies unless explicitly requested.

If dependencies change:

python -m pip freeze > requirements.txt
git diff -- requirements.txt

## Passing Definition
- Compile check passes.
- Streamlit launches if UI/app behavior changed.
- No unrelated files modified.
- No local environment folders tracked.
- Diff is cleanly inspectable.
