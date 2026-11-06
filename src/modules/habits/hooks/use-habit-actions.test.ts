import { act, renderHook } from "@testing-library/react-native";

const mockCreateHabit = jest.fn();
const mockUpdateHabit = jest.fn();

jest.mock("../services/habit-create-service", () => ({
	createHabitWithReminders: (...args: unknown[]) => mockCreateHabit(...args),
}));
jest.mock("../services/reminder-service", () => ({
	updateHabitAndSyncReminders: (...args: unknown[]) => mockUpdateHabit(...args),
}));

import { makeHabit, makeHabitInput } from "../test-support/habit-builder";
import { useHabitActions } from "./use-habit-actions";

const habit = makeHabit();

describe("useHabitActions", () => {
	beforeEach(() => {
		mockCreateHabit.mockReset();
		mockUpdateHabit.mockReset();
	});

	it("calls the repository's createHabit and reports loading state", async () => {
		mockCreateHabit.mockResolvedValue({ habit, remindersFailed: false });
		const { result } = await renderHook(() => useHabitActions());

		const created = await act(() =>
			result.current.createHabit(makeHabitInput()),
		);

		expect(mockCreateHabit).toHaveBeenCalledTimes(1);
		expect(created).toEqual({ habit, remindersFailed: false });
		expect(result.current.isCreating).toBe(false);
	});

	it("passes the queued reminders on with the habit", async () => {
		mockCreateHabit.mockResolvedValue({ habit, remindersFailed: false });
		const { result } = await renderHook(() => useHabitActions());
		const queued = [{ hour: 7, minute: 0, weekdays: [1 as const] }];

		await act(() => result.current.createHabit(makeHabitInput(), queued));

		expect(mockCreateHabit).toHaveBeenCalledWith(makeHabitInput(), queued);
	});

	it("saves an edit through the reminder-syncing update, with the habit id and input", async () => {
		mockUpdateHabit.mockResolvedValue({ ...habit, name: "Read more" });
		const { result } = await renderHook(() => useHabitActions());

		await act(() =>
			result.current.updateHabit(1, {
				name: "Read more",
				categoryId: 10,
				targetType: "simple",
				targetAmount: null,
				targetUnit: null,
				frequency: { type: "daily" },
			}),
		);

		expect(mockUpdateHabit).toHaveBeenCalledWith(1, {
			name: "Read more",
			categoryId: 10,
			targetType: "simple",
			targetAmount: null,
			targetUnit: null,
			frequency: { type: "daily" },
		});
	});
});
