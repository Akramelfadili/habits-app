import {
	EXPORT_TODAY,
	makeExportSource,
} from "../test-support/export-fixtures";
import {
	CSV_COLUMNS,
	describeFrequency,
	escapeCsvField,
	toCsv,
} from "./export-csv";
import { buildExportModel } from "./export-data";
import { toJson } from "./export-json";

// Only the pure streak helpers are used — habit-service's freeze write path (and
// the SQLite client behind it) never runs.
jest.mock("../repositories/frozen-day-repository", () => ({}));

const model = buildExportModel(
	makeExportSource(),
	{ format: "csv", includeArchived: true },
	EXPORT_TODAY,
);

describe("escapeCsvField", () => {
	it("leaves plain and accented text alone", () => {
		expect(escapeCsvField("Café señor — naïve")).toBe("Café señor — naïve");
	});

	it("quotes fields with commas, and doubles embedded quotes", () => {
		expect(escapeCsvField("a, b")).toBe('"a, b"');
		expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
	});

	it("quotes fields with line breaks", () => {
		expect(escapeCsvField("one\ntwo")).toBe('"one\ntwo"');
		expect(escapeCsvField("one\r\ntwo")).toBe('"one\r\ntwo"');
	});

	it("writes empties for null/undefined and keeps zero and false", () => {
		expect(escapeCsvField(null)).toBe("");
		expect(escapeCsvField(undefined)).toBe("");
		expect(escapeCsvField(0)).toBe("0");
		expect(escapeCsvField(false)).toBe("false");
	});
});

describe("describeFrequency", () => {
	it("spells out each frequency type", () => {
		expect(describeFrequency({ type: "daily" })).toBe("daily");
		expect(describeFrequency({ type: "weekdays", days: [1, 3, 5] })).toBe(
			"weekdays:Mon|Wed|Fri",
		);
		expect(describeFrequency({ type: "per-week", timesPerWeek: 3 })).toBe(
			"per-week:3",
		);
	});
});

describe("toCsv", () => {
	it("starts with a UTF-8 byte-order mark and the header row", async () => {
		const csv = await toCsv(model);
		expect(csv.startsWith("﻿")).toBe(true);
		expect(csv.slice(1).split("\r\n")[0]).toBe(CSV_COLUMNS.join(","));
	});

	it("round-trips accents through real UTF-8 bytes", async () => {
		const csv = await toCsv(model);
		const decoded = new TextDecoder("utf-8").decode(
			new TextEncoder().encode(csv),
		);
		expect(decoded).toContain("Línea uno");
		expect(decoded).toContain("Café");
		expect(decoded).toContain("“read”");
	});

	it("writes a habit row with category name, streaks and settings", async () => {
		const lines = (await toCsv(model)).split("\r\n");
		const habit = lines.find((line) => line.startsWith("habit,2,"));
		expect(habit).toBe(
			"habit,2,Water,Other,build,quantity,8,glasses,weekdays:Mon|Wed|Fri,active,2026-09-01,,0,1,,,,",
		);
		expect(lines.find((line) => line.startsWith("habit,1,"))).toContain(
			",Morning,",
		);
	});

	it("includes a habit with no logs, and marks archived habits", async () => {
		const empty = buildExportModel(
			{ ...makeExportSource(), entries: [], notes: [], frozenDays: [] },
			{ format: "csv", includeArchived: true },
			EXPORT_TODAY,
		);
		const csv = await toCsv(empty);
		expect(csv).toContain(
			"habit,3,Old habit,Other,build,simple,,,daily,archived,2026-09-01,2026-09-10,0,0",
		);
		expect(
			csv.split("\r\n").filter((line) => line.startsWith("entry,")),
		).toEqual([]);
	});

	it("writes entries, notes and frozen days as their own rows", async () => {
		const csv = await toCsv(model);
		expect(csv).toContain("entry,2,Water,,,,,,,,,,,,2026-09-14,5,false,");
		expect(csv).toContain(
			'entry,1,"Café, then “read”",,,,,,,,,,,,2026-09-14,,true,',
		);
		expect(csv).toContain("frozen_day,2,Water,,,,,,,,,,,,2026-09-02,,,");
	});

	it("keeps a note's commas, quotes and newline inside one quoted field", async () => {
		const csv = await toCsv(model);
		expect(csv).toContain(
			'note,1,"Café, then “read”",,,,,,,,,,,,2026-09-15,,,"Línea uno, ""dos""\nlínea tres"',
		);
	});

	it("reports progress after each habit with the running log count", async () => {
		const seen: number[] = [];
		await toCsv(model, (done) => {
			seen.push(done);
		});
		expect(seen).toEqual([2, 3, 4]);
	});
});

describe("toJson", () => {
	it("nests each habit's logs, notes and frozen days, with streaks and category name", async () => {
		const parsed = JSON.parse(await toJson(model));
		expect(parsed.version).toBe(1);
		const [cafe, water] = parsed.habits;
		expect(cafe).toMatchObject({
			name: "Café, then “read”",
			category: "Morning",
			status: "active",
			notes: [{ date: "2026-09-15", note: 'Línea uno, "dos"\nlínea tres' }],
		});
		expect(water.frozenDays).toEqual(["2026-09-02"]);
		expect(water.frequency).toBe("weekdays:Mon|Wed|Fri");
		expect(cafe).toHaveProperty("currentStreak");
		expect(cafe).toHaveProperty("longestStreak");
	});
});
