import { createTestDb } from "@/lib/db/test-db";
import type * as AppSettingsRepository from "./app-settings-repository";

// jest.mock(...) is hoisted above imports, which would run this before mockDb
// exists — jest.doMock + a same-order require() keeps this file's own
// sequencing (create the test db, register the mock, then load the module
// under test) instead of relying on Jest/Babel's hoisting to get it right.
const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const {
	getSetting,
	setSetting,
}: typeof AppSettingsRepository = require("./app-settings-repository");

describe("app-settings-repository", () => {
	it("returns null for a key that was never set", async () => {
		expect(await getSetting("unknown")).toBeNull();
	});

	it("round-trips a value", async () => {
		await setSetting("habits.seenFirstRun", "true");
		expect(await getSetting("habits.seenFirstRun")).toBe("true");
	});

	it("overwrites an existing key rather than erroring", async () => {
		await setSetting("theme", "dark");
		await setSetting("theme", "light");
		expect(await getSetting("theme")).toBe("light");
	});

	it("keeps different keys independent", async () => {
		await setSetting("a", "1");
		await setSetting("b", "2");
		expect(await getSetting("a")).toBe("1");
		expect(await getSetting("b")).toBe("2");
	});
});
