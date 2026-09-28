import { format } from "date-fns";
import type { Frequency, FrequencyType, Habit, IsoWeekday } from "../types";
import { createDailyFrequency } from "./daily-frequency";
import { OPEN_PAUSE_END, withPauses } from "./paused-schedule";
import { createPerWeekFrequency } from "./per-week-frequency";
import { createSpecificWeekdaysFrequency } from "./specific-weekdays-frequency";

export type FrequencyContext = {
	/** Days this habit was completed on — only the date part matters. */
	completedDates: readonly Date[];
};

/** One scheduling rule per frequency type (HAB-02) — see docs/app-architecture.md. */
export interface FrequencyStrategy {
	/** Whether the habit asks for attention on `date` — drives Today (HAB-02, HAB-03). */
	isDueOn(date: Date, context: FrequencyContext): boolean;
	/**
	 * Looking back, whether `date` owed a completion — drives history (streaks,
	 * the 90-day rate, the heatmap; HAB-08, HAB-09). Differs from `isDueOn`
	 * only where a rule's forward-looking "due" isn't the same as a day that
	 * can actually be missed (e.g. X-per-week).
	 */
	wasScheduledOn(date: Date, context: FrequencyContext): boolean;
	/**
	 * Whether the habit can ever be due on this weekday, independent of any
	 * completion history — a reminder (HAB-12) set for a weekday where this is
	 * false would fire for nothing, so it's flagged and never scheduled.
	 */
	canFallOn(weekday: IsoWeekday): boolean;
}

type StrategyFactories = {
	[T in FrequencyType]: (
		frequency: Extract<Frequency, { type: T }>,
	) => FrequencyStrategy;
};

/** Adding a frequency type = one new strategy file + one entry here, no branching. */
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

/**
 * The strategy for a real habit: its frequency rule, decorated with its
 * archive periods (HAB-13) — the past ones plus, while archived, an open one
 * from the archive day on. History, streaks and Today all go through this,
 * so none of them count archived days as missed.
 */
export function getHabitStrategy(habit: SchedulableHabit): FrequencyStrategy {
	const pauses = habit.archivedAt
		? [
				...habit.pauses,
				{ from: format(habit.archivedAt, "yyyy-MM-dd"), to: OPEN_PAUSE_END },
			]
		: habit.pauses;
	return withPauses(getFrequencyStrategy(habit.frequency), pauses);
}

/** Whether `habit` can ever be due on `weekday` — see `FrequencyStrategy.canFallOn`. */
export function canHabitFallOn(
	habit: Pick<Habit, "frequency">,
	weekday: IsoWeekday,
): boolean {
	return getFrequencyStrategy(habit.frequency).canFallOn(weekday);
}

/** Whether `habit` should ask for attention on `date`, given its completion history. */
export function isHabitDueOn(
	habit: SchedulableHabit,
	date: Date,
	completedDates: readonly Date[] = [],
): boolean {
	return getHabitStrategy(habit).isDueOn(date, {
		completedDates,
	});
}
