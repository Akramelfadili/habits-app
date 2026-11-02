import type { Reminder } from "../types";
import {
	formatReminderTime,
	reminderDaysLabel,
	unscheduledDaysWarning,
} from "./reminders-helpers";

describe("reminders-helpers", () => {
	it("formats times as zero-padded 24-hour", () => {
		expect(formatReminderTime({ hour: 7, minute: 5 })).toBe("07:05");
		expect(formatReminderTime({ hour: 21, minute: 30 })).toBe("21:30");
	});

	it.each<[Reminder["weekdays"], string]>([
		[[1, 2, 3, 4, 5, 6, 7], "Every day"],
		[[5, 4, 3, 2, 1], "Weekdays"],
		[[1, 3, 5], "Mon, Wed, Fri"],
		[[6, 7], "Sat, Sun"],
		[[], "No days"],
	])("labels %j as %s", (days, label) => {
		expect(reminderDaysLabel(days)).toBe(label);
	});

	it("words the unscheduled-day warning for one day, and for several", () => {
		expect(unscheduledDaysWarning([6])).toBe(
			"Saturday is not a scheduled day for this habit — this reminder would fire for nothing.",
		);
		expect(unscheduledDaysWarning([2, 6, 7])).toBe(
			"Tuesday, Saturday and Sunday are not scheduled days for this habit — this reminder would fire for nothing.",
		);
	});
});
