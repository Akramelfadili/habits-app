import { format, isSameYear, max } from "date-fns";
import type { HeatmapCellState } from "@/components/ui/composite/heatmap-cell";
import {
	formatCount,
	formatDateRange,
	formatDayMonth,
	noun,
	pluralise,
} from "@/utils/format";
import type { YearlyInsight } from "../domain/yearly-insights";
import type {
	YearlyHabitRow,
	YearlySummary,
	YearMonthCell,
	YearUnlock,
} from "../domain/yearly-summary";
import { percent } from "./monthly-summary-helpers";

/** The axis under the chart, and the strip's "J — D" caption. */
export const MONTH_INITIALS = [
	"J",
	"F",
	"M",
	"A",
	"M",
	"J",
	"J",
	"A",
	"S",
	"O",
	"N",
	"D",
];

const monthName = (cell: YearMonthCell) => format(cell.month, "MMMM");

/** "3 March – 16 September" — from the first day (or 1 Jan, if history is older) to today. */
export function yearRangeLabel(
	summary: YearlySummary,
	firstDay: Date,
	today: Date,
): string {
	const from = max([firstDay, summary.year.start]);
	return formatDateRange(from, today, { long: true });
}

export function yearTitle(summary: YearlySummary): string {
	return `${format(summary.year.start, "yyyy")} so far`;
}

/** The three stat tiles — Logged / Overall / Longest. */
export function yearlyTiles(summary: YearlySummary) {
	const { longest } = summary;
	return {
		logged: { value: formatCount(summary.logged), caption: "entries" },
		overall: { value: percent(summary.rate), caption: "of scheduled" },
		longest: {
			value: String(longest.days),
			caption: longest.endedOn
				? `${noun(longest.days, "day")} · ${format(longest.endedOn, "MMMM")}`
				: "days",
		},
	};
}

/** The chart card's trailing note — "Best: June · 91%", or null until a best month exists. */
export function bestMonthLabel(summary: YearlySummary): string | null {
	const { best } = summary;
	return best ? `Best: ${monthName(best)} · ${percent(best.rate)}` : null;
}

/** One cell of the year strip (NEW-16): dashed outside the history, otherwise shaded by the month's rate. */
export function stripCellState(cell: YearMonthCell): HeatmapCellState {
	if (cell.kind === "before-start" || cell.kind === "future") {
		return { kind: "outside" };
	}
	if (cell.kind === "none" || cell.rate === null) {
		return { kind: "not-scheduled" };
	}
	if (cell.rate === 0) return { kind: "missed" };
	if (cell.rate >= 0.85) return { kind: "level", level: 3 };
	return { kind: "level", level: cell.rate >= 0.5 ? 2 : 1 };
}

const CELL_NOTE: Record<YearMonthCell["kind"], string> = {
	"before-start": "before this habit started",
	future: "not reached yet",
	none: "nothing scheduled",
	counted: "",
};

export function monthCellLabel(cell: YearMonthCell): string {
	if (cell.kind === "counted") {
		const progress = cell.current ? ", so far" : "";
		return `${monthName(cell)}: ${percent(cell.rate)}${progress}`;
	}
	return `${monthName(cell)}: ${CELL_NOTE[cell.kind]}`;
}

/** "Read by month: …" — one element read for a habit's strip. */
export function stripRowLabel(row: YearlyHabitRow): string {
	return `${row.habit.name} by month, ${percent(row.rate)} overall`;
}

/** The chart as one description for a screen reader. */
export function chartLabel(summary: YearlySummary): string {
	return `Completion by month: ${summary.months
		.filter((cell) => cell.kind === "counted")
		.map(monthCellLabel)
		.join(", ")}`;
}

/** "N insights" beside the section title. */
export { insightCountLabel } from "./monthly-summary-helpers";

function monthList(cells: readonly YearMonthCell[]): string {
	const names = cells.map(monthName);
	if (names.length <= 1) return names.join("");
	return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const words = ["zero", "one", "two", "three", "four", "five", "six", "seven"];
const word = (count: number) => words[count] ?? String(count);

export function bestMonthCopy(
	insight: Extract<YearlyInsight, { type: "best-month" }>,
) {
	const name = monthName(insight.cell);
	const rate = `${percent(insight.cell.rate)} across every habit`;
	return {
		title: `${name} was your best month`,
		body: insight.streak
			? `${rate}, and the year's longest streak — ${insight.streak.days} days of ${insight.streak.habit.name}.`
			: `${rate}.`,
	};
}

export function stuckCopy(insight: Extract<YearlyInsight, { type: "stuck" }>) {
	return {
		title: `${insight.row.habit.name} stuck`,
		body: `${capitalize(word(insight.months))} ${noun(insight.months, "month")} in a row above 85%. It isn't effort any more.`,
	};
}

export function neverStuckCopy(
	insight: Extract<YearlyInsight, { type: "never-stuck" }>,
) {
	const { row, underMonths, judgedMonths } = insight;
	return {
		title: `${row.habit.name} never stuck`,
		body: `Under 50% in ${word(underMonths)} of ${word(judgedMonths)} ${noun(judgedMonths, "month")}. Worth changing what it is — or archiving it.`,
		actionLabel: `Edit or archive ${row.habit.name} →`,
	};
}

export function seasonalCopy(
	insight: Extract<YearlyInsight, { type: "seasonal" }>,
) {
	const summer = insight.run.every((cell) => {
		const index = cell.month.getMonth();
		return index >= 5 && index <= 7;
	});
	return {
		title: summer ? "Summer dip" : "Seasonal dip",
		body: `${monthList(insight.run)} ran at least ${insight.points} points below ${monthName(insight.best)}.`,
	};
}

/** The "early" card: unlocked, but no month of this year has finished. */
export function earlyCopy(summary: YearlySummary, today: Date) {
	const days = Math.max(1, Number(format(today, "d")));
	return {
		title: "Too early in the year to call",
		body: `${format(summary.year.start, "yyyy")} is ${days === 1 ? "a day" : pluralise(days, "day")} old. Insights appear once a month has finished.`,
	};
}

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The too-early card (C7). */
export function unlockCopy(unlock: YearUnlock) {
	return {
		title: "Year trends start after 3 months",
		body: `You're ${pluralise(unlock.trackedDays, "day")} in. The chart fills as each month completes; the first yearly insights arrive in ${format(unlock.unlockDate, "MMMM")}.`,
		progress: unlock.trackedDays / unlock.totalDays,
		progressLabel: `${unlock.trackedDays} of ${unlock.totalDays} days`,
		remainingLabel: `from ${formatDayMonth(unlock.unlockDate)}`,
	};
}

/** Today's menu row — "2026 so far · since 3 March" (HAB-14); needs only the habits, never the year's entries. */
export function yearlyMenuSubline(firstDay: Date, today: Date): string {
	const base = `${format(today, "yyyy")} so far`;
	return isSameYear(firstDay, today)
		? `${base} · since ${formatDayMonth(firstDay)}`
		: base;
}

/** Why the menu row can't open yet — "Unlocks 4 December". */
export function yearlyMenuLockedReason(unlock: YearUnlock): string {
	return `Unlocks ${formatDayMonth(unlock.unlockDate)}`;
}
