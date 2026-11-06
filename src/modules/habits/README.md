# `modules/habits`

Everything Habits-specific. Nothing outside the module imports from it, and it imports only from `lib/`, `components/ui/`, `theme/`, `store/` and `utils/`.

Inside, dependencies point down only, enforced by `npm run check-architecture`: **repositories / strategies / dev ← domain ← services ← presenters ← hooks ← components ← screens**.

- `repositories/` is the only code touching Drizzle; every file has a `.web.ts` twin. `dev/` holds the web fixtures and `__DEV__` seeds.
- `strategies/` holds one file per frequency rule.
- `domain/` holds the pure rules (streaks, summaries, insights, export formats).
- `services/` orchestrates repositories, domain and lib adapters.
- `presenters/` turns results into labels and view models.
- `hooks/` splits `use<X>Queries` (reads) from `use<X>Actions` (writes).
- `components/` and `screens/` are the UI; routes in `src/app/` only render a screen.
- `test-support/` holds builders for tests and is never imported by app code.

Reasons and conventions: `ARCHITECTURE.md`.
