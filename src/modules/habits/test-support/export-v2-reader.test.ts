import { renderHook, waitFor } from "@testing-library/react-native";
import { eq } from "drizzle-orm";
import {
	appSettings,
	categories,
	entries,
	entryNotes,
	frozenDays,
	habits,
	reminders,
} from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { buildExportModel } from "../domain/export-data";
import { toJson } from "../domain/export-json";
import type * as UseExportQueries from "../hooks/use-export-queries";
import type { ExportOptions } from "../types";
import { loadExportV2 } from "./export-v2-reader";

/**
 * The round-trip proof for export v2 (C-02): seed a database with every kind
 * of data the file claims to carry, export it through the real hooks and
 * serializer, load that file into a second, clean database with the test-only
 * reader, export again, and compare. `exportedAt` and `derived` are the only
 * things allowed to differ (the first is a clock, the second is recomputed).
 */

// The hooks read `db` from the client module on every render, so swapping this
// variable swaps the database they see.
let currentDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({
	get db() {
		return currentDb;
	},
}));
jest.doMock("drizzle-orm/expo-sqlite", () => ({
	useLiveQuery: require("@/lib/db/test-live-query").useLiveQuery,
}));

// Required after the mocks, so the repositories see the swappable database.
const {
	useExportQueries,
}: typeof UseExportQueries = require("../hooks/use-export-queries");

const TODAY = new Date(2026, 8, 16, 12);

type Counts = {
	habits: number;
	entries: number;
	notes: number;
	frozenDays: number;
	reminders: number;
	categories: number;
};

async function seed(db: ReturnType<typeof createTestDb>): Promise<Counts> {
	const made = new Date(2026, 7, 1, 7, 30, 15);
	await db.insert(categories).values([
		{
			id: 11,
			name: "Slow mornings",
			shape: "grid",
			hue: 42,
			builtIn: false,
			sortOrder: 10,
			createdAt: made,
		},
		{
			id: 12,
			name: "Wind-down",
			shape: "half",
			hue: 280,
			builtIn: false,
			sortOrder: 11,
			createdAt: made,
		},
	]);
	// "Wind-down" first in the group order; the neutral built-in "Other" last.
	await db.update(categories).set({ sortOrder: -1 }).where(eqName("Wind-down"));
	await db.update(categories).set({ sortOrder: 99 }).where(eqName("Other"));

	await db.insert(habits).values([
		{
			id: 1,
			name: "Meditate",
			categoryId: 11,
			direction: "build",
			targetType: "simple",
			frequencyType: "daily",
			sortOrder: 2,
			// Paused twice and restored: the streak math depends on these.
			pausedRanges: "2026-08-10..2026-08-14,2026-08-20..2026-08-22",
			createdAt: made,
			updatedAt: new Date(2026, 8, 2, 9, 1, 2),
		},
		{
			id: 2,
			name: "Water",
			categoryId: 1,
			direction: "build",
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
			frequencyType: "weekdays",
			frequencyWeekdays: "1,3,5",
			sortOrder: 1,
			createdAt: made,
			updatedAt: made,
		},
		{
			id: 3,
			name: "-1 coffee",
			categoryId: 12,
			direction: "break",
			targetType: "simple",
			frequencyType: "per-week",
			frequencyTimesPerWeek: 3,
			sortOrder: 0,
			archivedAt: new Date(2026, 8, 10, 18, 5),
			pausedRanges: "2026-08-25..2026-08-26",
			createdAt: made,
			updatedAt: new Date(2026, 8, 10, 18, 5),
		},
	]);
	await db.insert(entries).values([
		{ habitId: 1, date: "2026-09-14", createdAt: new Date(2026, 8, 14, 8) },
		{ habitId: 1, date: "2026-09-15", createdAt: new Date(2026, 8, 15, 8, 2) },
		{
			habitId: 2,
			date: "2026-09-14",
			value: 5,
			createdAt: new Date(2026, 8, 14, 20),
		},
		{
			habitId: 2,
			date: "2026-09-16",
			value: 9,
			createdAt: new Date(2026, 8, 16, 11),
		},
		{ habitId: 3, date: "2026-09-05", createdAt: new Date(2026, 8, 5, 23) },
	]);
	await db.insert(entryNotes).values([
		{
			habitId: 1,
			date: "2026-09-15",
			note: 'Línea uno, "dos"\nlínea tres — =1+1',
			updatedAt: new Date(2026, 8, 15, 8, 5),
		},
		{
			habitId: 3,
			date: "2026-09-06",
			note: "no log that day",
			updatedAt: new Date(2026, 8, 6, 7),
		},
	]);
	await db.insert(frozenDays).values([
		{ habitId: 2, date: "2026-09-02", createdAt: new Date(2026, 8, 2, 21) },
		{ habitId: 1, date: "2026-09-03", createdAt: new Date(2026, 8, 3, 22, 30) },
	]);
	await db.insert(reminders).values([
		{
			id: 7,
			habitId: 1,
			hour: 6,
			minute: 45,
			weekdays: "1,2,3,4,5",
			enabled: true,
			createdAt: new Date(2026, 7, 2, 10),
		},
		{
			id: 8,
			habitId: 1,
			hour: 21,
			minute: 5,
			weekdays: "6,7",
			enabled: false,
			createdAt: new Date(2026, 7, 3, 10),
		},
		{
			id: 9,
			habitId: 2,
			hour: 12,
			minute: 0,
			weekdays: "1,3,5",
			enabled: true,
			createdAt: new Date(2026, 7, 4, 10),
		},
	]);
	await db.insert(appSettings).values([
		{ key: "app.themePreference", value: "dark" },
		{ key: "habits.eveningReview", value: "true" },
		{ key: "habits.eveningReviewTime", value: "20:45" },
		{ key: "habits.seenFirstRun", value: "true" },
		{ key: "habits.hideHabitNames", value: "false" },
		{ key: "app.haptics", value: "false" },
		// Not for the file: a date the app writes after an export, the reminder
		// bookkeeping marker, and a dev key.
		{ key: "habits.lastExport", value: "2026-09-01" },
		{ key: "habits.reminderTitlesHidden", value: "false" },
		{ key: "dev.pinnedClock", value: "2026-01-01" },
	]);
	return {
		habits: 3,
		entries: 5,
		notes: 2,
		frozenDays: 2,
		reminders: 3,
		categories: 12,
	};
}

function eqName(name: string) {
	return eq(categories.name, name);
}

/** Exports whatever the current database holds, through the hooks the sheet uses. */
async function exportNow(options: ExportOptions, expected: Counts) {
	const { result } = await renderHook(() => useExportQueries(options));
	await waitFor(() => {
		const { source } = result.current;
		expect(source.habits).toHaveLength(expected.habits);
		expect(source.entries).toHaveLength(expected.entries);
		expect(source.notes).toHaveLength(expected.notes);
		expect(source.frozenDays).toHaveLength(expected.frozenDays);
		expect(source.reminders).toHaveLength(expected.reminders);
		expect(source.categories).toHaveLength(expected.categories);
		// Settings arrive last: undefined until each live query has resolved.
		for (const value of Object.values(source.settings)) {
			expect(value).not.toBeUndefined();
		}
	});
	const model = buildExportModel(result.current.source, options, TODAY);
	return JSON.parse(await toJson(model));
}

/** Everything that must survive: the file minus the clock and the recomputed part. */
function stable(file: { exportedAt: string; habits: { derived: unknown }[] }) {
	const { exportedAt: _exportedAt, ...rest } = file;
	return {
		...rest,
		habits: file.habits.map(({ derived: _derived, ...habit }) => habit),
	};
}

const ALL: ExportOptions = {
	format: "json",
	includeArchived: true,
	includeNotes: true,
};

describe("export v2 round trip", () => {
	let counts: Counts;

	beforeEach(async () => {
		currentDb = createTestDb();
		counts = await seed(currentDb);
	});

	it("loads into a clean database and exports again to the same file", async () => {
		const first = await exportNow(ALL, counts);

		// The file says what it is, and holds the set-up facts v1 dropped.
		expect(first.version).toBe(2);
		expect(first.notesIncluded).toBe(true);
		const meditate = first.habits.find(
			(habit: { name: string }) => habit.name === "Meditate",
		);
		expect(meditate.pauses).toEqual([
			{ from: "2026-08-10", to: "2026-08-14" },
			{ from: "2026-08-20", to: "2026-08-22" },
		]);
		expect(first.categories.at(0)).toMatchObject({
			name: "Wind-down",
			shape: "half",
			hue: 280,
			builtIn: false,
			order: 1,
		});
		expect(first.categories.at(-1)).toMatchObject({
			name: "Other",
			hue: null,
			builtIn: true,
		});
		expect(first.settings).toEqual({
			themePreference: "dark",
			eveningReview: true,
			eveningReviewTime: "20:45",
			seenFirstRun: true,
			hideHabitNames: false,
			haptics: false,
		});

		// A clean database, the file loaded through the reader, exported again.
		currentDb = createTestDb();
		await loadExportV2(currentDb, JSON.stringify(first));
		const second = await exportNow(ALL, counts);

		expect(stable(second)).toEqual(stable(first));
		// Streaks are recomputed from the same inputs, so they agree as well —
		// an importer still must not read them from the file.
		expect(second.habits.map((h: { derived: unknown }) => h.derived)).toEqual(
			first.habits.map((h: { derived: unknown }) => h.derived),
		);
	});

	it("the reloaded database holds the same rows, not just the same file", async () => {
		const first = await exportNow(ALL, counts);
		currentDb = createTestDb();
		await loadExportV2(currentDb, first);

		expect(await currentDb.select().from(habits)).toHaveLength(3);
		expect(await currentDb.select().from(entries)).toHaveLength(5);
		expect(await currentDb.select().from(entryNotes)).toHaveLength(2);
		expect(await currentDb.select().from(frozenDays)).toHaveLength(2);
		expect(await currentDb.select().from(reminders)).toHaveLength(3);
		const keys = (await currentDb.select().from(appSettings)).map(
			(row) => row.key,
		);
		// The six user-facing keys came back; the export-date, marker and dev keys were never in the file.
		expect(keys.sort()).toEqual([
			"app.haptics",
			"app.themePreference",
			"habits.eveningReview",
			"habits.eveningReviewTime",
			"habits.hideHabitNames",
			"habits.seenFirstRun",
		]);
	});

	it("with notes left out: the file says so, carries no note text, and still round-trips", async () => {
		const withoutNotes: ExportOptions = { ...ALL, includeNotes: false };
		const first = await exportNow(withoutNotes, counts);

		expect(first.notesIncluded).toBe(false);
		expect(JSON.stringify(first)).not.toContain("Línea uno");
		expect(JSON.stringify(first)).not.toContain("no log that day");
		for (const habit of first.habits) expect(habit).not.toHaveProperty("notes");

		currentDb = createTestDb();
		await loadExportV2(currentDb, first);
		expect(await currentDb.select().from(entryNotes)).toHaveLength(0);

		const second = await exportNow(withoutNotes, { ...counts, notes: 0 });
		expect(stable(second)).toEqual(stable(first));
	});

	it("refuses a version 1 file: it cannot restore pauses, category looks or order", async () => {
		const first = await exportNow(ALL, counts);
		await expect(
			loadExportV2(createTestDb(), { ...first, version: 1 }),
		).rejects.toThrow("Not a version 2 export");
	});
});
