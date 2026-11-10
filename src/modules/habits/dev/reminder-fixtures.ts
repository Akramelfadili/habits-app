import type { Reminder } from "../types";
import type { FixtureScenario } from "./habit-fixtures";
import { HABITS_V3_SCENARIOS, habitsV3Reminders } from "./habits-v3-fixtures";

export function makeReminderFixtures(
	scenario: FixtureScenario = "default",
): Reminder[] {
	const reminder = (
		id: number,
		hour: number,
		minute: number,
		weekdays: Reminder["weekdays"],
		enabled = true,
	): Reminder => ({ id, habitId: 1, hour, minute, weekdays, enabled });

	for (const name of HABITS_V3_SCENARIOS) {
		if (scenario === name) return habitsV3Reminders(name);
	}
	if (scenario === "habit-detail-archived") {
		return [reminder(1, 7, 0, [1, 2, 3, 4, 5, 6, 7])];
	}
	if (scenario === "reminders") {
		return [
			reminder(1, 7, 20, [1, 2, 3, 4, 5]),
			reminder(2, 13, 0, [1, 3, 5], false),
			reminder(3, 21, 0, [6, 7]),
		];
	}
	if (scenario === "reminders-times" || scenario === "reminders-times-denied") {
		return [reminder(1, 7, 0, [2, 4]), reminder(2, 18, 30, [4])];
	}
	if (scenario === "settings-notifications-off") {
		const on = (
			id: number,
			habitId: number,
			hour: number,
			weekdays: Reminder["weekdays"],
		): Reminder => ({ id, habitId, hour, minute: 0, weekdays, enabled: true });
		return [
			on(1, 1, 7, [1, 2, 3, 4, 5]),
			on(2, 1, 18, [1, 2, 3, 4, 5]),
			on(3, 2, 21, [1, 2, 3, 4, 5, 6, 7]),
			on(4, 3, 9, [1, 3, 5]),
		];
	}
	if (scenario === "reminders-at-cap") {
		return [
			reminder(1, 7, 20, [1, 2, 3, 4, 5]),
			reminder(2, 12, 30, [1, 3, 5]),
			reminder(3, 18, 0, [1, 2, 3, 4, 5, 6, 7], false),
			reminder(4, 21, 0, [6, 7]),
		];
	}
	return [];
}
