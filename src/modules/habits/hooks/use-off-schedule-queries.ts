import { endOfWeek, startOfWeek } from "date-fns";
import { WEEK_STARTS_ON } from "../constants";
import {
	type OffScheduleLog,
	offScheduleCandidates,
	offScheduleLogsOn,
} from "../domain/off-schedule";
import { existedOn } from "../domain/selected-day";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useActiveHabits } from "../repositories/habit-repository";
import type { Habit } from "../types";

/**
 * What the rest-day picker (HAB-18) and the rest-day list read, for the day
 * Today shows (`day`): on a past day, a habit that hadn't started or was paused
 * isn't offered.
 */
export function useOffScheduleQueries(day: Date): {
	/** Habits the picker offers — no Break or archived habits. */
	eligibleHabits: Habit[];
	/** The day's bonus logs, for the rest-day list and the picker's "logged" rows. */
	loggedToday: OffScheduleLog[];
} {
	const { habits } = useActiveHabits();
	const entries = useEntriesInRange(
		startOfWeek(day, { weekStartsOn: WEEK_STARTS_ON }),
		endOfWeek(day, { weekStartsOn: WEEK_STARTS_ON }),
	);

	return {
		eligibleHabits: offScheduleCandidates(habits).filter((habit) =>
			existedOn(habit, day),
		),
		loggedToday: offScheduleLogsOn(habits, entries, day),
	};
}
