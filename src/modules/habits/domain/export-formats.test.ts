import {
	EXPORT_TODAY,
	makeExportSource,
} from "../test-support/export-fixtures";
import { toCsv } from "./export-csv";
import { buildExportModel } from "./export-data";
import { EXPORT_FORMATS } from "./export-formats";
import { toJson } from "./export-json";

describe("EXPORT_FORMATS", () => {
	it("registers csv and json with their file types", () => {
		expect(EXPORT_FORMATS.csv).toMatchObject({
			extension: "csv",
			mimeType: "text/csv",
		});
		expect(EXPORT_FORMATS.json).toMatchObject({
			extension: "json",
			mimeType: "application/json",
		});
	});

	it("wires each format to its serializer", () => {
		expect(EXPORT_FORMATS.csv.serialize).toBe(toCsv);
		expect(EXPORT_FORMATS.json.serialize).toBe(toJson);
	});

	it.each(["csv", "json"] as const)(
		"%s serializes a model to text",
		async (format) => {
			const model = buildExportModel(
				makeExportSource(),
				{ format, includeArchived: true },
				EXPORT_TODAY,
			);

			const text = await EXPORT_FORMATS[format].serialize(model, () => {});

			expect(typeof text).toBe("string");
			expect(text.length).toBeGreaterThan(0);
		},
	);
});
