# Release

How a build gets a version, reaches TestFlight and the App Store, what to do when one goes wrong, and the checks that need a real phone. Written before the first build: nothing here has been run against an Apple account yet. Sources: the 2026-11 release audit (`docs/archive/audits-2026-11/F-release-update.md`) and the decisions in `app.config.ts` and `eas.json`.

## What is configured

| Profile (`eas.json`) | Use | `APP_VARIANT` | Name, bundle id |
|---|---|---|---|
| `development` | Dev client on the phone (`developmentClient`, internal) | `development` | Habits Dev, `com.akramelfadili.habits.dev` |
| `preview` | Release-mode build for your own phone (internal, no store) | `preview` | Habits Preview, `com.akramelfadili.habits.dev` |
| `production` | The App Store / TestFlight build (store, `autoIncrement`) | `production` | Habits, `com.akramelfadili.habits` |

- iPhone only (`ios.supportsTablet: false`), no iPad screenshots. `ITSAppUsesNonExemptEncryption` is `false`: the app has no custom cryptography, so TestFlight does not ask the export-compliance question.
- No OTA: no `expo-updates`, no `runtimeVersion`, no channels. A fix is a new binary.
- No crash reporter (`docs/decisions/008-logging.md`). The label stays "Data Not Collected" (`docs/how-to/app-store-privacy.md`).
- `eas.json` holds no credentials and no Apple login. `app.config.test.ts` fails if a profile sets `EXPO_PUBLIC_DEVICE_VALIDATION` or `EXPO_PUBLIC_STARTER_PROFILE`, or if `preview` / `production` do not set the matching `APP_VARIANT`. `app.config.ts` also throws on an EAS `production` build that carries either switch.
- Icon and splash artwork are still the Expo template (open in `docs/backlog.md`). The App Store needs a flat 1024 px icon without alpha before submission.

## Version policy

- **One source: `package.json` `version`.** `app.config.ts` reads it; there is no second copy. Bump it by hand, in a commit of its own, before the build of a release (`1.0.0` → `1.0.1` for a fix, `1.1.0` for features).
- **The build number is remote.** `eas.json` has `cli.appVersionSource: "remote"` and the `production` profile auto-increments, so `ios.buildNumber` is never in the repo. The About row, the export file and Copy diagnostics read the native build number (`src/lib/diagnostics/app-info.ts`).
- **Tag the commit that was built:** `git tag vX.Y.Z` on the merged master commit. Pushing a tag is a manual step by the owner.
- **A CHANGELOG entry per release:** move the finished items from "Unreleased / next" in `CHANGELOG.md` under a `vX.Y.Z` heading with the date.
- A TestFlight build and the App Store build of the same version differ only in build number.

## Before every build

1. `make check` green, then `make release-check` green (it exports the production bundle and fails on dev-only code in it or more than 10 % growth; `scripts/check-release-bundle.mjs`). CI runs it as the `release-bundle` job.
2. Bump `version`, update `CHANGELOG.md`, commit.
3. If the release adds a migration: the migration chain test passes with foreign keys on, `migration-reviewer` was run, and the previous TestFlight build is kept (see rollback).
4. In the app on your phone: Settings > Export, and keep the JSON file off the device. It is the only complete backup today.

## Apple prerequisites (none done; none can be checked from the repo)

1. Apple Developer Program membership (paid; individual is enough), two-factor on.
2. Register the App ID `com.akramelfadili.habits`. No capabilities beyond the defaults (local notifications need none; no push, no iCloud).
3. Expo account, `eas login`, `eas init` (see the commands below).
4. Signing: let EAS manage certificates and profiles (the first iOS build asks for the Apple login). Never commit `.p8`, `.p12` or `.mobileprovision` files.
5. App Store Connect record: name, primary language, SKU, bundle id. Copy its numeric Apple ID into `eas.json` as `submit.production.ios.ascAppId` (a public id, not a secret).
6. Privacy policy URL `https://akramelfadili.github.io/habits-app/privacy.html` (enable GitHub Pages first, `docs/backlog.md`), support URL, category (Health & Fitness or Productivity), age rating questionnaire.
7. App Privacy label: "Data Not Collected" (`docs/how-to/app-store-privacy.md`).
8. Screenshots: the 6.9-inch iPhone set at minimum, light and dark (check the sizes in App Store Connect at submission time). Source: the simulator capture from `ios-simulator.yml` (`docs/how-to/device-validation.md`).
9. Review notes: no login, no account; notifications are optional local reminders and the app explains why on First Run.

## First build, step by step

These need an Expo and an Apple account; run them yourself, interactively.

```bash
npx eas-cli login
npx eas-cli init
```

`eas init` creates the project on Expo and prints its id. Because the config is `app.config.ts`, it cannot write the id for you: add `extra: { eas: { projectId: "<the id>" } }` (and `owner` if asked) to the config object in `buildConfig`, extend the config test, and commit. The id is not a secret.

```bash
npx eas-cli build -p ios --profile preview        # internal build for your registered phone
npx eas-cli build -p ios --profile production     # the store build
npx eas-cli submit -p ios --profile production    # upload to App Store Connect / TestFlight
```

For `preview` the phone must be registered (`eas device:create`) so the ad hoc profile includes it. Before the first `production` build do the privacy-manifest check in "Device checklist" below; it needs the first archive.

## TestFlight and phased rollout

1. `preview` build on your own phone. Do the device checklist below.
2. `production` build, `eas submit`, internal testing in TestFlight (up to 100 App Store Connect users, no review). External testers need one Beta App Review.
3. Dogfood one real week on your own data, including a midnight rollover and a reminder firing. Take a JSON export before each build install.
4. Release to the App Store with "Release update over 7 days" for later versions (phased release applies to updates; the first release is all at once).
5. Every later release that adds a migration: TestFlight first, keep the previous build, then phased release.

## Rollback and crash on launch

- **App Store:** a released version cannot be rolled back. Pause the phased release (stops new automatic updates), remove from sale, or ship a fixed build and ask for an expedited review.
- **TestFlight:** keep the last good build. Expire the bad one in App Store Connect; testers install the earlier build from the TestFlight app. This is safe because an older build refuses newer data (next section).
- **A crash before the first screen has no remote fix** (no OTA, no crash reporter). What exists: `DatabaseErrorScreen` covers a database that will not open or a failed migration (Try again, Copy diagnostics; the migrator is one transaction, so the schema is left untouched), and `ErrorBoundary` logs `boundary.render_error`. A migration that succeeds with wrong data is covered by the backup taken before every upgrade (`docs/how-to/backups-and-recovery.md`), restored by hand.
- **Data safety net:** the export file taken before the install, and the newest 3 automatic backups.

## Compatibility rules

- **Old data, new app:** forward migration in one transaction, after a backup (the newest 3 are kept). A failed backup does not block the update.
- **New data, old app:** blocked. The older build shows "This data was made by a newer version of Habits. Update the app to open it." with Copy diagnostics only, and never opens, migrates or writes the data. Downgrading is not supported (ADR 010).
- **Export `version`:** bump it whenever the shape of the export changes. A future importer accepts every older version, ignores unknown fields, and refuses a file with a higher `version` than the app knows with a message to update (`docs/how-to/export-format.md`, "Compatibility rule").
- There is no minimum-version gate: the app is offline and has no backend.

## Device checklist before real data or the first TestFlight

Do these on a `preview` (or TestFlight) build on a real iPhone. Nothing here can be shown by the web build or the simulator run. Tick them off in a note and put anything that fails in `docs/backlog.md`.

**1. Backup after an upgrade (3 kept).** Install the previous build with a few habits, then install the new build that has a migration over it (or, with a dev client, add a migration locally). Open the app: the update screen shows for a moment, then Today. In Xcode (Window > Devices and Simulators > the phone > Habits > Download Container) open `AppData/Documents/SQLite/backups/`: a file `habits-<UTC time>-v<n>.db` exists, its `v<n>` is the old schema version. Repeat the upgrade across four builds: only the newest 3 files remain, and no `.partial` file is left.

**2. Newer-data screen.** Install a build with a newer migration, open it so it migrates, then install an older build over it (TestFlight: earlier build from the app's version list). The older build shows "Update needed" with only Copy diagnostics, no Try again. Open the newer build again: the data is all there, untouched.

**3. Set aside and start fresh.** Needs a database that will not open. In the container (as above) with the app closed, replace `SQLite/habits.db` with a text file and delete `habits.db-wal` / `habits.db-shm`. Open the app: "Couldn't open your data" with Try again and Copy diagnostics. Try again once: the same screen, and now also "Set aside old data and start fresh". Confirm: the app opens on First Run, and the container holds `habits.corrupt-<UTC time>.db` next to the new `habits.db`. Put the original file back to restore.

**4. Share sheet, Save to Files and Messages.** Settings > Export, JSON, Share. Choose Save to Files and save: the sheet closes, the export sheet is back at the choice screen, and the saved file opens in Files with the habits in it. Repeat with Messages to yourself and with CSV. Note how long the share sheet takes to appear and whether the file is still attached when sent. Then check the file is gone from the app's `Library/Caches/exports/` (container, as above).

**5. Lock-screen title, Hide habit names on and off.** Settings > Notifications, allow reminders, add a habit with a reminder two minutes ahead. With Hide habit names on (the default), lock the phone and wait: the title is "Habit reminder". Turn the switch off, add or edit a reminder a few minutes ahead, lock, wait: the title is the habit's name. Also: a reminder scheduled before an update shows the generic title after one launch of the new build. If iOS Settings > Notifications > Habits > Show Previews is set to "When Unlocked", the banner text is hidden anyway; the hint under the switch says so.

**6. VoiceOver and Dynamic Type on the new screens.** The privacy pack and data-safety screens: Settings > Notifications (the Hide habit names row), About (Privacy policy row, Copy diagnostics note), the export sheet (Include notes row), the update screen, "Update needed", the recovery screen and its confirm sheet. With VoiceOver on: focus lands on each screen's title, every control is announced with its role and state, the reading order follows the screen. With Settings > Accessibility > Display & Text Size > Larger Text at the largest accessibility size: nothing is cut off and every button stays reachable by scrolling.

**7. Release promise-rejection tracking.** On the `preview` build, force a rejected promise nobody handles (a dev client with a throwing `Promise.reject` behind a temporary button is enough; do not commit it). Then Settings > About > Copy diagnostics and look for `global.unhandled_rejection` in the log. React Native only enables Hermes' tracker in development; `installGlobalHandlers` (`src/lib/logger/global-handlers.ts`) enables it in release with `HermesInternal.enablePromiseRejectionTracker`, and this has never run on a device.

**8. Hermes timings.** The perf tests run in Jest on Node, never on Hermes, so `PERF_REPORT=1 npx jest --runInBand src/modules/habits/domain/year-map.perf.test.ts` prints Node numbers only (the baseline is in `docs/progress-data.md`). For Hermes, use a build with a large log (a long-lived real log; the dev-only starter profile does not exist in a `preview` build) and time Progress > Year from tapping the range switcher until the heat map is drawn, three times, with the screen recording on and counting frames. Record the numbers in `docs/backlog.md`. A harness that runs the perf suite on Hermes does not exist; building one is part of this open item.

**9. Privacy manifest.** On the first archive, follow the checklist in `docs/how-to/app-store-privacy.md` ("Checklist for the first EAS build"): read the merged `PrivacyInfo.xcprivacy`, confirm no tracking and no collected data, upload, and add `NSPrivacyAccessedAPITypes` entries only for what App Store Connect reports missing.

**10. VoiceOver on a field error, haptics, and 12 pt text at AX3 (batch 20).** (a) VoiceOver on: submit New habit with an empty name. The error is spoken once as the field fails, and moving to the Name field reads its label, then the error as the hint, without swiping on to find it. Fix the name: no announcement. (b) Haptics: tap a completion circle (a light tick, on and off), complete the last habit of the day (a success pattern, once, together with the all-done card), confirm a delete (a warning pattern). Then Settings > Appearance > Haptics off: none of the three is felt. Note whether any feels too strong or too frequent and put it in `docs/backlog.md`. (c) Settings > Accessibility > Display & Text Size > Larger Text at AX3: hint and error captions, the character counter, group headers, "Last export · Never" rows and the "Archive instead" card all wrap (none is cut off or overlaps the next line), and the week-matrix day letters and completion-cell digits (fixed size on purpose, F-03) are still legible against the rows around them.

Other device-only checks that were already parked (VoiceOver on every older screen, Reduce Motion, a reminder firing, drag-to-reorder, the midnight rollover) stay in `docs/backlog.md` § "Open — device findings and phone checks" and `docs/how-to/e2e.md`.
