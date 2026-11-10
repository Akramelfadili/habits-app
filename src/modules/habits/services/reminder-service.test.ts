import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { fakeNotifications as fake } from "../test-support/fake-expo-notifications";
import {
	daily,
	makeHabit,
	perWeek,
	weekdays,
} from "../test-support/habit-builder";
import type { Reminder } from "../types";

jest.mock(
	"expo-notifications",
	() =>
		require("../test-support/fake-expo-notifications").fakeNotifications.module,
);

const mockSetSetting = jest.fn();
const mockGetSetting = jest.fn();
jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	setSetting: (...args: unknown[]) => mockSetSetting(...args),
	getSetting: (...args: unknown[]) => mockGetSetting(...args),
}));

const mockUpdateHabit = jest.fn();
const mockGetHabit = jest.fn();
const mockGetAllHabits = jest.fn();
jest.mock("../repositories/habit-repository", () => ({
	updateHabit: (...args: unknown[]) => mockUpdateHabit(...args),
	getHabit: (...args: unknown[]) => mockGetHabit(...args),
	getAllHabits: (...args: unknown[]) => mockGetAllHabits(...args),
}));

const mockGetHabitReminders = jest.fn();
const mockCreateReminder = jest.fn();
const mockUpdateReminder = jest.fn();
const mockDeleteReminder = jest.fn();
const mockRestoreReminderRow = jest.fn();
jest.mock("../repositories/reminder-repository", () => ({
	restoreReminder: (...args: unknown[]) => mockRestoreReminderRow(...args),
	getHabitReminders: (...args: unknown[]) => mockGetHabitReminders(...args),
	createReminder: (...args: unknown[]) => mockCreateReminder(...args),
	updateReminder: (...args: unknown[]) => mockUpdateReminder(...args),
	deleteReminder: (...args: unknown[]) => mockDeleteReminder(...args),
}));

import {
	addReminder,
	cancelHabitNotifications,
	editReminder,
	getHideHabitNames,
	habitNotificationPrefix,
	ReminderCapError,
	refreshEveningReview,
	removeReminder,
	restoreReminder,
	setEveningReview,
	setEveningReviewTime,
	setHideHabitNames,
	syncHabitReminders,
	unscheduledReminderDays,
	updateHabitAndSyncReminders,
} from "./reminder-service";

const weekdayHabit = makeHabit({
	id: 3,
	name: "Meditate",
	frequency: weekdays(1, 2, 3, 4, 5),
});
const dailyHabit = makeHabit({ id: 4, frequency: daily() });

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

const scheduledKeys = () =>
	[...fake.scheduled.keys()]
		.map((id) => id.split(":").slice(0, 3).join(":"))
		.sort();
const generationsOf = () =>
	new Set([...fake.scheduled.keys()].map((id) => id.split(":")[3]));

describe("reminder-service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		fake.reset();
		clearLog();
		mockGetHabitReminders.mockResolvedValue([]);
		mockGetSetting.mockResolvedValue("false");
		mockGetAllHabits.mockResolvedValue([dailyHabit]);
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
					makeHabit({ frequency: perWeek(3) }),
					reminder({ weekdays: [1, 6] }),
				),
			).toEqual([]);
		});
	});

	describe("syncHabitReminders", () => {
		it("schedules only enabled reminders on schedulable days", async () => {
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

			expect(scheduledKeys()).toEqual([
				"habit-3-reminder-1:day-1:0720",
				"habit-3-reminder-1:day-2:0720",
				"habit-3-reminder-1:day-3:0720",
				"habit-3-reminder-1:day-4:0720",
				"habit-3-reminder-1:day-5:0720",
				"habit-3-reminder-3:day-5:2100",
			]);
		});

		it("an archived habit schedules nothing and its old notifications go, so editing its reminders can't make it fire", async () => {
			mockGetHabitReminders.mockResolvedValue([reminder()]);
			await syncHabitReminders(weekdayHabit);
			expect(fake.scheduled.size).toBe(5);

			await syncHabitReminders({ ...weekdayHabit, archivedAt: new Date() });

			expect(fake.scheduled.size).toBe(0);
		});

		it("replaces the old set with the new one — the old generation is gone, the new one live", async () => {
			mockGetHabitReminders.mockResolvedValue([reminder()]);
			await syncHabitReminders(weekdayHabit);
			const before = generationsOf();

			mockGetHabitReminders.mockResolvedValue([
				reminder({ hour: 8, minute: 5 }),
			]);
			await syncHabitReminders(weekdayHabit);

			expect(scheduledKeys()).toEqual(
				[1, 2, 3, 4, 5].map((day) => `habit-3-reminder-1:day-${day}:0805`),
			);
			const after = generationsOf();
			expect(after.size).toBe(1);
			expect([...after][0]).not.toBe([...before][0]);
		});

		it("schedules the new set BEFORE cancelling the old, and cancels only the old identifiers", async () => {
			mockGetHabitReminders.mockResolvedValue([reminder()]);
			await syncHabitReminders(weekdayHabit);
			const oldIdentifiers = new Set(fake.scheduled.keys());
			fake.events.length = 0;

			mockGetHabitReminders.mockResolvedValue([
				reminder({ hour: 8, minute: 5 }),
			]);
			await syncHabitReminders(weekdayHabit);

			const kinds = fake.events.map((event) => event.split(":")[0]);
			expect(kinds.indexOf("cancel")).toBeGreaterThan(
				kinds.lastIndexOf("schedule"),
			);
			const cancelled = new Set(
				fake.events
					.filter((event) => event.startsWith("cancel:"))
					.map((event) => event.slice("cancel:".length)),
			);
			expect(cancelled).toEqual(oldIdentifiers);
			for (const id of fake.scheduled.keys())
				expect(cancelled.has(id)).toBe(false);
			expect(fake.scheduled.size).toBe(5);
		});

		it("a scheduling failure part-way cancels the new ones created so far and leaves the old set intact", async () => {
			mockGetHabitReminders.mockResolvedValue([reminder()]);
			await syncHabitReminders(weekdayHabit);
			const oldIdentifiers = [...fake.scheduled.keys()].sort();
			fake.failScheduleOn.add(fake.scheduleCalls + 3);
			mockGetHabitReminders.mockResolvedValue([
				reminder({ hour: 8, minute: 5 }),
			]);

			await expect(syncHabitReminders(weekdayHabit)).rejects.toThrow(
				"schedule failed",
			);

			expect([...fake.scheduled.keys()].sort()).toEqual(oldIdentifiers);
		});

		it("a failed cancel of the old set is logged, not thrown; the new set is live", async () => {
			mockGetHabitReminders.mockResolvedValue([reminder()]);
			await syncHabitReminders(weekdayHabit);
			fake.failCancelOn.add(fake.cancelCalls + 1);
			mockGetHabitReminders.mockResolvedValue([
				reminder({ hour: 8, minute: 5 }),
			]);

			await expect(syncHabitReminders(weekdayHabit)).resolves.toBeUndefined();

			expect(
				getLogEntries().some(
					(entry) =>
						entry.level === "warn" && entry.event === "reminders.cancel_failed",
				),
			).toBe(true);
			expect(scheduledKeys()).toEqual(
				expect.arrayContaining(
					[1, 2, 3, 4, 5].map((day) => `habit-3-reminder-1:day-${day}:0805`),
				),
			);
		});

		it("logs counts, never names", async () => {
			mockGetHabitReminders.mockResolvedValue([reminder()]);
			await syncHabitReminders(weekdayHabit);
			const entry = getLogEntries().find((e) => e.event === "reminders.synced");
			expect(entry?.fields).toEqual({
				habitId: 3,
				scheduled: 5,
				cancelled: 0,
			});
			expect(JSON.stringify(getLogEntries())).not.toContain("Meditate");
		});
	});

	it("habitNotificationPrefix keeps habit 1 from matching habit 12", () => {
		expect("habit-12-reminder-1".startsWith(habitNotificationPrefix(1))).toBe(
			false,
		);
	});

	describe("cancelHabitNotifications", () => {
		it("cancels only that habit's notifications", async () => {
			mockGetHabitReminders.mockResolvedValue([reminder()]);
			await syncHabitReminders(weekdayHabit);
			fake.scheduled.set("habit-30-reminder-9:daily:0900:x", {
				identifier: "habit-30-reminder-9:daily:0900:x",
				hour: 9,
				minute: 0,
			});

			await cancelHabitNotifications(3);

			expect([...fake.scheduled.keys()]).toEqual([
				"habit-30-reminder-9:daily:0900:x",
			]);
		});

		it("a failing cancel is logged and does not throw — the archive/delete already happened", async () => {
			fake.scheduled.set("habit-3-reminder-1:daily:0900:x", {
				identifier: "habit-3-reminder-1:daily:0900:x",
				hour: 9,
				minute: 0,
			});
			fake.failCancelOn.add(1);

			await expect(cancelHabitNotifications(3)).resolves.toBeUndefined();

			expect(getLogEntries()[0]).toMatchObject({
				level: "error",
				fields: { habitId: 3 },
			});
		});
	});

	describe("addReminder", () => {
		it("creates a reminder pre-set to the days the habit can fall on, then syncs", async () => {
			mockCreateReminder.mockResolvedValue(reminder());
			mockGetHabitReminders.mockResolvedValue([reminder()]);

			await addReminder(weekdayHabit);

			expect(mockCreateReminder).toHaveBeenCalledWith({
				habitId: 3,
				hour: 9,
				minute: 0,
				weekdays: [1, 2, 3, 4, 5],
				enabled: true,
			});
			expect(fake.scheduled.size).toBe(5);
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

		it("the row is saved even if scheduling then fails: the add succeeds, the failure is logged", async () => {
			const created = reminder({ id: 9 });
			mockCreateReminder.mockResolvedValue(created);
			mockGetHabitReminders.mockResolvedValue([created]);
			fake.failScheduleOn.add(1);

			await expect(addReminder(weekdayHabit)).resolves.toBe(created);

			expect(
				getLogEntries().some(
					(e) =>
						e.level === "error" &&
						e.event === "reminders.saved_but_not_scheduled",
				),
			).toBe(true);
			expect(fake.scheduled.size).toBe(0);
		});
	});

	it("editReminder writes the patch, then re-syncs", async () => {
		mockUpdateReminder.mockResolvedValue(reminder({ enabled: false }));
		mockGetHabitReminders.mockResolvedValue([reminder({ enabled: false })]);
		await editReminder(weekdayHabit, 1, { enabled: false });
		expect(mockUpdateReminder).toHaveBeenCalledWith(1, { enabled: false });
		expect(fake.scheduled.size).toBe(0);
	});

	it("editReminder still succeeds when the re-sync fails (the row changed)", async () => {
		mockUpdateReminder.mockResolvedValue(reminder());
		mockGetHabitReminders.mockResolvedValue([reminder()]);
		fake.failScheduleOn.add(1);

		await expect(
			editReminder(weekdayHabit, 1, { hour: 8 }),
		).resolves.toBeDefined();
	});

	it("removeReminder deletes, then re-syncs", async () => {
		mockGetHabitReminders.mockResolvedValue([reminder({ id: 2 })]);
		await syncHabitReminders(weekdayHabit);
		expect(fake.scheduled.size).toBe(5);

		mockGetHabitReminders.mockResolvedValue([]);
		await removeReminder(weekdayHabit, 2);

		expect(mockDeleteReminder).toHaveBeenCalledWith(2);
		expect(fake.scheduled.size).toBe(0);
	});

	describe("addReminder with the sheet's time and days (R2)", () => {
		it("writes exactly the chosen time and days, then syncs", async () => {
			mockCreateReminder.mockResolvedValue(
				reminder({ hour: 18, minute: 30, weekdays: [4] }),
			);
			mockGetHabitReminders.mockResolvedValue([
				reminder({ hour: 18, minute: 30, weekdays: [4] }),
			]);
			await addReminder(weekdayHabit, {
				hour: 18,
				minute: 30,
				weekdays: [4],
			});
			expect(mockCreateReminder).toHaveBeenCalledWith({
				habitId: 3,
				hour: 18,
				minute: 30,
				weekdays: [4],
				enabled: true,
			});
			expect(scheduledKeys()).toEqual(["habit-3-reminder-1:day-4:1830"]);
		});
	});

	describe("restoreReminder (the Undo for Remove)", () => {
		let rows: Reminder[];
		beforeEach(() => {
			rows = [];
			mockGetHabit.mockResolvedValue(weekdayHabit);
			mockGetHabitReminders.mockImplementation(async () => [...rows]);
			mockDeleteReminder.mockImplementation(async (id: number) => {
				rows = rows.filter((row) => row.id !== id);
			});
			mockRestoreReminderRow.mockImplementation(async (row: Reminder) => {
				rows = [...rows, row];
				return row;
			});
		});

		it("puts back the same id, time and days, with exactly one notification per day — not two", async () => {
			const wednesday = reminder({ id: 7, hour: 18, minute: 5, weekdays: [3] });
			rows = [wednesday];
			await syncHabitReminders(weekdayHabit);
			expect(fake.scheduled.size).toBe(1);

			await removeReminder(weekdayHabit, 7);
			expect(rows).toEqual([]);
			expect(fake.scheduled.size).toBe(0);

			const restored = await restoreReminder(wednesday);

			expect(restored).toEqual(wednesday);
			expect(rows).toEqual([wednesday]);
			expect(mockRestoreReminderRow).toHaveBeenCalledWith(wednesday);
			expect(fake.scheduled.size).toBe(1);
			expect(scheduledKeys()).toEqual(["habit-3-reminder-7:day-3:1805"]);
		});

		it("re-syncs through the normal path rather than scheduling by hand", async () => {
			const five = reminder({ id: 8 });
			rows = [five];
			await removeReminder(weekdayHabit, 8);
			await restoreReminder(five);
			expect(fake.scheduled.size).toBe(5);
			expect(generationsOf().size).toBe(1);
		});

		it("refuses when the habit is gone, and when the cap has been reached meanwhile", async () => {
			mockGetHabit.mockResolvedValue(undefined);
			await expect(restoreReminder(reminder({ id: 9 }))).rejects.toThrow();
			expect(mockRestoreReminderRow).not.toHaveBeenCalled();

			mockGetHabit.mockResolvedValue(weekdayHabit);
			rows = [1, 2, 3, 4].map((id) => reminder({ id }));
			await expect(restoreReminder(reminder({ id: 9 }))).rejects.toBeInstanceOf(
				ReminderCapError,
			);
			expect(mockRestoreReminderRow).not.toHaveBeenCalled();
		});

		it("schedules nothing for a habit archived since (the sync respects it)", async () => {
			mockGetHabit.mockResolvedValue({
				...weekdayHabit,
				archivedAt: new Date(2026, 8, 1),
			});
			await restoreReminder(reminder({ id: 10 }));
			expect(fake.scheduled.size).toBe(0);
		});
	});

	it("updateHabitAndSyncReminders re-syncs against the habit's new schedule", async () => {
		const nowDaily = { ...weekdayHabit, frequency: daily() };
		mockUpdateHabit.mockResolvedValue(nowDaily);
		mockGetHabitReminders.mockResolvedValue([reminder({ weekdays: [6, 7] })]);

		const saved = await updateHabitAndSyncReminders(3, {
			...weekdayHabit,
			categoryId: weekdayHabit.category.id,
			frequency: daily(),
		});

		expect(saved).toBe(nowDaily);
		expect(scheduledKeys()).toEqual([
			"habit-3-reminder-1:day-6:0720",
			"habit-3-reminder-1:day-7:0720",
		]);
	});

	describe("setEveningReview", () => {
		it("turning on schedules one daily 21:30 notification, then saves the flag", async () => {
			await setEveningReview(true);
			expect(mockSetSetting).toHaveBeenCalledWith(
				"habits.eveningReview",
				"true",
			);
			expect(scheduledKeys()).toEqual(["evening-review:daily:2130"]);
		});

		it("sends only on days some active habit can be due, never on a day nothing is due", async () => {
			mockGetAllHabits.mockResolvedValue([
				makeHabit({ id: 5, frequency: weekdays(2, 4) }),
				makeHabit({
					id: 6,
					frequency: daily(),
					archivedAt: new Date(2026, 8, 1),
				}),
			]);
			await setEveningReview(true);
			expect(scheduledKeys()).toEqual([
				"evening-review:day-2:2130",
				"evening-review:day-4:2130",
			]);
		});

		it("schedules nothing while no active habit exists, but still saves the flag", async () => {
			mockGetAllHabits.mockResolvedValue([]);
			await setEveningReview(true);
			expect(fake.scheduled.size).toBe(0);
			expect(mockSetSetting).toHaveBeenCalledWith(
				"habits.eveningReview",
				"true",
			);
		});

		it("turning on twice leaves one notification, not two", async () => {
			await setEveningReview(true);
			await setEveningReview(true);
			expect(fake.scheduled.size).toBe(1);
		});

		it("if storing the flag fails, what was just scheduled is cancelled and the error surfaces", async () => {
			mockSetSetting.mockRejectedValueOnce(new Error("db"));
			await expect(setEveningReview(true)).rejects.toThrow("db");
			expect(fake.scheduled.size).toBe(0);
		});

		it("if scheduling fails, the flag is never stored as on", async () => {
			fake.failScheduleOn.add(1);
			await expect(setEveningReview(true)).rejects.toThrow("schedule failed");
			expect(mockSetSetting).not.toHaveBeenCalled();
		});

		it("turning off saves the flag and cancels it", async () => {
			await setEveningReview(true);
			await setEveningReview(false);
			expect(mockSetSetting).toHaveBeenLastCalledWith(
				"habits.eveningReview",
				"false",
			);
			expect(fake.scheduled.size).toBe(0);
		});

		it("turning off with a failing cancel still succeeds (logged; the reconcile finishes it)", async () => {
			await setEveningReview(true);
			fake.failCancelOn.add(fake.cancelCalls + 1);
			await expect(setEveningReview(false)).resolves.toBeUndefined();
		});
	});

	describe("refreshEveningReview (a habit changed)", () => {
		it("does nothing while the review is off", async () => {
			await refreshEveningReview();
			expect(fake.scheduled.size).toBe(0);
		});

		it("re-aims the review at the days with open habits, replacing the old set", async () => {
			mockGetAllHabits.mockResolvedValue([dailyHabit]);
			await setEveningReview(true);
			expect(scheduledKeys()).toEqual(["evening-review:daily:2130"]);

			mockGetSetting.mockResolvedValue("true");
			mockGetAllHabits.mockResolvedValue([
				makeHabit({ id: 5, frequency: weekdays(6) }),
			]);
			await refreshEveningReview();
			expect(scheduledKeys()).toEqual(["evening-review:day-6:2130"]);
		});

		it("is what a habit save runs: archiving the last habit silences the review", async () => {
			await setEveningReview(true);
			mockGetSetting.mockResolvedValue("true");
			mockGetAllHabits.mockResolvedValue([
				{ ...dailyHabit, archivedAt: new Date() },
			]);
			await cancelHabitNotifications(4);
			expect(fake.scheduled.size).toBe(0);
		});
	});
	describe("setEveningReviewTime", () => {
		function settings(values: Record<string, string>) {
			mockGetSetting.mockImplementation(
				async (key: string) => values[key] ?? null,
			);
		}

		it("stores the time as HH:mm", async () => {
			settings({ "habits.eveningReview": "false" });
			await setEveningReviewTime({ hour: 7, minute: 5 });
			expect(mockSetSetting).toHaveBeenCalledWith(
				"habits.eveningReviewTime",
				"07:05",
			);
		});

		it("schedules nothing while the review is off", async () => {
			settings({ "habits.eveningReview": "false" });
			await setEveningReviewTime({ hour: 7, minute: 5 });
			expect(fake.scheduled.size).toBe(0);
		});

		it("moves a running review to the new time, keeping its days", async () => {
			mockGetAllHabits.mockResolvedValue([
				makeHabit({ id: 5, frequency: weekdays(2, 4) }),
			]);
			settings({ "habits.eveningReview": "true" });
			await refreshEveningReview();
			expect(scheduledKeys()).toEqual([
				"evening-review:day-2:2130",
				"evening-review:day-4:2130",
			]);

			settings({
				"habits.eveningReview": "true",
				"habits.eveningReviewTime": "20:00",
			});
			await setEveningReviewTime({ hour: 20, minute: 0 });
			expect(scheduledKeys()).toEqual([
				"evening-review:day-2:2000",
				"evening-review:day-4:2000",
			]);
		});

		it("a new habit's review keeps using the chosen time", async () => {
			settings({
				"habits.eveningReview": "true",
				"habits.eveningReviewTime": "06:15",
			});
			await refreshEveningReview();
			expect(scheduledKeys()).toEqual(["evening-review:daily:0615"]);
		});
	});
	describe("Hide habit names", () => {
		const store = (values: Record<string, string>) =>
			mockGetSetting.mockImplementation(
				async (key: string) => values[key] ?? null,
			);
		const titles = () => [...fake.scheduled.values()].map((s) => s.title);

		beforeEach(() => {
			mockGetHabitReminders.mockResolvedValue([reminder({ habitId: 3 })]);
			mockGetAllHabits.mockResolvedValue([weekdayHabit]);
		});

		it("is on when the setting was never stored", async () => {
			store({});
			expect(await getHideHabitNames()).toBe(true);
			await syncHabitReminders(weekdayHabit);
			expect(new Set(titles())).toEqual(new Set(["Habit reminder"]));
		});

		it("schedules with the generic title and the usual fixed body copy when on", async () => {
			store({ "habits.hideHabitNames": "true" });
			await syncHabitReminders(weekdayHabit);
			expect(titles()).not.toContain("Meditate");
			expect(titles()).toEqual(Array(titles().length).fill("Habit reminder"));
		});

		it("keeps today's behaviour, the habit name, when off", async () => {
			store({ "habits.hideHabitNames": "false" });
			expect(await getHideHabitNames()).toBe(false);
			await syncHabitReminders(weekdayHabit);
			expect(new Set(titles())).toEqual(new Set(["Meditate"]));
		});

		it("flipping it reschedules every reminder under the new title and records it", async () => {
			store({ "habits.hideHabitNames": "false" });
			await syncHabitReminders(weekdayHabit);
			expect(new Set(titles())).toEqual(new Set(["Meditate"]));
			const before = scheduledKeys();

			store({});
			await setHideHabitNames(true);

			expect(mockSetSetting).toHaveBeenCalledWith(
				"habits.hideHabitNames",
				"true",
			);
			expect(new Set(titles())).toEqual(new Set(["Habit reminder"]));
			expect(scheduledKeys()).toEqual(before);
			expect(mockSetSetting).toHaveBeenCalledWith(
				"habits.reminderTitlesHidden",
				"true",
			);
		});

		it("does not record the change as applied when a habit could not be rescheduled", async () => {
			store({});
			fake.failScheduleOn.add(1);
			await setHideHabitNames(false);
			expect(mockSetSetting).toHaveBeenCalledWith(
				"habits.hideHabitNames",
				"false",
			);
			expect(mockSetSetting).not.toHaveBeenCalledWith(
				"habits.reminderTitlesHidden",
				expect.anything(),
			);
		});
	});
});
