.PHONY: help start ios android web test lint typecheck doctor check e2e visual-check visual-baseline

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

test: ## Run the test suite
	npm test

lint: ## Lint and auto-fix with Biome
	npx biome check --write .

typecheck: ## Run TypeScript's type checker
	npx tsc --noEmit

doctor: ## Diagnose Expo dependency/config issues
	npx expo-doctor

check: lint typecheck test ## Run lint + typecheck + test together (do this before committing)

e2e: ## Run the Maestro journeys against the web build (setup: e2e/README.md)
	npm run e2e

visual-check: ## Render every screen/state and diff against docs/visual-baseline/
	npm run visual-check

visual-baseline: ## Accept the current renders as the new baseline (review the report first)
	npm run visual-check -- --update-baseline