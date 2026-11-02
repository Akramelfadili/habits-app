import {
	EXPORT_TODAY,
	makeExportSource,
} from "../test-support/export-fixtures";
import { buildExportModel } from "./export-data";
import { toJson } from "./export-json";

function modelFor(includeArchived: boolean) {
	return buildExportModel(
		makeExportSource(),
		{ format: "json", includeArchived },
		EXPORT_TODAY,
	);
}

describe("toJson", () => {
	it("writes a versioned envelope with the export date", async () => {
		const parsed = JSON.parse(await toJson(modelFor(true)));

		expect(parsed.version).toBe(1);
		expect(parsed.exportedOn).toBe("2026-09-16");
		expect(parsed.habits).toHaveLength(3);
	});

	it("records which app build and database schema wrote the file (additive; layout version unchanged)", async () => {
		const parsed = JSON.parse(await toJson(modelFor(true)));

		expect(parsed.version).toBe(1);
		expect(parsed.app).toEqual({
			version: expect.any(String),
			build: expect.any(String),
		});
		expect(parsed.schema).toEqual(expect.any(Number));
		expect(parsed.schema).toBeGreaterThan(0);
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
			{ date: "2026-09-15", note: 'Línea uno, "dos"\nlínea tres' },
		]);
		expect(water.frozenDays).toEqual(["2026-09-02"]);
		expect(water.entries[0]).toMatchObject({ value: 5, completed: false });
		expect(water.targetAmount).toBe(8);
		expect(water.targetUnit).toBe("glasses");
	});

	it("marks archived habits and dates their creation and archive days", async () => {
		const parsed = JSON.parse(await toJson(modelFor(true)));
		const [cafe, , old] = parsed.habits;

		expect(cafe).toMatchObject({
			status: "active",
			archivedOn: null,
			createdOn: "2026-09-01",
		});
		expect(old).toMatchObject({ status: "archived", archivedOn: "2026-09-10" });
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
		const empty = buildExportModel(
			{
				habits: [],
				entries: [],
				notes: [],
				frozenDays: [],
				reminders: [],
				categories: [],
			},
			{ format: "json", includeArchived: true },
			EXPORT_TODAY,
		);

		expect(JSON.parse(await toJson(empty)).habits).toEqual([]);
	});

	describe("what the file contains (HAB-44)", () => {
		it("lists every category in the stored order, with whether it is built in", async () => {
			const parsed = JSON.parse(await toJson(modelFor(true)));
			expect(parsed.categories).toHaveLength(11);
			expect(parsed.categories[0]).toEqual({
				name: "Health",
				builtIn: true,
				order: 1,
			});
			expect(parsed.categories.at(-1)).toEqual({
				name: "Morning",
				builtIn: false,
				order: 11,
			});
		});

		it("carries each habit's own reminders: time, days and whether it is on, earliest first", async () => {
			const parsed = JSON.parse(await toJson(modelFor(true)));
			const [cafe, water] = parsed.habits;
			expect(cafe.reminders).toEqual([
				{ time: "07:00", days: ["Tue", "Thu"], enabled: false },
				{ time: "18:30", days: ["Thu"], enabled: true },
			]);
			expect(water.reminders).toEqual([]);
		});

		it("includes the archived habit with its logs, status and archive date", async () => {
			const parsed = JSON.parse(await toJson(modelFor(true)));
			const old = parsed.habits.find(
				(habit: { name: string }) => habit.name === "Old habit",
			);
			expect(old.status).toBe("archived");
			expect(old.archivedOn).toBe("2026-09-10");
			expect(old.entries).toEqual([
				{ date: "2026-09-05", value: null, completed: true },
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

		it("carries frozen days under their habit", async () => {
			const parsed = JSON.parse(await toJson(modelFor(true)));
			expect(parsed.habits[1].frozenDays).toEqual(["2026-09-02"]);
		});
	});
});
