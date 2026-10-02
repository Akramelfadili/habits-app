import { renderHook } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";
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

import { useManageHabitsQueries } from "./use-manage-habits-queries";

function entry(habitId: number, date: string): Entry {
	return { id: 0, habitId, date, createdAt: new Date() };
}

describe("useManageHabitsQueries", () => {
	it("lists active habits category by category, manual order within each", async () => {
		mockActive = [
			makeHabit({ id: 1, category: "Morning" }),
			makeHabit({ id: 2, category: "Evening" }),
			makeHabit({ id: 3, category: null }),
			makeHabit({ id: 4, category: "Morning" }),
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
});
