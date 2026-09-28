import type { Frequency } from "../types";
import type { FrequencyStrategy } from "./frequency-strategy";

/** Due every day, no exceptions. */
export function createDailyFrequency(
	_frequency: Extract<Frequency, { type: "daily" }>,
): FrequencyStrategy {
	return {
		isDueOn: () => true,
		wasScheduledOn: () => true,
		canFallOn: () => true,
	};
}
