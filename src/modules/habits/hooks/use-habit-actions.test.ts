import { act, renderHook } from "@testing-library/react-native";

const mockCreateHabit = jest.fn();
const mockUpdateHabit = jest.fn();
const mockDeleteAllHabits = jest.fn();

jest.mock("../repositories/habit-repository", () => ({
	createHabit: (...args: unknown[]) => mockCreateHabit(...args),
	updateHabit: (...args: unknown[]) => mockUpdateHabit(...args),
	deleteAllHabits: (...args: unknown[]) => mockDeleteAllHabits(...args),
}));

import { makeHabit, makeHabitInput } from "../test-support/habit-builder";
import { inProduction } from "../test-support/in-production";
import { useHabitActions } from "./use-habit-actions";

const habit = makeHabit();

describe("useHabitActions", () => {
	beforeEach(() => {
		mockCreateHabit.mockReset();
		mockUpdateHabit.mockReset();
		mockDeleteAllHabits.mockReset();
	});

	it("calls the repository's createHabit and reports loading state", async () => {
		mockCreateHabit.mockResolvedValue(habit);
		const { result } = await renderHook(() => useHabitActions());

		const created = await act(() =>
			result.current.createHabit(makeHabitInput()),
		);

		expect(mockCreateHabit).toHaveBeenCalledTimes(1);
		expect(created).toEqual(habit);
		expect(result.current.isCreating).toBe(false);
	});

	it("calls the repository's updateHabit with the habit id and input", async () => {
		mockUpdateHabit.mockResolvedValue({ ...habit, name: "Read more" });
		const { result } = await renderHook(() => useHabitActions());

		await act(() =>
			result.current.updateHabit(1, {
				name: "Read more",
				icon: "book",
				color: "blue",
				category: null,
				targetType: "simple",
				frequency: { type: "daily" },
			}),
		);

		expect(mockUpdateHabit).toHaveBeenCalledWith(1, {
			name: "Read more",
			icon: "book",
			color: "blue",
			category: null,
			targetType: "simple",
			frequency: { type: "daily" },
		});
	});

	it("calls the repository's deleteAllHabits and reports loading state", async () => {
		mockDeleteAllHabits.mockResolvedValue(undefined);
		const { result } = await renderHook(() => useHabitActions());

		await act(() => result.current.clearAllHabits?.());

		expect(mockDeleteAllHabits).toHaveBeenCalledTimes(1);
		expect(result.current.isClearingAll).toBe(false);
	});

	it("exposes no clearAllHabits outside __DEV__", async () => {
		await inProduction(async () => {
			const { result } = await renderHook(() => useHabitActions());
			expect(result.current.clearAllHabits).toBeUndefined();
		});
	});
});
