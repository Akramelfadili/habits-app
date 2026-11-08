# D — Security (audit 2026-11)

Repo `Akramelfadili/habits-app` is PUBLIC. No secret was found in the tree or in the 198 commits of history, the app has no network code and no analytics SDK, and the `habitsapp://dev-state` hook is compiled out of normal builds. The weak spots are GitHub settings (secret scanning, push protection, Dependabot and branch protection are all off), one fixable high advisory in a direct dependency (`zod`), and a few small hygiene items.
Counts: High 0, Med 4, Low 6.

## Findings

### D-01 — Secret scanning and push protection are OFF on a public repo
- Severity: Med
- Effort: S
- Evidence: `gh api repos/Akramelfadili/habits-app` -> `security_and_analysis`: `secret_scanning`, `secret_scanning_push_protection`, `secret_scanning_non_provider_patterns`, `secret_scanning_validity_checks` all `disabled`. The only guard is the gitleaks job in `.github/workflows/secret-scan.yml`, which runs after the push.
- Why it matters: a secret pushed to master is public the moment the push lands. CI can only flag it afterwards, and by then scrapers may already have it. Push protection blocks the push. Both features are free on public repos.
- Fix: Settings > Code security: enable Secret scanning, Push protection, Non-provider patterns and Validity checks.
- Needs: none (GitHub UI toggle)

### D-02 — `zod` 4.6.5 has a high advisory with a one-line fix
- Severity: Med
- Effort: S
- Evidence: `package.json` `"zod": "^4.6.5"`; `node_modules/zod/package.json` version 4.6.5. `npm audit --omit=dev`: zod `<4.6.6` high, GHSA-mrhx-c7xc-m3w5 (memory exhaustion validating oversized constrained collections). It is the only direct dependency with an advisory.
- Why it matters: zod parses deep-link params (`habit-form-prefill.ts:98`) and the starter profile. A crafted `habitsapp://new-habit?prefill=...` is the plausible vector, though impact is a local denial of service (the app crashes or hangs when opened from a link). Real risk is low, but the fix costs nothing.
- Fix: `npx expo install zod` (or bump the range to `^4.6.6`) and regenerate the lockfile. Expo's own nested `node_modules/expo/node_modules/zod` is also flagged; it is only fixed by an Expo SDK update.
- Needs: none

### D-03 — Branch protection and rulesets are absent on master
- Severity: Med
- Effort: S
- Evidence: `gh api .../branches/master/protection` returns 404 "Branch not protected"; `gh api .../rulesets` returns `[]`; `allow_auto_merge: false`, `delete_branch_on_merge: false`.
- Why it matters: the `check` and `secret-scan` workflows are not required to pass, and force-pushes and branch deletion are allowed. CLAUDE.md says "never push", so the process is the only protection. Fine for a single owner, but it is cheap to enforce.
- Fix: add a ruleset on master: block force-push and deletion, require PR, require status checks `check` and `gitleaks`. Also enable "Automatically delete head branches".
- Needs: none

### D-04 — Dependabot alerts and security updates are OFF, and there is no `dependabot.yml`
- Severity: Med
- Effort: S
- Evidence: `gh api .../vulnerability-alerts` returns 404 "Vulnerability alerts are disabled"; `.../automated-security-fixes` returns `{"enabled":false}`; `.github/` holds only `workflows/`. No `npm audit` step in `check.yml`.
- Why it matters: nobody is told when an advisory like D-02 lands. `npm audit` currently reports 27 vulnerabilities (3 high, 23 moderate, 1 low; production tree), 33 with dev dependencies.
- Fix: enable Dependabot alerts and security updates. Optionally add `.github/dependabot.yml` for npm and github-actions, weekly, grouped. Keep Expo packages pinned via `expo install`, because Dependabot bumps can break the SDK alignment.
- Needs: none

### D-05 — Workflow hardening gaps (no SHA pinning, `check.yml` has no `permissions`, unpinned downloads)
- Severity: Low
- Effort: S
- Evidence: `.github/workflows/check.yml` has no `permissions:` block (the repo default is `read`, per `gh api .../actions/permissions/workflow`, so it is safe today). All actions use mutable tags (`actions/checkout@v4`, `setup-node@v4`, `cache@v4`, `upload-artifact@v4`, `download-artifact@v4`); `actions/permissions` shows `sha_pinning_required: false`. `ios-simulator.yml` runs `curl -Ls "https://get.maestro.mobile.dev" | bash` (lines in the `capture` and `flows` jobs) and `npm install --no-save ... sharp` unpinned in the `report` job.
- Why it matters: only first-party `actions/*` are used and there are no secrets in any workflow, so exposure is small. `ios-simulator.yml` is `workflow_dispatch` only and has `permissions: contents: read`. The unpinned curl-to-bash and sharp install would execute whatever those hosts serve at the time. If the repo ever gains secrets, these become real.
- Fix: add `permissions: contents: read` to `check.yml`; pin actions to full SHAs (Dependabot can then maintain them); pin the Maestro installer version and `sharp@<version>`.
- Needs: none

### D-06 — No LICENSE and no SECURITY.md on a public repo
- Severity: Low
- Effort: S
- Evidence: `ls` at the repo root shows no `LICENSE*`, `SECURITY*` or `CODEOWNERS`; `package.json` has `"private": true` and no `license` field. Private vulnerability reporting is off (`gh api .../private-vulnerability-reporting` returns `{"enabled":false}`).
- Why it matters: without a LICENSE the code is "all rights reserved" by default (nobody may legally reuse it); that may be the intent, but it should be a decision. With no SECURITY.md and private reporting off, a finder has nowhere to report privately.
- Fix: decide on a license (or state "all rights reserved" in the README); enable Private vulnerability reporting; add a 5-line SECURITY.md.
- Needs: design decision (license choice)

### D-07 — Local data is plaintext SQLite with default iOS protection, included in backups
- Severity: Low
- Effort: M
- Evidence: `src/lib/db/client.ts:21` `openDatabaseSync("habits.db", { enableChangeListener: true })` (no encryption option); `src/lib/logger/repositories/log-repository.ts:18` `openDatabaseSync("logs.db")`; `app.json` plugins list `"expo-sqlite"` with no options (no SQLCipher, no `useSQLCipher`) and no data-protection entitlement or `NSFileProtection` setting. grep for `encrypt|NSFileProtection|useSQLCipher` in `src` and `app.json` finds nothing.
- Why it matters: this is acceptable for a personal habit tracker with no backend. iOS applies its default file protection (complete until first user authentication) and the files are in the app sandbox. Both DBs are unencrypted and travel in iCloud and iTunes backups (the app has no "excluded from backup" flag). Habit names and notes are the only sensitive content. Logs are redacted by an allowlist (`src/lib/logger/redact.ts`, no user text), so `logs.db` holds no habit text. The exported file goes to the cache directory (`file-export.ts:20`) and is cleared before the next export (`export-service.ts:93`); it is not deleted after sharing.
- Fix: no action needed for the current threat model. Optionally set `NSFileProtectionComplete` through a config plugin / `expo-build-properties` if stronger at-rest protection is wanted, and delete the export file after the share sheet closes. Record the decision in the privacy notes.
- Needs: design decision

### D-08 — CSV export does not neutralize spreadsheet formulas
- Severity: Low
- Effort: S
- Evidence: `src/modules/habits/domain/export-csv.ts:71-77` `escapeCsvField` quotes only `"`, `,`, CR and LF; a value starting with `=`, `+`, `-` or `@` is written as-is. `grep -i 'formula\|injection'` in `src` and `docs/backlog.md` finds nothing.
- Why it matters: the user's own habit names or notes could contain a formula (for example pasted text) and run when the CSV is opened in Excel or Sheets. The data is entirely self-authored and the app is single-user, so this is only a hygiene issue.
- Fix: prefix a `'` (or a tab) to text fields that start with `= + - @` (keep numbers as numbers); add a unit test beside the existing escape tests.
- Needs: none

### D-09 — Route params are cast without validation (`edit-habit/[id]`, `month/[month]`)
- Severity: Low
- Effort: S
- Evidence: `src/app/edit-habit/[id].tsx:6` `habitId={Number(id)}` (a non-numeric id gives `NaN`, so `getHabitById(NaN)` is undefined and the screen is expected to show the missing-habit state); `src/app/(tabs)/(today,progress,habits)/month/[month].tsx:6` passes `month` unchecked to `fromDayKey` (`src/utils/day-key.ts:22`), which falls back to `parseISO` and can return an Invalid Date; `progress-month-screen.tsx:43` then calls `format(monthStart, "MMMM yyyy")` at line 66, and date-fns `format` throws `RangeError: Invalid time value` on an Invalid Date.
- Why it matters: `habitsapp://month/garbage` (or any malformed link) can crash the screen. The scheme is registered and any other app or web page on the phone can open it. The impact is a crash, not data exposure. Everything else is validated: `parseHabitPrefill` (`habit-form-prefill.ts:98`) uses Zod safeParse inside try/catch; `focus`, `firstRun` are compared to literals; `name` is bound to a form field validated by Zod on save.
- Fix: validate `month` with a `/^\d{4}-\d{2}-\d{2}$/` check plus `isValid`, and redirect to Today otherwise; reject `id` that is not a positive integer.
- Needs: none (confirm on device that the crash reproduces; I read the code but did not run it)

### D-10 — `expo-drizzle-studio-plugin` is a runtime dependency
- Severity: Low
- Effort: S
- Evidence: `package.json` dependencies list `"expo-drizzle-studio-plugin": "^0.2.1"`; used at `src/lib/db/database-provider.tsx:95` `useDrizzleStudio(__DEV__ ? expoDb : null)`.
- Why it matters: the hook is passed `null` outside `__DEV__`, so the DB is not exposed to the studio, but the package is still bundled and shipped in release builds. It is a dev-only tool that opens a dev-server connection to the DB. Dead weight and a larger attack surface than necessary.
- Fix: move it to `devDependencies` and load it only behind `__DEV__ ? require(...)`, as `StarterProfileGate` already does in `src/app/_layout.tsx:44`.
- Needs: none

## Checks that came out clean

### Secrets (tree and history)
- `git log --all --diff-filter=A --name-only` filtered for `.env|.p8|.p12|.pem|keystore|credential|.log|.jks|secret|mobileprovision|google-services|GoogleService`: only `.env.local.example` (placeholder habit names), `.github/workflows/secret-scan.yml`. Nothing else was ever added on any branch.
- `git log --all -G` for key shapes (AKIA, ghp_, sk-, xox[bp]-, AIza, EXPO_TOKEN=): no commit. `-S'-----BEGIN'`: only `.gitleaks.toml`, `scripts/check-repo-hygiene.mjs` and its test (synthetic fixture, allowlisted, documented in `.gitleaks.toml`).
- `.gitignore` covers `.env`, `.env.*`, `*.log`, `*.pem`, `*.p8`, `*.p12`, `*.key`, `*.mobileprovision`, `*.keystore`, `*.jks`, `*.cer`, `google-services.json`, `GoogleService-Info.plist`, `service-account*.json`, `coverage/`, `dist/`. `ios/` and `android/` are not tracked (`git ls-files` finds none). No `eas.json`.
- `EXPO_PUBLIC_*` usage: only `EXPO_PUBLIC_DEVICE_VALIDATION` (a flag) and `EXPO_PUBLIC_STARTER_PROFILE` (read only in `starter-profile-gate.tsx:25`, which is required only under `__DEV__`, `src/app/_layout.tsx:44`). Neither carries a secret; the second carries personal habit names kept out of the production bundle by that gate (build output not inspected, see Not checked).

### GitHub Actions
- Triggers: `check.yml` and `secret-scan.yml` use `pull_request` and `push: master` (no `pull_request_target`, no `workflow_run`); `ios-simulator.yml` is `workflow_dispatch` only. No secrets are referenced anywhere (`secrets.` grep: none), so fork PRs cannot exfiltrate anything.
- `secret-scan.yml` and `ios-simulator.yml` declare `permissions: contents: read`; `persist-credentials: false` in the scan; gitleaks binary pinned by version plus SHA-256.
- Repo Actions settings: default workflow permissions `read`, `can_approve_pull_request_reviews: false`, fork PR approval policy `first_time_contributors`. Consider tightening to "all outside collaborators" (see checklist).
- Third-party actions: none (all `actions/*`).

### Dependencies and licenses
- `package-lock.json` is present and `npm ls --depth=0` completes with no "missing" or "invalid" lines; CI uses `npm ci`.
- `npm audit` worked (network available). Production tree: 27 vulnerabilities (1 low, 23 moderate, 3 high). The 3 high: `zod` (D-02), `node-forge` (<=1.4.0, several advisories, pulled in by `@expo/cli` dev tooling, not shipped in the app), `@expo/cli` (range advisory, dev tooling). Most moderates are the `@expo/config*`, `glob`, `minimatch`, `jest*` chains and need an Expo SDK or Jest update, not an action here. `npm audit fix --force` proposes `expo@53`, which would be a downgrade and must NOT be run.
- Licenses (read from every `node_modules/*/package.json`, ~680 packages): MIT 631, ISC 38, BSD-3-Clause 17, Apache-2.0 12, BlueOak-1.0.0 7, BSD-2-Clause 5, MIT OR Apache-2.0 2, Unlicense 2, MIT-0 1, CC-BY-4.0 1, MIT AND Apache-2.0 1. No GPL, AGPL, LGPL or unknown licenses. All direct dependencies are MIT, Apache-2.0 or ISC.

### Deep links
- Scheme `habitsapp` (`app.json`). Incoming URLs are handled only by expo-router file routes; no custom `Linking.addEventListener`, `getInitialURL` or `+native-intent` handler exists (grep of `src`). `Linking` is used only for `openSettings()` (3 call sites).
- `habitsapp://dev-state`: `src/app/dev-state.tsx` -> `DevStateScreen` (`dev-state-screen.tsx:24`). First statement is `isDeviceValidationBuild()`, which is `process.env.EXPO_PUBLIC_DEVICE_VALIDATION === "1"` (`src/lib/device-validation/enabled.ts:14`); when false the effect returns early and the component renders `<Redirect href="/" />`. Only `.github/workflows/ios-simulator.yml` sets the variable. `readLaunchRequest` (`launch-request.ts:17`) also checks the flag first. `device-validation.guard.test.ts` enforces that only the dev-state screen reaches the state loader and that it asks the flag first. Not `__DEV__`-gated (by design, the CI build is a Release build), so the guard is a build-time env flag; it cannot be switched on from a deep link or at runtime in a normal build.
- Residual risk: if someone exports `EXPO_PUBLIC_DEVICE_VALIDATION=1` (or puts it in the gitignored `.env.local`) when building a real release, any app could wipe the database with a link. Mitigation to consider: a CI/`make check` guard that fails an EAS/release build when the variable is set (no `eas.json` exists yet, so this matters at the first TestFlight setup).

### Input validation
- Forms use React Hook Form with Zod (`makeHabitFormSchema`); prefill uses `safeParse` in try/catch; the starter profile is parsed and validated (`parseStarterProfile`, `starter-profile.ts`, invalid profile changes nothing) and is dev-only; the launch request is type-checked field by field; SQL goes through Drizzle, and the logger's raw SQL uses bound parameters (`log-repository.ts:34`). Gaps: D-09.

### No network, no analytics (proof by grep)
- `grep -rn -i -E '\bfetch\(|XMLHttpRequest|WebSocket|axios|analytics|sentry|firebase|amplitude|segment|mixpanel|posthog|bugsnag|crashlytics|https?://' src` excluding tests: zero real hits. The only matches are the words "segment" in UI code (`progress-bar.tsx`, `theme.ts`, `redact.ts` "QUOTED_SEGMENT", `_layout.tsx` prop name) and a comment URL in `src/lib/db/migrations/migrations.js:1` (drizzle docs link). No `http(s)://` string is used in code.
- `package.json` dependencies and devDependencies contain no analytics, crash-reporting, HTTP-client or socket packages (full list read above). Network-capable pieces are dev-only: Metro and `expo-drizzle-studio-plugin` (D-10). `expo-notifications` is used for local notifications only (no push token registration found in `src`). `docs/decisions/008-logging.md:36` already requires an ADR before anything leaves the device.

## GitHub settings checklist (read-only `gh api`, 2026-11-08)

| Setting | State | Action |
|---|---|---|
| Visibility | public | as intended |
| Secret scanning | disabled | turn ON (D-01) |
| Push protection | disabled | turn ON (D-01) |
| Non-provider patterns, validity checks | disabled | turn ON |
| Dependabot alerts | disabled | turn ON (D-04) |
| Dependabot security updates | disabled | turn ON (D-04) |
| Private vulnerability reporting | disabled | turn ON (D-06) |
| Branch protection on master | none (404) | add ruleset (D-03) |
| Rulesets | none | add one: no force-push, no deletion, required checks `check` and `gitleaks` |
| Actions allowed | all actions and workflows | optionally restrict to GitHub-owned actions (all in use are `actions/*`) |
| Require SHA pinning | false | optional, after D-05 |
| Default workflow token | read | good |
| Workflows may approve PRs | false | good |
| Fork PR approval policy | first_time_contributors | tighten to require approval for all outside collaborators |
| Allow forking | true | normal for public repos |
| Delete head branches on merge | false | turn ON |
| Auto-merge | false | leave |

## Not checked
- Production bundle contents: I did not run `expo export`/`prebuild`, so I did not confirm that `EXPO_PUBLIC_STARTER_PROFILE` and the dev-state loader are absent from a release bundle (relies on `check-architecture` and `device-validation.guard.test.ts`, which I read but did not run).
- D-09 crash was read from code, not reproduced on a device or simulator.
- iOS runtime file-protection class of `habits.db` (needs a device, `fileProtection` attribute) and whether the DB is in the backup set: inferred from expo-sqlite defaults and the absence of config, not verified.
- Native/transitive licence details beyond the `license` field of each `package.json` (no `license-checker` installed; packages with no field would show as UNKNOWN, none did).
- Git history was searched with key-shape regexes and file-name patterns, not with a full entropy scanner; the repo's own gitleaks job covers that on every PR (I did not check its latest run status).

## Strengths
- Defence in depth for secrets: a thorough `.gitignore`, `check-repo-hygiene.mjs` inside `make check`, and a full-history gitleaks job with a pinned, checksum-verified binary and `--redact`. History is clean.
- Zero network surface: no HTTP, socket or analytics code in `src`, no such packages, and an ADR (`008-logging.md`) requiring a written decision before data leaves the device.
- The device-validation hook fails closed: build-time env flag, early redirect, guard test, and a workflow that is manual-only with `contents: read`.
- The logger redacts by allowlist of field names, caps error text and strips quoted segments, so `logs.db` and "Copy diagnostics" cannot carry habit text.
- Workflows are fork-safe: no `pull_request_target`, no secrets, read-only default token, first-time-contributor approval.
