import { format, subDays } from "date-fns";
import type { FrozenDay } from "../types";
import type { FixtureScenario } from "./habit-fixtures";

/**
 * Missed days the `habit-detail` scenario covered with a freeze — two, like
 * docs/mockups/habit-detail.png's heatmap. `entry-fixtures.ts` leaves these
 * days without an entry.
 */
export const HABIT_DETAIL_FROZEN_DAYS_AGO = [38, 59];

/** `no-freezes`: the two days this month's freeze pool was spent on. */
const NO_FREEZES_SPENT_DAYS_AGO = [3, 6];

/**
 * Static fake frozen days backing the web-only repository
 * (`frozen-day-repository.web.ts`). Only `habit-detail` and `no-freezes` have any —
 * `streak-at-risk` specifically wants the full pool available (0 used this
 * month) so both freeze slots show as open, matching
 * docs/mockups/streak-at-risk.png.
 */
export function makeFrozenDayFixtures(
	scenario: FixtureScenario = "default",
): FrozenDay[] {
	if (scenario === "no-freezes") {
		// Both of this month's freezes already spent (on another habit), as
		// long as "now" is at least a week into the month — the visual check
		// pins it to the 24th.
		return NO_FREEZES_SPENT_DAYS_AGO.map((daysAgo, index) => ({
			id: index + 1,
			habitId: 2,
			date: format(subDays(new Date(), daysAgo), "yyyy-MM-dd"),
			createdAt: new Date(),
		}));
	}
	if (scenario !== "habit-detail" && scenario !== "retro-log") return [];
	return HABIT_DETAIL_FROZEN_DAYS_AGO.map((daysAgo, index) => ({
		id: index + 1,
		habitId: 1,
		date: format(subDays(new Date(), daysAgo), "yyyy-MM-dd"),
		createdAt: new Date(),
	}));
}
