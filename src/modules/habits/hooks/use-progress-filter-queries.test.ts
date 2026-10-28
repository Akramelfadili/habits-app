import { renderHook } from "@testing-library/react-native";
import { read, water } from "../test-support/progress-views";
import { useProgressFilterQueries } from "./use-progress-filter-queries";

let mockHabits = [water, read];
jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => ({ habits: mockHabits, loaded: true }),
}));

describe("useProgressFilterQueries (HP1, HP2)", () => {
	it("splits active from archived habits", async () => {
		const archived = { ...read, id: 9, archivedAt: new Date(2026, 9, 12) };
		mockHabits = [water, read, archived];
		const { result } = await renderHook(() => useProgressFilterQueries());
		expect(result.current.active.map((habit) => habit.id)).toEqual([1, 2]);
		expect(result.current.archived.map((habit) => habit.id)).toEqual([9]);
		expect(result.current.onlyHabit).toBeNull();
	});

	it("knows when there is exactly one habit — Progress's one-habit variant", async () => {
		mockHabits = [water];
		const { result } = await renderHook(() => useProgressFilterQueries());
		expect(result.current.onlyHabit?.id).toBe(1);
	});

	it("an archived habit beside the only active one keeps the chip: there is something to pick", async () => {
		mockHabits = [water, { ...read, id: 9, archivedAt: new Date(2026, 9, 12) }];
		const { result } = await renderHook(() => useProgressFilterQueries());
		expect(result.current.onlyHabit).toBeNull();
	});
});
