import { act, renderHook } from "@testing-library/react-native";

const mockSetQuantityOnDay = jest.fn();

jest.mock("../services/day-log-service", () => ({
	setQuantityOnDay: (...args: unknown[]) => mockSetQuantityOnDay(...args),
}));

import { useQuantityLogActions } from "./use-quantity-log-actions";

describe("useQuantityLogActions", () => {
	beforeEach(() => {
		mockSetQuantityOnDay.mockReset();
	});

	it("calls the day-log service with the habit, date, value and target", async () => {
		mockSetQuantityOnDay.mockResolvedValue(undefined);
		const { result } = await renderHook(() => useQuantityLogActions());
		const date = new Date("2026-09-16T00:00:00Z");

		await act(() => result.current.logQuantity(1, date, 6, 8));

		expect(mockSetQuantityOnDay).toHaveBeenCalledWith(1, date, 6, 8);
		expect(result.current.isLogging).toBe(false);
	});
});
