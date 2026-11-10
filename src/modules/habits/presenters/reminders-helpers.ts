import { WEEKDAY_SHORTCUT, WEEKDAYS } from "../constants";
import { reminderDaysCopy } from "../messages";
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

function joinList(items: string[]): string {
	if (items.length <= 1) return items.join("");
	return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function formatReminderTime({
	hour,
	minute,
}: Pick<Reminder, "hour" | "minute">): string {
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function reminderDaysLabel(weekdays: readonly IsoWeekday[]): string {
	const days = [...new Set(weekdays)].sort((a, b) => a - b);
	if (days.length === 0) return reminderDaysCopy.none;
	if (days.length === 7) return reminderDaysCopy.everyDay;
	if (
		days.length === WEEKDAY_SHORTCUT.length &&
		WEEKDAY_SHORTCUT.every((day) => days.includes(day))
	) {
		return reminderDaysCopy.weekdays;
	}
	return days.map((day) => SHORT_DAY_NAMES[day]).join(", ");
}

export function unscheduledDaysWarning(days: readonly IsoWeekday[]): string {
	const names = joinList(days.map(dayName));
	return reminderDaysCopy.unscheduled(names, days.length);
}
