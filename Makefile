.DEFAULT_GOAL := help

.PHONY: help install dev build preview typecheck fmt fmt-check lint lint-fix check sync-api

help: ## Show available development commands.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "%-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies with Bun.
	bun install

dev: ## Run the local docs site.
	bun run dev

build: ## Build the production site.
	bun run build

preview: ## Serve the production build.
	bun run preview

typecheck: ## Generate MDX types and run tsc.
	bun run types:check

fmt: ## Format the repo with Bun's formatter.
	bun fmt

fmt-check: ## Check formatting without writing.
	bun fmt --check

lint: ## Lint with oxlint.
	bun run lint

lint-fix: ## Lint and apply fixes.
	bun run lint:fix

check: fmt-check lint typecheck ## Run format, lint, and type checks.

sync-api: ## Check installed astro-ascendant exports against curated api-reference pages.
	bun run scripts/sync-api.ts
