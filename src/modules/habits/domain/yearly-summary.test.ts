import { addDays, format } from "date-fns";
import { yearlyEntries, yearlyHabitFixtures } from "../dev/yearly-fixtures";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay, Habit } from "../types";

import { historyStart, monthUnlock } from "./monthly-summary";
import {
	buildYearlySummary,
	YEAR_UNLOCK_MONTHS,
	yearEntryRange,
	yearUnlock,
	yearWindowFor,
} from "./yearly-summary";

const date = (value: Date) => format(value, "yyyy-MM-dd");
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

function entryOn(habitId: number, value: Date, id = 0): Entry {
	return { id, habitId, date: date(value), createdAt: value };
}

/** A daily habit's entries on every day from `from` to `to` inclusive except `skip`. */
function dailyEntries(
	habitId: number,
	from: Date,
	to: Date,
	skip: (d: Date) => boolean = () => false,
): Entry[] {
	const entries: Entry[] = [];
	for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
		if (!skip(cursor)) entries.push(entryOn(habitId, cursor, entries.length));
	}
	return entries;
}

function build(
	habits: Habit[],
	entries: Entry[],
	today: Date,
	frozenDays: FrozenDay[] = [],
) {
	return buildYearlySummary({
		habits,
		entries,
		frozenDays,
		today,
		year: yearWindowFor(today),
	});
}

describe("yearWindowFor / yearEntryRange (HAB-17)", () => {
	it("is the calendar year of the given day", () => {
		const year = yearWindowFor(day(2026, 9, 16));
		expect(date(year.start)).toBe("2026-01-01");
		expect(date(year.end)).toBe("2026-12-31");
	});

	it("rolls over with the calendar: 31 Dec and 1 Jan are different years", () => {
		expect(date(yearWindowFor(day(2026, 12, 31)).start)).toBe("2026-01-01");
		expect(date(yearWindowFor(day(2027, 1, 1)).start)).toBe("2027-01-01");
	});

	it("reads entries from the Monday on or before 1 Jan to the Sunday on or after 31 Dec", () => {
		// 1 Jan 2027 is a Friday → Monday 28 Dec 2026; 31 Dec 2027 is a Friday → Sunday 2 Jan 2028.
		const range = yearEntryRange(yearWindowFor(day(2027, 6, 1)));
		expect(date(range.start)).toBe("2026-12-28");
		expect(date(range.end)).toBe("2028-01-02");
	});
});

describe("yearUnlock (HAB-17, C7)", () => {
	it("unlocks three calendar months after history began: 4 Sep → 4 Dec", () => {
		expect(YEAR_UNLOCK_MONTHS).toBe(3);
		const first = day(2026, 9, 4);
		expect(date(yearUnlock(first, day(2026, 9, 16)).unlockDate)).toBe(
			"2026-12-04",
		);
		expect(yearUnlock(first, day(2026, 12, 3)).isUnlocked).toBe(false);
		expect(yearUnlock(first, day(2026, 12, 4)).isUnlocked).toBe(true);
	});

	it("counts days in toward the real span (4 Sep → 4 Dec is 91 days)", () => {
		const unlock = yearUnlock(day(2026, 9, 4), day(2026, 9, 16));
		expect(unlock.trackedDays).toBe(12);
		expect(unlock.totalDays).toBe(91);
	});

	it("clamps a 31st: 31 Aug → 30 Nov", () => {
		const first = day(2026, 8, 31);
		expect(date(yearUnlock(first, day(2026, 9, 1)).unlockDate)).toBe(
			"2026-11-30",
		);
		expect(yearUnlock(first, day(2026, 11, 29)).isUnlocked).toBe(false);
		expect(yearUnlock(first, day(2026, 11, 30)).isUnlocked).toBe(true);
	});

	it("never reads past the total, nor below zero", () => {
		const first = day(2026, 1, 1);
		const late = yearUnlock(first, day(2026, 9, 1));
		expect(late.trackedDays).toBe(late.totalDays);
		expect(yearUnlock(first, day(2025, 12, 1)).trackedDays).toBe(0);
	});

	it("starts from the same history start Monthly uses, so the two can't disagree", () => {
		const habits = [
			makeHabit({ id: 1, createdAt: day(2026, 3, 3) }),
			makeHabit({ id: 2, createdAt: day(2026, 2, 10) }),
		];
		const first = historyStart(habits) as Date;
		expect(date(first)).toBe("2026-02-10");
		expect(date(monthUnlock(first, day(2026, 3, 1)).unlockDate)).toBe(
			"2026-03-12",
		);
		expect(date(yearUnlock(first, day(2026, 3, 1)).unlockDate)).toBe(
			"2026-05-10",
		);
	});
});

describe("buildYearlySummary — the C4/C5 fixture (HAB-17)", () => {
	const today = new Date(2026, 8, 16, 9);
	const summary = build(
		yearlyHabitFixtures().map((fixture) => makeHabit(fixture)),
		yearlyEntries(),
		today,
	);

	it("lays out all twelve slots: dashed before the first day and after today, the current month in progress", () => {
		expect(summary.months.map((cell) => cell.kind)).toEqual([
			"before-start",
			"before-start",
			"counted",
			"counted",
			"counted",
			"counted",
			"counted",
			"counted",
			"counted",
			"future",
			"future",
			"future",
		]);
		expect(summary.months.filter((cell) => cell.current)).toHaveLength(1);
		expect(summary.months[8].current).toBe(true);
	});

	it("names June the best month at 91%", () => {
		expect(format(summary.best?.month as Date, "MMMM")).toBe("June");
		expect(Math.round((summary.best?.rate ?? 0) * 100)).toBe(91);
	});

	it("finds Glass of water's 41-day streak ending in June", () => {
		expect(summary.longest.days).toBe(41);
		expect(summary.longest.habit?.name).toBe("Glass of water");
		expect(date(summary.longest.endedOn as Date)).toBe("2026-06-30");
	});

	it("totals logged entries and the overall rate", () => {
		expect(summary.logged).toBe(yearlyEntries().length);
		expect(summary.rate).toBeCloseTo(summary.logged / summary.scheduled, 10);
	});

	it("gives one row per habit in creation order, with dashed leading months", () => {
		expect(summary.rows.map((row) => row.habit.name)).toEqual([
			"Glass of water",
			"Meditate",
			"Read",
			"Mobility",
			"Easy run",
			"Upper body",
		]);
		expect(summary.rows[0].cells.map((cell) => cell.kind).slice(0, 3)).toEqual([
			"before-start",
			"before-start",
			"counted",
		]);
	});

	it("shows C5's three cards in order — best month, stuck, never stuck — and cuts the fourth (seasonal dip)", () => {
		const [best, stuck, never, ...rest] = summary.insights;
		expect(rest).toEqual([]);
		expect(best.type).toBe("best-month");
		if (best.type === "best-month") {
			expect(best.streak?.days).toBe(41);
			expect(best.streak?.habit.name).toBe("Glass of water");
		}
		expect(stuck.type).toBe("stuck");
		if (stuck.type === "stuck") {
			expect(stuck.row.habit.name).toBe("Read");
			expect(stuck.months).toBe(4);
		}
		expect(never.type).toBe("never-stuck");
		if (never.type === "never-stuck") {
			expect(never.row.habit.name).toBe("Mobility");
			expect(never.underMonths).toBe(5);
			expect(never.judgedMonths).toBe(6);
		}
	});
});

describe("buildYearlySummary — month slots (HAB-17)", () => {
	it("shows a habit created mid-year as dashed before-start months, then counted", () => {
		const today = day(2026, 9, 16);
		const habit = makeHabit({ id: 1, createdAt: day(2026, 6, 10) });
		const summary = build(
			[habit],
			dailyEntries(1, day(2026, 6, 10), day(2026, 9, 15)),
			today,
		);
		const kinds = summary.rows[0].cells.map((cell) => cell.kind);
		expect(kinds.slice(0, 5)).toEqual([
			"before-start",
			"before-start",
			"before-start",
			"before-start",
			"before-start",
		]);
		expect(kinds[5]).toBe("counted");
		expect(summary.rows[0].cells[5].scheduled).toBe(21);
	});

	it("keeps a later habit's own leading months dashed even when the history started earlier", () => {
		const today = day(2026, 9, 16);
		const early = makeHabit({ id: 1, createdAt: day(2026, 1, 5) });
		const late = makeHabit({ id: 2, createdAt: day(2026, 7, 1) });
		const summary = build(
			[early, late],
			[
				...dailyEntries(1, day(2026, 1, 5), day(2026, 9, 15)),
				...dailyEntries(2, day(2026, 7, 1), day(2026, 9, 15)),
			],
			today,
		);
		expect(summary.months[0].kind).toBe("counted");
		expect(summary.rows[1].cells[5].kind).toBe("before-start");
		expect(summary.rows[1].cells[6].kind).toBe("counted");
	});

	it("marks a month with scheduled days all frozen as 'none', not a 0% month", () => {
		const today = day(2026, 9, 16);
		const habit = makeHabit({ id: 1, createdAt: day(2026, 1, 1) });
		const frozen: FrozenDay[] = [];
		for (let d = day(2026, 5, 1); d <= day(2026, 5, 31); d = addDays(d, 1)) {
			frozen.push({
				id: frozen.length,
				habitId: 1,
				date: date(d),
				createdAt: d,
			});
		}
		const summary = build(
			[habit],
			dailyEntries(
				1,
				day(2026, 1, 1),
				day(2026, 9, 15),
				(d) => d.getMonth() === 4,
			),
			today,
			frozen,
		);
		expect(summary.rows[0].cells[4].kind).toBe("none");
		expect(summary.rows[0].cells[4].rate).toBeNull();
	});

	it("reads a restored habit's closed pause as paused, not missed (HAB-20)", () => {
		const today = day(2026, 9, 16);
		const habit = makeHabit({
			id: 1,
			createdAt: day(2026, 1, 1),
			frequency: { type: "daily" },
			pauses: [{ from: "2026-03-01", to: "2026-03-31" }],
		});
		const entries = [
			...dailyEntries(1, day(2026, 1, 1), day(2026, 2, 28)),
			...dailyEntries(1, day(2026, 4, 1), day(2026, 9, 15)),
		];
		const summary = build([habit], entries, today);
		// March's 31 blank days are neither owed nor missed...
		expect(summary.scheduled).toBe(summary.logged);
		expect(summary.rate).toBe(1);
		// ...and no streak is joined across the gap.
		expect(summary.longest.days).toBe(
			dailyEntries(1, day(2026, 4, 1), day(2026, 9, 15)).length,
		);
	});

	it("drops a habit with nothing counted this year", () => {
		const today = day(2026, 9, 16);
		const archived = makeHabit({
			id: 2,
			createdAt: day(2025, 1, 1),
			archivedAt: day(2025, 6, 1),
		});
		const summary = build([archived], [], today);
		expect(summary.rows).toEqual([]);
		expect(summary.rate).toBeNull();
	});
});

describe("buildYearlySummary — calendar edge cases (HAB-17)", () => {
	it("renders early January on older history without dividing by zero or going blank", () => {
		const today = day(2027, 1, 3);
		const habit = makeHabit({ id: 1, createdAt: day(2026, 6, 1) });
		const summary = build(
			[habit],
			dailyEntries(1, day(2027, 1, 1), day(2027, 1, 2)),
			today,
		);
		expect(summary.months).toHaveLength(12);
		expect(summary.months[0].kind).toBe("counted");
		expect(summary.months[0].current).toBe(true);
		expect(
			summary.months.slice(1).every((cell) => cell.kind === "future"),
		).toBe(true);
		expect(summary.logged).toBe(2);
		expect(summary.rate).toBe(1);
		// Nothing has finished this year: a plain "early" card, not an empty list.
		expect(summary.insights).toEqual([{ type: "early" }]);
		expect(summary.best).toBeNull();
	});

	it("renders 1 January itself (nothing counted yet) with a null rate", () => {
		const today = day(2027, 1, 1);
		const habit = makeHabit({ id: 1, createdAt: day(2026, 6, 1) });
		const summary = build([habit], [], today);
		expect(summary.rate).toBeNull();
		expect(summary.logged).toBe(0);
		expect(summary.longest.days).toBe(0);
		expect(summary.months[0].kind).toBe("none");
		expect(summary.insights).toEqual([{ type: "early" }]);
	});

	it("does not carry last year's streak into the new year", () => {
		const today = day(2027, 1, 10);
		const habit = makeHabit({ id: 1, createdAt: day(2026, 1, 1) });
		const summary = build(
			[habit],
			dailyEntries(1, day(2026, 1, 1), day(2027, 1, 5)),
			today,
		);
		expect(summary.longest.days).toBe(5);
	});

	it("buckets days into the right months across Paris DST changes (29 Mar, 25 Oct 2026)", () => {
		const today = day(2026, 11, 15);
		const habit = makeHabit({ id: 1, createdAt: day(2026, 3, 1) });
		// Missed: the spring-forward day and the fall-back day, nothing else.
		const missed = new Set(["2026-03-29", "2026-10-25"]);
		const summary = build(
			[habit],
			dailyEntries(1, day(2026, 3, 1), day(2026, 11, 14), (d) =>
				missed.has(date(d)),
			),
			today,
		);
		const march = summary.rows[0].cells[2];
		const october = summary.rows[0].cells[9];
		expect([march.scheduled, march.completed]).toEqual([31, 30]);
		expect([october.scheduled, october.completed]).toEqual([31, 30]);
		expect(summary.rows[0].cells[3].rate).toBe(1);
		expect(summary.rows[0].cells[10].current).toBe(true);
	});
});

describe("buildYearlySummary — archived habits (HAB-17)", () => {
	const today = day(2026, 9, 16);
	const FROM = day(2026, 1, 1);
	const TO = day(2026, 9, 15);

	/** An active habit that's fine (95%) and one that would trip every insight if it counted. */
	function scenario(archiveIt: boolean) {
		const steady = makeHabit({ id: 1, name: "Steady", createdAt: FROM });
		const struggling = makeHabit({
			id: 2,
			name: "Struggling",
			createdAt: FROM,
			archivedAt: archiveIt ? day(2026, 9, 1) : null,
		});
		const entries = [
			// 19 of 20 days, so 95% every month.
			...dailyEntries(1, FROM, TO, (d) => d.getDate() % 20 === 0),
			// Mostly missed: under 50% every month.
			...dailyEntries(2, FROM, TO, (d) => d.getDate() % 3 !== 0),
		];
		return build([steady, struggling], entries, today);
	}

	const habitsNamed = (summary: ReturnType<typeof scenario>) =>
		summary.insights.flatMap((insight) =>
			"row" in insight ? [insight.row.habit.name] : [],
		);

	it("names a struggling habit while it's active (the control)", () => {
		expect(habitsNamed(scenario(false))).toContain("Struggling");
	});

	it("never names or links an archived habit in any insight", () => {
		const summary = scenario(true);
		expect(habitsNamed(summary)).not.toContain("Struggling");
		expect(summary.insights.map((insight) => insight.type)).not.toContain(
			"never-stuck",
		);
	});

	it("leaves an archived habit's days out of the best month and the seasonal dip", () => {
		const summary = scenario(true);
		const best = summary.insights.find((i) => i.type === "best-month");
		// Steady alone is ~95% every month; with Struggling it'd be ~65%.
		expect(
			best?.type === "best-month" && Math.round((best.cell.rate ?? 0) * 100),
		).toBeGreaterThanOrEqual(90);
	});

	it("never credits an archived habit with the year's longest streak", () => {
		const steady = makeHabit({ id: 1, name: "Steady", createdAt: FROM });
		const gone = makeHabit({
			id: 2,
			name: "Gone",
			createdAt: FROM,
			archivedAt: day(2026, 9, 1),
		});
		const summary = build(
			[steady, gone],
			[
				...dailyEntries(1, FROM, TO, (d) => d.getDate() % 10 === 0),
				...dailyEntries(2, FROM, day(2026, 8, 31)),
			],
			today,
		);
		// The tile counts the whole history: Gone's run is the longest.
		expect(summary.longest.habit?.name).toBe("Gone");
		const best = summary.insights.find((i) => i.type === "best-month");
		expect(best?.type === "best-month" && best.streak?.habit.name).not.toBe(
			"Gone",
		);
	});

	it("still shows the archived habit's row, strip and totals, as Monthly does", () => {
		const summary = scenario(true);
		expect(summary.rows.map((row) => row.habit.name)).toEqual([
			"Steady",
			"Struggling",
		]);
		expect(summary.logged).toBe(
			dailyEntries(1, FROM, TO, (d) => d.getDate() % 20 === 0).length +
				scenario(true).rows[1].completed,
		);
	});

	it("has no insights at all when every habit is archived", () => {
		const gone = makeHabit({
			id: 1,
			createdAt: FROM,
			archivedAt: day(2026, 9, 1),
		});
		const summary = build(
			[gone],
			dailyEntries(1, FROM, day(2026, 8, 31)),
			today,
		);
		expect(summary.insights).toEqual([]);
		expect(summary.rows).toHaveLength(1);
	});
});
