import { renderHook } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";
import type { Reminder } from "../types";

const mockHabit = makeHabit({
	id: 1,
	frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
});

let mockReminders: Reminder[] = [];
let mockPermission: string | undefined = "granted";

jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => [mockHabit],
}));
jest.mock("../repositories/reminder-repository", () => ({
	useHabitReminders: () => mockReminders,
}));
jest.mock(
	"@/lib/app-settings/repositories/app-settings-repository",
	() => ({}),
);
jest.mock("@/lib/notifications/use-notification-permission", () => ({
	useNotificationPermission: () => mockPermission,
}));
jest.mock("@/lib/notifications/notifications", () => ({}));

import { useReminderQueries } from "./use-reminder-queries";

function reminder(id: number, weekdays: Reminder["weekdays"]): Reminder {
	return { id, habitId: 1, hour: 7, minute: 0, weekdays, enabled: true };
}

describe("useReminderQueries", () => {
	beforeEach(() => {
		mockReminders = [];
		mockPermission = "granted";
	});

	it("returns null for an unknown habit", async () => {
		const { result } = await renderHook(() => useReminderQueries(99));
		expect(result.current).toBeNull();
	});

	it("flags each reminder's days the habit isn't scheduled on", async () => {
		mockReminders = [reminder(1, [1, 2]), reminder(2, [5, 6, 7])];
		const { result } = await renderHook(() => useReminderQueries(1));

		expect(result.current?.reminders.map((r) => r.unscheduledDays)).toEqual([
			[],
			[6, 7],
		]);
		expect(result.current?.atCap).toBe(false);
	});

	it("is at cap with 4 reminders", async () => {
		mockReminders = [1, 2, 3, 4].map((id) => reminder(id, [1]));
		const { result } = await renderHook(() => useReminderQueries(1));
		expect(result.current?.atCap).toBe(true);
	});

	it("reads a denied permission", async () => {
		mockPermission = "denied";
		const { result } = await renderHook(() => useReminderQueries(1));
		expect(result.current?.notificationsDenied).toBe(true);
	});

	it("doesn't show the notice while permission is still being checked", async () => {
		mockPermission = undefined;
		const { result } = await renderHook(() => useReminderQueries(1));
		expect(result.current?.notificationsDenied).toBe(false);
	});
});
