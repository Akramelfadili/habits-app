import { fakeNotifications as fake } from "../test-support/fake-expo-notifications";
import { makeHabit } from "../test-support/habit-builder";
import type { Habit, Reminder } from "../types";

// The real reminder service and notifications adapter on an in-memory expo-notifications.
jest.mock(
	"expo-notifications",
	() =>
		require("../test-support/fake-expo-notifications").fakeNotifications.module,
);
jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	setSetting: jest.fn(),
}));

let mockHabit: Habit;
jest.mock("../repositories/habit-repository", () => ({
	getHabit: async () => mockHabit,
	updateHabit: jest.fn(),
	setHabitArchived: async (_id: number, at: Date | null) => {
		mockHabit = { ...mockHabit, archivedAt: at };
		return mockHabit;
	},
	setHabitRestored: async () => {
		mockHabit = { ...mockHabit, archivedAt: null };
		return mockHabit;
	},
	deleteHabitAndHistory: jest.fn(),
}));

const reminders: Reminder[] = [
	{
		id: 1,
		habitId: 3,
		hour: 7,
		minute: 0,
		weekdays: [1, 2, 3, 4, 5],
		enabled: true,
	},
	{ id: 2, habitId: 3, hour: 18, minute: 30, weekdays: [4], enabled: true },
];
jest.mock("../repositories/reminder-repository", () => ({
	getHabitReminders: async () => reminders,
	createReminder: jest.fn(),
	updateReminder: jest.fn(),
	deleteReminder: jest.fn(),
	restoreReminder: jest.fn(),
}));

import {
	archiveHabit,
	restoreHabit,
	undoRestoreHabit,
} from "./habit-lifecycle-service";
import { syncHabitReminders } from "./reminder-service";

const FIVE_WEEKDAYS_PLUS_THURSDAY = 6;

beforeEach(() => {
	fake.reset();
	mockHabit = makeHabit({
		id: 3,
		frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
	});
});

describe("archive and restore never stack scheduled notifications (HAB-43)", () => {
	it("archiving cancels every one the habit owns", async () => {
		await syncHabitReminders(mockHabit);
		expect(fake.scheduled.size).toBe(FIVE_WEEKDAYS_PLUS_THURSDAY);
		await archiveHabit(3);
		expect(fake.scheduled.size).toBe(0);
	});

	it("restoring schedules exactly one set, however many times it round-trips", async () => {
		await syncHabitReminders(mockHabit);
		for (let round = 0; round < 3; round++) {
			await archiveHabit(3);
			expect(fake.scheduled.size).toBe(0);
			await restoreHabit(3);
			expect(fake.scheduled.size).toBe(FIVE_WEEKDAYS_PLUS_THURSDAY);
		}
	});

	it("restoring twice in a row (a double tap) still leaves one set", async () => {
		await archiveHabit(3);
		await restoreHabit(3);
		await restoreHabit(3);
		expect(fake.scheduled.size).toBe(FIVE_WEEKDAYS_PLUS_THURSDAY);
		const ids = [...fake.scheduled.keys()].map((id) =>
			id.split(":").slice(0, 3).join(":"),
		);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("undoing a restore silences them again, and a later restore brings back one set", async () => {
		await archiveHabit(3);
		const before = { archivedAt: mockHabit.archivedAt, pauses: [] };
		await restoreHabit(3);
		await undoRestoreHabit(3, before);
		expect(fake.scheduled.size).toBe(0);
		await restoreHabit(3);
		expect(fake.scheduled.size).toBe(FIVE_WEEKDAYS_PLUS_THURSDAY);
	});
});
