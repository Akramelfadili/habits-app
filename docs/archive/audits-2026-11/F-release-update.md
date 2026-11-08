# F — Release, update and monitoring (audit 2026-11)

The app has no release pipeline yet: no `eas.json`, no `expo-updates`, no bundle identifier, no build number policy, no privacy manifest or export-compliance key, and the icon set is only partly fit for the App Store. The logger is well prepared for a remote sink (clean seam, redaction before sinks), and on-device logs are decent. Nothing is wrong in code; the gaps are all "not yet configured". Counts: High 3, Med 4, Low 3.

Expo facts were checked against the live docs (network worked): https://docs.expo.dev/llms.txt and the App version management page (remote version source is the recommended default since EAS CLI 12; the user-facing `version` must be bumped by hand for a production release). Installed major: `expo ~58.0.19` (package.json:10).

## Current state (verified)

| Item | State | Evidence |
|---|---|---|
| `eas.json` | Does not exist (no profiles, no submit, no channels) | `ls` of repo root |
| `app.config.*` | None; static `app.json` only | repo root |
| `ios.bundleIdentifier`, `ios.buildNumber` | Absent | app.json:9-11 (`ios` holds only `icon`) |
| `version` | `"1.0.0"` in app.json:5 and package.json:4 (two places to keep equal) | |
| `expo-updates`, `runtimeVersion`, `updates` | Absent (no OTA) | app.json, package.json |
| `ios.infoPlist` / `ITSAppUsesNonExemptEncryption` / `supportsTablet` | Absent (`supportsTablet` defaults to false in Expo, not verified in docs here) | app.json |
| Privacy manifest (`ios.privacyManifests`) | Absent | app.json |
| Notification permission string | None needed: iOS local notifications ask at runtime with no Info.plist usage string; `expo-notifications` plugin has no options set | app.json:35 |
| `orientation` | `portrait`; `userInterfaceStyle` `automatic` | app.json:6,9 |
| iOS icon | `./assets/expo.icon` (Icon Composer bundle, `icon.json` + `Assets/`); the Assets folder holds `grid.png` and `expo-symbol 2.svg`, i.e. the Expo template icon | `ls assets/expo.icon/Assets` |
| `icon.png` | 1024x1024 RGBA (see F-05) | `file` |
| Splash | `splash-icon.png` 228x213, `imageWidth` 76, bg `#208AEF` | app.json:30-34 |
| Android adaptive icon assets | Present, 512x512 (not relevant: iOS-only app) | |
| CI | `check.yml`, `secret-scan.yml`, `ios-simulator.yml` (simulator validation only, no signing) | .github/workflows |

## Findings

### F-01 — No `eas.json` and no release build path at all
- Severity: High
- Effort: S
- Evidence: no `eas.json` at repo root; app.json:1-46 has no `eas`/`extra.eas.projectId`; Makefile has `ios` = `npx expo start --ios` only (Makefile:9-10); `ios-simulator.yml` builds a simulator binary only.
- Why it matters: nothing can reach TestFlight or the phone as a signed build. `docs/backlog.md` § "Release prerequisites" lists data items but no build/submit item, so this is not a duplicate.
- Fix: `eas build:configure`; profiles `development` (developmentClient, internal), `preview` (internal, no store), `production` (`autoIncrement: true`, `distribution: store`); `cli.appVersionSource: "remote"`; `submit.production.ios.ascAppId`. Commit `eas.json` (no secrets in it; keep Apple credentials in EAS, never in git).
- Needs: none (needs the Apple account, see checklist)

### F-02 — No bundle identifier, build number policy or export-compliance key
- Severity: High
- Effort: S
- Evidence: app.json:9-11 (`ios` has only `icon`). `src/lib/diagnostics/app-info.ts` reads `Constants.platform.ios.buildNumber` and falls back to `"unknown"`, so builds with no number print `unknown` in the About row, the export file and diagnostics.
- Why it matters: EAS Build refuses an iOS build without `ios.bundleIdentifier`; the id is permanent once an App Store Connect record exists. Without `ITSAppUsesNonExemptEncryption: false`, every TestFlight upload stops at a manual "export compliance" prompt (the app only uses OS-provided HTTPS-less storage; no custom crypto).
- Fix: in app.json `ios`: `bundleIdentifier` (decide the reverse-DNS name once), `supportsTablet: false` (decision below), `infoPlist: { ITSAppUsesNonExemptEncryption: false }`. Build number via EAS remote `autoIncrement`, so app.json carries no `buildNumber` (the `app-info.ts` fallback chain already prefers the native value). Keep `version` as the single manual bump; keep package.json equal.
- Needs: design decision (the bundle id; iPad yes/no)

### F-03 — Privacy manifest and App Privacy label not prepared
- Severity: High
- Effort: M
- Evidence: no `privacyManifests` in app.json. Docs index lists https://docs.expo.dev/guides/apple-privacy.md (not read in full here). Required-reason APIs are likely used by RN/Expo core (file timestamps, UserDefaults, disk space via `expo-file-system`); `expo-sqlite`, `expo-file-system`, `expo-sharing` are in package.json:16,23.
- Why it matters: App Store Connect rejects uploads missing required-reason declarations (ITMS-91053 family). Expo SDK modules ship their own manifests, so the likely app-level work is small, but it must be confirmed on a real archive. Also: no privacy policy URL exists (backlog.md:207 says Settings has no Privacy row "no URL"). App Store Connect requires a policy URL even for an app that collects nothing.
- Fix: read the Expo privacy guide for SDK 58; build once and inspect the aggregated `PrivacyInfo.xcprivacy`; add `ios.privacyManifests` only for gaps. Host a one-page policy (GitHub Pages is enough: "no data leaves the device") and use "Data Not Collected" while there is no remote sink (see F-09).
- Needs: design decision (policy hosting URL)

### F-04 — No OTA, so a crash-on-launch after an update has no remote fix; the only recovery is a new build
- Severity: Med
- Effort: M
- Evidence: no `expo-updates` (package.json), no `runtimeVersion`; `database-error-screen.tsx:15-34` is the in-app recovery (error screen, Retry, Copy diagnostics, schema left untouched because the migrator is one transaction); `docs/backlog.md:86` back-up item is open.
- Why it matters: App Store builds cannot be rolled back; TestFlight keeps old builds installable but a user can only go back by installing an older build (and see F-07). A JS crash before the error boundary mounts, or a migration that succeeds with wrong data (A7-08, in backlog), has no fix except a new binary (App Review typically hours to days; expedited review is available on request). Single-user app, so the practical plan below is enough.
- Fix: write the plan down (see "Rollback plan" below). Decide on OTA: adding `expo-updates` gives a JS-only fix path and rollback to the embedded bundle (https://docs.expo.dev/eas-update/rollbacks.md), at the cost of a `runtimeVersion` policy (`appVersion` is the simplest here), a channel per build profile, and a changed privacy statement (update checks hit Expo servers, F-09). It is optional for a personal app; a safe default is "no OTA until the second release".
- Needs: design decision

### F-05 — App icon and splash assets need a pass before submission
- Severity: Med
- Effort: S
- Evidence: `assets/expo.icon/Assets` contains `grid.png` and `expo-symbol 2.svg` (template names); `assets/images/icon.png` is 1024x1024 RGBA (App Store icons must have no alpha/transparency; Apple flattens or rejects depending on the path) ; `splash-icon.png` 228x213 at `imageWidth: 76` (about 3x, fine on Retina but not a power-of-design size); splash `backgroundColor` `#208AEF` is the Expo template blue and is fixed, with no dark-mode variant, while the app has light and dark themes (app.json:6 `automatic`).
- Why it matters: a template icon on the home screen is cosmetic; alpha in the marketing icon is a validation failure risk. Splash colour not matching the first themed screen causes a flash on dark mode.
- Fix: replace icon artwork (Icon Composer bundle for iOS 26, plus a flat 1024 PNG without alpha as fallback); give the splash plugin a `dark` block with `backgroundColor`/`image`; confirm the tone against `src/theme`. Remove unused Android/web icon entries only if the iOS-only decision is recorded (harmless otherwise).
- Needs: design decision

### F-06 — Tablet and orientation policy unset
- Severity: Low
- Effort: S
- Evidence: app.json has `orientation: "portrait"` (line 6) but no `ios.supportsTablet`. If the iPad flag ends up true, App Store requires iPad screenshots and all four orientations unless `requireFullScreen` is set; the design is phone-only (docs/design).
- Why it matters: avoids a surprise iPad screenshot requirement and untested iPad layouts.
- Fix: `ios.supportsTablet: false` explicitly (compatibility mode on iPad). Verify against the SDK 58 config reference before relying on the default.
- Needs: design decision

### F-07 — Older build over newer DB is not detected (cites scope C)
- Severity: Low
- Effort: S
- Evidence: see scope C finding C-07, `src/lib/db/migration-plan.ts:38-39` and `src/lib/db/schema-version.ts:4`. New evidence from this scope: with no OTA and TestFlight allowing install of any retained older build, the downgrade path is the main way a user "rolls back" a bad release, so C-07 matters more once F-04's recovery plan relies on it.
- Why it matters: the rollback plan below ("install the previous TestFlight build") is only safe if the older binary refuses a newer schema with a clear screen.
- Fix: implement C-07 before the first release that adds a migration after v1.0.
- Needs: design decision

### F-08 — No release checklist, runbook or store assets documented
- Severity: Med
- Effort: S
- Evidence: `docs/how-to/` holds dev-tooling, device-validation, e2e, starter-habits only; `grep -i testflight docs/*.md docs/how-to docs/decisions` finds nothing; no screenshots folder (docs/mockups holds design renders only).
- Why it matters: first release will be done from memory. The version rule (manual `version` bump, remote build number) and the order of steps are the kind of thing that goes wrong once.
- Fix: add `docs/how-to/release.md` with the checklist and phased plan below; link from docs/README.md.
- Needs: none

### F-09 — Remote crash reporter: seam exists, but not wired and not yet decided (privacy)
- Severity: Low
- Effort: M
- Evidence: `src/lib/logger/types.ts:30-37` (`LogSink { write(entry); flush? }`, entries already redacted), `src/lib/logger/install.ts:15-24` (the one registration place), `src/lib/logger/global-handlers.ts:30-38` (logs fatal and unhandled errors as `global.fatal_error` / `global.unhandled_error`, then calls the previous handler), `docs/decisions/008-logging.md` ("No remote crash reporting yet", and the rule to write the decision down first).
- Why it matters: with no OTA a crash in the wild is only known if the owner opens Settings > Copy diagnostics. For a one-user app that is acceptable; for TestFlight with more testers it is not.
- Fix (proposed seam, no code change now): add `sinks/sentry-sink.ts` (or Expo Observe, which the SDK 58 docs list as a first-party service with an Errors page; not read in depth here) implementing `LogSink`: `write` forwards only `level === "error"` entries via `captureException`-style call built from `entry.error` (already redacted and capped) plus `entry.event`, `appVersion`, `build` as tags; `warn` as breadcrumbs; `flush` calls the SDK flush. Register in `install.ts` behind a build flag (`EXPO_PUBLIC_*` DSN absent = no sink, so dev and CI stay offline). Do not use the SDK's own auto-instrumentation of console, navigation or `ErrorUtils` (it would double the global handler and could capture screen text); native crashes (outside JS) need the SDK's native module, which means a dev-client rebuild.
  Privacy impact: it changes the App Privacy label from "Data Not Collected" to "Diagnostics > Crash Data, Performance Data" (not linked to identity if no user id is set, not used for tracking), requires the policy URL to say so, and the iOS privacy manifest to include the SDK's. Redaction in `redact.ts` already keeps habit names, notes and category names out, but stack traces contain file paths and the `message` allowlist is capped text; review `redact.ts` message handling before turning it on. Keep Copy diagnostics as the offline path.
- Needs: design decision

### F-10 — No minimum-version or compatibility policy written down
- Severity: Low
- Effort: S
- Evidence: no remote config and no backend (ARCHITECTURE.md); export file carries `version: 1` (backlog.md:87) and nothing reads it back (HAB-15 import missing, in backlog).
- Why it matters: for an offline app a forced-update gate is not needed. What does need a rule is data compatibility in both directions (below).
- Fix: record in `release.md`: (a) old DB, new app = forward migration in one transaction (exists; A7-08 backup is open in backlog); (b) new DB, old app = C-07; (c) export `version` bump rule when its shape changes, with the future importer accepting all older versions.
- Needs: none

## Apple Developer prerequisites checklist (not yet done; none verifiable from the repo)
1. Apple Developer Program membership (paid, individual is enough), two-factor on.
2. Choose and register the bundle identifier (App ID); no capabilities needed beyond defaults (local notifications need none; no push, no iCloud).
3. Expo account and `eas init` (writes `extra.eas.projectId` to app.json), `eas login`.
4. Certificates and provisioning: let EAS manage them (`eas credentials`, first iOS build prompts for Apple login). Never commit `.p8`, `.p12`, `.mobileprovision` (CLAUDE.md secret rules; check that `.gitignore` covers them, not verified here).
5. App Store Connect record: name, primary language, SKU, bundle id; get `ascAppId` for `eas.json` submit.
6. Privacy policy URL (F-03), support URL, category (Health & Fitness or Productivity), age rating questionnaire.
7. Export compliance: `ITSAppUsesNonExemptEncryption: false` (F-02).
8. App Privacy label: "Data Not Collected" (changes with F-09).
9. Screenshots: 6.9-inch iPhone set at minimum (check current App Store Connect sizes at submission time), light and dark; the phone-only decision from F-06 avoids iPad sets. Source material: simulator capture from the `ios-simulator.yml` workflow.
10. Review notes: no login, no account, notifications are optional local reminders (explain why they ask on First Run).

## TestFlight and phased rollout plan
1. `eas build -p ios --profile preview` (internal) on the owner's registered device; run the device-only checks listed at backlog.md:91 (including release promise-rejection tracking, which needs a release build anyway).
2. `eas build --profile production` then `eas submit` to TestFlight. Internal testing first (up to 100 App Store Connect users, no review), then external (needs Beta App Review once).
3. Dogfood one real week on the owner's own data, including a midnight rollover and a reminder firing. Take a JSON export before each build install (the only backup today; A7-08 is the in-app backup).
4. Release to the App Store with "Release update over 7 days" (phased release is an App Store Connect option for automatic updates; applies to updates, not the first release). The first release is all-at-once by nature.
5. For every later release with a migration: ship the previous build's TestFlight copy kept, bump `version`, run the migration test chain (CLAUDE.md migration rules), TestFlight first, then phased release.

## Rollback and crash-on-launch plan (proposal for release.md)
- App Store: a released version cannot be rolled back. Options: pause the phased release (stops new automatic updates), remove from sale, or ship a fixed build with expedited review.
- TestFlight: keep the last good build; expire the bad one in App Store Connect; testers reinstall the old build. Safe only with C-07 (F-07) implemented.
- Crash in JS before UI: no recovery without a new build (F-04). Mitigation: `DatabaseErrorScreen` (`database-error-screen.tsx`) covers failed open or migration with Retry and Copy diagnostics, schema untouched thanks to one-transaction migrator; `ErrorBoundary` events `boundary.render_error` exist in the log. Migrations that "succeed with wrong data" depend on the open A7-08 backup item.
- Data safety net before every release install: Settings > Export, keep file off-device.

## On-device logs: what exists (verified)
- Levels `debug|info|warn|error`; minimum `debug` in dev, `info` in release (008-logging.md). Debug calls in `src/`: 1.
- Events seen in code (release-visible): `app.start/started`, `migration.start/success/failure`, `database.open_failed/rollback_failed`, `db.slow`, `reminders.*` (synced, reconciled, saved_but_not_scheduled, near_pending_limit), `habit.saved`, `export.*`, `global.fatal_error/unhandled_error/unhandled_rejection`, `boundary.*`, `hook.failed`, `livequery.failed`, `action.failed`, `notifications.*`, `theme.preference_read_failed`.
- Retention: ring of the last 500 entries in separate `logs.db` (`ring-buffer-sink.ts:7` `RING_SIZE = 500`), trimmed in the insert transaction (`log-repository.ts:41`); pending queue capped at 200 (`ring-buffer-sink.ts:10`); error entries written immediately, others batched and flushed when the app leaves the foreground (`install.ts:21-23`). Entries carry `appVersion` and `build`, which become `unknown` until F-02 is done.
- Limits: a 500-entry ring with `info` events on every habit save and reminder sync can push out a launch-time crash within days of heavy use; no time-based retention, no size cap other than rows. Acceptable for now; revisit with F-09.

## Not checked
- `.gitignore` coverage of credentials extensions, and whether EAS CLI is installed/logged in (no network side effects were run; read-only audit).
- Full text of the Expo privacy-manifest guide, `submit/ios`, runtime-version and `ios.supportsTablet` config reference pages for SDK 58: index and two pages were fetched, the rest not read; items above citing them are marked unverified.
- Whether Expo Observe is suitable as crash reporter (listed in the docs index only).
- Apple-side requirements (screenshot sizes, review rules, phased-release behavior) are from general knowledge, not fetched; recheck in App Store Connect at submission.
- Anything that needs a device or Apple account.

## Strengths
- Logger sink seam is already the right shape: redaction happens in the core before any sink, `LogSink` is two methods, sinks cannot throw into callers, and ADR 008 states the process for adding a remote one.
- Migration failure is handled in-app: one-transaction migrator, honest copy, Retry and Copy diagnostics, no crash at import.
- `app-info.ts` reads the native build number first, so remote `autoIncrement` will show correctly in About, export and diagnostics with no code change.
- Logs persist in a separate `logs.db`, so a log write can never block or corrupt habit data, and errors are flushed immediately.
- No unneeded permission strings or capabilities: local notifications only, no tracking SDKs, which keeps the privacy label and review notes simple.
