import { sampleEntry } from "../sinks/sink-fixtures";
import {
	appendLogEntries,
	clearLogEntries,
	readLogEntries,
} from "./log-repository.web";

beforeEach(() => clearLogEntries());

describe("log-repository.web", () => {
	it("keeps the newest entries, oldest first", async () => {
		await appendLogEntries([sampleEntry("a"), sampleEntry("b")], 2);
		await appendLogEntries([sampleEntry("c")], 2);
		expect((await readLogEntries()).map((e) => e.event)).toEqual(["b", "c"]);
	});

	it("clears", async () => {
		await appendLogEntries([sampleEntry("a")], 5);
		await clearLogEntries();
		expect(await readLogEntries()).toEqual([]);
	});
});
