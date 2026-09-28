const mockSchedule = jest.fn();
const mockCancel = jest.fn();
const mockGetAllScheduled = jest.fn();
const mockGetPermissions = jest.fn();
const mockRequestPermissions = jest.fn();

jest.mock("expo-notifications", () => ({
	SchedulableTriggerInputTypes: { DAILY: "daily", CALENDAR: "calendar" },
	IosAuthorizationStatus: {
		NOT_DETERMINED: 0,
		DENIED: 1,
		AUTHORIZED: 2,
		PROVISIONAL: 3,
		EPHEMERAL: 4,
	},
	setNotificationHandler: jest.fn(),
	scheduleNotificationAsync: (...args: unknown[]) => mockSchedule(...args),
	cancelScheduledNotificationAsync: (...args: unknown[]) => mockCancel(...args),
	getAllScheduledNotificationsAsync: () => mockGetAllScheduled(),
	getPermissionsAsync: () => mockGetPermissions(),
	requestPermissionsAsync: () => mockRequestPermissions(),
}));

import {
	cancelRemindersWithPrefix,
	getNotificationPermission,
	requestNotificationPermission,
	scheduleReminder,
} from "./notifications";

const reminder = {
	id: "habit-3-reminder-7",
	title: "Meditate",
	body: "Time for this one.",
	hour: 21,
	minute: 5,
};

describe("notifications adapter", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetAllScheduled.mockResolvedValue([]);
	});

	it("schedules one repeating calendar trigger per weekday, converting ISO to iOS numbering", async () => {
		await scheduleReminder({ ...reminder, weekdays: [1, 6, 7] });

		expect(mockSchedule).toHaveBeenCalledTimes(3);
		const triggers = mockSchedule.mock.calls.map(
			([request]) => request.trigger,
		);
		// ISO Mon/Sat/Sun → iOS 2/7/1 (1 = Sunday).
		expect(triggers.map((t) => t.weekday)).toEqual([2, 7, 1]);
		expect(triggers[0]).toEqual({
			type: "calendar",
			weekday: 2,
			hour: 21,
			minute: 5,
			repeats: true,
		});
		expect(mockSchedule.mock.calls[0][0].identifier).toBe(
			"habit-3-reminder-7:day-1",
		);
	});

	it("uses a single daily trigger for an every-day reminder", async () => {
		await scheduleReminder({ ...reminder, weekdays: [1, 2, 3, 4, 5, 6, 7] });

		expect(mockSchedule).toHaveBeenCalledTimes(1);
		expect(mockSchedule.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				identifier: "habit-3-reminder-7:daily",
				trigger: { type: "daily", hour: 21, minute: 5 },
			}),
		);
	});

	it("replaces the reminder's own earlier notifications, but not a reminder whose id merely starts the same", async () => {
		mockGetAllScheduled.mockResolvedValue([
			{ identifier: "habit-3-reminder-7:day-1" },
			{ identifier: "habit-3-reminder-70:day-1" },
		]);

		await scheduleReminder({ ...reminder, weekdays: [2] });

		expect(mockCancel).toHaveBeenCalledTimes(1);
		expect(mockCancel).toHaveBeenCalledWith("habit-3-reminder-7:day-1");
	});

	it("cancels everything under a prefix", async () => {
		mockGetAllScheduled.mockResolvedValue([
			{ identifier: "habit-1-reminder-1:day-1" },
			{ identifier: "habit-1-reminder-2:daily" },
			{ identifier: "habit-12-reminder-3:daily" },
			{ identifier: "evening-review:daily" },
		]);

		await cancelRemindersWithPrefix("habit-1-");

		expect(mockCancel.mock.calls.map(([id]) => id)).toEqual([
			"habit-1-reminder-1:day-1",
			"habit-1-reminder-2:daily",
		]);
	});

	it.each([
		[0, "undetermined"],
		[1, "denied"],
		[2, "granted"],
		[3, "granted"],
	])("maps iOS authorization status %s to %s", async (status, expected) => {
		mockGetPermissions.mockResolvedValue({
			granted: false,
			status: "denied",
			ios: { status },
		});
		await expect(getNotificationPermission()).resolves.toBe(expected);
	});

	it("falls back to the cross-platform status without an iOS block", async () => {
		mockRequestPermissions.mockResolvedValue({
			granted: false,
			status: "undetermined",
		});
		await expect(requestNotificationPermission()).resolves.toBe("undetermined");
	});
});
