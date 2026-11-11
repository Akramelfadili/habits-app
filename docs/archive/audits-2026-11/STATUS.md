# Audit 2026-11 — status of every finding

State at the final pass (branch `chore/final-pass`, 11 November 2026). The reports are unchanged; this file says what became of each finding. PR numbers are in `CHANGELOG.md`.

Legend: **done** = closed in code, config or docs · **parked** = decided not now (ADR 009 for sync) · **Apple account** = blocked on the membership and Expo login · **device** = needs a phone or a simulator run to close · **open** = still to do, or waiting for the owner.

Simulator run: pending. No `ios-simulator` run exists for master yet (the last three ran on `chore/ios-validation-fixes`, 4 November), so the three e2e flows written without a run stay unverified.

| ID | State | Closed by |
|---|---|---|
| A-01 | done | #55 (one week-window helper) |
| A-02 | done | #64 (`noUncheckedIndexedAccess` for all production code, strict project) |
| A-03 | done | #65 (one shared entry-log subscription) |
| A-04 | done / parked | #64 turned on the three flags that flagged 0 errors; `noPropertyAccessFromIndexSignature` and `exactOptionalPropertyTypes` are parked (backlog "Parked") |
| A-05 | open | Later: no split of the largest screens or `messages.ts` |
| A-06 | done | #52 (unlisted dev dependencies), #64 (unused exports and file) |
| A-07 | done | #64 (probes logged, the two queue-keeping catches commented) |
| B-01 | parked | ADR 009 (V4 sync is parked, no schema work now) |
| B-02 | parked | ADR 009 |
| B-03 | parked | ADR 009 |
| B-04 | done | #65 (Today streaks memoised) |
| B-05 | parked | ADR 009 (zones and precision belong to the sync migration) |
| B-06 | parked | ADR 009; ADR 002 stays |
| B-07 | done | #65 (slices of one shared subscription) |
| B-08 | device | Perf suites run on Node only; Hermes timings need a release build (backlog "Open — Progress data layer") |
| B-09 | done | #65 |
| B-10 | done | #65 (Detail reads its habit's slice; notes memoised) |
| B-11 | open | Later: lists are still ScrollView + map |
| B-12 | open | Later: no "add a module" recipe |
| C-01 | done | #57 (starter profile refuses a database with history; dev variant bundle ids) |
| C-02 | done | #58 (export v2 is lossless) |
| C-03 | done | #57 (unreadable and newer plans, recovery screens, set-aside) |
| C-04 | open | Delete all data is not built (backlog "Release prerequisites") |
| C-05 | done | #52 |
| C-06 | device | Reminders after a restore to a new phone: manual check 1–7 in `e2e/README.md` |
| C-07 | done | #57 (newer database blocks with a screen, nothing written) |
| D-01 | open | Owner: switch secret scanning and push protection on in GitHub settings (the `secret-scan` workflow exists) |
| D-02 | done | #52 (zod 4.6.6+); Expo CLI's nested zod 3 waits for an SDK update |
| D-03 | open | Owner: master ruleset requiring `check` and `secret-scan` |
| D-04 | done / open | #52 added `dependabot.yml` and CodeQL; owner still switches Dependabot alerts on |
| D-05 | done | #52 (SHA pins, `permissions`, pinned Maestro and sharp) |
| D-06 | done / open | #52 added LICENSE and SECURITY.md; owner still enables private vulnerability reporting |
| D-07 | open | Decision: file protection class and backup exclusion |
| D-08 | done | #58 |
| D-09 | done | #55 (route-param guards) |
| D-10 | done | #52 (Drizzle Studio dev-only) |
| E-01 | done | #60 (Hide habit names, on by default) |
| E-02 | done | #60 (policy page, About row, manifest) |
| E-03 | done | #58 (export deleted after the share sheet, cache cleared at launch) |
| E-04 | done | #60 (inventory in `docs/how-to/app-store-privacy.md`); the first EAS build confirms it (Apple account) |
| E-05 | done | #60 |
| E-06 | done / open | #58 added Include notes; encryption is not planned |
| E-07 | done | #57, #61 (bundle ids per variant) |
| F-01 | done / Apple account | #61 (`eas.json`); `eas login`, `eas init` and the first build need the account |
| F-02 | done / Apple account | #61; App ID registration needs the account |
| F-03 | done / Apple account | #60 (manifest, label answers); the first build checks the merged manifest |
| F-04 | open | Decision: OTA yes or no |
| F-05 | open | Icon bundle is still the Expo template and has alpha; the dark splash is done (#61) |
| F-06 | done | #61 (phone only) |
| F-07 | done | #57 (= C-07) |
| F-08 | done | #61 (`docs/how-to/release.md`) |
| F-09 | open | Decision: crash reporter yes or no (the privacy label changes) |
| F-10 | done | #61 (compatibility rules in the release how-to) |
| G-01 | done | #55 (fixed zone, zone matrix, `make test-tz`) |
| G-02 | done | #55 |
| G-03 | done | #55 |
| G-04 | done / device | #62 wrote freeze, custom-category and export flows; unverified until a simulator run on master |
| G-05 | done | #62 (fast-check properties) |
| G-06 | parked | Mutation testing, decided in batch 19 |
| G-07 | done | #62 (builders) |
| G-08 | done | #55 (contact-sheet fixture), #62 (`file-export.ts` covered) |
| H-01 | done | #52 |
| H-02 | done | #52 |
| H-03 | done | #61 |
| H-04 | done | #52 |
| H-05 | done | #52 |
| H-06 | done | #52 |
| H-07 | done | #52 |
| H-08 | done | #52 (`make check-ci`) |
| H-09 | done | #52 |
| H-10 | open | Later: no backlog-fix, release or audit skill |
| H-11 | open | The commit-msg hook is the guard; no further change |
| I-01 | done / device | #63 (nothing below 12 pt); read it on the phone |
| I-02 | done | #63 (20 / 28) |
| I-03 | done | #63 |
| I-04 | done | #63 (contrast grounds added, four colours nudged) |
| I-05 | done / device | #63; VoiceOver reading needs the phone |
| I-06 | done | #63 |
| I-07 | done / device | #63 documented the fixed-size texts; read them at AX3 on the phone |
| I-08 | done | #63 (prop naming convention) |
| I-09 | done / device | #63 (haptics and a Settings switch); feel on the phone |
| I-10 | done | #63 (letterSpacing and icon-size ratchet patterns, motion tokens) |

Found after the audit: the Categories list at large Dynamic Type drew Rename and Delete over the name and count (AX3). Fixed in `chore/final-pass`: the actions drop under the text.
