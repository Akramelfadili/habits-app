import { pluralise } from "@/utils/format";

/** Manage Categories copy (HAB-25) — docs/mockups/hab-25-f3a–f3c.png. */

export const BUILT_IN_TAG = "Built-in";

/** Live habit count — archived habits included; zero reads "Not used". */
export function habitCountLabel(habitCount: number): string {
	if (habitCount === 0) return "Not used";
	return pluralise(habitCount, "habit");
}
