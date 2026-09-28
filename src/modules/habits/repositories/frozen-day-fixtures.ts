import type { FrozenDay } from "../types";
import type { FixtureScenario } from "./habit-fixtures";

/**
 * Static fake frozen days backing the web-only repository
 * (`frozen-day-repository.web.ts`). No V1 scenario needs a pre-existing
 * freeze — `streak-at-risk` specifically wants the full pool available (0
 * used this month) so both freeze slots show as open, matching
 * docs/mockups/streak-at-risk.png.
 */
export function makeFrozenDayFixtures(
	_scenario: FixtureScenario = "default",
): FrozenDay[] {
	return [];
}
