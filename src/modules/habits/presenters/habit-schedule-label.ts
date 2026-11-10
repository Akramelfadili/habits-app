import { atIndex } from "@/utils/indexed";
import type { Habit, IsoWeekday } from "../types";

const DAY_NAMES: Record<IsoWeekday, string> = {
	1: "Mon",
	2: "Tue",
	3: "Wed",
	4: "Thu",
	5: "Fri",
	6: "Sat",
	7: "Sun",
};

export function weekdaysLabel(weekdays: readonly IsoWeekday[]): string {
	const days = [...weekdays].sort((a, b) => a - b);
	const isRun =
		days.length > 2 &&
		days.every((d, i) => i === 0 || d === atIndex(days, i - 1) + 1);
	return isRun
		? `${DAY_NAMES[atIndex(days, 0)]}–${DAY_NAMES[atIndex(days, days.length - 1)]}`
		: days.map((day) => DAY_NAMES[day]).join(", ");
}

export function scheduleLabel(habit: Habit): string {
	const { frequency } = habit;
	if (frequency.type === "daily") return "Every day";
	if (frequency.type === "per-week")
		return `${frequency.timesPerWeek}× per week`;
	return weekdaysLabel(frequency.days);
}
