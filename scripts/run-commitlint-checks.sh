#!/usr/bin/env bash

# Run the shared commitlint verification steps used by the just recipes.

set -euo pipefail

echo "Note: these checks are provisional. If commit hook behavior looks wrong, verify it with an actual git commit as well."
node scripts/verify-setup.mjs
node --test test/*.test.mjs
node scripts/demo-commitlint.mjs