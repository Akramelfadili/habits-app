import { useMemo } from "react";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { buildWeekMatrix, type WeekMatrix } from "../domain/progress-grid";
import { progressInsights } from "../domain/progress-insights";
import {
	buildRangeSummary,
	rangeEntrySpan,
	rangeWindowFor,
} from "../domain/range-summary";
import {
	useAllEntries,
	useEntriesInRange,
} from "../repositories/entry-repository";
import {
	useFrozenDays,
	useFrozenDaysInRange,
} from "../repositories/frozen-day-repository";
import {
	type ProgressOptions,
	type ProgressView,
	useProgressBaseQueries,
} from "./use-progress-base-queries";

export type ProgressWeekView = ProgressView<WeekMatrix>;

// Reads only the week and the one before it, except the streak tile: it reaches back past the week, so it reads the whole log.
export function useProgressWeekQueries({
	habitId = null,
	anchor = null,
}: ProgressOptions & { anchor?: Date | null } = {}): ProgressWeekView {
	const base = useProgressBaseQueries(habitId);
	const { today } = base;
	const weekKey = toDayKey(rangeWindowFor("week", anchor ?? today).start);
	const span = rangeEntrySpan(
		"week",
		rangeWindowFor("week", fromDayKey(weekKey)),
	);
	const entries = useEntriesInRange(span.start, span.end);
	const frozenDays = useFrozenDaysInRange(span.start, span.end);
	const allEntries = useAllEntries();
	const allFrozenDays = useFrozenDays();

	return useMemo((): ProgressWeekView => {
		if (!base.loaded) return { state: "loading" };
		if (base.gate === "no-habits") return { state: "no-habits" };
		const week = rangeWindowFor("week", fromDayKey(weekKey));
		const grid = buildWeekMatrix({
			habits: base.gridHabits,
			entries,
			frozenDays,
			today,
			week,
			nothingLogged: base.nothingLogged,
		});
		const { unlock } = base;
		if (base.gate !== "ready") return { state: base.gate, unlock, grid };
		const summary = buildRangeSummary({
			kind: "week",
			habits: base.scoped,
			entries,
			frozenDays,
			today,
			window: week,
			streakHistory: { entries: allEntries, frozenDays: allFrozenDays },
		});
		return {
			state: "ready",
			unlock,
			grid,
			summary,
			insights: progressInsights({ summary, unlocked: true, today }),
			freezesLeft: base.freezesLeft,
		};
	}, [base, weekKey, entries, frozenDays, allEntries, allFrozenDays, today]);
}
