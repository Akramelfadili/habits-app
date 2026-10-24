import { addMonths, format, startOfMonth } from "date-fns";
import { formatDateRange, formatDayMonth, pluralise } from "@/utils/format";
import { FREEZE_POOL_SIZE } from "../constants";
import type { MonthlyInsight, PatternCause } from "../domain/monthly-insights";
import {
	MONTH_UNLOCK_DAYS,
	type MonthlyHabitRow,
	type MonthlySummary,
	type MonthUnlock,
	type MonthWindow,
} from "../domain/monthly-summary";

const WEEKDAY_NAMES = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];

export function weekdayName(weekday: number): string {
	return WEEKDAY_NAMES[weekday - 1];
}

/** "1 – 31 August". */
export function monthRangeLabel({ start, end }: MonthWindow): string {
	return formatDateRange(start, end, { long: true });
}

export function percent(rate: number | null): string {
	return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

/** The three stat tiles — Completed / Perfect days / Freezes. */
export function monthlyTiles(summary: MonthlySummary) {
	return {
		completed: {
			value: percent(summary.rate),
			caption: `${summary.completed} of ${summary.scheduled}`,
		},
		perfect: {
			value: String(summary.perfectDays),
			caption: `of ${summary.countedDays}`,
		},
		freezes: {
			value: String(summary.freezeDates.length),
			caption: `of ${FREEZE_POOL_SIZE} used`,
		},
	};
}

/** "vs. July" — the column header over the delta labels. */
export function previousMonthLabel(summary: MonthlySummary): string {
	return `vs. ${format(summary.previousMonth.start, "MMMM")}`;
}

/** "Mobility: 97%, up 4 points on last month, weekly trend …" for one element read. */
export function trendRowLabel(row: MonthlyHabitRow): string {
	const delta =
		row.deltaPoints === null
			? ""
			: row.deltaPoints === 0
				? ", unchanged on last month"
				: `, ${row.deltaPoints > 0 ? "up" : "down"} ${Math.abs(row.deltaPoints)} points on last month`;
	return `${row.habit.name}: ${percent(row.rate)}${delta}`;
}

/** Whether a row's trend is the "slipping" sparkline — the habit the slipping card names. */
export function slippingHabitId(summary: MonthlySummary): number | null {
	const insight = summary.insights.find(
		(candidate) => candidate.type === "slipping",
	);
	return insight?.type === "slipping" ? insight.row.habit.id : null;
}

/** "N insights" beside the section title. */
export function insightCountLabel(count: number): string {
	return pluralise(count, "insight");
}

function dayList(dates: Date[]): string {
	const days = dates.map((date) => format(date, "d"));
	const month = format(dates[0], "MMMM");
	if (days.length === 1) return `${days[0]} ${month}`;
	return `${days.slice(0, -1).join(", ")} and ${days[days.length - 1]} ${month}`;
}

/** The freeze card's copy, or null when no freeze was used (no card then). */
export function freezeCardCopy(
	summary: MonthlySummary,
): { title: string; body: string; used: number } | null {
	const used = summary.freezeDates.length;
	if (used === 0) return null;
	const refill = format(
		addMonths(startOfMonth(summary.month.start), 1),
		"d MMMM",
	);
	const title =
		used >= FREEZE_POOL_SIZE
			? "Both freezes used"
			: used === 1
				? "One freeze used"
				: `${used} freezes used`;
	return {
		title,
		body: `${dayList(summary.freezeDates)} · pool refilled ${refill}`,
		used,
	};
}

export function slippingCopy(
	insight: Extract<MonthlyInsight, { type: "slipping" }>,
) {
	const { first, last, row } = insight;
	return {
		title: `${row.habit.name} slipped all month`,
		body: `Down week over week — ${first.completed} of ${first.scheduled} in the first, ${last.completed} of ${last.scheduled} in the last.`,
	};
}

export function improvedCopy(
	insight: Extract<MonthlyInsight, { type: "improved" }>,
	summary: MonthlySummary,
) {
	return {
		title: `${insight.row.habit.name} is sticking`,
		body: `${percent(insight.row.rate)}, up ${insight.points} points on ${format(summary.previousMonth.start, "MMMM")}.`,
	};
}

function causeSentence(cause: PatternCause): string {
	return ` ${cause.misses} of ${cause.weekendMisses} weekend misses are ${cause.habit.name} on ${weekdayName(cause.weekday)}s.`;
}

export function patternCopy(
	insight: Extract<MonthlyInsight, { type: "pattern" }>,
) {
	const rates = `Weekdays ${percent(insight.weekdayRate)}, weekends ${percent(insight.weekendRate)}.`;
	return {
		title: "Weekends are the gap",
		body: insight.cause ? rates + causeSentence(insight.cause) : rates,
		/** Only a single cause earns a tap target (spec: no invented action). */
		actionLabel: insight.cause
			? `Add a ${weekdayName(insight.cause.weekday)} reminder →`
			: null,
	};
}

/** The too-early card (C6). */
export function unlockCopy(unlock: MonthUnlock) {
	return {
		title: `Monthly view unlocks on ${formatDayMonth(unlock.unlockDate)}`,
		body: `You've tracked for ${pluralise(unlock.trackedDays, "day")}. A month needs a full month — otherwise one rough week looks like a pattern.`,
		progress: unlock.trackedDays / MONTH_UNLOCK_DAYS,
		progressLabel: `${unlock.trackedDays} of ${MONTH_UNLOCK_DAYS} days`,
		remainingLabel: `${MONTH_UNLOCK_DAYS - unlock.trackedDays} to go`,
	};
}

/** Today's menu row for this screen — "1 – 31 August · 80% done" (HAB-14). */
export function monthlyMenuSubline(summary: MonthlySummary): string {
	return `${monthRangeLabel(summary.month)} · ${percent(summary.rate)} done`;
}

/** Why the menu row can't open yet — "Unlocks 4 October". */
export function monthlyMenuLockedReason(unlock: MonthUnlock): string {
	return `Unlocks ${formatDayMonth(unlock.unlockDate)}`;
}
