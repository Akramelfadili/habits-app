import { renderHook } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";
import type { Habit } from "../types";

let mockHabits: Habit[] = [];
jest.mock("./use-habit-queries", () => ({
	useHabitQueries: () => ({ habits: mockHabits }),
}));

import { useSuggestionsQueries } from "./use-suggestions-queries";

describe("useSuggestionsQueries", () => {
	it("groups the bundle and marks nothing Added on an empty install", async () => {
		mockHabits = [];
		const { result } = await renderHook(() => useSuggestionsQueries());
		const items = result.current.sections.flatMap((s) => s.items);
		expect(items).toHaveLength(9);
		expect(items.some((item) => item.added)).toBe(false);
	});

	it("marks a suggestion Added when a habit has its name, archived included", async () => {
		mockHabits = [
			makeHabit({ id: 1, name: " drink WATER" }),
			makeHabit({
				id: 2,
				name: "Meditate",
				archivedAt: new Date("2026-09-01"),
			}),
		];
		const { result } = await renderHook(() => useSuggestionsQueries());
		const added = result.current.sections
			.flatMap((s) => s.items)
			.filter((item) => item.added)
			.map((item) => item.suggestion.name);
		expect(added.sort()).toEqual(["Drink water", "Meditate"]);
	});
});
