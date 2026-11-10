/**
 * Every screen and state scripts/visual-check.mjs renders: one entry per state across all
 * features, so a single run covers the whole app and a shared-component change shows up on
 * every screen it touches, not just the feature that made it.
 *
 * Each entry: `feature` (groups the report), `route` (with the `?fixtures=` scenario, see
 * src/modules/habits/dev/habit-fixtures.ts), `mockup` (the render under
 * docs/mockups/v3/renders/ it is judged against, or null; earlier mockups live in the tag
 * mockups-v1-v2), optional `clock` (overrides DEFAULT_CLOCK), `viewport` ({ width, height }
 * in CSS px, overrides the default 393x852, e.g. a small phone with the keyboard up),
 * `note`, `touch` (render in a touch-enabled page, for swipe gestures), `colorScheme`
 * ("light" default, or "dark": the emulated OS scheme, which the Appearance setting's
 * default "System" follows), and `interact(page, ctx)` for states only reachable by a tap
 * or gesture.
 */

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

async function scrollProgress(page, top) {
	await page.mouse.move(200, 400);
	await page.mouse.wheel(0, top === "end" ? 6000 : top);
	await page.waitForTimeout(600);
}

async function openJuly14(page) {
	await showRange(page, "Year");
	await page.getByRole("button", { name: /^July,/ }).click();
	await page.waitForTimeout(500);
	await page.getByRole("button", { name: /^Tuesday 14 July,/ }).click();
	await page.waitForTimeout(400);
	await scrollProgress(page, 360);
}

/** Scrolls Habit Detail back to its top, so a sheet opened from its last rows is drawn over the title, as the frames are. */
async function detailToTop(page) {
	await page.evaluate(() => {
		document
			.querySelector('[data-testid="habit-detail-scroll"]')
			?.scrollTo(0, 0);
	});
	await page.waitForTimeout(300);
}

const PROGRESS = "/(progress)/progress?fixtures=";

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
 * Scrolls the Add habit form to its end and fails the capture if the pinned
 * footer (Save and its reason) sits over the last field: the end of the form
 * must clear it with room to spare.
 */
async function scrollFormToEndClearOfSave(page) {
	const box = await page.getByTestId("habit-form-scroll").boundingBox();
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.wheel(0, 5000);
	await page.waitForTimeout(500);
	const { lastBottom, footerTop, top, text } = await page.evaluate(() => {
		const scroll = document.querySelector('[data-testid="habit-form-scroll"]');
		const footer = document.querySelector('[data-testid="habit-form-footer"]');
		const content = scroll.firstElementChild;
		const last = [...content.children].at(-1);
		return {
			lastBottom: last.getBoundingClientRect().bottom,
			footerTop: footer.getBoundingClientRect().top,
			top: scroll.scrollTop,
			text: (last.textContent || "").slice(0, 40),
		};
	});
	if (lastBottom > footerTop) {
		throw new Error(
			`the form's last field ("${text}") ends at ${lastBottom} under the Save bar at ${footerTop} (scrollTop ${top})`,
		);
	}
}

/**
 * Fails the capture if any insight card's text runs past its card's right edge
 * (the Year insight once ran off the screen on one line instead of wrapping).
 */
async function assertInsightsWrap(page) {
	const bad = await page.evaluate(() => {
		const out = [];
		for (const card of document.querySelectorAll(
			'[data-testid="insight-card"]',
		)) {
			const text = card.querySelector('[data-testid="insight-card-text"]');
			const cardBox = card.getBoundingClientRect();
			const textBox = text.getBoundingClientRect();
			const viewport = document.documentElement.clientWidth;
			// Later pages of the pager wait to the right, by design: check the card in view.
			if (cardBox.left > 60) continue;
			if (
				textBox.right > cardBox.right + 0.5 ||
				cardBox.right > viewport + 0.5 ||
				text.scrollWidth > text.clientWidth + 1
			) {
				out.push({
					text: (text.textContent || "").slice(0, 50),
					textRight: textBox.right,
					cardRight: cardBox.right,
					viewport,
				});
			}
		}
		return out;
	});
	if (bad.length) {
		throw new Error(`insight text runs off its card: ${JSON.stringify(bad)}`);
	}
}

/**
 * With Progress scrolled so the range switcher is pinned, fails the capture
 * unless: the inline bar has no hairline of its own, the pinned block starts
 * exactly where the bar ends and draws the only hairline, the control has air
 * above it, and Export has margin above and below inside the bar.
 */
async function assertStickyHeaderClear(page) {
	await page.getByTestId("progress-range-bar").waitFor();
	await page.getByTestId("header-pill").first().waitFor({ state: "attached" });
	const m = await page.evaluate(() => {
		const box = (id) =>
			document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect();
		const bar = box("progress-inline-bar");
		const bg = document.querySelector(
			'[data-testid="progress-inline-bar-background"]',
		);
		const pinned = box("progress-range-bar");
		const control =
			pinned &&
			document
				.querySelector('[data-testid="progress-range-bar"]')
				.firstElementChild?.getBoundingClientRect();
		const pill = box("header-pill");
		const hairline = document.querySelector(
			'[data-testid="progress-range-bar-hairline"]',
		);
		return {
			barTop: bar.top,
			barBottom: bar.bottom,
			barBorder: getComputedStyle(bg).borderBottomWidth,
			pinnedTop: pinned.top,
			controlTop: control.top,
			pillTop: pill.top,
			pillBottom: pill.bottom,
			hairlineOpacity: hairline ? getComputedStyle(hairline).opacity : null,
		};
	});
	const problems = [];
	if (m.barBorder !== "0px")
		problems.push(`the bar draws its own hairline (${m.barBorder})`);
	if (Math.abs(m.pinnedTop - m.barBottom) > 1)
		problems.push(
			`the pinned block starts at ${m.pinnedTop}, the bar ends at ${m.barBottom}`,
		);
	if (m.controlTop - m.barBottom < 8)
		problems.push(
			`the control has only ${m.controlTop - m.barBottom} pt under the bar`,
		);
	if (m.pillTop - m.barTop < 4 || m.barBottom - m.pillBottom < 4)
		problems.push(
			`Export has ${m.pillTop - m.barTop} / ${m.barBottom - m.pillBottom} pt of margin in the bar`,
		);
	if (Number(m.hairlineOpacity) !== 1)
		problems.push(
			`the pinned block's hairline is not shown (${m.hairlineOpacity})`,
		);
	if (problems.length) throw new Error(`sticky header: ${problems.join("; ")}`);
}

/** A lazily bundled route can take a while the first time: wait for its title before capturing. */
async function untilTitled(page, title) {
	await page
		.getByRole("heading", { name: title, exact: true })
		.first()
		.waitFor({ timeout: 90000 });
	await page.waitForTimeout(300);
}

/**
 * The Today week strip after browsing: it must be on screen at full opacity
 * with a real height (it once stayed blank, its space kept, after a day was
 * chosen in another week), and every day must be its own labelled button
 * ("Wednesday 14 October, 3 of 5 done").
 */
async function assertStripShown(page) {
	const m = await page.evaluate(() => {
		const strip = document.querySelector('[data-testid="week-strip"]');
		const row = strip?.firstElementChild;
		const days = [
			...document.querySelectorAll('[data-testid^="week-strip-day-"]'),
		];
		return {
			height: strip?.getBoundingClientRect().height ?? 0,
			opacity: row ? Number(getComputedStyle(row).opacity) : 0,
			labels: days.map((day) => day.getAttribute("aria-label") ?? ""),
		};
	});
	const problems = [];
	if (m.height < 44) problems.push(`the strip is ${m.height} pt tall`);
	if (m.opacity !== 1) problems.push(`the strip's opacity is ${m.opacity}`);
	if (m.labels.length !== 7) problems.push(`${m.labels.length} day buttons`);
	for (const label of m.labels) {
		if (
			!/^\w+day \d+ \w+(, today)?(, \d+ of \d+ done|, nothing due)?$/.test(
				label,
			)
		) {
			problems.push(`day label "${label}"`);
		}
	}
	if (problems.length) throw new Error(`week strip: ${problems.join("; ")}`);
}

async function typeHabitName(page, name) {
	await page.getByLabel("Name", { exact: true }).first().fill(name);
}

function categoryChip(page, name) {
	return page.getByRole("button", { name, exact: true }).first();
}

export const SCREENS = {
	"first-run": {
		feature: "HAB-46",
		route: "/?fixtures=first-run",
		mockup: "docs/mockups/v3/renders/states/slice_07.png",
		note: "FR1 — welcome, no tab bar. Skip for now is an addition to the frame (every First Run screen has a way to an empty Today).",
	},
	"first-run-habit": {
		feature: "HAB-46",
		route: "/?fixtures=first-run",
		mockup: "docs/mockups/v3/renders/states/slice_08.png",
		note: "FR2 — the slim first-habit form: name, quick picks, type, frequency. Three frequency options, not the frame's four (spec wins).",
		async interact(page) {
			await page.getByRole("button", { name: "Add your first habit" }).click();
			await page.getByText("Or pick one").waitFor();
		},
	},
	"first-run-offer": {
		feature: "HAB-46",
		route: "/?fixtures=first-run",
		mockup: "docs/mockups/v3/renders/states/slice_08.png",
		note: "FR3 — our own pre-prompt over Today after the first save (Drink water picked); the dialog is a modal over Today, so the bar is hidden while the question is open.",
		async interact(page) {
			await page.getByRole("button", { name: "Add your first habit" }).click();
			await page
				.getByRole("button", { name: "Drink water", exact: true })
				.click();
			await page.getByRole("button", { name: "Save habit" }).click();
			await page.getByText("Remind you each day?").waitFor();
			await page.waitForTimeout(400);
		},
	},
	"first-run-skipped": {
		feature: "HAB-46",
		route: "/?fixtures=first-run",
		mockup: "docs/mockups/v3/renders/states/slice_09.png",
		note: "FR4 — Skip for now lands on the empty Today, with the tab bar (UI fix batch: only First Run itself hides it; the frame draws the bar too).",
		async interact(page) {
			await page.getByRole("button", { name: "Skip for now" }).click();
			await page.getByText("Nothing to track yet").waitFor();
		},
	},

	suggestions: {
		feature: "HAB-46",
		route: "/suggestions?fixtures=empty",
		mockup: "docs/mockups/v3/renders/states/slice_06.png",
		note: "BS1 — the nine bundled suggestions by category, Break habits last. Opened from the empty Today or Habits.",
	},
	"suggestions-added": {
		feature: "HAB-46",
		route: "/suggestions?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/states/slice_06.png",
		note: "BS1 with habits that already exist (archived included): their rows say Added, have no chevron and cannot be picked. Not drawn in the frame.",
	},
	"first-run-suggestions": {
		feature: "HAB-46",
		route: "/?fixtures=first-run",
		mockup: "docs/mockups/v3/renders/states/slice_06.png",
		note: "BS1 opened from First Run: the same list with Skip for now under it (an addition to the frame).",
		async interact(page) {
			await page.getByRole("button", { name: "Browse suggestions" }).click();
			await page.getByText("Tap one to open Add habit").waitFor();
			await page.mouse.move(200, 400);
			await page.mouse.wheel(0, 6000);
			await page.waitForTimeout(500);
		},
	},
	"suggestions-end": {
		feature: "HAB-46",
		route: "/suggestions?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/states/slice_06.png",
		note: "BS1 scrolled to its end: the Break group, with the Added rows.",
		async interact(page) {
			await page.mouse.move(200, 400);
			await page.mouse.wheel(0, 6000);
			await page.waitForTimeout(500);
		},
	},

	"first-run-ax": {
		feature: "HAB-49",
		route: "/?fixtures=first-run&textSize=ax",
		mockup: null,
		note: "FR1 at an accessibility text size (forced on web with ?textSize=ax): the rows stack and the buttons stay full width. Not drawn in the handoff.",
	},
	"first-run-habit-ax": {
		feature: "HAB-49",
		route: "/?fixtures=first-run&textSize=ax",
		mockup: null,
		note: "FR2 at an accessibility text size: chips wrap, Save stays pinned with its reason.",
		async interact(page) {
			await page.getByRole("button", { name: "Add your first habit" }).click();
			await page.getByText("Or pick one").waitFor();
		},
	},
	"suggestions-ax": {
		feature: "HAB-49",
		route: "/suggestions?fixtures=empty&textSize=ax",
		mockup: null,
		note: "BS1 at an accessibility text size: rows stack icon, text and the Added value.",
		async interact(page) {
			// A direct route can still be "Bundling…" when the page loads: wait for the list.
			await page.getByText("Tap one to open Add habit").waitFor();
			await page.waitForTimeout(300);
		},
	},

	today: {
		feature: "HAB-03",
		route: "/",
		mockup: "docs/mockups/v3/renders/today/slice_00.png",
	},
	"today-break-resisted": {
		feature: "HAB-04",
		route: "/",
		mockup: null,
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
		note: "T2 / FR4 — header and + only, the empty state with Add habit and the Browse suggestions link, and the tab bar.",
	},
	"today-rest-day": {
		feature: "HAB-05",
		route: "/?fixtures=rest-day",
		mockup: "docs/mockups/v3/renders/today/slice_01.png",
	},

	"rest-day-picker": {
		feature: "HAB-18",
		route: "/?fixtures=rest-day-picker",
		mockup: null,
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
		mockup: null,
		note: "Read logged off-schedule: toast with Undo over the rest day, which now lists it. 'Logged 10:42' becomes the real time of day.",
		async interact(page) {
			await page.getByText("Log a different habit", { exact: true }).click();
			await page.getByLabel("Log Read off-schedule").first().click();
			await page.getByText("Logged 'Read' · off-schedule").waitFor();
			await page.waitForTimeout(400);
		},
	},

	"form-new-empty": {
		feature: "HAB-41",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/v3/renders/forms/slice_01.png",
		note: "F1 — Type, Name (focused), Category, Goal, Frequency, Reminders; Save off with 'Add a name to save'.",
	},
	"form-new-filled": {
		feature: "HAB-41",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/v3/renders/forms/slice_01.png",
		note: "F2 — Build · Check · Daily, filled: Learning picked (accent fill, check). No icon/colour row: the category supplies both (spec wins).",
		async interact(page) {
			await typeHabitName(page, "Read 20 min");
			await categoryChip(page, "Learning").click();
		},
	},
	"form-new-quantity": {
		feature: "HAB-41",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/v3/renders/forms/slice_02.png",
		note: "F3 — Quantity: daily target stepper, unit and the live example.",
		async interact(page) {
			await typeHabitName(page, "Drink water");
			await page.getByText("Quantity", { exact: true }).click();
			await page.getByLabel("Unit", { exact: true }).fill("glasses");
			// The Unit field scrolls the form to its end (animated); let it settle.
			await page.waitForTimeout(900);
			// The animated scroll lands 4 px apart from run to run; pin it to the end.
			await page.evaluate(() => {
				const scroller = document.querySelector(
					'[data-testid="habit-form-scroll"]',
				);
				if (scroller) scroller.scrollTop = scroller.scrollHeight;
				// No caret in the capture: a blinking one makes it flaky.
				document.activeElement?.blur();
			});
			await page.waitForTimeout(600);
			await page.evaluate(() => {
				const scroller = document.querySelector(
					'[data-testid="habit-form-scroll"]',
				);
				if (scroller) scroller.scrollTop = scroller.scrollHeight;
			});
			await page.waitForTimeout(600);
		},
	},
	"form-new-per-week": {
		feature: "HAB-41",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/v3/renders/forms/slice_02.png",
		note: "F4 — × per week: stepper, the Monday–Sunday rule and 'leaves Today once met'.",
		async interact(page) {
			await typeHabitName(page, "Cold shower");
			await page.getByText("× per week", { exact: true }).click();
			await page.waitForTimeout(300);
		},
	},
	"form-new-break": {
		feature: "HAB-41",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/v3/renders/forms/slice_03.png",
		note: "F5 — Break: one line on resisting, Quantity off with its reason.",
		async interact(page) {
			await typeHabitName(page, "No social media");
			await page.getByText("Break", { exact: true }).click();
			await page.waitForTimeout(300);
		},
	},
	"form-new-specific-days": {
		feature: "HAB-41",
		route: "/new-habit?fixtures=empty",
		mockup: "docs/mockups/v3/renders/forms/slice_04.png",
		note: "F7 — Specific days (Tue, Thu) with one queued reminder at 09:00 on those days.",
		async interact(page) {
			await typeHabitName(page, "Upper body");
			await page.getByText("Specific days", { exact: true }).click();
			await page.getByLabel("Tuesday", { exact: true }).click();
			await page.getByLabel("Thursday", { exact: true }).click();
			await page.getByLabel("Add time", { exact: true }).click();
			await page.getByText("Save time", { exact: true }).click();
			await page.waitForTimeout(500);
		},
	},
	"form-new-errors": {
		feature: "HAB-41",
		route: "/new-habit?fixtures=today-v3",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/forms/slice_04.png",
		note: "F8 — a duplicate name and no days picked, both inline; Save says 'Fix 2 issues to save'.",
		async interact(page) {
			await typeHabitName(page, "Read 20 min");
			await page.getByText("Specific days", { exact: true }).click();
			await page.waitForTimeout(300);
		},
	},
	"form-new-errors-end": {
		feature: "HAB-41",
		route: "/new-habit?fixtures=today-v3",
		clock: V3_FRIDAY,
		viewport: { width: 393, height: 640 },
		mockup: "docs/mockups/v3/renders/forms/slice_04.png",
		note: "F8 scrolled to the end on a small phone: with the errors showing, the last field (Frequency) clears the pinned Save and its reason.",
		async interact(page) {
			await typeHabitName(page, "Read 20 min");
			await page.getByText("Specific days", { exact: true }).click();
			await page.waitForTimeout(300);
			await scrollFormToEndClearOfSave(page);
		},
	},
	"form-new-errors-end-ax": {
		feature: "HAB-49",
		route: "/new-habit?fixtures=today-v3&textSize=ax",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/forms/slice_05.png",
		note: "F8 at AX3, scrolled to the end: the last field clears the pinned Save and its reason.",
		async interact(page) {
			await typeHabitName(page, "Read 20 min");
			await page.getByText("Specific days", { exact: true }).click();
			await page.waitForTimeout(300);
			await scrollFormToEndClearOfSave(page);
		},
	},
	"form-edit-discard": {
		feature: "HAB-41",
		route: "/(today)/habit/1?fixtures=today-v3",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/forms/slice_05.png",
		note: "F9 — Detail → Edit, one edit, Close: 'Discard changes?', Keep editing bold, Discard in danger.",
		async interact(page) {
			await page.getByRole("button", { name: /^Edit/ }).first().click();
			await page.getByLabel("Name", { exact: true }).first().waitFor();
			await page
				.getByLabel("Name", { exact: true })
				.first()
				.fill("Read 30 min");
			await page.getByText("Close", { exact: true }).first().click();
			await page.waitForTimeout(800);
			await page.waitForTimeout(300);
		},
	},
	"form-edit": {
		feature: "HAB-41",
		route: "/edit-habit/1?fixtures=today-v3",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/forms/slice_05.png",
		note: "Edit habit — same form; Type is locked with its reason, Save changes, and the Archive entry at the foot.",
	},
	"form-new-ax": {
		feature: "HAB-41",
		route: "/new-habit?fixtures=empty&textSize=ax",
		mockup: "docs/mockups/v3/renders/forms/slice_05.png",
		note: "F10 — AX3: segmented controls stack, chips wrap, Save full width.",
		async interact(page) {
			await typeHabitName(page, "Drink water");
		},
	},
	"form-new-suggestion": {
		feature: "HAB-41",
		route: `/new-habit?fixtures=empty&prefill=${encodeURIComponent(
			JSON.stringify({
				name: "Drink water",
				category: "Health",
				direction: "build",
				target: { amount: 8, unit: "glasses" },
				frequency: { type: "daily" },
			}),
		)}`,
		mockup: "docs/mockups/v3/renders/states/slice_06.png",
		note: "BS2 — prefilled from a suggestion: banner says where from; nothing saves until Save.",
	},

	"new-habit-near-limit": {
		feature: "HAB-22",
		route: "/new-habit?fixtures=empty",
		mockup: null,
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

	"category-picker-many": {
		feature: "HAB-24",
		route: "/new-habit?fixtures=many-categories",
		mockup: null,
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
		mockup: null,
		note: "F2a — add sheet stacked over the picker: empty name, placeholder preview, Add blocked.",
		async interact(page) {
			await typeHabitName(page, "Write three lines");
			await categoryChip(page, "New category").click();
		},
	},
	"add-category-typing": {
		feature: "HAB-24",
		route: "/new-habit?fixtures=empty",
		mockup: null,
		note: "F2b — name typed: live preview on rotation slot 1, Add enabled.",
		async interact(page) {
			await typeHabitName(page, "Write three lines");
			await categoryChip(page, "New category").click();
			await page.getByPlaceholder("e.g. Journaling").fill("Journaling");
		},
	},
	"add-category-duplicate": {
		feature: "HAB-24",
		route: "/new-habit?fixtures=empty",
		mockup: null,
		note: "F2c — duplicate of a built-in: amber field + helper, preview hidden, Add blocked.",
		async interact(page) {
			await typeHabitName(page, "Write three lines");
			await categoryChip(page, "New category").click();
			await page.getByPlaceholder("e.g. Journaling").fill("Fitness");
		},
	},
	"category-picker-new-selected": {
		feature: "HAB-24",
		route: "/new-habit?fixtures=empty",
		mockup: null,
		note: "F2d — after Add: sheet closed, new chip in its creation-order slot, auto-selected, no toast.",
		async interact(page) {
			await typeHabitName(page, "Write three lines");
			await categoryChip(page, "New category").click();
			await page.getByPlaceholder("e.g. Journaling").fill("Journaling");
			await page.getByRole("button", { name: "Add category" }).last().click();
			await page.waitForTimeout(500);
		},
	},

	"categories-list": {
		feature: "HAB-42",
		route: "/(habits)/categories?from=habits&fixtures=categories-in-use",
		mockup: "docs/mockups/v3/renders/forms/slice_06.png",
		note: "C1 — custom first with Rename and Delete, built-ins locked under their note with a tag; counts include archived (Music 3 habits · 1 archived).",
	},
	"categories-reorder": {
		feature: "HAB-42",
		route: "/(habits)/categories?from=habits&fixtures=categories-in-use",
		mockup: "docs/mockups/v3/renders/forms/slice_07.png",
		note: "C2 — Reorder: one list of every category but Other, handles on the right, 'Other stays last' in the note.",
		async interact(page) {
			await page.getByRole("button", { name: "Reorder", exact: true }).click();
			await page.waitForTimeout(400);
		},
	},
	"categories-rename-editing": {
		feature: "HAB-42",
		route: "/(habits)/categories?from=habits&fixtures=categories-in-use",
		mockup: "docs/mockups/v3/renders/forms/slice_07.png",
		note: "C3 — inline rename: the row's name is a field with the counter from 16/20 and Done; the other buttons wait.",
		async interact(page) {
			await page.getByRole("button", { name: "Rename Language" }).click();
			await page.getByLabel("Rename Language").fill("Languages & more");
		},
	},
	"categories-rename-duplicate": {
		feature: "HAB-42",
		route: "/(habits)/categories?from=habits&fixtures=categories-in-use",
		mockup: "docs/mockups/v3/renders/forms/slice_07.png",
		note: "C3 — renaming to 'health' clashes with a built-in (case ignored): red outline, '! Health already exists. Choose another name.', Done off.",
		async interact(page) {
			await page.getByRole("button", { name: "Rename Language" }).click();
			await page.getByLabel("Rename Language").fill("health");
		},
	},
	"categories-add": {
		feature: "HAB-42",
		route: "/(habits)/categories?from=habits&fixtures=categories-in-use",
		mockup: "docs/mockups/v3/renders/forms/slice_08.png",
		note: "C4 — New category sheet: name, the preview chip with the auto-assigned icon and colour, the note, Add category.",
		async interact(page) {
			await page
				.getByRole("button", { name: "Add category", exact: true })
				.click();
			await page.getByPlaceholder("e.g. Journaling").fill("Journaling");
			await page.waitForTimeout(300);
		},
	},
	"categories-delete-in-use": {
		feature: "HAB-42",
		route: "/(habits)/categories?from=habits&fixtures=categories-in-use",
		mockup: "docs/mockups/v3/renders/forms/slice_08.png",
		note: "C5 — delete in use: how many habits move to Other, history and streaks kept, each habit with its move, 'Delete and move 3 habits', Cancel. No Close (V3-25); the frame draws one.",
		async interact(page) {
			await page.getByRole("button", { name: "Delete Music" }).click();
		},
	},
	"categories-delete-unused": {
		feature: "HAB-42",
		route: "/(habits)/categories?from=habits&fixtures=categories-in-use",
		mockup: "docs/mockups/v3/renders/sheets/slice_03.png",
		note: "DC6 — nothing uses it: one destructive 'Delete category' and Cancel.",
		async interact(page) {
			await page.getByRole("button", { name: "Delete Garden" }).click();
		},
	},
	"categories-delete-undo": {
		feature: "HAB-42",
		route: "/(habits)/categories?from=habits&fixtures=categories-in-use",
		mockup: "docs/mockups/v3/renders/sheets/slice_03.png",
		note: "DC6 — after the delete: Garden is gone and the toast says so with Undo (5 s).",
		async interact(page) {
			await page.getByRole("button", { name: "Delete Garden" }).click();
			await page.getByText("Delete category", { exact: true }).click();
			await page.getByText("Garden deleted").waitFor();
			await page.waitForTimeout(300);
		},
	},
	"categories-empty-custom": {
		feature: "HAB-42",
		route: "/(habits)/categories?from=habits&fixtures=categories-built-in-only",
		mockup: "docs/mockups/v3/renders/forms/slice_09.png",
		note: "C6 — no custom categories: 'Add a category · Group habits your own way', no Reorder.",
	},

	"quantity-log": {
		feature: "HAB-07",
		route: "/?fixtures=quantity-log",
		mockup: null,
		note: "Sheet is opened from the row's count control (a tap on the circle adds one, D6) — the interaction the mockup can't capture from a static route load.",
		async interact(page) {
			await page.getByText("6/8", { exact: true }).click();
		},
	},
	"streak-at-risk": {
		feature: "HAB-08",
		route: "/?fixtures=streak-at-risk",
		mockup: null,
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
	// Clock = the mockup's Friday 23 October.
	"habit-detail": {
		feature: "HAB-40",
		route: "/(today)/habit/3?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_06.png",
		clock: V3_FRIDAY,
		note: "D1 — Upper body: eyebrow, three tiles (the 90-day rate with its change), the last five weeks with the bonus Mon 19 and the frozen Thu 15 (each week one target), the legend, Reminders. The fixture's numbers differ from the frame's (streak 5, not 9): the history is built from the dates D2 lists.",
	},
	"habit-detail-history": {
		feature: "HAB-40",
		route: "/(today)/habit/3?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_07.png",
		clock: V3_FRIDAY,
		note: "D2 — scrolled to the end: Reminders, History by date (done, bonus 'not counted', frozen, missed; no times), Archive habit and Delete habit last. The habit's name has joined the navigation bar.",
		async interact(page) {
			await page.mouse.move(200, 400);
			await page.mouse.wheel(0, 4000);
			await page.waitForTimeout(600);
		},
	},
	"habit-detail-pushed-header": {
		feature: "Header buttons",
		route: "/?fixtures=today-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_06.png",
		clock: V3_FRIDAY,
		note: "Pushed from Today, so there's history: the plain '‹ Today' back button (header-buttons.tsx) and Edit in the title row. Web can't show the iOS 26 Liquid Glass capsule this guards against — that's device-only; the chevron is an SF Symbol (blank on web).",
		async interact(page) {
			await page.getByText("Meditate", { exact: true }).click();
			await page.getByText("Last 5 weeks").waitFor();
		},
	},
	"habit-detail-new": {
		feature: "HAB-40",
		route: "/(today)/habit/1?fixtures=habits-v3-new",
		mockup: "docs/mockups/v3/renders/habits/slice_07.png",
		clock: V3_FRIDAY,
		note: "D3 — a habit created today: the tiles say when they start, the grid is 'before start' with today ringed, History says 'No logs yet. Tick it on Today to start.'",
	},
	"habit-detail-archived": {
		feature: "HAB-40",
		route: "/(today)/habit/8?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_08.png",
		clock: V3_FRIDAY,
		note: "D4 — Morning run, archived 12 Oct: the banner with its date and Restore, the streak paused, the rate 'until 12 Oct', the last two weeks hatched (paused, never missed), Reminders paused.",
	},
	"habit-detail-restored": {
		feature: "HAB-40",
		route: "/(today)/habit/8?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_08.png",
		clock: V3_FRIDAY,
		note: "D5 — Restore tapped: the one-time 'Restored today' banner, a fresh streak, the paused days left out of the rate, and the toast 'Morning run is back on Today' with Undo.",
		async interact(page) {
			await page.getByRole("button", { name: "Restore", exact: true }).click();
			await page.getByText("Morning run is back on Today").waitFor();
		},
	},
	"habit-detail-restore-undone": {
		feature: "HAB-40",
		route: "/(today)/habit/8?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_08.png",
		clock: V3_FRIDAY,
		note: "Restore then Undo: must be pixel-identical to habit-detail-archived (same archive date, same paused cells).",
		async interact(page) {
			await page.getByRole("button", { name: "Restore", exact: true }).click();
			await page.getByText("Morning run is back on Today").waitFor();
			await page.getByText("Undo", { exact: true }).click();
			await page.getByText("Archived on", { exact: false }).waitFor();
		},
	},
	"habit-detail-reset": {
		feature: "HAB-40",
		route: "/(progress)/habit/4?fixtures=habits-v3-reset",
		mockup: "docs/mockups/v3/renders/habits/slice_09.png",
		clock: V3_FRIDAY,
		note: "D6 — Meditate with the month's freezes spent and Wed 14 Oct missed: the reset day outlined in amber, the notice under the legend, the third tile the amber freeze count.",
	},
	"habit-detail-break": {
		feature: "HAB-40",
		route: "/(today)/habit/7?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/habits/slice_09.png",
		clock: V3_FRIDAY,
		note: "D7 — a Break habit: 'Resisting · nights in a row', 'Resisted' and 'Slipped' in the legend and history, never 'failed'.",
	},
	"habit-detail-ax": {
		feature: "HAB-49",
		route: "/(today)/habit/3?fixtures=habits-v3&textSize=ax",
		mockup: "docs/mockups/v3/renders/habits/slice_10.png",
		clock: V3_FRIDAY,
		note: "D8 — AX3: Edit above the title, the title and eyebrow wrap, the stat tiles one under another, bar A.",
	},

	"retro-log": {
		feature: "HAB-10",
		route: "/(today)/habit/1?fixtures=retro-log",
		mockup: null,
		note: "Origin habit pinned first in the ringed card (HAB-18 D4), the rest under 'Also on <weekday>'. Sheet is opened by tapping the heatmap cell 3 days ago (RETRO_LOG_DAYS_AGO in entry-fixtures.ts).",
		async interact(page) {
			await page
				.getByRole("button", { name: /^Week of/ })
				.last()
				.click();
		},
	},

	"edit-habit-focus-frequency": {
		feature: "HAB-16",
		route: "/edit-habit/1?focus=frequency",
		mockup: null,
		note: "Opened from an insight's 'Reschedule habit →': scrolled so Frequency is at the top.",
	},

	"reminders-empty": {
		feature: "HAB-43",
		route: "/(today)/reminders/1",
		mockup: "docs/mockups/v3/renders/settings/slice_01.png",
		note: "R1 — no times: the empty state with one Add time. Data differs from the frame (Evening walk, not Upper body).",
	},
	"reminders-times": {
		feature: "HAB-43",
		route: "/(today)/reminders/1?fixtures=reminders-times",
		mockup: "docs/mockups/v3/renders/settings/slice_01.png",
		note: "R2 — two times with their own days (07:00 Tue, Thu · 18:30 Thu), the red remove on the left, the hint under the card.",
	},
	"reminders-removed": {
		feature: "HAB-43",
		route: "/(today)/reminders/1?fixtures=reminders-times",
		mockup: "docs/mockups/v3/renders/settings/slice_02.png",
		note: "R3 — 18:30 removed: the row is gone at once and the toast says so with Undo.",
		async interact(page) {
			await page.getByLabel("Remove reminder at 18:30").click();
			await page.getByText("Reminder at 18:30 removed").waitFor();
			await page.waitForTimeout(300);
		},
	},
	"reminders-sheet": {
		feature: "HAB-43",
		route: "/(today)/reminders/1?fixtures=reminders-times",
		mockup: "docs/mockups/v3/renders/settings/slice_02.png",
		note: "R3 sheet — tapping a time opens the sheet with its time and days (the frame's Add sheet is R4, Later). Web shows a static read-out where iOS has the wheel.",
		async interact(page) {
			await page.getByLabel("07:00, Tue, Thu").click();
			await page.getByText("Save time").waitFor();
			await page.waitForTimeout(300);
		},
	},
	"reminders-denied": {
		feature: "HAB-43",
		route: "/(today)/reminders/1?fixtures=reminders-times-denied",
		mockup: "docs/mockups/v3/renders/settings/slice_03.png",
		note: "R5 — notifications off: the warning banner with Open Settings above the times, which stay editable.",
	},
	"reminders-at-cap": {
		feature: "HAB-43",
		route: "/(today)/reminders/1?fixtures=reminders-at-cap",
		mockup: null,
		note: "Four times: no +, the cap note under the card; a time stored as off says Off; the habit is daily so no warning.",
	},

	// Clock = the mockup's Friday 23 October.
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
		note: "H6 — no habits: the empty state with Add habit and Browse suggestions, Categories still reachable.",
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
	"archive-confirm": {
		feature: "HAB-45",
		route: "/(today)/habit/3?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/sheets/slice_03.png",
		clock: V3_FRIDAY,
		note: "DC5 / H8 — Archive habit from Detail: one tap, Archive habit as the primary and Cancel under it, and what archiving keeps. The sheet covers the pill.",
		async interact(page) {
			await page.getByRole("button", { name: /^Archive habit/ }).click();
			await detailToTop(page);
		},
	},
	"delete-confirm": {
		feature: "HAB-45",
		route: "/(today)/habit/5?fixtures=habits-v3",
		mockup: "docs/mockups/v3/renders/sheets/slice_01.png",
		clock: V3_FRIDAY,
		note: "DC1 — Delete Read 20 min?: names its 214 logs, Archive instead first (the default focus), Delete permanently as an outlined red pill, its hint, then Cancel. No Close.",
		async interact(page) {
			await page.getByRole("button", { name: /^Delete habit/ }).click();
			await detailToTop(page);
		},
	},
	"delete-confirm-archived": {
		feature: "HAB-45",
		route: "/(today)/habit/8?fixtures=habits-v3",
		mockup: null,
		clock: V3_FRIDAY,
		note: "An already-archived habit: no Archive instead and no claim that archiving keeps anything — just Delete permanently and Cancel. No frame draws this.",
		async interact(page) {
			await page.getByRole("button", { name: /^Delete habit/ }).click();
			await detailToTop(page);
		},
	},
	"delete-deleting": {
		feature: "HAB-45",
		route: "/(today)/habit/5?fixtures=habits-v3&slowWrites=1",
		mockup: "docs/mockups/v3/renders/sheets/slice_02.png",
		clock: V3_FRIDAY,
		note: "DC3 — the delete is running (a write that never finishes): 'Deleting…', 'Keep the app open — this takes a moment.', Cancel disabled, the sheet cannot be swiped away.",
		async interact(page) {
			await page.getByRole("button", { name: /^Delete habit/ }).click();
			await page.getByText("Delete permanently").click();
			await page.getByText("Deleting…").waitFor();
			await detailToTop(page);
		},
	},
	"delete-failed": {
		feature: "HAB-45",
		route: "/(today)/habit/5?fixtures=habits-v3&failWrites=1",
		mockup: "docs/mockups/v3/renders/sheets/slice_02.png",
		clock: V3_FRIDAY,
		note: "DC4 — the delete failed: an alert banner in the sheet, 'Nothing was changed. Try again.', and Delete permanently is still there.",
		async interact(page) {
			await page.getByRole("button", { name: /^Delete habit/ }).click();
			await page.getByText("Delete permanently").click();
			await page.getByText("Couldn’t delete").waitFor();
			await detailToTop(page);
		},
	},
	"delete-confirm-ax": {
		feature: "HAB-49",
		route: "/(today)/habit/5?fixtures=habits-v3&textSize=ax",
		mockup: "docs/mockups/v3/renders/sheets/slice_04.png",
		clock: V3_FRIDAY,
		note: "DC7 — AX3: the labels wrap inside their buttons and the buttons grow; the hint is read by VoiceOver instead of shown.",
		async interact(page) {
			await page.getByRole("button", { name: /^Delete habit/ }).click();
			await detailToTop(page);
		},
	},

	settings: {
		feature: "HAB-44",
		route: "/(habits)/settings?fixtures=settings",
		mockup: "docs/mockups/v3/renders/settings/slice_03.png",
		note: "S1 — the hub: Appearance (Theme · System), Reminders (Evening review · Off, Notifications · Allowed), Streaks (Freezes · 1 left), Data (Export data · JSON, CSV), About (version). Icon square, title, grey value and chevron on every row; one page per row.",
		async interact(page) {
			await untilTitled(page, "Settings");
		},
	},
	"settings-appearance": {
		feature: "HAB-44",
		route: "/(habits)/settings/appearance?fixtures=settings",
		mockup: "docs/mockups/v3/renders/settings/slice_04.png",
		note: "S2 — Appearance: Light, Dark, System (Follows iOS, checked) and the Monday and text-size note.",
		async interact(page) {
			await untilTitled(page, "Appearance");
		},
	},
	"settings-evening-review": {
		feature: "HAB-44",
		route: "/(habits)/settings/evening-review?fixtures=settings",
		mockup: "docs/mockups/v3/renders/settings/slice_04.png",
		note: "S3 — Evening review with notifications allowed: the switch, Time ›, 'Sent only on days with open habits.'",
		async interact(page) {
			await untilTitled(page, "Evening review");
		},
	},
	"settings-evening-review-off": {
		feature: "HAB-44",
		route:
			"/(habits)/settings/evening-review?fixtures=settings-notifications-off",
		mockup: "docs/mockups/v3/renders/settings/slice_04.png",
		note: "S3 — Evening review with iOS notifications off: the amber banner first, directly under the title, then the switch (still on) and Time.",
		async interact(page) {
			await untilTitled(page, "Evening review");
		},
	},
	"settings-notifications": {
		feature: "HAB-44",
		route: "/(habits)/settings/notifications?fixtures=settings",
		mockup: null,
		note: "Notifications with iOS allowing them (not drawn): the state in words and a way to iOS Settings.",
		async interact(page) {
			await untilTitled(page, "Notifications");
		},
	},
	"settings-notifications-off": {
		feature: "HAB-44",
		route:
			"/(habits)/settings/notifications?fixtures=settings-notifications-off",
		mockup: "docs/mockups/v3/renders/states/slice_12.png",
		note: "SY6 — Notifications with iOS permission off: one banner with Open Settings at the top, Affected ('4 times on 3 habits', the evening review), 'Times stay editable…'. The banner appears once.",
		async interact(page) {
			await untilTitled(page, "Notifications");
		},
	},
	"settings-freezes": {
		feature: "HAB-44",
		route: "/(habits)/settings/freezes?fixtures=settings",
		mockup: "docs/mockups/v3/renders/settings/slice_05.png",
		note: "S4 — Freezes: Left and Used (this month) stat cards, the rule and how to use one. Not drawn from S4: the Saved card (needs PR-08) and Auto-use freezes (Later).",
		async interact(page) {
			await untilTitled(page, "Freezes");
		},
	},
	"settings-about": {
		feature: "HAB-44",
		route: "/(habits)/settings/about?fixtures=settings",
		mockup: "docs/mockups/v3/renders/settings/slice_06.png",
		note: "S6 — About: Version and Copy diagnostics tapped, the toast says 'Diagnostics copied', no Undo. Privacy and Send feedback are not built (no address).",
		async interact(page) {
			await untilTitled(page, "About");
			await page
				.context()
				.grantPermissions(["clipboard-read", "clipboard-write"]);
			await page.getByText("Copy diagnostics").click();
			await page
				.getByText(/iagnostics/)
				.last()
				.waitFor();
			await page.waitForTimeout(300);
		},
	},
	"settings-ax": {
		feature: "HAB-44",
		route: "/(habits)/settings?fixtures=settings&textSize=ax",
		mockup: "docs/mockups/v3/renders/settings/slice_06.png",
		note: "S7 — the hub at AX3: rows stack (icon, title, value under it), the title block stacks.",
		async interact(page) {
			await untilTitled(page, "Settings");
		},
	},
	"settings-explicit-over-os": {
		feature: "HAB-44",
		route: "/(habits)/settings?fixtures=settings&theme=dark",
		mockup: null,
		colorScheme: "light",
		note: "Explicit Dark while the emulated OS is light: the app must draw dark.",
		async interact(page) {
			await untilTitled(page, "Settings");
		},
	},
	"export-choose": {
		feature: "HAB-44",
		route: "/(habits)/settings?fixtures=settings",
		mockup: "docs/mockups/v3/renders/states/slice_04.png",
		note: "EX1 — Export data: JSON picked, the line on what each is for, 'Export JSON'. Opened from Settings; Progress opens the same sheet (export-from-progress).",
		async interact(page) {
			await page.getByText("Export data", { exact: true }).click();
			await page.getByText("Export JSON").waitFor();
		},
	},
	"export-from-progress": {
		feature: "HAB-44",
		route: `${PROGRESS}progress-v3`,
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/states/slice_04.png",
		note: "EX1 from Progress › Export: the same sheet over the Progress tab, as the frame draws it.",
		async interact(page) {
			// The collapsed inline bar carries a second, inert Export: the header's is the last.
			await page.getByLabel("Export data", { exact: true }).last().click();
			await page.getByText("Export JSON").waitFor();
		},
	},
	"export-progress": {
		feature: "HAB-44",
		route: "/(habits)/settings?fixtures=settings",
		mockup: "docs/mockups/v3/renders/states/slice_05.png",
		note: "EX2 — writing: the file's name with a percentage, the format locked, 'Exporting…'. The page slows setTimeout(0) so the ~1s export is still running when captured.",
		async interact(page) {
			await page.getByText("Export data", { exact: true }).click();
			await page.evaluate(() => {
				const original = window.setTimeout;
				window.setTimeout = (fn, ms, ...args) =>
					original(fn, ms === 0 ? 900 : ms, ...args);
			});
			await page.getByText("Export JSON").click();
			await page.getByText("Exporting…").waitFor();
			await page.waitForTimeout(1200);
		},
	},
	"export-ready": {
		feature: "HAB-44",
		route: "/(habits)/settings?fixtures=settings",
		mockup: "docs/mockups/v3/renders/states/slice_05.png",
		note: "EX3 — ready: the file card with size and counts, Share file, Done, the temporary-file note.",
		async interact(page) {
			await page.getByText("Export data", { exact: true }).click();
			await page.getByText("Export JSON").click();
			await page.getByText("Share file").waitFor();
		},
	},
	"export-failed": {
		feature: "HAB-44",
		route: "/(habits)/settings?fixtures=export-fails",
		mockup: "docs/mockups/v3/renders/states/slice_05.png",
		note: "EX4 — failed on storage: the reason first, 'Nothing was changed', Retry primary, Cancel.",
		async interact(page) {
			await page.getByText("Export data", { exact: true }).click();
			await page.getByText("Export JSON").click();
			await page.getByText("Export failed").waitFor();
		},
	},

	// Failure states. Reached only through the web fixtures
	// (`?fixtures=migration-fails`, `?failWrites=1`), never a route or button in the app.
	"error-screen-migration-failed": {
		feature: "HAB-47",
		route: "/?fixtures=migration-fails",
		mockup: "docs/mockups/v3/renders/states/slice_11.png",
		note: "SY4 — an update that failed: as they were, a banner saying nothing was changed, Try again, Copy diagnostics. The frame's 'Stopped at step 2 of 3' is not built (the migrator has no steps).",
	},
	"error-screen-migration-failed-dark": {
		feature: "HAB-47",
		route: "/?fixtures=migration-fails",
		mockup: null,
		colorScheme: "dark",
		note: "Same, dark.",
	},
	"error-screen-first-open-failed": {
		feature: "HAB-47",
		route: "/?fixtures=migration-fails-first-open",
		mockup: null,
		note: "The database could not be prepared with nothing to update: the plain open-failure words, no banner.",
	},
	"migration-running": {
		feature: "HAB-47",
		route: "/?fixtures=migration-running",
		mockup: "docs/mockups/v3/renders/states/slice_10.png",
		note: "SY3 — an update is running: an indeterminate bar (the frame's 'Step 2 of 3 · 64%' is not built; the migrator has no progress). Captured with Reduce Motion, so the segment rests at the left end.",
		async interact(page) {
			await page.emulateMedia({ reducedMotion: "reduce" });
			await page.waitForTimeout(500);
		},
	},
	"today-loading": {
		feature: "HAB-47",
		route: "/?fixtures=today-loading",
		mockup: "docs/mockups/v3/renders/states/slice_09.png",
		clock: V3_FRIDAY,
		note: "SY1 — the real header at once, skeleton rows after 300 ms (captured after 700 ms).",
		async interact(page) {
			// Reduce Motion: the frame's skeleton is still, and the pulse would
			// make every capture a different frame of its loop.
			await page.emulateMedia({ reducedMotion: "reduce" });
			await page.getByTestId("today-skeleton").waitFor({ state: "attached" });
			await page.waitForTimeout(400);
		},
	},
	"today-rollover": {
		feature: "HAB-47",
		route: "/?fixtures=today-v3",
		mockup: "docs/mockups/v3/renders/states/slice_11.png",
		clock: "2026-10-23T23:59:45",
		note: "SY5 — the app stayed open across midnight: Today is Saturday, with the banner summing up Friday (the page clock starts 15 s before midnight and crosses it while the state waits).",
		async interact(page) {
			await page.getByText(/closed at midnight/).waitFor({ timeout: 40000 });
			await page.waitForTimeout(300);
		},
	},
	"today-load-error": {
		feature: "HAB-47",
		route: "/?fixtures=today-load-fails",
		mockup: "docs/mockups/v3/renders/states/slice_10.png",
		clock: V3_FRIDAY,
		note: "SY2 — Today could not read its habits: the header and the tab bar stay; Try again and Copy diagnostics.",
		ignoreErrors: [/Simulated load failure/, /The above error occurred/],
		async interact(page) {
			// React logs a handled render error, and the dev LogBox draws a toast for
			// it over the pill. That toast is the dev tooling, not the app: hide it.
			const toast = page.getByText(/Simulated load failure/).first();
			await toast.waitFor({ state: "attached", timeout: 4000 }).catch(() => {});
			await toast
				.evaluate((el) => {
					for (let node = el; node; node = node.parentElement) {
						const { position } = getComputedStyle(node);
						if (position === "fixed" || position === "absolute") {
							node.style.display = "none";
							return;
						}
					}
				})
				.catch(() => {});
			await page.waitForTimeout(200);
		},
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
	// The navigation shell: the floating pill and the layout rules that come with it.
	// The pill is in every other baseline too; these are the frames the spec draws it in.
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
	"progress-year-insight": {
		feature: "HAB-38",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/progress/slice_06.png",
		clock: V3_FRIDAY,
		note: "P12 — Year's best-month insight: the long sentence wraps inside its card, never past the right edge.",
		async interact(page) {
			await showRange(page, "Year");
			await page.waitForTimeout(400);
			await assertInsightsWrap(page);
		},
	},
	"progress-year-insight-ax": {
		feature: "HAB-49",
		route: `${PROGRESS}progress-v3&textSize=ax`,
		mockup: "docs/mockups/v3/renders/progress/slice_08.png",
		clock: V3_FRIDAY,
		note: "Year's insight at AX3: it wraps inside its card.",
		async interact(page) {
			await page.getByTestId("segmented-collapsed").click();
			await page.getByRole("tab", { name: "Year" }).click();
			await page.waitForTimeout(500);
			await assertInsightsWrap(page);
		},
	},
	"progress-week-sticky": {
		feature: "HAB-34",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/progress/slice_06.png",
		clock: V3_FRIDAY,
		note: "Week scrolled so the range switcher is pinned: no hairline above it, one below the block, air around the control, Export clear of the bar's edges.",
		async interact(page) {
			await scrollProgress(page, 500);
			await assertStickyHeaderClear(page);
		},
	},
	"progress-month-sticky": {
		feature: "HAB-36",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/progress/slice_06.png",
		clock: V3_FRIDAY,
		note: "Month scrolled with the switcher pinned: same sticky block.",
		async interact(page) {
			await showRange(page, "Month");
			await scrollProgress(page, 500);
			await assertStickyHeaderClear(page);
		},
	},
	"progress-year-sticky": {
		feature: "HAB-37",
		route: `${PROGRESS}progress-v3`,
		mockup: "docs/mockups/v3/renders/progress/slice_06.png",
		clock: V3_FRIDAY,
		note: "Year scrolled with the switcher pinned: same sticky block.",
		async interact(page) {
			await showRange(page, "Year");
			await scrollProgress(page, 500);
			await assertStickyHeaderClear(page);
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

	// Today UI. Clock = the mockup's Friday 23 October.
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
	"today-v3-strip-browsed": {
		feature: "HAB-30",
		route: "/?fixtures=today-v3",
		clock: V3_FRIDAY,
		mockup: "docs/mockups/v3/renders/today/slice_04.png",
		note: "T10 — swipe the strip back a week (it selects the same weekday there), tap another day, scroll: the strip is still on screen at full opacity and every day is a labelled button.",
		async interact(page) {
			const box = await page.getByTestId("week-strip").boundingBox();
			const y = box.y + box.height / 2;
			// A real touch drag: the strip's swipe is a PanResponder, which a synthetic mouse drag does not start.
			const cdp = await page.context().newCDPSession(page);
			const touch = (type, x) =>
				cdp.send("Input.dispatchTouchEvent", {
					type,
					touchPoints: type === "touchEnd" ? [] : [{ x, y }],
				});
			await touch("touchStart", box.x + 60);
			for (let step = 1; step <= 10; step += 1) {
				await touch("touchMove", box.x + 60 + step * 20);
			}
			await touch("touchEnd", 0);
			await page.getByText(/^Logging for Fri 16 Oct/).waitFor();
			await page.getByLabel(/^Wednesday 14 October/).click();
			await page.getByText(/^Logging for Wed 14 Oct/).waitFor();
			await page.waitForTimeout(500);
			// An exact offset, past the collapse range: a wheel's travel varies with timing.
			await page.evaluate(() => {
				const scroller = document.querySelector('[data-testid="today-scroll"]');
				scroller?.scrollTo(0, 120);
			});
			await page.waitForTimeout(1200);
			await page.evaluate(() => {
				const scroller = document.querySelector('[data-testid="today-scroll"]');
				scroller?.scrollTo(0, 120);
			});
			await page.waitForTimeout(600);
			await assertStripShown(page);
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
			await page.getByLabel(/^Wednesday 21 October/).click();
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
			await page.getByLabel(/^Wednesday 21 October/).click();
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
		async interact(page) {
			await page
				.getByRole("button", { name: /^Week of/ })
				.last()
				.click();
			const circle = page.getByRole("button", { name: "Mobility, not done" });
			await circle.scrollIntoViewIfNeeded();
			await circle.click();
			await page.getByText(/logged for/).waitFor();
			await page.waitForTimeout(300);
		},
	},
};

const DARK_TWINS = [
	"suggestions-end",
	"first-run-ax",
	"first-run-habit-ax",
	"suggestions-ax",
	"today-rollover",
	"error-screen-first-open-failed",
	"migration-running",
	"today-loading",
	"today-load-error",
	"suggestions",
	"suggestions-added",
	"first-run-suggestions",
	"first-run",
	"first-run-habit",
	"first-run-offer",
	"first-run-skipped",
	"today",
	"today-v3",
	"today-v3-quantity-plus-one",
	"today-v3-scrolled",
	"today-v3-collapsing",
	"today-v3-strip-browsed",
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
	"habit-detail-history",
	"habit-detail-new",
	"habit-detail-archived",
	"habit-detail-restored",
	"habit-detail-reset",
	"habit-detail-break",
	"habit-detail-ax",
	"archive-confirm",
	"delete-confirm",
	"delete-confirm-archived",
	"delete-deleting",
	"delete-failed",
	"delete-confirm-ax",
	"add-category-empty",
	"categories-list",
	"categories-reorder",
	"categories-rename-duplicate",
	"categories-add",
	"categories-delete-in-use",
	"categories-delete-unused",
	"categories-delete-undo",
	"categories-empty-custom",
	"new-habit-near-limit",
	"form-new-empty",
	"form-new-filled",
	"form-new-quantity",
	"form-new-per-week",
	"form-new-break",
	"form-new-specific-days",
	"form-new-errors",
	"form-new-errors-end",
	"form-new-errors-end-ax",
	"form-edit-discard",
	"form-edit",
	"form-new-ax",
	"form-new-suggestion",
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
	"progress-year-insight",
	"progress-year-insight-ax",
	"progress-week-sticky",
	"progress-month-sticky",
	"progress-year-sticky",
	"progress-year-too-early",
	"progress-year-one-habit",
	"progress-year-ax",
	"progress-month-end",
	"progress-habit-picker",
	"progress-habit-picker-one",
	"progress-month-edit-day",
	"progress-week-edit-day",
	"reminders-empty",
	"reminders-times",
	"reminders-removed",
	"reminders-sheet",
	"reminders-denied",
	"reminders-at-cap",
	"settings",
	"settings-appearance",
	"settings-evening-review",
	"settings-evening-review-off",
	"settings-notifications",
	"settings-notifications-off",
	"settings-freezes",
	"settings-about",
	"settings-ax",
	"export-choose",
	"export-from-progress",
	"export-progress",
	"export-ready",
	"export-failed",
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
 * Every screen that renders a habit name, re-run with `longNames=1`
 * (src/modules/habits/dev/habit-fixtures.ts): the first two habits get a 40-character name
 * (over today's 32 cap) and one at exactly 32, to catch bad truncation or wrapping.
 */
const LONG_NAME_TWINS = [
	"today",
	"retro-log",
	"reminders-at-cap",
	"reminders-times",
	"habits-tab",
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

/**
 * Detail and its delete sheet with a long name. The Habits frames' habits
 * are not the fixture's first two, so these point at one that is: Drink water.
 */
const LONG_DETAIL = "/(today)/habit/1?fixtures=habits-v3&longNames=1";
SCREENS["habit-detail-long-names"] = {
	...SCREENS["habit-detail"],
	feature: "HAB-22",
	route: LONG_DETAIL,
	mockup: null,
	note: "habit-detail with a 40-char V1 name (HAB-22): the title wraps to two lines, then truncates.",
};
SCREENS["delete-confirm-long-names"] = {
	...SCREENS["delete-confirm"],
	feature: "HAB-22",
	route: LONG_DETAIL,
	mockup: null,
	note: "delete-confirm with a 40-char V1 name (HAB-22): the title and the consequence wrap inside the sheet.",
};

/**
 * Dynamic Type. Every screen and sheet that had no accessibility-size state, re-run with
 * `?textSize=ax` (src/lib/dev-text-size) in light and dark. The screens that already had
 * one (`*-ax`) are above. Each takes the base state's route and its interaction unchanged,
 * so a sheet or toast is opened the same way.
 */
const AX_VARIANTS = [
	[
		"quantity-sheet-stepper",
		"QS4 — the quantity sheet at AX3: stepper, chips one per line, Done pinned.",
	],
	["quantity-sheet-exact", "The exact-value pad at AX3."],
	["streak-at-risk", "SR1 at AX3: title, body, and the two actions stacked."],
	["retro-log", "RL1 (Edit this day) at AX3 as a full-height scrolling sheet."],
	["rest-day-picker", "The off-schedule picker at AX3."],
	["today-empty", "T2 at AX3."],
	["today-v3-rest", "T3 (rest day) at AX3."],
	["today-v3-at-risk", "T4 (a row at risk) at AX3."],
	["today-v3-all-done", "T7 (all done) at AX3."],
	[
		"today-rollover",
		"SY5 (midnight rollover banner) at AX3: the Dismiss button drops under the text.",
	],
	["today-load-error", "SY2 (load error) at AX3."],
	["today-loading", "SY1 (skeleton) at AX3."],
	["migration-running", "SY3 at AX3."],
	["error-screen-migration-failed", "SY4 at AX3."],
	["first-run-offer", "FR3 at AX3: the alert's buttons stack, 16 pt insets."],
	["form-edit-discard", "F9 'Discard changes?' at AX3."],
	["form-new-errors", "New habit with errors at AX3."],
	["categories-list", "C1 at AX3."],
	["categories-rename-editing", "C3 (rename) at AX3."],
	["categories-delete-in-use", "C5 at AX3."],
	["add-category-typing", "The New category sheet at AX3."],
	["reminders-times", "R2 at AX3."],
	[
		"reminders-sheet",
		"The reminder sheet (time wheel, weekday chips one per line) at AX3.",
	],
	["reminders-denied", "SY6 banner at AX3."],
	["habits-search", "H4 (search) at AX3."],
	["habits-archived", "H5 (archived section open) at AX3."],
	["habits-reorder", "H9 (reorder mode) at AX3."],
	["habit-detail-history", "D2 (history) at AX3."],
	["habit-detail-archived", "NEW-13 (archived banner) at AX3."],
	["archive-confirm", "DC4 at AX3."],
	["delete-confirm-archived", "DC5 at AX3."],
	["export-choose", "EX1 at AX3."],
	["export-failed", "EX4 at AX3."],
	[
		"error-toast-today",
		"A toast at AX3: wraps, the action drops below the copy.",
	],
	["tab-bar-toast", "A toast over bar A at AX3."],
	["settings-notifications-off", "SY6 at AX3."],
	[
		"settings-notifications",
		"Notifications with the Hide habit names switch at AX3.",
	],
	["settings-appearance", "S2 at AX3."],
	["settings-about", "S6 at AX3: Copy diagnostics note and Privacy policy."],
	["settings-evening-review-off", "S3 with the banner at AX3."],
	["settings-freezes", "S4 at AX3: the stat cards stack one per row."],
	["export-ready", "EX3 at AX3."],
];
for (const [name, note] of AX_VARIANTS) {
	const base = SCREENS[name];
	if (!base) throw new Error(`AX variant of unknown state ${name}`);
	const [path, query = ""] = base.route.split("?");
	const params = new URLSearchParams(query);
	params.set("textSize", "ax");
	for (const dark of [false, true]) {
		SCREENS[`${name}-ax${dark ? "-dark" : ""}`] = {
			...base,
			feature: "HAB-49",
			route: `${path}?${params}`,
			mockup: null,
			colorScheme: dark ? "dark" : (base.colorScheme ?? "light"),
			note: dark ? `${note} Dark.` : note,
		};
	}
}

// The Progress range control collapses to a list at AX sizes, and the week matrix
// becomes one block of day buttons per habit, so these two states are opened through
// those controls rather than the standard ones.
for (const dark of [false, true]) {
	const suffix = dark ? "-dark" : "";
	SCREENS[`progress-habit-picker-ax${suffix}`] = {
		...SCREENS["progress-habit-picker"],
		feature: "HAB-49",
		route: `${PROGRESS}progress-v3&textSize=ax`,
		mockup: null,
		colorScheme: dark ? "dark" : "light",
		note: `HP1 at AX3: the habit filter sheet.${dark ? " Dark." : ""}`,
		async interact(page) {
			await page.getByTestId("segmented-collapsed").click();
			await page.getByRole("tab", { name: "Year" }).click();
			await page.waitForTimeout(400);
			await page.getByTestId("habit-filter-chip").click();
			await page.waitForTimeout(500);
		},
	};
	SCREENS[`progress-week-edit-day-ax${suffix}`] = {
		...SCREENS["progress-week-edit-day"],
		feature: "HAB-49",
		route: `${PROGRESS}progress-v3&textSize=ax`,
		mockup: null,
		colorScheme: dark ? "dark" : "light",
		note: `RL2 at AX3: Edit this day from a week block's day cell.${dark ? " Dark." : ""}`,
		async interact(page) {
			await page
				.getByRole("button", { name: /^Wed, / })
				.first()
				.click();
			await page.waitForTimeout(600);
		},
	};
}
