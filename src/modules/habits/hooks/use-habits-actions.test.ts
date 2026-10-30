import { act, renderHook } from "@testing-library/react-native";
import { useToastStore } from "@/store/toast-store";
import { makeHabit } from "../test-support/habit-builder";

const mockReorder = jest.fn();
jest.mock("../repositories/habit-repository", () => ({
	reorderHabits: (...args: unknown[]) => mockReorder(...args),
}));
const mockArchive = jest.fn();
const mockRestore = jest.fn();
const mockUndoRestore = jest.fn();
jest.mock("../services/habit-lifecycle-service", () => ({
	archiveHabit: (...args: unknown[]) => mockArchive(...args),
	restoreHabit: (...args: unknown[]) => mockRestore(...args),
	undoRestoreHabit: (...args: unknown[]) => mockUndoRestore(...args),
}));

import { useHabitsActions } from "./use-habits-actions";

const archivedAt = new Date(2026, 9, 12);
const run = makeHabit({
	id: 6,
	name: "Morning run",
	archivedAt,
	pauses: [{ from: "2026-08-01", to: "2026-08-05" }],
});

beforeEach(() => {
	jest.clearAllMocks();
	useToastStore.setState({ toast: null });
});

describe("useHabitsActions", () => {
	it("reorders straight through the repository", async () => {
		const { result } = await renderHook(() => useHabitsActions());
		await act(() => result.current.reorderHabits([2, 1]));
		expect(mockReorder).toHaveBeenCalledWith([2, 1]);
	});

	it("Restore is instant and says the habit is back on Today, with Undo (H5)", async () => {
		const { result } = await renderHook(() => useHabitsActions());
		await act(() => result.current.restore(run));
		expect(mockRestore).toHaveBeenCalledWith(6);
		expect(useToastStore.getState().toast).toMatchObject({
			message: "Morning run is back on Today",
			actionLabel: "Undo",
			tone: "success",
		});
	});

	it("Undo re-archives with the archive date and pauses it had, not a fresh archive", async () => {
		const { result } = await renderHook(() => useHabitsActions());
		await act(() => result.current.restore(run));
		await act(async () => {
			useToastStore.getState().toast?.onAction?.();
		});
		expect(mockUndoRestore).toHaveBeenCalledWith(6, {
			archivedAt,
			pauses: run.pauses,
		});
	});

	it("a failed Restore shows the error toast and no 'back on Today'", async () => {
		mockRestore.mockRejectedValueOnce(new Error("disk"));
		const { result } = await renderHook(() => useHabitsActions());
		await act(() => result.current.restore(run));
		expect(useToastStore.getState().toast).toMatchObject({
			message: "Couldn't restore this habit. Try again.",
			tone: "error",
		});
	});

	it("Archive from a row's VoiceOver action says so with an Undo that restores it", async () => {
		const water = makeHabit({ id: 1, name: "Glass of water" });
		const { result } = await renderHook(() => useHabitsActions());
		await act(() => result.current.archive(water));
		expect(mockArchive).toHaveBeenCalledWith(1);
		expect(useToastStore.getState().toast).toMatchObject({
			message: "Glass of water archived",
			actionLabel: "Undo",
		});
		await act(async () => {
			useToastStore.getState().toast?.onAction?.();
		});
		expect(mockRestore).toHaveBeenCalledWith(1);
	});

	it("a failed Archive shows no 'archived' toast", async () => {
		mockArchive.mockRejectedValueOnce(new Error("disk"));
		const { result } = await renderHook(() => useHabitsActions());
		await act(() => result.current.archive(makeHabit({ id: 1 })));
		expect(useToastStore.getState().toast?.tone).toBe("error");
	});
});
