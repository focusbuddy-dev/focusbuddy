.PHONY: commitlint-setup commitlint-check

commitlint-setup:
	pnpm install
	$(MAKE) commitlint-check

commitlint-check:
	@echo "Note: these checks are provisional. If commit hook behavior looks wrong, verify it with an actual git commit as well."
	node scripts/verify-setup.mjs
	node --test test/*.test.mjs
	node scripts/demo-commitlint.mjs
