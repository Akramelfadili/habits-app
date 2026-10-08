import { act, renderHook } from "@testing-library/react-native";

const mockApplyFreeze = jest.fn();
jest.mock("../services/habit-service", () => ({
	applyFreeze: (...args: unknown[]) => mockApplyFreeze(...args),
}));

import { useStreakActions } from "./use-streak-actions";

describe("useStreakActions", () => {
	beforeEach(() => {
		mockApplyFreeze.mockReset();
	});

	it("starts idle", async () => {
		const { result } = await renderHook(() => useStreakActions());

		expect(result.current.isFreezing).toBe(false);
		expect(result.current.freezeError).toBeNull();
	});

	it("freezes the missed day through the service", async () => {
		mockApplyFreeze.mockResolvedValue(undefined);
		const { result } = await renderHook(() => useStreakActions());
		const missed = new Date(2026, 8, 15);

		await act(() => result.current.applyFreeze(1, missed));

		expect(mockApplyFreeze).toHaveBeenCalledWith(1, missed);
		expect(result.current.isFreezing).toBe(false);
	});

	it("surfaces a failed freeze (e.g. no freezes left) as freezeError", async () => {
		mockApplyFreeze.mockRejectedValue(new Error("No freezes remaining"));
		const { result } = await renderHook(() => useStreakActions());

		await act(async () => {
			await result.current
				.applyFreeze(1, new Date(2026, 8, 15))
				.catch(() => {});
		});

		expect(result.current.freezeError?.message).toBe("No freezes remaining");
	});
});
