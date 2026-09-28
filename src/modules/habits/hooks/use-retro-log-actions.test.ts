import { act, renderHook } from "@testing-library/react-native";

const mockSaveDayLog = jest.fn();

jest.mock("../repositories/entry-repository", () => ({
	saveDayLog: (...args: unknown[]) => mockSaveDayLog(...args),
}));

import { useRetroLogActions } from "./use-retro-log-actions";

describe("useRetroLogActions", () => {
	beforeEach(() => {
		mockSaveDayLog.mockReset();
	});

	it("saves the whole day through the repository in one call", async () => {
		mockSaveDayLog.mockResolvedValue(undefined);
		const { result } = await renderHook(() => useRetroLogActions());
		const date = new Date(2026, 8, 15);
		const log = {
			values: [{ habitId: 1, value: 8 }],
			noteHabitId: 1,
			note: "Hotel",
		};

		await act(() => result.current.saveDay(date, log));

		expect(mockSaveDayLog).toHaveBeenCalledWith(date, log);
		expect(result.current.isSaving).toBe(false);
	});

	it("surfaces a failed save as saveError", async () => {
		mockSaveDayLog.mockRejectedValue(new Error("disk full"));
		const { result } = await renderHook(() => useRetroLogActions());

		await act(async () => {
			await expect(
				result.current.saveDay(new Date(), {
					values: [],
					noteHabitId: 1,
					note: "",
				}),
			).rejects.toThrow("disk full");
		});

		expect(result.current.saveError?.message).toBe("disk full");
	});
});
