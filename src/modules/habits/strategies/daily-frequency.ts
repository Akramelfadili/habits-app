import type { Frequency } from "../types";
import type { FrequencyStrategy } from "./frequency-strategy";

export function createDailyFrequency(
	_frequency: Extract<Frequency, { type: "daily" }>,
): FrequencyStrategy {
	return {
		isDueOn: () => true,
		wasScheduledOn: () => true,
		canFallOn: () => true,
	};
}
