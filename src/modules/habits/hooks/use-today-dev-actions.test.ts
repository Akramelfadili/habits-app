import { renderHook } from "@testing-library/react-native";
import { Alert } from "react-native";

const mockClearAll = jest.fn();
const mockResetFirstRun = jest.fn();
let mockDev = true;

jest.mock("./use-habit-actions", () => ({
	useHabitActions: () => ({
		clearAllHabits: mockDev ? mockClearAll : undefined,
		isClearingAll: false,
		seedStreakAtRiskHabit: mockDev ? jest.fn() : undefined,
		isSeedingStreakAtRisk: false,
		seedHabitWithHistory: mockDev ? jest.fn() : undefined,
		isSeedingHistory: false,
	}),
}));
jest.mock("./use-first-run-actions", () => ({
	useFirstRunActions: () => ({
		resetFirstRun: mockDev ? mockResetFirstRun : undefined,
		isResetting: false,
	}),
}));

import { useTodayDevActions } from "./use-today-dev-actions";

describe("useTodayDevActions", () => {
	beforeEach(() => {
		mockDev = true;
		jest.restoreAllMocks();
		mockClearAll.mockReset();
		mockResetFirstRun.mockReset();
	});

	it("exposes nothing outside dev", async () => {
		mockDev = false;
		const { result } = await renderHook(() => useTodayDevActions());
		expect(result.current.clearAll).toBeUndefined();
		expect(result.current.resetFirstRun).toBeUndefined();
		expect(result.current.seedHistory).toBeUndefined();
	});

	it("asks before clearing, and clears only on confirm", async () => {
		const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
		const { result } = await renderHook(() => useTodayDevActions());
		result.current.clearAll?.();
		expect(mockClearAll).not.toHaveBeenCalled();
		const buttons = alert.mock.calls[0][2] ?? [];
		buttons.find((button) => button.text === "Clear")?.onPress?.();
		expect(mockClearAll).toHaveBeenCalledTimes(1);
	});

	it("asks before resetting First Run, and resets only on confirm", async () => {
		const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
		const { result } = await renderHook(() => useTodayDevActions());
		result.current.resetFirstRun?.();
		expect(mockResetFirstRun).not.toHaveBeenCalled();
		const buttons = alert.mock.calls[0][2] ?? [];
		buttons.find((button) => button.text === "Reset")?.onPress?.();
		expect(mockResetFirstRun).toHaveBeenCalledTimes(1);
	});
});
