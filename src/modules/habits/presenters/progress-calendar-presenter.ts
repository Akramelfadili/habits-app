import {
	addDays,
	differenceInCalendarDays,
	endOfMonth,
	format,
} from "date-fns";
import type { CompletionRowsCell } from "@/components/ui/composite/completion-rows";
import type { MonthListItemData } from "@/components/ui/composite/month-list";
import type { YearBand } from "@/components/ui/composite/year-heat-map";
import { atIndex } from "@/utils/indexed";
import { weekStart } from "@/utils/week-window";
import type {
	CalendarDay,
	DayDetail,
	MonthCalendar,
} from "../domain/progress-grid";
import type { ProgressUnlock } from "../domain/progress-unlock";
import type { RangeHabitRow } from "../domain/range-summary";
import type { YearMap } from "../domain/year-map";
import { progressCopy } from "../messages";
import type { Habit } from "../types";
import { scheduleLabel } from "./habit-schedule-label";
import { calendarStateOf, type DotColor } from "./progress-presenter";

const cell = progressCopy.cell;
const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function calendarDayLabel(day: CalendarDay): string {
	const date = format(day.date, "EEEE d MMMM");
	switch (day.status) {
		case "before-start":
			return `${date}, ${cell.beforeStart}`;
		case "future":
			return `${date}, ${cell.upcoming}`;
		case "frozen":
			return `${date}, ${cell.frozen}`;
		case "rest":
			return `${date}, ${cell.notDue}`;
		case "open":
			return `${date}, ${cell.inProgress}`;
		case "nothing-logged":
			return `${date}, ${cell.notLogged}`;
		case "missed":
			return `${date}, ${cell.percent(0)}`;
		case "level": {
			const percent = day.due > 0 ? Math.round((day.done / day.due) * 100) : 0;
			return `${date}, ${cell.percent(percent)}`;
		}
	}
}

export function monthCalendarProps(
	calendar: MonthCalendar,
	selectedKey: string | null,
	onSelect: (day: CalendarDay) => void,
): { letters: string[]; weeks: (CompletionRowsCell | null)[][] } {
	return {
		letters: WEEKDAY_LETTERS,
		weeks: calendar.weeks.map((week) =>
			week.map((day) =>
				day
					? {
							key: day.key,
							state: calendarStateOf(day),
							today: day.isToday,
							selected: day.key === selectedKey,
							text: format(day.date, "d"),
							accessibilityLabel: calendarDayLabel(day),
							onPress: () => onSelect(day),
						}
					: null,
			),
		),
	};
}

export function dayListLabel(
	days: readonly Date[],
	withMonth: boolean,
): string {
	if (days.length === 0) return "";
	const runs: Date[][] = [];
	for (const day of days) {
		const last = runs[runs.length - 1];
		if (
			last &&
			differenceInCalendarDays(day, atIndex(last, last.length - 1)) === 1
		) {
			last.push(day);
		} else runs.push([day]);
	}
	const text = runs
		.map((run) =>
			run.length === 1
				? format(atIndex(run, 0), "d")
				: `${format(atIndex(run, 0), "d")}–${format(atIndex(run, run.length - 1), "d")}`,
		)
		.join(", ");
	return withMonth ? `${text} ${format(atIndex(days, 0), "MMM")}` : text;
}

export function monthNote(
	calendar: MonthCalendar,
	options: {
		unlock: ProgressUnlock;
		oneHabit: Habit | null;
		tooEarly: boolean;
	},
): string | null {
	const { days } = calendar;
	const copy = progressCopy.month;
	if (options.tooEarly) {
		const hasEarlier = days.some((day) => day.status === "before-start");
		return options.unlock.firstLogDate && hasEarlier
			? copy.startedNote(format(options.unlock.firstLogDate, "EEE d MMM"))
			: null;
	}
	const frozen = days
		.filter((day) => day.status === "frozen")
		.map((day) => day.date);
	if (options.oneHabit) {
		const missed = days
			.filter((day) => day.status === "missed")
			.map((day) => day.date);
		return [
			options.oneHabit.name,
			missed.length > 0 ? `${dayListLabel(missed, false)} missed` : null,
			frozen.length > 0 ? copy.frozenNote(dayListLabel(frozen, false)) : null,
		]
			.filter(Boolean)
			.join(" · ");
	}
	const ahead = days.filter((day) => day.status === "future");
	const lastDay = days[days.length - 1]?.date;
	return (
		[
			frozen.length > 0 ? copy.frozenNote(dayListLabel(frozen, true)) : null,
			ahead.length > 0 && lastDay
				? copy.aheadNote(
						`${format(atIndex(ahead, 0).date, "d")}–${format(lastDay, "d")}`,
					)
				: null,
		]
			.filter(Boolean)
			.join(" · ") || null
	);
}

export type MonthRateRow = {
	key: string;
	name: string;
	dot: string;
	isBreak: boolean;
	slipping: boolean;
	sub: string;
	rate: string;
	bar: number;
	accessibilityLabel: string;
};

export function monthRateRows(
	rows: readonly RangeHabitRow[],
	dot: DotColor,
): MonthRateRow[] {
	const copy = progressCopy.month;
	return rows.map((row) => {
		const parts = row.isBreak
			? [copy.resisted(row.done, row.due)]
			: [scheduleLabelFor(row.habit), copy.doneOf(row.done, row.due)];
		if (row.frozen > 0) parts.push(copy.frozen(row.frozen));
		if (row.bonus > 0) parts.push(copy.bonus(row.bonus));
		if (row.slipping) parts.push(copy.slipping);
		const rate = row.rate === null ? copy.noRate : `${row.rate}%`;
		const sub = parts.join(" · ");
		return {
			key: String(row.habit.id),
			name: row.habit.name,
			dot: dot(row.habit),
			isBreak: row.isBreak,
			slipping: row.slipping,
			sub,
			rate,
			bar: row.rate === null ? 0 : row.rate / 100,
			accessibilityLabel: `${row.habit.name}${row.isBreak ? `, ${copy.breakTag}` : ""}, ${rate}, ${sub}`,
		};
	});
}

function scheduleLabelFor(habit: Habit): string {
	return habit.frequency.type === "daily"
		? progressCopy.daily
		: scheduleLabel(habit);
}

export type DayDetailCardData = {
	title: string;
	summary: string;
	editable: boolean;
	rows: { key: string; name: string; dot: string; state: string }[];
	accessibilityLabel: string;
};

export function dayDetailProps(
	detail: DayDetail,
	dot: DotColor,
): DayDetailCardData {
	const copy = progressCopy.day.state;
	const summary =
		detail.due > 0 && detail.percent !== null
			? progressCopy.day.summary(detail.done, detail.due, detail.percent)
			: progressCopy.day.nothingDue;
	const rows = detail.items.map((item) => {
		const quantity = item.target !== null && item.value !== undefined;
		const state = (() => {
			switch (item.status) {
				case "done":
					return quantity
						? copy.partial(item.value as number, item.target as number)
						: item.isBreak
							? copy.resisted
							: copy.done;
				case "partial":
					return copy.partial(item.value ?? 0, item.target ?? 0);
				case "missed":
					return item.isBreak ? copy.slipped : copy.missed;
				case "frozen":
					return copy.frozen;
				case "bonus":
					return copy.bonus;
				case "today":
					return copy.open;
				default:
					return copy.notLogged;
			}
		})();
		return {
			key: String(item.habit.id),
			name: item.habit.name,
			dot: dot(item.habit),
			state,
		};
	});
	const title = format(detail.date, "EEEE, d MMMM");
	return {
		title,
		summary,
		editable: detail.editable,
		rows,
		accessibilityLabel: `${format(detail.date, "EEEE d MMMM")}, ${summary}`,
	};
}

function monthPercentLabel(percent: number | null): string {
	return percent === null
		? progressCopy.year.noData.toLowerCase()
		: cell.percent(percent);
}

export function yearBandsProps(
	grid: YearMap,
	openMonth: (month: Date) => void,
): YearBand[] {
	const byKey = new Map(grid.days.map((day) => [day.key, day]));
	return grid.bands.map((months, bandIndex) => {
		const first = atIndex(months, 0).month;
		const last = endOfMonth(atIndex(months, months.length - 1).month);
		const monday = weekStart(first);
		const weeks = Math.ceil((differenceInCalendarDays(last, monday) + 1) / 7);
		const columns = Array.from({ length: weeks }, (_, week) =>
			Array.from({ length: 7 }, (_, weekday): CompletionRowsCell | null => {
				const date = addDays(monday, week * 7 + weekday);
				if (date < first || date > last) return null;
				const day = byKey.get(format(date, "yyyy-MM-dd"));
				return day
					? {
							key: day.key,
							state: calendarStateOf(day),
							today: day.isToday,
						}
					: null;
			}),
		);
		return {
			key: `band-${bandIndex}`,
			columns,
			months: months.map((month) => ({
				key: month.key,
				label: progressCopy.year.monthLabel(format(month.month, "MMM")),
				column: Math.floor(differenceInCalendarDays(month.month, monday) / 7),
				accessibilityLabel: progressCopy.year.monthOpens(
					format(month.month, "MMMM"),
					monthPercentLabel(month.percent),
				),
				onPress: () => openMonth(month.month),
			})),
		};
	});
}

export function currentBandIndex(grid: YearMap, today: Date): number {
	const index = grid.bands.findIndex((band) =>
		band.some(
			(month) =>
				month.month.getFullYear() === today.getFullYear() &&
				month.month.getMonth() === today.getMonth(),
		),
	);
	return Math.max(0, index);
}

export function yearMonthListProps(
	grid: YearMap,
	openMonth: (month: Date) => void,
): MonthListItemData[] {
	return grid.monthList.map((item) => ({
		key: item.key,
		label: format(item.month, "MMMM"),
		percent: item.percent,
		bar: item.bar,
		accessibilityLabel: progressCopy.year.monthOpens(
			format(item.month, "MMMM"),
			monthPercentLabel(item.percent),
		),
		onPress: () => openMonth(item.month),
	}));
}
