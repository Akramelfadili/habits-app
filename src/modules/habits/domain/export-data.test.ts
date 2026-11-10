import {
	EXPORT_TODAY,
	makeExportSource,
} from "../test-support/export-fixtures";
import { makeHabit } from "../test-support/habit-builder";
import { buildExportModel, summarizeExport } from "./export-data";

const source = makeExportSource();

describe("buildExportModel", () => {
	it("includes archived habits when asked, with their logs", () => {
		const model = buildExportModel(
			source,
			{ format: "csv", includeArchived: true, includeNotes: true },
			EXPORT_TODAY,
		);
		expect(model.habits.map((record) => record.habit.name)).toContain(
			"Old habit",
		);
		expect(model.logCount).toBe(4);
	});

	it("drops archived habits and everything belonging to them when off", () => {
		const model = buildExportModel(
			source,
			{ format: "csv", includeArchived: false, includeNotes: true },
			EXPORT_TODAY,
		);
		expect(model.habits).toHaveLength(2);
		expect(model.logCount).toBe(3);
	});

	it("keeps a habit with no logs, and gives each habit its streaks", () => {
		const model = buildExportModel(
			{ ...source, entries: [], notes: [], frozenDays: [] },
			{ format: "json", includeArchived: true, includeNotes: true },
			EXPORT_TODAY,
		);
		expect(model.habits).toHaveLength(3);
		expect(model.habits[0]).toMatchObject({
			currentStreak: 0,
			longestStreak: 0,
			logs: [],
		});
	});

	it("exports a restored habit's streak as fresh while its longest run is kept (HAB-20)", () => {
		const restored = makeHabit({
			id: 9,
			frequency: { type: "daily" },
			createdAt: new Date(2026, 7, 1),
			pauses: [{ from: "2026-09-05", to: "2026-09-14" }],
		});
		const logs = ["01", "02", "03", "04"].map((day, index) => ({
			id: index,
			habitId: 9,
			date: `2026-09-${day}`,
			createdAt: EXPORT_TODAY,
		}));
		const model = buildExportModel(
			{
				...source,
				habits: [restored],
				entries: logs,
				notes: [],
				frozenDays: [],
			},
			{ format: "json", includeArchived: true, includeNotes: true },
			EXPORT_TODAY,
		);
		expect(model.habits[0]).toMatchObject({
			currentStreak: 0,
			longestStreak: 4,
		});
	});

	it("leaves every note out when Include notes is off, and says so", () => {
		const options = { format: "json", includeArchived: true } as const;
		const withNotes = buildExportModel(
			source,
			{ ...options, includeNotes: true },
			EXPORT_TODAY,
		);
		const without = buildExportModel(
			source,
			{ ...options, includeNotes: false },
			EXPORT_TODAY,
		);
		expect(withNotes.noteCount).toBe(1);
		expect(withNotes.notesIncluded).toBe(true);
		expect(without.noteCount).toBe(0);
		expect(without.notesIncluded).toBe(false);
		expect(without.habits.every((record) => record.notes.length === 0)).toBe(
			true,
		);
		// Nothing else changes.
		expect(without.logCount).toBe(withNotes.logCount);
	});

	it("reads only the user-facing settings", () => {
		const model = buildExportModel(
			{
				...source,
				settings: {
					"app.themePreference": "light",
					"habits.eveningReview": "true",
					"habits.eveningReviewTime": "21:00",
					"habits.seenFirstRun": "true",
					"habits.hideHabitNames": "false",
					"app.haptics": "false",
					"habits.reminderTitlesHidden": "false",
					"habits.lastExport": "2026-09-01",
				},
			},
			{ format: "json", includeArchived: true, includeNotes: true },
			EXPORT_TODAY,
		);
		expect(model.settings).toEqual({
			themePreference: "light",
			eveningReview: true,
			eveningReviewTime: "21:00",
			seenFirstRun: true,
			hideHabitNames: false,
			haptics: false,
		});
	});

	it("marks a quantity log below target as logged but not completed", () => {
		const model = buildExportModel(
			source,
			{ format: "csv", includeArchived: true, includeNotes: true },
			EXPORT_TODAY,
		);
		const water = model.habits.find((record) => record.habit.id === 2);
		expect(water?.logs).toEqual([
			{
				date: "2026-09-14",
				value: 5,
				completed: false,
				createdAt: expect.any(Date),
			},
		]);
	});
});

describe("summarizeExport", () => {
	it("counts habits, logs and notes, and spans the recorded dates", () => {
		expect(
			summarizeExport(
				source,
				{ format: "csv", includeArchived: true, includeNotes: true },
				EXPORT_TODAY,
			),
		).toEqual({
			activeHabits: 2,
			archivedHabits: 1,
			logs: 4,
			notes: 1,
			range: { from: "2026-09-02", to: "2026-09-15" },
		});
	});

	it("the archived toggle changes the counts and the range", () => {
		const summary = summarizeExport(
			source,
			{ format: "csv", includeArchived: false, includeNotes: true },
			EXPORT_TODAY,
		);
		expect(summary).toMatchObject({
			activeHabits: 2,
			archivedHabits: 0,
			logs: 3,
		});
	});

	it("has no range when nothing has been recorded", () => {
		expect(
			summarizeExport(
				{
					habits: [],
					entries: [],
					notes: [],
					frozenDays: [],
					reminders: [],
					categories: [],
					settings: {},
				},
				{ format: "csv", includeArchived: true, includeNotes: true },
				EXPORT_TODAY,
			).range,
		).toBeNull();
	});
});
