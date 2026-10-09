import {
	clearLog,
	formatEntry,
	getLogEntries,
	log,
	MAX_ENTRIES,
	MAX_MESSAGE_LENGTH,
	serializeError,
	wasLogged,
} from "./logger";

beforeEach(() => clearLog());

describe("log", () => {
	it("records levels, scope and message in order", () => {
		log.info("app", "started");
		log.warn("db", "slow");
		log.error("db", "failed");
		expect(getLogEntries().map((e) => [e.level, e.scope, e.message])).toEqual([
			["info", "app", "started"],
			["warn", "db", "slow"],
			["error", "db", "failed"],
		]);
	});

	it("keeps only the last MAX_ENTRIES entries", () => {
		for (let i = 0; i < MAX_ENTRIES + 25; i++) log.info("t", `m${i}`);
		const entries = getLogEntries();
		expect(entries).toHaveLength(MAX_ENTRIES);
		expect(entries[0].message).toBe("m25");
		expect(entries.at(-1)?.message).toBe(`m${MAX_ENTRIES + 24}`);
	});

	it("keeps numbers, booleans and null in context", () => {
		log.info("t", "m", { habitId: 4, ok: true, none: null });
		expect(getLogEntries()[0].context).toEqual({
			habitId: 4,
			ok: true,
			none: null,
		});
	});

	it("never echoes a habit name passed in context", () => {
		log.info("t", "m", {
			habitId: 4,
			name: "Glass of water" as unknown as number,
		});
		const text = JSON.stringify(getLogEntries());
		expect(text).not.toContain("Glass of water");
		expect(getLogEntries()[0].context).toEqual({ habitId: 4 });
	});

	it("drops the context entirely when nothing in it is safe", () => {
		log.info("t", "m", { name: "Run" as unknown as number });
		expect(getLogEntries()[0].context).toBeUndefined();
	});

	it("scrubs quoted user text out of an error message", () => {
		log.error(
			"t",
			"failed",
			new Error(`Category "Glass of water" and 'Run 5k' are missing`),
		);
		const text = JSON.stringify(getLogEntries());
		expect(text).not.toContain("Glass of water");
		expect(text).not.toContain("Run 5k");
		expect(getLogEntries()[0].error?.message).toBe(
			`Category "…" and '…' are missing`,
		);
	});

	it("drops a Drizzle query error's params — they carry the written values", () => {
		const drizzle = new Error(
			'Failed query: update "categories" set "name" = ? where "id" = ?\nparams: Glass of water,5',
			{ cause: new Error('UNIQUE constraint failed: "Glass of water"') },
		);
		log.error("t", "failed", drizzle);
		const text = JSON.stringify(getLogEntries());
		expect(text).not.toContain("Glass of water");
		expect(getLogEntries()[0].error?.message).toContain("Failed query: update");
	});

	it("caps a long error message", () => {
		const error = serializeError(new Error("x".repeat(5000)));
		expect(error?.message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH + 1);
	});

	it("keeps only that a non-Error was thrown, not its content", () => {
		log.error("t", "failed", "Glass of water");
		expect(JSON.stringify(getLogEntries())).not.toContain("Glass of water");
		expect(getLogEntries()[0].error?.name).toBe("NonError");
	});

	it("serialises a cause and a code", () => {
		const cause = new Error("disk full");
		const error = Object.assign(new Error("write failed", { cause }), {
			code: "ERR_X",
		});
		expect(serializeError(error)).toMatchObject({
			name: "Error",
			code: "ERR_X",
			message: "write failed",
			cause: { message: "disk full" },
		});
	});

	it("logs the same error object once", () => {
		const error = new Error("boom");
		log.error("hook", "live query failed", error);
		log.error("boundary", "render failed", error);
		expect(getLogEntries()).toHaveLength(1);
		expect(wasLogged(error)).toBe(true);
	});

	it("formats an entry on a few lines", () => {
		log.error("db", "failed", new Error("boom"), { n: 2 });
		const text = formatEntry(getLogEntries()[0]);
		expect(text).toContain("ERROR [db] failed");
		expect(text).toContain('{"n":2}');
		expect(text).toContain("Error: boom");
	});
});
