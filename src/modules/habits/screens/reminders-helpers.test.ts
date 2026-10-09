import type { Reminder } from "../types";
import {
	earliestReminderTimeOn,
	formatReminderTime,
	parseWeekdayParam,
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

describe("earliestReminderTimeOn (HAB-14)", () => {
	const thursday = new Date(2026, 8, 17);
	const reminder = (overrides: Partial<Reminder>): Reminder => ({
		id: 1,
		habitId: 1,
		hour: 7,
		minute: 20,
		weekdays: [1, 2, 3, 4, 5, 6, 7],
		enabled: true,
		...overrides,
	});

	it("picks the earliest reminder", () => {
		expect(
			earliestReminderTimeOn(
				[reminder({ hour: 21, minute: 0 }), reminder({ id: 2, hour: 7 })],
				thursday,
			),
		).toBe("07:20");
	});

	it("skips reminders that don't fire on that weekday", () => {
		expect(
			earliestReminderTimeOn(
				[
					reminder({ hour: 6, weekdays: [6, 7] }),
					reminder({ id: 2, hour: 9, minute: 5, weekdays: [4] }),
				],
				thursday,
			),
		).toBe("09:05");
	});

	it("skips disabled reminders", () => {
		expect(
			earliestReminderTimeOn(
				[reminder({ hour: 6, enabled: false }), reminder({ id: 2, hour: 8 })],
				thursday,
			),
		).toBe("08:20");
	});

	it("is undefined when nothing applies", () => {
		expect(earliestReminderTimeOn([], thursday)).toBeUndefined();
		expect(
			earliestReminderTimeOn([reminder({ weekdays: [1] })], thursday),
		).toBeUndefined();
		expect(
			earliestReminderTimeOn([reminder({ enabled: false })], thursday),
		).toBeUndefined();
	});

	describe("parseWeekdayParam (?addTime=<day>)", () => {
		it.each([
			["1", 1],
			["6", 6],
			["7", 7],
		])("reads %s as ISO weekday %i", (value, day) => {
			expect(parseWeekdayParam(value)).toBe(day);
		});

		it.each([undefined, "", "0", "8", "-1", "2.5", "sat", "NaN"])(
			"ignores %p",
			(value) => {
				expect(parseWeekdayParam(value)).toBeUndefined();
			},
		);
	});
});
