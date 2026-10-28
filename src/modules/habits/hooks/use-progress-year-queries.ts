import { setYear, startOfYear } from "date-fns";
import { useMemo } from "react";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { progressInsights } from "../domain/progress-insights";
import {
	buildRangeSummary,
	rangeEntrySpan,
	rangeWindowFor,
} from "../domain/range-summary";
import { buildYearMap, type YearMap } from "../domain/year-map";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useFrozenDaysInRange } from "../repositories/frozen-day-repository";
import {
	type ProgressOptions,
	type ProgressView,
	useProgressBaseQueries,
} from "./use-progress-base-queries";

export type ProgressYearView = ProgressView<YearMap>;

/**
 * Progress · Year (HAB-37): a level 0–3 for every day of the calendar year
 * `year` (default the current one), all habits or one, in three 4-month bands,
 * with the month tiles, best month and the month list for the VoiceOver / AX
 * fallback. Reads the year and the year before it (for "+N pts").
 */
export function useProgressYearQueries({
	habitId = null,
	year = null,
}: ProgressOptions & { year?: number | null } = {}): ProgressYearView {
	const base = useProgressBaseQueries(habitId);
	const { today } = base;
	const yearStart = startOfYear(year === null ? today : setYear(today, year));
	const yearKey = toDayKey(yearStart);
	const span = rangeEntrySpan("year", rangeWindowFor("year", yearStart));
	const entries = useEntriesInRange(span.start, span.end);
	const frozenDays = useFrozenDaysInRange(span.start, span.end);

	return useMemo((): ProgressYearView => {
		if (!base.loaded) return { state: "loading" };
		if (base.gate === "no-habits") return { state: "no-habits" };
		const window = rangeWindowFor("year", fromDayKey(yearKey));
		const grid = buildYearMap({
			habits: base.gridHabits,
			entries,
			frozenDays,
			today,
			year: window,
			nothingLogged: base.nothingLogged,
		});
		const { unlock } = base;
		if (base.gate !== "ready") return { state: base.gate, unlock, grid };
		const summary = buildRangeSummary({
			kind: "year",
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
			insights: progressInsights({
				summary,
				unlocked: true,
				today,
				firstDay: base.firstDay,
				bestMonth: grid.bestMonth
					? {
							month: grid.bestMonth.month,
							percent: grid.bestMonth.percent ?? 0,
						}
					: null,
			}),
			freezesLeft: base.freezesLeft,
		};
	}, [base, yearKey, entries, frozenDays, today]);
}
