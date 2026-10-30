import type {
	CompletionRate,
	HeatmapDay,
	HistoryRow,
	LongestStreak,
} from "../domain/habit-history";
import { builtInCategory, makeHabit } from "../test-support/habit-builder";
import type { Reminder } from "../types";
import {
	detailEyebrow,
	detailHeaderLabel,
	detailRemindersLabel,
	detailRemindersValue,
	detailTiles,
	gridLegend,
	gridRangeLabel,
	historyRowView,
	resetNotice,
	weekRows,
} from "./habit-detail-presenter";

const upper = makeHabit({
	name: "Upper body",
	category: builtInCategory("Fitness"),
	frequency: { type: "weekdays", days: [2, 4] },
});
const water = makeHabit({
	name: "Drink water",
	category: builtInCategory("Health"),
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});
const phone = makeHabit({
	name: "No phone in bed",
	category: builtInCategory("Home"),
	direction: "break",
});

describe("the title block (D1, D3, D4, D7)", () => {
	it("eyebrow: category, cadence and target, Break and Archived where they apply", () => {
		expect(detailEyebrow(upper)).toBe("Fitness · Tue, Thu");
		expect(detailEyebrow(water)).toBe("Health · Daily · 8 glasses");
		expect(detailEyebrow(phone)).toBe("Home · Break · Daily");
		expect(
			detailEyebrow(
				makeHabit({
					category: builtInCategory("Fitness"),
					frequency: { type: "weekdays", days: [1, 3, 5] },
					archivedAt: new Date(2026, 9, 12),
				}),
			),
		).toBe("Fitness · Mon, Wed, Fri · Archived");
	});

	it("VoiceOver reads the name as a heading, then the category and the days in words", () => {
		expect(detailHeaderLabel(upper)).toBe(
			"Upper body, heading. Fitness, Tuesday and Thursday.",
		);
		expect(detailHeaderLabel(water)).toBe(
			"Drink water, heading. Health, daily, 8 glasses.",
		);
		expect(detailHeaderLabel(phone)).toBe(
			"No phone in bed, heading. Home, break, daily.",
		);
	});
});

describe("the three tiles", () => {
	const rate = (overrides: Partial<CompletionRate> = {}): CompletionRate => ({
		completed: 80,
		scheduled: 90,
		frozen: 0,
		fraction: 80 / 90,
		skippedPaused: false,
		...overrides,
	});
	const longest = (days: number): LongestStreak => ({
		days,
		endedOn: days > 0 ? new Date(2026, 9, 1) : null,
	});
	const input = (overrides: Record<string, unknown> = {}) => ({
		habit: upper,
		currentStreak: 9,
		longest: longest(14),
		rate: rate({ completed: 80, scheduled: 90, fraction: 0.89 }),
		rateDelta: 4,
		freezesRemaining: 2,
		streakReset: null,
		hasEntries: true,
		freshStart: false,
		...overrides,
	});

	it("D1: streak, longest and the 90-day rate with its change", () => {
		const [streak, best, ninety] = detailTiles(input());
		expect(streak).toMatchObject({
			label: "Streak",
			value: "9",
			caption: "in a row",
		});
		expect(best).toMatchObject({
			label: "Longest",
			value: "14",
			caption: "days",
		});
		expect(ninety).toMatchObject({
			label: "90-day rate",
			value: "89%",
			caption: "+4 pts",
		});
	});

	it("a falling rate says so with a real minus", () => {
		expect(detailTiles(input({ rateDelta: -3 }))[2].caption).toBe("−3 pts");
		expect(detailTiles(input({ rateDelta: 0 }))[2].caption).toBe("no change");
	});

	it("without a change to show the rate says how many days it is made of", () => {
		expect(
			detailTiles(
				input({
					rateDelta: null,
					rate: rate({ completed: 78, scheduled: 90, fraction: 0.87 }),
				}),
			)[2].caption,
		).toBe("78 of 90 days");
	});

	it("D3: a new habit says when each tile starts", () => {
		const tiles = detailTiles(
			input({
				currentStreak: 0,
				longest: longest(0),
				rate: rate({ completed: 0, scheduled: 0, fraction: null }),
				rateDelta: null,
				hasEntries: false,
			}),
		);
		expect(tiles.map((tile) => [tile.value, tile.caption, tile.muted])).toEqual(
			[
				["0", "starts with your first log", true],
				["—", "none yet", true],
				["—", "after 7 days", true],
			],
		);
	});

	it("a habit with fewer than seven due days has no rate yet", () => {
		expect(
			detailTiles(
				input({ rate: rate({ completed: 3, scheduled: 4, fraction: 0.75 }) }),
			)[2],
		).toMatchObject({ value: "—", caption: "after 7 days" });
	});

	it("D4: archived — the streak is paused, and the rate runs until the archive date", () => {
		const archived = makeHabit({
			frequency: { type: "weekdays", days: [1, 3, 5] },
			archivedAt: new Date(2026, 9, 12),
		});
		const [streak, , ninety] = detailTiles(
			input({
				habit: archived,
				longest: longest(41),
				rate: rate({ completed: 70, scheduled: 90, fraction: 0.78 }),
			}),
		);
		expect(streak).toMatchObject({ value: "—", caption: "paused" });
		expect(ninety).toMatchObject({ value: "78%", caption: "until 12 Oct" });
	});

	it("D5: restored — a fresh start, and the rate says paused days are excluded", () => {
		const [streak, , ninety] = detailTiles(
			input({
				currentStreak: 0,
				freshStart: true,
				longest: longest(41),
				rate: rate({
					completed: 70,
					scheduled: 90,
					fraction: 0.78,
					skippedPaused: true,
				}),
			}),
		);
		expect(streak).toMatchObject({ value: "0", caption: "fresh start" });
		expect(ninety).toMatchObject({
			value: "78%",
			caption: "paused days excluded",
		});
	});

	it("D6: in the month a streak reset with no freezes left, the third tile is the amber freeze count", () => {
		const [, , freezes] = detailTiles(
			input({
				freezesRemaining: 0,
				streakReset: {
					missedDate: new Date(2026, 9, 14),
					poolRefillsOn: new Date(2026, 10, 1),
				},
			}),
		);
		expect(freezes).toMatchObject({
			label: "Freezes",
			value: "0",
			caption: "0 freezes left",
			tone: "warning",
		});
	});

	it("D7: a Break habit says resisting, nights and resisted — never failed", () => {
		const [streak, best, ninety] = detailTiles(
			input({
				habit: phone,
				currentStreak: 9,
				longest: longest(22),
				rateDelta: 5,
				rate: rate({ completed: 73, scheduled: 90, fraction: 0.81 }),
			}),
		);
		expect(streak).toMatchObject({
			label: "Resisting",
			value: "9",
			caption: "nights in a row",
		});
		expect(best).toMatchObject({ value: "22", caption: "nights" });
		expect(ninety).toMatchObject({ value: "81%", caption: "resisted" });
		for (const tile of [streak, best, ninety]) {
			expect(`${tile.label} ${tile.value} ${tile.caption}`).not.toMatch(
				/fail/i,
			);
		}
	});
});

describe("the Reminders row's value", () => {
	const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
		id: 1,
		habitId: 1,
		hour: 7,
		minute: 0,
		weekdays: [2, 4],
		enabled: true,
		...overrides,
	});

	it("one reminder: its time and days (D1)", () => {
		expect(detailRemindersValue(upper, [reminder()])).toBe("07:00 · Tue, Thu");
	});

	it("an every-day reminder says daily (D6)", () => {
		expect(
			detailRemindersValue(upper, [
				reminder({ weekdays: [1, 2, 3, 4, 5, 6, 7] }),
			]),
		).toBe("07:00 · daily");
	});

	it("none says None (D3), all off says so, several count and list their times", () => {
		expect(detailRemindersValue(upper, [])).toBe("None");
		expect(detailRemindersValue(upper, [reminder({ enabled: false })])).toBe(
			"All off",
		);
		expect(
			detailRemindersValue(upper, [
				reminder(),
				reminder({ id: 2, hour: 21, weekdays: [2, 4] }),
			]),
		).toBe("2 on · 07:00, 21:00");
	});

	it("an archived habit's reminders are Paused (D4)", () => {
		expect(
			detailRemindersValue(makeHabit({ archivedAt: new Date(2026, 9, 12) }), [
				reminder(),
			]),
		).toBe("Paused");
	});
});

describe("the Reminders row, spoken (08.3)", () => {
	const one: Reminder = {
		id: 1,
		habitId: 1,
		hour: 7,
		minute: 0,
		weekdays: [2, 4],
		enabled: true,
	};

	it("'Reminders, 07:00, Tuesday and Thursday'", () => {
		expect(detailRemindersLabel(upper, [one])).toBe(
			"Reminders, 07:00, Tuesday and Thursday",
		);
	});

	it("three days read 'Monday, Wednesday and Friday'; every day reads daily", () => {
		expect(detailRemindersLabel(upper, [{ ...one, weekdays: [1, 3, 5] }])).toBe(
			"Reminders, 07:00, Monday, Wednesday and Friday",
		);
		expect(
			detailRemindersLabel(upper, [
				{ ...one, weekdays: [1, 2, 3, 4, 5, 6, 7] },
			]),
		).toBe("Reminders, 07:00, daily");
	});

	it("none, several and archived say what the row shows", () => {
		expect(detailRemindersLabel(upper, [])).toBe("Reminders, None");
		expect(
			detailRemindersLabel(upper, [one, { ...one, id: 2, hour: 21 }]),
		).toBe("Reminders, 2 on · 07:00, 21:00");
		expect(
			detailRemindersLabel(makeHabit({ archivedAt: new Date(2026, 9, 12) }), [
				one,
			]),
		).toBe("Reminders, Paused");
	});
});

function day(
	date: string,
	status: HeatmapDay["status"],
	extra: Partial<HeatmapDay> = {},
): HeatmapDay {
	const parsed = new Date(`${date}T00:00:00`);
	return {
		date: parsed,
		status,
		isToday: false,
		selectable: status !== "future" && status !== "before-start",
		...extra,
	};
}

/** A week from Mon 19 Oct 2026: Mon bonus, Tue done, Wed/Fri/Sat/Sun not scheduled, Thu pending (today), the rest future. */
const week = [
	day("2026-10-19", "bonus"),
	day("2026-10-20", "logged", { level: 3 }),
	day("2026-10-21", "not-scheduled"),
	day("2026-10-22", "pending", { isToday: true }),
	day("2026-10-23", "future"),
	day("2026-10-24", "future"),
	day("2026-10-25", "future"),
];

describe("week rows (D1)", () => {
	it("reads the whole week as one label, naming only the days that say something (08.3)", () => {
		const [row] = weekRows(upper, [week]);
		expect(row.label).toBe(
			"Week of 19 October: Monday bonus, Tuesday done, Thursday not logged yet",
		);
	});

	it("draws seven cells, decorative to VoiceOver, today ringed", () => {
		const [row] = weekRows(upper, [week]);
		expect(row.cells).toHaveLength(7);
		expect(row.cells.every((cell) => cell.hidden)).toBe(true);
		expect(row.cells.map((cell) => cell.today)).toEqual([
			false,
			false,
			false,
			true,
			false,
			false,
			false,
		]);
		expect(row.cells[0].state).toEqual({ kind: "bonus" });
		expect(row.cells[2].state).toEqual({ kind: "not-due" });
		expect(row.cells[3].state).toEqual({ kind: "nothing-logged" });
	});

	it("opens Edit this day for the latest day that is due and unlogged", () => {
		const [row] = weekRows(upper, [week]);
		expect(row.targetDate?.getDate()).toBe(22);
	});

	it("with nothing unlogged it opens the latest day that can be edited", () => {
		const done = [
			day("2026-10-12", "logged", { level: 3 }),
			day("2026-10-13", "logged", { level: 3 }),
			day("2026-10-14", "not-scheduled"),
			day("2026-10-15", "frozen"),
			day("2026-10-16", "not-scheduled"),
			day("2026-10-17", "not-scheduled"),
			day("2026-10-18", "not-scheduled"),
		];
		const [row] = weekRows(upper, [done]);
		expect(row.targetDate?.getDate()).toBe(18);
	});

	it("a week before the habit started has no target and says so", () => {
		const before = Array.from({ length: 7 }, (_, index) =>
			day(`2026-09-${String(21 + index).padStart(2, "0")}`, "before-start"),
		);
		const [row] = weekRows(upper, [before]);
		expect(row.targetDate).toBeNull();
		expect(row.label).toBe("Week of 21 September: before start");
	});

	it("a Break habit's week says resisted and slipped", () => {
		const [row] = weekRows(phone, [
			[
				day("2026-10-19", "logged", { level: 3 }),
				day("2026-10-20", "missed"),
				...week.slice(2),
			],
		]);
		expect(row.label).toContain("Monday resisted, Tuesday slipped");
	});

	it("a partial quantity day carries 'partial', and a reset day says so", () => {
		const [row] = weekRows(water, [
			[
				day("2026-10-19", "logged", { level: 2 }),
				day("2026-10-20", "reset"),
				...week.slice(2),
			],
		]);
		expect(row.label).toContain("Monday partial, Tuesday missed, streak reset");
	});
});

describe("the legend", () => {
	it("names only the states the grid shows, in the habit's words", () => {
		expect(gridLegend(upper, [week]).map((entry) => entry.label)).toEqual([
			"Done",
			"Bonus",
			"Not due",
		]);
		expect(
			gridLegend(phone, [
				[
					day("2026-10-19", "logged", { level: 3 }),
					day("2026-10-20", "missed"),
					...week.slice(2),
				],
			]).map((entry) => entry.label),
		).toEqual(["Resisted", "Slipped", "Not due"]);
	});

	it("D4: paused and reset appear when drawn", () => {
		const labels = gridLegend(upper, [
			[
				day("2026-10-19", "paused"),
				day("2026-10-20", "reset"),
				...week.slice(2),
			],
		]).map((entry) => entry.label);
		expect(labels).toContain("Paused");
		expect(labels).toContain("Reset");
	});

	it("D3: a grid of nothing but before-start has no legend", () => {
		expect(
			gridLegend(upper, [
				Array.from({ length: 7 }, (_, i) =>
					day(`2026-09-${21 + i}`, "before-start"),
				),
			]),
		).toEqual([]);
	});
});

describe("the grid card's words", () => {
	it("range: the cadence, or Created today (D3)", () => {
		const today = new Date(2026, 9, 23, 9);
		expect(gridRangeLabel(upper, today)).toBe("Tue, Thu");
		expect(gridRangeLabel(water, today)).toBe("Daily");
		expect(
			gridRangeLabel(makeHabit({ createdAt: new Date(2026, 9, 23) }), today),
		).toBe("Created today");
	});

	it("D6: the reset notice names the day and says no freezes were left", () => {
		expect(
			resetNotice({
				missedDate: new Date(2026, 9, 14),
				poolRefillsOn: new Date(2026, 10, 1),
			}),
		).toBe("Streak reset on Wed 14 Oct — no freezes were left.");
		expect(resetNotice(null)).toBeNull();
	});
});

describe("history rows (D2)", () => {
	const row = (overrides: Partial<HistoryRow>): HistoryRow => ({
		date: "2026-10-22",
		kind: "done",
		value: null,
		note: null,
		...overrides,
	});

	it("done, missed, frozen and bonus say what the day was, and never a time", () => {
		expect(historyRowView(upper, row({})).status).toBe("Done");
		expect(historyRowView(upper, row({ kind: "missed" })).status).toBe(
			"Missed",
		);
		const frozen = historyRowView(upper, row({ kind: "frozen" }));
		expect(frozen.status).toBe("Frozen · streak kept");
		expect(frozen.tone).toBe("frozen");
		const bonus = historyRowView(upper, row({ kind: "bonus" }));
		expect(bonus.status).toBe("Done · off-schedule, not counted");
		expect(bonus.tag).toBe("Bonus");
		for (const kind of ["done", "missed", "frozen", "bonus"] as const) {
			expect(historyRowView(upper, row({ kind })).status).not.toMatch(
				/\d\d:\d\d/,
			);
		}
	});

	it("titles the date as 'Thu 22 Oct' and speaks it in full", () => {
		const view = historyRowView(upper, row({}));
		expect(view.date).toBe("Thu 22 Oct");
		expect(view.accessibilityLabel).toBe("Thursday 22 October, done");
	});

	it("D7: a Break habit's days are Resisted and Slipped · not logged", () => {
		expect(historyRowView(phone, row({})).status).toBe("Resisted");
		expect(historyRowView(phone, row({ kind: "missed" })).status).toBe(
			"Slipped · not logged",
		);
	});

	it("a quantity day says how much; a quantity bonus says so too", () => {
		expect(
			historyRowView(water, row({ kind: "partial", value: 5 })).status,
		).toBe("5 of 8 glasses");
		expect(historyRowView(water, row({ kind: "bonus", value: 3 })).status).toBe(
			"3 of 8 glasses · off-schedule, not counted",
		);
	});

	it("carries the day's note, and reads it after the status", () => {
		const view = historyRowView(upper, row({ note: "Easy day" }));
		expect(view.note).toBe("Easy day");
		expect(view.accessibilityLabel).toBe("Thursday 22 October, done. Easy day");
	});

	it("a noted day with nothing else says Not logged", () => {
		expect(
			historyRowView(upper, row({ kind: "noted", note: "Rest" })).status,
		).toBe("Not logged");
	});
});
