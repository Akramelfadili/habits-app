import { renderHook } from "@testing-library/react-native";
import { formatISO } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";

// Pinned to a Wednesday (matches docs/mockups/today-populated.png's "WEDNESDAY,
// 16 SEPTEMBER") so week-boundary math (per-week frequency) is deterministic —
// "today" is computed inside the hook via `new Date()`, so real time can't
// drive this test's assertions.
const TODAY = new Date("2026-09-16T12:00:00Z");
const TODAY_STRING = formatISO(TODAY, { representation: "date" });
const YESTERDAY_STRING = "2026-09-15"; // Tuesday — same ISO week as TODAY.

const dailyHabit = makeHabit({
	id: 1,
	name: "Glass of water",
	category: "Morning",
	frequency: { type: "daily" },
});
const alsoDailyHabit = makeHabit({
	id: 2,
	name: "Read",
	category: "Evening",
	frequency: { type: "daily" },
});
const perWeekHabit = makeHabit({
	id: 3,
	name: "Gym",
	category: null,
	frequency: { type: "per-week", timesPerWeek: 1 },
});

let mockHabits = [dailyHabit, alsoDailyHabit, perWeekHabit];
let mockEntries: { habitId: number; date: string }[] = [];

jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => mockHabits,
}));
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: () => mockEntries,
}));

import { useTodayQueries } from "./use-today-queries";

describe("useTodayQueries", () => {
	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(TODAY);
		mockHabits = [dailyHabit, alsoDailyHabit, perWeekHabit];
		mockEntries = [];
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("groups due-today habits by category, Anytime last", async () => {
		const { result } = await renderHook(() => useTodayQueries());

		expect(result.current.groups.map((group) => group.category)).toEqual([
			"Morning",
			"Evening",
			"Anytime",
		]);
	});

	it("reports today's total habit count regardless of what's due", async () => {
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.totalHabitCount).toBe(3);
	});

	it("marks a habit completed today from its entry", async () => {
		mockEntries = [{ habitId: 1, date: TODAY_STRING }];
		const { result } = await renderHook(() => useTodayQueries());

		expect(result.current.completedHabitIds.has(1)).toBe(true);
		expect(result.current.completedHabitIds.has(2)).toBe(false);
	});

	it("computes overall progress from due habits and today's completions", async () => {
		mockEntries = [{ habitId: 1, date: TODAY_STRING }];
		const { result } = await renderHook(() => useTodayQueries());

		expect(result.current.progress).toEqual({
			completed: 1,
			total: 3,
			fraction: 1 / 3,
		});
	});

	it("excludes a per-week habit already past its weekly target from due habits", async () => {
		mockEntries = [{ habitId: 3, date: YESTERDAY_STRING }];

		const { result } = await renderHook(() => useTodayQueries());
		const dueIds = result.current.groups.flatMap((group) =>
			group.habits.map((habit) => habit.id),
		);
		expect(dueIds).not.toContain(3);
	});

	it("keeps a per-week habit due when its target hasn't been met yet", async () => {
		const { result } = await renderHook(() => useTodayQueries());
		const dueIds = result.current.groups.flatMap((group) =>
			group.habits.map((habit) => habit.id),
		);
		expect(dueIds).toContain(3);
	});
});
