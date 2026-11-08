# Export format (JSON version 2, CSV)

What Settings › Export and Progress › Export write, field by field. For anyone building the importer (HAB-15, open) or reading a file by hand. The code is `src/modules/habits/domain/export-data.ts` (the model), `src/modules/habits/domain/export-json.ts` (the JSON file) and `src/modules/habits/domain/export-csv.ts` (the CSV file).

Files are named `habits-<yyyy-MM-dd>.json` or `.csv`. They are temporary: the file is deleted as soon as the share sheet closes, and any leftover is deleted at the next launch.

## Rules that apply to every field

- **Dates** ("date", "from", "to", "createdOn") are local calendar days, `yyyy-MM-dd`. They are not instants and never shift with the time zone.
- **Instants** (every field ending in `At`) are ISO 8601 in UTC, for example `2026-09-01T07:30:15.000Z`.
- **Ids are local.** `idsAreLocal: true` says it: every `id`, `categoryId` and reminder `id` is the row number on the phone that wrote the file. They tie records together inside this one file and mean nothing elsewhere (UUIDs are parked, ADR 009). An importer must remap them.
- **Free text** is the habit name, category name, unit and day notes. The person can leave notes out (see `notesIncluded`).
- Unknown fields are to be ignored, so a later version can add fields without breaking a reader.

## JSON, top level

| Field | Meaning |
|---|---|
| `version` | `2`. The layout of this file. |
| `schemaVersion` | The database schema version of the app that wrote it. |
| `app` | `{ version, build }` of the app that wrote it. |
| `exportedAt` | Instant of the export. |
| `exportedOn` | Local day of the export. |
| `idsAreLocal` | Always `true`. |
| `notesIncluded` | `false` when the person turned off "Include notes". Then no habit has a `notes` key and no note text appears anywhere in the file. An empty list of notes with `notesIncluded: true` means the person wrote none. |
| `settings` | The user-facing settings, below. |
| `categories` | Every category, in group order. |
| `habits` | Every habit (archived ones included), each with its own records. |

## `settings`

`null` means never set, so the app's default applies.

| Field | Values |
|---|---|
| `themePreference` | `light`, `dark`, `system` |
| `eveningReview` | `true` / `false` |
| `eveningReviewTime` | `HH:mm` |
| `seenFirstRun` | `true` / `false` |

Never in the file: the date of the last export and any development key.

## `categories[]`

| Field | Meaning |
|---|---|
| `id` | Local id. |
| `name` | Display name. |
| `shape` | One of the ten icon shapes (`plus`, `bars`, `diamond`, `square`, `lines`, `grid`, `half`, `archive`, `dot`, `ring`). |
| `hue` | OKLCH hue, or `null` for the neutral built-in "Other". |
| `builtIn` | The ten built-ins are always present on a new install; match them by `name`. |
| `order` | 1-based position in the group order. |

A habit's icon and colour come from its category.

## `habits[]`

| Field | Meaning |
|---|---|
| `id` | Local id. |
| `name` | Habit name. |
| `categoryId` | Local id of its category. `category` repeats the name for readers. |
| `direction` | `build` or `break` (fixed after creation). |
| `targetType` | `simple` or `quantity`. |
| `targetAmount`, `targetUnit` | Set only for `quantity`. |
| `frequency` | `daily`, `weekdays:Mon\|Wed\|Fri` or `per-week:3`. |
| `sortOrder` | Manual order within its category. |
| `createdAt`, `updatedAt` | Instants. `createdAt` is the streak start boundary. |
| `archivedAt` | Instant while archived, else `null`. |
| `pauses` | `[{ from, to }]`: past archive periods, inclusive days that streaks skip. Without them a restored habit would read every archived day as missed. |
| `entries` | `[{ date, value, completed, createdAt }]`. `value` is the logged amount for a quantity habit, `null` for a simple check. `completed` is informational; recompute it from `value` and `targetAmount`. |
| `notes` | `[{ date, note, updatedAt }]`. Absent when `notesIncluded` is `false`. `updatedAt` may be `null` for a note saved before the app stored it. A note can exist on a day without an entry. |
| `frozenDays` | `[{ date, createdAt }]`: days a streak freeze covered. |
| `reminders` | `[{ id, time, days, enabled, createdAt }]`: `time` is `HH:mm`, `days` are `Mon`..`Sun`, `createdAt` may be `null` for a reminder made before the app stored it. |
| `derived` | Computed values. **Importers must ignore this object.** |

## `derived` (ignore on import)

`status` (`active` or `archived`), `createdOn`, `archivedOn`, `currentStreak`, `longestStreak`. They are recomputed from the records above, and the streak numbers describe the day of the export. They are in the file for people reading it, not for restoring.

## CSV

One row per fact, told apart by `record_type` (`habit`, `entry`, `note`, `frozen_day`). The columns are listed in `src/modules/habits/domain/export-csv.ts`. The CSV is for spreadsheets, not for restoring: it has no pauses, category look, sort order or settings. It honours "Include notes": with notes left out there are no `note` rows. Text the person typed that begins with `=`, `+`, `-`, `@`, a tab or a carriage return is written with a leading apostrophe so a spreadsheet shows it instead of running it. Numbers and dates are never changed.

## Compatibility rule

**A future importer accepts every older version.** A version 1 file is partial: it cannot restore pauses, category look (shape and hue), habit order, creation times or settings, so an importer must say what it could not restore and not guess. A version 2 file restores everything the app stores, apart from category creation times. A reader must ignore fields it does not know, and a file with a higher `version` than the app knows is refused with a message to update the app.

Version 1 differed from version 2 in these ways: `schema` was named `schemaVersion`; `status`, `createdOn`, `archivedOn`, `currentStreak` and `longestStreak` sat on the habit and now sit in `derived`; `frozenDays` was a list of days and is now a list of `{ date, createdAt }`; categories had no `id`, `shape` or `hue`; reminders had no `id` or `createdAt`; the settings and every `*At` field were missing.

## The reader that proves it

`src/modules/habits/test-support/export-v2-reader.ts` loads a version 2 file into a clean test database, and `src/modules/habits/test-support/export-v2-reader.test.ts` exports again and compares the two files (ignoring `exportedAt` and `derived`). It is test-only and the architecture check keeps it out of the app. The importer should start from it, then add what it leaves out: remapping ids, merging with data that is already there, reading version 1, and the confirm screen.
