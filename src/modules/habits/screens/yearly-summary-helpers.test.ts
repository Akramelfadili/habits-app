// Only habit-service's pure helpers are reached through the services.
jest.mock("../repositories/frozen-day-repository", () => ({}));

import type { YearlySummary, YearMonthCell } from "../services/yearly-summary";
import { makeHabit } from "../test-support/habit-builder";
import {
	bestMonthCopy,
	bestMonthLabel,
	earlyCopy,
	neverStuckCopy,
	seasonalCopy,
	stripCellState,
	stuckCopy,
	thousands,
	unlockCopy,
	yearlyMenuLockedReason,
	yearlyMenuSubline,
	yearlyTiles,
	yearRangeLabel,
	yearTitle,
} from "./yearly-summary-helpers";

const cell = (
	month: number,
	overrides: Partial<YearMonthCell> = {},
): YearMonthCell => ({
	month: new Date(2026, month, 1),
	kind: "counted",
	current: false,
	completed: 9,
	scheduled: 10,
	rate: 0.9,
	...overrides,
});

const habit = makeHabit({ id: 1, name: "Read" });

describe("thousands", () => {
	it.each([
		[0, "0"],
		[999, "999"],
		[1612, "1,612"],
		[1234567, "1,234,567"],
	])("%i → %s", (value, expected) => {
		expect(thousands(value)).toBe(expected);
	});
});

describe("stripCellState (HAB-17)", () => {
	it("draws before-start and future months dashed", () => {
		expect(
			stripCellState(cell(0, { kind: "before-start", rate: null })),
		).toEqual({
			kind: "outside",
		});
		expect(stripCellState(cell(11, { kind: "future", rate: null }))).toEqual({
			kind: "outside",
		});
	});

	it("shows a month with nothing scheduled as not-scheduled, never as missed", () => {
		expect(stripCellState(cell(4, { kind: "none", rate: null }))).toEqual({
			kind: "not-scheduled",
		});
	});

	it.each([
		[0, { kind: "missed" }],
		[0.2, { kind: "level", level: 1 }],
		[0.5, { kind: "level", level: 2 }],
		[0.84, { kind: "level", level: 2 }],
		[0.85, { kind: "level", level: 3 }],
		[1, { kind: "level", level: 3 }],
	])("shades a %d month", (rate, expected) => {
		expect(stripCellState(cell(3, { rate }))).toEqual(expected);
	});
});

describe("copy (HAB-17, C4/C5/C7)", () => {
	it("best month: names the month and rate, adds the streak only when there is one", () => {
		const best = { type: "best-month", cell: cell(5, { rate: 0.91 }) } as const;
		expect(bestMonthCopy({ ...best, streak: null })).toEqual({
			title: "June was your best month",
			body: "91% across every habit.",
		});
		expect(
			bestMonthCopy({
				...best,
				streak: {
					days: 41,
					habit: makeHabit({ id: 2, name: "Glass of water" }),
				},
			}).body,
		).toBe(
			"91% across every habit, and the year's longest streak — 41 days of Glass of water.",
		);
	});

	it("stuck and never stuck read like the mockup", () => {
		const row = {
			habit,
			cells: [],
			completed: 0,
			scheduled: 0,
			rate: 0.5,
		};
		expect(stuckCopy({ type: "stuck", row, months: 4 })).toEqual({
			title: "Read stuck",
			body: "Four months in a row above 85%. It isn't effort any more.",
		});
		expect(
			neverStuckCopy({
				type: "never-stuck",
				row,
				underMonths: 5,
				judgedMonths: 7,
			}),
		).toEqual({
			title: "Read never stuck",
			body: "Under 50% in five of seven months. Worth changing what it is — or archiving it.",
			actionLabel: "Edit or archive Read →",
		});
	});

	it("seasonal dip: 'Summer' only when every month is Jun–Aug", () => {
		const base = { type: "seasonal", best: cell(5), points: 8 } as const;
		expect(seasonalCopy({ ...base, run: [cell(6), cell(7)] })).toEqual({
			title: "Summer dip",
			body: "July and August ran at least 8 points below June.",
		});
		expect(seasonalCopy({ ...base, run: [cell(0), cell(1)] }).title).toBe(
			"Seasonal dip",
		);
	});

	it("says how young the year is when nothing has finished", () => {
		const summary = { year: { start: new Date(2027, 0, 1) } } as YearlySummary;
		expect(earlyCopy(summary, new Date(2027, 0, 1)).body).toBe(
			"2027 is a day old. Insights appear once a month has finished.",
		);
		expect(earlyCopy(summary, new Date(2027, 0, 10)).body).toBe(
			"2027 is 10 days old. Insights appear once a month has finished.",
		);
	});

	it("the unlock card matches C7's wording, with the real day span", () => {
		const copy = unlockCopy({
			trackedDays: 12,
			totalDays: 91,
			unlockDate: new Date(2026, 11, 4),
			isUnlocked: false,
		});
		expect(copy.title).toBe("Year trends start after 3 months");
		expect(copy.body).toBe(
			"You're 12 days in. The chart fills as each month completes; the first yearly insights arrive in December.",
		);
		expect(copy.progressLabel).toBe("12 of 91 days");
		expect(copy.remainingLabel).toBe("from 4 December");
		expect(copy.progress).toBeCloseTo(12 / 91);
	});
});

describe("tiles and labels (HAB-17, C4)", () => {
	const summary = {
		year: { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) },
		logged: 1612,
		scheduled: 1990,
		rate: 0.81,
		longest: { days: 41, endedOn: new Date(2026, 5, 30), habit },
		best: cell(5, { rate: 0.91 }),
	} as YearlySummary;

	it("fills Logged / Overall / Longest", () => {
		expect(yearlyTiles(summary)).toEqual({
			logged: { value: "1,612", caption: "entries" },
			overall: { value: "81%", caption: "of scheduled" },
			longest: { value: "41", caption: "days · June" },
		});
	});

	it("dashes the rate and drops the month when nothing's been counted", () => {
		const empty = {
			...summary,
			logged: 0,
			rate: null,
			longest: { days: 0, endedOn: null, habit: null },
		} as YearlySummary;
		expect(yearlyTiles(empty)).toEqual({
			logged: { value: "0", caption: "entries" },
			overall: { value: "—", caption: "of scheduled" },
			longest: { value: "0", caption: "days" },
		});
	});

	it("titles the year and ranges from the first day (or 1 Jan) to today", () => {
		expect(yearTitle(summary)).toBe("2026 so far");
		expect(
			yearRangeLabel(summary, new Date(2026, 2, 3), new Date(2026, 8, 16)),
		).toBe("3 March — 16 September");
		expect(
			yearRangeLabel(summary, new Date(2024, 2, 3), new Date(2026, 8, 16)),
		).toBe("1 January — 16 September");
	});

	it("labels the best month, or nothing before one exists", () => {
		expect(bestMonthLabel(summary)).toBe("Best: June · 91%");
		expect(bestMonthLabel({ ...summary, best: null })).toBeNull();
	});
});

describe("menu row copy (HAB-14, HAB-17)", () => {
	it("says where history began only when it began this year", () => {
		const today = new Date(2026, 8, 16);
		expect(yearlyMenuSubline(new Date(2026, 2, 3), today)).toBe(
			"2026 so far · since 3 March",
		);
		expect(yearlyMenuSubline(new Date(2025, 2, 3), today)).toBe("2026 so far");
	});

	it("says when it unlocks", () => {
		expect(
			yearlyMenuLockedReason({
				trackedDays: 0,
				totalDays: 91,
				unlockDate: new Date(2026, 11, 4),
				isUnlocked: false,
			}),
		).toBe("Unlocks 4 December");
	});
});
