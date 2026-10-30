import { renderHook } from "@testing-library/react-native";
import { builtInCategory, makeHabit } from "../test-support/habit-builder";
import type { Category, Entry, FrozenDay, Habit } from "../types";

// Pinned so "today" (computed inside the hook) is deterministic.
const TODAY = new Date(2026, 8, 23, 12); // Wednesday 23 Sep 2026

let mockActive: Habit[] = [];
let mockArchived: Habit[] = [];
let mockCategories: Category[] = [];
let mockEntries: Entry[] = [];
let mockFrozen: FrozenDay[] = [];
let mockLoaded = true;

jest.mock("../repositories/habit-repository", () => ({
	useActiveHabits: () => ({ habits: mockActive, loaded: mockLoaded }),
	useArchivedHabits: () => ({ habits: mockArchived, loaded: mockLoaded }),
}));
jest.mock("../repositories/category-repository", () => ({
	useCategories: () => mockCategories,
}));
jest.mock("../repositories/entry-repository", () => ({
	useAllEntries: () => mockEntries,
}));
jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDays: () => mockFrozen,
}));

import { useHabitsQueries } from "./use-habits-queries";

function entry(habitId: number, date: string): Entry {
	return { id: 0, habitId, date, createdAt: new Date(date) };
}

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(TODAY);
	mockActive = [];
	mockArchived = [];
	mockCategories = [];
	mockEntries = [];
	mockFrozen = [];
	mockLoaded = true;
});

afterEach(() => {
	jest.useRealTimers();
});

describe("useHabitsQueries", () => {
	it("lists active habits category by category, manual order within each", async () => {
		mockActive = [
			makeHabit({ id: 1, category: builtInCategory("Health") }),
			makeHabit({ id: 2, category: builtInCategory("Fitness") }),
			makeHabit({ id: 3, category: builtInCategory("Other") }),
			makeHabit({ id: 4, category: builtInCategory("Health") }),
		];
		const { result } = await renderHook(() => useHabitsQueries());
		expect(result.current.active.map((habit) => habit.id)).toEqual([
			1, 4, 2, 3,
		]);
		expect(result.current.groups.map((group) => group.habits.length)).toEqual([
			2, 1, 1,
		]);
	});

	it("orders the groups by the stored category order (HAB-42)", async () => {
		mockCategories = [builtInCategory("Fitness"), builtInCategory("Health")];
		mockActive = [
			makeHabit({ id: 1, category: builtInCategory("Health") }),
			makeHabit({ id: 2, category: builtInCategory("Fitness") }),
		];
		const { result } = await renderHook(() => useHabitsQueries());
		expect(result.current.groups.map((group) => group.category.name)).toEqual([
			"Fitness",
			"Health",
		]);
		expect(result.current.categoryCount).toBe(2);
	});

	it("is not loaded until both lists are", async () => {
		mockLoaded = false;
		const { result } = await renderHook(() => useHabitsQueries());
		expect(result.current.isLoaded).toBe(false);
	});

	it("gives a running streak to the habits that have one, and none to the rest", async () => {
		const created = new Date(2026, 8, 1);
		mockActive = [
			makeHabit({ id: 1, createdAt: created }),
			makeHabit({ id: 2, createdAt: created }),
		];
		mockEntries = [
			entry(1, "2026-09-21"),
			entry(1, "2026-09-22"),
			entry(1, "2026-09-23"),
			entry(2, "2026-09-10"),
		];
		const { result } = await renderHook(() => useHabitsQueries());
		expect(result.current.streakByHabitId.get(1)).toBe(3);
		expect(result.current.streakByHabitId.has(2)).toBe(false);
	});

	it("a freeze bridges a day in a running streak", async () => {
		mockActive = [makeHabit({ id: 1, createdAt: new Date(2026, 8, 1) })];
		mockEntries = [entry(1, "2026-09-21"), entry(1, "2026-09-23")];
		mockFrozen = [
			{ id: 1, habitId: 1, date: "2026-09-22", createdAt: new Date() },
		];
		const { result } = await renderHook(() => useHabitsQueries());
		expect(result.current.streakByHabitId.get(1)).toBe(3);
	});

	it("gives an archived habit the longest run it ever had", async () => {
		mockArchived = [
			makeHabit({
				id: 6,
				createdAt: new Date(2026, 7, 1),
				archivedAt: new Date(2026, 8, 12),
			}),
		];
		mockEntries = [
			entry(6, "2026-08-01"),
			entry(6, "2026-08-02"),
			entry(6, "2026-08-03"),
			entry(6, "2026-08-10"),
		];
		const { result } = await renderHook(() => useHabitsQueries());
		expect(result.current.bestStreakByHabitId.get(6)).toBe(3);
		expect(result.current.archived.map((habit) => habit.id)).toEqual([6]);
	});

	it("an archived habit that never had a streak has no best streak", async () => {
		mockArchived = [
			makeHabit({
				id: 6,
				createdAt: new Date(2026, 7, 1),
				archivedAt: new Date(2026, 8, 12),
			}),
		];
		const { result } = await renderHook(() => useHabitsQueries());
		expect(result.current.bestStreakByHabitId.has(6)).toBe(false);
	});
});
