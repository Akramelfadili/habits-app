/**
 * Every screen and state scripts/visual-check.mjs renders — one entry per
 * state across all features, so a single run covers the whole app and a
 * shared-component change shows up on every screen it touches, not just the
 * feature that made it.
 *
 * Each entry: `feature` (spec ID, groups the report), `route` (with the
 * `?fixtures=` scenario, see habit-fixtures.ts), `mockup` (the docs/mockups/
 * file it's judged against, or null when no mockup covers that state),
 * optional `clock` (overrides DEFAULT_CLOCK), `note`, `touch` (render in a
 * touch-enabled page, for swipe gestures), and `interact(page, ctx)` for
 * states only reachable by a tap or gesture.
 */
import { format, subDays } from "date-fns";

/**
 * "Now" for every screen unless it sets its own: a Thursday late in a month,
 * after every fixture's creation date. Pinned so a screenshot never depends
 * on the day the check runs — the baseline diff would drift daily otherwise.
 */
export const DEFAULT_CLOCK = "2026-09-24T09:00:00";

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
		route: "/habits?fixtures=first-run",
		mockup: "docs/mockups/first-run.png",
	},
	"first-run-none-selected": {
		feature: "HAB-06",
		route: "/habits?fixtures=first-run",
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
		route: "/habits",
		mockup: "docs/mockups/today-populated.png",
	},
	"today-break-resisted": {
		feature: "HAB-04",
		route: "/habits",
		mockup: "docs/mockups/today-populated.png",
		note: "Break habit ticked: resisted caption on the row, plus the completion toast with Undo.",
		async interact(page) {
			await page.getByLabel("No phone after 23:00", { exact: true }).click();
		},
	},
	"today-empty": {
		feature: "HAB-05",
		route: "/habits?fixtures=empty",
		mockup: "docs/mockups/today-empty-state.png",
	},
	"today-rest-day": {
		feature: "HAB-05",
		route: "/habits?fixtures=rest-day",
		mockup: "docs/mockups/rest-day.png",
	},
	"today-day-closed": {
		feature: "HAB-05",
		route: "/habits?fixtures=day-closed",
		mockup: "docs/mockups/day-closed.png",
	},

	// HAB-14 — Today's ⋯ navigation menu (A1–A6)
	"today-menu-open": {
		feature: "HAB-14",
		route: "/habits",
		mockup: "docs/mockups/hab-14-a2.png",
		note: "Populated Today with the ⋯ menu open. Monthly/Yearly/Settings are 'Coming soon' placeholders until HAB-15/16/17 (a deliberate deviation from the mockup's sublines).",
		async interact(page) {
			await page.getByLabel("More", { exact: true }).click();
			await page.getByText("Weekly summary", { exact: true }).waitFor();
			// The popover re-anchors under the button once the button is measured.
			await page.waitForTimeout(400);
		},
	},
	"today-empty-menu-open": {
		feature: "HAB-14",
		route: "/habits?fixtures=empty",
		mockup: "docs/mockups/hab-14-a4.png",
		note: "Empty Today, menu open: summaries disabled with the spec's reasons, Manage enabled. Settings is 'Coming soon' until HAB-15.",
		async interact(page) {
			await page.getByLabel("More", { exact: true }).click();
			await page.getByText("After your first month").waitFor();
			await page.waitForTimeout(400);
		},
	},
	"today-rest-day-menu": {
		feature: "HAB-14",
		route: "/habits?fixtures=rest-day",
		mockup: "docs/mockups/hab-14-a5.png",
		note: "Rest day with ⋯ closed. 'Log something anyway' still opens New habit until HAB-18.",
	},
	"today-day-closed-reminders": {
		feature: "HAB-14",
		route: "/habits?fixtures=day-closed",
		mockup: "docs/mockups/hab-14-a6.png",
		note: "Day closed: tomorrow rows carry their earliest reminder time; 'Read before bed' has no reminder and no trailing text.",
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
		route: "/habits/categories?fixtures=categories-built-in-only",
		mockup: "docs/mockups/hab-25-f3a.png",
		note: "F3a — built-ins only: locked tinted chips, counts, Built-in tag, no actions; Yours holds only Add category. Back reads 'Manage' until Settings (HAB-15) exists.",
	},
	"manage-categories-one-custom": {
		feature: "HAB-25",
		route: "/habits/categories?fixtures=categories-one-custom",
		mockup: "docs/mockups/hab-25-f3b.png",
		note: "F3b — one custom (Music), not used: outline chip, Rename + red Delete.",
	},
	"manage-categories-in-use": {
		feature: "HAB-25",
		route: "/habits/categories?fixtures=categories-in-use",
		mockup: "docs/mockups/hab-25-f3c.png",
		note: "F3c — Music 3 habits (one archived — counts include archived), Language 1, Garden not used; creation order.",
	},
	"delete-category-unused": {
		feature: "HAB-25",
		route: "/habits/categories?fixtures=categories-in-use",
		mockup: "docs/mockups/hab-25-f4a.png",
		note: "F4a — plain confirm, no mention of reassignment.",
		async interact(page) {
			await page.getByRole("button", { name: "Delete Garden" }).click();
		},
	},
	"delete-category-in-use": {
		feature: "HAB-25",
		route: "/habits/categories?fixtures=categories-in-use",
		mockup: "docs/mockups/hab-25-f4b.png",
		note: "F4b — names the count, Music → Other move preview with every affected habit, 'Delete and move 3 habits'.",
		async interact(page) {
			await page.getByRole("button", { name: "Delete Music" }).click();
		},
	},
	"rename-category-editing": {
		feature: "HAB-25",
		route: "/habits/categories?fixtures=categories-in-use",
		mockup: null,
		note: "No mockup — proposed inline rename: the row becomes the add-sheet's name field (counter from 16/20) with Cancel / Save.",
		async interact(page) {
			await page.getByRole("button", { name: "Rename Language" }).click();
			await page.getByLabel("Rename Language").fill("Languages & more");
		},
	},
	"rename-category-duplicate": {
		feature: "HAB-25",
		route: "/habits/categories?fixtures=categories-in-use",
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
		route: "/habits?fixtures=quantity-log",
		mockup: "docs/mockups/quantity-log.png",
		note: "Sheet is opened by simulating the tap the mockup can't capture from a static route load.",
		async interact(page) {
			await page.getByRole("button", { name: /^Log Glass of water/ }).click();
		},
	},
	"streak-at-risk": {
		feature: "HAB-08",
		route: "/habits?fixtures=streak-at-risk",
		mockup: "docs/mockups/streak-at-risk.png",
		note: "Sheet is opened by tapping the at-risk habit's row, same as a real 'open this habit' interaction.",
		async interact(page) {
			await page.getByText("Meditate").click();
		},
	},
	"habit-detail-no-freezes": {
		feature: "HAB-08",
		route: "/habits/1?fixtures=no-freezes",
		mockup: "docs/mockups/streak-reset-no-freezes.png",
		note: "Pool spent, yesterday missed, today done: streak reset silently to 1. The mockup's 'no freezes left' line and legend aren't implemented.",
	},

	// HAB-09 / HAB-10 — Habit detail + retro log
	"habit-detail": {
		feature: "HAB-09",
		route: "/habits/1?fixtures=habit-detail",
		mockup: "docs/mockups/habit-detail.png",
	},
	"habit-detail-pushed-header": {
		feature: "Header buttons",
		route: "/habits?fixtures=habit-detail",
		mockup: "docs/mockups/habit-detail.png",
		note: "Pushed from Today, so there's history: the plain '‹ Today' back button (header-buttons.tsx) and Edit. Web can't show the iOS 26 Liquid Glass capsule this guards against — that's device-only; the chevron is an SF Symbol (blank on web).",
		async interact(page) {
			await page.getByText("Glass of water", { exact: true }).click();
			await page.getByText("Last 10 weeks").waitFor();
		},
	},
	"habit-detail-new": {
		feature: "HAB-09",
		route: "/habits/1?fixtures=habit-detail-new",
		mockup: "docs/mockups/habit-detail-new.png",
	},
	"retro-log": {
		feature: "HAB-10",
		route: "/habits/1?fixtures=retro-log",
		mockup: "docs/mockups/retro-log .png",
		note: "Sheet is opened by tapping the heatmap cell 3 days ago (RETRO_LOG_DAYS_AGO in entry-fixtures.ts).",
		async interact(page, { clock }) {
			await page.getByLabel(heatmapCellLabel(clock, 3, "logged")).click();
		},
	},

	// HAB-11 — Weekly summary
	"weekly-summary": {
		feature: "HAB-11",
		route: "/habits/week?fixtures=weekly-summary",
		mockup: "docs/mockups/weekly-summary.png",
		// The summary counts up to today only, so pin "now" to the end of a
		// week — otherwise a Monday run would show an empty week.
		clock: "2026-09-20T20:00:00",
		note: "Clock pinned to Sun 20 Sep evening. Mockup's '34 of 42' tile disagrees with its own bars (29).",
	},
	"weekly-summary-perfect": {
		feature: "HAB-11",
		route: "/habits/week?fixtures=perfect-week",
		mockup: "docs/mockups/perfect-week.png",
		clock: "2026-09-13T20:00:00",
		note: "Clock pinned to Sun 13 Sep evening. Mockup's '42 of 42' tile disagrees with its own 5/5 and 3/3 bars (36).",
	},
	"weekly-summary-too-early": {
		feature: "HAB-11",
		route: "/habits/week?fixtures=weekly-summary",
		mockup: "docs/mockups/weekly-summary.png",
		clock: "2026-09-15T20:00:00",
		note: "Tuesday evening, switched to This week (Tuesday opens on last week): no habit due 3 times yet, so the insight reads 'Too early to call'.",
		async interact(page) {
			await page.getByText("This week", { exact: true }).click();
		},
	},
	"weekly-summary-last-week": {
		feature: "HAB-11",
		route: "/habits/week?fixtures=weekly-summary-last-week",
		mockup: "docs/mockups/weekly-summary.png",
		clock: "2026-09-21T09:00:00",
		note: "Monday morning: opens on last week (14–20 Sep), the mockup's week, with the full seven days counted.",
	},
	"weekly-summary-empty": {
		feature: "HAB-11",
		route: "/habits/week?fixtures=empty",
		mockup: null,
		note: "No habits at all.",
	},

	// HAB-12 — Reminders
	reminders: {
		feature: "HAB-12",
		route: "/habits/reminders/1?fixtures=reminders",
		mockup: "docs/mockups/reminders.png",
		note: "Cards start collapsed except a conflicting one (21:00); the other two are tapped open to match the mockup. Permission reads as denied in this scenario.",
		async interact(page) {
			await page.getByLabel("Reminder at 07:20, Weekdays").click();
			await page.getByLabel("Reminder at 13:00, Mon, Wed, Fri").click();
		},
	},
	"reminders-at-cap": {
		feature: "HAB-12",
		route: "/habits/reminders/1?fixtures=reminders-at-cap",
		mockup: "docs/mockups/reminders-at-cap.png",
	},
	"reminders-empty": {
		feature: "HAB-12",
		route: "/habits/reminders/1",
		mockup: "docs/mockups/reminders.png",
		note: "A habit with no reminders yet.",
	},
	"reminder-time-sheet": {
		feature: "HAB-12",
		route: "/habits/reminders/1?fixtures=reminders",
		mockup: null,
		note: "Time sheet for the 21:00 reminder. Web shows a static read-out where iOS has the SwiftUI wheel.",
		async interact(page) {
			await page.getByText("Change time", { exact: true }).click();
		},
	},

	// HAB-13 — Manage, archive, delete
	"manage-habits": {
		feature: "HAB-13",
		route: "/habits/manage?fixtures=manage-archive",
		mockup: "docs/mockups/manage-archive.png",
		note: "Resting state; the mockup's lifted row and toasts are the next two states.",
	},
	"manage-habits-dragging": {
		feature: "HAB-13",
		route: "/habits/manage?fixtures=manage-archive",
		mockup: "docs/mockups/manage-archive.png",
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
		route: "/habits/manage?fixtures=manage-archive",
		mockup: "docs/mockups/manage-archive.png",
		touch: true,
		note: "Read swiped left, Archive action revealed — no mockup draws this state.",
		async interact(page) {
			await swipeLeft(page, page.getByText("Read", { exact: true }));
		},
	},
	"manage-habits-archived-toast": {
		feature: "HAB-13",
		route: "/habits/manage?fixtures=manage-archive",
		mockup: "docs/mockups/manage-archive.png",
		touch: true,
		note: "Read swiped left and archived — \"Archived 'Read'\" toast with Undo, Read now under Archived.",
		async interact(page) {
			const { y } = await swipeLeft(
				page,
				page.getByText("Read", { exact: true }),
			);
			// Every row's Archive action is in the DOM behind it; tap where
			// Read's was just revealed, at the row's trailing edge.
			await page.touchscreen.tap(page.viewportSize().width - 60, y);
		},
	},
	"delete-confirm": {
		feature: "HAB-13",
		route: "/habits/1?fixtures=habit-detail",
		mockup: "docs/mockups/delete-confirm.png",
		note: "Sheet is opened by tapping 'Delete habit' at the bottom of Habit Detail.",
		async interact(page) {
			await page.getByText("Delete habit").click();
		},
	},

	// Shell — placeholder tabs for the future modules
	"tab-todos": {
		feature: "Shell",
		route: "/todos",
		mockup: null,
	},
	"tab-expenses": {
		feature: "Shell",
		route: "/expenses",
		mockup: null,
	},
};
