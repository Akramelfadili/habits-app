import { act, renderHook } from "@testing-library/react-native";
import { useToastStore } from "@/store/toast-store";

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

	it("a failed save never rejects: it toasts the failure and surfaces saveError", async () => {
		useToastStore.setState({ toast: null });
		mockSaveDayLog.mockRejectedValue(new Error("disk full"));
		const { result } = await renderHook(() => useRetroLogActions());

		const returned = await act(() =>
			result.current.saveDay(new Date(2026, 8, 15), {
				values: [],
				noteHabitId: 1,
				note: "",
			}),
		);

		expect(returned).toMatchObject({ ok: false });
		expect(useToastStore.getState().toast).toMatchObject({
			message: "Couldn't save this day. Try again.",
			tone: "error",
		});
		expect(result.current.saveError?.message).toBe("disk full");
	});
});
