import { getISODay } from "date-fns";
import { WEEKDAY_SHORTCUT, WEEKDAYS } from "../constants";
import type { IsoWeekday, Reminder } from "../types";

const SHORT_DAY_NAMES: Record<IsoWeekday, string> = {
	1: "Mon",
	2: "Tue",
	3: "Wed",
	4: "Thu",
	5: "Fri",
	6: "Sat",
	7: "Sun",
};

function dayName(day: IsoWeekday): string {
	return WEEKDAYS.find((option) => option.day === day)?.name ?? "";
}

/** "a", "a and b", "a, b and c". */
function joinList(items: string[]): string {
	if (items.length <= 1) return items.join("");
	return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** 24-hour "07:20" — the time's own display, and its screen-reader name. */
export function formatReminderTime({
	hour,
	minute,
}: Pick<Reminder, "hour" | "minute">): string {
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** A reminder card's subtitle: "Every day", "Weekdays", or "Mon, Wed, Fri". */
export function reminderDaysLabel(weekdays: readonly IsoWeekday[]): string {
	const days = [...new Set(weekdays)].sort((a, b) => a - b);
	if (days.length === 0) return "No days";
	if (days.length === 7) return "Every day";
	if (
		days.length === WEEKDAY_SHORTCUT.length &&
		WEEKDAY_SHORTCUT.every((day) => days.includes(day))
	) {
		return "Weekdays";
	}
	return days.map((day) => SHORT_DAY_NAMES[day]).join(", ");
}

/** The inline warning under a reminder set for days the habit isn't scheduled on. */
export function unscheduledDaysWarning(days: readonly IsoWeekday[]): string {
	const names = joinList(days.map(dayName));
	return days.length === 1
		? `${names} is not a scheduled day for this habit — this reminder would fire for nothing.`
		: `${names} are not scheduled days for this habit — this reminder would fire for nothing.`;
}

/** Habit Detail's Reminders row subtitle: "None set", "All off", or "2 on · 07:20, 21:00". */
export function remindersSummary(reminders: readonly Reminder[]): string {
	if (reminders.length === 0) return "None set";
	const on = reminders.filter((reminder) => reminder.enabled);
	if (on.length === 0) return "All off";
	return `${on.length} on · ${on.map(formatReminderTime).join(", ")}`;
}

export function reminderCountLabel(count: number, cap: number): string {
	return `${count} of ${cap}`;
}

/**
 * The time Day closed's tomorrow preview shows beside a habit (HAB-14): its
 * earliest *enabled* reminder that fires on `date`'s weekday, "07:20" — or
 * `undefined` when none does, so the row shows no trailing text at all.
 */
export function earliestReminderTimeOn(
	reminders: readonly Reminder[],
	date: Date,
): string | undefined {
	const weekday = getISODay(date) as IsoWeekday;
	const earliest = reminders
		.filter(
			(reminder) => reminder.enabled && reminder.weekdays.includes(weekday),
		)
		.sort((a, b) => a.hour - b.hour || a.minute - b.minute)[0];
	return earliest ? formatReminderTime(earliest) : undefined;
}
