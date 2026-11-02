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

/** "Mon–Fri", "Tue, Thu", "Mon, Wed, Fri": a run of three or more days reads as a range. */
export function weekdaysLabel(weekdays: readonly IsoWeekday[]): string {
	const days = [...weekdays].sort((a, b) => a - b);
	const isRun =
		days.length > 2 && days.every((d, i) => i === 0 || d === days[i - 1] + 1);
	return isRun
		? `${DAY_NAMES[days[0]]}–${DAY_NAMES[days[days.length - 1]]}`
		: days.map((day) => DAY_NAMES[day]).join(", ");
}

/** "Mon–Fri", "Tue, Thu", "Every day" — a picker row's schedule, as in the D1 mockup. */
export function scheduleLabel(habit: Habit): string {
	const { frequency } = habit;
	if (frequency.type === "daily") return "Every day";
	if (frequency.type === "per-week")
		return `${frequency.timesPerWeek}× per week`;
	return weekdaysLabel(frequency.days);
}
