# Habits V1 — UX/UI audit (Sep 2026)

A design and UX read of the whole app seen together, rather than one feature
at a time. It isn't a bug hunt. Sources:

- all 33 states from `npm run visual-check`: open `.visual-checks/report.html`
  to see mockup | render side by side. State names below in `code` are the
  names in that report.
- the five Maestro journeys in `/e2e`, which walk the real cross-feature
  flows.
- the code, to confirm each behaviour rather than guess it from a screenshot.

**Ignored as web-only artifacts** (see the implement-feature skill): blank SF
Symbols (empty icon squares, the black disc on Day closed), the fallback font,
teal switch thumbs (RN Web's default `Switch`), the blank header strip and
missing back chevrons on pushed screens, the 500px minimum width, and focus
outlines.

**Already fixed during this pass:** Weekly summary and Manage were
unreachable from the Empty, Rest day and Day closed states. The Reminders
card collapsed and hid its own warning. Text fields had no accessible name.

Each finding says **what's wrong**, **where to see it**, **why it matters**,
and **the suggested fix**. P1 means a real friction point in a core flow, P2
means an inconsistency you notice across screens, and P3 means polish.

---

## P1 — Core-flow friction

### 1. A habit can only be edited from the Weekly Summary insight
- **What:** the only route to `/edit-habit/:id` is "Reschedule habit →" on
  the slipping-habit card. Habit Detail has no Edit action, and nothing else
  links to it.
- **Where:** `habit-detail`, `habit-detail-new`, and journey `hab-11` (the
  only flow that reaches Edit).
- **Why it matters:** renaming a habit, changing its schedule, or changing
  its target needs a bad week first. HAB-13 says moving a habit to another
  category "is done via Edit", which is unreachable, so the
  reorder-within-category limit has no escape hatch.
- **Fix:** add an Edit action to Habit Detail, as a header-right "Edit" or a
  row next to Reminders. Detail is already the hub for Reminders and Delete,
  so Edit belongs there too. **Done in Round A** (header-right "Edit").

### 2. Completing a habit gives no feedback, and the Undo that does exist never expires
- **What:**
  - The completion toast with Undo (design system, "Feedback") only renders
    in the Day closed state.
  - Ticking a habit on populated Today gives no toast at all.
  - Once the day closes, the "Marked 'X' complete — Undo" toast is derived
    from "latest entry today" with no time window. It is back every time you
    open the app for the rest of the day.
- **Where:** `today-break-resisted` (no toast) vs `today-day-closed` (toast on
  a cold load).
- **Why it matters:** the one moment feedback matters most, the tap itself,
  gets nothing. And a stale Undo hours later invites accidentally undoing
  a completion.
- **Fix:** one rule everywhere, the same one Manage already uses. Show a
  toast on every completion, keep Undo for about 4s, then dismiss it. Day
  closed then shows the toast only when you have just caused the transition.
  **Done in Round B** (shared toast slot in the Habits stack).

### 3. Archive is hidden: a swipe, or a detour through Delete
- **What:** there are only two ways to archive a habit:
  - an undiscoverable swipe-left on Manage;
  - Detail → **Delete habit** → "Archive instead".

  The spec calls archive "one tap". In practice the safe action lives behind
  the destructive one. (Correction: I first called the swipe-open state
  broken. Checking the DOM showed the whole row, background included, sliding
  about 104px as one unit, the same as an iOS Mail row. It's fine as it is.)
- **Where:** `manage-habits`, `manage-habits-swipe-open`, `delete-confirm`.
- **Why it matters:** anyone who wants to archive has to start by pressing
  Delete. That trains exactly the wrong reflex for the one unrecoverable
  action.
- **Fix:**
  - Put a visible "Archive" on Detail above "Delete habit", as a secondary
    button, not red. **Done in Round A.**
  - On Manage, keep the swipe as a shortcut.
  - Optionally add a long-press menu for Archive.

### 4. Archive and delete from Detail leave the screen silently
- **What:** "Archive instead" and "Delete permanently" both just
  `router.back()`. The habit vanishes from the list you land on with no toast.
  Manage's own archive shows "Habit archived — Undo", so the same action
  confirms itself in one place and not the other.
- **Where:** journey `hab-13`, web branch.
- **Fix:** show a toast on the screen you land on:
  - archive: "Archived 'Meditate' — Undo";
  - delete: "Deleted 'Mobility'", with no Undo.

  **Done in Round B.**

### 5. The Weekly Summary is emptiest when you'd naturally review a week
- **What:** the summary shows the current Monday–Sunday week up to today. So:
  - Sunday night and Monday morning, the natural review moments, show a
    finished week that disappears at midnight, then a week with 0–1 days in
    it.
  - Early in the week the insight says "Too early to call".
  - After a single perfect Monday it says **"Perfect week — Nothing to fix
    this week"**. The perfect check runs before the three-day minimum.
- **Where:** `weekly-summary-too-early` (Tuesday), and `perfect-week` logic
  when run on a Monday.
- **Why it matters:** HAB-11's promise is "once a week, one honest screen."
  Today it's honest for about 3 days out of 7.
- **Fix:**
  - Until Wednesday, show last week by default, with a "This week" /
    "Last week" toggle in the header.
  - Also, don't award "Perfect week" until the same ≥3-scheduled-days rule
    that gates the slipping insight is met.

  **Done in Round C.** The summary opens on last week on Monday and
  Tuesday, with a Last week / This week switch. The ≥3-scheduled-days gate
  now runs before both verdicts.

---

## P2 — Inconsistencies you only see across screens

### 6. First run promises details it doesn't create
- **What:** the suggestion subtitles read "Right after waking", "10 pages",
  "5 minutes" and "Evening". But `suggestionToCreateHabitInput` creates every
  habit as a simple daily check with **no category**. "Read before bed · 10
  pages" becomes a plain checkbox, and all of them land together under
  "Anytime" on Today.
- **Where:** `first-run`, then Today after journey `hab-06-01-03`.
- **Fix:** do one of two things.
  - Create what the subtitles promise: Read as quantity 10 pages, Journal in
    Evening, Water in Morning.
  - Or change the subtitles to what is actually created, e.g.
    "Daily · check off".

  The first gives a much better first Today, with real category groups.

  **Done in Round D** (first option). HAB-06's business rule in the spec is
  updated to match.

### 7. "Log something anyway" opens *Create a habit*
- **What:** on a Rest day the only action says "log" but pushes
  `/new-habit`. HAB-05 allows either creating a habit or logging an existing
  one off-schedule. The label promises the second while the button does the
  first.
- **Where:** `today-rest-day`.
- **Fix:** open a small sheet of existing habits, where tapping one logs an
  off-schedule bonus entry, with "New habit" at the bottom. Or rename the
  button to "Add a habit".

### 8. Break-habit wording drifts from screen to screen

| Surface | Current copy |
|---|---|
| Today row caption | "No phone after 23:00 — resisted" (repeats the name right under it) |
| Completion toast | "Marked 'No phone after 23:00' **complete**" |
| Today progress | "3 of 4 **complete**" |
| Weekly summary row | "No phone in bed **· resisted**" (suffix on the label) |
| Delete sheet | "all 142 **logged** days" |

- **Fix:** pick one rule.
  - Break rows say **"Resisted"** alone as the caption.
  - The toast says "Resisted 'X' — Undo".
  - Summary rows use the same caption treatment, not a label suffix.
  - Progress keeps "complete", since it counts both kinds, and that's fine.

  **Done in Round E.** Summary rows show "5/7 resisted" in the grey count
  rather than a caption, since ProgressRow has no caption slot. HAB-04's
  acceptance criterion is amended to match (agreed during Round E).

### 9. The numbers use three different words
- **What:** Detail's 90-day tile says "75 of 89 **due**". Summary says "of 42
  **scheduled**". Delete says "142 **logged** days". Manage says "41 **logs**
  kept". The spec's own example is "78 of 90 logged".
- **Fix:** use **scheduled** for every denominator, and **done** (or
  resisted) for numerators. "N logs kept" → "N days logged".

  **Done in Round E**, with one exception: Detail's 90-day tile says "75 of
  89 days". Its one-line caption in a third-width tile fits about 13
  characters, so neither "scheduled" nor "resisted" fits. "due" is gone
  everywhere. Archived rows read "2 Sep · 41 days logged", or "nothing
  logged" when a habit has no history.

### 10. Every secondary screen has its own title and exit style

| Screen | Title treatment | How you leave |
|---|---|---|
| Today | date overline + large "Today" | — |
| Weekly summary | range overline + large "Your week" | back |
| Habit detail | icon + name header, no nav title | back |
| Reminders | large "Reminders", no overline | back ("Meditate") |
| Manage | large **"Habits"** (same as the tab), inline **"Done"** | Done, although it's a push |
| New / Edit habit | small nav title | **Cancel** |
| Retro-log sheet | date title | **Close** |
| Category sheet | — | **Done** |
| Quantity / at-risk / delete sheets | — | grabber only |

- **Fix:** three rules.
  - A pushed screen gets back plus a large title that matches the label that
    opened it. Manage becomes **"Manage habits"** and loses "Done".
  - A modal form gets Cancel and Save.
  - A sheet gets the grabber, plus "Cancel" only when it holds an unsaved
    draft (retro-log, time, category).

  **Done in Round E:** Manage and retro-log ("Close" → "Cancel"). The
  category sheet keeps "Done", because it's that sheet's confirm button
  rather than a way out. Weekly Summary keeps its mockup title, "Your
  week", rather than "Weekly summary".

### 11. A habit's visual identity changes from screen to screen
- **What:**
  - Today, Detail and Manage use the tinted icon badge.
  - The Day closed "Tomorrow" preview uses tiny pale-tint dots.
  - First run uses saturated ink dots.
  - Weekly summary rows use nothing.
  - Archived rows use a grey badge.
- **Where:** `today`, `today-day-closed`, `first-run`, `weekly-summary`,
  `manage-habits`.
- **Fix:** use the small icon badge everywhere a habit is named, including
  the Summary rows and the Tomorrow preview. The amber slipping bar then
  stands out against colour that means something.

### 12. Today rows hide what a habit asks of you
- **What:** the Today mockup gives each row a subtitle ("20 pages",
  "10 minutes · breath", "Resist after 23:00"), and the build omits them.
  - A quantity habit's target is only visible as a pie in the circle.
  - An X-per-week habit gives no sign of where you stand: is it 1 of 5 this
    week or 4 of 5?
- **Fix:** add a subtitle, shown only when it adds information:
  - the target for quantity habits;
  - "2 of 5 this week" for per-week habits;
  - nothing for simple daily habits.

  **Done in Round D.**

### 13. Manage hides the category limit it enforces
- **What:** drag-to-reorder only works within a category, but Manage shows one
  flat list. Dragging Meditate below Read just snaps back with no explanation.
- **Where:** `manage-habits`, `manage-habits-dragging`.
- **Fix:** add the same category section headers Today uses. Then the limit
  is visible and needs no explanation.

### 14. The retro-log sheet works differently from logging on Today
- **What:**
  - Opened from *one* habit's heatmap, it lists every habit for that day,
    and the habit you came from isn't first or highlighted.
  - Undone rows are dimmed, so they read as *disabled* (Meditate, Mobility in
    `retro-log`).
  - Quantity habits use a checkbox plus a hidden tap-to-expand stepper, where
    Today uses the stepper and quick-add chips (`quantity-log`).
- **Why it matters:** the day-wide list is useful (journey `hab-11`
  backfills three habits per sheet), but it should read as "this day" and be
  instantly familiar.
- **Fix:**
  - Put the opened habit first.
  - Drop the dimming; an empty checkbox is enough.
  - Reuse the Today stepper row for quantity habits.

### 15. "Evening review" is app-wide but lives on each habit's Reminders
- **What:** turning it on from Meditate's screen also shows it on Evening
  walk's. It looks per-habit but isn't.
- **Where:** `reminders`, `reminders-empty`.
- **Fix:** move it to the future single Today menu, since the V2 entry-point
  item is where it belongs. Until then, caption it "Applies to all habits".

### 16. An archived habit's Detail looks fully active
- **What:** tapping an archived habit in Manage opens a normal Detail. It
  shows "Reminders · 1 on · 09:00", which are paused while archived, and
  there's no "Archived" marker and no Restore.
- **Where:** journey `hab-13` (Meditate after archiving).
- **Fix:** add an "Archived on 24 Sep" banner with Restore at the top of
  Detail, and make the Reminders row read "Paused while archived".

### 17. The no-freezes reset happens with no explanation
- **What:** with the pool empty, a streak drops from 24 to 1 and nothing says
  why. The spec forbids a *prompt*, but the `streak-reset-no-freezes`
  mockup designs a passive line: "Streak reset — no freezes left this month.
  The pool refills on 1 October." It also changes the legend: "0 freezes left
  — Tuesday stays a miss." Neither was built.
- **Where:** `habit-detail-no-freezes` vs its mockup.
- **Fix:** build the passive line on Detail, shown in the month the reset
  happened.

---

## P3 — Polish

- **Today's secondary links:**
  - The interim ghost links sit below the fold on a normal day.
  - Their grey-on-grey text is very low contrast. Adding two of them to Day
    closed moved only about 1.8k pixels in the visual diff.
  - In dev builds, "Clear all habits (dev)" sits directly under "Manage
    habits" in identical styling.

  Until the V2 header menu exists, put dev actions under a divider and a
  "Developer" label.
- **Stat captions truncate:** "days, in Sept…" (`habit-detail-no-freezes`).
  Use short months ("in Sep") or "until Tue", as the mockup does.
- **Wording:**
  - "Best day: **All** · every day full" reads awkwardly; try "Every day" /
    "all done".
  - "90 days: — · 0 of 0 due" on a new habit could just say "Not due yet".
- **Name field:**
  - The counter shows from the first keystroke ("0/40") because
    `COUNTER_THRESHOLD` (40) equals the name's `maxLength` (40). The comment
    says it should only appear near the cap.
  - There's no placeholder.
  - "Save habit" is disabled with no hint about why.
- **Manage:** "0 logs kept" for an archived habit with no history should read
  "No days logged".
- **Day closed:** the spec asks for tomorrow's habits "with their times". The
  preview lists names only, even when reminders exist.
- **Delete sheet:** "Archive instead" appears twice, as an explanatory card
  (which looks tappable) and again as a button. The mockup has the same
  duplication. Make the card itself the button, and keep the order: Keep →
  Archive → small red Delete.
- **Streak at risk:** tapping a habit's *name* to see its history opens a
  decision sheet instead. The spec intends this, but the at-risk amber ring
  on the circle is the only warning. A one-line row caption ("Missed
  yesterday") would make the sheet expected rather than a surprise.

---

## What works — keep it

- **The Delete sheet's hierarchy:** the safe option dominates and the red
  link is smallest. It reads as deliberate.
- **Reminders:**
  - The unscheduled-day warning and the non-blocking permission notice are
    clear.
  - A new reminder opening straight into its time picker saves a step.
  - "3 of 4" plus the cap caption explains the limit before you hit it.
- **Empty, Rest day and Day closed** are clearly distinct from each other, as
  HAB-05 requires.
- **Retro-log as a day view** is genuinely efficient for backfilling (see #14
  for the fixes that keep it).
- **First run** is short and gets you a populated Today in one tap.

## Suggested order

1. **#1 Edit on Detail** and **#3 visible Archive on Detail.** One small change
   to Detail unblocks the most.
2. **#2 and #4, one toast rule** for complete, archive and delete.
3. **#5 Weekly summary: last week + perfect-week gate.**
4. **#6 First-run fidelity** and **#12 Today subtitles.** Together they make
   the first Today look like the mockup.
5. **#8, #9, #10 as one copy-and-chrome pass.** They're mostly strings and
   header options, so they're cheap to do together.
6. The rest as they come up. #11, #13, #15 and the P3 items fold naturally
   into the V2 Today header/menu work already on the roadmap.
