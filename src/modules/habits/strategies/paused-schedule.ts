import { addDays, parseISO } from "date-fns";
import { toDayKey } from "@/utils/day-key";
import type { DayRange } from "../types";
import { completionIndex, dayKeyTime } from "./completion-index";
import type { FrequencyStrategy } from "./frequency-strategy";

export const OPEN_PAUSE_END = "9999-12-31";

export function isPausedOn(date: Date, pauses: readonly DayRange[]): boolean {
	const day = toDayKey(date);
	return pauses.some((pause) => day >= pause.from && day <= pause.to);
}

// A streak never counts back past a restore day, so none is invented across an archived gap.
export function restartDays(pauses: readonly DayRange[]): string[] {
	return pauses.map((pause) => toDayKey(addDays(parseISO(pause.to), 1))).sort();
}

// A paused day is never due, and looking back only "was scheduled" if completed: a day logged
// before archiving still extends the streak, blank days in between are never missed. The streak
// does not bridge the gap (see `restartDays`).
export function withPauses(
	strategy: FrequencyStrategy,
	pauses: readonly DayRange[],
): FrequencyStrategy {
	if (pauses.length === 0) return strategy;
	return {
		canFallOn: (weekday) => strategy.canFallOn(weekday),
		isDueOn: (date, context) =>
			!isPausedOn(date, pauses) && strategy.isDueOn(date, context),
		wasScheduledOn: (date, context) =>
			isPausedOn(date, pauses)
				? completionIndex(context.completedDates).days.has(dayKeyTime(date))
				: strategy.wasScheduledOn(date, context),
	};
}
