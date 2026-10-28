import { format } from "date-fns";
import { scheduleLabel } from "../presenters/habit-schedule-label";
import type { Habit } from "../types";

/** Schedule, plus the target for a quantity habit: "Mon–Fri · 8 glasses". */
export function habitPickerSubtitle(habit: Habit): string {
	const target =
		habit.targetType === "quantity"
			? ` · ${habit.targetAmount ?? 0} ${habit.targetUnit ?? ""}`.trimEnd()
			: "";
	return `${scheduleLabel(habit)}${target}`;
}

/** The D2 row's subline: "Logged 10:42 · bonus, streak unchanged". */
export function offScheduleSubtitle(loggedAt: Date): string {
	return `Logged ${format(loggedAt, "HH:mm")} · bonus, streak unchanged`;
}
