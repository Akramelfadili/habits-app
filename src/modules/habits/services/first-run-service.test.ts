const calls: string[] = [];
let mockPermission = "granted";

jest.mock("@/lib/notifications/use-notification-permission", () => ({
	ensureNotificationPermission: async () => {
		calls.push("permission");
		return mockPermission;
	},
}));

const mockAddReminder = jest.fn(async () => {
	calls.push("addReminder");
});
jest.mock("./reminder-service", () => ({
	addReminder: (...args: unknown[]) => (mockAddReminder as jest.Mock)(...args),
}));

import { makeHabit } from "../test-support/habit-builder";
import { enableFirstHabitReminder } from "./first-run-service";

describe("enableFirstHabitReminder", () => {
	beforeEach(() => {
		calls.length = 0;
		mockPermission = "granted";
		mockAddReminder.mockClear();
	});

	it("asks iOS first, then adds the default reminder", async () => {
		const habit = makeHabit({ name: "Drink water" });

		const permission = await enableFirstHabitReminder(habit);

		expect(calls).toEqual(["permission", "addReminder"]);
		expect(mockAddReminder).toHaveBeenCalledWith(habit);
		expect(permission).toBe("granted");
	});

	it("keeps the reminder and reports the denial when iOS says no", async () => {
		mockPermission = "denied";

		const permission = await enableFirstHabitReminder(makeHabit());

		expect(mockAddReminder).toHaveBeenCalledTimes(1);
		expect(permission).toBe("denied");
	});
});
