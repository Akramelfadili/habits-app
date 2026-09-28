import type { Reminder } from "../types";
import type { FixtureScenario } from "./habit-fixtures";

/**
 * Static fake reminders backing the web-only repository
 * (`reminder-repository.web.ts`), all on habit #1 ("Meditate" — see
 * `remindersHabitFixtures` in `habit-fixtures.ts`):
 * - `reminders` matches docs/mockups/reminders.png — 07:20 weekdays, 13:00
 *   Mon/Wed/Fri turned off, and 21:00 Sat/Sun, which conflicts with the
 *   habit's schedule and shows the warning banner.
 * - `reminders-at-cap` matches docs/mockups/reminders-at-cap.png — 4 of 4,
 *   the 18:00 one turned off.
 */
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

	if (scenario === "reminders") {
		return [
			reminder(1, 7, 20, [1, 2, 3, 4, 5]),
			reminder(2, 13, 0, [1, 3, 5], false),
			reminder(3, 21, 0, [6, 7]),
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
