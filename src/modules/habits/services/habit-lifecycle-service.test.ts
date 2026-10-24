import { makeHabit } from "../test-support/habit-builder";

const mockGetHabit = jest.fn();
const mockSetArchived = jest.fn();
const mockSetRestored = jest.fn();
const mockDelete = jest.fn();
jest.mock("../repositories/habit-repository", () => ({
	getHabit: (...args: unknown[]) => mockGetHabit(...args),
	setHabitArchived: (...args: unknown[]) => mockSetArchived(...args),
	setHabitRestored: (...args: unknown[]) => mockSetRestored(...args),
	deleteHabitAndHistory: (...args: unknown[]) => mockDelete(...args),
}));

const mockCancel = jest.fn();
const mockSync = jest.fn();
jest.mock("./reminder-service", () => ({
	cancelHabitNotifications: (...args: unknown[]) => mockCancel(...args),
	syncAfterWrite: (...args: unknown[]) => mockSync(...args),
}));

import {
	archiveHabit,
	deleteHabit,
	pausesAfterRestore,
	restoreHabit,
	undoRestoreHabit,
} from "./habit-lifecycle-service";

describe("habit-lifecycle-service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("pausesAfterRestore", () => {
		it("closes the archive period the day before the restore", () => {
			expect(
				pausesAfterRestore(
					{ archivedAt: new Date(2026, 8, 2, 20), pauses: [] },
					new Date(2026, 8, 10, 8),
				),
			).toEqual([{ from: "2026-09-02", to: "2026-09-09" }]);
		});

		it("keeps earlier pauses", () => {
			const earlier = { from: "2026-08-01", to: "2026-08-03" };
			expect(
				pausesAfterRestore(
					{ archivedAt: new Date(2026, 8, 2), pauses: [earlier] },
					new Date(2026, 8, 4),
				),
			).toEqual([earlier, { from: "2026-09-02", to: "2026-09-03" }]);
		});

		it("adds nothing for a same-day restore (Undo)", () => {
			expect(
				pausesAfterRestore(
					{ archivedAt: new Date(2026, 8, 2, 9), pauses: [] },
					new Date(2026, 8, 2, 9, 1),
				),
			).toEqual([]);
		});

		it("leaves an active habit's pauses alone", () => {
			expect(
				pausesAfterRestore({ archivedAt: null, pauses: [] }, new Date()),
			).toEqual([]);
		});
	});

	it("archives, then cancels every notification the habit owns", async () => {
		await archiveHabit(3);

		expect(mockSetArchived).toHaveBeenCalledWith(3, expect.any(Date));
		expect(mockCancel).toHaveBeenCalledWith(3);
		expect(mockSetArchived.mock.invocationCallOrder[0]).toBeLessThan(
			mockCancel.mock.invocationCallOrder[0],
		);
	});

	it("restores with the closed pause — the days read as paused, and the streak starts fresh (HAB-20)", async () => {
		const archived = makeHabit({ id: 3, archivedAt: new Date(2000, 0, 1) });
		const restored = makeHabit({ id: 3 });
		mockGetHabit.mockResolvedValue(archived);
		mockSetRestored.mockResolvedValue(restored);

		await restoreHabit(3);

		expect(mockSetRestored).toHaveBeenCalledWith(3, [
			{ from: "2000-01-01", to: expect.any(String) },
		]);
		expect(mockSync).toHaveBeenCalledWith(restored);
	});

	it("undoes a restore by re-archiving with the original date and pauses, then silencing reminders", async () => {
		const archivedAt = new Date(2026, 8, 2, 20, 15);
		const pauses = [{ from: "2026-08-01", to: "2026-08-03" }];

		await undoRestoreHabit(3, { archivedAt, pauses });

		expect(mockSetArchived).toHaveBeenCalledWith(3, archivedAt, pauses);
		expect(mockCancel).toHaveBeenCalledWith(3);
	});

	it("refuses to undo a restore that has no archive date to put back", async () => {
		await expect(
			undoRestoreHabit(3, { archivedAt: null, pauses: [] }),
		).rejects.toThrow();
		expect(mockSetArchived).not.toHaveBeenCalled();
	});

	it("refuses to restore a habit that doesn't exist", async () => {
		mockGetHabit.mockResolvedValue(undefined);
		await expect(restoreHabit(9)).rejects.toThrow("Habit 9 not found");
		expect(mockSync).not.toHaveBeenCalled();
	});

	it("deletes the habit with its history, then cancels its notifications", async () => {
		await deleteHabit(3);

		expect(mockDelete).toHaveBeenCalledWith(3);
		expect(mockCancel).toHaveBeenCalledWith(3);
	});

	it("leaves notifications alone when the delete fails", async () => {
		mockDelete.mockRejectedValue(new Error("boom"));
		await expect(deleteHabit(3)).rejects.toThrow("boom");
		expect(mockCancel).not.toHaveBeenCalled();
	});
});
