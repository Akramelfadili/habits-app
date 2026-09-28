import { act, renderHook } from "@testing-library/react-native";

const mockReorder = jest.fn();
jest.mock("../repositories/habit-repository", () => ({
	reorderHabits: (...args: unknown[]) => mockReorder(...args),
}));
const mockArchive = jest.fn();
const mockRestore = jest.fn();
jest.mock("../services/habit-lifecycle-service", () => ({
	archiveHabit: (...args: unknown[]) => mockArchive(...args),
	restoreHabit: (...args: unknown[]) => mockRestore(...args),
}));

import { useManageHabitsActions } from "./use-manage-habits-actions";

describe("useManageHabitsActions", () => {
	it("reorders straight through the repository", async () => {
		const { result } = await renderHook(() => useManageHabitsActions());
		await act(() => result.current.reorderHabits([2, 1]));
		expect(mockReorder).toHaveBeenCalledWith([2, 1]);
	});

	it("archives and restores through the lifecycle service", async () => {
		const { result } = await renderHook(() => useManageHabitsActions());
		await act(() => result.current.archiveHabit(3));
		await act(() => result.current.restoreHabit(3));
		expect(mockArchive).toHaveBeenCalledWith(3);
		expect(mockRestore).toHaveBeenCalledWith(3);
	});
});
