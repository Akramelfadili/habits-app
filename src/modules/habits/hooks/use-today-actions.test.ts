import { act, renderHook } from "@testing-library/react-native";

const mockSetHabitCompletedOn = jest.fn();

jest.mock("../repositories/entry-repository", () => ({
	setHabitCompletedOn: (...args: unknown[]) => mockSetHabitCompletedOn(...args),
}));

import { useTodayActions } from "./use-today-actions";

describe("useTodayActions", () => {
	beforeEach(() => {
		mockSetHabitCompletedOn.mockReset();
	});

	it("calls the repository's setHabitCompletedOn with the habit, date, and completed flag", async () => {
		mockSetHabitCompletedOn.mockResolvedValue(undefined);
		const { result } = await renderHook(() => useTodayActions());
		const date = new Date("2026-09-16T00:00:00Z");

		await act(() => result.current.toggleCompletion(1, date, true));

		expect(mockSetHabitCompletedOn).toHaveBeenCalledWith(1, date, true);
		expect(result.current.isToggling).toBe(false);
	});
});
