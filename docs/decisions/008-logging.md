# 008 — Logging: pluggable sinks, redaction in the core, a separate on-device store

Status: accepted · Sources: audit A3-10, batch 11 brief, `ARCHITECTURE.md` § "Cross-cutting decisions" (the Logging bullet)

## Context

The first logger (audit A3-10) was a 200-entry in-memory buffer. A crash or a
force-quit lost it, so "Copy diagnostics" helped only for the current session.
Debugging a production problem on the owner's phone needs the history from
before the problem. Two other needs: a way to add a remote reporter later
without touching call sites, and a hard guarantee that habit names, notes and
category names never reach any log.

## Decision

- **API:** `log.debug|info|warn|error(event, fields?)` from `src/lib/logger/logger.ts`. `event` is a short dot-separated name (`migration.failure`). `fields.error` takes an `Error`; the core serialises it.
- **Redaction in the core, before any sink.** `src/lib/logger/redact.ts`: a field survives only if its *name* is in an allowlist. Numeric names (ids, counts, `schemaVersion`) keep numbers, booleans and null. Token names (`reason`, `scope`, `kind`…) keep a short lowercase code; anything that looks like free text becomes `[redacted]`. Error messages are capped and lose quoted segments and Drizzle `params:`. Adding a field is a one-line, reviewable change to the allowlist.
- **Sinks are a two-method interface** (`write(entry)`, optional `flush()`), registered explicitly with `registerSink`. The core catches anything a sink throws; logging never throws and never waits. Minimum level: `debug` in development, `info` in release.
- **Shipped sinks:** `ConsoleSink` (development, the only place in `src/` allowed to call `console.*`; `check-architecture` rule `no-console`), a session memory buffer (always on, used by tests) and `RingBufferSink` (last 500 entries, persisted).
- **Separate store.** The ring lives in its own SQLite file, `logs.db`, behind `lib/logger/repositories/log-repository.ts` (raw SQL, one table, trimmed in the same transaction as the insert). No migration of the habits schema, and a log write can never queue behind or break a habit write. Writes are batched and asynchronous; the web build has an in-memory twin.
- **No remote crash reporting yet.** The app is local-only; nothing leaves the phone unless the owner copies the diagnostics text.
- **Recovery:** a database that cannot be opened no longer crashes at import. The client records the failure and the provider shows the error screen with Copy diagnostics.

## Consequences

- Production history survives restarts, up to 500 entries.
- A habit name in `fields` is dropped silently. That is the design: if a field you need is missing from the log, add its name to the allowlist, not the value to a string.
- A free-text string in a token field shows as `[redacted]`, which is the visible sign of a call-site mistake.
- The ring is best effort: a failing store drops that batch. Errors are written at once, so a crash right after one usually keeps it.

## How to add a sink (a remote reporter, say)

1. Add `src/lib/logger/sinks/<name>-sink.ts` exporting an object or factory that implements `LogSink`. Its input is already redacted; do slow work in batches and expose it through `flush`.
2. Add `src/lib/logger/sinks/<name>-sink.test.ts` (contract: `write` never throws).
3. Register it with one line in `installLogging()` (`src/lib/logger/install.ts`). No call site changes.
4. If it sends data off the device, write the decision down here first and tell the owner: it changes the privacy statement.
