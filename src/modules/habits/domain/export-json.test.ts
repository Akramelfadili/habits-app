import {
	HAPTICS_SETTING_KEY,
	THEME_PREFERENCE_SETTING_KEY,
} from "@/lib/app-settings/keys";
import {
	EVENING_REVIEW_SETTING_KEY,
	EVENING_REVIEW_TIME_SETTING_KEY,
	HIDE_HABIT_NAMES_SETTING_KEY,
	LAST_EXPORT_SETTING_KEY,
	SEEN_FIRST_RUN_SETTING_KEY,
} from "../constants";
import {
	EXPORT_TODAY,
	makeExportSource,
} from "../test-support/export-fixtures";
import { buildExportModel, type ExportSource } from "./export-data";
import { toJson } from "./export-json";

function modelFor(
	includeArchived: boolean,
	includeNotes = true,
	source: ExportSource = makeExportSource(),
) {
	return buildExportModel(
		source,
		{ format: "json", includeArchived, includeNotes },
		EXPORT_TODAY,
	);
}

const emptySource: ExportSource = {
	habits: [],
	entries: [],
	notes: [],
	frozenDays: [],
	reminders: [],
	categories: [],
	settings: {},
};

describe("toJson", () => {
	it("writes a version 2 envelope: layout, database schema, build, moment and local-ids notice", async () => {
		const parsed = JSON.parse(await toJson(modelFor(true)));

		expect(parsed.version).toBe(2);
		expect(parsed.schemaVersion).toEqual(expect.any(Number));
		expect(parsed.schemaVersion).toBeGreaterThan(0);
		expect(parsed.app).toEqual({
			version: expect.any(String),
			build: expect.any(String),
		});
		expect(parsed.exportedOn).toBe("2026-09-16");
		expect(parsed.exportedAt).toBe(EXPORT_TODAY.toISOString());
		expect(parsed.idsAreLocal).toBe(true);
		expect(parsed.notesIncluded).toBe(true);
		expect(parsed.habits).toHaveLength(3);
	});

	it("nests each habit's logs, notes and frozen days under it", async () => {
		const parsed = JSON.parse(await toJson(modelFor(true)));
		const [cafe, water] = parsed.habits;

		expect(cafe.name).toBe("Café, then “read”");
		expect(cafe.category).toBe("Morning");
		expect(cafe.entries.map((e: { date: string }) => e.date)).toEqual([
			"2026-09-14",
			"2026-09-15",
		]);
		expect(cafe.notes).toEqual([
			{
				date: "2026-09-15",
				note: 'Línea uno, "dos"\nlínea tres',
				updatedAt: null,
			},
		]);
		expect(water.frozenDays).toEqual([
			{ date: "2026-09-02", createdAt: expect.any(String) },
		]);
		expect(water.entries[0]).toMatchObject({ value: 5, completed: false });
		expect(water.targetAmount).toBe(8);
		expect(water.targetUnit).toBe("glasses");
	});

	it("carries what version 1 dropped: pauses, order, timestamps, category link", async () => {
		const base = makeExportSource();
		const source: ExportSource = {
			...base,
			habits: [
				{
					...base.habits[0],
					sortOrder: 4,
					pauses: [{ from: "2026-09-05", to: "2026-09-09" }],
					updatedAt: new Date(2026, 8, 3, 8, 15),
				},
				...base.habits.slice(1),
			],
		};
		const parsed = JSON.parse(await toJson(modelFor(true, true, source)));
		const [cafe, , old] = parsed.habits;

		expect(cafe).toMatchObject({
			id: 1,
			categoryId: source.habits[0].category.id,
			category: "Morning",
			sortOrder: 4,
			pauses: [{ from: "2026-09-05", to: "2026-09-09" }],
			createdAt: new Date(2026, 8, 1).toISOString(),
			updatedAt: new Date(2026, 8, 3, 8, 15).toISOString(),
			archivedAt: null,
		});
		expect(old.archivedAt).toBe(new Date(2026, 8, 10).toISOString());
		expect(cafe.entries[0].createdAt).toBe(new Date(2026, 8, 1).toISOString());
	});

	it("keeps computed values only under `derived`", async () => {
		const parsed = JSON.parse(await toJson(modelFor(true)));
		const [cafe, , old] = parsed.habits;

		expect(cafe.derived).toEqual({
			status: "active",
			archivedOn: null,
			createdOn: "2026-09-01",
			currentStreak: expect.any(Number),
			longestStreak: expect.any(Number),
		});
		expect(old.derived).toMatchObject({
			status: "archived",
			archivedOn: "2026-09-10",
		});
		for (const habit of parsed.habits) {
			expect(habit).not.toHaveProperty("currentStreak");
			expect(habit).not.toHaveProperty("longestStreak");
		}
	});

	it("leaves archived habits out when the model does", async () => {
		const parsed = JSON.parse(await toJson(modelFor(false)));

		expect(parsed.habits.map((h: { name: string }) => h.name)).toEqual([
			"Café, then “read”",
			"Water",
		]);
	});

	it("reports cumulative logs after each habit, in order", async () => {
		const model = modelFor(true);
		const progress: number[] = [];

		await toJson(model, (logsDone) => {
			progress.push(logsDone);
		});

		expect(progress).toHaveLength(model.habits.length);
		expect(progress).toEqual([...progress].sort((a, b) => a - b));
		expect(progress[progress.length - 1]).toBe(model.logCount);
	});

	it("is valid JSON for an empty export", async () => {
		const parsed = JSON.parse(await toJson(modelFor(true, true, emptySource)));

		expect(parsed.habits).toEqual([]);
		expect(parsed.settings).toEqual({
			themePreference: null,
			eveningReview: null,
			eveningReviewTime: null,
			seenFirstRun: null,
			hideHabitNames: null,
			haptics: null,
		});
	});

	describe("what the file contains", () => {
		it("lists every category in the stored order, with its look and whether it is built in", async () => {
			const parsed = JSON.parse(await toJson(modelFor(true)));
			expect(parsed.categories).toHaveLength(11);
			expect(parsed.categories[0]).toEqual({
				id: 1,
				name: "Health",
				shape: expect.any(String),
				hue: expect.any(Number),
				builtIn: true,
				order: 1,
			});
			expect(parsed.categories.at(-1)).toEqual({
				id: expect.any(Number),
				name: "Morning",
				shape: "ring",
				hue: expect.any(Number),
				builtIn: false,
				order: 11,
			});
		});

		it("carries each habit's own reminders: id, time, days, whether it is on and when it was added, earliest first", async () => {
			const parsed = JSON.parse(await toJson(modelFor(true)));
			const [cafe, water] = parsed.habits;
			expect(cafe.reminders).toEqual([
				{
					id: 2,
					time: "07:00",
					days: ["Tue", "Thu"],
					enabled: false,
					createdAt: null,
				},
				{
					id: 1,
					time: "18:30",
					days: ["Thu"],
					enabled: true,
					createdAt: null,
				},
			]);
			expect(water.reminders).toEqual([]);
		});

		it("includes the archived habit with its logs", async () => {
			const parsed = JSON.parse(await toJson(modelFor(true)));
			const old = parsed.habits.find(
				(habit: { name: string }) => habit.name === "Old habit",
			);
			expect(old.entries).toEqual([
				{
					date: "2026-09-05",
					value: null,
					completed: true,
					createdAt: expect.any(String),
				},
			]);
		});

		it("leaves an archived habit — and its reminders, logs and frozen days — out when asked", async () => {
			const parsed = JSON.parse(await toJson(modelFor(false)));
			expect(parsed.habits.map((h: { name: string }) => h.name)).toEqual([
				"Café, then “read”",
				"Water",
			]);
			// Categories are the person's setup, not a habit's data: they stay.
			expect(parsed.categories).toHaveLength(11);
		});
	});

	describe("settings", () => {
		it("carries the six user-facing settings, typed", async () => {
			const source: ExportSource = {
				...makeExportSource(),
				settings: {
					[THEME_PREFERENCE_SETTING_KEY]: "dark",
					[EVENING_REVIEW_SETTING_KEY]: "true",
					[EVENING_REVIEW_TIME_SETTING_KEY]: "20:45",
					[SEEN_FIRST_RUN_SETTING_KEY]: "true",
					[HIDE_HABIT_NAMES_SETTING_KEY]: "false",
					[HAPTICS_SETTING_KEY]: "false",
				},
			};
			const parsed = JSON.parse(await toJson(modelFor(true, true, source)));
			expect(parsed.settings).toEqual({
				themePreference: "dark",
				eveningReview: true,
				eveningReviewTime: "20:45",
				seenFirstRun: true,
				hideHabitNames: false,
				haptics: false,
			});
		});

		it("never writes lastExport or any other key", async () => {
			const source: ExportSource = {
				...makeExportSource(),
				settings: {
					[LAST_EXPORT_SETTING_KEY]: "2031-04-05",
					"dev.pinnedClock": "2026-01-01",
				},
			};
			const text = await toJson(modelFor(true, true, source));
			expect(text).not.toContain("lastExport");
			expect(text).not.toContain("2031-04-05");
			expect(text).not.toContain("pinnedClock");
			expect(JSON.parse(text).settings).toEqual({
				themePreference: null,
				eveningReview: null,
				eveningReviewTime: null,
				seenFirstRun: null,
				hideHabitNames: null,
				haptics: null,
			});
		});

		it("tells an explicit off from never set", async () => {
			const source: ExportSource = {
				...makeExportSource(),
				settings: { [EVENING_REVIEW_SETTING_KEY]: "false" },
			};
			const parsed = JSON.parse(await toJson(modelFor(true, true, source)));
			expect(parsed.settings.eveningReview).toBe(false);
			expect(parsed.settings.seenFirstRun).toBeNull();
		});
	});

	describe("Include notes off", () => {
		it("records notesIncluded: false and writes no note text and no notes key", async () => {
			const text = await toJson(modelFor(true, false));
			const parsed = JSON.parse(text);

			expect(parsed.notesIncluded).toBe(false);
			for (const habit of parsed.habits) {
				expect(habit).not.toHaveProperty("notes");
			}
			expect(text).not.toContain("Línea uno");
			expect(parsed.habits[0].entries).toHaveLength(2);
			expect(parsed.habits[1].frozenDays).toHaveLength(1);
		});
	});
});
