import { makeHabit } from "../test-support/habit-builder";
import type { Reminder } from "../types";

const mockCancel = jest.fn();
const mockSchedule = jest.fn();
jest.mock("@/lib/notifications/notifications", () => ({
	cancelRemindersWithPrefix: (...args: unknown[]) => mockCancel(...args),
	scheduleReminder: (...args: unknown[]) => mockSchedule(...args),
}));

const mockSetSetting = jest.fn();
jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	setSetting: (...args: unknown[]) => mockSetSetting(...args),
}));

const mockUpdateHabit = jest.fn();
jest.mock("../repositories/habit-repository", () => ({
	updateHabit: (...args: unknown[]) => mockUpdateHabit(...args),
}));

const mockGetHabitReminders = jest.fn();
const mockCreateReminder = jest.fn();
const mockUpdateReminder = jest.fn();
const mockDeleteReminder = jest.fn();
jest.mock("../repositories/reminder-repository", () => ({
	getHabitReminders: (...args: unknown[]) => mockGetHabitReminders(...args),
	createReminder: (...args: unknown[]) => mockCreateReminder(...args),
	updateReminder: (...args: unknown[]) => mockUpdateReminder(...args),
	deleteReminder: (...args: unknown[]) => mockDeleteReminder(...args),
}));

import {
	addReminder,
	editReminder,
	habitNotificationPrefix,
	ReminderCapError,
	removeReminder,
	setEveningReview,
	syncHabitReminders,
	unscheduledReminderDays,
	updateHabitAndSyncReminders,
} from "./reminder-service";

const weekdayHabit = makeHabit({
	id: 3,
	name: "Meditate",
	frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
});
const dailyHabit = makeHabit({ id: 4, frequency: { type: "daily" } });

function reminder(overrides: Partial<Reminder> = {}): Reminder {
	return {
		id: 1,
		habitId: 3,
		hour: 7,
		minute: 20,
		weekdays: [1, 2, 3, 4, 5],
		enabled: true,
		...overrides,
	};
}

describe("reminder-service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetHabitReminders.mockResolvedValue([]);
	});

	describe("unscheduledReminderDays", () => {
		it("flags the reminder's days the habit can never be due on", () => {
			expect(
				unscheduledReminderDays(
					weekdayHabit,
					reminder({ weekdays: [5, 6, 7] }),
				),
			).toEqual([6, 7]);
		});

		it("flags nothing for a daily or X-per-week habit", () => {
			expect(
				unscheduledReminderDays(dailyHabit, reminder({ weekdays: [6, 7] })),
			).toEqual([]);
			expect(
				unscheduledReminderDays(
					makeHabit({ frequency: { type: "per-week", timesPerWeek: 3 } }),
					reminder({ weekdays: [6, 7] }),
				),
			).toEqual([]);
		});
	});

	describe("syncHabitReminders", () => {
		it("cancels everything the habit owns, then schedules only enabled reminders on schedulable days", async () => {
			mockGetHabitReminders.mockResolvedValue([
				reminder({ id: 1, weekdays: [1, 2, 3, 4, 5] }),
				reminder({
					id: 2,
					hour: 13,
					minute: 0,
					weekdays: [1, 3],
					enabled: false,
				}),
				reminder({ id: 3, hour: 21, minute: 0, weekdays: [5, 6, 7] }),
				reminder({ id: 4, hour: 22, minute: 0, weekdays: [6, 7] }),
			]);

			await syncHabitReminders(weekdayHabit);

			expect(mockCancel).toHaveBeenCalledWith("habit-3-");
			// Off (#2) and all-unscheduled (#4) reminders schedule nothing;
			// #3 keeps only Friday — Sat/Sun would fire for nothing.
			expect(mockSchedule.mock.calls.map(([n]) => [n.id, n.weekdays])).toEqual([
				["habit-3-reminder-1", [1, 2, 3, 4, 5]],
				["habit-3-reminder-3", [5]],
			]);
			expect(mockSchedule.mock.calls[0][0]).toEqual(
				expect.objectContaining({ title: "Meditate", hour: 7, minute: 20 }),
			);
		});

		it("cancels before it schedules, so a stale notification can't survive", async () => {
			mockGetHabitReminders.mockResolvedValue([reminder()]);
			await syncHabitReminders(weekdayHabit);
			expect(mockCancel.mock.invocationCallOrder[0]).toBeLessThan(
				mockSchedule.mock.invocationCallOrder[0],
			);
		});
	});

	it("habitNotificationPrefix keeps habit 1 from matching habit 12", () => {
		expect("habit-12-reminder-1".startsWith(habitNotificationPrefix(1))).toBe(
			false,
		);
	});

	describe("addReminder", () => {
		it("creates a reminder pre-set to the days the habit can fall on, then syncs", async () => {
			mockCreateReminder.mockResolvedValue(reminder());

			await addReminder(weekdayHabit);

			expect(mockCreateReminder).toHaveBeenCalledWith({
				habitId: 3,
				hour: 9,
				minute: 0,
				weekdays: [1, 2, 3, 4, 5],
				enabled: true,
			});
			expect(mockCancel).toHaveBeenCalledWith("habit-3-");
		});

		it("defaults to every day for a daily habit", async () => {
			mockCreateReminder.mockResolvedValue(reminder());
			await addReminder(dailyHabit);
			expect(mockCreateReminder.mock.calls[0][0].weekdays).toEqual([
				1, 2, 3, 4, 5, 6, 7,
			]);
		});

		it("is blocked at 4 with an explanation, writing nothing", async () => {
			mockGetHabitReminders.mockResolvedValue([
				reminder({ id: 1 }),
				reminder({ id: 2 }),
				reminder({ id: 3 }),
				reminder({ id: 4 }),
			]);

			await expect(addReminder(weekdayHabit)).rejects.toBeInstanceOf(
				ReminderCapError,
			);
			await expect(addReminder(weekdayHabit)).rejects.toThrow(
				"remove one to add another",
			);
			expect(mockCreateReminder).not.toHaveBeenCalled();
		});
	});

	it("editReminder writes the patch, then re-syncs", async () => {
		mockUpdateReminder.mockResolvedValue(reminder({ enabled: false }));
		await editReminder(weekdayHabit, 1, { enabled: false });
		expect(mockUpdateReminder).toHaveBeenCalledWith(1, { enabled: false });
		expect(mockCancel).toHaveBeenCalledWith("habit-3-");
	});

	it("removeReminder deletes, then re-syncs", async () => {
		await removeReminder(weekdayHabit, 2);
		expect(mockDeleteReminder).toHaveBeenCalledWith(2);
		expect(mockCancel).toHaveBeenCalledWith("habit-3-");
	});

	it("updateHabitAndSyncReminders re-syncs against the habit's new schedule", async () => {
		const nowDaily = { ...weekdayHabit, frequency: { type: "daily" as const } };
		mockUpdateHabit.mockResolvedValue(nowDaily);
		mockGetHabitReminders.mockResolvedValue([reminder({ weekdays: [6, 7] })]);

		const saved = await updateHabitAndSyncReminders(3, {
			...weekdayHabit,
			categoryId: weekdayHabit.category.id,
			frequency: { type: "daily" },
		});

		expect(saved).toBe(nowDaily);
		// Sat/Sun were pointless on Mon–Fri; on daily they're real.
		expect(mockSchedule.mock.calls[0][0].weekdays).toEqual([6, 7]);
	});

	describe("setEveningReview", () => {
		it("turning on saves the flag and schedules one daily 21:30 notification", async () => {
			await setEveningReview(true);
			expect(mockSetSetting).toHaveBeenCalledWith(
				"habits.eveningReview",
				"true",
			);
			expect(mockSchedule).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "evening-review",
					hour: 21,
					minute: 30,
					weekdays: [1, 2, 3, 4, 5, 6, 7],
				}),
			);
		});

		it("turning off saves the flag and cancels it", async () => {
			await setEveningReview(false);
			expect(mockSetSetting).toHaveBeenCalledWith(
				"habits.eveningReview",
				"false",
			);
			expect(mockCancel).toHaveBeenCalledWith("evening-review:");
			expect(mockSchedule).not.toHaveBeenCalled();
		});
	});
});
