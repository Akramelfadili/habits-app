/// <reference types="node" />
import { sampleEntry } from "../sinks/sink-fixtures";
import type * as LogRepository from "./log-repository";

// expo-sqlite's native binding doesn't run under Jest: back the few methods the
// repository uses with node:sqlite (same approach as lib/db/test-db.ts).
jest.mock("expo-sqlite", () => {
	const { DatabaseSync: Sqlite } = require("node:sqlite");
	const sqlite = new Sqlite(":memory:");
	const fake = {
		execSync: (sql: string) => sqlite.exec(sql),
		runAsync: async (sql: string, ...params: unknown[]) => {
			sqlite.prepare(sql).run(...params);
		},
		getAllAsync: async (sql: string, ...params: unknown[]) =>
			sqlite.prepare(sql).all(...params),
		withTransactionAsync: async (task: () => Promise<void>) => {
			sqlite.exec("BEGIN");
			try {
				await task();
				sqlite.exec("COMMIT");
			} catch (error) {
				sqlite.exec("ROLLBACK");
				throw error;
			}
		},
	};
	return { openDatabaseSync: () => fake };
});

const {
	appendLogEntries,
	clearLogEntries,
	readLogEntries,
}: typeof LogRepository = require("./log-repository");

beforeEach(() => clearLogEntries());

describe("log-repository", () => {
	it("round-trips entries, oldest first", async () => {
		await appendLogEntries([sampleEntry("a"), sampleEntry("b")], 10);
		const read = await readLogEntries();
		expect(read.map((e) => e.event)).toEqual(["a", "b"]);
		expect(read[0]).toEqual(sampleEntry("a"));
	});

	it("trims to the newest `keep` rows across batches", async () => {
		await appendLogEntries(
			[sampleEntry("1"), sampleEntry("2"), sampleEntry("3")],
			3,
		);
		await appendLogEntries([sampleEntry("4"), sampleEntry("5")], 3);
		expect((await readLogEntries()).map((e) => e.event)).toEqual([
			"3",
			"4",
			"5",
		]);
	});

	it("does nothing for an empty batch and clears on request", async () => {
		await appendLogEntries([], 3);
		await appendLogEntries([sampleEntry("a")], 3);
		await clearLogEntries();
		expect(await readLogEntries()).toEqual([]);
	});
});
