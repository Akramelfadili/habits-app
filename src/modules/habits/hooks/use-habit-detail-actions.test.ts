import { act, renderHook } from "@testing-library/react-native";

const mockArchive = jest.fn();
const mockDelete = jest.fn();
jest.mock("../services/habit-lifecycle-service", () => ({
	archiveHabit: (...args: unknown[]) => mockArchive(...args),
	deleteHabit: (...args: unknown[]) => mockDelete(...args),
}));

import { useHabitDetailActions } from "./use-habit-detail-actions";

describe("useHabitDetailActions", () => {
	it("archives or deletes through the lifecycle service", async () => {
		const { result } = await renderHook(() => useHabitDetailActions());
		await act(() => result.current.archiveHabit(3));
		await act(() => result.current.deleteHabit(4));
		expect(mockArchive).toHaveBeenCalledWith(3);
		expect(mockDelete).toHaveBeenCalledWith(4);
	});
});
