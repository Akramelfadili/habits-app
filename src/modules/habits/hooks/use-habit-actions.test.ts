import { act, renderHook } from "@testing-library/react-native";

const mockCreateHabit = jest.fn();
const mockUpdateHabit = jest.fn();
const mockDeleteAllHabits = jest.fn();
const mockSeedStreakAtRisk = jest.fn();
const mockSeedHistory = jest.fn();

const mockEnsurePermission = jest.fn();
jest.mock("@/lib/notifications/use-notification-permission", () => ({
	ensureNotificationPermission: (...args: unknown[]) =>
		mockEnsurePermission(...args),
}));
jest.mock("../services/habit-create-service", () => ({
	createHabitWithReminders: (...args: unknown[]) => mockCreateHabit(...args),
}));
jest.mock("../repositories/habit-repository", () => ({
	deleteAllHabits: (...args: unknown[]) => mockDeleteAllHabits(...args),
}));
jest.mock("../services/reminder-service", () => ({
	updateHabitAndSyncReminders: (...args: unknown[]) => mockUpdateHabit(...args),
}));
jest.mock("../dev/dev-seeds", () => ({
	seedStreakAtRiskHabit: (...args: unknown[]) => mockSeedStreakAtRisk(...args),
	seedHabitWithHistory: (...args: unknown[]) => mockSeedHistory(...args),
}));

import { makeHabit, makeHabitInput } from "../test-support/habit-builder";
import { inProduction } from "../test-support/in-production";
import { useHabitActions } from "./use-habit-actions";

const habit = makeHabit();

describe("useHabitActions", () => {
	beforeEach(() => {
		mockCreateHabit.mockReset();
		mockUpdateHabit.mockReset();
		mockDeleteAllHabits.mockReset();
		mockSeedStreakAtRisk.mockReset();
		mockSeedHistory.mockReset();
	});

	it("calls the repository's createHabit and reports loading state", async () => {
		mockCreateHabit.mockResolvedValue({ habit, remindersFailed: false });
		const { result } = await renderHook(() => useHabitActions());

		const created = await act(() =>
			result.current.createHabit(makeHabitInput()),
		);

		expect(mockCreateHabit).toHaveBeenCalledTimes(1);
		expect(created).toEqual({ habit, remindersFailed: false });
		expect(result.current.isCreating).toBe(false);
		expect(mockEnsurePermission).not.toHaveBeenCalled();
	});

	it("asks the OS for notification permission only when reminders are queued", async () => {
		mockCreateHabit.mockResolvedValue({ habit, remindersFailed: false });
		const { result } = await renderHook(() => useHabitActions());
		const queued = [{ hour: 7, minute: 0, weekdays: [1 as const] }];

		await act(() => result.current.createHabit(makeHabitInput(), queued));

		expect(mockEnsurePermission).toHaveBeenCalledTimes(1);
		expect(mockCreateHabit).toHaveBeenCalledWith(makeHabitInput(), queued);
	});

	it("saves an edit through the reminder-syncing update, with the habit id and input", async () => {
		mockUpdateHabit.mockResolvedValue({ ...habit, name: "Read more" });
		const { result } = await renderHook(() => useHabitActions());

		await act(() =>
			result.current.updateHabit(1, {
				name: "Read more",
				categoryId: 10,
				targetType: "simple",
				targetAmount: null,
				targetUnit: null,
				frequency: { type: "daily" },
			}),
		);

		expect(mockUpdateHabit).toHaveBeenCalledWith(1, {
			name: "Read more",
			categoryId: 10,
			targetType: "simple",
			targetAmount: null,
			targetUnit: null,
			frequency: { type: "daily" },
		});
	});

	it("calls the repository's deleteAllHabits and reports loading state", async () => {
		mockDeleteAllHabits.mockResolvedValue(undefined);
		const { result } = await renderHook(() => useHabitActions());

		await act(() => result.current.clearAllHabits?.());

		expect(mockDeleteAllHabits).toHaveBeenCalledTimes(1);
		expect(result.current.isClearingAll).toBe(false);
	});

	it("exposes no clearAllHabits outside __DEV__", async () => {
		await inProduction(async () => {
			const { result } = await renderHook(() => useHabitActions());
			expect(result.current.clearAllHabits).toBeUndefined();
		});
	});

	describe("dev seeds (src/modules/habits/dev/dev-seeds.ts)", () => {
		it("runs seedStreakAtRiskHabit and reports loading state", async () => {
			mockSeedStreakAtRisk.mockResolvedValue(undefined);
			const { result } = await renderHook(() => useHabitActions());

			await act(() => result.current.seedStreakAtRiskHabit?.());

			expect(mockSeedStreakAtRisk).toHaveBeenCalledTimes(1);
			expect(result.current.isSeedingStreakAtRisk).toBe(false);
		});

		it("runs seedHabitWithHistory and reports loading state", async () => {
			mockSeedHistory.mockResolvedValue(undefined);
			const { result } = await renderHook(() => useHabitActions());

			await act(() => result.current.seedHabitWithHistory?.());

			expect(mockSeedHistory).toHaveBeenCalledTimes(1);
			expect(result.current.isSeedingHistory).toBe(false);
		});

		it("exposes neither seed outside __DEV__", async () => {
			await inProduction(async () => {
				const { result } = await renderHook(() => useHabitActions());
				expect(result.current.seedStreakAtRiskHabit).toBeUndefined();
				expect(result.current.seedHabitWithHistory).toBeUndefined();
			});
		});
	});
});
