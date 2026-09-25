import { act, renderHook } from "@testing-library/react-native";

const mockSetHabitQuantityOn = jest.fn();

jest.mock("../repositories/entry-repository", () => ({
	setHabitQuantityOn: (...args: unknown[]) => mockSetHabitQuantityOn(...args),
}));

import { useQuantityLogActions } from "./use-quantity-log-actions";

describe("useQuantityLogActions", () => {
	beforeEach(() => {
		mockSetHabitQuantityOn.mockReset();
	});

	it("calls the repository's setHabitQuantityOn with the habit, date, and value", async () => {
		mockSetHabitQuantityOn.mockResolvedValue(undefined);
		const { result } = await renderHook(() => useQuantityLogActions());
		const date = new Date("2026-09-16T00:00:00Z");

		await act(() => result.current.logQuantity(1, date, 6));

		expect(mockSetHabitQuantityOn).toHaveBeenCalledWith(1, date, 6);
		expect(result.current.isLogging).toBe(false);
	});
});
