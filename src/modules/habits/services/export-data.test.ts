import {
	EXPORT_TODAY,
	makeExportSource,
} from "../test-support/export-fixtures";
import { makeHabit } from "../test-support/habit-builder";
import { buildExportModel, summarizeExport } from "./export-data";

// Only the pure streak helpers are used — habit-service's freeze write path (and
// the SQLite client behind it) never runs.
jest.mock("../repositories/frozen-day-repository", () => ({}));

const source = makeExportSource();

describe("buildExportModel", () => {
	it("includes archived habits when asked, with their logs", () => {
		const model = buildExportModel(
			source,
			{ format: "csv", includeArchived: true },
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
			{ format: "csv", includeArchived: false },
			EXPORT_TODAY,
		);
		expect(model.habits).toHaveLength(2);
		expect(model.logCount).toBe(3);
	});

	it("keeps a habit with no logs, and gives each habit its streaks", () => {
		const model = buildExportModel(
			{ ...source, entries: [], notes: [], frozenDays: [] },
			{ format: "json", includeArchived: true },
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
			{ format: "json", includeArchived: true },
			EXPORT_TODAY,
		);
		expect(model.habits[0]).toMatchObject({
			currentStreak: 0,
			longestStreak: 4,
		});
	});

	it("marks a quantity log below target as logged but not completed", () => {
		const model = buildExportModel(
			source,
			{ format: "csv", includeArchived: true },
			EXPORT_TODAY,
		);
		const water = model.habits.find((record) => record.habit.id === 2);
		expect(water?.logs).toEqual([
			{ date: "2026-09-14", value: 5, completed: false },
		]);
	});
});

describe("summarizeExport", () => {
	it("counts habits, logs and notes, and spans the recorded dates", () => {
		expect(
			summarizeExport(
				source,
				{ format: "csv", includeArchived: true },
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
			{ format: "csv", includeArchived: false },
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
				{ habits: [], entries: [], notes: [], frozenDays: [] },
				{ format: "csv", includeArchived: true },
				EXPORT_TODAY,
			).range,
		).toBeNull();
	});
});
