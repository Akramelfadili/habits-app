# App Store privacy

What to answer in App Store Connect, what is on the device, which dependencies use required-reason APIs, and the exact steps at the first EAS build. Source: the 2026-11 privacy audit (`docs/archive/audits-2026-11/E-privacy-compliance.md`), updated for the privacy pack (hide habit names, policy page, privacy manifest).

## App Privacy label

**Answer: "Data Not Collected."** Nothing is sent off the device to the developer or a third party. Processing that stays on the device is not "collection". No tracking, no ATT prompt, no account.

| In App Store Connect | Answer |
|---|---|
| Data collection | Data Not Collected |
| Tracking | No (`NSPrivacyTracking` false, no tracking domains) |
| Privacy policy URL | `https://akramelfadili.github.io/habits-app/privacy.html` (the constant `PRIVACY_POLICY_URL` in `src/modules/habits/constants.ts`; the page is `site/privacy.html`) |
| HealthKit | Not used. Habit names such as "medication" are text the user types, so no Health data strings are needed |

The promise is guarded: `src/no-network.guard.test.ts` fails on `fetch(`, `XMLHttpRequest`, `WebSocket`, `axios` or any web address in `src/` (two allowlisted: the policy URL constant and a drizzle docs comment), and on an analytics, crash-reporting or update package in `package.json`.

### What would change the answer

Any of these makes the label, the policy page and ADR 008 wrong; change all three first (and the guard test last).

- A remote crash or diagnostics sink (ADR 008, "How to add a sink"), or any crash reporter. This is why none is installed.
- Analytics of any kind, or an SDK that contacts a server.
- A backend, account or sync. iCloud or CloudKit sync of habit data: the developer still would not be "collecting", but the policy must say so.
- A feedback mailbox or form that attaches diagnostics.
- `expo-updates` (over-the-air updates contact Expo servers). The guard denies it.

## Data inventory (everything on the device)

Main database `habits.db` (SQLite through expo-sqlite, `src/lib/db/schema.ts`), in the app container. It is part of the user's own iCloud or computer backup when iOS backs the phone up.

| Table | Personal content |
|---|---|
| `app_settings` | Key and value. User-facing: `app.themePreference`, `habits.seenFirstRun`, `habits.eveningReview`, `habits.eveningReviewTime`, `habits.hideHabitNames`, `app.haptics`. Bookkeeping: `habits.lastExport` (day), `habits.reminderTitlesHidden` (which title mode the scheduled reminders use). Dev only: `dev.*` |
| `categories` | Name (free text), shape, hue, order |
| `habits` | Name, category, direction, target and unit (free text), schedule, order, archive and pause dates. Legacy `icon`, `color`, `category` columns are unused |
| `entries` | Habit, day, value |
| `frozen_days` | Habit, day |
| `entry_notes` | Habit, day, note (free text) |
| `reminders` | Habit, time, weekdays, on or off |

Other storage:

- `logs.db`, a ring of the last 500 redacted log entries (event names, timestamps, allowlisted ids and counts, error names and stack frames). No habit names, notes, device identifier or file paths.
- No AsyncStorage, SecureStore, keychain or UserDefaults use in `src/`. Dependencies touch UserDefaults (below).
- Files in `Caches/exports/`: the export file (JSON or CSV) and `diagnostics.txt`, deleted after the share sheet closes and cleared before the next export.
- Local notifications held by iOS: identifier, title, body, trigger. The title is "Habit reminder" while Hide habit names is on (the default) and the habit name when off; the body is fixed copy; there is no data payload. The evening review title is generic.
- Clipboard: the diagnostics text, when the user taps Copy diagnostics.
- Nothing leaves the device. `expo-linking` is only for the app's own scheme. The About row opens the policy page in the browser, which is the user's action.

## Required-reason APIs by dependency

Apple requires a declared reason for some APIs (UserDefaults, file timestamps, boot time, disk space). From `PrivacyInfo.xcprivacy` files found in `node_modules` during the audit (re-check after a dependency bump):

| Dependency | Has a manifest | Categories it declares |
|---|---|---|
| `expo-constants` | yes | UserDefaults |
| `expo-system-ui` | yes | UserDefaults |
| `expo-notifications` | yes | UserDefaults |
| `expo-application` | yes | File timestamp |
| `expo-file-system` | yes | File timestamp (`0A2A.1`, `3B52.1`), disk space (`E174.1`, `85F4.1`) |
| `expo-device` | yes | System boot time |
| `react-native` | yes (React resources, timing, cxxreact) | File timestamp `C617.1`, UserDefaults `CA92.1`, system boot time `35F9.1` |
| `expo-sqlite` | **no** | Bundles SQLite, which can read the database file's timestamps. Covered only by the declarations of `react-native` and `expo-file-system`; unverified |
| `expo-sharing`, `expo-clipboard`, `expo-blur`, `expo-font`, `expo-linking`, `expo-router`, `expo-status-bar`, `expo-symbols`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-screens`, `react-native-safe-area-context`, `@expo/ui` | no | None known |

The app's own code calls none of these APIs directly. The "not enough storage" export check matches an error message; it does not read disk space. Expo's guide notes that Apple does not always parse the manifests of static CocoaPods dependencies, which is why the first build must be checked (below).

`app.config.ts` declares `ios.privacyManifests` with `NSPrivacyTracking` false, no tracking domains and no collected data types. It has **no** accessed-API entries yet: they depend on what the first real build reports.

## GDPR mapping

The developer holds no data, so controller duties are largely moot for a purely local app. The practical obligations are the policy and honest in-app notices.

| Right or duty | How the app meets it |
|---|---|
| Art. 13, information | The privacy policy page, linked from Settings > About |
| Art. 15 access, Art. 20 portability | Settings > Export data: JSON (lossless, version 2) or CSV, with an Include notes option (`docs/how-to/export-format.md`). Omits internal bookkeeping and the log ring by design |
| Art. 16 correction | Edit any habit, note or log in the app |
| Art. 17 erasure | Delete a habit with its history, delete a category, or delete the app (removes the database, caches and scheduled notifications). There is no in-app "delete everything" yet (audit C-04); when it is built it must also clear `logs.db` and `Caches/exports` and cancel scheduled notifications |
| Data minimisation, lock screen | Reminders hide habit names by default; the hint under the switch points to iOS Show Previews |
| Diagnostics | Copy diagnostics says it contains no habit names or notes, so a user knows before pasting it into a public issue |
| Contact | The project's GitHub issues page |

## Checklist for the first EAS build

Do these in order on the first `eas build -p ios --profile production` (or `preview`, which uses the same dependencies).

1. Build, and download the archive or the build artifact.
2. Open the merged privacy manifest, `PrivacyInfo.xcprivacy`, in the app bundle (`Habits.app/PrivacyInfo.xcprivacy`), and the ones inside each framework or resource bundle. Confirm: `NSPrivacyTracking` is false, tracking domains empty, collected data types empty.
3. Compare the accessed-API categories present with the table above. Note any dependency whose declarations did not make it into the bundle.
4. Upload to App Store Connect (`eas submit`, or Transporter). Apple emails within minutes if a required-reason declaration is missing (ITMS-91053 family).
5. Add `NSPrivacyAccessedAPITypes` entries to `ios.privacyManifests` in `app.config.ts` **only** for the categories and reasons App Store Connect reports missing, copying the reason codes from the dependency manifests. Add a test line for each, and a note here. Do not add categories speculatively.
6. In App Store Connect: set the privacy policy URL to the one above, answer the App Privacy questionnaire with "Data Not Collected", and confirm the policy page loads (GitHub Pages must be enabled: Settings > Pages > Source: GitHub Actions, then run the `pages` workflow once).
7. Record the outcome in `docs/backlog.md` (close "verify the merged manifest at the first EAS build") and in `CHANGELOG.md`.
