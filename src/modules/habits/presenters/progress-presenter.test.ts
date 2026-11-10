import type {
	CalendarDay,
	MatrixCell,
	MatrixRow,
} from "../domain/progress-grid";
import { progressInsights } from "../domain/progress-insights";
import { progressUnlock } from "../domain/progress-unlock";
import {
	monthView,
	noSocial,
	PROGRESS_TODAY,
	progressHabits,
	read,
	water,
	weekView,
	yearView,
} from "../test-support/progress-views";
import {
	calendarStateOf,
	cellStateOf,
	insightProps,
	matrixCellLabel,
	matrixCellWord,
	matrixRowLabel,
	monthTiles,
	oneHabitSubline,
	unlockProps,
	weekBlocksProps,
	weekdayRunLabel,
	weekLegend,
	weekMatrixProps,
	weekStartedNote,
	weekTiles,
	yearTiles,
} from "./progress-presenter";

const dot = () => "#123456";

function ready() {
	const view = weekView();
	if (view.state !== "ready") throw new Error("expected a ready week");
	return view;
}

describe("cellStateOf", () => {
	it.each([
		[
			{ status: "done", level: 3 },
			{ kind: "level", level: 3 },
		],
		[
			{ status: "partial", level: 1 },
			{ kind: "level", level: 1 },
		],
		[
			{ status: "partial", level: 2 },
			{ kind: "level", level: 2 },
		],
		[
			{ status: "missed", level: 0 },
			{ kind: "level", level: 0 },
		],
		[{ status: "frozen", level: 0 }, { kind: "frozen" }],
		[{ status: "bonus", level: 0 }, { kind: "bonus" }],
		[{ status: "not-due", level: 0 }, { kind: "not-due" }],
		[{ status: "before-start", level: 0 }, { kind: "before-start" }],
		[{ status: "future", level: 0 }, { kind: "future" }],
		[{ status: "nothing-logged", level: 0 }, { kind: "nothing-logged" }],
		[{ status: "today", level: 0 }, { kind: "nothing-logged" }],
	] as const)("%j is drawn as %j", (cell, state) => {
		expect(cellStateOf(cell)).toEqual(state);
	});
});

describe("calendarStateOf", () => {
	const day = (overrides: Partial<CalendarDay>): CalendarDay => ({
		date: new Date(2026, 9, 14),
		key: "2026-10-14",
		isToday: false,
		status: "level",
		level: 2,
		notch: true,
		perfect: false,
		done: 2,
		due: 3,
		frozen: 0,
		...overrides,
	});

	it("maps every calendar status to a cell", () => {
		expect(calendarStateOf(day({}))).toEqual({ kind: "level", level: 2 });
		expect(calendarStateOf(day({ status: "missed", level: 0 }))).toEqual({
			kind: "level",
			level: 0,
		});
		expect(calendarStateOf(day({ status: "frozen" }))).toEqual({
			kind: "frozen",
		});
		expect(calendarStateOf(day({ status: "rest" }))).toEqual({
			kind: "not-due",
		});
		expect(calendarStateOf(day({ status: "open" }))).toEqual({
			kind: "nothing-logged",
		});
		expect(calendarStateOf(day({ status: "nothing-logged" }))).toEqual({
			kind: "nothing-logged",
		});
		expect(calendarStateOf(day({ status: "future" }))).toEqual({
			kind: "future",
		});
		expect(calendarStateOf(day({ status: "before-start" }))).toEqual({
			kind: "before-start",
		});
	});
});

describe("the week matrix (P1)", () => {
	const view = ready();
	const rowOf = (name: string): MatrixRow => {
		const row = view.grid.rows.find((r) => r.habit.name === name);
		if (!row) throw new Error(name);
		return row;
	};

	it("says what each cell is, in words: Break habits resist and slip (D8)", () => {
		const resting = rowOf("No social media");
		expect(matrixCellWord(resting, resting.cells[0])).toBe("resisted");
		const slip: MatrixCell = { ...resting.cells[0], status: "missed" };
		expect(matrixCellWord(resting, slip)).toBe("slipped");
		const reading = rowOf("Read 20 min");
		expect(matrixCellWord(reading, reading.cells[2])).toBe("missed");
		expect(matrixCellWord(reading, reading.cells[3])).toBe("frozen");
		expect(matrixCellWord(reading, reading.cells[4])).toBe("not logged yet");
		expect(matrixCellWord(reading, reading.cells[5])).toBe("upcoming");
	});

	it("gives a partial quantity day its percentage, always", () => {
		const row = rowOf("Drink water");
		const partial: MatrixCell = {
			...row.cells[0],
			status: "partial",
			level: 2,
			value: 6,
		};
		const target: MatrixRow = {
			...row,
			habit: { ...row.habit, targetAmount: 10 },
		};
		expect(matrixCellWord(target, partial)).toBe("partial 60 percent");
		expect(matrixCellWord(row, { ...partial, value: undefined })).toBe(
			"partial 75 percent",
		);
	});

	it("labels one cell like 'Mon, done'", () => {
		const row = rowOf("Drink water");
		expect(matrixCellLabel(row, row.cells[0])).toBe("Mon, done");
	});

	it("reads a row as one stop: the habit, its total, then every weekday", () => {
		const label = matrixRowLabel(rowOf("Read 20 min"));
		expect(
			label.startsWith("Read 20 min, 2 of 7. Monday, done. Tuesday, done."),
		).toBe(true);
		expect(label).toContain("Wednesday, missed");
		expect(label).toContain("Thursday, frozen");
	});

	it("builds the matrix: M…S letters, today bold, totals 'n/target', met rows marked", () => {
		const onEditDay = jest.fn();
		const { days, rows } = weekMatrixProps(
			view.grid,
			dot,
			onEditDay,
			PROGRESS_TODAY,
		);
		expect(days.map((d) => d.letter)).toEqual([
			"M",
			"T",
			"W",
			"T",
			"F",
			"S",
			"S",
		]);
		expect(days.map((d) => d.today)).toEqual([
			false,
			false,
			false,
			false,
			true,
			false,
			false,
		]);
		days[2].onPress?.();
		expect(days[5].onPress).toBeUndefined();
		expect(days[6].onPress).toBeUndefined();
		expect(onEditDay).toHaveBeenCalledWith(view.grid.days[2].date);
		expect(days[2].accessibilityLabel).toBe(
			"Wednesday 21 October. Edit this day",
		);
		expect(rows.map((r) => [r.name, r.total])).toEqual([
			["Drink water", "5/7"],
			["Read 20 min", "2/7"],
			["No social media", "5/7"],
		]);
		expect(rows.every((r) => r.cells.length === 7 && r.dot === "#123456")).toBe(
			true,
		);
		expect(rows.some((r) => r.met)).toBe(false);
	});

	it("builds the one-habit / AX3 blocks with 40 pt day numbers and tappable cells", () => {
		const onEditDay = jest.fn();
		const [block] = weekBlocksProps(view.grid, dot, onEditDay, PROGRESS_TODAY);
		expect(block.cells.map((c) => c.text)).toEqual([
			"19",
			"20",
			"21",
			"22",
			"23",
			"24",
			"25",
		]);
		expect(block.cells[0].accessibilityLabel).toBe("Mon, done");
		expect(block.cells[1].accessibilityHint).toBe("Edit this day");
		expect(block.cells[5].onPress).toBeUndefined();
		expect(block.cells[5].accessibilityHint).toBeUndefined();
		block.cells[1].onPress?.();
		expect(onEditDay).toHaveBeenCalledWith(view.grid.days[1].date);
	});

	it("lists a swatch and word for every state the matrix can show", () => {
		expect(weekLegend().map((entry) => entry.label)).toEqual([
			"Done",
			"Partial",
			"Missed",
			"Frozen",
			"Off-schedule",
			"Not logged yet",
			"Future",
		]);
	});

	it("collapses consecutive weekdays: 'Mon–Tue', 'Mon, Wed'", () => {
		expect(weekdayRunLabel([1, 2])).toBe("Mon–Tue");
		expect(weekdayRunLabel([1, 3])).toBe("Mon, Wed");
		expect(weekdayRunLabel([5])).toBe("Fri");
	});

	it("names the start and the days before it on a too-early week (P2)", () => {
		const early = weekView("too-early");
		if (early.state !== "too-early") throw new Error("expected too-early");
		expect(weekStartedNote(early.grid, early.unlock)).toBe(
			"Started Wed 21 Oct · Mon–Tue before start",
		);
		expect(weekStartedNote(view.grid, view.unlock)).toBeNull();
	});
});

describe("stat tiles", () => {
	const week = ready();

	it("Week (P1): completion, best streak, best day", () => {
		const tiles = weekTiles(
			week.summary,
			{ today: PROGRESS_TODAY, oneHabit: null },
			1,
		);
		expect(tiles.map((t) => [t.label, t.value])).toEqual([
			["Completion", "92%"],
			["Best streak", "12"],
			["Best day", "Mon"],
		]);
		expect(tiles[0].caption).toMatch(/of \d+ so far$/);
		expect(tiles[1].caption).toBe("Drink water · days");
		expect(tiles[2].caption).toMatch(/^\d of \d done$/);
	});

	it("Week, one habit (P5): completion, streak, freezes — amber at zero", () => {
		const one = weekTiles(
			week.summary,
			{ today: PROGRESS_TODAY, oneHabit: read },
			0,
		);
		expect(one.map((t) => t.label)).toEqual([
			"Completion",
			"Streak",
			"Freezes",
		]);
		expect(one[2]).toEqual(
			expect.objectContaining({
				value: "0",
				caption: "0 freezes left",
				tone: "warning",
			}),
		);
		const some = weekTiles(
			week.summary,
			{ today: PROGRESS_TODAY, oneHabit: read },
			1,
		);
		expect(some[2].tone).toBeUndefined();
		expect(some[2].caption).toBe("1 freeze left");
	});

	it("Month (P7): rate, perfect days 'of N so far', best streak", () => {
		const month = monthView();
		if (month.state !== "ready") throw new Error("ready");
		const tiles = monthTiles(month.summary, {
			today: PROGRESS_TODAY,
			oneHabit: null,
		});
		expect(tiles.map((t) => t.label)).toEqual([
			"Completion",
			"Perfect days",
			"Best streak",
		]);
		expect(tiles[1].caption).toMatch(/^of \d+ so far$/);
	});

	it("Month, one habit (P10): rate with frozen, longest, freezes used", () => {
		const month = monthView();
		if (month.state !== "ready") throw new Error("ready");
		const tiles = monthTiles(month.summary, {
			today: PROGRESS_TODAY,
			oneHabit: read,
		});
		expect(tiles.map((t) => t.label)).toEqual([
			"Completion",
			"Longest",
			"Freezes used",
		]);
	});

	it("Year (P12): rate since the first log, best streak, best month", () => {
		const year = yearView();
		if (year.state !== "ready") throw new Error("ready");
		const tiles = yearTiles(
			year.summary,
			{ month: new Date(2026, 8, 1), percent: 100 },
			{ today: PROGRESS_TODAY, oneHabit: null },
			new Date(2026, 2, 3),
		);
		expect(tiles.map((t) => [t.label, t.value])).toEqual([
			["Completion", expect.stringMatching(/%$/)],
			["Best streak", expect.any(String)],
			["Best month", "Sep"],
		]);
		expect(tiles[0].caption).toBe("since 3 Mar");
		expect(tiles[2].caption).toBe("100%");
	});

	it("Year, one habit (P15): rate, longest, freezes used this year", () => {
		const year = yearView();
		if (year.state !== "ready") throw new Error("ready");
		const tiles = yearTiles(
			year.summary,
			null,
			{ today: PROGRESS_TODAY, oneHabit: water },
			null,
		);
		expect(tiles.map((t) => t.label)).toEqual([
			"Completion",
			"Longest",
			"Freezes used",
		]);
		expect(tiles[2].caption).toBe("this year");
	});

	it("shows a dash and says nothing is done yet instead of a fake zero", () => {
		const month = monthView();
		if (month.state !== "ready") throw new Error("ready");
		const tiles = yearTiles(
			month.summary,
			null,
			{ today: PROGRESS_TODAY, oneHabit: null },
			null,
		);
		expect(tiles[2]).toEqual(
			expect.objectContaining({
				value: "—",
				caption: "Nothing done yet",
				muted: true,
			}),
		);
	});
});

describe("insights", () => {
	const week = ready();
	const context = {
		kind: "week" as const,
		previousWindowStart: week.summary.previousWindow.start,
		oneHabit: null,
		currentMonth: null,
	};

	it("slipping: amber card naming the habit, with the Change frequency action", () => {
		const slipping = week.insights.find((i) => i.kind === "slipping");
		if (!slipping) throw new Error("expected a slipping insight");
		const card = insightProps(slipping, context);
		expect(card.tone).toBe("warning");
		expect(card.title).toBe("Read 20 min is slipping");
		expect(card.body).toBe("2 of 3 so far this week, 7 of 7 last week.");
		expect(card.action).toEqual({
			label: "Change frequency ›",
			habitId: read.id,
		});
	});

	it("improved: names the days gained, never offers an action", () => {
		const card = insightProps(
			{
				kind: "improved",
				tone: "positive",
				reason: "up",
				habit: water,
				stats: {
					done: 21,
					due: 22,
					rate: 95,
					previousDone: 18,
					previousDue: 22,
					previousRate: 82,
					deltaPoints: 13,
				},
				action: null,
			},
			{ ...context, kind: "month", previousWindowStart: new Date(2026, 8, 1) },
		);
		expect(card.title).toBe("Drink water is up 3 days");
		expect(card.body).toBe("21 of 22 this month, 18 of 22 in September.");
		expect(card.tone).toBe("success");
		expect(card.action).toBeUndefined();
	});

	it("improved by points when the done count did not grow", () => {
		const card = insightProps(
			{
				kind: "improved",
				tone: "positive",
				reason: "up",
				habit: water,
				stats: {
					done: 3,
					due: 3,
					rate: 100,
					previousDone: 4,
					previousDue: 7,
					previousRate: 57,
					deltaPoints: 43,
				},
				action: null,
			},
			context,
		);
		expect(card.title).toBe("Drink water is up 43 points");
	});

	it("best month: names the month and, when running, the current rate", () => {
		const card = insightProps(
			{
				kind: "improved",
				tone: "positive",
				reason: "best-month",
				month: new Date(2026, 8, 1),
				percent: 100,
				action: null,
			},
			{
				...context,
				kind: "year",
				currentMonth: { month: new Date(2026, 9, 1), percent: 84 },
			},
		);
		expect(card.title).toBe("September was your best month");
		expect(card.body).toBe(
			"Every scheduled habit, every day. October is at 84 % so far.",
		);
	});

	it("nothing to fix: perfect, steady, and the one-habit steady line", () => {
		const base = {
			kind: "nothing-to-fix" as const,
			tone: "positive" as const,
			action: null,
		};
		expect(insightProps({ ...base, reason: "perfect" }, context).body).toBe(
			"Every habit was done on every day it was due.",
		);
		expect(
			insightProps({ ...base, reason: "steady", tone: "neutral" }, context),
		).toEqual(
			expect.objectContaining({ tone: "neutral", title: "Nothing to fix" }),
		);
		expect(
			insightProps(
				{ ...base, reason: "steady" },
				{ ...context, oneHabit: noSocial },
			).body,
		).toBe("No social media is holding steady.");
	});

	it("ranks nothing when the range is still locked", () => {
		expect(
			progressInsights({
				summary: week.summary,
				unlocked: false,
				today: PROGRESS_TODAY,
			}),
		).toEqual([]);
	});
});

describe("unlockProps (P2, P9, P14)", () => {
	const unlock = progressUnlock({ count: 3, firstDate: "2026-10-21" });

	it("counts down the days and shows 3 of 7 for each range", () => {
		expect(unlockProps("week", unlock)).toEqual({
			title: "Insights unlock in 4 days",
			body: "They need 7 days of logs. Your first 3 days are below.",
			progress: 3 / 7,
			progressLabel: "3 of 7 days",
		});
		expect(unlockProps("month", unlock).title).toBe(
			"Month summary unlocks in 4 days",
		);
		expect(unlockProps("year", unlock).title).toBe(
			"Year view unlocks in 4 days",
		);
	});

	it("is singular for one day", () => {
		const one = progressUnlock({ count: 6, firstDate: "2026-10-18" });
		expect(unlockProps("week", one).title).toBe("Insights unlock in 1 day");
		const first = progressUnlock({ count: 1, firstDate: "2026-10-23" });
		expect(unlockProps("week", first).body).toContain("first day is below");
	});
});

describe("oneHabitSubline", () => {
	it("says Daily for a daily habit and the schedule otherwise", () => {
		expect(oneHabitSubline(water)).toBe("Daily · your only habit");
		expect(
			oneHabitSubline({
				...water,
				frequency: { type: "per-week", timesPerWeek: 3 },
			}),
		).toBe("3× per week · your only habit");
	});
});

it("keeps the fixture's habits stable", () => {
	expect(progressHabits.map((habit) => habit.name)).toEqual([
		"Drink water",
		"Read 20 min",
		"No social media",
	]);
});
