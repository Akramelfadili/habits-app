import { addDays, format, isSameDay } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { DayRange, Habit, Reminder } from "../types";

/**
 * Archive → restore → undo → restore against the real lifecycle and reminder
 * services, with only the edges faked: an in-memory habit row, one mockStored
 * reminder, and a scheduler that records every notification it holds — so a
 * restore that *appended* instead of rebuilding would show up as a duplicate.
 */

let mockStored: Habit;
let mockScheduled: string[] = [];
const mockScheduleCalls: Record<string, unknown>[] = [];

jest.mock("@/lib/notifications/notifications", () => ({
	cancelRemindersWithPrefix: async (prefix: string) => {
		mockScheduled = mockScheduled.filter((id) => !id.startsWith(prefix));
	},
	scheduleReminder: async (args: { id: string }) => {
		mockScheduled.push(args.id);
		mockScheduleCalls.push(args);
	},
}));

jest.mock("../repositories/habit-repository", () => ({
	getHabit: async () => mockStored,
	setHabitArchived: async (
		_id: number,
		archivedAt: Date,
		pauses?: DayRange[],
	) => {
		mockStored = {
			...mockStored,
			archivedAt,
			pauses: pauses ?? mockStored.pauses,
		};
		return mockStored;
	},
	setHabitRestored: async (_id: number, pauses: DayRange[]) => {
		mockStored = { ...mockStored, archivedAt: null, pauses };
		return mockStored;
	},
	updateHabit: jest.fn(),
	deleteHabitAndHistory: jest.fn(),
}));

const reminder: Reminder = {
	id: 1,
	habitId: 3,
	hour: 7,
	minute: 0,
	weekdays: [1, 2, 3, 4, 5, 6, 7],
	enabled: true,
};
jest.mock("../repositories/reminder-repository", () => ({
	getHabitReminders: async () => [reminder],
	createReminder: jest.fn(),
	updateReminder: jest.fn(),
	deleteReminder: jest.fn(),
}));
jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	setSetting: jest.fn(),
}));
jest.mock("../repositories/frozen-day-repository", () => ({}));

import { buildHeatmapWeeks, currentStreakAsOf } from "./habit-history";
import {
	archiveHabit,
	restoreHabit,
	undoRestoreHabit,
} from "./habit-lifecycle-service";

const DAY_ONE = new Date(2026, 8, 1, 9);

function setNow(date: Date) {
	jest.setSystemTime(date);
}

beforeEach(() => {
	jest.useFakeTimers();
	setNow(DAY_ONE);
	mockScheduled = [];
	mockScheduleCalls.length = 0;
	mockStored = makeHabit({
		id: 3,
		frequency: { type: "daily" },
		createdAt: new Date(2026, 7, 1),
	});
});

afterEach(() => {
	jest.useRealTimers();
});

describe("archive → restore → undo → restore", () => {
	it("never leaves more than one notification per reminder, and none while archived", async () => {
		await archiveHabit(3);
		expect(mockScheduled).toEqual([]);

		setNow(addDays(DAY_ONE, 8));
		await restoreHabit(3);
		expect(mockScheduled).toEqual(["habit-3-reminder-1"]);

		const afterRestore = { ...mockStored };
		await undoRestoreHabit(3, {
			archivedAt: DAY_ONE,
			pauses: [],
		});
		expect(mockScheduled).toEqual([]);
		expect(afterRestore.archivedAt).toBeNull();

		await restoreHabit(3);
		expect(mockScheduled).toEqual(["habit-3-reminder-1"]);
	});

	it("resumes reminders as the stored recurring schedule — nothing fires immediately", async () => {
		await archiveHabit(3);
		setNow(addDays(DAY_ONE, 3));
		await restoreHabit(3);

		expect(mockScheduleCalls).toHaveLength(1);
		expect(mockScheduleCalls[0]).toMatchObject({
			hour: 7,
			minute: 0,
			weekdays: [1, 2, 3, 4, 5, 6, 7],
		});
		// A recurring weekday trigger only — no one-off "now" notification.
		expect(mockScheduleCalls[0]).not.toHaveProperty("seconds");
		expect(mockScheduleCalls[0]).not.toHaveProperty("immediate");
	});

	it("undo puts back the same archive date and pauses, so the banner, heatmap and Reminders row return as they were", async () => {
		await archiveHabit(3);
		const archived = { ...mockStored };
		const archiveDate = archived.archivedAt as Date;

		setNow(addDays(DAY_ONE, 8));
		await restoreHabit(3);
		expect(mockStored.pauses).toEqual([
			{ from: "2026-09-01", to: "2026-09-08" },
		]);

		await undoRestoreHabit(3, {
			archivedAt: archived.archivedAt,
			pauses: archived.pauses,
		});

		expect(mockStored.archivedAt).toEqual(archiveDate);
		expect(mockStored.pauses).toEqual(archived.pauses);
		// Same status on every heatmap day as before the restore.
		const today = addDays(DAY_ONE, 8);
		const before = buildHeatmapWeeks({
			habit: archived,
			entries: [],
			frozenDates: new Set(),
			today,
		});
		const after = buildHeatmapWeeks({
			habit: mockStored,
			entries: [],
			frozenDates: new Set(),
			today,
		});
		expect(after).toEqual(before);
		expect(mockScheduled).toEqual([]);
	});

	it("survives several archive/restore rounds: pauses accumulate, one notification, streak starts fresh each time", async () => {
		const rounds = [
			[1, 4],
			[10, 12],
			[20, 21],
		];
		for (const [archiveOn, restoreOn] of rounds) {
			setNow(addDays(DAY_ONE, archiveOn - 1));
			await archiveHabit(3);
			expect(mockScheduled).toEqual([]);
			setNow(addDays(DAY_ONE, restoreOn - 1));
			await restoreHabit(3);
			expect(mockScheduled).toEqual(["habit-3-reminder-1"]);
		}

		expect(mockStored.pauses).toEqual([
			{ from: "2026-09-01", to: "2026-09-03" },
			{ from: "2026-09-10", to: "2026-09-11" },
			{ from: "2026-09-20", to: "2026-09-20" },
		]);

		// Restored on 21 Sep, nothing logged since: streak is 0; one log makes it 1.
		const today = addDays(DAY_ONE, 20);
		const history = {
			habit: mockStored,
			frozenDates: new Set<string>(),
			today,
		};
		const entry = (date: Date) => ({
			id: 1,
			habitId: 3,
			date: format(date, "yyyy-MM-dd"),
			createdAt: date,
		});
		const loggedBefore = [
			entry(addDays(DAY_ONE, 17)),
			entry(addDays(DAY_ONE, 18)),
		];
		expect(currentStreakAsOf({ ...history, entries: loggedBefore })).toBe(0);
		expect(
			currentStreakAsOf({
				...history,
				entries: [...loggedBefore, entry(today)],
			}),
		).toBe(1);

		// Each paused day still reads paused.
		const weeks = buildHeatmapWeeks({ ...history, entries: [] });
		const status = (day: number) =>
			weeks
				.flat()
				.find((cell) => isSameDay(cell.date, addDays(DAY_ONE, day - 1)))
				?.status;
		expect([status(2), status(11), status(20)]).toEqual([
			"paused",
			"paused",
			"paused",
		]);
	});

	it("an archive and restore on the same day (the old Undo) adds no pause", async () => {
		await archiveHabit(3);
		await restoreHabit(3);
		expect(mockStored.pauses).toEqual([]);
		expect(mockScheduled).toEqual(["habit-3-reminder-1"]);
	});
});
