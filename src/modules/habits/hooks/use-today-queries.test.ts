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
const quantityHabit = makeHabit({
	id: 4,
	name: "Push-ups",
	category: null,
	targetType: "quantity",
	targetAmount: 20,
	targetUnit: "reps",
	frequency: { type: "daily" },
});

type MockEntry = {
	habitId: number;
	date: string;
	createdAt: Date;
	value?: number;
};

let mockHabits = [dailyHabit, alsoDailyHabit, perWeekHabit];
let mockEntries: MockEntry[] = [];

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
		mockEntries = [{ habitId: 1, date: TODAY_STRING, createdAt: TODAY }];
		const { result } = await renderHook(() => useTodayQueries());

		expect(result.current.completedHabitIds.has(1)).toBe(true);
		expect(result.current.completedHabitIds.has(2)).toBe(false);
	});

	it("computes overall progress from due habits and today's completions", async () => {
		mockEntries = [{ habitId: 1, date: TODAY_STRING, createdAt: TODAY }];
		const { result } = await renderHook(() => useTodayQueries());

		expect(result.current.progress).toEqual({
			completed: 1,
			total: 3,
			fraction: 1 / 3,
		});
	});

	it("excludes a per-week habit already past its weekly target from due habits", async () => {
		mockEntries = [
			{
				habitId: 3,
				date: YESTERDAY_STRING,
				createdAt: new Date(YESTERDAY_STRING),
			},
		];

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

	it("is rest-day when habits exist but none are due today", async () => {
		mockHabits = [
			makeHabit({ id: 1, frequency: { type: "weekdays", days: [4] } }), // Thursday only — TODAY is Wednesday.
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.viewState).toBe("rest-day");
	});

	it("is day-closed once every due-today habit is completed", async () => {
		mockEntries = [
			{ habitId: 1, date: TODAY_STRING, createdAt: TODAY },
			{ habitId: 2, date: TODAY_STRING, createdAt: TODAY },
			{ habitId: 3, date: TODAY_STRING, createdAt: TODAY },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.viewState).toBe("day-closed");
	});

	it("names the due-today habit completed most recently as lastCompletedToday", async () => {
		const earlier = new Date("2026-09-16T08:00:00Z");
		const later = new Date("2026-09-16T09:00:00Z");
		mockEntries = [
			{ habitId: 1, date: TODAY_STRING, createdAt: later },
			{ habitId: 2, date: TODAY_STRING, createdAt: earlier },
			{ habitId: 3, date: TODAY_STRING, createdAt: earlier },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.lastCompletedToday).toEqual({
			id: 1,
			name: "Glass of water",
		});
	});

	it("is null for lastCompletedToday when nothing due today is completed", async () => {
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.lastCompletedToday).toBeNull();
	});

	it("ignores an off-schedule entry for a habit that isn't due today", async () => {
		mockHabits = [
			makeHabit({
				id: 1,
				name: "Glass of water",
				frequency: { type: "weekdays", days: [4] },
			}), // Thursday only — TODAY is Wednesday.
		];
		mockEntries = [{ habitId: 1, date: TODAY_STRING, createdAt: TODAY }];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.lastCompletedToday).toBeNull();
	});

	it("does not count a quantity habit's entry as complete when below target", async () => {
		mockHabits = [quantityHabit];
		mockEntries = [
			{ habitId: 4, date: TODAY_STRING, createdAt: TODAY, value: 5 },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.completedHabitIds.has(4)).toBe(false);
	});

	it("counts a quantity habit's entry as complete once the value reaches target", async () => {
		mockHabits = [quantityHabit];
		mockEntries = [
			{ habitId: 4, date: TODAY_STRING, createdAt: TODAY, value: 20 },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.completedHabitIds.has(4)).toBe(true);
	});

	it("exposes today's logged value for a quantity habit via quantityValuesByHabitId", async () => {
		mockHabits = [quantityHabit];
		mockEntries = [
			{ habitId: 4, date: TODAY_STRING, createdAt: TODAY, value: 5 },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.quantityValuesByHabitId.get(4)).toBe(5);
	});

	it("does not treat a below-target quantity entry as lastCompletedToday", async () => {
		mockHabits = [quantityHabit];
		mockEntries = [
			{ habitId: 4, date: TODAY_STRING, createdAt: TODAY, value: 5 },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.lastCompletedToday).toBeNull();
	});

	it("only counts a fully-reached quantity day toward a per-week habit's weekly target", async () => {
		const perWeekQuantityHabit = makeHabit({
			id: 5,
			name: "Run",
			targetType: "quantity",
			targetAmount: 5,
			targetUnit: "km",
			frequency: { type: "per-week", timesPerWeek: 1 },
		});
		mockHabits = [perWeekQuantityHabit];
		mockEntries = [
			{
				habitId: 5,
				date: YESTERDAY_STRING,
				createdAt: new Date(YESTERDAY_STRING),
				value: 2,
			},
		];
		const { result } = await renderHook(() => useTodayQueries());
		const dueIds = result.current.groups.flatMap((group) =>
			group.habits.map((habit) => habit.id),
		);
		expect(dueIds).toContain(5);
	});

	it("includes tomorrow's due habits in tomorrowPreview", async () => {
		const thursdayOnly = makeHabit({
			id: 4,
			name: "Yoga",
			frequency: { type: "weekdays", days: [4] }, // Thursday — TODAY+1.
		});
		mockHabits = [dailyHabit, thursdayOnly];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.tomorrowPreview.map((habit) => habit.id)).toEqual([
			1, 4,
		]);
	});
});
