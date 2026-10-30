/**
 * Every screen and state scripts/visual-check.mjs renders — one entry per
 * state across all features, so a single run covers the whole app and a
 * shared-component change shows up on every screen it touches, not just the
 * feature that made it.
 *
 * Each entry: `feature` (spec ID, groups the report), `route` (with the
 * `?fixtures=` scenario, see src/modules/habits/dev/habit-fixtures.ts), `mockup` (the docs/mockups/
 * file it's judged against, or null when no mockup covers that state),
 * optional `clock` (overrides DEFAULT_CLOCK), `viewport` ({ width, height }
 * in CSS px, overrides the default 393×852 — e.g. a small phone with the
 * keyboard up), `note`, `touch` (render in a
 * touch-enabled page, for swipe gestures), `colorScheme` ("light" default, or
 * "dark" — the emulated OS scheme, which the Appearance setting's default
 * "System" follows, HAB-15), and `interact(page, ctx)` for states only reachable by a tap or gesture.
 */
import { format, subDays } from "date-fns";

/**
 * "Now" for every screen unless it sets its own: a Thursday late in a month,
 * after every fixture's creation date. Pinned so a screenshot never depends
 * on the day the check runs — the baseline diff would drift daily otherwise.
 */
export const DEFAULT_CLOCK = "2026-09-24T09:00:00";

/** The Today frames dates: Friday 23 and Saturday 24 October 2026. */
const V3_FRIDAY = "2026-10-23T09:00:00";
const V3_SATURDAY = "2026-10-24T09:00:00";

/** The Progress tab's range switcher — a tab per range; at AX sizes a collapsed button first. */
async function showRange(page, range) {
	await page.getByRole("tab", { name: range }).click();
	await page.waitForTimeout(500);
}

/** Scrolls the Progress tab by `top` pt (or to the end) with the wheel, and waits out the bar's crossfade. */
async function scrollProgress(page, top) {
	await page.mouse.move(200, 400);
	await page.mouse.wheel(0, top === "end" ? 6000 : top);
	await page.waitForTimeout(600);
}

/** Year → the year's July label → that month, with 14 July ringed (P13). */
async function openJuly14(page) {
	await showRange(page, "Year");
	await page.getByRole("button", { name: /^July,/ }).click();
	await page.waitForTimeout(500);
	await page.getByRole("button", { name: /^Tuesday 14 July,/ }).click();
	await page.waitForTimeout(400);
	await scrollProgress(page, 360);
}

const PROGRESS = "/(progress)/progress?fixtures=";

/** A heatmap cell's accessibility label, `daysAgo` days before the screen's clock. */
function heatmapCellLabel(clock, daysAgo, status) {
	const day = subDays(new Date(clock), daysAgo);
	return `${format(day, "EEEE d MMMM")}, ${status}`;
}

/**
 * A real pointer drag in small steps — gesture-handler's pans only activate
 * after a few pixels of movement, so a single jump never registers.
 */
async function drag(page, locator, { dx = 0, dy = 0, release = true }) {
	const box = await locator.boundingBox();
	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + dx, y + dy, { steps: 12 });
	if (release) await page.mouse.up();
}

/** The New habit form's own Name field (the add-category sheet has its own). */
async function typeHabitName(page, name) {
	await page.getByLabel("Name", { exact: true }).first().fill(name);
}

/** A category picker chip by its label (HAB-24). */
function categoryChip(page, name) {
	return page.getByRole("button", { name, exact: true }).first();
}

export const SCREENS = {
	// HAB-06 — First run
	"first-run": {
		feature: "HAB-06",
		route: "/?fixtures=first-run",
		mockup: "docs/mockups/first-run.png",
	},
	"first-run-none-selected": {
		feature: "HAB-06",
		route: "/?fixtures=first-run",
		mockup: "docs/mockups/first-run.png",
		note: "Both defaults unchecked — primary reads 'Add habits', disabled. Mockup shows the default state.",
		async interact(page) {
			await page.getByLabel("Glass of water", { exact: true }).click();
			await page.getByLabel("Walk 20 minutes", { exact: true }).click();
		},
	},

	// HAB-03 / HAB-04 / HAB-05 — Today
	today: {
		feature: "HAB-03",
		route: "/",
		mockup: "docs/mockups/v3/renders/today/slice_00.png",
	},
	"today-break-resisted": {
		feature: "HAB-04",
		route: "/",
		mockup: "docs/mockups/today-populated.png",
		note: "Break habit ticked: resisted caption on the row, plus the completion toast with Undo.",
		async interact(page) {
			await page
				.getByLabel("No phone after 23:00, resisted today?", { exact: true })
				.click();
		},
	},
	"today-empty": {
		feature: "HAB-05",
		route: "/?fixtures=empty",
		mockup: "docs/mockups/v3/renders/today/slice_01.png",
		note: "T2 — header and + only, the empty state with one primary action. 'Browse suggestions' waits for HAB-46.",
	},
	"today-rest-day": {
		feature: "HAB-05",
		route: "/?fixtures=rest-day",
		mockup: "docs/mockups/v3/renders/today/slice_01.png",
	},

	// HAB-18 — off-schedule log (D1, D2) and retro-log pinning (D4)
	"rest-day-picker": {
		feature: "HAB-18",
		route: "/?fixtures=rest-day-picker",
		mockup: "docs/mockups/hab-18-d1.png",
		note: "Picker over the rest day: Glass of water (Amount ›) and checks; the Break habit is left out.",
		async interact(page) {
			await page.getByText("Log a different habit", { exact: true }).click();
			await page.getByText("Log off-schedule", { exact: true }).waitFor();
			await page.waitForTimeout(400);
		},
	},
	"rest-day-picker-empty": {
		feature: "HAB-18",
		route: "/?fixtures=rest-day-ineligible",
		mockup: null,
		note: "Only a Break habit exists: the picker says nothing is eligible instead of listing nothing.",
		async interact(page) {
			await page.getByText("Log a different habit", { exact: true }).click();
			await page.getByText("Nothing to log here", { exact: true }).waitFor();
			await page.waitForTimeout(400);
		},
	},
	"rest-day-logged": {
		feature: "HAB-18",
		route: "/?fixtures=rest-day-picker",
		mockup: "docs/mockups/hab-18-d2.png",
		note: "Read logged off-schedule: toast with Undo over the rest day, which now lists it. 'Logged 10:42' becomes the real time of day.",
		async interact(page) {
			await page.getByText("Log a different habit", { exact: true }).click();
			await page.getByLabel("Log Read off-schedule").first().click();
			await page.getByText("Logged 'Read' · off-schedule").waitFor();
			await page.waitForTimeout(400);
		},
	},

	// HAB-01 / HAB-02 / HAB-07 — New / Edit habit
	"new-habit": {
		feature: "HAB-01",
		route: "/new-habit",
		mockup: "docs/mockups/new-habit-form.png",
	},
	"new-habit-weekdays": {
		feature: "HAB-02",
		route: "/new-habit",
		mockup: "docs/mockups/new-habit-form.png",
		note: "Specific weekdays chosen — weekday picker revealed.",
		async interact(page) {
			await page.getByText("Specific weekdays", { exact: true }).click();
		},
	},
	"new-habit-quantity": {
		feature: "HAB-07",
		route: "/new-habit",
		mockup: "docs/mockups/new-habit-form.png",
		note: "Target type Quantity — Amount/Unit fields revealed (scrolled into view).",
		async interact(page) {
			const quantity = page.getByText("Quantity", { exact: true });
			await quantity.scrollIntoViewIfNeeded();
			await quantity.click();
		},
	},
	"edit-habit": {
		feature: "HAB-02",
		route: "/edit-habit/1",
		mockup: "docs/mockups/new-habit-form.png",
		note: "Mockup shows create mode; edit mode should match except Direction is locked.",
	},

	// HAB-22 — New habit: empty & near-limit polish
	"new-habit-empty": {
		feature: "HAB-22",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/hab-22-e5.png",
		note: "E5 — focused on open, example placeholder, no counter, Save disabled with the name reason. Mockup still draws V1's Icon & colour picker (removed by HAB-24) and the sheet chrome; the real form keeps Category/Direction/Target type.",
	},
	"new-habit-near-limit": {
		feature: "HAB-22",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/hab-22-e6.png",
		note: "E6 — 31/32: counter shows (from 26), Save enabled once a category is picked, helper gone.",
		async interact(page) {
			await typeHabitName(page, "Read twenty pages before coffee");
			await categoryChip(page, "Learning").click();
		},
	},
	"new-habit-at-limit": {
		feature: "HAB-22",
		route: "/new-habit?fixtures=empty",
		mockup: null,
		note: "A 50-character paste trimmed to 32 — counter amber at 32/32.",
		async interact(page) {
			await typeHabitName(
				page,
				"Read twenty pages before coffee every single morning",
			);
		},
	},
	"new-habit-keyboard-small-phone": {
		feature: "HAB-22",
		route: "/new-habit?fixtures=empty",
		mockup: null,
		viewport: { width: 375, height: 407 },
		note: "iPhone SE (375×667) minus a ~260pt keyboard: what's left above the autofocused keyboard — Save and its reason line must stay visible.",
	},
	"edit-habit-legacy-name": {
		feature: "HAB-22",
		route: "/edit-habit/1?longNames=1",
		mockup: null,
		note: "A V1 40-character name, unchanged: counter shows its real 40/32 (amber), Save stays enabled.",
	},
	"edit-habit-legacy-name-edited": {
		feature: "HAB-22",
		route: "/edit-habit/1?longNames=1",
		mockup: null,
		note: "The V1 name edited but still over 32: Save disabled with the shorten reason.",
		async interact(page) {
			const name = page.getByLabel("Name", { exact: true }).first();
			await name.click();
			await name.press("End");
			await name.press("Backspace");
			await name.blur();
		},
	},

	// HAB-24 — Categories: pick & add (the New habit form's category card + add sheet)
	"category-picker-empty": {
		feature: "HAB-24",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/hab-24-f1a.png",
		note: "F1a — nothing selected: built-ins only, Save blocked with the category reason. Mockup's sheet shows only Name/Category/Frequency; the real form keeps Direction and Target type.",
		async interact(page) {
			await typeHabitName(page, "Write three lines");
		},
	},
	"category-picker-selected": {
		feature: "HAB-24",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/hab-24-f1b.png",
		note: "F1b — Learning picked: filled chip with check, header badge, Save enabled.",
		async interact(page) {
			await typeHabitName(page, "Read 20 pages");
			await categoryChip(page, "Learning").click();
		},
	},
	"category-picker-many": {
		feature: "HAB-24",
		route: "/new-habit?fixtures=many-categories",
		mockup: "docs/mockups/hab-24-f1c.png",
		note: "F1c — eight customs, Music picked, scrolled: hairline above the pinned Save.",
		async interact(page) {
			await typeHabitName(page, "Practice scales");
			await categoryChip(page, "Music").click();
			await page.mouse.move(200, 400);
			await page.mouse.wheel(0, 140);
			await page.waitForTimeout(300);
		},
	},
	"add-category-empty": {
		feature: "HAB-24",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/hab-24-f2a.png",
		note: "F2a — add sheet stacked over the picker: empty name, placeholder preview, Add blocked.",
		async interact(page) {
			await typeHabitName(page, "Write three lines");
			await categoryChip(page, "Add category").click();
		},
	},
	"add-category-typing": {
		feature: "HAB-24",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/hab-24-f2b.png",
		note: "F2b — name typed: live preview on rotation slot 1, Add enabled.",
		async interact(page) {
			await typeHabitName(page, "Write three lines");
			await categoryChip(page, "Add category").click();
			await page.getByPlaceholder("e.g. Journaling").fill("Journaling");
		},
	},
	"add-category-duplicate": {
		feature: "HAB-24",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/hab-24-f2c.png",
		note: "F2c — duplicate of a built-in: amber field + helper, preview hidden, Add blocked.",
		async interact(page) {
			await typeHabitName(page, "Write three lines");
			await categoryChip(page, "Add category").click();
			await page.getByPlaceholder("e.g. Journaling").fill("Fitness");
		},
	},
	"category-picker-new-selected": {
		feature: "HAB-24",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/hab-24-f2d.png",
		note: "F2d — after Add: sheet closed, new chip in its creation-order slot, auto-selected, no toast.",
		async interact(page) {
			await typeHabitName(page, "Write three lines");
			await categoryChip(page, "Add category").click();
			await page.getByPlaceholder("e.g. Journaling").fill("Journaling");
			await page.getByRole("button", { name: "Add category" }).last().click();
			await page.waitForTimeout(500);
		},
	},

	// HAB-25 — Categories: manage & delete (temporarily pushed from Manage habits until Settings, HAB-15)
	"manage-categories-built-in-only": {
		feature: "HAB-25",
		route: "/(habits)/categories?fixtures=categories-built-in-only",
		mockup: "docs/mockups/hab-25-f3a.png",
		note: "F3a — built-ins only: locked tinted chips, counts, Built-in tag, no actions; Yours holds only Add category. Back reads 'Manage' until Settings (HAB-15) exists.",
	},
	"manage-categories-one-custom": {
		feature: "HAB-25",
		route: "/(habits)/categories?fixtures=categories-one-custom",
		mockup: "docs/mockups/hab-25-f3b.png",
		note: "F3b — one custom (Music), not used: outline chip, Rename + red Delete.",
	},
	"manage-categories-in-use": {
		feature: "HAB-25",
		route: "/(habits)/categories?fixtures=categories-in-use",
		mockup: "docs/mockups/hab-25-f3c.png",
		note: "F3c — Music 3 habits (one archived — counts include archived), Language 1, Garden not used; creation order.",
	},
	"delete-category-unused": {
		feature: "HAB-25",
		route: "/(habits)/categories?fixtures=categories-in-use",
		mockup: "docs/mockups/hab-25-f4a.png",
		note: "F4a — plain confirm, no mention of reassignment.",
		async interact(page) {
			await page.getByRole("button", { name: "Delete Garden" }).click();
		},
	},
	"delete-category-in-use": {
		feature: "HAB-25",
		route: "/(habits)/categories?fixtures=categories-in-use",
		mockup: "docs/mockups/hab-25-f4b.png",
		note: "F4b — names the count, Music → Other move preview with every affected habit, 'Delete and move 3 habits'.",
		async interact(page) {
			await page.getByRole("button", { name: "Delete Music" }).click();
		},
	},
	"rename-category-editing": {
		feature: "HAB-25",
		route: "/(habits)/categories?fixtures=categories-in-use",
		mockup: null,
		note: "No mockup — proposed inline rename: the row becomes the add-sheet's name field (counter from 16/20) with Cancel / Save.",
		async interact(page) {
			await page.getByRole("button", { name: "Rename Language" }).click();
			await page.getByLabel("Rename Language").fill("Languages & more");
		},
	},
	"rename-category-duplicate": {
		feature: "HAB-25",
		route: "/(habits)/categories?fixtures=categories-in-use",
		mockup: null,
		note: "No mockup — proposed: renaming to a built-in's name ('health') shows the amber duplicate helper and blocks Save.",
		async interact(page) {
			await page.getByRole("button", { name: "Rename Language" }).click();
			await page.getByLabel("Rename Language").fill("health");
		},
	},

	// HAB-07 / HAB-08 — Sheets over Today
	"quantity-log": {
		feature: "HAB-07",
		route: "/?fixtures=quantity-log",
		mockup: "docs/mockups/quantity-log.png",
		note: "Sheet is opened from the row's count control (a tap on the circle adds one, D6) — the interaction the mockup can't capture from a static route load.",
		async interact(page) {
			await page.getByText("6/8", { exact: true }).click();
		},
	},
	"streak-at-risk": {
		feature: "HAB-08",
		route: "/?fixtures=streak-at-risk",
		mockup: "docs/mockups/streak-at-risk.png",
		note: "Sheet is opened by tapping the at-risk habit's row, same as a real 'open this habit' interaction.",
		async interact(page) {
			await page.getByText("Meditate").click();
		},
	},
	"streak-at-risk-no-freezes": {
		feature: "HAB-33",
		route: "/?fixtures=streak-at-risk-no-freezes",
		mockup: null,
		note: "SR3: the same at-risk habit with the month's pool spent — the one-button sheet ('Got it') says the streak restarts and the longest streak is kept. No mockup draws it in this form.",
		async interact(page) {
			await page.getByText("Meditate").click();
		},
	},
	"habit-detail-no-freezes": {
		feature: "HAB-20",
		route: "/(today)/habit/1?fixtures=no-freezes",
		mockup: "docs/mockups/hab-20-d6.png",
		note: "D6: pool spent, yesterday missed, today done — streak reset to 1. The month's reset note, the legend's '0 freezes left' and the outlined missed day (HAB-20). Supersedes streak-reset-no-freezes.png.",
	},

	// HAB-09 / HAB-10 — Habit detail + retro log
	"habit-detail": {
		feature: "HAB-09",
		route: "/(today)/habit/1?fixtures=habit-detail",
		mockup: "docs/mockups/habit-detail.png",
	},
	"habit-detail-pushed-header": {
		feature: "Header buttons",
		route: "/?fixtures=habit-detail",
		mockup: "docs/mockups/habit-detail.png",
		note: "Pushed from Today, so there's history: the plain '‹ Today' back button (header-buttons.tsx) and Edit. Web can't show the iOS 26 Liquid Glass capsule this guards against — that's device-only; the chevron is an SF Symbol (blank on web).",
		async interact(page) {
			await page.getByText("Glass of water", { exact: true }).click();
			await page.getByText("Last 10 weeks").waitFor();
		},
	},
	"habit-detail-new": {
		feature: "HAB-09",
		route: "/(today)/habit/1?fixtures=habit-detail-new",
		mockup: "docs/mockups/habit-detail-new.png",
	},
	"habit-detail-archived": {
		feature: "HAB-20",
		route: "/(today)/habit/1?fixtures=habit-detail-archived",
		mockup: "docs/mockups/hab-20-d5.png",
		note: "D5: banner with the archive date and Restore, Current '—' paused, 'Before archive' rate, dotted paused cells, 'Paused while archived' on Reminders. The mockup's Edit-habit row isn't built (Edit lives in the header).",
	},
	"habit-detail-restored": {
		feature: "HAB-20",
		route: "/(today)/habit/1?fixtures=habit-detail-archived",
		mockup: "docs/mockups/hab-20-e1.png",
		note: "E1: Restore tapped — banner collapses in place, toast 'Restored 'Cold shower' — back on Today' with Undo, Current 0, paused span in the heatmap range, Reminders back to 07:00 · daily.",
		async interact(page) {
			await page.getByText("Restore", { exact: true }).click();
			await page.getByText("Restored 'Cold shower' — back on Today").waitFor();
		},
	},
	"habit-detail-restore-undone": {
		feature: "HAB-20",
		route: "/(today)/habit/1?fixtures=habit-detail-archived",
		mockup: "docs/mockups/hab-20-d5.png",
		note: "Restore then Undo: must be pixel-identical to habit-detail-archived (same archive date, same paused cells).",
		async interact(page) {
			await page.getByText("Restore", { exact: true }).click();
			await page.getByText("Restored 'Cold shower' — back on Today").waitFor();
			await page.getByText("Undo", { exact: true }).click();
			await page.getByText("Archived on", { exact: false }).waitFor();
		},
	},
	"habit-detail-bonus": {
		feature: "HAB-18",
		route: "/(today)/habit/1?fixtures=habit-detail-bonus",
		mockup: null,
		note: "Glass of water scheduled Mon–Fri only, so the weekend logs in its history draw as NEW-16 bonus dots (no mockup — the dot has none).",
	},
	"retro-log": {
		feature: "HAB-10",
		route: "/(today)/habit/1?fixtures=retro-log",
		mockup: "docs/mockups/hab-18-d4.png",
		note: "Origin habit pinned first in the ringed card (HAB-18 D4), the rest under 'Also on <weekday>'. Sheet is opened by tapping the heatmap cell 3 days ago (RETRO_LOG_DAYS_AGO in entry-fixtures.ts).",
		async interact(page, { clock }) {
			await page.getByLabel(heatmapCellLabel(clock, 3, "logged")).click();
		},
	},

	"edit-habit-focus-frequency": {
		feature: "HAB-16",
		route: "/edit-habit/1?focus=frequency",
		mockup: null,
		note: "Opened from an insight's 'Reschedule habit →': scrolled so Frequency is at the top.",
	},

	// HAB-12 — Reminders
	reminders: {
		feature: "HAB-12",
		route: "/(today)/reminders/1?fixtures=reminders",
		mockup: "docs/mockups/hab-21-e4.png",
		note: "Cards start collapsed except a conflicting one (21:00); the other two are tapped open to match the mockup. Permission reads as denied in this scenario.",
		async interact(page) {
			await page.getByLabel("Reminder at 07:20, Weekdays").click();
			await page.getByLabel("Reminder at 13:00, Mon, Wed, Fri").click();
		},
	},
	"reminders-dark": {
		feature: "HAB-21",
		route: "/(today)/reminders/1?fixtures=reminders",
		mockup: "docs/mockups/hab-21-e4.png",
		colorScheme: "dark",
		note: "E4 dark column.",
		async interact(page) {
			await page.getByLabel("Reminder at 07:20, Weekdays").click();
			await page.getByLabel("Reminder at 13:00, Mon, Wed, Fri").click();
		},
	},
	"reminders-at-cap-dark": {
		feature: "HAB-21",
		route: "/(today)/reminders/1?fixtures=reminders-at-cap&theme=dark",
		mockup: null,
		colorScheme: "dark",
		note: "At the cap in dark: cap message, then the pointer.",
	},
	"reminders-at-cap": {
		feature: "HAB-12",
		route: "/(today)/reminders/1?fixtures=reminders-at-cap",
		mockup: "docs/mockups/reminders-at-cap.png",
		note: "Cap message replaces the 'Up to four times' caption; the HAB-21 pointer still follows. The mockup predates HAB-21 and still draws the Evening review row.",
	},
	"reminders-empty": {
		feature: "HAB-12",
		route: "/(today)/reminders/1",
		mockup: "docs/mockups/hab-21-e4.png",
		note: "A habit with no reminders yet — caption and HAB-21 pointer only.",
	},
	"reminder-time-sheet": {
		feature: "HAB-12",
		route: "/(today)/reminders/1?fixtures=reminders",
		mockup: null,
		note: "Time sheet for the 21:00 reminder. Web shows a static read-out where iOS has the SwiftUI wheel.",
		async interact(page) {
			await page.getByText("Change time", { exact: true }).click();
		},
	},

	// HAB-39 — the Habits tab (V3-4a): H1–H6, H9, H10. Clock = the mockup's Friday 23 October.
	"habits-tab": {
		feature: "HAB-39",
		route: "/(habits)/manage?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_01.png",
		clock: V3_FRIDAY,
		note: "H1 — populated: seven active habits by category in the stored order, Archived collapsed, Categories. The chevrons and tab icons are SF Symbols (blank on web).",
	},
	"habits-search": {
		feature: "HAB-39",
		route: "/(habits)/manage?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_01.png",
		clock: V3_FRIDAY,
		note: "H2 — 'in' matches active and archived habits, split by status; the archived result has Restore.",
		async interact(page) {
			await page.getByLabel("Search habits").fill("in");
			await page.waitForTimeout(300);
		},
	},
	"habits-search-none": {
		feature: "HAB-39",
		route: "/(habits)/manage?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_02.png",
		clock: V3_FRIDAY,
		note: "H3 — nothing matches 'yoga': says what was searched and offers to add it.",
		async interact(page) {
			await page.getByLabel("Search habits").fill("yoga");
			await page.waitForTimeout(300);
		},
	},
	"habits-reorder": {
		feature: "HAB-39",
		route: "/(habits)/manage?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_02.png",
		clock: V3_FRIDAY,
		note: "H4 — Reorder mode: grips and Done, the hint, no search, Archived or Categories.",
		async interact(page) {
			await page.getByRole("button", { name: "Reorder habits" }).click();
			await page.waitForTimeout(300);
		},
	},
	"habits-reorder-lifted": {
		feature: "HAB-39",
		route: "/(habits)/manage?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_02.png",
		clock: V3_FRIDAY,
		note: "H4 — Cold shower's grip held mid-drag, not yet released: the E2 lift, inside its own category.",
		async interact(page) {
			await page.getByRole("button", { name: "Reorder habits" }).click();
			await page.waitForTimeout(300);
			await drag(page, page.getByLabel("Reorder Cold shower"), {
				dy: -20,
				release: false,
			});
		},
	},
	"habits-archived": {
		feature: "HAB-39",
		route: "/(habits)/manage?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_03.png",
		clock: V3_FRIDAY,
		note: "H5 — Archived opened in place, Journal 5 min restored: its toast names it and offers Undo; Morning run is still archived. The copy explains the fresh streak and the paused days.",
		async interact(page) {
			await page
				.getByRole("button", { name: /^Archived, 2, collapsed/ })
				.click();
			await page.getByRole("button", { name: "Restore Journal 5 min" }).click();
			await page.getByText("Journal 5 min is back on Today").waitFor();
			await page.mouse.move(200, 400);
			await page.mouse.wheel(0, 4000);
			await page.waitForTimeout(600);
		},
	},
	"habits-empty": {
		feature: "HAB-39",
		route: "/(habits)/manage?fixtures=empty",
		mockup: "docs/mockups/v3/renders/habits/slice_03.png",
		clock: V3_FRIDAY,
		note: "H6 — no habits: the empty state with Add habit, Categories still reachable. The suggestions link stays hidden until HAB-46.",
	},
	"habits-all-archived": {
		feature: "HAB-39",
		route: "/(habits)/manage?fixtures=manage-all-archived",
		mockup: null,
		note: "Every habit archived: 'No active habits' with Add habit, Archived below. No frame draws this; the spec's H6 is the no-habits case.",
	},
	"habits-ax": {
		feature: "HAB-49",
		route: "/(habits)/manage?fixtures=habits-v3&textSize=ax",
		mockup: "docs/mockups/v3/renders/habits/slice_04.png",
		clock: V3_FRIDAY,
		note: "H7 — AX3: the header's buttons above the title, rows stacked (badge, name and status, chevron), bar A.",
	},
	"habits-ax-toast": {
		feature: "HAB-49",
		route: "/(habits)/manage?fixtures=habits-v3&textSize=ax",
		mockup: "docs/mockups/v3/renders/habits/slice_05.png",
		clock: V3_FRIDAY,
		note: "H10 — AX3 falls back to bar A and the Restore toast goes back to 16 pt above it.",
		async interact(page) {
			await page
				.getByRole("button", { name: /^Archived, 2, collapsed/ })
				.click();
			await page.getByRole("button", { name: "Restore Journal 5 min" }).click();
			await page.getByText("Journal 5 min is back on Today").waitFor();
		},
	},
	"delete-confirm": {
		feature: "HAB-23",
		route: "/(today)/habit/1?fixtures=habit-detail",
		mockup: "docs/mockups/hab-23-e7.png",
		note: "E7 light (NEW-33 · with archive action): the whole 'Archive instead' card is the button (chevron is an SF Symbol, blank on web); no separate archive button. Opened from 'Delete habit' on Habit Detail — E7's 'from Edit habit' label isn't built (docs/backlog.md).",
		async interact(page) {
			await page.getByText("Delete habit").click();
		},
	},
	"delete-confirm-dark": {
		feature: "HAB-23",
		route: "/(today)/habit/1?fixtures=habit-detail",
		mockup: "docs/mockups/hab-23-e7.png",
		colorScheme: "dark",
		note: "E7 dark half: OS emulated dark, Appearance on System.",
		async interact(page) {
			await page.getByText("Delete habit").click();
		},
	},
	"delete-confirm-archived": {
		feature: "HAB-23",
		route: "/(today)/habit/1?fixtures=habit-detail-archived",
		mockup: null,
		note: "Already-archived habit: NEW-33 plain state — no archive card, just Keep habit and Delete permanently. No mockup draws this.",
		async interact(page) {
			await page.getByText("Delete habit").click();
		},
	},

	// HAB-15 — Settings & local data export (B1–B6)
	settings: {
		feature: "HAB-15",
		route: "/(habits)/settings?fixtures=settings&theme=light",
		mockup: "docs/mockups/hab-15-b1.png",
		note: "B1 light — Light picked, Evening review on, never exported. Adds a plain Categories row (no mockup — proposal, HAB-25's expected home). Chevrons are SF Symbols (blank on web).",
	},
	"settings-dark": {
		feature: "HAB-15",
		route: "/(habits)/settings?fixtures=settings&theme=dark",
		mockup: "docs/mockups/hab-15-b1.png",
		colorScheme: "dark",
		note: "B1 dark column — Dark picked (OS emulated dark).",
	},
	"settings-explicit-over-os": {
		feature: "HAB-15",
		route: "/(habits)/settings?fixtures=settings&theme=dark",
		mockup: null,
		colorScheme: "light",
		note: "Explicit Dark while the emulated OS is light: the app must draw dark.",
	},
	"settings-system-notifications-off": {
		feature: "HAB-15",
		route: "/(habits)/settings?fixtures=settings-notifications-off",
		mockup: "docs/mockups/hab-15-b2.png",
		note: "B2 — System (resolves light), Evening review on but iOS notifications off: neutral notice with 'Open iOS Settings →'; Last export 2 August.",
	},
	"settings-system-dark": {
		feature: "HAB-15",
		route: "/(habits)/settings?fixtures=settings-notifications-off",
		mockup: "docs/mockups/hab-15-b2.png",
		colorScheme: "dark",
		note: "B2 dark — System follows the emulated dark OS; caption says 'currently dark'.",
	},
	"export-confirm": {
		feature: "HAB-15",
		route: "/(habits)/settings?fixtures=settings&theme=light",
		mockup: "docs/mockups/hab-15-b3.png",
		note: "B3 — confirm sheet: counts, range, CSV/JSON, archived toggle, 'Export N entries'. Fixture data differs from the mockup's numbers.",
		async interact(page) {
			await page.getByText("Export all data", { exact: true }).click();
			await page.getByText("Export your data").waitFor();
		},
	},
	"export-confirm-archived-off": {
		feature: "HAB-15",
		route: "/(habits)/settings?fixtures=settings&theme=light",
		mockup: "docs/mockups/hab-15-b3.png",
		note: "B3 with 'Include archived habits' off — counts and the button shrink.",
		async interact(page) {
			await page.getByText("Export all data", { exact: true }).click();
			await page.getByText("Export your data").waitFor();
			await page.getByLabel("Include archived habits").click();
		},
	},
	"export-progress": {
		feature: "HAB-15",
		route: "/(habits)/settings?fixtures=settings&theme=light",
		mockup: "docs/mockups/hab-15-b4.png",
		note: "B4 — determinate progress. The page slows setTimeout(0) so the ~1s export is still running when captured.",
		async interact(page) {
			await page.getByText("Export all data", { exact: true }).click();
			await page.evaluate(() => {
				const original = window.setTimeout;
				window.setTimeout = (fn, ms, ...args) =>
					original(fn, ms === 0 ? 900 : ms, ...args);
			});
			await page.getByText(/^Export \d+ entr/).click();
			await page.getByText("Exporting…").waitFor();
			await page.waitForTimeout(1200);
		},
	},
	"export-ready": {
		feature: "HAB-15",
		route: "/(habits)/settings?fixtures=settings&theme=light",
		mockup: "docs/mockups/hab-15-b5.png",
		note: "B5 — Export ready: file card, Share file…, Save to Files, Done.",
		async interact(page) {
			await page.getByText("Export all data", { exact: true }).click();
			await page.getByText(/^Export \d+ entr/).click();
			await page.getByText("Export ready").waitFor();
		},
	},
	"export-failed": {
		feature: "HAB-15",
		route: "/(habits)/settings?fixtures=export-fails&theme=light",
		mockup: "docs/mockups/hab-15-b6.png",
		note: "B6 — failed on storage: reason, what's needed, 'nothing was changed', Try again / Close.",
		async interact(page) {
			await page.getByText("Export all data", { exact: true }).click();
			await page.getByText(/^Export \d+ entr/).click();
			await page.getByText("Export didn't finish").waitFor();
		},
	},
	"export-ready-dark": {
		feature: "HAB-15",
		route: "/(habits)/settings?fixtures=settings&theme=dark",
		mockup: "docs/mockups/hab-15-b5.png",
		colorScheme: "dark",
		note: "B5 dark column.",
		async interact(page) {
			await page.getByText("Export all data", { exact: true }).click();
			await page.getByText(/^Export \d+ entr/).click();
			await page.getByText("Export ready").waitFor();
		},
	},

	// Audit B6 — failure states. Reached only through the web fixtures
	// (`?fixtures=migration-fails`, `?failWrites=1`), never a route or button in
	// the app.
	"error-screen-migration-failed": {
		feature: "B6",
		route: "/?fixtures=migration-fails",
		mockup: null,
		note: "A failed database migration: plain-words title, 'Try again', 'Copy diagnostics'. No raw error text.",
	},
	"error-screen-migration-failed-dark": {
		feature: "B6",
		route: "/?fixtures=migration-fails",
		mockup: null,
		colorScheme: "dark",
		note: "Same, dark.",
	},
	"error-toast-today": {
		feature: "B6",
		route: "/?failWrites=1",
		mockup: null,
		note: "A failed tick on Today: error toast (toast pill with a danger dot), the row stays unchecked, no Undo.",
		async interact(page) {
			await page.getByLabel("Evening walk, not done").first().click();
			await page.getByText("Couldn't update this habit. Try again.").waitFor();
		},
	},
	"error-toast-today-dark": {
		feature: "B6",
		route: "/?failWrites=1",
		mockup: null,
		colorScheme: "dark",
		note: "Same, dark.",
		async interact(page) {
			await page.getByLabel("Evening walk, not done").first().click();
			await page.getByText("Couldn't update this habit. Try again.").waitFor();
		},
	},
	"error-toast-in-sheet": {
		feature: "B6",
		route: "/?fixtures=quantity-log&failWrites=1",
		mockup: null,
		note: "A failed quantity save: the sheet stays open and the toast shows at the top of the screen, above the sheet (a Modal covers the page-level host).",
		async interact(page) {
			await page.getByText("6/8", { exact: true }).click();
			await page.getByLabel("Increase glasses").click();
			await page.getByText("Couldn't save that amount. Try again.").waitFor();
		},
	},
	"new-habit-save-failed": {
		feature: "B6",
		route: "/new-habit?fixtures=empty&failWrites=1",
		mockup: null,
		note: "A failed Save in the New habit modal (no ToastHost there): inline error banner above Save, the form untouched.",
		async interact(page) {
			await typeHabitName(page, "Read 20 pages");
			await categoryChip(page, "Learning").click();
			await page.getByText("Save habit", { exact: true }).click();
			await page.getByText("Couldn't save this habit. Try again.").waitFor();
		},
	},
	"new-habit-save-failed-dark": {
		feature: "B6",
		route: "/new-habit?fixtures=empty&failWrites=1",
		mockup: null,
		colorScheme: "dark",
		note: "Same, dark.",
		async interact(page) {
			await typeHabitName(page, "Read 20 pages");
			await categoryChip(page, "Learning").click();
			await page.getByText("Save habit", { exact: true }).click();
			await page.getByText("Couldn't save this habit. Try again.").waitFor();
		},
	},
	"settings-about": {
		feature: "B6",
		route: "/(habits)/settings?fixtures=settings&theme=light",
		mockup: null,
		note: "Settings scrolled to the About group: version (build), database schema, 'Copy diagnostics'.",
		async interact(page) {
			await page.getByText("Copy diagnostics").scrollIntoViewIfNeeded();
			await page.mouse.wheel(0, 400);
		},
	},
	"settings-about-dark": {
		feature: "B6",
		route: "/(habits)/settings?fixtures=settings&theme=dark",
		mockup: null,
		colorScheme: "dark",
		note: "Same, dark.",
		async interact(page) {
			await page.getByText("Copy diagnostics").scrollIntoViewIfNeeded();
			await page.mouse.wheel(0, 400);
		},
	},
	// HAB-27 — the navigation shell: the floating pill (V3-01 B) and the
	// layout rules that come with it. The pill is in every other baseline
	// too; these are the frames the spec draws it in.
	"tab-bar-today": {
		feature: "HAB-27",
		route: "/",
		mockup: "docs/mockups/v3/renders/today/slice_00.png",
		note: "T1 — Today with the pill: Today active (filled capsule, ink, 600), Progress and Habits in sub.",
	},
	"tab-bar-long-list-end": {
		feature: "HAB-27",
		route: "/?fixtures=manage-archive",
		mockup: "docs/mockups/v3/renders/today/slice_05.png",
		viewport: { width: 393, height: 640 },
		note: "T13 — a long Today scrolled to the end: content stops 34 pt above the pill (112 pt bottom padding, T-25). The dev-build seed buttons are the real tail of the list here.",
		async interact(page) {
			await page.mouse.wheel(0, 4000);
			await page.waitForTimeout(400);
		},
	},
	"tab-bar-toast": {
		feature: "HAB-27",
		route: "/",
		mockup: "docs/mockups/v3/renders/today/slice_06.png",
		note: "T14 — the Undo toast 12 pt above the pill (T-21). Glass of water is a quantity habit, so a check habit is ticked instead.",
		async interact(page) {
			await page
				.getByLabel("No phone after 23:00, resisted today?", { exact: true })
				.click();
		},
	},
	"tab-bar-sheet-over-pill": {
		feature: "HAB-27",
		route: "/?fixtures=quantity-log",
		mockup: "docs/mockups/v3/renders/habits/slice_04.png",
		note: "H8 — a sheet covers the pill and the scrim dims it; the pill is inert until it closes.",
		async interact(page) {
			await page
				.getByLabel(/^Amount, \d+ of \d+/)
				.first()
				.click();
			await page.waitForTimeout(400);
		},
	},
	"tab-bar-ax-bar-a": {
		feature: "HAB-27",
		route: "/?textSize=ax",
		mockup: "docs/mockups/v3/renders/habits/slice_05.png",
		note: "H10 — at accessibility text sizes the pill gives way to the full-width bar A. `?textSize=ax` stands in for Dynamic Type, which react-native-web never reports.",
	},
	"tab-bar-progress": {
		feature: "HAB-27",
		route: "/(progress)/progress?fixtures=weekly-summary",
		mockup: "docs/mockups/v3/renders/progress/slice_00.png",
		note: "P1 — the Progress tab root with the pill, Progress active.",
	},

	// HAB-35–38 — Progress (V3-3b): P1–P17, the habit picker HP1/HP2, Edit this day RL1/RL2
	"progress-week": {
		feature: "HAB-35",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/progress/slice_00.png",
		clock: V3_FRIDAY,
		note: "P1 — Week, populated: three tiles, the slipping insight with its pager dots, the matrix (partial water, bonus Upper body Monday, frozen Meditate Tuesday, Cold shower open days, the Break habit's resisted days) and the legend.",
	},
	"progress-week-too-early": {
		feature: "HAB-35",
		route: `${PROGRESS}progress-v3-too-early`,
		mockup: "docs/mockups/v3/renders/progress/slice_01.png",
		clock: V3_FRIDAY,
		note: "P2 — three days of logs: the unlock card replaces tiles and insights; the matrix stays, Mon–Tue dashed.",
	},
	"progress-week-no-habits": {
		feature: "HAB-35",
		route: `${PROGRESS}empty`,
		mockup: "docs/mockups/v3/renders/progress/slice_01.png",
		clock: V3_FRIDAY,
		note: "P3 — no habits: the empty state with Add habit; Export reads disabled.",
	},
	"progress-week-nothing-logged": {
		feature: "HAB-35",
		route: `${PROGRESS}progress-v3-nothing-logged`,
		mockup: "docs/mockups/v3/renders/progress/slice_02.png",
		clock: V3_FRIDAY,
		note: "P4 — habits, nothing logged: outlined cells (not missed) and a link to Today.",
	},
	"progress-week-one-habit": {
		feature: "HAB-35",
		route: `${PROGRESS}progress-v3-one-habit`,
		mockup: "docs/mockups/v3/renders/progress/slice_02.png",
		clock: V3_FRIDAY,
		note: "P5 — one habit: stats for it, and the matrix becomes one card of seven 40 pt days.",
	},
	"progress-week-ax": {
		feature: "HAB-35",
		route: `${PROGRESS}progress-v3&textSize=ax`,
		mockup: "docs/mockups/v3/renders/progress/slice_03.png",
		clock: V3_FRIDAY,
		note: "P6 — Week at AX3, scrolled: only the compact bar with the collapsed range ('Week ⌄') is pinned; the matrix is one block per habit.",
		async interact(page) {
			await scrollProgress(page, 700);
		},
	},
	"progress-month": {
		feature: "HAB-36",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/progress/slice_03.png",
		clock: V3_FRIDAY,
		note: "P7 — Month, populated: calendar with notched partial days, frozen 7 Oct and 20 Oct, today ringed, future hairline.",
		async interact(page) {
			await showRange(page, "Month");
		},
	},
	"progress-month-rates": {
		feature: "HAB-36",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/progress/slice_04.png",
		clock: V3_FRIDAY,
		note: "P8 — Month scrolled to the per-habit rates: ranked, slipping last on the amber bar, the Break habit tagged, frozen days and bonus logs named.",
		async interact(page) {
			await showRange(page, "Month");
			await scrollProgress(page, 760);
		},
	},
	"progress-month-too-early": {
		feature: "HAB-36",
		route: `${PROGRESS}progress-v3-too-early`,
		mockup: "docs/mockups/v3/renders/progress/slice_04.png",
		clock: V3_FRIDAY,
		note: "P9 — Month too early: the unlock card; the calendar shows the 3 logged days, earlier days dashed.",
		async interact(page) {
			await showRange(page, "Month");
		},
	},
	"progress-month-one-habit": {
		feature: "HAB-36",
		route: `${PROGRESS}progress-v3-one-habit`,
		mockup: "docs/mockups/v3/renders/progress/slice_05.png",
		clock: V3_FRIDAY,
		note: "P10 — Month, one habit: a binary calendar (14–15 Oct missed, 7 and 20 Oct frozen).",
		async interact(page) {
			await showRange(page, "Month");
		},
	},
	"progress-month-ax": {
		feature: "HAB-36",
		route: `${PROGRESS}progress-v3&textSize=ax`,
		mockup: "docs/mockups/v3/renders/progress/slice_05.png",
		clock: V3_FRIDAY,
		note: "P11 — Month at AX3: the range is a stacked list with a check, the tiles go 1-up.",
		async interact(page) {
			await page.getByTestId("segmented-collapsed").click();
			await page.getByRole("tab", { name: "Month" }).click();
			await page.waitForTimeout(400);
			await page.getByTestId("segmented-collapsed").click();
			await page.waitForTimeout(400);
		},
	},
	"progress-year": {
		feature: "HAB-37",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/progress/slice_06.png",
		clock: V3_FRIDAY,
		note: "P12 — Year, populated: three 4-month bands, month labels, Less → More legend, best-month insight, the habit chip.",
		async interact(page) {
			await showRange(page, "Year");
		},
	},
	"progress-month-day": {
		feature: "HAB-36",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/progress/slice_06.png",
		clock: V3_FRIDAY,
		note: "P13 — opened from Year › Jul: Month for July with Back to Year, 14 July ringed and its detail card with Edit this day.",
		async interact(page) {
			await openJuly14(page);
		},
	},
	"progress-year-too-early": {
		feature: "HAB-37",
		route: `${PROGRESS}progress-v3-too-early`,
		mockup: "docs/mockups/v3/renders/progress/slice_07.png",
		clock: V3_FRIDAY,
		note: "P14 — Year too early: the unlock card and only the current band.",
		async interact(page) {
			await showRange(page, "Year");
		},
	},
	"progress-year-one-habit": {
		feature: "HAB-37",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/progress/slice_08.png",
		clock: V3_FRIDAY,
		note: "P15 — Year filtered to Meditate through the chip: binary cells, frozen days violet.",
		async interact(page) {
			await showRange(page, "Year");
			await page.getByTestId("habit-filter-chip").click();
			await page.getByText("Meditate", { exact: true }).click();
			await page.waitForTimeout(500);
		},
	},
	"progress-year-ax": {
		feature: "HAB-37",
		route: `${PROGRESS}progress-v3&textSize=ax`,
		mockup: "docs/mockups/v3/renders/progress/slice_08.png",
		clock: V3_FRIDAY,
		note: "P16 — Year at AX3, scrolled: a month list with bars and whole-number %, 'Year ⌄' pinned.",
		async interact(page) {
			await page.getByTestId("segmented-collapsed").click();
			await page.getByRole("tab", { name: "Year" }).click();
			await page.waitForTimeout(500);
			await scrollProgress(page, 700);
		},
	},
	"progress-month-end": {
		feature: "HAB-27",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/progress/slice_09.png",
		clock: V3_FRIDAY,
		viewport: { width: 393, height: 640 },
		note: "P17 — Month scrolled to the end: the last card stops above the pill, the compact bar with the range pinned.",
		async interact(page) {
			await showRange(page, "Month");
			await scrollProgress(page, "end");
		},
	},
	"progress-habit-picker": {
		feature: "HAB-34",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/sheets/slice_09.png",
		clock: V3_FRIDAY,
		note: "HP1 — Show habit: All habits first, then the active habits, then the archived one.",
		async interact(page) {
			await showRange(page, "Year");
			await page.getByTestId("habit-filter-chip").click();
			await page.waitForTimeout(500);
		},
	},
	"progress-habit-picker-one": {
		feature: "HAB-34",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/sheets/slice_09.png",
		clock: V3_FRIDAY,
		note: "HP2 — Meditate chosen: the picker reopened with the check on Meditate.",
		async interact(page) {
			await showRange(page, "Year");
			await page.getByTestId("habit-filter-chip").click();
			await page.getByText("Meditate", { exact: true }).click();
			await page.waitForTimeout(500);
			await page.getByTestId("habit-filter-chip").click();
			await page.waitForTimeout(500);
		},
	},
	"progress-month-edit-day": {
		feature: "HAB-34",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/sheets/slice_07.png",
		clock: V3_FRIDAY,
		note: "RL1 — Month › a day › Edit this day: every habit due that day with its circle; no note field from Progress.",
		async interact(page) {
			await showRange(page, "Month");
			await page
				.getByRole("button", { name: /^Wednesday 14 October,/ })
				.click();
			await page.getByRole("button", { name: "Edit this day" }).click();
			await page.waitForTimeout(600);
		},
	},
	"progress-week-edit-day": {
		feature: "HAB-34",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/sheets/slice_08.png",
		clock: V3_FRIDAY,
		note: "RL2 — Week › a day header › Edit this day (Wednesday 21 Oct).",
		async interact(page) {
			await page
				.getByRole("button", { name: "Wednesday 21 October. Edit this day" })
				.click();
			await page.waitForTimeout(600);
		},
	},
	"tab-bar-habits-end": {
		feature: "HAB-27",
		route: "/(habits)/manage?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_05.png",
		clock: V3_FRIDAY,
		viewport: { width: 393, height: 640 },
		note: "H9 — the Habits tab scrolled to the end with Archived open: Categories, the last row, stops above the pill, and the restore toast sits 12 pt above it.",
		async interact(page) {
			await page
				.getByRole("button", { name: /^Archived, 2, collapsed/ })
				.click();
			await page.getByRole("button", { name: "Restore Journal 5 min" }).click();
			await page.getByText("Journal 5 min is back on Today").waitFor();
			await page.mouse.move(200, 300);
			await page.mouse.wheel(0, 4000);
			await page.waitForTimeout(600);
		},
	},

	// V3-2b — Today UI (HAB-30–34). Clock = the mockup's Friday 23 October.
	"today-v3": {
		feature: "HAB-30",
		route: "/?fixtures=today-v3",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/today/slice_00.png",
		note: "T1 — populated: week strip, one progress bar, category cards with per-group counts, the dashed fold row.",
	},
	"today-v3-quantity-plus-one": {
		feature: "HAB-31",
		route: "/?fixtures=today-v3",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/today/slice_02.png",
		note: "T4 — a tap on the quantity circle adds one: pie fill, '6 of 8 glasses', toast with Undo.",
		async interact(page) {
			await page.getByLabel("Add one, Drink water, 5 of 8").click();
			await page.getByText("Drink water +1 · 6 of 8 glasses").waitFor();
			await page.waitForTimeout(300);
		},
	},
	"today-v3-scrolled": {
		feature: "HAB-27",
		route: "/?fixtures=today-v3",
		clock: V3_FRIDAY,
		viewport: { width: 393, height: 640 },
		mockup: "docs/mockups/v3/renders/today/slice_02.png",
		note: "T5 — the large title has collapsed into the solid inline bar; a Break habit is resisted (toast).",
		async interact(page) {
			await page.getByLabel("No social media, resisted today?").click();
			await page.getByText("Resisted 'No social media'").waitFor();
			await page.mouse.wheel(0, 260);
			await page.waitForTimeout(400);
		},
	},
	"today-v3-collapsing": {
		feature: "HAB-27",
		route: "/?fixtures=today-v3",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/today/slice_02.png",
		note: "T5 mid-collapse — halfway through the range (16 of 32 pt): the large title is shrunk and faded, the bar's name has not arrived and its background and hairline are still clear; the week strip has not moved off the days.",
		async interact(page) {
			await page.mouse.wheel(0, 16);
			await page.waitForTimeout(500);
		},
	},
	"today-v3-past-day-scrolled": {
		feature: "HAB-30",
		route: "/?fixtures=today-v3",
		clock: V3_FRIDAY,
		viewport: { width: 393, height: 640 },
		mockup: "docs/mockups/v3/renders/today/slice_04.png",
		note: "T10 + T5 — Wed 21 selected, then the list scrolled past the title: the inline bar is solid over the 'Logging for Wed 21 Oct' bar, which scrolls with the content.",
		async interact(page) {
			await page.getByLabel("Wednesday 21", { exact: true }).click();
			await page.getByText("Logging for Wed 21 Oct").waitFor();
			await page.waitForTimeout(300);
			await page.mouse.wheel(0, 120);
			await page.waitForTimeout(500);
		},
	},
	"today-v3-at-risk": {
		feature: "HAB-33",
		route: "/?fixtures=today-v3-at-risk",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/today/slice_03.png",
		note: "T6 — Meditate at risk: amber dot on the circle, 'Missed Thursday · 2 freezes left' in amber.",
	},
	"today-v3-frozen": {
		feature: "HAB-33",
		route: "/?fixtures=today-v3-at-risk",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/today/slice_03.png",
		note: "T7 — after Use a freeze: 'Thu frozen · streak kept at 13' in violet, toast with Undo.",
		async interact(page) {
			await page.getByText("Meditate", { exact: true }).click();
			await page.getByText("Use a freeze", { exact: true }).click();
			await page.getByText(/^Freeze used for Thu 22/).waitFor();
			await page.waitForTimeout(400);
		},
	},
	"today-v3-all-done": {
		feature: "HAB-31",
		route: "/?fixtures=today-v3-all-done",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/today/slice_04.png",
		note: "T8 — everything done: the quiet card with the drawn check; no confetti.",
		async interact(page) {
			await page.waitForTimeout(900);
		},
	},
	"today-v3-rest": {
		feature: "HAB-32",
		route: "/?fixtures=today-v3-rest",
		clock: V3_SATURDAY,
		mockup: "docs/mockups/v3/renders/today/slice_01.png",
		note: "T3 — rest day: why nothing is due, not-due habits on dashed circles, Cold shower 'back Monday'.",
	},
	"today-v3-past-day": {
		feature: "HAB-30",
		route: "/?fixtures=today-v3",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/today/slice_04.png",
		note: "T10 — Wed 21 selected: eyebrow shows the date, 'Logging for Wed 21 Oct · Show today'.",
		async interact(page) {
			await page.getByLabel("Wednesday 21", { exact: true }).click();
			await page.getByText("Logging for Wed 21 Oct").waitFor();
			await page.waitForTimeout(300);
		},
	},
	"today-v3-ax": {
		feature: "HAB-49",
		route: "/?fixtures=today-v3&textSize=ax",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/sheets/slice_00.png",
		note: "QS0 — at AX sizes the row stacks: name, then the count button and circle on their own line, each 44 pt; the strip collapses to 'Friday 23 · Change day'.",
	},
	"quantity-sheet-stepper": {
		feature: "HAB-34",
		route: "/?fixtures=today-v3",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/sheets/slice_00.png",
		note: "QS1 — stepper, +1/+2/+3, Fill to 8, Set exact value.",
		async interact(page) {
			await page.getByLabel("Amount, 5 of 8").click();
			await page.getByLabel("Increase glasses").waitFor();
			await page.waitForTimeout(400);
		},
	},
	"quantity-sheet-exact": {
		feature: "HAB-34",
		route: "/?fixtures=today-v3",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/sheets/slice_01.png",
		note: "QS2 — Set exact value: number field, helper, 'Set to 6'.",
		async interact(page) {
			await page.getByLabel("Amount, 5 of 8").click();
			await page.getByText("Set exact value", { exact: true }).click();
			await page.getByLabel("glasses today").fill("6");
			await page.waitForTimeout(300);
		},
	},
	"quantity-sheet-at-target": {
		feature: "HAB-34",
		route: "/?fixtures=today-v3",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/sheets/slice_01.png",
		note: "QS3 — at target: Fill disabled, 'of 8 glasses · done', extra amounts still count, Done.",
		async interact(page) {
			await page.getByLabel("Amount, 5 of 8").click();
			await page.getByText("Fill to 8", { exact: true }).click();
			await page.getByText("of 8 glasses · done").waitFor();
			await page.waitForTimeout(300);
		},
	},
	"edit-day-toast": {
		feature: "HAB-34",
		route: "/(today)/habit/1?fixtures=retro-log",
		mockup: "docs/mockups/v3/renders/sheets/slice_02.png",
		note: "RL2 — a tap saves at once; the toast sits inside the sheet above Done, names the date and offers Undo.",
		async interact(page, { clock }) {
			await page.getByLabel(heatmapCellLabel(clock, 3, "logged")).click();
			const circle = page.getByRole("button", { name: "Mobility, not done" });
			await circle.scrollIntoViewIfNeeded();
			await circle.click();
			await page.getByText(/logged for/).waitFor();
			await page.waitForTimeout(300);
		},
	},
};

const DARK_TWINS = [
	"today",
	"today-v3",
	"today-v3-quantity-plus-one",
	"today-v3-scrolled",
	"today-v3-collapsing",
	"today-v3-past-day-scrolled",
	"today-v3-at-risk",
	"today-v3-frozen",
	"today-v3-all-done",
	"today-v3-rest",
	"today-v3-past-day",
	"today-v3-ax",
	"quantity-sheet-stepper",
	"quantity-sheet-exact",
	"quantity-sheet-at-target",
	"edit-day-toast",
	"quantity-log",
	"streak-at-risk",
	"streak-at-risk-no-freezes",
	"rest-day-picker",
	"today-empty",
	"retro-log",
	"habit-detail",
	"habit-detail-archived",
	"habit-detail-restored",
	"category-picker-selected",
	"add-category-empty",
	"manage-categories-in-use",
	"new-habit-near-limit",
	"tab-bar-today",
	"tab-bar-long-list-end",
	"tab-bar-toast",
	"tab-bar-sheet-over-pill",
	"tab-bar-ax-bar-a",
	"tab-bar-progress",
	"tab-bar-habits-end",
	"habits-tab",
	"habits-search",
	"habits-search-none",
	"habits-reorder",
	"habits-reorder-lifted",
	"habits-archived",
	"habits-empty",
	"habits-ax",
	"progress-week",
	"progress-week-too-early",
	"progress-week-no-habits",
	"progress-week-nothing-logged",
	"progress-week-one-habit",
	"progress-week-ax",
	"progress-month",
	"progress-month-rates",
	"progress-month-too-early",
	"progress-month-one-habit",
	"progress-month-ax",
	"progress-year",
	"progress-month-day",
	"progress-year-too-early",
	"progress-year-one-habit",
	"progress-year-ax",
	"progress-month-end",
	"progress-habit-picker",
	"progress-habit-picker-one",
	"progress-month-edit-day",
	"progress-week-edit-day",
];
for (const name of DARK_TWINS) {
	const light = SCREENS[name];
	SCREENS[`${name}-dark`] = {
		...light,
		mockup: null,
		colorScheme: "dark",
		note: `Dark twin of ${name} (HAB-15): OS emulated dark, Appearance on System.`,
	};
}

/**
 * HAB-22: every screen that renders a habit name, re-run with `longNames=1`
 * (src/modules/habits/dev/habit-fixtures.ts) — the first two habits get a 40-character V1 name (over
 * today's 32 cap) and one at exactly 32, to catch bad truncation or wrapping.
 */
const LONG_NAME_TWINS = [
	"today",
	"habit-detail",
	"habit-detail-archived",
	"retro-log",
	"reminders-at-cap",
	"habits-tab",
	"delete-confirm",
	"export-ready",
	"progress-week",
	"progress-month-rates",
	"progress-habit-picker",
];
for (const name of LONG_NAME_TWINS) {
	const base = SCREENS[name];
	const [path, query = ""] = base.route.split("?");
	const params = new URLSearchParams(query);
	params.set("longNames", "1");
	SCREENS[`${name}-long-names`] = {
		...base,
		feature: "HAB-22",
		route: `${path}?${params}`,
		mockup: null,
		note: `${name} with a 40-char V1 name and a 32-char name (HAB-22).`,
	};
}
