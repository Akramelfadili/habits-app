# 003 — Write actions go through `run()`, which never rejects

Status: accepted · Sources: `docs/architecture.md` ("Async writes", "Logging and diagnostics"), `docs/audits/audit.md` A3-03, A5-05, A3-12 · Landed: audit batch B6 (`7363a0b`)

## Context

The audit found that most user writes had no failure handling (A3-03 = A5-05). `useAsyncAction` stored and rethrew errors that no screen read. Undo callbacks ran from the toast with no catch. A failed tick, archive or form save either did nothing visible or raised an unhandled rejection, and its "it worked" follow-up (an Undo toast, closing a sheet) still ran.

## Decision

`useAsyncAction(action, { scope, failure })` (`src/utils/use-async-action.ts`) returns `{ execute, run, isLoading, error }`:

- **`run` never rejects.** It logs, shows an error toast (copy from `failureMessage(verb, noun)`) and resolves `{ ok, value }`. Callers skip their success follow-up when `!ok`.
- **`execute` rethrows.** It's only for forms that show their own inline error: category add/rename, the habit form, export share/save. These still log.
- Every Undo callback runs through `runSafely` in `ToastHost`. A screen with no `ToastHost` above it (the New/Edit habit modals) passes `onFailure` and shows an inline error `Banner`.
- Logging goes through `lib/logger`, with its privacy rules: static messages, no user text in context or error messages.

## Consequences

- Every write hook exposes `run`. A new write that awaits a repository directly from a screen bypasses the toast and the log, so reviewers check for it.
- There is no lint for floating promises: Biome has no type-aware rule for it (A3-12, backlog). `DestructiveConfirmSheet` logs and toasts a rejecting handler as a backstop.
- Failure copy is generic ("Couldn't use a freeze…") and comes from one helper, so the V3 message catalogue (HAB-48) can take it over in one place.
- A second visible `Sheet` would mount a second top `ToastHost` (backlog, open).
