import { act, renderHook } from "@testing-library/react-native";

const mockSaveDayLog = jest.fn();
jest.mock("../repositories/entry-repository", () => ({
	saveDayLog: (...args: unknown[]) => mockSaveDayLog(...args),
}));

import { useDayNoteActions } from "./use-day-note-actions";

const DAY = new Date(2026, 9, 21);

describe("useDayNoteActions", () => {
	beforeEach(() => mockSaveDayLog.mockReset().mockResolvedValue(undefined));

	it("saves one habit's note for a day and leaves every logged value alone", async () => {
		const { result } = await renderHook(() => useDayNoteActions());
		await act(() => result.current.saveNote(DAY, 4, "Hotel gym"));
		expect(mockSaveDayLog).toHaveBeenCalledWith(DAY, {
			values: [],
			noteHabitId: 4,
			note: "Hotel gym",
		});
	});

	it("resolves not-ok instead of rejecting when the write fails", async () => {
		mockSaveDayLog.mockRejectedValue(new Error("disk"));
		const { result } = await renderHook(() => useDayNoteActions());
		let outcome: { ok: boolean } | undefined;
		await act(async () => {
			outcome = await result.current.saveNote(DAY, 4, "x");
		});
		expect(outcome?.ok).toBe(false);
	});
});
