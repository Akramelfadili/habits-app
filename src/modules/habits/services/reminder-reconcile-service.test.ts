import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { fakeNotifications as fake } from "../test-support/fake-expo-notifications";
import { makeHabit } from "../test-support/habit-builder";
import type { Habit, Reminder } from "../types";

jest.mock(
	"expo-notifications",
	() =>
		require("../test-support/fake-expo-notifications").fakeNotifications.module,
);

let mockEveningSetting: string | null = null;
let mockEveningTime: string | null = null;
let mockHideNames: string | null = null;
let mockTitlesApplied: string | null = null;
jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	getSetting: async (key: string) => {
		if (key === "habits.eveningReviewTime") return mockEveningTime;
		if (key === "habits.hideHabitNames") return mockHideNames;
		if (key === "habits.reminderTitlesHidden") return mockTitlesApplied;
		return mockEveningSetting;
	},
	setSetting: async (key: string, value: string) => {
		if (key === "habits.reminderTitlesHidden") mockTitlesApplied = value;
	},
}));

let mockHabits: Habit[] = [];
let mockReminders: Reminder[] = [];
let mockRemindersThrowFor: number | null = null;
jest.mock("../repositories/habit-repository", () => ({
	getAllHabits: async () => mockHabits,
	updateHabit: jest.fn(),
}));
jest.mock("../repositories/reminder-repository", () => ({
	getHabitReminders: async (habitId: number) => {
		if (habitId === mockRemindersThrowFor) throw new Error("db");
		return mockReminders.filter((reminder) => reminder.habitId === habitId);
	},
	createReminder: jest.fn(),
	updateReminder: jest.fn(),
	deleteReminder: jest.fn(),
}));

import { reconcileScheduledReminders } from "./reminder-reconcile-service";
import { syncHabitReminders } from "./reminder-service";

const daily = makeHabit({
	id: 3,
	name: "Meditate",
	frequency: { type: "daily" },
});

function reminder(overrides: Partial<Reminder> = {}): Reminder {
	return {
		id: 1,
		habitId: 3,
		hour: 7,
		minute: 20,
		weekdays: [1, 2, 3, 4, 5, 6, 7],
		enabled: true,
		...overrides,
	};
}

const keys = () =>
	[...fake.scheduled.keys()]
		.map((id) => id.split(":").slice(0, 3).join(":"))
		.sort();

beforeEach(() => {
	fake.reset();
	clearLog();
	mockEveningSetting = null;
	mockEveningTime = null;
	mockHideNames = null;
	mockTitlesApplied = "true";
	mockHabits = [daily];
	mockReminders = [];
	mockRemindersThrowFor = null;
});

describe("reconcileScheduledReminders", () => {
	it.each(["denied", "undetermined"] as const)(
		"does nothing at all, and never asks for permission, when notifications are %s",
		async (permission) => {
			fake.setPermission(permission);
			mockReminders = [reminder()];
			mockEveningSetting = "true";

			await reconcileScheduledReminders();

			expect(fake.scheduleCalls).toBe(0);
			expect(fake.cancelCalls).toBe(0);
			expect(fake.permissionRequests).toEqual([]);
		},
	);

	it("leaves a schedule that already matches the database untouched", async () => {
		mockReminders = [reminder()];
		await syncHabitReminders(daily);
		fake.events.length = 0;
		const before = [...fake.scheduled.keys()];

		await reconcileScheduledReminders();

		expect(fake.events).toEqual([]);
		expect([...fake.scheduled.keys()]).toEqual(before);
	});

	it("schedules an enabled reminder the OS is missing", async () => {
		mockReminders = [reminder()];

		await reconcileScheduledReminders();

		expect(keys()).toEqual(["habit-3-reminder-1:daily:0720"]);
	});

	it("fixes a reminder whose time was edited while the OS still holds the old one", async () => {
		mockReminders = [reminder()];
		await syncHabitReminders(daily);
		mockReminders = [reminder({ hour: 8, minute: 5 })];

		await reconcileScheduledReminders();

		expect(keys()).toEqual(["habit-3-reminder-1:daily:0805"]);
	});

	it("collapses duplicates left behind by a failed cancel into one set", async () => {
		mockReminders = [reminder()];
		await syncHabitReminders(daily);
		const stale = "habit-3-reminder-1:daily:0720:old";
		fake.scheduled.set(stale, { identifier: stale, hour: 7, minute: 20 });

		await reconcileScheduledReminders();

		expect(fake.scheduled.size).toBe(1);
		expect(fake.scheduled.has(stale)).toBe(false);
	});

	it("replaces notifications in an older identifier format", async () => {
		mockReminders = [reminder()];
		fake.scheduled.set("habit-3-reminder-1:daily", {
			identifier: "habit-3-reminder-1:daily",
			hour: 7,
			minute: 20,
		});

		await reconcileScheduledReminders();

		expect(keys()).toEqual(["habit-3-reminder-1:daily:0720"]);
		expect(fake.scheduled.has("habit-3-reminder-1:daily")).toBe(false);
	});

	it("cancels what an archived habit left behind and schedules nothing for it", async () => {
		mockHabits = [{ ...daily, archivedAt: new Date() }];
		mockReminders = [reminder()];
		fake.scheduled.set("habit-3-reminder-1:daily:0720:x", {
			identifier: "habit-3-reminder-1:daily:0720:x",
			hour: 7,
			minute: 20,
		});

		await reconcileScheduledReminders();

		expect(fake.scheduled.size).toBe(0);
		expect(fake.scheduleCalls).toBe(0);
	});

	it("cancels the notifications of a habit that no longer exists", async () => {
		mockHabits = [];
		fake.scheduled.set("habit-9-reminder-4:daily:0900:x", {
			identifier: "habit-9-reminder-4:daily:0900:x",
			hour: 9,
			minute: 0,
		});

		await reconcileScheduledReminders();

		expect(fake.scheduled.size).toBe(0);
	});

	it("with every reminder off it can only cancel — it schedules nothing", async () => {
		mockReminders = [reminder({ enabled: false })];
		fake.scheduled.set("habit-3-reminder-1:daily:0720:x", {
			identifier: "habit-3-reminder-1:daily:0720:x",
			hour: 7,
			minute: 20,
		});

		await reconcileScheduledReminders();

		expect(fake.scheduleCalls).toBe(0);
		expect(fake.scheduled.size).toBe(0);
	});

	it("never touches identifiers that aren't the app's", async () => {
		mockHabits = [];
		fake.scheduled.set("someone-elses-notification", {
			identifier: "someone-elses-notification",
			hour: 1,
			minute: 1,
		});

		await reconcileScheduledReminders();

		expect(fake.scheduled.has("someone-elses-notification")).toBe(true);
	});

	describe("Evening review", () => {
		it("on but missing: schedules it on the days with open habits", async () => {
			mockHabits = [makeHabit({ id: 1, frequency: { type: "daily" } })];
			mockEveningSetting = "true";
			await reconcileScheduledReminders();
			expect(keys()).toEqual(["evening-review:daily:2130"]);
		});

		it("on, but no active habit is ever due: nothing is scheduled", async () => {
			mockHabits = [];
			mockEveningSetting = "true";
			await reconcileScheduledReminders();
			expect(keys()).toEqual([]);
		});

		it("on but aimed at the wrong days: replaced by the right ones", async () => {
			mockHabits = [
				makeHabit({ id: 1, frequency: { type: "weekdays", days: [2] } }),
			];
			mockEveningSetting = "true";
			fake.scheduled.set("evening-review:daily:2130:x", {
				identifier: "evening-review:daily:2130:x",
				hour: 21,
				minute: 30,
			} as never);
			await reconcileScheduledReminders();
			expect(keys()).toEqual(["evening-review:day-2:2130"]);
		});

		it("on at a chosen time: scheduled there, and a review left at the old time is moved", async () => {
			mockHabits = [makeHabit({ id: 1, frequency: { type: "daily" } })];
			mockEveningSetting = "true";
			mockEveningTime = "20:15";
			fake.scheduled.set("evening-review:daily:2130:x", {
				identifier: "evening-review:daily:2130:x",
				hour: 21,
				minute: 30,
			} as never);
			await reconcileScheduledReminders();
			expect(keys()).toEqual(["evening-review:daily:2015"]);
		});

		it("on and present: untouched", async () => {
			mockHabits = [makeHabit({ id: 1, frequency: { type: "daily" } })];
			mockEveningSetting = "true";
			await reconcileScheduledReminders();
			fake.events.length = 0;
			await reconcileScheduledReminders();
			expect(fake.events).toEqual([]);
		});

		it("off but still scheduled: cancelled, not rescheduled", async () => {
			mockHabits = [];
			mockEveningSetting = "false";
			fake.scheduled.set("evening-review:daily:2130:x", {
				identifier: "evening-review:daily:2130:x",
				hour: 21,
				minute: 30,
			});
			await reconcileScheduledReminders();
			expect(fake.scheduled.size).toBe(0);
			expect(fake.scheduleCalls).toBe(0);
		});

		it("never set at all: schedules nothing", async () => {
			mockHabits = [];
			mockEveningSetting = null;
			await reconcileScheduledReminders();
			expect(fake.scheduleCalls).toBe(0);
		});
	});

	describe("failures never stop the launch", () => {
		it("one habit failing does not stop the others, and nothing throws", async () => {
			const other = makeHabit({ id: 4, frequency: { type: "daily" } });
			mockHabits = [daily, other];
			mockReminders = [reminder(), reminder({ id: 2, habitId: 4 })];
			mockRemindersThrowFor = 3;

			await expect(reconcileScheduledReminders()).resolves.toBeUndefined();

			expect(keys()).toEqual(["habit-4-reminder-2:daily:0720"]);
			expect(getLogEntries().some((e) => e.level === "error")).toBe(true);
		});

		it("a scheduling failure is logged and the launch continues", async () => {
			mockReminders = [reminder()];
			fake.failScheduleOn.add(1);

			await expect(reconcileScheduledReminders()).resolves.toBeUndefined();

			expect(getLogEntries().some((e) => e.level === "error")).toBe(true);
		});
	});

	it("warns when close to the OS's pending-notification limit", async () => {
		mockHabits = [];
		for (let i = 0; i < 57; i++) {
			const id = `someone-elses-${i}`;
			fake.scheduled.set(id, { identifier: id, hour: 1, minute: 1 });
		}

		await reconcileScheduledReminders();

		expect(
			getLogEntries().find((entry) => entry.level === "warn")?.fields,
		).toEqual({ pending: 57 });
	});

	it("logs counts only — no habit names", async () => {
		mockReminders = [reminder()];
		await reconcileScheduledReminders();
		expect(JSON.stringify(getLogEntries())).not.toContain("Meditate");
	});
	describe("titles after Hide habit names", () => {
		const titles = () => [...fake.scheduled.values()].map((s) => s.title);

		it("on the first launch with the setting, rebuilds reminders scheduled under the habit's name", async () => {
			mockReminders = [reminder()];
			mockHideNames = "false";
			await syncHabitReminders(daily);
			expect(titles()).toEqual(["Meditate"]);
			mockHideNames = null;
			mockTitlesApplied = null;

			await reconcileScheduledReminders();

			expect(titles()).toEqual(["Habit reminder"]);
			expect(keys()).toEqual(["habit-3-reminder-1:daily:0720"]);
			expect(mockTitlesApplied).toBe("true");
		});

		it("does it once: the next launch leaves a matching schedule alone", async () => {
			mockReminders = [reminder()];
			mockTitlesApplied = null;
			await reconcileScheduledReminders();
			fake.events.length = 0;

			await reconcileScheduledReminders();

			expect(fake.events).toEqual([]);
		});

		it("rebuilds with the habit's name when the setting is off but the OS still holds hidden titles", async () => {
			mockReminders = [reminder()];
			await syncHabitReminders(daily);
			mockHideNames = "false";

			await reconcileScheduledReminders();

			expect(titles()).toEqual(["Meditate"]);
			expect(mockTitlesApplied).toBe("false");
		});

		it("keeps the marker stale when a habit could not be rebuilt, so the next launch retries", async () => {
			mockReminders = [reminder()];
			mockTitlesApplied = null;
			mockRemindersThrowFor = 3;

			await reconcileScheduledReminders();

			expect(mockTitlesApplied).toBeNull();
		});
	});
});
