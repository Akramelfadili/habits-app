# 001 — Drizzle ORM on expo-sqlite, reactive reads through `useLiveRows`

Status: accepted · Sources: `docs/architecture.md` (Stack, "Live reads"), `docs/audits/audit.md` A3-06, A5-04, A7-01, A9-04 · Landed: Drizzle with V1; `useLiveRows` in `7363a0b` (audit B6–B9)

## Context

The app is local-only: SQLite on the device, no backend, no accounts (`architecture.md`, Constraints). Screens must update when a write lands anywhere (a tick on Today changes Detail, summaries and the menu), and most code is written by an agent, so queries must be typed and data access must sit in one reviewable place.

The audit found three problems with calling Drizzle's `useLiveQuery` directly:
- **A7-01:** `useLiveQuery(query, deps = [])` runs its effect once, so a hook whose range changed (week navigation, day rollover) kept its first query forever.
- **A3-06:** a query error was stored but never surfaced, so screens sat on `[]` forever.
- **A5-04:** a not-yet-loaded list looked like an empty one, so empty states flashed.

## Decision

- `expo-sqlite` + Drizzle ORM + `drizzle-kit` migrations. No React Query: there is no server.
- Only `repositories/` folders and `src/lib/db/` import Drizzle, the client or the schema (CLAUDE.md rule 1, enforced by `check-architecture` and Biome `noRestrictedImports`). Repositories map rows to the module's own `types.ts` types.
- Every reactive read goes through `useLiveRows(query, deps, options)` (`src/lib/db/use-live-rows.ts`), exported from a repository as a live-query hook (rule 2). A hook whose query takes arguments passes them as `deps`.
- `useLiveRows` returns `{ data, loaded }`. `loaded` stays true across deps changes unless `resetOnDepsChange`, so nothing flashes blank. A query error is logged once and thrown to the root `ErrorBoundary`.

## Consequences

- Swapping the data layer touches `repositories/` only. Screens and hooks never see a Drizzle type.
- Drizzle's live queries refire on **any** change to a table they read (`enableChangeListener: true` in `client.ts`) and return a fresh array. Unbounded reads (`useAllEntries`, notes, frozen days) and duplicate subscriptions per screen cost CPU after every write (A9-04). The fetch is cheap at personal-app sizes; the cost is in what callers compute from it.
- Deps correctness is a convention: `check-architecture` enforces where `useLiveQuery` is called, not which deps a hook passes.
- Unit tests stand in for live queries with `src/lib/db/test-live-query.ts`. The web build uses `.web.ts` twins with in-memory fixtures, so web and visual-check cannot reproduce native subscription bugs (A7-01 was invisible there).
