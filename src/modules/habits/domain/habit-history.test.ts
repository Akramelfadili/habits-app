import { addDays, format, isSameDay, subDays } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry } from "../types";

import {
	buildHeatmapWeeks,
	calculateCompletionRate,
	calculateLongestStreak,
	completionRateDelta,
	currentStreakAsOf,
	HEATMAP_WEEKS,
	habitHistoryRows,
	heatmapLevelFor,
	streakResetInfo,
} from "./habit-history";

// Mid-day local, so date-only math never straddles a timezone boundary.
const today = new Date(2026, 8, 23, 12); // Wednesday 23 Sep 2026
const dayString = (daysAgo: number) =>
	format(subDays(today, daysAgo), "yyyy-MM-dd");

function entry(daysAgo: number, value?: number): Entry {
	return {
		id: daysAgo,
		habitId: 1,
		date: dayString(daysAgo),
		value,
		createdAt: subDays(today, daysAgo),
	};
}

const longAgo = new Date(2025, 0, 1);
const daily = makeHabit({ frequency: { type: "daily" }, createdAt: longAgo });
const noFreezes = new Set<string>();

describe("currentStreakAsOf", () => {
	it("doesn't break the streak just because today isn't logged yet", () => {
		const entries = [entry(1), entry(2), entry(3)];
		expect(
			currentStreakAsOf({
				habit: daily,
				entries,
				frozenDates: noFreezes,
				today,
			}),
		).toBe(3);
	});

	it("counts today once it's logged", () => {
		const entries = [entry(0), entry(1), entry(2)];
		expect(
			currentStreakAsOf({
				habit: daily,
				entries,
				frozenDates: noFreezes,
				today,
			}),
		).toBe(3);
	});

	it("is 0 for a habit with no logs", () => {
		expect(
			currentStreakAsOf({
				habit: daily,
				entries: [],
				frozenDates: noFreezes,
				today,
			}),
		).toBe(0);
	});
});

describe("calculateLongestStreak", () => {
	it("finds the longest past run and the day it ended", () => {
		// Run of 4 ending 10 days ago, gap, then the current run of 2.
		const entries = [
			entry(13),
			entry(12),
			entry(11),
			entry(10),
			entry(2),
			entry(1),
		];
		const result = calculateLongestStreak({
			habit: daily,
			entries,
			frozenDates: noFreezes,
			today,
		});
		expect(result.days).toBe(4);
		expect(
			result.endedOn && isSameDay(result.endedOn, subDays(today, 10)),
		).toBe(true);
	});

	it("bridges a frozen day like a completion", () => {
		const entries = [entry(3), entry(1)];
		const result = calculateLongestStreak({
			habit: daily,
			entries,
			frozenDates: new Set([dayString(2)]),
			today,
		});
		expect(result.days).toBe(3);
	});

	it("is zero with no end date when nothing was ever logged", () => {
		expect(
			calculateLongestStreak({
				habit: daily,
				entries: [],
				frozenDates: noFreezes,
				today,
			}),
		).toEqual({ days: 0, endedOn: null });
	});
});

describe("calculateCompletionRate", () => {
	it("counts only scheduled days in the denominator", () => {
		// Mon/Wed/Fri habit over the last 3 full weeks' worth of creation.
		const monWedFri = makeHabit({
			frequency: { type: "weekdays", days: [1, 3, 5] },
			createdAt: subDays(today, 20), // Thu 3 Sep
		});
		// 3 Sep → 23 Sep scheduled: 4,7,9,11,14,16,18,21,23 — today (23rd) unlogged so excluded → 8.
		const entries = [entry(19), entry(16), entry(14)]; // 4th, 7th, 9th
		const rate = calculateCompletionRate({
			frozenDates: noFreezes,
			habit: monWedFri,
			entries,
			today,
		});
		expect(rate).toMatchObject({ completed: 3, scheduled: 8, fraction: 3 / 8 });
	});

	it("uses the actual history for a habit younger than 90 days, not a padded 90", () => {
		const young = makeHabit({
			frequency: { type: "daily" },
			createdAt: subDays(today, 9),
		});
		const entries = [entry(9), entry(8), entry(0)];
		expect(
			calculateCompletionRate({
				frozenDates: noFreezes,
				habit: young,
				entries,
				today,
			}),
		).toMatchObject({
			completed: 3,
			scheduled: 10,
			fraction: 0.3,
		});
	});

	it("caps the window at 90 days", () => {
		const entries = Array.from({ length: 120 }, (_, index) => entry(index + 1));
		expect(
			calculateCompletionRate({
				frozenDates: noFreezes,
				habit: daily,
				entries,
				today,
			}).scheduled,
		).toBe(89); // 90-day window, today unlogged.
	});

	it("has no fraction for a brand-new habit with nothing scheduled yet", () => {
		const brandNew = makeHabit({
			frequency: { type: "daily" },
			createdAt: today,
		});
		expect(
			calculateCompletionRate({
				frozenDates: noFreezes,
				habit: brandNew,
				entries: [],
				today,
			}),
		).toMatchObject({ completed: 0, scheduled: 0, fraction: null });
	});

	it("doesn't count a partial quantity day as completed", () => {
		const quantity = makeHabit({
			targetType: "quantity",
			targetAmount: 8,
			createdAt: subDays(today, 1),
		});
		const rate = calculateCompletionRate({
			frozenDates: noFreezes,
			habit: quantity,
			entries: [entry(1, 4)],
			today,
		});
		expect(rate).toEqual({
			completed: 0,
			scheduled: 1,
			frozen: 0,
			fraction: 0,
			skippedPaused: false,
		});
	});

	it("leaves a frozen day out of both sides, not counted as missed (D14)", () => {
		// 10 days old, logged 8; the 2 misses at 3 and 4 days ago — one of them frozen.
		const young = makeHabit({
			frequency: { type: "daily" },
			createdAt: subDays(today, 9),
		});
		const entries = [9, 8, 7, 6, 5, 2, 1, 0].map((daysAgo) => entry(daysAgo));
		const withoutFreeze = calculateCompletionRate({
			habit: young,
			entries,
			frozenDates: noFreezes,
			today,
		});
		expect(withoutFreeze).toMatchObject({ completed: 8, scheduled: 10 });

		const withFreeze = calculateCompletionRate({
			habit: young,
			entries,
			frozenDates: new Set([dayString(3)]),
			today,
		});
		expect(withFreeze).toMatchObject({
			completed: 8,
			scheduled: 9,
			frozen: 1,
		});
		expect(withFreeze.fraction).toBeCloseTo(8 / 9);
	});

	it("has no fraction when every scheduled day was frozen", () => {
		const young = makeHabit({
			frequency: { type: "daily" },
			createdAt: subDays(today, 1),
		});
		const rate = calculateCompletionRate({
			habit: young,
			entries: [],
			frozenDates: new Set([dayString(1)]),
			today,
		});
		expect(rate).toMatchObject({ scheduled: 0, frozen: 1, fraction: null });
	});
});

describe("heatmapLevelFor", () => {
	const quantity = makeHabit({ targetType: "quantity", targetAmount: 8 });

	it.each([
		[2, 1],
		[4, 2],
		[7, 2],
		[8, 3],
		[11, 3],
	])("shades %i of 8 as level %i", (value, level) => {
		expect(heatmapLevelFor(quantity, entry(0, value))).toBe(level);
	});

	it("gives a simple-check entry the full shade", () => {
		expect(heatmapLevelFor(daily, entry(0))).toBe(3);
	});
});

describe("buildHeatmapWeeks", () => {
	const weeks = (overrides: Partial<Parameters<typeof buildHeatmapWeeks>[0]>) =>
		buildHeatmapWeeks({
			habit: daily,
			entries: [],
			frozenDates: noFreezes,
			today,
			...overrides,
		});
	const find = (grid: ReturnType<typeof weeks>, daysAgo: number) =>
		grid.flat().find((day) => isSameDay(day.date, subDays(today, daysAgo)));

	it("is 5 Mon→Sun weeks ending with the current one (D1)", () => {
		const grid = weeks({});
		expect(grid).toHaveLength(HEATMAP_WEEKS);
		for (const column of grid) expect(column).toHaveLength(7);
		expect(format(grid[0][0].date, "EEE")).toBe("Mon");
		const lastColumn = grid[HEATMAP_WEEKS - 1];
		expect(lastColumn.some((day) => isSameDay(day.date, today))).toBe(true);
	});

	it("distinguishes logged, missed, frozen, pending, and future days", () => {
		const grid = weeks({
			entries: [entry(1)],
			frozenDates: new Set([dayString(2)]),
		});
		expect(find(grid, 1)?.status).toBe("logged");
		expect(find(grid, 2)?.status).toBe("frozen");
		expect(find(grid, 3)?.status).toBe("missed");
		expect(find(grid, 0)?.status).toBe("pending");
		const tomorrow = grid
			.flat()
			.find((day) => isSameDay(day.date, addDays(today, 1)));
		expect(tomorrow).toMatchObject({ status: "future", selectable: false });
	});

	it("leaves unscheduled days blank rather than missed", () => {
		const weekdaysOnly = makeHabit({
			frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
			createdAt: longAgo,
		});
		const grid = weeks({ habit: weekdaysOnly });
		// 20 Sep 2026 was a Sunday.
		expect(find(grid, 3)?.status).toBe("not-scheduled");
		expect(find(grid, 2)?.status).toBe("missed");
	});

	it("marks today and only today", () => {
		const grid = weeks({});
		const ringed = grid.flat().filter((day) => day.isToday);
		expect(ringed).toHaveLength(1);
		expect(isSameDay(ringed[0].date, today)).toBe(true);
	});

	it("renders a brand-new habit with no logs as 'before start' up to today, not an error (D3)", () => {
		const brandNew = makeHabit({ createdAt: today });
		const grid = weeks({ habit: brandNew });
		const statuses = new Set(grid.flat().map((day) => day.status));
		expect([...statuses].sort()).toEqual(["before-start", "future", "pending"]);
		expect(find(grid, 1)?.status).toBe("before-start");
		// Days before the habit existed aren't a way into retro logging.
		expect(find(grid, 1)?.selectable).toBe(false);
		expect(find(grid, 0)?.selectable).toBe(true);
	});
});

describe("habitHistoryRows (D2)", () => {
	const note = (daysAgo: number, text: string) => ({
		habitId: 1,
		date: dayString(daysAgo),
		note: text,
	});
	const history = (
		overrides: Partial<Parameters<typeof habitHistoryRows>[0]> = {},
	) => ({
		habit: daily,
		entries: [] as Entry[],
		frozenDates: noFreezes,
		today,
		...overrides,
	});
	const kinds = (rows: ReturnType<typeof habitHistoryRows>) =>
		rows.map((row) => [row.date, row.kind]);

	it("looks back a year at most, however old the habit is", () => {
		const rows = habitHistoryRows(
			history({
				habit: makeHabit({ createdAt: longAgo }),
				entries: [entry(500)],
			}),
			[],
			10_000,
		);
		// Every day of the window is a missed day of a started habit; the days
		// before it are never looked at.
		expect(rows.length).toBeLessThanOrEqual(367);
		expect(rows.at(-1)?.date).toBe(dayString(366));
	});

	it("lists done, missed and frozen days, newest first", () => {
		const rows = habitHistoryRows(
			history({
				entries: [entry(1), entry(4)],
				frozenDates: new Set([dayString(2)]),
			}),
			[],
			4,
		);
		expect(kinds(rows)).toEqual([
			[dayString(1), "done"],
			[dayString(2), "frozen"],
			[dayString(3), "missed"],
			[dayString(4), "done"],
		]);
	});

	it("says nothing about today while it is open, and nothing about a day not due", () => {
		const weekdays = makeHabit({
			frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
			createdAt: longAgo,
		});
		// Wed 23 Sep: today. 20 Sep (Sun) and 19 Sep (Sat) are not due.
		const rows = habitHistoryRows(
			history({ habit: weekdays, entries: [entry(4)] }),
			[],
			4,
		);
		expect(rows.map((row) => row.date)).not.toContain(dayString(0));
		expect(rows.map((row) => row.date)).not.toContain(dayString(3));
	});

	it("a habit nothing has ever been logged for lists no missed days — it has not started (D3)", () => {
		expect(habitHistoryRows(history(), [])).toEqual([]);
	});

	it("tags an off-schedule log a bonus, with its amount", () => {
		const weekdays = makeHabit({
			frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
			createdAt: longAgo,
		});
		// 20 Sep 2026 was a Sunday, three days ago.
		const rows = habitHistoryRows(
			history({ habit: weekdays, entries: [entry(3, 5), entry(4)] }),
			[],
			10,
		);
		expect(rows.find((row) => row.date === dayString(3))).toEqual({
			date: dayString(3),
			kind: "bonus",
			value: 5,
			note: null,
		});
	});

	it("a quantity day below its target is partial", () => {
		const quantity = makeHabit({
			targetType: "quantity",
			targetAmount: 8,
			createdAt: longAgo,
		});
		const rows = habitHistoryRows(
			history({ habit: quantity, entries: [entry(1, 3)] }),
			[],
			1,
		);
		expect(rows[0]).toMatchObject({ kind: "partial", value: 3 });
	});

	it("attaches a day's note to its row", () => {
		const [row] = habitHistoryRows(
			history({ entries: [entry(1)] }),
			[note(1, "Easy day")],
			1,
		);
		expect(row).toMatchObject({ kind: "done", note: "Easy day" });
	});

	it("lists a noted day that would otherwise be silent, so a note is never hidden", () => {
		const weekdays = makeHabit({
			frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
			createdAt: longAgo,
		});
		// 20 Sep 2026 was a Sunday: not due, nothing logged — only its note speaks.
		const rows = habitHistoryRows(
			history({ habit: weekdays, entries: [entry(4)] }),
			[note(3, "Rest day")],
			10,
		);
		expect(rows.find((row) => row.date === dayString(3))).toMatchObject({
			kind: "noted",
			note: "Rest day",
		});
	});

	it("caps at the limit", () => {
		const rows = habitHistoryRows(history({ entries: [entry(30)] }), [], 3);
		expect(rows).toHaveLength(3);
	});

	it("never lists a paused day as missed (HAB-20)", () => {
		const restored = makeHabit({
			createdAt: longAgo,
			pauses: [{ from: dayString(6), to: dayString(2) }],
		});
		const rows = habitHistoryRows(
			history({ habit: restored, entries: [entry(7), entry(0)] }),
			[],
			8,
		);
		for (const daysAgo of [2, 3, 4, 5, 6]) {
			expect(rows.map((row) => row.date)).not.toContain(dayString(daysAgo));
		}
	});
});

describe("completionRateDelta (D1's '+N pts')", () => {
	const young = (daysOld: number) =>
		makeHabit({
			createdAt: subDays(today, daysOld),
			frequency: { type: "daily" },
		});
	const logAll = (from: number, to: number, except: number[] = []) =>
		Array.from({ length: from - to + 1 }, (_, index) => to + index)
			.filter((daysAgo) => !except.includes(daysAgo))
			.map((daysAgo) => entry(daysAgo));

	it("is the 90-day rate minus the rate over the 90 days before, in whole points", () => {
		// Days 0–89: every day. Days 90–179: every other day → 50%.
		const entries = [
			...logAll(89, 0),
			...logAll(179, 90).filter((e) => Number(e.date.slice(-2)) % 2 === 0),
		];
		const delta = completionRateDelta({
			habit: young(200),
			entries,
			frozenDates: noFreezes,
			today,
		});
		expect(delta).not.toBeNull();
		expect(delta as number).toBeGreaterThan(40);
	});

	it("is negative when the rate has fallen", () => {
		const entries = [
			...logAll(179, 90),
			...logAll(89, 0).filter((e) => Number(e.date.slice(-2)) % 2 === 0),
		];
		expect(
			completionRateDelta({
				habit: young(200),
				entries,
				frozenDates: noFreezes,
				today,
			}) as number,
		).toBeLessThan(0);
	});

	it("is null for a habit younger than 90 days: there is nothing to compare", () => {
		expect(
			completionRateDelta({
				habit: young(60),
				entries: logAll(59, 0),
				frozenDates: noFreezes,
				today,
			}),
		).toBeNull();
	});

	it("is null when the earlier window has fewer than seven due days", () => {
		expect(
			completionRateDelta({
				habit: young(94),
				entries: logAll(93, 0),
				frozenDates: noFreezes,
				today,
			}),
		).toBeNull();
	});

	it("is null for an archived habit: its tile says 'until <date>' instead", () => {
		expect(
			completionRateDelta({
				habit: makeHabit({
					createdAt: subDays(today, 200),
					archivedAt: subDays(today, 5),
				}),
				entries: logAll(199, 6),
				frozenDates: noFreezes,
				today,
			}),
		).toBeNull();
	});

	it("leaves frozen days out of both windows (D14)", () => {
		const entries = logAll(179, 0, [100, 20]);
		const frozen = new Set([dayString(100), dayString(20)]);
		expect(
			completionRateDelta({
				habit: young(200),
				entries,
				frozenDates: frozen,
				today,
			}),
		).toBe(0);
	});
});

describe("streaks across an archive (HAB-13, restore semantics HAB-20)", () => {
	// Logged 10 days straight, archived 5 days ago (after that day's log),
	// nothing logged while archived.
	const loggedRun = Array.from({ length: 10 }, (_, index) => entry(index + 5));

	it("freezes the streak at its archived value while archived", () => {
		const archived = makeHabit({
			frequency: { type: "daily" },
			createdAt: longAgo,
			archivedAt: subDays(today, 5),
		});
		expect(
			currentStreakAsOf({
				habit: archived,
				entries: loggedRun,
				frozenDates: noFreezes,
				today,
			}),
		).toBe(10);
	});

	it("starts fresh once restored (HAB-20 over HAB-13): 0 until the next completed log", () => {
		const restored = makeHabit({
			frequency: { type: "daily" },
			createdAt: longAgo,
			// Archived 5 days ago, restored today (the pause ends the day before).
			pauses: [{ from: dayString(5), to: dayString(1) }],
		});
		const history = { habit: restored, frozenDates: noFreezes, today };

		// The 10-day run before the archive is not carried across the gap...
		expect(currentStreakAsOf({ ...history, entries: loggedRun })).toBe(0);
		// ...the next completed log starts a new streak at 1...
		expect(
			currentStreakAsOf({ ...history, entries: [entry(0), ...loggedRun] }),
		).toBe(1);
		// ...and the longest streak is untouched.
		expect(
			calculateLongestStreak({ ...history, entries: loggedRun }).days,
		).toBe(10);
	});

	it("doesn't join the runs either side of an archive into one longest streak", () => {
		const restored = makeHabit({
			frequency: { type: "daily" },
			createdAt: longAgo,
			pauses: [{ from: dayString(12), to: dayString(5) }],
		});
		// 3 days before the archive, 4 after the restore (days 4..1) → 4, not 7.
		const entries = [14, 13, 12, 4, 3, 2, 1].map((n) => entry(n));
		const result = calculateLongestStreak({
			habit: restored,
			entries,
			frozenDates: noFreezes,
			today,
		});
		expect(result.days).toBe(4);
		expect(
			currentStreakAsOf({
				habit: restored,
				entries,
				frozenDates: noFreezes,
				today,
			}),
		).toBe(4);
	});

	it("only the latest restore sets the floor when archived and restored several times", () => {
		const habit = makeHabit({
			frequency: { type: "daily" },
			createdAt: longAgo,
			pauses: [
				{ from: dayString(30), to: dayString(21) },
				{ from: dayString(10), to: dayString(6) },
			],
		});
		// Restored 5 days ago (day after the last pause ends); logged since.
		const entries = [5, 4, 3, 2, 1, 0].map((n) => entry(n));
		expect(
			currentStreakAsOf({ habit, entries, frozenDates: noFreezes, today }),
		).toBe(6);
		// A run that straddles the older restore is cut there too.
		expect(
			calculateLongestStreak({
				habit,
				entries: [20, 19, 18, 17, 16, ...entries.map((_, i) => 5 - i)].map(
					(n) => entry(n),
				),
				frozenDates: noFreezes,
				today,
			}).days,
		).toBe(6);
	});

	it("without the pause, the same gap would have reset it — the pause is what preserves it", () => {
		expect(
			currentStreakAsOf({
				habit: daily,
				entries: loggedRun,
				frozenDates: noFreezes,
				today,
			}),
		).toBe(0);
	});

	it("doesn't count paused days against the 90-day rate", () => {
		const restored = makeHabit({
			frequency: { type: "daily" },
			createdAt: subDays(today, 14),
			pauses: [{ from: dayString(4), to: dayString(1) }],
		});
		const rate = calculateCompletionRate({
			frozenDates: noFreezes,
			habit: restored,
			entries: loggedRun,
			today,
		});
		expect(rate).toMatchObject({ completed: 10, scheduled: 10 });
	});
});

describe("paused days (HAB-20)", () => {
	const restored = makeHabit({
		frequency: { type: "daily" },
		createdAt: longAgo,
		pauses: [{ from: dayString(5), to: dayString(2) }],
	});
	const archived = makeHabit({
		frequency: { type: "daily" },
		createdAt: longAgo,
		archivedAt: subDays(today, 5),
	});
	const statusOn = (
		weeks: ReturnType<typeof buildHeatmapWeeks>,
		daysAgo: number,
	) =>
		weeks.flat().find((day) => isSameDay(day.date, subDays(today, daysAgo)))
			?.status;

	it("reads blank days inside a closed pause as paused, never missed", () => {
		const weeks = buildHeatmapWeeks({
			habit: restored,
			entries: [],
			frozenDates: noFreezes,
			today,
		});
		expect(statusOn(weeks, 4)).toBe("paused");
		expect(statusOn(weeks, 6)).toBe("missed");
		// The restore day is an ordinary day again: yesterday unlogged is missed.
		expect(statusOn(weeks, 1)).toBe("missed");
	});

	it("reads every day from the archive date on as paused while archived", () => {
		const weeks = buildHeatmapWeeks({
			habit: archived,
			entries: [],
			frozenDates: noFreezes,
			today,
		});
		for (const daysAgo of [5, 3, 1, 0]) {
			expect(statusOn(weeks, daysAgo)).toBe("paused");
		}
		expect(statusOn(weeks, 6)).toBe("missed");
	});

	it("still shows a log made during a pause as logged", () => {
		const weeks = buildHeatmapWeeks({
			habit: restored,
			entries: [entry(3)],
			frozenDates: noFreezes,
			today,
		});
		expect(statusOn(weeks, 3)).toBe("logged");
	});

	it("ends an archived habit's 90-day window the day before it was archived", () => {
		// Logged every day for the 20 days before the archive.
		const entries = Array.from({ length: 20 }, (_, index) => entry(index + 6));
		const young = makeHabit({
			frequency: { type: "daily" },
			createdAt: subDays(today, 25),
			archivedAt: subDays(today, 5),
		});
		const rate = calculateCompletionRate({
			frozenDates: noFreezes,
			habit: young,
			entries,
			today,
		});
		expect(rate).toMatchObject({ completed: 20, scheduled: 20, fraction: 1 });
	});

	it("flags a rate that skipped a closed pause", () => {
		const rate = calculateCompletionRate({
			frozenDates: noFreezes,
			habit: restored,
			entries: [],
			today,
		});
		expect(rate.skippedPaused).toBe(true);
		expect(
			calculateCompletionRate({
				frozenDates: noFreezes,
				habit: daily,
				entries: [],
				today,
			}).skippedPaused,
		).toBe(false);
	});
});

describe("streakResetInfo (HAB-20 / D6)", () => {
	// Logged days 4..2 ago, missed yesterday, logged today — pool empty.
	const entries = [entry(4), entry(3), entry(2), entry(0)];
	const history = { habit: daily, entries, frozenDates: noFreezes, today };

	it("reports the missed day and the refill date when the pool is empty", () => {
		const reset = streakResetInfo(history, 0);
		expect(reset && isSameDay(reset.missedDate, subDays(today, 1))).toBe(true);
		expect(reset?.poolRefillsOn).toEqual(new Date(2026, 9, 1));
	});

	it("says nothing while the pool still has freezes", () => {
		expect(streakResetInfo(history, 1)).toBeNull();
	});

	it("says nothing when the miss was covered by a freeze", () => {
		expect(
			streakResetInfo({ ...history, frozenDates: new Set([dayString(1)]) }, 0),
		).toBeNull();
	});

	it("says nothing when there was no streak to lose", () => {
		expect(streakResetInfo({ ...history, entries: [entry(0)] }, 0)).toBeNull();
	});

	it("only speaks in the month the reset happened", () => {
		// Missed 25 Aug, viewed 3 Sep.
		const early = new Date(2026, 8, 3, 12);
		const earlyEntries = [27, 26, 25].map((daysAgo) => ({
			...entry(daysAgo),
			date: format(subDays(early, daysAgo - 20), "yyyy-MM-dd"),
		}));
		expect(
			streakResetInfo(
				{
					habit: daily,
					entries: earlyEntries,
					frozenDates: noFreezes,
					today: early,
				},
				0,
			),
		).toBeNull();
	});

	it("never fires for an archived habit", () => {
		const archived = makeHabit({
			frequency: { type: "daily" },
			createdAt: longAgo,
			archivedAt: subDays(today, 1),
		});
		expect(streakResetInfo({ ...history, habit: archived }, 0)).toBeNull();
	});

	it("outlines the reset day in the heatmap", () => {
		const reset = streakResetInfo(history, 0);
		const weeks = buildHeatmapWeeks(history, reset?.missedDate ?? null);
		const status = weeks
			.flat()
			.find((day) => isSameDay(day.date, subDays(today, 1)))?.status;
		expect(status).toBe("reset");
	});
});
