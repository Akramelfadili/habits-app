import { act, renderHook } from "@testing-library/react-native";

const mockAddSuggestedHabits = jest.fn();
const mockSetSetting = jest.fn();
const mockDeleteSetting = jest.fn();
const mockDeleteAllHabits = jest.fn();

jest.mock("../services/first-run-service", () => ({
	addSuggestedHabits: (...args: unknown[]) => mockAddSuggestedHabits(...args),
}));

jest.mock("../repositories/habit-repository", () => ({
	deleteAllHabits: (...args: unknown[]) => mockDeleteAllHabits(...args),
}));

jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	setSetting: (...args: unknown[]) => mockSetSetting(...args),
	deleteSetting: (...args: unknown[]) => mockDeleteSetting(...args),
}));

import {
	FIRST_RUN_SUGGESTIONS,
	SEEN_FIRST_RUN_SETTING_KEY,
} from "../constants";
import { inProduction } from "../test-support/in-production";
import { useFirstRunActions } from "./use-first-run-actions";

describe("useFirstRunActions", () => {
	beforeEach(() => {
		mockAddSuggestedHabits.mockReset();
		mockSetSetting.mockReset();
		mockDeleteSetting.mockReset();
		mockDeleteAllHabits.mockReset();
	});

	it("calls the service's addSuggestedHabits and reports loading state", async () => {
		mockAddSuggestedHabits.mockResolvedValue([]);
		const { result } = await renderHook(() => useFirstRunActions());

		await act(() =>
			result.current.addSuggestedHabits(FIRST_RUN_SUGGESTIONS.slice(0, 2)),
		);

		expect(mockAddSuggestedHabits).toHaveBeenCalledWith(
			FIRST_RUN_SUGGESTIONS.slice(0, 2),
		);
		expect(result.current.isAdding).toBe(false);
	});

	it("marks the setting directly on skip and reports loading state", async () => {
		mockSetSetting.mockResolvedValue(undefined);
		const { result } = await renderHook(() => useFirstRunActions());

		await act(() => result.current.skipFirstRun());

		expect(mockSetSetting).toHaveBeenCalledWith(
			SEEN_FIRST_RUN_SETTING_KEY,
			"true",
		);
		expect(result.current.isSkipping).toBe(false);
	});

	it("clears every habit and un-sets the flag on resetFirstRun", async () => {
		mockDeleteAllHabits.mockResolvedValue(undefined);
		mockDeleteSetting.mockResolvedValue(undefined);
		const { result } = await renderHook(() => useFirstRunActions());

		await act(() => result.current.resetFirstRun?.());

		expect(mockDeleteAllHabits).toHaveBeenCalledTimes(1);
		expect(mockDeleteSetting).toHaveBeenCalledWith(SEEN_FIRST_RUN_SETTING_KEY);
		expect(result.current.isResetting).toBe(false);
	});

	it("exposes no resetFirstRun outside __DEV__", async () => {
		await inProduction(async () => {
			const { result } = await renderHook(() => useFirstRunActions());
			expect(result.current.resetFirstRun).toBeUndefined();
		});
	});
});
