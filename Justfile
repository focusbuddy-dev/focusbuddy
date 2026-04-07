# Show the available developer tasks.
[default]
default:
    just --list

# Install local tooling, configure the commit-msg hook, and run the checks.
commitlint-setup:
    pnpm install
    bash scripts/run-commitlint-checks.sh

# Re-run the commitlint verification, tests, and demo.
commitlint-check:
    bash scripts/run-commitlint-checks.sh