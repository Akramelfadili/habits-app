import type {
	MonthlyHabitRow,
	MonthlySummary,
} from "../domain/monthly-summary";
import { progressUnlock } from "../domain/progress-unlock";
import { makeHabit } from "../test-support/habit-builder";
import {
	freezeCardCopy,
	insightCountLabel,
	monthlyMenuSubline,
	monthlyTiles,
	monthRangeLabel,
	patternCopy,
	percent,
	slippingCopy,
	trendRowLabel,
	unlockCopy,
	weekdayName,
} from "./monthly-summary-helpers";

const august = { start: new Date(2026, 7, 1), end: new Date(2026, 7, 31) };
const summary = (over: Partial<MonthlySummary> = {}): MonthlySummary => ({
	month: august,
	previousMonth: { start: new Date(2026, 6, 1), end: new Date(2026, 6, 31) },
	completed: 148,
	scheduled: 186,
	rate: 148 / 186,
	perfectDays: 9,
	countedDays: 31,
	freezeDates: [],
	calendar: [],
	rows: [],
	insights: [],
	...over,
});

describe("labels", () => {
	it("formats the month range and percentages", () => {
		expect(monthRangeLabel(august)).toBe("1 – 31 August");
		expect(percent(0.796)).toBe("80%");
		expect(percent(null)).toBe("—");
		expect(weekdayName(6)).toBe("Saturday");
		expect(insightCountLabel(1)).toBe("1 insight");
		expect(insightCountLabel(3)).toBe("3 insights");
	});

	it("builds the three tiles", () => {
		expect(
			monthlyTiles(summary({ freezeDates: [new Date(2026, 7, 7)] })),
		).toEqual({
			completed: { value: "80%", caption: "148 of 186" },
			perfect: { value: "9", caption: "of 31" },
			freezes: { value: "1", caption: "of 2 used" },
		});
	});

	it("words the menu row", () => {
		expect(monthlyMenuSubline(summary())).toBe("1 – 31 August · 80% done");
	});
});

describe("freezeCardCopy", () => {
	it("is absent with no freeze", () => {
		expect(freezeCardCopy(summary())).toBeNull();
	});

	it.each([
		[[7], "One freeze used", "7 August · pool refilled 1 September"],
		[
			[7, 22],
			"Both freezes used",
			"7 and 22 August · pool refilled 1 September",
		],
	])("describes %j", (days, title, body) => {
		const dates = days.map((day) => new Date(2026, 7, day));
		expect(freezeCardCopy(summary({ freezeDates: dates }))).toMatchObject({
			title,
			body,
		});
	});

	it("refills on 1 January after December", () => {
		const december = {
			start: new Date(2026, 11, 1),
			end: new Date(2026, 11, 31),
		};
		expect(
			freezeCardCopy(
				summary({ month: december, freezeDates: [new Date(2026, 11, 5)] }),
			)?.body,
		).toBe("5 December · pool refilled 1 January");
	});
});

const unlockOf = (count: number) =>
	progressUnlock({ count, firstDate: count ? "2026-10-21" : null });

describe("unlockCopy", () => {
	it("says how many days remain, why and how far (the 7-day gate)", () => {
		const copy = unlockCopy(unlockOf(3));
		expect(copy.title).toBe("Month summary unlocks in 4 days");
		expect(copy.progressLabel).toBe("3 of 7 days");
		expect(copy.remainingLabel).toBe("4 to go");
		expect(copy.progress).toBeCloseTo(3 / 7);
	});
});

describe("singular counts", () => {
	it("logged days and insight counts read '1 day' / '1 insight'", () => {
		const copy = unlockCopy(unlockOf(1));
		expect(copy.title).toBe("Month summary unlocks in 6 days");
		expect(copy.body).toContain("you've logged 1 day so far");
		expect(unlockCopy(unlockOf(6)).title).toBe(
			"Month summary unlocks in 1 day",
		);
		expect(insightCountLabel(1)).toBe("1 insight");
		expect(insightCountLabel(2)).toBe("2 insights");
	});
});

describe("insight copy", () => {
	const mobility = makeHabit({ id: 6, name: "Mobility" });

	it("words slipping from the first and last week", () => {
		const copy = slippingCopy({
			type: "slipping",
			row: { habit: mobility } as MonthlyHabitRow,
			first: { completed: 6, scheduled: 7 },
			last: { completed: 3, scheduled: 7 },
		});
		expect(copy.title).toBe("Mobility slipped all month");
		expect(copy.body).toContain("6 of 7 in the first, 3 of 7 in the last");
	});

	it("gives a pattern an action only with a cause", () => {
		const base = {
			type: "pattern",
			weekdayRate: 0.88,
			weekendRate: 0.61,
		} as const;
		expect(patternCopy({ ...base, cause: null }).actionLabel).toBeNull();
		const withCause = patternCopy({
			...base,
			cause: { habit: mobility, weekday: 6, misses: 5, weekendMisses: 12 },
		});
		expect(withCause.actionLabel).toBe("Add a Saturday reminder →");
		expect(withCause.body).toBe(
			"Weekdays 88%, weekends 61%. 5 of 12 weekend misses are Mobility on Saturdays.",
		);
	});
});

describe("trendRowLabel", () => {
	const make = (deltaPoints: number | null) =>
		({
			habit: makeHabit({ name: "Read" }),
			rate: 0.82,
			deltaPoints,
		}) as MonthlyHabitRow;

	it.each([
		[11, "Read: 82%, up 11 points on last month"],
		[-3, "Read: 82%, down 3 points on last month"],
		[0, "Read: 82%, unchanged on last month"],
		[null, "Read: 82%"],
	])("reads a %s delta", (delta, label) => {
		expect(trendRowLabel(make(delta))).toBe(label);
	});
});
