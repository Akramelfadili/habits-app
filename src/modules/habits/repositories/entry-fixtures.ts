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
 * have no due-today habits to complete.
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

	return [
		{ id: 1, habitId: 2, date: today, createdAt: new Date() },
		{ id: 2, habitId: 3, date: today, createdAt: new Date() },
	];
}
