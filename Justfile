# Show the available developer tasks.
[default]
default:
    just --list

# Install local tooling, configure the commit-msg hook, and run the checks.
commitlint-setup:
    pnpm install
    just commitlint-check

# Re-run the commitlint verification, tests, and demo.
commitlint-check:
    @echo "Note: these checks are provisional. If commit hook behavior looks wrong, verify it with an actual git commit as well."
    node scripts/verify-setup.mjs
    node --test test/*.test.mjs
    node scripts/demo-commitlint.mjs