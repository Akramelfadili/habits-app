import {
	makeEntry,
	makeFreeze,
	makeHabit,
} from "../test-support/habit-builder";
import {
	createStreakReader,
	groupEntriesByHabit,
	groupFrozenDatesByHabit,
} from "./streak-reader";
import * as streaks from "./streaks";

const TODAY = new Date(2026, 8, 16);
const habit = makeHabit({ id: 1, createdAt: new Date(2026, 0, 1) });
const other = makeHabit({ id: 2, createdAt: new Date(2026, 0, 1) });
const entries = [
	makeEntry({ id: 1, habitId: 1, date: "2026-09-13" }),
	makeEntry({ id: 2, habitId: 2, date: "2026-09-14" }),
	makeEntry({ id: 3, habitId: 1, date: "2026-09-14" }),
	makeEntry({ id: 4, habitId: 1, date: "2026-09-15" }),
];

describe("groupEntriesByHabit", () => {
	it("splits the log per habit, keeping each habit's order", () => {
		const grouped = groupEntriesByHabit(entries);
		expect(grouped.get(1)?.map((entry) => entry.id)).toEqual([1, 3, 4]);
		expect(grouped.get(2)?.map((entry) => entry.id)).toEqual([2]);
		expect(grouped.get(3)).toBeUndefined();
	});

	it("is empty for an empty log", () => {
		expect(groupEntriesByHabit([]).size).toBe(0);
	});
});

describe("groupFrozenDatesByHabit", () => {
	it("collects one set of day keys per habit", () => {
		const grouped = groupFrozenDatesByHabit([
			makeFreeze({ habitId: 1, date: "2026-09-10" }),
			makeFreeze({ habitId: 1, date: "2026-09-11" }),
			makeFreeze({ habitId: 2, date: "2026-09-10" }),
		]);
		expect([...(grouped.get(1) ?? [])]).toEqual(["2026-09-10", "2026-09-11"]);
		expect([...(grouped.get(2) ?? [])]).toEqual(["2026-09-10"]);
	});
});

describe("createStreakReader", () => {
	const entriesByHabit = groupEntriesByHabit(entries);
	const frozenByHabit = groupFrozenDatesByHabit([
		makeFreeze({ habitId: 1, date: "2026-09-12" }),
	]);

	it("answers exactly what the streak rules answer", () => {
		const reader = createStreakReader(entriesByHabit, frozenByHabit);
		const asOf = new Date(2026, 8, 15);
		expect(reader.streakAsOf(habit, asOf)).toBe(
			streaks.calculateCurrentStreak(
				habit,
				entriesByHabit.get(1) ?? [],
				frozenByHabit.get(1) ?? new Set(),
				asOf,
			),
		);
		expect(reader.atRisk(habit, TODAY)).toEqual(
			streaks.getStreakAtRisk(
				habit,
				entriesByHabit.get(1) ?? [],
				frozenByHabit.get(1) ?? new Set(),
				TODAY,
			),
		);
		// A habit with no entries and no freezes: nothing to walk, nothing at risk.
		expect(reader.streakAsOf(makeHabit({ id: 9 }), asOf)).toBe(0);
		expect(reader.atRisk(makeHabit({ id: 9 }), TODAY)).toBeNull();
	});

	it("walks a habit's history once per day asked, however often it is asked", () => {
		const spy = jest.spyOn(streaks, "calculateCurrentStreak");
		const reader = createStreakReader(entriesByHabit, frozenByHabit);
		const day = new Date(2026, 8, 15);
		const first = reader.streakAsOf(habit, day);
		expect(reader.streakAsOf(habit, new Date(2026, 8, 15))).toBe(first);
		expect(spy).toHaveBeenCalledTimes(1);
		reader.streakAsOf(habit, new Date(2026, 8, 16));
		reader.streakAsOf(other, day);
		expect(spy).toHaveBeenCalledTimes(3);
		spy.mockRestore();
	});

	it("remembers an at-risk answer, including 'not at risk'", () => {
		const spy = jest.spyOn(streaks, "getStreakAtRisk");
		const reader = createStreakReader(entriesByHabit, frozenByHabit);
		const first = reader.atRisk(habit, TODAY);
		expect(reader.atRisk(habit, TODAY)).toBe(first);
		expect(spy).toHaveBeenCalledTimes(1);
		spy.mockRestore();
	});

	it("never answers an edited habit from its old self", () => {
		const reader = createStreakReader(entriesByHabit, frozenByHabit);
		const asOf = new Date(2026, 8, 15);
		const before = reader.streakAsOf(habit, asOf);
		const edited = { ...habit, createdAt: new Date(2026, 8, 15) };
		expect(reader.streakAsOf(edited, asOf)).toBe(1);
		expect(reader.streakAsOf(habit, asOf)).toBe(before);
	});

	it("does not share answers between readers built on different logs", () => {
		const empty = createStreakReader(new Map(), new Map());
		const full = createStreakReader(entriesByHabit, frozenByHabit);
		const asOf = new Date(2026, 8, 15);
		expect(empty.streakAsOf(habit, asOf)).toBe(0);
		expect(full.streakAsOf(habit, asOf)).toBeGreaterThan(0);
	});
});
