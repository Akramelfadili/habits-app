import { act, renderHook } from "@testing-library/react-native";
import { clearLog } from "@/lib/logger/logger";
import { useToastStore } from "@/store/toast-store";

const mockArchive = jest.fn();
const mockDelete = jest.fn();
const mockRestore = jest.fn();
const mockUndoRestore = jest.fn();
jest.mock("../services/habit-lifecycle-service", () => ({
	archiveHabit: (...args: unknown[]) => mockArchive(...args),
	deleteHabit: (...args: unknown[]) => mockDelete(...args),
	restoreHabit: (...args: unknown[]) => mockRestore(...args),
	undoRestoreHabit: (...args: unknown[]) => mockUndoRestore(...args),
}));

import { useHabitDetailActions } from "./use-habit-detail-actions";

beforeEach(() => {
	jest.clearAllMocks();
	clearLog();
	useToastStore.setState({ toast: null });
});

describe("useHabitDetailActions", () => {
	it("archives, deletes and restores through the lifecycle service", async () => {
		const { result } = await renderHook(() => useHabitDetailActions());
		await act(() => result.current.archiveHabit(3));
		await act(() => result.current.deleteHabit(4));
		await act(() => result.current.restoreHabit(5));
		expect(mockArchive).toHaveBeenCalledWith(3);
		expect(mockDelete).toHaveBeenCalledWith(4);
		expect(mockRestore).toHaveBeenCalledWith(5);
	});

	it("undoes a restore with the archive date and pauses it had", async () => {
		const before = { archivedAt: new Date(2026, 8, 2), pauses: [] };
		const { result } = await renderHook(() => useHabitDetailActions());
		await act(() => result.current.undoRestoreHabit(3, before));
		expect(mockUndoRestore).toHaveBeenCalledWith(3, before);
	});

	describe("a failed delete (DC4)", () => {
		it("is reported in the sheet — deleteFailed — and not as a toast, and is still logged", async () => {
			mockDelete.mockRejectedValueOnce(new Error("disk full"));
			const { result } = await renderHook(() => useHabitDetailActions());
			expect(result.current.deleteFailed).toBe(false);

			let outcome: { ok: boolean } | undefined;
			await act(async () => {
				outcome = await result.current.deleteHabit(4);
			});

			expect(outcome?.ok).toBe(false);
			expect(result.current.deleteFailed).toBe(true);
			expect(useToastStore.getState().toast).toBeNull();
		});

		it("clears when the next try starts, so the banner goes while it runs, and a success leaves it clear", async () => {
			mockDelete
				.mockRejectedValueOnce(new Error("disk full"))
				.mockResolvedValueOnce(undefined);
			const { result } = await renderHook(() => useHabitDetailActions());
			await act(() => result.current.deleteHabit(4));
			expect(result.current.deleteFailed).toBe(true);
			await act(() => result.current.deleteHabit(4));
			expect(result.current.deleteFailed).toBe(false);
		});

		it("clearDeleteFailure drops the banner when the sheet is reopened", async () => {
			mockDelete.mockRejectedValueOnce(new Error("disk full"));
			const { result } = await renderHook(() => useHabitDetailActions());
			await act(() => result.current.deleteHabit(4));
			await act(async () => result.current.clearDeleteFailure());
			expect(result.current.deleteFailed).toBe(false);
		});
	});

	it("a failed archive is a toast, not a sheet banner", async () => {
		mockArchive.mockRejectedValueOnce(new Error("disk full"));
		const { result } = await renderHook(() => useHabitDetailActions());
		await act(() => result.current.archiveHabit(3));
		expect(useToastStore.getState().toast).toMatchObject({
			message: "Couldn't archive this habit. Try again.",
			tone: "error",
		});
		expect(result.current.deleteFailed).toBe(false);
	});
});
