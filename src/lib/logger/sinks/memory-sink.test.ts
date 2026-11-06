import { createMemorySink } from "./memory-sink";
import { sampleEntry } from "./sink-fixtures";

describe("memory sink", () => {
	it("keeps the last max entries and clears", () => {
		const sink = createMemorySink(2);
		sink.write(sampleEntry("a"));
		sink.write(sampleEntry("b"));
		sink.write(sampleEntry("c"));
		expect(sink.entries().map((e) => e.event)).toEqual(["b", "c"]);
		sink.clear();
		expect(sink.entries()).toEqual([]);
	});
});
