import { formatEntry } from "../format";
import { consoleSink } from "./console-sink";
import { sampleEntry } from "./sink-fixtures";

describe("consoleSink", () => {
	let spy: jest.SpyInstance;
	beforeEach(() => {
		spy = jest.spyOn(console, "log").mockImplementation(() => undefined);
	});
	afterEach(() => spy.mockRestore());

	it("prints the formatted entry with console.log, never console.error", () => {
		consoleSink.write(sampleEntry());
		expect(spy).toHaveBeenCalledWith(formatEntry(sampleEntry()));
	});

	it("accepts an entry with an error and no fields", () => {
		expect(() =>
			consoleSink.write({
				...sampleEntry(),
				fields: undefined,
				error: { name: "Error", message: "boom" },
			}),
		).not.toThrow();
	});
});
