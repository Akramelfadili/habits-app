import { isBefore, isSameWeek, startOfDay } from "date-fns";
import { WEEK_STARTS_ON } from "../constants";
import type { Frequency } from "../types";
import type { FrequencyStrategy } from "./frequency-strategy";

/**
 * Due every day until the weekly target is met, then hidden for the rest of the
 * (Mon–Sun) week. Only completions *before* `date` count, so the day the target
 * is hit still shows the habit (and it can still be un-checked); from the next
 * day it's gone until Monday.
 */
export function createPerWeekFrequency(
	frequency: Extract<Frequency, { type: "per-week" }>,
): FrequencyStrategy {
	return {
		isDueOn: (date, { completedDates }) => {
			const dayStart = startOfDay(date);
			const completedEarlierThisWeek = completedDates.filter(
				(completed) =>
					isSameWeek(completed, date, { weekStartsOn: WEEK_STARTS_ON }) &&
					isBefore(completed, dayStart),
			).length;
			return completedEarlierThisWeek < frequency.timesPerWeek;
		},
	};
}
