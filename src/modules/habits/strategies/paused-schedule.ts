import { addDays, parseISO } from "date-fns";
import { toDayKey } from "@/utils/day-key";
import type { DayRange } from "../types";
import { completionIndex, dayKeyTime } from "./completion-index";
import type { FrequencyStrategy } from "./frequency-strategy";

/** Far enough ahead that an open pause (still archived) covers every real day. */
export const OPEN_PAUSE_END = "9999-12-31";

export function isPausedOn(date: Date, pauses: readonly DayRange[]): boolean {
	const day = toDayKey(date);
	return pauses.some((pause) => day >= pause.from && day <= pause.to);
}

/**
 * The days a streak starts over: the day after each closed pause, i.e. each restore day. A
 * streak never counts back past one, and the longest streak's run resets there, so no streak is
 * invented across an archived gap. Sorted ascending, "yyyy-MM-dd".
 */
export function restartDays(pauses: readonly DayRange[]): string[] {
	return pauses.map((pause) => toDayKey(addDays(parseISO(pause.to), 1))).sort();
}

/**
 * Decorates any frequency strategy with a habit's archive periods: a paused day is never due,
 * and looking back it only "was scheduled" if it was actually completed. So a day logged before
 * archiving still extends the streak, while the blank days in between are never read as missed.
 * The streak itself does *not* bridge the gap (see `restartDays`). Outside a pause, the wrapped
 * strategy decides everything.
 */
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
