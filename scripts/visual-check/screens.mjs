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

/**
 * A horizontal touch swipe through CDP (needs `touch: true` on the state).
 * On web, a mouse drag across a pressable row is claimed by the Pressable
 * as a tap before gesture-handler's swipe sees it; real touch events aren't.
 */
async function swipeLeft(page, locator, distance = 160) {
	const cdp = await page.context().newCDPSession(page);
	const box = await locator.boundingBox();
	const x = box.x + 150;
	const y = box.y + box.height / 2;
	const touch = (type, px) =>
		cdp.send("Input.dispatchTouchEvent", {
			type,
			touchPoints: type === "touchEnd" ? [] : [{ x: px, y }],
		});
	await touch("touchStart", x);
	for (let step = 1; step <= 16; step++) {
		await touch("touchMove", x - (distance * step) / 16);
		await page.waitForTimeout(16);
	}
	await touch("touchEnd");
	await page.waitForTimeout(400);
	return { y };
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

	// HAB-11 — Weekly summary
	"weekly-summary": {
		feature: "HAB-11",
		route: "/(progress)/week?fixtures=weekly-summary",
		mockup: "docs/mockups/weekly-summary.png",
		// The summary counts up to today only, so pin "now" to the end of a
		// week — otherwise a Monday run would show an empty week.
		clock: "2026-09-20T20:00:00",
		note: "Clock pinned to Sun 20 Sep evening. Mockup's '34 of 42' tile disagrees with its own bars (29).",
	},
	"weekly-summary-perfect": {
		feature: "HAB-11",
		route: "/(progress)/week?fixtures=perfect-week",
		mockup: "docs/mockups/perfect-week.png",
		clock: "2026-09-13T20:00:00",
		note: "Clock pinned to Sun 13 Sep evening. Mockup's '42 of 42' tile disagrees with its own 5/5 and 3/3 bars (36).",
	},
	"weekly-summary-too-early": {
		feature: "HAB-11",
		route: "/(progress)/week?fixtures=weekly-summary",
		mockup: "docs/mockups/weekly-summary.png",
		clock: "2026-09-15T20:00:00",
		note: "Tuesday evening, switched to This week (Tuesday opens on last week): no habit due 3 times yet, so the insight reads 'Too early to call'.",
		async interact(page) {
			await page.getByText("This week", { exact: true }).click();
		},
	},
	"weekly-summary-last-week": {
		feature: "HAB-11",
		route: "/(progress)/week?fixtures=weekly-summary-last-week",
		mockup: "docs/mockups/weekly-summary.png",
		clock: "2026-09-21T09:00:00",
		note: "Monday morning: opens on last week (14–20 Sep), the mockup's week, with the full seven days counted.",
	},
	"weekly-summary-empty": {
		feature: "HAB-11",
		route: "/(progress)/week?fixtures=empty",
		mockup: null,
		note: "No habits at all.",
	},

	// HAB-16 — Monthly summary (C2, C3, C6) + the range switcher on Weekly (C1)
	"monthly-summary": {
		feature: "HAB-16",
		route: "/(progress)/month?fixtures=monthly-summary",
		mockup: "docs/mockups/hab-16-c2.png",
		// Monthly opens on the current month (D15), so "now" is the evening of 31 Aug:
		// August is the current month and every day of it is counted.
		clock: "2026-08-31T21:00:00",
		note: "August 2026 as the current month. Fixture numbers differ from the mockup's (it's tuned to the insights, not the tiles); freezes are on 7 and 22 Aug.",
	},
	"monthly-insights": {
		feature: "HAB-16",
		route: "/(progress)/month?fixtures=monthly-summary",
		mockup: "docs/mockups/hab-16-c3.png",
		clock: "2026-08-31T21:00:00",
		note: "Scrolled to the insights: slipping → improved → pattern, then the freeze card. The slipping body omits the mockup's 'started when Easy run moved' clause (not derivable).",
		async interact(page) {
			await page
				.getByText("What August says", { exact: true })
				.evaluate((el) => {
					el.scrollIntoView({ block: "start" });
				});
			await page.waitForTimeout(300);
		},
	},
	"monthly-too-early": {
		feature: "HAB-16",
		route: "/(progress)/month?fixtures=monthly-too-early",
		mockup: "docs/mockups/hab-16-c6.png",
		clock: "2026-09-16T09:00:00",
		note: "12 days of history (since 4 Sep): since the 7-logged-day gate (V3-3a) that is no longer too early, so this shows the summary; the unlock card returns with the P9 states.",
	},
	"monthly-empty": {
		feature: "HAB-16",
		route: "/(progress)/month?fixtures=empty",
		mockup: null,
		note: "No habits at all.",
	},
	// HAB-17 — Yearly summary (C4, C5, C7)
	"yearly-summary": {
		feature: "HAB-17",
		route: "/(progress)/year?fixtures=yearly-summary",
		mockup: "docs/mockups/hab-17-c4.png",
		clock: "2026-09-16T09:00:00",
		note: "3 March — 16 September 2026. Fixture numbers differ from the mockup's tiles (1,612 / 81%); the insights are tuned to C5. Strips use the 11px year layout; the chart's current month (September) is the lighter bar.",
	},
	"yearly-insights": {
		feature: "HAB-17",
		route: "/(progress)/year?fixtures=yearly-summary",
		mockup: "docs/mockups/hab-17-c5.png",
		clock: "2026-09-16T09:00:00",
		note: "Scrolled to the insights: best month → stuck → never stuck (the only tappable one). The mockup's fourth card (Summer dip) is cut by the max-three rule; copy omits clauses that aren't derivable ('through two schedule changes', 'Travel weeks show up as gaps').",
		async interact(page) {
			await page.getByText("What 2026 says", { exact: true }).evaluate((el) => {
				el.scrollIntoView({ block: "start" });
			});
			await page.waitForTimeout(300);
		},
	},
	"yearly-too-early": {
		feature: "HAB-17",
		route: "/(progress)/year?fixtures=monthly-too-early",
		mockup: "docs/mockups/hab-17-c7.png",
		clock: "2026-09-16T09:00:00",
		note: "12 days of history (since 4 Sep): unlock card ('12 of 91 days' — the real 4 Sep → 4 Dec span; the mockup says 90 and 'from 3 December'), one bar in progress and eleven dashed slots, the week one tap away.",
	},
	"yearly-empty": {
		feature: "HAB-17",
		route: "/(progress)/year?fixtures=empty",
		mockup: null,
		note: "No habits at all.",
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

	// HAB-13 — Manage, archive, delete (reworked by HAB-19; judged against D3)
	"manage-habits": {
		feature: "HAB-13",
		route: "/(habits)/manage?fixtures=manage-archive",
		mockup: "docs/mockups/hab-19-d3.png",
		note: "Resting state; the mockup's lifted row and toasts are the next two states.",
	},
	"manage-habits-dragging": {
		feature: "HAB-13",
		route: "/(habits)/manage?fixtures=manage-archive",
		mockup: "docs/mockups/hab-19-d3.png",
		note: "Meditate's grip held mid-drag, not yet released — the mockup's lifted row.",
		async interact(page) {
			await drag(page, page.getByLabel("Reorder Meditate"), {
				dy: -20,
				release: false,
			});
		},
	},
	"manage-habits-swipe-open": {
		feature: "HAB-13",
		route: "/(habits)/manage?fixtures=manage-archive",
		mockup: "docs/mockups/hab-19-d3.png",
		touch: true,
		note: "Read swiped left, Archive action revealed — no mockup draws this state.",
		async interact(page) {
			await swipeLeft(page, page.getByText("Read", { exact: true }));
		},
	},
	"manage-habits-archived-toast": {
		feature: "HAB-13",
		route: "/(habits)/manage?fixtures=manage-archive",
		mockup: "docs/mockups/manage-archive.png",
		touch: true,
		note: "Read swiped left and archived — \"Archived 'Read'\" toast with Undo, Read now under Archived.",
		ignoreErrors: [/No handler for tag/],
		async interact(page) {
			const { y } = await swipeLeft(
				page,
				page.getByText("Read", { exact: true }),
			);
			// Every row's Archive action is in the DOM behind it; tap where
			// Read's was just revealed, at the row's trailing edge.
			await page.touchscreen.tap(page.viewportSize().width - 60, y);
			// react-native-web only: the archived row unmounts while Swipeable still
			// has a queued config update, and gesture-handler's web NodeManager
			// throws "No handler for tag N" (native ignores the missing handler).
			// It is a dev-only LogBox toast over the pill, not app behaviour:
			// dismiss it so the baseline shows the screen.
			await page
				.getByText(/No handler for tag/)
				.waitFor({ timeout: 3000 })
				.catch(() => {});
			await page.mouse.click(309, 817);
		},
	},
	"manage-habits-no-active": {
		feature: "HAB-19",
		route: "/(habits)/manage?fixtures=manage-all-archived",
		mockup: "docs/mockups/hab-19-e2.png",
		note: "E2 — everything archived: category sections gone, empty card with Add habit, Restore below.",
	},
	"manage-habits-nothing-archived": {
		feature: "HAB-19",
		route: "/(habits)/manage?fixtures=manage-nothing-archived",
		mockup: "docs/mockups/hab-19-e3.png",
		note: "E3 — Archived header stays over a dashed placeholder.",
	},
	"manage-habits-no-habits": {
		feature: "HAB-19",
		route: "/(habits)/manage?fixtures=empty",
		mockup: null,
		note: "No habits at all: E2 card with copy that doesn't claim anything was archived, plus the E3 placeholder. No mockup draws this combination.",
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
		route: "/(progress)/week?fixtures=weekly-summary",
		mockup: "docs/mockups/v3/renders/progress/slice_00.png",
		note: "P1 — the Progress tab root with the pill, Progress active.",
	},
	"tab-bar-habits-end": {
		feature: "HAB-27",
		route: "/(habits)/manage?fixtures=manage-archive",
		mockup: "docs/mockups/v3/renders/habits/slice_05.png",
		viewport: { width: 393, height: 640 },
		note: "H9 — the Habits tab scrolled to the end: the last row stops above the pill, Habits active.",
		async interact(page) {
			await page.mouse.wheel(0, 4000);
			await page.waitForTimeout(400);
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
	"monthly-summary",
	"monthly-insights",
	"monthly-too-early",
	"yearly-summary",
	"yearly-insights",
	"yearly-too-early",
	"habit-detail",
	"habit-detail-archived",
	"habit-detail-restored",
	"manage-habits",
	"manage-habits-dragging",
	"manage-habits-no-active",
	"manage-habits-nothing-archived",
	"manage-habits-no-habits",
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
	"weekly-summary",
	"monthly-summary",
	"monthly-insights",
	"yearly-summary",
	"yearly-insights",
	"reminders-at-cap",
	"manage-habits",
	"manage-habits-swipe-open",
	"delete-confirm",
	"export-ready",
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
