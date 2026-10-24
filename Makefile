.PHONY: help start ios android web test test-slow test-tooling lint lint-check typecheck check-architecture deadcode doctor check e2e visual-check visual-baseline

help: ## Show this list of commands
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

start: ## Start the Expo dev server (scan QR with Expo Go)
	npx expo start

ios: ## Start with the iOS simulator target (Mac only)
	npx expo start --ios

android: ## Start with the Android emulator target
	npx expo start --android

web: ## Start the web preview
	npx expo start --web

test: ## Run the test suite (skips *.slow.test.ts; see test-slow)
	npm test

test-slow: ## Run only the slow tests (*.slow.test.ts); CI runs them, pre-push does not
	npm run test:slow

test-tooling: ## Run the tests for scripts/ (check-architecture rules) with node --test
	npm run test:tooling

lint: ## Lint and auto-fix with Biome (rewrites files)
	npx biome check --write .

lint-check: ## Lint with Biome without changing files (what `make check` and pre-push use)
	npx biome check .

typecheck: ## Run TypeScript's type checker
	npx tsc --noEmit

doctor: ## Diagnose Expo dependency/config issues
	npx expo-doctor

check-architecture: ## Check the architecture rules (Drizzle placement, layers, modules, routes, ...)
	npm run check-architecture

deadcode: ## Report unused files/exports/dependencies with knip (report only; not part of `make check`)
	-npm run deadcode

check: lint-check typecheck test test-tooling check-architecture ## Everything the pre-push hook runs: Biome (no writes) + tsc + Jest + tooling tests + architecture rules

e2e: ## Run the Maestro journeys against the web build (setup: e2e/README.md)
	npm run e2e

visual-check: ## Render every screen/state and diff against docs/visual-baseline/
	npm run visual-check

visual-baseline: ## Accept the current renders as the new baseline (review the report first)
	npm run visual-check -- --update-baseline