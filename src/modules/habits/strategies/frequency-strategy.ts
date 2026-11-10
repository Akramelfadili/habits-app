import { format } from "date-fns";
import type {
	DayRange,
	Frequency,
	FrequencyType,
	Habit,
	IsoWeekday,
} from "../types";
import { createDailyFrequency } from "./daily-frequency";
import { OPEN_PAUSE_END, withPauses } from "./paused-schedule";
import { createPerWeekFrequency } from "./per-week-frequency";
import { createSpecificWeekdaysFrequency } from "./specific-weekdays-frequency";

export type FrequencyContext = {
	completedDates: readonly Date[];
};

export interface FrequencyStrategy {
	isDueOn(date: Date, context: FrequencyContext): boolean;
	// Differs from `isDueOn` only where forward-looking "due" isn't a day that can actually be
	// missed (e.g. X-per-week).
	wasScheduledOn(date: Date, context: FrequencyContext): boolean;
	// A reminder on a weekday where this is false would fire for nothing, so it's flagged and never scheduled.
	canFallOn(weekday: IsoWeekday): boolean;
}

type StrategyFactories = {
	[T in FrequencyType]: (
		frequency: Extract<Frequency, { type: T }>,
	) => FrequencyStrategy;
};

const STRATEGY_FACTORIES: StrategyFactories = {
	daily: createDailyFrequency,
	weekdays: createSpecificWeekdaysFrequency,
	"per-week": createPerWeekFrequency,
};

export function getFrequencyStrategy(frequency: Frequency): FrequencyStrategy {
	const factory = STRATEGY_FACTORIES[frequency.type] as (
		frequency: Frequency,
	) => FrequencyStrategy;
	return factory(frequency);
}

export type SchedulableHabit = Pick<
	Habit,
	"frequency" | "pauses" | "archivedAt"
>;

// History, streaks and Today all go through this, so none of them count archived days as missed.
export function getHabitStrategy(habit: SchedulableHabit): FrequencyStrategy {
	return withPauses(getFrequencyStrategy(habit.frequency), habitPauses(habit));
}

export function habitPauses(habit: SchedulableHabit): DayRange[] {
	return habit.archivedAt
		? [
				...habit.pauses,
				{ from: format(habit.archivedAt, "yyyy-MM-dd"), to: OPEN_PAUSE_END },
			]
		: habit.pauses;
}

export function canHabitFallOn(
	habit: Pick<Habit, "frequency">,
	weekday: IsoWeekday,
): boolean {
	return getFrequencyStrategy(habit.frequency).canFallOn(weekday);
}

export function isHabitDueOn(
	habit: SchedulableHabit,
	date: Date,
	completedDates: readonly Date[] = [],
): boolean {
	return getHabitStrategy(habit).isDueOn(date, {
		completedDates,
	});
}
