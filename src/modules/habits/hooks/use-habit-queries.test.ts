import { renderHook } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";

const mockHabits = [
	makeHabit({ id: 1, name: "Read", category: "Morning" }),
	makeHabit({
		id: 2,
		name: "Gym",
		icon: "flame",
		color: "orange",
		category: "Morning",
	}),
	makeHabit({
		id: 3,
		name: "No phone in bed",
		icon: "moon",
		color: "purple",
		direction: "break",
	}),
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

	it("derives distinct, non-null categories", async () => {
		const { result } = await renderHook(() => useHabitQueries());
		expect(result.current.categories).toEqual(["Morning"]);
	});

	it("finds a habit by id", async () => {
		const { result } = await renderHook(() => useHabitQueries());
		expect(result.current.getHabitById(2)?.name).toBe("Gym");
		expect(result.current.getHabitById(999)).toBeUndefined();
	});
});
