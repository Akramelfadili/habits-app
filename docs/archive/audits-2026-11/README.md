# Audit 2026-11 — index and ranking

Read-only audit of the whole project, 8 November 2026, branch `chore/audit-2026-11` from `master` at `aa5eb2f`. Nine scopes, one report each. No source, config, test or workflow file was changed. Items already in `docs/backlog.md` (open, Decided, or Deliberate V3 deviations) were not re-reported unless there was new evidence. Where that happened, the report cites the backlog.

| Report | Scope | High | Med | Low | Total |
|---|---|---|---|---|---|
| [A-architecture.md](A-architecture.md) | Architecture | 0 | 2 | 5 | 7 |
| [B-scalability.md](B-scalability.md) | Scalability, V4 and sync readiness | 3 | 5 | 4 | 12 |
| [C-data-lifecycle.md](C-data-lifecycle.md) | Data lifecycle | 0 | 3 | 4 | 7 |
| [D-security.md](D-security.md) | Security | 0 | 4 | 6 | 10 |
| [E-privacy-compliance.md](E-privacy-compliance.md) | Privacy and compliance | 0 | 3 | 4 | 7 |
| [F-release-update.md](F-release-update.md) | Release, update, monitoring | 3 | 3 | 4 | 10 |
| [G-tests.md](G-tests.md) | Tests | 0 | 4 | 4 | 8 |
| [H-workflow-ai-setup.md](H-workflow-ai-setup.md) | Workflow, CI, AI setup | 0 | 4 | 7 | 11 |
| [I-ui-quality.md](I-ui-quality.md) | UI quality (code level) | 0 | 2 | 8 | 10 |
| **All** | | **6** | **30** | **46** | **82** |

The six High findings are of two kinds. Three are store blockers (F-01 to F-03). The other three block sync (B-01 to B-03), and they are High only if V4 adds accounts or sync. Nothing is High for data loss, a security leak or a crash in today's single-device app.

Overlaps were kept in both reports and are fixed once:
- C-05 is the same as H-06.
- F-02 overlaps E-07, and F-03 overlaps E-02.
- C-07 is the same as F-07.
- F-01 overlaps H-03.
- A-03 overlaps B-04 and B-07.
- D-03 covers the "required checks" part of H.

## All findings

| ID | Scope | Sev | Effort | Needs | Title |
|---|---|---|---|---|---|
| A-01 | A | Med | S | none | Mon–Sun week window hand-built in 11 places; hooks and domain disagree on the end bound |
| A-02 | A | Med | L | none | `noUncheckedIndexedAccess` off; would flag 477 errors (119 outside tests) |
| A-03 | A | Low | M | none | Whole entry log subscribed by Today, Habits, Detail, Retro-log, Export |
| A-04 | A | Low | M | none | Stricter TS flags off; three of them flag 0 errors today |
| A-05 | A | Low | M | none | Largest units: screens 170–220 lines, `messages.ts` 1385 lines |
| A-06 | A | Low | S | none | knip: 4 unused files, 98 exports, 42 types (production); unlisted deps `sharp`, `react-test-renderer` |
| A-07 | A | Low | S | none | Two unlogged `.catch(() => {})` patterns |
| B-01 | B | High* | L | migration approval, design decision | Integer autoincrement ids block multi-device merge |
| B-02 | B | High* | M | migration approval, design decision | Physical deletes, no tombstones |
| B-03 | B | High* | M | migration approval, design decision | Most tables have no `updatedAt`; no conflict rule |
| B-04 | B | Med | M | none | Today re-derives all streaks from the full log every render, un-memoised |
| B-05 | B | Med | M | design decision, migration approval | Second-precision epochs; device-local day keys with no zone stored |
| B-06 | B | Med | M | design decision | Integrity depends on app code with FKs off (sync makes backlog A7-04 routine) |
| B-07 | B | Med | M | none | Live queries on one table refire together after every write |
| B-08 | B | Med | S | phone test | Year/Progress maths fine in Node, Hermes cost unmeasured |
| B-09 | B | Low | S | none | `useLiveRows` serialises deps every render |
| B-10 | B | Low | S | none | Habit Detail slices the whole log, plus notes for all habits |
| B-11 | B | Low | M | none | No FlatList; lists are ScrollView + map |
| B-12 | B | Low | S | design decision | No "add a module" recipe |
| C-01 | C | Med | S | design decision | Starter profile wipes all habits in any dev build, no backup or guard |
| C-02 | C | Med | M | none | JSON export v1 is not lossless (pauses, category shape and hue, sort order, timestamps, settings) |
| C-03 | C | Med | M | design decision | Persistent open or migration failure is a dead end; corrupt reads count as "fresh" |
| C-04 | C | Low | S | design decision | No delete-all-data; cache exports and `logs.db` linger |
| C-05 | C | Low | S | none | ADR 002 and backlog still describe the removed `deleteAllHabits` (= H-06) |
| C-06 | C | Low | S | phone test | After restore to a new phone, reminders silent until permission and a relaunch |
| C-07 | C | Low | S | design decision | Older build opening a newer DB treats it as current (= F-07) |
| D-01 | D | Med | S | none | Secret scanning and push protection OFF on the public repo |
| D-02 | D | Med | S | none | `zod` 4.6.5 has a high advisory (GHSA-mrhx-c7xc-m3w5); bump to 4.6.6+ |
| D-03 | D | Med | S | none | No branch protection or rulesets on master; checks not required |
| D-04 | D | Med | S | none | Dependabot alerts and updates OFF, no `dependabot.yml`; 27 audit findings in the prod tree |
| D-05 | D | Low | S | none | Actions on mutable tags, `check.yml` has no `permissions`, `curl \| bash` in iOS workflow |
| D-06 | D | Low | S | design decision | No LICENSE, no SECURITY.md, private vulnerability reporting off |
| D-07 | D | Low | M | design decision | Plaintext SQLite with default file protection, included in backups |
| D-08 | D | Low | S | none | CSV export does not neutralise formulas |
| D-09 | D | Low | S | none | `edit-habit/[id]` and `month/[month]` params not validated (likely throw) |
| D-10 | D | Low | S | none | `expo-drizzle-studio-plugin` is a runtime dependency |
| E-01 | E | Med | M | design decision | Reminder title is the habit name on the lock screen, no hide option |
| E-02 | E | Med | M | design decision | No privacy policy, no Privacy row, no privacy manifest (≈ F-03) |
| E-03 | E | Med | S | phone test | Export and diagnostics files stay in Caches after sharing |
| E-04 | E | Low | S | none | Required-reason API inventory not recorded (drafted in the report) |
| E-05 | E | Low | S | none | Diagnostics carry device and timing facts and stack frames; free text in errors is unredacted |
| E-06 | E | Low | M | design decision | Export has no "exclude notes" option |
| E-07 | E | Low | S | design decision | No `bundleIdentifier`; placeholder name (≈ F-02) |
| F-01 | F | High | S | none (Apple account) | No `eas.json`, no release build path |
| F-02 | F | High | S | design decision | No bundle id, build number policy or `ITSAppUsesNonExemptEncryption` |
| F-03 | F | High | M | design decision | Privacy manifest and App Privacy label not prepared |
| F-04 | F | Med | M | design decision | No OTA; crash-on-launch after an update has only a new-build fix |
| F-05 | F | Med | S | design decision | Icon is the Expo template, icon has alpha, splash has no dark variant |
| F-06 | F | Low | S | design decision | `supportsTablet` and orientation policy unset |
| F-07 | F | Low | S | design decision | Older build over newer DB (= C-07) |
| F-08 | F | Med | S | none | No release checklist or runbook (drafted in the report) |
| F-09 | F | Low | M | design decision | Crash reporter seam exists (`LogSink`); not decided (privacy label impact) |
| F-10 | F | Low | S | none | No compatibility / minimum-version policy written |
| G-01 | G | Med | S | none | One TZ/DST test; jest runs in the machine's zone |
| G-02 | G | Med | S | none | `frozen-day-repository.test.ts` builds month bounds from UTC instants; freeze-pool month edge untested |
| G-03 | G | Med | S | none | Leap year only tested for day keys (no 366-cell year, no streak over 29 Feb) |
| G-04 | G | Med | M | none | Maestro: 6 flows, ~12 HAB ids; no freeze, categories, export journeys |
| G-05 | G | Low | M | none | No property-based tests (five targets named) |
| G-06 | G | Low | M | none | No mutation testing (Stryker targets named) |
| G-07 | G | Low | M | none | 157 hand-written `frequency: {` literals; no entry or freeze builder |
| G-08 | G | Low | S | none | `toggle-row.test.tsx` 54 s outlier; `file-export.ts` 37.5 % covered |
| H-01 | H | Med | S | none | Stop hook runs tsc + jest on every dirty turn, docs-only too |
| H-02 | H | Med | S | none | Pre-commit `biome check --write .` on the whole repo; can rewrite unstaged files |
| H-03 | H | Med | M | design decision | No release or versioning process (≈ F-01) |
| H-04 | H | Med | S | none | No PR template, issue templates, CODEOWNERS |
| H-05 | H | Low | S | none | `docs/README.md` token estimates stale; describes a removed CLAUDE.md table |
| H-06 | H | Low | S | none | = C-05 (line numbers) |
| H-07 | H | Low | S | none | Makefile `start` says Expo Go |
| H-08 | H | Low | S | none | CI runs jest twice; local `make check` omits the slow tests CI runs |
| H-09 | H | Low | S | none | `gh`, `git tag`, `git worktree`, etc. not allowlisted |
| H-10 | H | Low | M | design decision | No backlog-fix, release or audit skill |
| H-11 | H | Low | S | none | No-attribution rule only reliable through the commit-msg hook |
| I-01 | I | Med | M | phone test | Retired 11 / 12.5 pt sizes still in five shared components |
| I-02 | I | Med | S | design decision, phone test | Card and sheet radii 16/24 vs spec 20/28 |
| I-03 | I | Low | S | none | Three module cards re-implement Container "outlined" |
| I-04 | I | Low | S | design decision | Contrast test omits `inner`; four pairs under 4.5:1 (danger on inner, dark: 3.96) |
| I-05 | I | Low | S | phone test | TextField error/helper not tied to the input for VoiceOver |
| I-06 | I | Low | S | none | MonthList rows and year-map month labels lack press feedback |
| I-07 | I | Low | S | phone test | Two undocumented `allowFontScaling={false}` texts |
| I-08 | I | Low | M | design decision | Prop vocabulary drift (`tone` has 7 value sets, `size` has 6) |
| I-09 | I | Low | M | design decision, phone test | No haptics, no decision recorded |
| I-10 | I | Low | S | none | Ratchet blind spots (letterSpacing, icon sizes, borderWidth); two motion literals |

\* High only if V4 adds sync. Low priority for the single-device app.

## Top 25 by value

Value means impact per effort, with blockers for the next phase (TestFlight) first.

1. **F-01**: no `eas.json` and no release build path. Nothing can ship without it.
2. **F-02** (+E-07): bundle id, build number policy and export-compliance key. Every store step needs these.
3. **F-03** (+E-02, E-04): privacy manifest, privacy policy URL and App Privacy label. Without them the store rejects the app.
4. **D-02**: zod high advisory, a one-line bump.
5. **D-01**: turn on secret scanning and push protection. The public repo is the top risk per CLAUDE.md. It is a toggle.
6. **D-03**: branch protection that requires `check` and `secret-scan`. The gates are advisory today.
7. **D-04**: Dependabot alerts and security updates, plus a `dependabot.yml`.
8. **C-02**: make export v2 lossless before anyone writes an importer (backlog: Import, HAB-15).
9. **C-03**: a corrupt database or a failing migration is a dead end. Add a way out, and do not read a failed read as "fresh".
10. **C-01**: the starter profile can wipe the owner's habits in a dev build that shares the install. Guard it with a dev bundle id or app variant.
11. **E-01**: habit names on the lock screen. This is the most visible privacy issue for a personal app.
12. **A-01**: eleven hand-built week windows with different end bounds. This is a latent week-boundary bug, a cheap fix.
13. **G-01**: pin `TZ` in jest and add a zone matrix. Today the suite passes or fails with the machine's zone.
14. **G-02**: the freeze-pool month-boundary test depends on the machine's zone.
15. **H-02**: the pre-commit hook can rewrite unstaged files into the next commit. Use `--staged`.
16. **D-09**: malformed route params likely throw. Validate them with Zod at the route.
17. **B-04** (+A-03, B-07): Today recomputes every streak from the whole log on every render.
18. **B-08**: measure Hermes timings for Year and Today on the phone before optimising.
19. **F-04**: decide on OTA (expo-updates) before the first public build, because it changes the runtime-version policy.
20. **E-03**: delete exports and diagnostics from Caches after sharing.
21. **B-01** (+B-02, B-03, B-05, B-06): one sync-readiness ADR (UUIDs, tombstones, `updatedAt`, zones) before any V4 schema work.
22. **H-01**: the Stop hook runs tsc and jest on every docs-only turn.
23. **I-01**: retired 11 and 12.5 pt sizes contradict DESIGN.md's 12 pt minimum.
24. **G-03**: no leap-year tests for the year map or streaks.
25. **F-08** (+H-03, F-10): release checklist and runbook. The report already has a draft to commit.

## Proposed fix batches

Batches are in order. Each has one theme and one prompt, with one commit per step.

| # | Theme | Fixes | Size | Phone | Migration approval |
|---|---|---|---|---|---|
| 1 | GitHub repo settings (you, in the UI) + repo files | D-01, D-03, D-04, D-05, D-06, H-04 | S | no | no |
| 2 | Dependency hygiene | D-02, D-10, A-06 (unlisted deps, unused files) | S | no | no |
| 3 | Release config | F-01, F-02, E-07, F-05, F-06, F-08, F-10, H-03 | M | yes (first TestFlight install) | no |
| 4 | Privacy pack | F-03, E-02, E-04, E-01, E-03, E-05 | M | yes (lock screen) | no |
| 5 | Data safety | C-02, C-03, C-01, C-07/F-07, C-04, D-08, plus backlog "Back up the database before migrating" | M–L | yes (update path) | no (backup and export v2 are not migrations; confirm with `migration-reviewer` if `user_version` handling changes) |
| 6 | Dates, zones and boundaries | A-01, G-01, G-02, G-03, D-09 | S–M | no | no |
| 7 | Dev loop and docs accuracy | H-01, H-02, H-05, H-07, H-08, H-09, H-11, C-05/H-06 | S | no | no |
| 8 | Performance | B-04, A-03, B-07, B-09, B-10, then B-08 measured | M | yes (Hermes timings) | no |
| 9 | UI tokens and accessibility | I-01, I-02, I-04, I-05, I-06, I-07, I-03, I-10 | M | yes (VoiceOver, AX sizes, baselines move) | no |
| 10 | Type strictness and dead code | A-04 (the zero-error flags first), A-07, A-02 staged by folder | M–L | no | no |
| 11 | Test depth | G-04, G-05, G-06, G-07, G-08 | M | no | no |
| 12 | Sync readiness ADR (analysis, then schema) | B-01, B-02, B-03, B-05, B-06, D-07 | L | no | **yes** |
| — | Later / on demand | A-05, B-11, B-12, E-06, F-04 (if OTA is declined), F-09, H-10, I-08, I-09 | — | — | — |

Batches 1 and 2 take under an hour together and close every Med security item. Batches 3 and 4 are the path to TestFlight. Batch 5 should land before the first build that real data depends on.

## Decisions you must make

1. **Bundle id, display name, iPad support, version and build-number policy** (F-02, F-06, E-07). This also decides a separate dev bundle id or app variant (C-01).
2. **Privacy policy**: where it is hosted (URL). Also decide whether Settings gets a Privacy row (F-03, E-02).
3. **Crash reporter**: yes or no. Yes changes the App Privacy label from "Data Not Collected" to Crash Data (F-09).
4. **OTA updates** (expo-updates): yes or no. This sets the runtime-version policy and the crash-on-launch plan (F-04).
5. **Lock-screen content**: keep the habit name, use a generic title, or add a setting (E-01).
6. **Database failure recovery**: offer "set aside and start fresh"? Also decide whether a newer database is blocked or warned about on an older build (C-03, C-07).
7. **Delete all data**: build it, and what it clears (C-04).
8. **Export v2 scope**: include settings and timestamps, and offer "exclude notes" (C-02, E-06).
9. **Licence** for the public repo, and whether to enable private vulnerability reporting (D-06).
10. **Data at rest**: file protection class, and whether the database is excluded from device backups (D-07).
11. **Is V4 sync planned?** This decides whether B-01 to B-03 are High now or parked.
12. **Design tokens**: card and sheet radii (spec 20/28 or built 16/24), contrast token changes, haptics policy, prop vocabulary (I-02, I-04, I-09, I-08).
13. **New dev dependencies**: fast-check, Stryker (G-05, G-06). Per CLAUDE.md, ask first.
14. **Icon and splash artwork** (F-05).

## Not checked (from the reports)

- Import cycles (A): no tool is installed.
- Hermes timings, export bundle size and tab lazy-mount (B): these need a device or a build.
- Real old installs through migrations 0000–0008, and the foreign-key pragma on a device (C).
- The release JS bundle, and file protection on the device (D).
- The merged privacy manifest, because `ios/` is not generated (E).
- iCloud backup inclusion, and whether drizzle-studio is stripped from release (E).
- The lock screen on a real phone (E).
- Some Expo docs pages and Apple-side rules, which were taken from memory where noted (F).
- Everything visual (I): see I's "Judge on the phone".
