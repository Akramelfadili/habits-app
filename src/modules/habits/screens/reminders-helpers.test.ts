import type { Reminder } from "../types";
import {
	formatReminderTime,
	reminderCountLabel,
	reminderDaysLabel,
	remindersSummary,
	unscheduledDaysWarning,
} from "./reminders-helpers";

function reminder(overrides: Partial<Reminder> = {}): Reminder {
	return {
		id: 1,
		habitId: 1,
		hour: 7,
		minute: 20,
		weekdays: [1, 2, 3, 4, 5],
		enabled: true,
		...overrides,
	};
}

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

	it("summarizes a habit's reminders for Habit Detail", () => {
		expect(remindersSummary([])).toBe("None set");
		expect(remindersSummary([reminder({ enabled: false })])).toBe("All off");
		expect(
			remindersSummary([
				reminder(),
				reminder({ id: 2, hour: 13, minute: 0, enabled: false }),
				reminder({ id: 3, hour: 21, minute: 0 }),
			]),
		).toBe("2 on · 07:20, 21:00");
	});

	it("labels the count against the cap", () => {
		expect(reminderCountLabel(3, 4)).toBe("3 of 4");
	});
});
