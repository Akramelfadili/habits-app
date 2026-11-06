import { createRingBufferSink } from "./ring-buffer-sink";
import { sampleEntry } from "./sink-fixtures";

function memoryStore(keepAll = false) {
	let rows: ReturnType<typeof sampleEntry>[] = [];
	const append = jest.fn(
		async (
			entries: readonly ReturnType<typeof sampleEntry>[],
			keep: number,
		) => {
			rows = [...rows, ...entries];
			if (!keepAll) rows = rows.slice(-keep);
		},
	);
	return { append, read: async () => rows, rows: () => rows };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("ring buffer sink", () => {
	it("batches: nothing is written until the delay passes, then one append", async () => {
		const store = memoryStore();
		const sink = createRingBufferSink(store, { delayMs: 1000 });
		sink.write(sampleEntry("a"));
		sink.write(sampleEntry("b"));
		expect(store.append).not.toHaveBeenCalled();
		await jest.advanceTimersByTimeAsync(1000);
		expect(store.append).toHaveBeenCalledTimes(1);
		expect(store.rows().map((e) => e.event)).toEqual(["a", "b"]);
	});

	it("writes an error at once", async () => {
		const store = memoryStore();
		const sink = createRingBufferSink(store);
		sink.write({ ...sampleEntry("boom"), level: "error" });
		await jest.advanceTimersByTimeAsync(0);
		expect(store.append).toHaveBeenCalledTimes(1);
	});

	it("flush writes the queue now; recent() returns stored plus queued, oldest first", async () => {
		const store = memoryStore();
		const sink = createRingBufferSink(store);
		sink.write(sampleEntry("a"));
		await sink.flush?.();
		sink.write(sampleEntry("b"));
		expect((await sink.recent()).map((e) => e.event)).toEqual(["a", "b"]);
	});

	it("asks the store to keep only the last 500 by default", async () => {
		const store = memoryStore();
		const sink = createRingBufferSink(store);
		sink.write(sampleEntry("a"));
		await sink.flush?.();
		expect(store.append).toHaveBeenCalledWith(expect.any(Array), 500);
	});

	it("trims automatically through the store", async () => {
		const store = memoryStore();
		const sink = createRingBufferSink(store, { keep: 3 });
		for (const e of ["1", "2", "3", "4", "5"]) sink.write(sampleEntry(e));
		expect((await sink.recent()).map((x) => x.event)).toEqual(["3", "4", "5"]);
	});

	it("survives a restart: a new sink over the same store sees the old entries", async () => {
		const store = memoryStore();
		const first = createRingBufferSink(store);
		first.write(sampleEntry("before"));
		await first.flush?.();
		const second = createRingBufferSink(store);
		second.write(sampleEntry("after"));
		expect((await second.recent()).map((e) => e.event)).toEqual([
			"before",
			"after",
		]);
	});

	it("a failing store neither throws nor blocks later writes", async () => {
		let fail = true;
		const rows: string[] = [];
		const store = {
			append: async (entries: readonly { event: string }[]) => {
				if (fail) throw new Error("disk full");
				rows.push(...entries.map((e) => e.event));
			},
			read: async () => {
				throw new Error("unreadable");
			},
		};
		const sink = createRingBufferSink(store as never);
		sink.write(sampleEntry("lost"));
		await expect(sink.flush?.()).resolves.toBeUndefined();
		fail = false;
		sink.write(sampleEntry("kept"));
		await sink.flush?.();
		expect(rows).toEqual(["kept"]);
		await expect(sink.recent()).resolves.toEqual([]);
	});
});
