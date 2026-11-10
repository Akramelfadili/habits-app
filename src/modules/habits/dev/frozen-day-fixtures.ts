import { format, subDays } from "date-fns";
import type { FrozenDay } from "../types";
import type { FixtureScenario } from "./habit-fixtures";
import { HABITS_V3_SCENARIOS, habitsV3FrozenDays } from "./habits-v3-fixtures";
import { monthlyFrozenDays } from "./monthly-fixtures";
import {
	PROGRESS_V3_SCENARIOS,
	progressV3FrozenDays,
} from "./progress-v3-fixtures";

export const HABIT_DETAIL_FROZEN_DAYS_AGO = [38, 59];

const NO_FREEZES_SPENT_DAYS_AGO = [3, 6];

// `streak-at-risk` has none: it needs the full pool available so both freeze slots show open.
export function makeFrozenDayFixtures(
	scenario: FixtureScenario = "default",
): FrozenDay[] {
	if (scenario === "no-freezes" || scenario === "streak-at-risk-no-freezes") {
		// Both spent only while "now" is at least a week into the month; the check pins it to the 24th.
		return NO_FREEZES_SPENT_DAYS_AGO.map((daysAgo, index) => ({
			id: index + 1,
			habitId: 2,
			date: format(subDays(new Date(), daysAgo), "yyyy-MM-dd"),
			createdAt: new Date(),
		}));
	}
	if (scenario === "monthly-summary") return monthlyFrozenDays();
	for (const name of PROGRESS_V3_SCENARIOS) {
		if (scenario === name) return progressV3FrozenDays(name);
	}
	for (const name of HABITS_V3_SCENARIOS) {
		if (scenario === name) return habitsV3FrozenDays(name);
	}
	if (
		scenario !== "habit-detail" &&
		scenario !== "habit-detail-archived" &&
		scenario !== "retro-log"
	) {
		return [];
	}
	return HABIT_DETAIL_FROZEN_DAYS_AGO.map((daysAgo, index) => ({
		id: index + 1,
		habitId: 1,
		date: format(subDays(new Date(), daysAgo), "yyyy-MM-dd"),
		createdAt: new Date(),
	}));
}
