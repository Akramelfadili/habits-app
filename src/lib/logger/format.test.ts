import { formatEntry } from "./format";
import { sampleEntry } from "./sinks/sink-fixtures";

describe("formatEntry", () => {
	it("puts time, level and event on the first line, then fields", () => {
		expect(formatEntry(sampleEntry("app.start"))).toBe(
			'2026-11-06T10:00:00.000Z INFO app.start\n  {"habitId":1}',
		);
	});

	it("adds the error, its cause and its code", () => {
		const text = formatEntry({
			...sampleEntry(),
			error: {
				name: "Error",
				code: "E1",
				message: "boom",
				cause: { name: "Error", message: "disk" },
			},
		});
		expect(text).toContain("Error (E1): boom");
		expect(text).toContain("caused by Error: disk");
	});
});
