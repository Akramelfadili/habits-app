# E — Privacy and compliance (audit 2026-11)

Summary: the app is local-only (no network, analytics or crash-reporting code in `src/` or `package.json`), so the data story is simple and the "Data Not Collected" label is defensible. Gaps are about what the OS and the user can see: habit names are the lock-screen title of every habit reminder with no way to hide them, no privacy manifest is declared in `app.json`, and there is no privacy policy or in-app Privacy row. Counts: High 0, Med 3, Low 4.

## Findings

### E-01 — Habit reminders show the habit name on the lock screen, with no hide option
- Severity: Med
- Effort: M
- Evidence: src/modules/habits/services/reminder-service.ts:155 (`title: habit.name`); body is fixed copy `notificationCopy.build/break` at src/modules/habits/reminder-copy.ts:9-10; src/lib/notifications/notifications.ts:151 passes only `{ title, body }` (no `data`, no `visibility`/privacy options); `grep -n "privacy\|hide" docs/backlog.md` shows nothing on this (backlog:194 only lists Privacy/Send feedback rows as "Later").
- Why it matters: habit names can be sensitive (a "break" habit such as quitting smoking or drinking, medication, therapy). iOS shows the title on a locked phone unless the user sets Show Previews to "When Unlocked" for the app. The in-app Notifications screen offers no warning or alternative.
- Fix: add a Settings > Notifications switch "Hide habit names" that schedules with a generic title ("Habit reminder"); default decision by owner. Minimum: a one-line hint in Settings > Notifications that the habit name appears on the lock screen and that iOS "Show Previews" controls it. Reminders must be rescheduled when the switch flips (reconcile already exists).
- Needs: design decision

### E-02 — No privacy policy, no in-app Privacy row, and no privacy manifest in app.json
- Severity: Med
- Effort: M
- Evidence: app.json has no `ios.privacyManifests`, no `ios.bundleIdentifier`, no `infoPlist` (whole file read, 46 lines); docs/backlog.md:207(c) records "No Privacy or Send feedback rows (S6): there is no URL or mailbox" (known); docs/decisions/008-logging.md:36 says any off-device data "changes the privacy statement", yet no statement exists in the repo.
- Why it matters: App Store Connect requires a privacy policy URL for any submission (TestFlight external too), and since May 2024 a binary using required-reason APIs needs them declared. The dependencies already ship their own manifests (see inventory), which Xcode merges, so rejection risk is low for dependencies, but the app's own declaration is absent and unreviewed. Backlog notes the missing row; the policy URL and manifest are NEW evidence (not in backlog).
- Fix: host a static policy page (outline below), add an About/Privacy row linking to it, and set `ios.privacyManifests` in app.json (NSPrivacyTracking false, empty collected-data types, plus reasons for any API the app code or non-manifested deps use, see E-04). Verify the merged `PrivacyInfo.xcprivacy` in an EAS build report.
- Needs: design decision

### E-03 — Export and diagnostics files stay in the cache folder after sharing, readable inside the app sandbox
- Severity: Med
- Effort: S
- Evidence: src/lib/file-export/file-export.ts:16-19 and :26-28 (`Paths.cache/exports`, "the next export clears whatever is left behind"); :74-80 `shareText` writes `diagnostics.txt` into the same folder and never deletes it; `clearExports` runs only at the start of the next export (src/modules/habits/services/export-service.ts:94).
- Why it matters: a full JSON export holds every habit name, category, daily log, note and reminder time (domain/export-json.ts:29-48). It lingers in `Library/Caches` until the next export or an iOS purge. Caches are excluded from iCloud backup but are included in an unencrypted local Finder/iTunes backup of some configurations and are readable if the device is compromised. The file is also not removed when the user dismisses the share sheet. (Backlog has no entry; C-04 covers delete-all but does not list this.)
- Fix: call `discardFile(uri)` after `Sharing.shareAsync` resolves (iOS returns after the sheet closes), and run `clearExports()` at app start. For `shareText` do the same.
- Needs: phone test

### E-04 — Required-reason API inventory is not recorded; two deps declare reasons the app should confirm
- Severity: Low
- Effort: S
- Evidence: `find node_modules -name PrivacyInfo.xcprivacy` (excluding Pods) found manifests only in: expo-constants (UserDefaults), expo-application (FileTimestamp), expo-system-ui (UserDefaults), expo-file-system (FileTimestamp reasons 0A2A.1, 3B52.1 plus DiskSpace E174.1, 85F4.1), expo-notifications (UserDefaults), expo-device (SystemBootTime), and react-native (React/Resources: C617.1 file timestamp + CA92.1 UserDefaults; ReactCommon/react/timing: 35F9.1 boot time; cxxreact: C617.1). NO manifest in: expo-sqlite, expo-sharing, expo-clipboard, expo-blur, expo-font, expo-linking, expo-router, expo-status-bar, expo-symbols, react-native-gesture-handler, -reanimated, -screens, -safe-area-context, @expo/ui.
- Why it matters: expo-sqlite bundles/compiles SQLite, which can stat the DB file (file timestamp category); expo-sqlite has no manifest, so coverage comes from the RN/expo-file-system declarations only. Not a known rejection source for Expo SDK apps, but unverified here. The "not enough storage" export check does NOT call a disk-space API: it matches the error message (STORAGE_ERROR regex, export-service.ts:125-127); `grep availableDiskSpace src` is empty. DiskSpace is declared only by expo-file-system itself.
- Fix: record the table below in docs (see inventory), and after the first EAS build read the merged manifest/App Store Connect warnings; add `ios.privacyManifests.NSPrivacyAccessedAPITypes` entries only for categories reported missing.
- Needs: none

### E-05 — Diagnostics text carries stable device and timing facts and error stack frames
- Severity: Low
- Effort: S
- Evidence: src/lib/diagnostics/diagnostics.ts:15-23 header: app version/build, OS name+version, device model (`Device.modelName`), schema version, locale, time zone; log entries (src/lib/logger/types.ts:14-24) add ISO timestamps, event names, allowlisted numeric ids (`habitId`, `categoryId`, `reminderId`, counts, `neededBytes`) and error name/code/message/stack frames (redact.ts:80-100, stack up to 600 chars, file paths of the JS bundle only). Redaction is an allowlist by field name (redact.ts:25-50) and strips quoted segments and Drizzle `params:` (redact.ts:60-65). No habit names, notes, device identifier (no UUID/IDFV), or filesystem paths. `logs.db` ring buffer persists the same redacted entries (log-repository.ts, `RING_SIZE` keep).
- Why it matters: this is well designed; residual risks are (a) unquoted interpolation of user text in an Error message is undetectable (redact.ts header says so; the rule is only convention), (b) timestamps plus habit ids reveal when the user used the app and how many habits exist, (c) on clipboard fallback to share, the text is written to the cache (E-03). A user should be told before pasting it into a public GitHub issue.
- Fix: add a lint or test that greps `new Error(` / `throw` templates for interpolated names; show a one-line "contains no habit names" note under the Copy diagnostics row.
- Needs: none

### E-06 — Export has no "notes excluded" option and no encryption; Share goes to any app
- Severity: Low
- Effort: M
- Evidence: src/modules/habits/domain/export-json.ts:29-48 always includes `name`, `notes`, `entries`, reminders; options type only picks format (export-service.ts:84 `options.format`).
- Why it matters: notes are the most free-text, sensitive field. GDPR Art. 20 wants a portable format (satisfied by JSON/CSV); sharing to a third party is the user's act. Not required, but a user sharing a CSV with a coach may not want notes.
- Fix: optional toggle "Include notes" in the export sheet (default on).
- Needs: design decision

### E-07 — No `bundleIdentifier`, so App Store Connect privacy answers cannot be attached yet
- Severity: Low
- Effort: S
- Evidence: app.json:7-9 `ios` has only `icon`; `grep bundleIdentifier app.json` is empty; name/slug are the placeholder "habits-app", version 1.0.0.
- Why it matters: outside strict privacy scope, but the App Store listing, policy URL and label all hang off the bundle id; submission is blocked until set. Verify whether backlog tracks release setup (not grepped under a specific ID).
- Fix: set `ios.bundleIdentifier` and display name when the store listing is created.
- Needs: design decision

## Data inventory (everything on the device)

Main DB `habits.db` (SQLite via expo-sqlite, src/lib/db/schema.ts), in the app container's Documents/SQLite folder (default expo-sqlite location; iCloud/device backup included by default, no exclusion set; backlog:194 lists an iCloud row as Later):

| Table | Personal columns |
|---|---|
| app_settings (schema.ts:14) | key/value: `app.themePreference`, `habits.seenFirstRun`, `habits.eveningReview`, `habits.eveningReviewTime`, `habits.lastExport` (day key), dev-only `dev.starterProfile` |
| categories (:25) | name (user-editable free text), shape, hue, builtIn, sortOrder, createdAt |
| habits (:53) | name, categoryId, direction, target type/amount/unit (free text unit), frequency fields, sortOrder, archivedAt, pausedRanges (JSON), createdAt/updatedAt; legacy icon/color/category (unused, B11) |
| entries (:110) | habitId, date (yyyy-MM-dd), value, createdAt |
| frozen_days (:134) | habitId, date, createdAt |
| entry_notes (:156) | habitId, date, note (free text), updatedAt |
| reminders (:178) | habitId, hour, minute, weekdays, enabled, createdAt |

Other storage:
- `logs.db` (src/lib/logger/repositories/log-repository.ts): table `log_entries(id, entry JSON)`, ring-trimmed to RING_SIZE; redacted entries only (E-05). Separate file, same app container.
- No AsyncStorage, SecureStore, MMKV, keychain or UserDefaults use in `src/` (grep clean); settings live in `app_settings`. UserDefaults is touched only by dependencies (expo-notifications, expo-constants, expo-system-ui, RN).
- Files: `Caches/exports/export-<date>.json|.csv`, `export-<ts>.partial` scratch, `diagnostics.txt` (E-03).
- Scheduled local notifications held by iOS: identifier, title (habit name or "Evening review"), body (fixed copy), trigger time/weekdays; no `data` payload (notifications.ts:151). Survive until cancelled; app-delete removes them.
- Clipboard: diagnostics text when "Copy diagnostics" is used (expo-clipboard, not yet installed, backlog:90).
- Nothing leaves the device: grep for `fetch(`, XMLHttpRequest, axios, WebSocket, sentry, firebase, amplitude, analytics, Linking.openURL in `src/` and `package.json` found no network or SDK code. expo-linking is only for the `habitsapp` scheme (incoming deep links). expo-drizzle-studio-plugin is a dev tool; confirm it is excluded from release builds (not verified).

## App Store privacy label
- Answer: "Data Not Collected" (nothing is transmitted off device to the developer or third parties; on-device-only processing is not "collection"). No tracking, no ATT prompt, `NSPrivacyTracking` false.
- What would change it: any remote crash/diagnostics sink (ADR 008 step 4), analytics, a backend or sync, iCloud/CloudKit sync of habit data (developer still not "collecting", but the policy must say so), a feedback mailbox that auto-attaches diagnostics, or an SDK that phones home. Any of these makes Diagnostics/Usage/Health-and-Fitness-adjacent "User Content" data types collected, linked or not depending on identifiers.
- Health note: habit names such as "medication" are user-entered; the app has no HealthKit, so no Health data usage strings are needed.

## Privacy manifest status
- app.json sets no `ios.privacyManifests` (see E-02). `ios/` and `android/` do not exist in the working copy (generated), so the merged manifest could not be inspected.
- Required-reason categories by source: own code: none directly (no stat/disk-space/boot-time/UserDefaults calls found). Dependencies: UserDefaults (expo-constants, expo-system-ui, expo-notifications, RN), FileTimestamp (expo-application, expo-file-system, RN), DiskSpace (expo-file-system), SystemBootTime (expo-device, RN timing). Caveat: the app's own use of `expo-file-system` (`file.size`, `exists`, `list`) and `Paths.cache` is covered by that package's declared reasons.

## Privacy policy outline
- Who: developer name and contact address; effective date.
- What is stored: habits, categories, daily logs, notes, frozen days, reminder times, theme/evening-review settings, a local diagnostics log (redacted).
- Where: only on this device (and in the user's own iCloud/iTunes device backup if enabled by iOS); no account, no server, no analytics, no ads, no tracking, no third-party SDKs that transmit data.
- Notifications: local only; habit name appears in the reminder title on the lock screen; how to change Show Previews.
- Export and diagnostics: user-initiated files and clipboard text, shared only where the user sends them; what diagnostics contains (version, device model, OS, locale, time zone, timestamps, internal ids, no habit text).
- Rights: access/portability via Export (JSON/CSV); erasure by deleting habits or deleting the app; no controller-held copy exists.
- Children: not directed at children.
- Changes and contact.

## GDPR mapping
- Art. 15 access / Art. 20 portability: Settings > Export data (JSON, CSV) covers habits, logs, notes, frozen days, reminders. It omits app settings and the log ring (settings are preferences, log is redacted; acceptable, mention in policy).
- Art. 17 erasure: delete habit (`deleteHabitAndHistory`, removes the habit with its history) and delete category; deleting the app removes the containers, notification schedule and cache. There is no in-app delete-all: see C-04 in docs/archive/audits-2026-11/C-data-lifecycle.md (not re-reported). Note for C-04's fix: it should also clear `logs.db` and `Caches/exports` (E-03) and cancel scheduled notifications.
- Art. 13 information duty: needs the policy (E-02).
- Since the developer holds no data, controller duties are largely moot for a purely local app; the policy and the lock-screen note are the practical obligations.

## Not checked
- Merged privacy manifest and Info.plist: `ios/` does not exist (generated); would need `npx expo prebuild` or an EAS build.
- Whether Documents/SQLite is excluded from iCloud backup: expo-sqlite default, not read in source for this SDK.
- Whether `expo-drizzle-studio-plugin` is stripped from release builds.
- The lock-screen text as actually rendered (needs a phone); only the scheduled content was read.
- Apple's current required-reason list (offline); category names taken from the dependency manifests.

## Strengths
- Logger redaction is an allowlist by field name in the core, with scrubbed quoted text and dropped SQL params; sinks cannot leak by mistake (redact.ts) and the diagnostics header has no ids.
- Zero network or analytics code; ADR 008 and ARCHITECTURE.md:168 state the local-only stance and require an ADR before any off-device sink.
- Settings stay in the DB, so there is no scattered AsyncStorage/UserDefaults/keychain surface to inventory or purge.
- Reminder notifications use fixed body copy and carry no `data` payload, and the evening review title is generic.
- Export is atomic (scratch file, promote on success, discard on failure) and clears stale exports.
