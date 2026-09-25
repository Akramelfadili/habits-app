import { createTestDb } from "@/lib/db/test-db";
import type * as AppSettingsRepository from "./app-settings-repository";

/** Runs `fn` as a production build would see it (`__DEV__ === false`). */
async function inProduction(fn: () => Promise<void>) {
	Reflect.set(globalThis, "__DEV__", false);
	try {
		await fn();
	} finally {
		Reflect.set(globalThis, "__DEV__", true);
	}
}

// jest.mock(...) is hoisted above imports, which would run this before mockDb
// exists — jest.doMock + a same-order require() keeps this file's own
// sequencing (create the test db, register the mock, then load the module
// under test) instead of relying on Jest/Babel's hoisting to get it right.
const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const {
	getSetting,
	setSetting,
	deleteSetting,
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

	it("deletes a setting back to 'never set'", async () => {
		await setSetting("habits.seenFirstRun", "true");
		await deleteSetting("habits.seenFirstRun");
		expect(await getSetting("habits.seenFirstRun")).toBeNull();
	});

	it("refuses to delete a setting outside __DEV__", async () => {
		await setSetting("habits.seenFirstRun", "true");

		await inProduction(async () => {
			await expect(deleteSetting("habits.seenFirstRun")).rejects.toThrow(
				"dev-only",
			);
		});

		expect(await getSetting("habits.seenFirstRun")).toBe("true");
	});
});
