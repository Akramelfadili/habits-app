import { renderHook } from "@testing-library/react-native";
import { formatISO } from "date-fns";
import { categoryNamed, makeHabit } from "../test-support/habit-builder";

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
	category: categoryNamed("Morning"),
	frequency: { type: "daily" },
});
const alsoDailyHabit = makeHabit({
	id: 2,
	name: "Read",
	category: categoryNamed("Evening"),
	frequency: { type: "daily" },
});
const perWeekHabit = makeHabit({
	id: 3,
	name: "Gym",
	category: categoryNamed("Other"),
	frequency: { type: "per-week", timesPerWeek: 1 },
});
const quantityHabit = makeHabit({
	id: 4,
	name: "Push-ups",
	category: categoryNamed("Other"),
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

type MockFrozenDay = {
	habitId: number;
	date: string;
};

let mockHabits = [dailyHabit, alsoDailyHabit, perWeekHabit];
let mockEntries: MockEntry[] = [];
// Defaults to the full history `mockEntries` holds — most tests only care
// about "today," so the week-bounded and unbounded reads can share one list;
// tests that need streak history further back set this separately.
let mockAllEntries: MockEntry[] | undefined;
let mockFrozenDays: MockFrozenDay[] = [];

jest.mock("../repositories/habit-repository", () => ({
	useActiveHabits: () => mockHabits,
}));
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: () => mockEntries,
	useAllEntries: () => mockAllEntries ?? mockEntries,
}));
jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDays: () => mockFrozenDays,
}));
let mockReminders: Reminder[] = [];
jest.mock("../repositories/reminder-repository", () => ({
	useAllReminders: () => mockReminders,
}));

import type { Reminder } from "../types";
import { useTodayQueries } from "./use-today-queries";

describe("useTodayQueries", () => {
	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(TODAY);
		mockHabits = [dailyHabit, alsoDailyHabit, perWeekHabit];
		mockEntries = [];
		mockAllEntries = undefined;
		mockFrozenDays = [];
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("groups due-today habits by category, Other last", async () => {
		const { result } = await renderHook(() => useTodayQueries());

		expect(result.current.groups.map((group) => group.category.name)).toEqual([
			"Morning",
			"Evening",
			"Other",
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
		expect(result.current.progress.completed).toBe(0);
	});

	it("counts each habit's completed days so far this week, today included", async () => {
		const habit = makeHabit({
			id: 5,
			name: "Run",
			frequency: { type: "per-week", timesPerWeek: 5 },
		});
		mockHabits = [habit];
		mockEntries = [
			{ habitId: 5, date: "2026-09-14", createdAt: TODAY },
			{ habitId: 5, date: "2026-09-15", createdAt: TODAY },
			{ habitId: 5, date: TODAY_STRING, createdAt: TODAY },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.completedThisWeekByHabitId.get(5)).toBe(3);
	});

	it("doesn't count a below-target quantity day toward this week", async () => {
		mockHabits = [quantityHabit];
		mockEntries = [
			{ habitId: 4, date: TODAY_STRING, createdAt: TODAY, value: 5 },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.completedThisWeekByHabitId.get(4)).toBeUndefined();
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

	describe("tomorrow's reminder times (HAB-14)", () => {
		const reminder = (
			overrides: Partial<Reminder> & Pick<Reminder, "habitId">,
		): Reminder => ({
			id: 1,
			hour: 7,
			minute: 20,
			weekdays: [1, 2, 3, 4, 5, 6, 7],
			enabled: true,
			...overrides,
		});

		beforeEach(() => {
			mockReminders = [];
		});

		it("maps a habit to its earliest enabled reminder that fires tomorrow (Thursday)", async () => {
			mockReminders = [
				reminder({ id: 1, habitId: 1, hour: 21, minute: 0 }),
				reminder({ id: 2, habitId: 1, hour: 7, minute: 5 }),
				// Not on Thursday — ignored even though it's earlier.
				reminder({ id: 3, habitId: 1, hour: 6, minute: 0, weekdays: [1, 2] }),
				// Disabled — ignored even though it's earlier.
				reminder({ id: 4, habitId: 1, hour: 5, minute: 0, enabled: false }),
			];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.tomorrowReminderTimeByHabitId.get(1)).toBe("07:05");
		});

		it("leaves a habit with no applicable reminder out of the map", async () => {
			mockReminders = [
				reminder({ habitId: 2, weekdays: [1] }),
				reminder({ id: 2, habitId: 3, enabled: false }),
			];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.tomorrowReminderTimeByHabitId.size).toBe(0);
		});
	});

	describe("streak-at-risk (HAB-08)", () => {
		it("reports the full freeze pool when nothing's been used this month", async () => {
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.freezesRemainingThisMonth).toBe(2);
		});

		it("subtracts freezes used this month, across every habit", async () => {
			mockFrozenDays = [
				{ habitId: 1, date: "2026-09-10" },
				{ habitId: 2, date: "2026-09-11" },
			];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.freezesRemainingThisMonth).toBe(0);
		});

		it("flags a due-today habit at risk when yesterday was due and missed", async () => {
			mockHabits = [dailyHabit];
			mockAllEntries = [
				{ habitId: 1, date: "2026-09-14", createdAt: new Date("2026-09-14") },
				// 2026-09-15 (yesterday) intentionally missing.
			];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.atRiskByHabitId.has(1)).toBe(true);
			expect(result.current.atRiskByHabitId.get(1)?.currentStreak).toBe(1);
		});

		it("does not flag a habit that completed yesterday", async () => {
			mockHabits = [dailyHabit];
			mockAllEntries = [
				{ habitId: 1, date: YESTERDAY_STRING, createdAt: TODAY },
			];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.atRiskByHabitId.has(1)).toBe(false);
		});

		it("does not flag a habit when the freeze pool is exhausted — resets silently instead", async () => {
			mockHabits = [dailyHabit];
			mockAllEntries = [
				{ habitId: 1, date: "2026-09-14", createdAt: new Date("2026-09-14") },
			];
			mockFrozenDays = [
				{ habitId: 2, date: "2026-09-01" },
				{ habitId: 2, date: "2026-09-02" },
			];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.atRiskByHabitId.has(1)).toBe(false);
		});

		it("does not flag a habit whose missed yesterday is already frozen", async () => {
			mockHabits = [dailyHabit];
			mockAllEntries = [
				{ habitId: 1, date: "2026-09-14", createdAt: new Date("2026-09-14") },
			];
			mockFrozenDays = [{ habitId: 1, date: YESTERDAY_STRING }];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.atRiskByHabitId.has(1)).toBe(false);
		});

		it("does not flag a habit with no streak standing before the miss — nothing to lose", async () => {
			mockHabits = [dailyHabit];
			mockAllEntries = []; // No history at all — yesterday was due and missed, but streak-before-miss is 0.
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.atRiskByHabitId.has(1)).toBe(false);
		});

		it("never flags a habit that wasn't due yesterday, even if due today", async () => {
			const wednesdayOnly = makeHabit({
				id: 6,
				name: "Yoga",
				frequency: { type: "weekdays", days: [3] }, // Wednesday (TODAY) only — Tuesday (yesterday) isn't scheduled.
			});
			mockHabits = [wednesdayOnly];
			mockAllEntries = [
				{
					habitId: 6,
					date: "2026-09-09", // last Wednesday — a real prior streak, just not "missed yesterday."
					createdAt: new Date("2026-09-09"),
				},
			];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.atRiskByHabitId.has(6)).toBe(false);
		});
	});
});
