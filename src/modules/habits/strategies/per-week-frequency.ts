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

// Only completions before `date` count, so the day the target is hit still shows the habit
// (and it can be un-checked). Looking back, "due" overstates what was owed: a completed day was
// scheduled, and an uncompleted one is missed only once the week's remaining open days can no
// longer cover what's needed (1 of 3 logged in a finished week = 2 missed, not 6).
export function createPerWeekFrequency(
	frequency: Extract<Frequency, { type: "per-week" }>,
): FrequencyStrategy {
	return {
		canFallOn: () => true,
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
