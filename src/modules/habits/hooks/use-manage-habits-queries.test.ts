import { renderHook } from "@testing-library/react-native";
import { categoryNamed, makeHabit } from "../test-support/habit-builder";
import type { Entry, Habit } from "../types";

let mockActive: Habit[] = [];
let mockArchived: Habit[] = [];
let mockEntries: Entry[] = [];

jest.mock("../repositories/habit-repository", () => ({
	useActiveHabits: () => mockActive,
	useArchivedHabits: () => mockArchived,
}));
jest.mock("../repositories/entry-repository", () => ({
	useAllEntries: () => mockEntries,
}));

import { groupHabitsByCategory } from "../screens/today-screen-helpers";
import { useManageHabitsQueries } from "./use-manage-habits-queries";

function entry(habitId: number, date: string): Entry {
	return { id: 0, habitId, date, createdAt: new Date() };
}

describe("useManageHabitsQueries", () => {
	it("lists active habits category by category, manual order within each", async () => {
		mockActive = [
			makeHabit({ id: 1, category: categoryNamed("Morning") }),
			makeHabit({ id: 2, category: categoryNamed("Evening") }),
			makeHabit({ id: 3, category: categoryNamed("Other") }),
			makeHabit({ id: 4, category: categoryNamed("Morning") }),
		];
		mockArchived = [];

		const { result } = await renderHook(() => useManageHabitsQueries());

		expect(result.current.active.map((habit) => habit.id)).toEqual([
			1, 4, 2, 3,
		]);
	});

	it("counts each archived habit's kept logs", async () => {
		mockActive = [];
		mockArchived = [
			makeHabit({ id: 6, archivedAt: new Date(2026, 8, 2) }),
			makeHabit({ id: 7, archivedAt: new Date(2026, 7, 18) }),
		];
		mockEntries = [
			entry(6, "2026-09-01"),
			entry(6, "2026-09-02"),
			entry(1, "2026-09-02"),
		];

		const { result } = await renderHook(() => useManageHabitsQueries());

		expect(
			result.current.archived.map(({ habit, logsKept }) => [
				habit.id,
				logsKept,
			]),
		).toEqual([
			[6, 2],
			[7, 0],
		]);
	});

	it("groups exactly as Today does — same function, same order, Other last", async () => {
		mockActive = [
			makeHabit({ id: 1, category: categoryNamed("Other") }),
			makeHabit({ id: 2, category: categoryNamed("Training") }),
			makeHabit({ id: 3, category: categoryNamed("Morning") }),
			makeHabit({ id: 4, category: categoryNamed("Training") }),
		];
		mockArchived = [];

		const { result } = await renderHook(() => useManageHabitsQueries());

		const today = groupHabitsByCategory(mockActive);
		expect(result.current.groups).toEqual(today);
		expect(result.current.groups.map((g) => g.category.name)).toEqual([
			"Training",
			"Morning",
			"Other",
		]);
	});

	it("gives an emptied category no group at all", async () => {
		mockActive = [makeHabit({ id: 1, category: categoryNamed("Morning") })];
		mockArchived = [makeHabit({ id: 2, category: categoryNamed("Evening") })];

		const { result } = await renderHook(() => useManageHabitsQueries());

		expect(result.current.groups.map((g) => g.category.name)).toEqual([
			"Morning",
		]);
	});
});
