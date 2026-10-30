import { renderHook } from "@testing-library/react-native";
import {
	makeCategory,
	makeHabit,
	TEST_BUILT_IN_CATEGORIES,
} from "../test-support/habit-builder";
import type { Habit } from "../types";

const mockMusic = makeCategory({ id: 11, name: "Music" });
const mockGarden = makeCategory({ id: 12, name: "Garden" });
let mockHabits: Habit[] = [];

jest.mock("../repositories/category-repository", () => ({
	useCategories: () => [
		...jest.requireActual("../test-support/habit-builder")
			.TEST_BUILT_IN_CATEGORIES,
		mockMusic,
		mockGarden,
	],
}));
jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => ({ habits: mockHabits, loaded: true }),
}));

import { useManageCategoriesQueries } from "./use-manage-categories-queries";

describe("useManageCategoriesQueries (HAB-25)", () => {
	it("splits built-ins from customs and counts archived habits too", async () => {
		mockHabits = [
			makeHabit({ id: 1, name: "Piano", category: mockMusic }),
			makeHabit({
				id: 2,
				name: "Scales",
				category: mockMusic,
				archivedAt: new Date(2026, 8, 1),
			}),
		];
		const { result } = await renderHook(() => useManageCategoriesQueries());

		expect(result.current.builtIns.map((row) => row.category)).toEqual(
			TEST_BUILT_IN_CATEGORIES,
		);
		expect(result.current.customs).toEqual([
			{
				category: mockMusic,
				habitNames: ["Piano", "Scales"],
				activeCount: 1,
				archivedCount: 1,
			},
			{
				category: mockGarden,
				habitNames: [],
				activeCount: 0,
				archivedCount: 0,
			},
		]);
		expect(result.current.categories).toHaveLength(12);
	});
});
