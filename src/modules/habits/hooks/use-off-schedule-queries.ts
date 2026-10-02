import { endOfWeek, startOfDay, startOfWeek } from "date-fns";
import { WEEK_STARTS_ON } from "../constants";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useActiveHabits } from "../repositories/habit-repository";
import {
	type OffScheduleLog,
	offScheduleCandidates,
	offScheduleLogsOn,
} from "../services/off-schedule";
import type { Habit } from "../types";

/** What the rest-day picker (HAB-18) and the rest-day list read. */
export function useOffScheduleQueries(): {
	/** Habits the picker offers — no Break or archived habits. */
	eligibleHabits: Habit[];
	/** Today's bonus logs, for the rest-day list and the picker's "logged" rows. */
	loggedToday: OffScheduleLog[];
} {
	const habits = useActiveHabits();
	const today = startOfDay(new Date());
	const entries = useEntriesInRange(
		startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON }),
		endOfWeek(today, { weekStartsOn: WEEK_STARTS_ON }),
	);

	return {
		eligibleHabits: offScheduleCandidates(habits),
		loggedToday: offScheduleLogsOn(habits, entries, today),
	};
}
