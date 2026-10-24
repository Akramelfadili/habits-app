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
	cancelScheduled,
	getNotificationPermission,
	listScheduledIdentifiers,
	newGeneration,
	parseIdentifier,
	reminderSlots,
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
		await scheduleReminder({ ...reminder, weekdays: [1, 6, 7] }, "g1");

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
			"habit-3-reminder-7:day-1:2105:g1",
		);
	});

	it("uses a single daily trigger for an every-day reminder", async () => {
		const created = await scheduleReminder(
			{ ...reminder, weekdays: [1, 2, 3, 4, 5, 6, 7] },
			"g1",
		);

		expect(mockSchedule).toHaveBeenCalledTimes(1);
		expect(mockSchedule.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				identifier: "habit-3-reminder-7:daily:2105:g1",
				trigger: { type: "daily", hour: 21, minute: 5 },
			}),
		);
		expect(created).toEqual(["habit-3-reminder-7:daily:2105:g1"]);
	});

	it("never cancels anything itself — replacing the old set is the caller's job", async () => {
		mockGetAllScheduled.mockResolvedValue([
			{ identifier: "habit-3-reminder-7:day-1:2105:old" },
		]);

		await scheduleReminder({ ...reminder, weekdays: [2] }, "new");

		expect(mockCancel).not.toHaveBeenCalled();
	});

	it("a failure part-way cancels what this call created and rethrows — all or nothing", async () => {
		mockSchedule
			.mockResolvedValueOnce("a")
			.mockResolvedValueOnce("b")
			.mockRejectedValueOnce(new Error("64 pending"));

		await expect(
			scheduleReminder({ ...reminder, weekdays: [1, 2, 3] }, "g1"),
		).rejects.toThrow("64 pending");

		expect(mockCancel.mock.calls.map(([id]) => id)).toEqual([
			"habit-3-reminder-7:day-1:2105:g1",
			"habit-3-reminder-7:day-2:2105:g1",
		]);
	});

	it("lists identifiers and cancels exactly the ones given", async () => {
		mockGetAllScheduled.mockResolvedValue([
			{ identifier: "x" },
			{ identifier: "y" },
		]);
		await expect(listScheduledIdentifiers()).resolves.toEqual(["x", "y"]);

		await cancelScheduled(["y"]);
		expect(mockCancel.mock.calls.map(([id]) => id)).toEqual(["y"]);
	});

	it("generations are unique even within one millisecond", () => {
		const generations = new Set(Array.from({ length: 50 }, newGeneration));
		expect(generations.size).toBe(50);
	});

	it("reminderSlots: one daily trigger for all seven days, else one per day", () => {
		expect(reminderSlots([1, 2, 3, 4, 5, 6, 7])).toEqual(["daily"]);
		expect(reminderSlots([1, 3, 3])).toEqual(["day-1", "day-3"]);
	});

	it("parseIdentifier reads its own format and rejects anything else", () => {
		expect(parseIdentifier("habit-3-reminder-7:day-1:2105:abc1")).toEqual({
			reminderId: "habit-3-reminder-7",
			slot: "day-1",
			time: "2105",
			generation: "abc1",
		});
		expect(parseIdentifier("habit-3-reminder-7:day-1")).toBeNull();
		expect(parseIdentifier("something-else")).toBeNull();
	});

	it("cancels everything under a prefix", async () => {
		mockGetAllScheduled.mockResolvedValue([
			{ identifier: "habit-1-reminder-1:day-1:0900:g" },
			{ identifier: "habit-1-reminder-2:daily:0900:g" },
			{ identifier: "habit-12-reminder-3:daily:0900:g" },
			{ identifier: "evening-review:daily:2130:g" },
		]);

		await cancelRemindersWithPrefix("habit-1-");

		expect(mockCancel.mock.calls.map(([id]) => id)).toEqual([
			"habit-1-reminder-1:day-1:0900:g",
			"habit-1-reminder-2:daily:0900:g",
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
