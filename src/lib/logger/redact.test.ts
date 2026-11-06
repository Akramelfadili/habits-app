import {
	clearLog,
	getLogEntries,
	log,
	registerSink,
	setMinLevel,
} from "./logger";
import {
	MAX_MESSAGE_LENGTH,
	REDACTED,
	redactFields,
	serializeError,
} from "./redact";
import type { LogEntry } from "./types";

beforeEach(() => {
	clearLog();
	setMinLevel("debug");
});

describe("redactFields", () => {
	it("keeps ids and counts, in allowlisted names", () => {
		expect(
			redactFields({ habitId: 4, count: 2, isFatal: false, pending: null }),
		).toEqual({ habitId: 4, count: 2, isFatal: false, pending: null });
	});

	it("drops a field whose name is not allowlisted, whatever the value", () => {
		expect(
			redactFields({
				habitId: 4,
				name: "Glass of water",
				note: "felt great",
				label: "Morning",
				title: "x",
				extra: 7,
			}),
		).toEqual({ habitId: 4 });
	});

	it("drops a string where a number belongs", () => {
		expect(redactFields({ habitId: "Glass of water" })).toBeUndefined();
	});

	it("keeps a short lowercase code in a token field", () => {
		expect(redactFields({ reason: "not_granted", scope: "today" })).toEqual({
			reason: "not_granted",
			scope: "today",
		});
	});

	it("replaces free-looking text in a token field", () => {
		expect(
			redactFields({
				reason: "Glass of water",
				scope: "x".repeat(80),
				kind: "Meditate",
			}),
		).toEqual({ reason: REDACTED, scope: REDACTED, kind: REDACTED });
	});

	it("returns nothing when nothing is safe", () => {
		expect(redactFields({ name: "Run" })).toBeUndefined();
		expect(redactFields(undefined)).toBeUndefined();
	});
});

describe("serializeError", () => {
	it("scrubs quoted user text out of an error message", () => {
		const error = serializeError(
			new Error(`Category "Glass of water" and 'Run 5k' are missing`),
		);
		expect(error?.message).toBe(`Category "…" and '…' are missing`);
	});

	it("drops a Drizzle query error's params — they carry the written values", () => {
		const drizzle = new Error(
			'Failed query: update "categories" set "name" = ? where "id" = ?\nparams: Glass of water,5',
			{ cause: new Error('UNIQUE constraint failed: "Glass of water"') },
		);
		const text = JSON.stringify(serializeError(drizzle));
		expect(text).not.toContain("Glass of water");
		expect(text).toContain("Failed query: update");
	});

	it("caps a long error message", () => {
		const error = serializeError(new Error("x".repeat(5000)));
		expect(error?.message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH + 1);
	});

	it("keeps only that a non-Error was thrown, not its content", () => {
		expect(serializeError("Glass of water")).toEqual({
			name: "NonError",
			message: "thrown string",
		});
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
});

describe("redaction happens before any sink", () => {
	it("a habit name and a note never reach a sink", () => {
		const seen: LogEntry[] = [];
		const off = registerSink({ write: (entry) => seen.push(entry) });
		log.info("habit.saved", {
			habitId: 4,
			name: "Glass of water",
			note: "Drank it after the run",
			reason: "Glass of water",
		});
		log.error("habit.failed", {
			habitId: 4,
			error: new Error('Habit "Glass of water" is missing'),
		});
		off();
		const text = JSON.stringify([seen, getLogEntries()]);
		expect(text).not.toContain("Glass of water");
		expect(text).not.toContain("Drank it");
		expect(seen[0].fields).toEqual({ habitId: 4, reason: REDACTED });
	});
});
