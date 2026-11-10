import { useMemo } from "react";
import { useToday } from "@/lib/today/use-today";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { scopeHabits } from "../domain/day-grid";
import {
	buildDayDetail,
	type DayDetail,
	dayEntrySpan,
} from "../domain/progress-grid";
import {
	useEntriesInRange,
	useLoggedDays,
} from "../repositories/entry-repository";
import { useFrozenDaysInRange } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";

export type DayDetailView =
	| { loaded: false; detail: null }
	| { loaded: true; detail: DayDetail };

// Reads only that date's Monday-Sunday week: an x-per-week habit's day depends on its week.
export function useDayDetailQueries(
	date: Date | null = null,
	habitId: number | null = null,
): DayDetailView {
	const today = useToday();
	const { habits, loaded } = useHabitsList();
	const logged = useLoggedDays();
	const dayKey = toDayKey(date ?? today);
	const span = dayEntrySpan(fromDayKey(dayKey));
	const entries = useEntriesInRange(span.start, span.end);
	const frozenDays = useFrozenDaysInRange(span.start, span.end);

	return useMemo((): DayDetailView => {
		if (!loaded || !logged.loaded) return { loaded: false, detail: null };
		return {
			loaded: true,
			detail: buildDayDetail({
				habits: scopeHabits(habits, habitId),
				entries,
				frozenDays,
				today,
				date: fromDayKey(dayKey),
				nothingLogged: logged.count === 0,
			}),
		};
	}, [
		loaded,
		logged.loaded,
		logged.count,
		habits,
		habitId,
		entries,
		frozenDays,
		today,
		dayKey,
	]);
}
