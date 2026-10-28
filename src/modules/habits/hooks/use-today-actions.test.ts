import { act, renderHook } from "@testing-library/react-native";

const mockSetCheckOnDay = jest.fn();
const mockRestoreDay = jest.fn();

jest.mock("../services/day-log-service", () => ({
	setCheckOnDay: (...args: unknown[]) => mockSetCheckOnDay(...args),
	restoreDay: (...args: unknown[]) => mockRestoreDay(...args),
}));

import { useTodayActions } from "./use-today-actions";

describe("useTodayActions", () => {
	beforeEach(() => {
		mockSetCheckOnDay.mockReset();
		mockRestoreDay.mockReset();
	});

	it("toggles through the day-log service with the habit, date, and completed flag", async () => {
		const write = { returnedFreeze: null, freezesLeft: 2 };
		mockSetCheckOnDay.mockResolvedValue(write);
		const { result } = await renderHook(() => useTodayActions());
		const date = new Date("2026-09-16T00:00:00Z");

		const returned = await act(() =>
			result.current.toggleCompletion(1, date, true),
		);

		expect(mockSetCheckOnDay).toHaveBeenCalledWith(1, date, true);
		expect(returned).toEqual({ ok: true, value: write });
		expect(result.current.isToggling).toBe(false);
	});

	it("restoreDay passes the previous state and the returned freeze to the service", async () => {
		mockRestoreDay.mockResolvedValue(undefined);
		const { result } = await renderHook(() => useTodayActions());
		const date = new Date("2026-09-16T00:00:00Z");
		const freeze = {
			id: 3,
			habitId: 1,
			date: "2026-09-16",
			createdAt: new Date(),
		};

		await act(() => result.current.restoreDay(1, date, false, freeze));

		expect(mockRestoreDay).toHaveBeenCalledWith(1, date, false, freeze);
	});
});
