import { renderHook } from "@testing-library/react-native";
import { makeCategory, makeHabit } from "../test-support/habit-builder";

const mockHabits = [
	makeHabit({ id: 1, name: "Read", category: makeCategory() }),
	makeHabit({ id: 2, name: "Gym", category: makeCategory() }),
	makeHabit({ id: 3, name: "No phone in bed", direction: "break" }),
];

jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => mockHabits,
}));

import { useHabitQueries } from "./use-habit-queries";

describe("useHabitQueries", () => {
	it("returns all habits", async () => {
		const { result } = await renderHook(() => useHabitQueries());
		expect(result.current.habits).toEqual(mockHabits);
	});

	it("finds a habit by id", async () => {
		const { result } = await renderHook(() => useHabitQueries());
		expect(result.current.getHabitById(2)?.name).toBe("Gym");
		expect(result.current.getHabitById(999)).toBeUndefined();
	});
});
