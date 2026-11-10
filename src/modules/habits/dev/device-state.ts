import { THEME_PREFERENCE_SETTING_KEY } from "@/lib/app-settings/keys";
import type { Category, EntryNote, Habit, Reminder } from "../types";
import { categoryFixturesFor, inMigrationOrder } from "./category-fixtures";
import { makeEntryFixtures, makeEntryNoteFixtures } from "./entry-fixtures";
import { setFixtureSearch } from "./fixture-search";
import { makeFrozenDayFixtures } from "./frozen-day-fixtures";
import {
	type FixtureScenario,
	habitFixturesFor,
	resolveFixtureScenario,
} from "./habit-fixtures";
import { makeReminderFixtures } from "./reminder-fixtures";

// One source for web and device builds, so a state means the same thing on the phone as in the baseline.
export type DeviceState = {
	scenario: FixtureScenario;
	categories: Category[];
	habits: Habit[];
	entries: { habitId: number; date: string; value: number | null }[];
	notes: EntryNote[];
	frozenDays: { habitId: number; date: string }[];
	reminders: Reminder[];
	settings: Record<string, string>;
};

const SEEN_FIRST_RUN_KEY = "habits.seenFirstRun";
const EVENING_REVIEW_KEY = "habits.eveningReview";

function settingsFor(
	scenario: string | null,
	theme: string | null,
): Record<string, string> {
	const settings: Record<string, string> = {};
	if (scenario !== "first-run") settings[SEEN_FIRST_RUN_KEY] = "true";
	if (
		scenario === "reminders-at-cap" ||
		scenario === "settings" ||
		scenario === "export-fails" ||
		scenario === "settings-notifications-off"
	) {
		settings[EVENING_REVIEW_KEY] = "true";
	}
	if (scenario === "settings-notifications-off") {
		settings["habits.lastExport"] = "2026-08-02";
	}
	if (theme) settings[THEME_PREFERENCE_SETTING_KEY] = theme;
	return settings;
}

export function buildDeviceState(search: string): DeviceState {
	setFixtureSearch(search);
	const params = new URLSearchParams(search);
	const scenario = resolveFixtureScenario();
	const habits = habitFixturesFor(scenario);
	return {
		scenario,
		categories: inMigrationOrder(categoryFixturesFor(scenario), habits),
		habits,
		entries: makeEntryFixtures(scenario).map((entry) => ({
			habitId: entry.habitId,
			date: entry.date,
			value: entry.value ?? null,
		})),
		notes: makeEntryNoteFixtures(scenario),
		frozenDays: makeFrozenDayFixtures(scenario).map((day) => ({
			habitId: day.habitId,
			date: day.date,
		})),
		reminders: makeReminderFixtures(scenario),
		settings: settingsFor(params.get("fixtures"), params.get("theme")),
	};
}
