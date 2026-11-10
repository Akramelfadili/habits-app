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

export function useOffScheduleQueries(day: Date): {
	eligibleHabits: Habit[];
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
