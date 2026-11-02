import { REMINDER_CAP } from "./constants";
import { notificationCopy, reminderCapMessage } from "./reminder-copy";

describe("reminder copy", () => {
	it("says the cap in numbers and in words", () => {
		expect(reminderCapMessage).toContain(`${REMINDER_CAP} of ${REMINDER_CAP}`);
		expect(reminderCapMessage).toContain("remove one to add another");
	});

	it("has a notification line for each kind", () => {
		expect(notificationCopy.build).toMatch(/check it off/);
		expect(notificationCopy.break).toMatch(/resisting/);
		expect(notificationCopy.eveningTitle).toBe("Evening review");
		expect(notificationCopy.eveningBody.length).toBeGreaterThan(0);
	});
});
