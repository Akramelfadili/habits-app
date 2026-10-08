# E2E journeys (Maestro)

Each flow is a full user journey across several features, not an isolated
screen. File names lead with the feature IDs they cover (per
`docs/architecture.md`).

| Flow | Journey | Covers |
|---|---|---|
| `hab-06-01-03-first-run-add-and-log.yaml` | First run → pick suggestions → add a habit → log it on Today → open Edit from its Detail | HAB-06, 01, 02, 03 |
| `hab-09-10-detail-retro-log.yaml` | Today → Detail → tap a missed heatmap day → retro-log with a note → heatmap, streak (24 → 27), note all update | HAB-03, 09, 10, 08 |
| `hab-12-reminders.yaml` | Detail → Reminders → add a time, set its days (unscheduled-day warning), add a second and switch it off → Detail summary, Today unaffected | HAB-09, 12 |
| `hab-11-weekly-summary-slipping.yaml` | Summary flags a habit → backfill the week via retro-log → the insight moves to the habit left behind → "Reschedule habit →" opens its Edit | HAB-11, 10, 02 |
| `hab-13-manage-archive-delete.yaml` | Give a habit a reminder → Manage → reorder → archive it → reminder survives → restore → delete a different habit via Detail's confirm sheet | HAB-13, 12, 09, 03 |

## Status and coverage (honest version)

- **Last verified run:** 2026-10-05 — 3 of the 5 journeys failed (`hab-06`, `hab-09-10`, `hab-13`). Their selectors have since been **updated from the code but not re-run**: `hab-13` asserts the Manage footnote instead of the old title, `hab-06` asserts category group names (Health / Fitness) instead of "Morning", and `hab-09-10` steps Glass of water's quantity stepper up to its target of 8 (the sheet shows a stepper for quantity habits, not a "done" checkbox). Run `npm run e2e` to confirm; the stepper step size and the category header text are the likeliest things to need another tweak. `hab-11` and `hab-12` passed in the last run.
- **All five journeys are V1.** Nothing covers V2: no flows for HAB-14 (nav menu), 15 (settings / export), 16 (monthly), 17 (yearly), 18 (off-schedule log, retro-log pinning), 19 (manage rework), 20 (archived / restored detail), 21, 22, 24/25 (categories) or the delete sheet. V1 gaps: HAB-02, 04, 05, 07, 08 have no flow of their own. Highest-value additions: HAB-18, HAB-24/25, the HAB-14–16 navigation, HAB-15 export.
- Names: a flow leads with the feature IDs it covers; multi-ID names deviate from the single-ID example in `CLAUDE.md` on purpose.

## Running

```sh
npm run e2e                                  # every journey
npm run e2e -- e2e/hab-12-reminders.yaml     # one
```

Reuses a dev server on `APP_URL` (default `http://localhost:8081`) or starts
`npx expo start --web`. Output (JUnit report, screenshots) goes to
`.e2e-output/`. Needs Maestro (`curl -fsSL https://get.maestro.mobile.dev | bash`)
and a JDK 17+ (`JAVA_HOME`, or unpacked under `~/.local/opt/jdk-*`). The
runner finds both in those default locations.

## What these run against: the web build

There's no Mac (no iOS simulator) and no KVM (no Android emulator) on the dev
machine, so the journeys drive **Maestro's web driver** against
`expo start --web`. That means:

- **Data is the in-memory web fixtures**, not SQLite. Each flow's URL picks a
  `?fixtures=` scenario as its seed. Writes persist for the whole journey
  because navigation stays client-side. Drizzle queries, migrations and
  SQLite behaviour are covered by the repository unit tests, not by these
  flows.
- **The clock is pinned per flow** with `?clock=` (dev + web only, see
  `src/lib/dev-clock/`), so a journey means the same thing on any weekday.
  For example, the Weekly Summary's "slipping" insight can't exist before a
  habit has been due three times in the week.
- **Selectors:** on web, Maestro exposes `accessibilityLabel`/`testID` as
  `id:` and only visible text as text. On iOS, labels match as text. An iOS
  port mostly means turning `id: "<label>"` into `"<label>"`.
- **Gestures:** drag-to-reorder and swipe-to-archive can't be driven here.
  Maestro's web driver moves the pointer in a single jump, and
  gesture-handler never activates on that. `hab-13` therefore has `platform: iOS`
  branches for the gestures (unverified until a dev-client build exists).
  Its web branch archives through Detail's one-tap "Archive habit".
  The gestures are exercised on web by `npm run visual-check`
  (`manage-habits-dragging`, `-swipe-open`, `-archived-toast`) using real
  stepped pointer and touch input.
- **Viewport:** headless Chrome won't go below 500px wide, and Maestro's web
  driver can't scroll React Native Web's inner ScrollViews. The runner
  therefore uses a tall 393×1600 window so every row it taps is on screen.

## Manual-only checks (can't be automated here)

Do these on a real device with a dev-client build (`eas build --profile development`):

1. **A reminder actually fires.** Set a time 1–2 minutes ahead on a
   scheduled day, lock the phone, and confirm the notification arrives with
   the habit's name. Web stubs `expo-notifications`, and even on a simulator
   Maestro can't wait for or inspect a delivered notification.
2. **A switched-off reminder doesn't fire**, and neither does one on a day
   the habit isn't scheduled (the warning case).
3. **Archive cancels, restore reschedules.** Archive a habit whose reminder
   is due in 2 minutes: nothing should arrive. Restore it and move the time 2
   minutes ahead again: it should arrive.
4. **Delete leaves nothing behind.** Delete a habit with reminders: no
   notification should fire at its old time.
5. **Evening review** fires once at 21:30 when on, and only once across all
   habits.
6. **Permission denied.** Turn notifications off in iOS Settings: the
   Reminders screen shows the notice and stays editable. Turn them back on
   and the notice clears without restarting the app.
7. **Gestures on device.** Drag-to-reorder within a category (not across
   categories) and swipe-to-archive, i.e. the `platform: iOS` branches of
   `hab-13`.
