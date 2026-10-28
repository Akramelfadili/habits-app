import { act, renderHook } from "@testing-library/react-native";
import { useToastStore } from "@/store/toast-store";
import { makeHabit } from "../test-support/habit-builder";

const mockApplyFreeze = jest.fn();
const mockUndoFreeze = jest.fn();

jest.mock("./use-streak-actions", () => ({
	useStreakActions: () => ({
		applyFreeze: mockApplyFreeze,
		undoFreeze: mockUndoFreeze,
		isFreezing: false,
	}),
}));

import { useTodayFreezeActions } from "./use-today-freeze-actions";

const read = makeHabit({ id: 1, name: "Read" });
const missedDate = new Date(2026, 9, 3);
const atRiskByHabitId = new Map([
	[1, { missedDate, currentStreak: 13, freezesRemaining: 2 }],
]);

function setup() {
	return renderHook(() =>
		useTodayFreezeActions({ habits: [read], atRiskByHabitId }),
	);
}

describe("useTodayFreezeActions", () => {
	beforeEach(() => {
		mockApplyFreeze
			.mockReset()
			.mockResolvedValue({ ok: true, value: { freezesLeft: 0 } });
		mockUndoFreeze.mockReset();
		useToastStore.setState({ toast: null });
	});

	it("has no sheet until a habit is opened", async () => {
		const { result } = await setup();
		expect(result.current.atRiskInfo).toBeUndefined();
	});

	it("uses a freeze for the missed day, closes the sheet, and Undo takes it back for that day", async () => {
		const { result } = await setup();
		await act(() => result.current.openAtRisk(1));
		expect(result.current.atRiskInfo?.currentStreak).toBe(13);

		await act(() => result.current.spendFreeze());

		expect(mockApplyFreeze).toHaveBeenCalledWith(1, missedDate);
		expect(result.current.atRiskInfo).toBeUndefined();
		const toast = useToastStore.getState().toast;
		expect(toast?.message).toBe("Freeze used for Sat 3 · 0 left");
		toast?.onAction?.();
		expect(mockUndoFreeze).toHaveBeenCalledWith(1, missedDate);
	});

	it("keeps the sheet open and shows no toast when the freeze fails", async () => {
		mockApplyFreeze.mockResolvedValue({ ok: false });
		const { result } = await setup();
		await act(() => result.current.openAtRisk(1));
		await act(() => result.current.spendFreeze());
		expect(result.current.atRiskInfo).toBeDefined();
		expect(useToastStore.getState().toast).toBeNull();
	});

	it("names the habit whose sheet is open", async () => {
		const { result } = await setup();
		await act(() => result.current.openAtRisk(1));
		expect(result.current.atRiskHabit?.name).toBe("Read");
	});

	it("dismissing writes nothing", async () => {
		const { result } = await setup();
		await act(() => result.current.openAtRisk(1));
		await act(() => result.current.dismissAtRisk());
		expect(result.current.atRiskInfo).toBeUndefined();
		expect(mockApplyFreeze).not.toHaveBeenCalled();
	});
});
