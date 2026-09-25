import { format } from "date-fns";
import type { Entry } from "../types";
import {
	DAY_CLOSED_DUE_TODAY_IDS,
	type FixtureScenario,
} from "./habit-fixtures";

/**
 * Static fake entries backing the web-only repository (`entry-repository.web.ts`).
 * Marks habit #2 ("Read before bed") and #3 ("Glass of water") — both daily,
 * so they're due regardless of which real-world weekday the visual check
 * runs on — already done today, so the Today screen's progress bar and
 * per-group counts render non-zero instead of a flat 0%.
 *
 * `day-closed` instead completes every one of `DAY_CLOSED_DUE_TODAY_IDS`, so
 * the Today screen's Day-closed state (HAB-05) renders; `empty`/`rest-day`
 * have no due-today habits to complete. `quantity-log` logs the quantity
 * fixture habit partway to its target, matching docs/mockups/quantity-log.png
 * exactly (6 of 8), so the sheet screenshot can be compared to it directly.
 *
 * Habit #2 ("Read before bed") is a quantity habit (target 20 pages) — its
 * entry carries `value: 20` (full target) rather than just presence, so it
 * still reads as complete under HAB-07's value-based completion rule and the
 * default Today screenshot keeps matching docs/mockups/today-populated.png.
 */
export function makeEntryFixtures(
	scenario: FixtureScenario = "default",
): Entry[] {
	const today = format(new Date(), "yyyy-MM-dd");

	if (scenario === "day-closed") {
		return DAY_CLOSED_DUE_TODAY_IDS.map((habitId, index) => ({
			id: index + 1,
			habitId,
			date: today,
			createdAt: new Date(),
		}));
	}

	if (scenario === "empty" || scenario === "rest-day") return [];

	if (scenario === "quantity-log") {
		return [
			{ id: 1, habitId: 1, date: today, value: 6, createdAt: new Date() },
		];
	}

	return [
		{ id: 1, habitId: 2, date: today, value: 20, createdAt: new Date() },
		{ id: 2, habitId: 3, date: today, createdAt: new Date() },
	];
}
