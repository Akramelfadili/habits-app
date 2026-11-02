const mockCreateHabit = jest.fn();
const mockCreateReminder = jest.fn();
const mockSync = jest.fn();
const mockEnsurePermission = jest.fn();
jest.mock("@/lib/notifications/use-notification-permission", () => ({
	ensureNotificationPermission: (...args: unknown[]) =>
		mockEnsurePermission(...args),
}));

jest.mock("../repositories/habit-repository", () => ({
	createHabit: (...args: unknown[]) => mockCreateHabit(...args),
}));
jest.mock("../repositories/reminder-repository", () => ({
	createReminder: (...args: unknown[]) => mockCreateReminder(...args),
}));
jest.mock("./reminder-service", () => ({
	syncAfterWrite: (...args: unknown[]) => mockSync(...args),
}));

import { makeHabit } from "../test-support/habit-builder";
import { createHabitWithReminders } from "./habit-create-service";

const input = {
	name: "Read",
	categoryId: 1,
	direction: "build" as const,
	targetType: "simple" as const,
	targetAmount: null,
	targetUnit: null,
	frequency: { type: "daily" as const },
};

beforeEach(() => {
	jest.clearAllMocks();
	mockCreateHabit.mockResolvedValue(makeHabit({ id: 7 }));
});

describe("createHabitWithReminders", () => {
	it("creates just the habit, with no reminder write or sync, when none are queued", async () => {
		const result = await createHabitWithReminders(input);
		expect(result.remindersFailed).toBe(false);
		expect(mockCreateReminder).not.toHaveBeenCalled();
		expect(mockSync).not.toHaveBeenCalled();
		expect(mockEnsurePermission).not.toHaveBeenCalled();
	});

	it("asks the OS for notification permission, once, before saving a habit with reminders", async () => {
		const order: string[] = [];
		mockEnsurePermission.mockImplementation(async () => {
			order.push("permission");
		});
		mockCreateHabit.mockImplementation(async () => {
			order.push("habit");
			return makeHabit({ id: 7 });
		});
		await createHabitWithReminders(input, [
			{ hour: 7, minute: 0, weekdays: [1] },
		]);
		expect(order).toEqual(["permission", "habit"]);
		expect(mockEnsurePermission).toHaveBeenCalledTimes(1);
	});

	it("writes each queued reminder on its own days, then syncs once", async () => {
		await createHabitWithReminders(input, [
			{ hour: 7, minute: 0, weekdays: [2, 4] },
			{ hour: 18, minute: 30, weekdays: [1, 2, 3, 4, 5, 6, 7] },
		]);
		expect(mockCreateReminder).toHaveBeenCalledTimes(2);
		expect(mockCreateReminder).toHaveBeenNthCalledWith(1, {
			habitId: 7,
			hour: 7,
			minute: 0,
			weekdays: [2, 4],
			enabled: true,
		});
		expect(mockSync).toHaveBeenCalledTimes(1);
	});

	it("keeps the habit and reports it when a reminder fails to write", async () => {
		mockCreateReminder.mockRejectedValueOnce(new Error("disk"));
		const result = await createHabitWithReminders(input, [
			{ hour: 7, minute: 0, weekdays: [1] },
			{ hour: 8, minute: 0, weekdays: [1] },
		]);
		expect(result.habit.id).toBe(7);
		expect(result.remindersFailed).toBe(true);
		expect(mockCreateReminder).toHaveBeenCalledTimes(2);
	});

	it("never queues more than the cap of four", async () => {
		const five = Array.from({ length: 5 }, (_, index) => ({
			hour: index,
			minute: 0,
			weekdays: [1 as const],
		}));
		await createHabitWithReminders(input, five);
		expect(mockCreateReminder).toHaveBeenCalledTimes(4);
	});
});
