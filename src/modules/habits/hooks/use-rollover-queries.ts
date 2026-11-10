import { subDays } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { toDayKey } from "@/utils/day-key";
import { weekWindow } from "@/utils/week-window";
import { type DaySummary, daySummary } from "../domain/day-summary";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useActiveHabits } from "../repositories/habit-repository";

/** The day that just closed and how it ended. */
export type RolloverNotice = { day: Date; summary: DaySummary };

/**
 * When `today` moves on while Today stays mounted (midnight passing with the app open, or a
 * return to the foreground on a later day): the day that closed and its tally, until the person
 * dismisses it. The first `today` is the starting point, never a rollover. `dismiss` only hides
 * the notice (as `showToday` only moves the selection), it writes nothing.
 */
export function useRolloverQueries(today: Date): {
	notice: RolloverNotice | null;
	dismiss: () => void;
} {
	const seen = useRef(toDayKey(today));
	const [closed, setClosed] = useState<Date | null>(null);

	useEffect(() => {
		const key = toDayKey(today);
		if (key === seen.current) return;
		seen.current = key;
		setClosed(subDays(today, 1));
	}, [today]);

	// The tally needs the closed day's whole week; read it only once there is a notice.
	const anchor = closed ?? today;
	const { habits } = useActiveHabits();
	const week = weekWindow(anchor);
	const entries = useEntriesInRange(week.start, week.end);

	return {
		notice: closed
			? { day: closed, summary: daySummary(habits, entries, closed) }
			: null,
		dismiss: () => setClosed(null),
	};
}
