import { format, subDays } from "date-fns";
import type { FrozenDay } from "../types";
import type { FixtureScenario } from "./habit-fixtures";

/**
 * Missed days the `habit-detail` scenario covered with a freeze — two, like
 * docs/mockups/habit-detail.png's heatmap. `entry-fixtures.ts` leaves these
 * days without an entry.
 */
export const HABIT_DETAIL_FROZEN_DAYS_AGO = [38, 59];

/**
 * Static fake frozen days backing the web-only repository
 * (`frozen-day-repository.web.ts`). Only `habit-detail` has any —
 * `streak-at-risk` specifically wants the full pool available (0 used this
 * month) so both freeze slots show as open, matching
 * docs/mockups/streak-at-risk.png.
 */
export function makeFrozenDayFixtures(
	scenario: FixtureScenario = "default",
): FrozenDay[] {
	if (scenario !== "habit-detail" && scenario !== "retro-log") return [];
	return HABIT_DETAIL_FROZEN_DAYS_AGO.map((daysAgo, index) => ({
		id: index + 1,
		habitId: 1,
		date: format(subDays(new Date(), daysAgo), "yyyy-MM-dd"),
		createdAt: new Date(),
	}));
}
