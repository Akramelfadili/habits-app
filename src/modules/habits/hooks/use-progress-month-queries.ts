import { useMemo } from "react";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import {
	buildMonthCalendar,
	type MonthCalendar,
} from "../domain/progress-grid";
import { progressInsights } from "../domain/progress-insights";
import {
	buildRangeSummary,
	rangeEntrySpan,
	rangeWindowFor,
} from "../domain/range-summary";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useFrozenDaysInRange } from "../repositories/frozen-day-repository";
import {
	type ProgressOptions,
	type ProgressView,
	useProgressBaseQueries,
} from "./use-progress-base-queries";

export type ProgressMonthView = ProgressView<MonthCalendar>;

/**
 * Progress · Month (HAB-36): the calendar month containing `month` — the
 * current month by default (D15; Year opens a specific one). The calendar of
 * day levels, and once 7 days of logs exist the month's stats, per-habit
 * rates and insights. Reads the month and the month before it (Monday-aligned).
 */
export function useProgressMonthQueries({
	habitId = null,
	month = null,
}: ProgressOptions & { month?: Date | null } = {}): ProgressMonthView {
	const base = useProgressBaseQueries(habitId);
	const { today } = base;
	const monthKey = toDayKey(rangeWindowFor("month", month ?? today).start);
	const span = rangeEntrySpan(
		"month",
		rangeWindowFor("month", fromDayKey(monthKey)),
	);
	const entries = useEntriesInRange(span.start, span.end);
	const frozenDays = useFrozenDaysInRange(span.start, span.end);

	return useMemo((): ProgressMonthView => {
		if (!base.loaded) return { state: "loading" };
		if (base.gate === "no-habits") return { state: "no-habits" };
		const window = rangeWindowFor("month", fromDayKey(monthKey));
		const grid = buildMonthCalendar({
			habits: base.gridHabits,
			entries,
			frozenDays,
			today,
			month: window,
			nothingLogged: base.nothingLogged,
		});
		const { unlock } = base;
		if (base.gate !== "ready") return { state: base.gate, unlock, grid };
		const summary = buildRangeSummary({
			kind: "month",
			habits: base.scoped,
			entries,
			frozenDays,
			today,
			window,
		});
		return {
			state: "ready",
			unlock,
			grid,
			summary,
			insights: progressInsights({ summary, unlocked: true, today }),
			freezesLeft: base.freezesLeft,
		};
	}, [base, monthKey, entries, frozenDays, today]);
}
