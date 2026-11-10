import { renderHook } from "@testing-library/react-native";
import * as streaks from "../domain/streaks";
import { makeEntry, makeHabit } from "../test-support/habit-builder";
import type { Entry } from "../types";

const TODAY = new Date("2026-09-16T12:00:00Z");
const habit = makeHabit({ id: 1, createdAt: new Date(2026, 0, 1) });
const mockHabits = [habit];
const mockRangeEntries: Entry[] = [];
const mockAllEntries: Entry[] = [
	makeEntry({ id: 1, habitId: 1, date: "2026-09-14" }),
	makeEntry({ id: 2, habitId: 1, date: "2026-09-15" }),
];
const mockFrozenDays: never[] = [];

jest.mock("../repositories/habit-repository", () => ({
	useActiveHabits: () => ({ habits: mockHabits, loaded: true }),
}));
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: () => mockRangeEntries,
	useAllEntries: () => mockAllEntries,
}));
jest.mock("../repositories/category-repository", () => ({
	useCategories: () => [],
}));
jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDays: () => mockFrozenDays,
}));

import { useTodayQueries } from "./use-today-queries";

describe("useTodayQueries memoisation", () => {
	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(TODAY);
	});
	afterEach(() => {
		jest.restoreAllMocks();
		jest.useRealTimers();
	});

	it("walks no history on a re-render with the same inputs", async () => {
		const streak = jest.spyOn(streaks, "calculateCurrentStreak");
		const risk = jest.spyOn(streaks, "getStreakAtRisk");
		const { result, rerender } = await renderHook(
			(key: string | null) => useTodayQueries(key),
			{ initialProps: null as string | null },
		);
		const walks = streak.mock.calls.length;
		const checks = risk.mock.calls.length;
		expect(walks).toBeGreaterThan(0);
		const first = result.current.streakByHabitId;

		await rerender(null);

		expect(streak).toHaveBeenCalledTimes(walks);
		expect(risk).toHaveBeenCalledTimes(checks);
		expect(result.current.streakByHabitId).toBe(first);
	});

	it("walks a day once, however many times the shown day flips back to it", async () => {
		const streak = jest.spyOn(streaks, "calculateCurrentStreak");
		const { result, rerender } = await renderHook(
			(key: string | null) => useTodayQueries(key),
			{ initialProps: null as string | null },
		);
		const asToday = result.current.streakByHabitId.get(1);

		await rerender("2026-09-14");
		const afterFirstVisit = streak.mock.calls.length;
		await rerender(null);
		await rerender("2026-09-14");

		expect(streak).toHaveBeenCalledTimes(afterFirstVisit);
		expect(asToday).toBe(2);
		// Nothing was completed on the 14th itself: counted from the 13th, no run.
		expect(result.current.streakByHabitId.get(1)).toBeUndefined();
	});
});
