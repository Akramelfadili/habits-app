import {
	EXPORT_TODAY,
	makeExportSource,
} from "../test-support/export-fixtures";
import { buildExportModel } from "./export-data";
import { toJson } from "./export-json";

// Only the pure streak helpers are used — habit-service's freeze write path never runs.
jest.mock("../repositories/frozen-day-repository", () => ({}));

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
			{ habits: [], entries: [], notes: [], frozenDays: [] },
			{ format: "json", includeArchived: true },
			EXPORT_TODAY,
		);

		expect(JSON.parse(await toJson(empty)).habits).toEqual([]);
	});
});
