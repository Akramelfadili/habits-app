import { format, isSameDay } from "date-fns";
import type { DayRange } from "../types";
import type { FrequencyStrategy } from "./frequency-strategy";

const DATE_FORMAT = "yyyy-MM-dd";

/** Far enough ahead that an open pause (still archived) covers every real day. */
export const OPEN_PAUSE_END = "9999-12-31";

function isPaused(date: Date, pauses: readonly DayRange[]): boolean {
	const day = format(date, DATE_FORMAT);
	return pauses.some((pause) => day >= pause.from && day <= pause.to);
}

/**
 * Decorates any frequency strategy with a habit's archive periods (HAB-13):
 * a paused day is never due, and looking back it only "was scheduled" if it
 * was actually completed. So a day logged before archiving still extends the
 * streak, while the blank days in between neither extend nor break it — a
 * restored habit resumes from the streak it was archived with. Outside a
 * pause, the wrapped strategy decides everything.
 */
export function withPauses(
	strategy: FrequencyStrategy,
	pauses: readonly DayRange[],
): FrequencyStrategy {
	if (pauses.length === 0) return strategy;
	return {
		canFallOn: (weekday) => strategy.canFallOn(weekday),
		isDueOn: (date, context) =>
			!isPaused(date, pauses) && strategy.isDueOn(date, context),
		wasScheduledOn: (date, context) =>
			isPaused(date, pauses)
				? context.completedDates.some((completed) => isSameDay(completed, date))
				: strategy.wasScheduledOn(date, context),
	};
}
