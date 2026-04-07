.PHONY: commitlint-setup commitlint-check

commitlint-setup:
	pnpm install
	$(MAKE) commitlint-check

commitlint-check:
	node scripts/verify-setup.mjs
	node --test test/*.test.mjs
	node scripts/demo-commitlint.mjs