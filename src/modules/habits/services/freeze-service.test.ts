const mockGetFreezesUsedInMonth = jest.fn();
const mockFreezeHabitDay = jest.fn();
jest.mock("../repositories/frozen-day-repository", () => ({
	getFreezesUsedInMonth: (...args: unknown[]) =>
		mockGetFreezesUsedInMonth(...args),
	freezeHabitDay: (...args: unknown[]) => mockFreezeHabitDay(...args),
}));

import { applyFreeze } from "./freeze-service";

describe("applyFreeze", () => {
	beforeEach(() => {
		mockGetFreezesUsedInMonth.mockReset();
		mockFreezeHabitDay.mockReset();
	});

	it("writes the freeze when the pool has room", async () => {
		mockGetFreezesUsedInMonth.mockResolvedValue(1);
		await applyFreeze(1, new Date("2026-09-15"));
		expect(mockFreezeHabitDay).toHaveBeenCalledWith(1, new Date("2026-09-15"));
	});

	it("refuses to write once the shared pool is exhausted", async () => {
		mockGetFreezesUsedInMonth.mockResolvedValue(2);
		await expect(applyFreeze(1, new Date("2026-09-15"))).rejects.toThrow();
		expect(mockFreezeHabitDay).not.toHaveBeenCalled();
	});
});
