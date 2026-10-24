const mockCreateHabitAt = jest.fn();
const mockSetHabitCompletedOn = jest.fn();
const mockSetHabitQuantityOn = jest.fn();
const mockFreezeHabitDay = jest.fn();

jest.mock("../repositories/habit-repository", () => ({
	createHabitAt: (...args: unknown[]) => mockCreateHabitAt(...args),
}));
jest.mock("../repositories/category-repository", () => ({
	getCategories: async () =>
		jest.requireActual("../test-support/habit-builder")
			.TEST_BUILT_IN_CATEGORIES,
}));
jest.mock("../repositories/entry-repository", () => ({
	setHabitCompletedOn: (...args: unknown[]) => mockSetHabitCompletedOn(...args),
	setHabitQuantityOn: (...args: unknown[]) => mockSetHabitQuantityOn(...args),
}));
jest.mock("../repositories/frozen-day-repository", () => ({
	freezeHabitDay: (...args: unknown[]) => mockFreezeHabitDay(...args),
}));

import { makeHabit } from "../test-support/habit-builder";
import { seedHabitWithHistory, seedStreakAtRiskHabit } from "./dev-seeds";

beforeEach(() => {
	mockCreateHabitAt.mockReset();
	mockSetHabitCompletedOn.mockReset();
	mockSetHabitQuantityOn.mockReset();
	mockFreezeHabitDay.mockReset();
});

describe("seedStreakAtRiskHabit (dev-only HAB-08 test helper)", () => {
	it("creates a backdated habit and completes days -2 and -3, skipping yesterday", async () => {
		mockCreateHabitAt.mockResolvedValue(makeHabit({ id: 9 }));

		await seedStreakAtRiskHabit();

		expect(mockCreateHabitAt).toHaveBeenCalledTimes(1);
		expect(mockSetHabitCompletedOn).toHaveBeenCalledTimes(2);
		expect(mockSetHabitCompletedOn).toHaveBeenCalledWith(
			9,
			expect.any(Date),
			true,
		);
	});
});

describe("seedHabitWithHistory (dev-only HAB-09 test helper)", () => {
	it("creates a backdated quantity habit with months of entries and 2 freezes", async () => {
		mockCreateHabitAt.mockResolvedValue(makeHabit({ id: 7 }));

		await seedHabitWithHistory();

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
});
