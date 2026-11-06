.PHONY: help start ios android web test test-perf test-slow test-tooling lint lint-check typecheck check-architecture check-repo-hygiene secrets clean clean-all deadcode doctor check e2e visual-check visual-baseline

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

test-perf: ## Run the timing tests (*.perf.test.ts) alone, in band, so other tests cannot slow them
	npm run test:perf

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

check-repo-hygiene: ## Fail if a tracked file is a secret, env/signing file, log, archive, generated output or >1 MB (repo is public)
	npm run check-repo-hygiene

secrets: ## Scan the git history for secrets with gitleaks (same config as CI; --redact)
	@command -v gitleaks >/dev/null 2>&1 || { echo "gitleaks is not installed. Install: brew install gitleaks (macOS) or download a release from https://github.com/gitleaks/gitleaks/releases (CI pins v8.30.1)."; exit 1; }
	gitleaks git --redact --no-banner --config .gitleaks.toml --exit-code 1 .

deadcode: ## Report unused files/exports/dependencies with knip (report only; not part of `make check`)
	-npm run deadcode

check: lint-check typecheck test test-perf test-tooling check-architecture check-repo-hygiene ## Everything the pre-push hook runs: Biome (no writes) + tsc + Jest + tooling tests + architecture rules + repo hygiene

e2e: ## Run the Maestro journeys against the web build (setup: docs/how-to/e2e.md)
	npm run e2e

visual-check: ## Render every screen/state and diff against docs/visual-baseline/
	npm run visual-check

visual-baseline: ## Accept the current renders as the new baseline (review the report first)
	npm run visual-check -- --update-baseline

# Local cleanup. Only IGNORED paths are removed: `git clean -X` skips tracked
# and untracked-but-not-ignored files, the paths are explicit (never a bare
# `git clean`), and node_modules and git state are never touched. A dry run
# lists what will go before the real run.
CLEAN_PATHS = .visual-checks .e2e-output tsconfig.tsbuildinfo tmp scratch
CLEAN_ALL_PATHS = $(CLEAN_PATHS) .expo docs/mockups/v3/renders

clean: ## Delete ignored local output: .visual-checks, .e2e-output, tsbuildinfo, tmp/, scratch/ (lists first)
	git clean -ndX -- $(CLEAN_PATHS)
	git clean -fdX -- $(CLEAN_PATHS)

clean-all: ## clean + .expo and generated mockup PNGs (WARNING: re-run `npm run mockups:render` after)
	@echo "WARNING: removes the generated mockup slices; re-run 'npm run mockups:render' to get them back."
	git clean -ndX -- $(CLEAN_ALL_PATHS)
	git clean -fdX -- $(CLEAN_ALL_PATHS)
