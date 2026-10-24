# Habits

A personal iOS habit-tracking app built with Expo, React Native and TypeScript. It is the first module of a larger personal app (Habits, To-dos, Expenses) that will share one shell; only Habits is built.

Data lives on the device in SQLite (Drizzle ORM). There is no backend.

## Getting started

```bash
npm install
npx expo start        # needs a dev-client build for native modules, not Expo Go
```

Use `npx expo install <package>` (not `npm install`) for Expo / React Native packages.

## Everyday commands

| Command | What it does |
|---|---|
| `make check` | The gate: Biome, `tsc`, Jest, tooling tests, architecture check. Also runs on pre-push |
| `npm test` | Jest only |
| `npm run lint` | Biome (no writes) |
| `npm run visual-check` | Renders every screen state on web and diffs against `docs/visual-baseline/` |
| `npm run e2e` | Maestro journeys in `e2e/` (needs a simulator) |
| `npm run mockups:render` | Renders the V3 design files to PNG slices + text in `docs/mockups/v3/renders/` |
| `npx drizzle-kit generate` | New migration after a schema change |

## Where to read more

- `CLAUDE.md` — working rules and the "when you touch X, read Y" table
- `docs/architecture.md` — folders, layers, patterns, stack (`src/modules/habits/README.md` and `scripts/README.md` for the short version)
- `docs/design-system.md` — tokens, components, variants
- `docs/feature-spec.md`, `docs/feature-spec-v2.md` — what each `HAB-<id>` ticket specifies
- `docs/feature-spec-v3.md` — V3 (HAB-26–50): habits only, three tabs, new Today / Progress / Habits
- `docs/design-system-v3.md` — V3 tokens and components (replaces V1/V2 values where it gives one)
- `docs/mockups/v3/README.md` — the V3 design files and their renders (`npm run mockups:render`)
- `docs/assessment-v3.md` — V3 impact per ticket, architecture review and batch plan
- `docs/decisions/` — architecture decision records (ADRs 001–004)
- `docs/CONTRIBUTING.md` — branches, commits, PRs, the gate, migrations, the feature flow
- `docs/dev-tooling.md` — hooks, checks, ratchets, visual-check setup
- `docs/backlog.md` — deferred work and deviations from the specs
- `docs/roadmap.md` — status
