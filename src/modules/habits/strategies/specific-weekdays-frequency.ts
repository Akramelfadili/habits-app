import { getISODay } from "date-fns";
import type { Frequency } from "../types";
import type { FrequencyStrategy } from "./frequency-strategy";

export function createSpecificWeekdaysFrequency(
	frequency: Extract<Frequency, { type: "weekdays" }>,
): FrequencyStrategy {
	const days = new Set<number>(frequency.days);
	const isDueOn = (date: Date) => days.has(getISODay(date));
	return {
		isDueOn,
		wasScheduledOn: isDueOn,
		canFallOn: (weekday) => days.has(weekday),
	};
}
