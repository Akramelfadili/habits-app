import { format } from "date-fns";
import { formatDateRange, noun } from "@/utils/format";
import type {
	WeeklyBestDay,
	WeeklyHabitRow,
	WeeklySummary,
	WeekWindow,
} from "../services/weekly-summary";
import type { Habit } from "../types";

const NUMBER_WORDS = [
	"zero",
	"one",
	"two",
	"three",
	"four",
	"five",
	"six",
	"seven",
];

function numberWord(value: number): string {
	return NUMBER_WORDS[value] ?? String(value);
}

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "14 – 20 September", or "28 September – 4 October" across a month boundary. */
export function weekRangeLabel({ start, end }: WeekWindow): string {
	return formatDateRange(start, end, { long: true });
}

/** A row is labelled by the habit's name alone — never a suffix on it (HAB-04, audit #8). */
export function weeklyRowLabel(habit: Habit): string {
	return habit.name;
}

/** "2/7"; a Break habit's count says what was counted — "5/7 resisted". */
export function weeklyRowCount(row: WeeklyHabitRow): string {
	const count = `${row.completed}/${row.scheduled}`;
	return row.habit.direction === "break" ? `${count} resisted` : count;
}

/** Best day tile — the weekday and "6 of 6 done"; "All" for a perfect week; a dash before anything's done. */
export function bestDayTile(
	bestDay: WeeklyBestDay | null,
	isPerfect: boolean,
): { value: string; caption: string } {
	if (isPerfect) return { value: "All", caption: "every day full" };
	if (!bestDay) return { value: "—", caption: "nothing done yet" };
	return {
		value: format(bestDay.date, "EEE"),
		caption: `${bestDay.completed} of ${bestDay.scheduled} done`,
	};
}

/** "Two of seven days. Try moving it …" — the slipping card's body. */
export function slippingBody(row: WeeklyHabitRow): string {
	const count = `${capitalize(numberWord(row.completed))} of ${numberWord(row.scheduled)} ${noun(row.scheduled, "day")}`;
	return `${count}. Try moving it to a day or time that fits better.`;
}

/** Today's menu row for this screen — "14 – 20 September · 34 of 42 done" (HAB-14). */
export function weeklyMenuSubline({
	week,
	completed,
	scheduled,
}: Pick<WeeklySummary, "week" | "completed" | "scheduled">): string {
	return `${weekRangeLabel(week)} · ${completed} of ${scheduled} done`;
}
