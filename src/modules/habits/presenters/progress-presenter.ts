import { format, startOfDay } from "date-fns";
import type { SFSymbol } from "sf-symbols-typescript";
import type { CompletionCellState } from "@/components/ui/composite/completion-cell";
import type { LegendEntry } from "@/components/ui/composite/completion-legend";
import type { CompletionRowsCell } from "@/components/ui/composite/completion-rows";
import type {
	MatrixDayHeader,
	MatrixRowData,
	WeekBlockData,
} from "@/components/ui/composite/week-matrix";
import { fromDayKey } from "@/utils/day-key";
import { atIndex } from "@/utils/indexed";
import type { CellStatus } from "../domain/day-status";
import type {
	CalendarDay,
	MatrixCell,
	MatrixRow,
	WeekMatrix,
} from "../domain/progress-grid";
import type { ProgressInsight } from "../domain/progress-insights";
import type { ProgressUnlock } from "../domain/progress-unlock";
import type { RangeKind, RangeSummary } from "../domain/range-summary";
import { progressCopy } from "../messages";
import type { Habit, IsoWeekday } from "../types";
import { scheduleLabel } from "./habit-schedule-label";

export type StatTileData = {
	key: string;
	label: string;
	value: string;
	caption: string;
	tone?: "warning";
	muted?: boolean;
};

export type DotColor = (habit: Habit) => string;

const WEEKDAY_SHORT: Record<IsoWeekday, string> = {
	1: "Mon",
	2: "Tue",
	3: "Wed",
	4: "Thu",
	5: "Fri",
	6: "Sat",
	7: "Sun",
};

const cell = progressCopy.cell;

export function cellStateOf(day: {
	status: CellStatus;
	level: 0 | 1 | 2 | 3;
}): CompletionCellState {
	switch (day.status) {
		case "done":
			return { kind: "level", level: 3 };
		case "partial":
			return { kind: "level", level: day.level === 2 ? 2 : 1 };
		case "missed":
			return { kind: "level", level: 0 };
		case "frozen":
			return { kind: "frozen" };
		case "bonus":
			return { kind: "bonus" };
		case "not-due":
			return { kind: "not-due" };
		case "before-start":
			return { kind: "before-start" };
		case "future":
			return { kind: "future" };
		// Due, nothing logged yet — and today, still open: an outline, never "missed".
		case "nothing-logged":
		case "today":
			return { kind: "nothing-logged" };
	}
}

export function calendarStateOf(day: CalendarDay): CompletionCellState {
	switch (day.status) {
		case "before-start":
			return { kind: "before-start" };
		case "future":
			return { kind: "future" };
		case "frozen":
			return { kind: "frozen" };
		case "rest":
			return { kind: "not-due" };
		case "open":
		case "nothing-logged":
			return { kind: "nothing-logged" };
		case "missed":
			return { kind: "level", level: 0 };
		case "level":
			return { kind: "level", level: day.level ?? 0 };
	}
}

/** The whole-number share a quantity habit's partial cell reached; the level's midpoint without a target. */
function partialPercent(row: MatrixRow, day: MatrixCell): number {
	const target = row.habit.targetAmount;
	if (target && day.value !== undefined) {
		return Math.min(99, Math.round((day.value / target) * 100));
	}
	return day.level === 2 ? 75 : 25;
}

export function matrixCellWord(row: MatrixRow, day: MatrixCell): string {
	switch (day.status) {
		case "done":
			return row.isBreak ? cell.resisted : cell.done;
		case "partial":
			return cell.partial(partialPercent(row, day));
		case "missed":
			return row.isBreak ? cell.slipped : cell.missed;
		case "frozen":
			return cell.frozen;
		case "bonus":
			return cell.bonus;
		case "not-due":
			return cell.notDue;
		case "before-start":
			return cell.beforeStart;
		case "nothing-logged":
			return cell.notLogged;
		case "today":
			return cell.open;
		case "future":
			return cell.upcoming;
	}
}

export function matrixCellLabel(row: MatrixRow, day: MatrixCell): string {
	return `${format(day.date, "EEE")}, ${matrixCellWord(row, day)}`;
}

export function matrixRowLabel(row: MatrixRow): string {
	const days = row.cells
		.map((day) => `${format(day.date, "EEEE")}, ${matrixCellWord(row, day)}`)
		.join(". ");
	return `${row.habit.name}, ${progressCopy.week.rowTotal(row.done, row.target)}. ${days}`;
}

function rowCells(row: MatrixRow): CompletionRowsCell[] {
	return row.cells.map((day) => ({
		key: day.key,
		state: cellStateOf(day),
		today: day.isToday,
		accessibilityLabel: matrixCellLabel(row, day),
	}));
}

export function weekMatrixProps(
	matrix: WeekMatrix,
	dot: DotColor,
	onEditDay: (date: Date) => void,
	today: Date,
): { days: MatrixDayHeader[]; rows: MatrixRowData[] } {
	return {
		days: matrix.days.map((day) => ({
			key: day.key,
			letter: format(day.date, "EEEEE"),
			today: day.isToday,
			accessibilityLabel: progressCopy.week.editDayLabel(
				format(day.date, "EEEE d MMMM"),
			),
			// Days that have not happened cannot be edited ("Can't log ahead"): no target.
			onPress:
				day.date > startOfDay(today) ? undefined : () => onEditDay(day.date),
		})),
		rows: matrix.rows.map((row) => ({
			key: String(row.habit.id),
			name: row.habit.name,
			dot: dot(row.habit),
			total: `${row.done}/${row.target}`,
			met: row.target > 0 && row.done >= row.target,
			accessibilityLabel: matrixRowLabel(row),
			cells: rowCells(row),
		})),
	};
}

export function weekBlocksProps(
	matrix: WeekMatrix,
	dot: DotColor,
	onEditDay: (date: Date) => void,
	today: Date,
): WeekBlockData[] {
	return matrix.rows.map((row) => ({
		key: String(row.habit.id),
		name: row.habit.name,
		dot: dot(row.habit),
		total: `${row.done}/${row.target}`,
		met: row.target > 0 && row.done >= row.target,
		cells: row.cells.map((day) => ({
			key: day.key,
			state: cellStateOf(day),
			today: day.isToday,
			letter: format(day.date, "EEEEE"),
			text: format(day.date, "d"),
			accessibilityLabel: matrixCellLabel(row, day),
			// 40 pt with a 2 pt slop is a real 44 pt target: here a cell opens its day.
			onPress:
				day.date > startOfDay(today) ? undefined : () => onEditDay(day.date),
			accessibilityHint:
				day.date > startOfDay(today)
					? undefined
					: progressCopy.week.editDayHint,
		})),
	}));
}

export function weekLegend(): LegendEntry[] {
	const legend = progressCopy.legend;
	return [
		{ state: { kind: "level", level: 3 }, label: legend.done },
		{ state: { kind: "level", level: 1 }, label: legend.partial },
		{ state: { kind: "level", level: 0 }, label: legend.missed },
		{ state: { kind: "frozen" }, label: legend.frozen },
		{ state: { kind: "bonus" }, label: legend.offSchedule },
		{ state: { kind: "nothing-logged" }, label: legend.notLogged },
		{ state: { kind: "future" }, label: legend.future },
	];
}

export function weekdayRunLabel(weekdays: readonly number[]): string {
	const sorted = [...weekdays].sort((a, b) => a - b);
	const runs: number[][] = [];
	for (const day of sorted) {
		const last = runs[runs.length - 1];
		if (last && day === atIndex(last, last.length - 1) + 1) last.push(day);
		else runs.push([day]);
	}
	return runs
		.map((run) =>
			run.length === 1
				? WEEKDAY_SHORT[run[0] as IsoWeekday]
				: `${WEEKDAY_SHORT[run[0] as IsoWeekday]}–${WEEKDAY_SHORT[run[run.length - 1] as IsoWeekday]}`,
		)
		.join(", ");
}

export function weekStartedNote(
	matrix: WeekMatrix,
	unlock: ProgressUnlock,
): string | null {
	if (!unlock.firstLogDate || matrix.rows.length === 0) return null;
	const before = matrix.days
		.map((_, index) => index)
		.filter((index) =>
			matrix.rows.every(
				(row) => atIndex(row.cells, index).status === "before-start",
			),
		)
		.map((index) => index + 1);
	if (before.length === 0) return null;
	return progressCopy.week.startedNote(
		format(unlock.firstLogDate, "EEE d MMM"),
		weekdayRunLabel(before),
	);
}

type TileContext = {
	today: Date;
	oneHabit: Habit | null;
};

const stats = progressCopy.stats;

const rateValue = (rate: number | null) =>
	rate === null ? stats.noValue : `${rate}%`;

function isSoFar(summary: RangeSummary, today: Date): boolean {
	return startOfDay(summary.window.end) >= startOfDay(today);
}

function streakTile(
	label: string,
	summary: RangeSummary,
	caption: "habit-first" | "days-first" | "bare",
): StatTileData {
	const streak = summary.bestStreak;
	if (!streak || streak.days === 0) {
		return {
			key: "streak",
			label,
			value: stats.noValue,
			caption: stats.noStreak,
			muted: true,
		};
	}
	return {
		key: "streak",
		label,
		value: String(streak.days),
		caption:
			caption === "habit-first"
				? stats.streakDays(streak.habit.name)
				: caption === "days-first"
					? stats.daysIn(streak.habit.name)
					: stats.days,
	};
}

export function weekTiles(
	summary: RangeSummary,
	{ today, oneHabit }: TileContext,
	freezesLeft: number,
): StatTileData[] {
	const soFar = isSoFar(summary, today);
	if (oneHabit) {
		const frozen = summary.freezes[0];
		return [
			{
				key: "completion",
				label: stats.completion,
				value: rateValue(summary.rate),
				caption: frozen
					? stats.ofDueFrozen(
							summary.done,
							summary.due,
							format(fromDayKey(frozen.date), "EEE"),
						)
					: stats.ofDue(summary.done, summary.due, false),
				muted: summary.rate === null,
			},
			{ ...streakTile(stats.streak, summary, "bare") },
			{
				key: "freezes",
				label: stats.freezes,
				value: String(freezesLeft),
				caption: stats.freezesLeft(freezesLeft),
				tone: freezesLeft === 0 ? "warning" : undefined,
			},
		];
	}
	const best = summary.bestDay;
	return [
		{
			key: "completion",
			label: stats.completion,
			value: rateValue(summary.rate),
			caption: stats.ofDue(summary.done, summary.due, soFar),
			muted: summary.rate === null,
		},
		streakTile(stats.bestStreak, summary, "habit-first"),
		{
			key: "best-day",
			label: stats.bestDay,
			value: best ? WEEKDAY_SHORT[best.weekday] : stats.noValue,
			caption: best
				? stats.bestDayDone(best.done, best.due)
				: stats.nothingDone,
			muted: !best,
		},
	];
}

export function monthTiles(
	summary: RangeSummary,
	{ today, oneHabit }: TileContext,
): StatTileData[] {
	const soFar = isSoFar(summary, today);
	if (oneHabit) {
		return [
			{
				key: "completion",
				label: stats.completion,
				value: rateValue(summary.rate),
				caption: stats.ofDueFrozenCount(
					summary.done,
					summary.due,
					summary.freezes.length,
				),
				muted: summary.rate === null,
			},
			{
				key: "longest",
				label: stats.longest,
				value: summary.bestStreak
					? String(summary.bestStreak.days)
					: stats.noValue,
				caption: stats.days,
				muted: !summary.bestStreak,
			},
			{
				key: "freezes",
				label: stats.freezesUsed,
				value: String(summary.freezes.length),
				caption: stats.thisMonth,
			},
		];
	}
	const versus = format(summary.previousWindow.start, "MMM");
	return [
		{
			key: "completion",
			label: stats.completion,
			value: rateValue(summary.rate),
			caption:
				summary.deltaPoints !== null
					? stats.delta(summary.deltaPoints, versus)
					: stats.ofDue(summary.done, summary.due, soFar),
			muted: summary.rate === null,
		},
		{
			key: "perfect",
			label: stats.perfectDays,
			value: String(summary.perfectDays),
			caption: stats.perfectOf(summary.countedDays, soFar),
		},
		streakTile(stats.bestStreak, summary, "habit-first"),
	];
}

export function yearTiles(
	summary: RangeSummary,
	best: { month: Date; percent: number | null } | null,
	{ oneHabit }: TileContext,
	firstLogDate: Date | null,
): StatTileData[] {
	const since = firstLogDate
		? stats.since(format(firstLogDate, "d MMM"))
		: stats.thisYear;
	if (oneHabit) {
		return [
			{
				key: "completion",
				label: stats.completion,
				value: rateValue(summary.rate),
				caption: since,
				muted: summary.rate === null,
			},
			{
				key: "longest",
				label: stats.longest,
				value: summary.bestStreak
					? String(summary.bestStreak.days)
					: stats.noValue,
				caption: stats.days,
				muted: !summary.bestStreak,
			},
			{
				key: "freezes",
				label: stats.freezesUsed,
				value: String(summary.freezes.length),
				caption: stats.thisYear,
			},
		];
	}
	return [
		{
			key: "completion",
			label: stats.completion,
			value: rateValue(summary.rate),
			caption: since,
			muted: summary.rate === null,
		},
		streakTile(stats.bestStreak, summary, "days-first"),
		{
			key: "best-month",
			label: stats.bestMonth,
			value: best ? format(best.month, "MMM") : stats.noValue,
			caption:
				best && best.percent !== null
					? stats.bestMonthPercent(best.percent)
					: stats.nothingDone,
			muted: !best,
		},
	];
}

export type InsightCardData = {
	symbol: SFSymbol;
	title: string;
	body: string;
	tone: "warning" | "success" | "neutral";
	/** Slipping only: Change frequency → Edit habit scrolled to Frequency. */
	action?: { label: string; habitId: number };
};

const insightCopy = progressCopy.insight;

function periodWords(kind: RangeKind, previous: Date) {
	if (kind === "week")
		return [insightCopy.thisWeek, insightCopy.lastWeek] as const;
	if (kind === "month")
		return [
			insightCopy.thisMonth,
			insightCopy.inMonth(format(previous, "MMMM")),
		] as const;
	return [insightCopy.thisYear, insightCopy.lastYear] as const;
}

export function insightProps(
	insight: ProgressInsight,
	context: {
		kind: RangeKind;
		previousWindowStart: Date;
		oneHabit: Habit | null;
		currentMonth: { month: Date; percent: number } | null;
	},
): InsightCardData {
	const [now, before] = periodWords(context.kind, context.previousWindowStart);
	switch (insight.kind) {
		case "slipping": {
			const { stats: s, habit } = insight;
			return {
				symbol: "exclamationmark.circle",
				tone: "warning",
				title: insightCopy.slippingTitle(habit.name),
				body: insightCopy.slippingBody(
					s.done,
					s.due,
					s.previousDone,
					s.previousDue,
					now,
					before,
				),
				action: {
					label: insightCopy.changeFrequency,
					habitId: insight.action.habitId,
				},
			};
		}
		case "improved": {
			if (insight.reason === "best-month") {
				const month = format(insight.month, "MMMM");
				const rate =
					insight.percent === 100
						? insightCopy.bestMonthPerfect
						: insightCopy.bestMonthRate(insight.percent);
				const current = context.currentMonth;
				return {
					symbol: "chart.bar",
					tone: "success",
					title: insightCopy.bestMonthTitle(month),
					body: current
						? `${rate} ${insightCopy.bestMonthNow(format(current.month, "MMMM"), current.percent)}`
						: rate,
				};
			}
			const { stats: s, habit } = insight;
			const days = s.done - s.previousDone;
			return {
				symbol: "chart.bar",
				tone: "success",
				title:
					days > 0
						? insightCopy.upDays(habit.name, days)
						: insightCopy.upPoints(habit.name, s.deltaPoints ?? 0),
				body: insightCopy.slippingBody(
					s.done,
					s.due,
					s.previousDone,
					s.previousDue,
					now,
					before,
				),
			};
		}
		case "nothing-to-fix":
			return {
				symbol: "checkmark.circle",
				tone: insight.tone === "positive" ? "success" : "neutral",
				title: insightCopy.nothingTitle,
				body:
					insight.reason === "perfect"
						? insightCopy.perfectBody
						: context.oneHabit
							? insightCopy.steadyOne(context.oneHabit.name)
							: insightCopy.steadyBody,
			};
	}
}

export function unlockProps(kind: RangeKind, unlock: ProgressUnlock) {
	const copy = progressCopy.unlock;
	const days = unlock.remainingDays;
	return {
		title:
			kind === "week"
				? copy.weekTitle(days)
				: kind === "month"
					? copy.monthTitle(days)
					: copy.yearTitle(days),
		body:
			kind === "week"
				? copy.weekBody(unlock.loggedDays)
				: kind === "month"
					? copy.monthBody
					: copy.yearBody,
		progress: unlock.progress,
		progressLabel: copy.progress(unlock.loggedDays, unlock.neededDays),
	};
}

export function oneHabitSubline(habit: Habit): string {
	const schedule =
		habit.frequency.type === "daily"
			? progressCopy.daily
			: scheduleLabel(habit);
	return progressCopy.week.onlyHabit(schedule);
}
