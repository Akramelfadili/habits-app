import { act, renderHook } from "@testing-library/react-native";

const mockCreateHabit = jest.fn();
const mockUpdateHabit = jest.fn();
const mockDeleteAllHabits = jest.fn();
const mockCreateHabitAt = jest.fn();
const mockSetHabitCompletedOn = jest.fn();
const mockSetHabitQuantityOn = jest.fn();
const mockFreezeHabitDay = jest.fn();

jest.mock("../repositories/habit-repository", () => ({
	createHabit: (...args: unknown[]) => mockCreateHabit(...args),
	deleteAllHabits: (...args: unknown[]) => mockDeleteAllHabits(...args),
	createHabitAt: (...args: unknown[]) => mockCreateHabitAt(...args),
}));
jest.mock("../services/reminder-service", () => ({
	updateHabitAndSyncReminders: (...args: unknown[]) => mockUpdateHabit(...args),
}));
jest.mock("../repositories/entry-repository", () => ({
	setHabitCompletedOn: (...args: unknown[]) => mockSetHabitCompletedOn(...args),
	setHabitQuantityOn: (...args: unknown[]) => mockSetHabitQuantityOn(...args),
}));
jest.mock("../repositories/frozen-day-repository", () => ({
	freezeHabitDay: (...args: unknown[]) => mockFreezeHabitDay(...args),
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
		mockCreateHabitAt.mockReset();
		mockSetHabitCompletedOn.mockReset();
		mockSetHabitQuantityOn.mockReset();
		mockFreezeHabitDay.mockReset();
	});

	it("calls the repository's createHabit and reports loading state", async () => {
		mockCreateHabit.mockResolvedValue(habit);
		const { result } = await renderHook(() => useHabitActions());

		const created = await act(() =>
			result.current.createHabit(makeHabitInput()),
		);

		expect(mockCreateHabit).toHaveBeenCalledTimes(1);
		expect(created).toEqual(habit);
		expect(result.current.isCreating).toBe(false);
	});

	it("saves an edit through the reminder-syncing update, with the habit id and input", async () => {
		mockUpdateHabit.mockResolvedValue({ ...habit, name: "Read more" });
		const { result } = await renderHook(() => useHabitActions());

		await act(() =>
			result.current.updateHabit(1, {
				name: "Read more",
				icon: "book",
				color: "blue",
				category: null,
				targetType: "simple",
				targetAmount: null,
				targetUnit: null,
				frequency: { type: "daily" },
			}),
		);

		expect(mockUpdateHabit).toHaveBeenCalledWith(1, {
			name: "Read more",
			icon: "book",
			color: "blue",
			category: null,
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

	describe("seedStreakAtRiskHabit (dev-only HAB-08 test helper)", () => {
		it("creates a backdated habit and completes days -2 and -3, skipping yesterday", async () => {
			mockCreateHabitAt.mockResolvedValue(makeHabit({ id: 9 }));
			const { result } = await renderHook(() => useHabitActions());

			await act(() => result.current.seedStreakAtRiskHabit?.());

			expect(mockCreateHabitAt).toHaveBeenCalledTimes(1);
			expect(mockSetHabitCompletedOn).toHaveBeenCalledTimes(2);
			expect(mockSetHabitCompletedOn).toHaveBeenCalledWith(
				9,
				expect.any(Date),
				true,
			);
		});

		it("exposes no seedStreakAtRiskHabit outside __DEV__", async () => {
			await inProduction(async () => {
				const { result } = await renderHook(() => useHabitActions());
				expect(result.current.seedStreakAtRiskHabit).toBeUndefined();
			});
		});
	});

	describe("seedHabitWithHistory (dev-only HAB-09 test helper)", () => {
		it("creates a backdated quantity habit with months of entries and 2 freezes", async () => {
			mockCreateHabitAt.mockResolvedValue(makeHabit({ id: 7 }));
			const { result } = await renderHook(() => useHabitActions());

			await act(() => result.current.seedHabitWithHistory?.());

			expect(mockCreateHabitAt).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "Glass of water",
					targetType: "quantity",
					targetAmount: 8,
				}),
				expect.any(Date),
			);
			expect(mockSetHabitQuantityOn.mock.calls.length).toBeGreaterThan(100);
			expect(mockSetHabitQuantityOn).toHaveBeenCalledWith(
				7,
				expect.any(Date),
				expect.any(Number),
			);
			expect(mockFreezeHabitDay).toHaveBeenCalledTimes(2);
		});

		it("exposes no seedHabitWithHistory outside __DEV__", async () => {
			await inProduction(async () => {
				const { result } = await renderHook(() => useHabitActions());
				expect(result.current.seedHabitWithHistory).toBeUndefined();
			});
		});
	});
});
