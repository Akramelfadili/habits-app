import { formatEntry } from "./format";
import {
	clearLog,
	flushLogs,
	getLogEntries,
	log,
	registerSink,
	SESSION_BUFFER_SIZE,
	setMinLevel,
	wasLogged,
} from "./logger";
import type { LogEntry, LogSink } from "./types";

function recordingSink() {
	const entries: LogEntry[] = [];
	const sink: LogSink = { write: (entry) => entries.push(entry) };
	return { sink, entries };
}

const unregister: Array<() => void> = [];
function register(sink: LogSink) {
	const off = registerSink(sink);
	unregister.push(off);
	return off;
}

beforeEach(() => {
	clearLog();
	setMinLevel("debug");
});
afterEach(() => {
	while (unregister.length) unregister.pop()?.();
});

describe("log", () => {
	it("records levels and events in order, stamped with time and app version", () => {
		log.info("app.started");
		log.warn("db.slow");
		log.error("db.failed");
		const entries = getLogEntries();
		expect(entries.map((e) => [e.level, e.event])).toEqual([
			["info", "app.started"],
			["warn", "db.slow"],
			["error", "db.failed"],
		]);
		expect(entries[0].timestamp).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/);
		expect(entries[0].appVersion).toEqual(expect.any(String));
		expect(entries[0].build).toEqual(expect.any(String));
	});

	it("keeps only the last SESSION_BUFFER_SIZE entries in the session buffer", () => {
		for (let i = 0; i < SESSION_BUFFER_SIZE + 25; i++) {
			log.info("t.m", { index: i });
		}
		const entries = getLogEntries();
		expect(entries).toHaveLength(SESSION_BUFFER_SIZE);
		expect(entries[0].fields?.index).toBe(25);
	});

	it("logs the same error object once", () => {
		const error = new Error("boom");
		log.error("hook.failed", { error });
		log.error("boundary.failed", { error });
		expect(getLogEntries()).toHaveLength(1);
		expect(wasLogged(error)).toBe(true);
	});

	it("serialises the error into its own property", () => {
		log.error("t.failed", { habitId: 4, error: new Error("boom") });
		expect(getLogEntries()[0]).toMatchObject({
			fields: { habitId: 4 },
			error: { name: "Error", message: "boom" },
		});
	});

	it("formats an entry on a few lines", () => {
		log.error("db.failed", { count: 2, error: new Error("boom") });
		const text = formatEntry(getLogEntries()[0]);
		expect(text).toContain("ERROR db.failed");
		expect(text).toContain('{"count":2}');
		expect(text).toContain("Error: boom");
	});
});

describe("minimum level", () => {
	it("drops entries below it, for every sink", () => {
		const { sink, entries } = recordingSink();
		register(sink);
		setMinLevel("warn");
		log.debug("t.debug");
		log.info("t.info");
		log.warn("t.warn");
		log.error("t.error");
		expect(entries.map((e) => e.event)).toEqual(["t.warn", "t.error"]);
		expect(getLogEntries().map((e) => e.event)).toEqual(["t.warn", "t.error"]);
	});

	it("lets debug through when asked", () => {
		setMinLevel("debug");
		log.debug("t.debug");
		expect(getLogEntries()).toHaveLength(1);
	});
});

describe("sinks", () => {
	it("hand every registered sink the same entry", () => {
		const a = recordingSink();
		const b = recordingSink();
		register(a.sink);
		register(b.sink);
		log.info("t.m", { habitId: 1 });
		expect(a.entries).toHaveLength(1);
		expect(b.entries).toEqual(a.entries);
	});

	it("stop receiving entries once unregistered", () => {
		const { sink, entries } = recordingSink();
		const off = register(sink);
		log.info("t.one");
		off();
		log.info("t.two");
		expect(entries.map((e) => e.event)).toEqual(["t.one"]);
	});

	it("registering the same sink twice delivers once", () => {
		const { sink, entries } = recordingSink();
		register(sink);
		register(sink);
		log.info("t.m");
		expect(entries).toHaveLength(1);
	});

	it("a throwing sink neither throws into the app nor starves the others", () => {
		const bad: LogSink = {
			write() {
				throw new Error("sink broke");
			},
		};
		const good = recordingSink();
		register(bad);
		register(good.sink);
		expect(() => log.error("t.m", { error: new Error("x") })).not.toThrow();
		expect(good.entries).toHaveLength(1);
		expect(getLogEntries()).toHaveLength(1);
	});

	it("flushLogs calls each flush and survives a rejecting one", async () => {
		const flushed = jest.fn();
		register({ write: () => undefined, flush: flushed });
		register({
			write: () => undefined,
			flush: () => Promise.reject(new Error("disk")),
		});
		await expect(flushLogs()).resolves.toBeUndefined();
		expect(flushed).toHaveBeenCalledTimes(1);
	});

	it("never throws for odd input", () => {
		const cyclic: Record<string, unknown> = {};
		cyclic.self = cyclic;
		expect(() => log.info("t.m", cyclic)).not.toThrow();
		expect(() => log.error("t.m", { error: cyclic })).not.toThrow();
	});
});
