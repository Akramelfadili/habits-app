import { format, isSameDay, parseISO, subDays } from "date-fns";
import { NO_CATEGORY_LABEL, WEEKDAYS } from "../constants";
import type { CompletionRate, LongestStreak } from "../services/habit-history";
import type { Entry, Frequency, Habit, IsoWeekday } from "../types";

const SHORT_DAY: Record<IsoWeekday, string> = {
	1: "Mon",
	2: "Tue",
	3: "Wed",
	4: "Thu",
	5: "Fri",
	6: "Sat",
	7: "Sun",
};

/** "daily", "Mon–Fri", "Mon, Wed, Fri", "3× a week" — the cadence in Habit Detail's subtitle. */
export function frequencyLabel(frequency: Frequency): string {
	switch (frequency.type) {
		case "per-week":
			return `${frequency.timesPerWeek}× a week`;
		case "weekdays": {
			const days = [...frequency.days].sort((a, b) => a - b);
			if (days.length === WEEKDAYS.length) return "daily";
			const isRun =
				days.length >= 3 &&
				days.every((day, index) => index === 0 || day === days[index - 1] + 1);
			if (isRun) return `${SHORT_DAY[days[0]]}–${SHORT_DAY[days.at(-1) ?? 1]}`;
			return days.map((day) => SHORT_DAY[day]).join(", ");
		}
		default:
			return "daily";
	}
}

/** "Morning · 8 glasses · daily" / "Evening · Mon–Fri · added today". */
export function habitSubtitle(habit: Habit, today: Date): string {
	const parts = [habit.category ?? NO_CATEGORY_LABEL];
	if (habit.targetType === "quantity" && habit.targetAmount) {
		parts.push(`${habit.targetAmount} ${habit.targetUnit ?? ""}`.trim());
	}
	parts.push(frequencyLabel(habit.frequency));
	if (isSameDay(habit.createdAt, today)) parts.push("added today");
	return parts.join(" · ");
}

/** "days, in June" — or "no streak yet" before the first one. */
export function longestStreakCaption(longest: LongestStreak): string {
	if (longest.days === 0 || !longest.endedOn) return "no streak yet";
	const unit = longest.days === 1 ? "day" : "days";
	return `${unit}, in ${format(longest.endedOn, "MMMM")}`;
}

/** "87%" / "—" for the 90-day tile's numeral. */
export function completionRateValue(rate: CompletionRate): string {
	return rate.fraction === null ? "—" : `${Math.round(rate.fraction * 100)}%`;
}

/** "78 of 90 due". */
export function completionRateCaption(rate: CompletionRate): string {
	return `${rate.completed} of ${rate.scheduled} due`;
}

/** "Today", "Yesterday", else "Mon 21 Sep". */
export function entryDateLabel(date: string, today: Date): string {
	const day = parseISO(date);
	if (isSameDay(day, today)) return "Today";
	if (isSameDay(day, subDays(today, 1))) return "Yesterday";
	return format(day, "EEE d MMM");
}

/** "6 / 8" for a quantity habit; "Done" / "Resisted" for a simple check. */
export function entryValueLabel(habit: Habit, entry: Entry): string {
	if (habit.targetType === "quantity") {
		return `${entry.value ?? 0} / ${habit.targetAmount ?? 0}`;
	}
	return habit.direction === "break" ? "Resisted" : "Done";
}

/** A noted day with nothing logged (HAB-10) — "Not resisted" keeps a Break habit's framing. */
export function notLoggedLabel(habit: Habit): string {
	return habit.direction === "break" ? "Not resisted" : "Not logged";
}

/** "Jul — Sep" across the heatmap's span, or a single month when it fits in one. */
export function heatmapRangeLabel(firstDay: Date, today: Date): string {
	const start = format(firstDay, "MMM");
	const end = format(today, "MMM");
	return start === end ? end : `${start} — ${end}`;
}
