import { parseISO } from "date-fns";
import { eq } from "drizzle-orm";
import {
	HAPTICS_SETTING_KEY,
	THEME_PREFERENCE_SETTING_KEY,
} from "@/lib/app-settings/keys";
import {
	appSettings,
	categories,
	entries,
	entryNotes,
	frozenDays,
	habits,
	reminders,
} from "@/lib/db/schema";
import type { createTestDb } from "@/lib/db/test-db";
import {
	EVENING_REVIEW_SETTING_KEY,
	EVENING_REVIEW_TIME_SETTING_KEY,
	HIDE_HABIT_NAMES_SETTING_KEY,
	SEEN_FIRST_RUN_SETTING_KEY,
} from "../constants";
import type { ExportDocumentV2 } from "../domain/export-json";

/**
 * TEST-ONLY. Loads a version 2 export file into a clean, migrated test database: the
 * proof that the file holds enough to rebuild the app's data (the round trip is in
 * `export-v2-reader.test.ts`). It is not the importer: a real importer will start from this
 * file's field handling, and must also remap ids, ask what to do with data that is already
 * there, and read older versions. Nothing under `test-support/` is imported by app code
 * (scripts/check-architecture.mjs, rule `test-support-site`).
 * Differences from a real importer, on purpose: it keeps the file's local ids (so a
 * re-export can be compared field for field), and it writes rows directly, because the
 * repositories always stamp "now" on creation times.
 */

type TestDb = ReturnType<typeof createTestDb>;

const DAY_NUMBERS: Record<string, number> = {
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6,
	Sun: 7,
};

type FrequencyColumns = {
	frequencyType: "daily" | "weekdays" | "per-week";
	frequencyWeekdays: string | null;
	frequencyTimesPerWeek: number | null;
};

/** The inverse of `describeFrequency`: "daily", "weekdays:Mon|Wed", "per-week:3". */
function parseFrequency(text: string): FrequencyColumns {
	if (text === "daily") {
		return {
			frequencyType: "daily",
			frequencyWeekdays: null,
			frequencyTimesPerWeek: null,
		};
	}
	const [type, rest = ""] = text.split(":");
	if (type === "weekdays") {
		return {
			frequencyType: "weekdays",
			frequencyWeekdays: rest
				.split("|")
				.map((name) => DAY_NUMBERS[name])
				.join(","),
			frequencyTimesPerWeek: null,
		};
	}
	if (type === "per-week") {
		return {
			frequencyType: "per-week",
			frequencyWeekdays: null,
			frequencyTimesPerWeek: Number(rest),
		};
	}
	throw new Error(`Unknown frequency "${text}"`);
}

const at = (iso: string) => parseISO(iso);

export async function loadExportV2(
	db: TestDb,
	file: ExportDocumentV2 | string,
): Promise<void> {
	const document: ExportDocumentV2 =
		typeof file === "string" ? JSON.parse(file) : file;
	if (document.version !== 2) {
		throw new Error(`Not a version 2 export (version ${document.version})`);
	}
	const now = new Date();

	// Built-ins are seeded by migration: only their group order moves. A custom
	// category is created with the id the file gave it.
	for (const category of document.categories) {
		if (category.builtIn) {
			await db
				.update(categories)
				.set({ sortOrder: category.order - 1 })
				.where(eq(categories.name, category.name));
		} else {
			await db.insert(categories).values({
				id: category.id,
				name: category.name,
				shape: category.shape as (typeof categories.$inferInsert)["shape"],
				hue: category.hue,
				builtIn: false,
				sortOrder: category.order - 1,
				createdAt: now,
			});
		}
	}

	for (const habit of document.habits) {
		await db.insert(habits).values({
			id: habit.id,
			name: habit.name,
			categoryId: habit.categoryId,
			direction: habit.direction as "build" | "break",
			targetType: habit.targetType as "simple" | "quantity",
			targetAmount: habit.targetAmount,
			targetUnit: habit.targetUnit,
			...parseFrequency(habit.frequency),
			sortOrder: habit.sortOrder,
			archivedAt: habit.archivedAt ? at(habit.archivedAt) : null,
			pausedRanges:
				habit.pauses.length > 0
					? habit.pauses.map(({ from, to }) => `${from}..${to}`).join(",")
					: null,
			createdAt: at(habit.createdAt),
			updatedAt: at(habit.updatedAt),
		});
		for (const entry of habit.entries) {
			await db.insert(entries).values({
				habitId: habit.id,
				date: entry.date,
				value: entry.value,
				createdAt: at(entry.createdAt),
			});
		}
		// No `notes` key when the file was written with notes left out.
		for (const note of habit.notes ?? []) {
			await db.insert(entryNotes).values({
				habitId: habit.id,
				date: note.date,
				note: note.note,
				updatedAt: note.updatedAt ? at(note.updatedAt) : now,
			});
		}
		for (const day of habit.frozenDays) {
			await db.insert(frozenDays).values({
				habitId: habit.id,
				date: day.date,
				createdAt: at(day.createdAt),
			});
		}
		for (const reminder of habit.reminders) {
			const [hour, minute] = reminder.time.split(":").map(Number);
			await db.insert(reminders).values({
				id: reminder.id,
				habitId: habit.id,
				hour,
				minute,
				weekdays: reminder.days.map((name) => DAY_NUMBERS[name]).join(","),
				enabled: reminder.enabled,
				createdAt: reminder.createdAt ? at(reminder.createdAt) : now,
			});
		}
	}

	const { settings } = document;
	const settingRows: [string, string | null][] = [
		[THEME_PREFERENCE_SETTING_KEY, settings.themePreference],
		[
			EVENING_REVIEW_SETTING_KEY,
			settings.eveningReview === null ? null : String(settings.eveningReview),
		],
		[EVENING_REVIEW_TIME_SETTING_KEY, settings.eveningReviewTime],
		[
			SEEN_FIRST_RUN_SETTING_KEY,
			settings.seenFirstRun === null ? null : String(settings.seenFirstRun),
		],
		[
			HIDE_HABIT_NAMES_SETTING_KEY,
			settings.hideHabitNames === null ? null : String(settings.hideHabitNames),
		],
		[
			HAPTICS_SETTING_KEY,
			settings.haptics === null ? null : String(settings.haptics),
		],
	];
	for (const [key, value] of settingRows) {
		if (value !== null) await db.insert(appSettings).values({ key, value });
	}
}
