# `modules/habits`

Everything Habits-specific. Nothing outside the module imports from it, and it imports only from `lib/`, `components/ui/`, `theme/`, `store/` and `utils/`. Inside, dependencies point down only: **repositories / strategies ← services ← hooks ← components ← screens**, enforced by `npm run check-architecture`.

- `repositories/` is the only code touching Drizzle; every file has a `.web.ts` twin.
- `strategies/` holds one file per frequency rule.
- `services/` holds domain rules and multi-step writes.
- `hooks/` splits `use<X>Queries` (reads) from `use<X>Actions` (writes).
- `components/` and `screens/` are the UI; routes in `src/app/` only render a screen.
- `test-support/` holds builders for tests and is never imported by app code.
- Domain types live in `types.ts`, constants in `constants.ts`.

Reasons and conventions: `docs/architecture.md`.
