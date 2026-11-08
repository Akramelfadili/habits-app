import { weekWindow } from "@/utils/week-window";
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
	const week = weekWindow(day);
	const entries = useEntriesInRange(week.start, week.end);

	return {
		eligibleHabits: offScheduleCandidates(habits).filter((habit) =>
			existedOn(habit, day),
		),
		loggedToday: offScheduleLogsOn(habits, entries, day),
	};
}
