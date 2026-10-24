import { addDays, endOfWeek, isAfter, startOfDay } from "date-fns";
import { WEEK_STARTS_ON } from "../constants";
import type { Frequency } from "../types";
import {
	completedDaysInWeek,
	completionIndex,
	completionTimesInWeek,
	dayKeyTime,
} from "./completion-index";
import type { FrequencyStrategy } from "./frequency-strategy";

/**
 * Due every day until the weekly target is met, then hidden for the rest of the
 * (Mon–Sun) week. Only completions *before* `date` count, so the day the target
 * is hit still shows the habit (and it can still be un-checked); from the next
 * day it's gone until Monday.
 *
 * Looking back, though, "due" overstates what was owed: a 3x/week habit done
 * Mon/Wed/Fri was never really scheduled on Tuesday. So for history, a
 * completed day was scheduled, and an uncompleted one only counts as missed
 * once the week's remaining open days can no longer cover what's still
 * needed — e.g. a finished week with 1 of 3 logged has exactly 2 missed days
 * (its last two open ones), not 6.
 */
export function createPerWeekFrequency(
	frequency: Extract<Frequency, { type: "per-week" }>,
): FrequencyStrategy {
	return {
		// Any day of the week can be one of the X — which ones is up to the user.
		canFallOn: () => true,
		// Completions are bucketed by week once per history (completion-index.ts),
		// so each call reads one week instead of scanning every completion.
		isDueOn: (date, { completedDates }) => {
			const dayStart = startOfDay(date).getTime();
			let completedEarlierThisWeek = 0;
			for (const time of completionTimesInWeek(
				completionIndex(completedDates),
				date,
			)) {
				if (time < dayStart) completedEarlierThisWeek += 1;
			}
			return completedEarlierThisWeek < frequency.timesPerWeek;
		},
		wasScheduledOn: (date, { completedDates }) => {
			const completedDays = completedDaysInWeek(
				completionIndex(completedDates),
				date,
			);
			const isCompleted = (day: Date) => completedDays.has(dayKeyTime(day));
			if (isCompleted(date)) return true;

			const stillNeeded = frequency.timesPerWeek - completedDays.size;
			if (stillNeeded <= 0) return false;

			const weekEnd = endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
			let openDaysAfter = 0;
			for (
				let day = addDays(startOfDay(date), 1);
				!isAfter(day, weekEnd);
				day = addDays(day, 1)
			) {
				if (!isCompleted(day)) openDaysAfter += 1;
			}
			return openDaysAfter < stillNeeded;
		},
	};
}
