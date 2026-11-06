const mockOpen = jest.fn();
jest.mock("expo-sqlite", () => ({
	openDatabaseSync: (...args: unknown[]) => mockOpen(...args),
}));
jest.mock("drizzle-orm/expo-sqlite", () => ({
	drizzle: (sqlite: unknown) => ({ sqlite }),
}));

beforeEach(() => {
	jest.resetModules();
	mockOpen.mockReset();
});

describe("database client", () => {
	it("opens normally and reports no error", () => {
		mockOpen.mockReturnValue({ id: "db" });
		const client = require("./client");
		expect(client.getDatabaseOpenError()).toBeNull();
		expect(client.expoDb).toEqual({ id: "db" });
	});

	it("keeps an open failure instead of throwing at import, and logs it", () => {
		mockOpen.mockImplementation(() => {
			throw new Error("SQLITE_CANTOPEN");
		});
		// resetModules gave `client` its own logger: read that one.
		const { getLogEntries: entries } = require("@/lib/logger/logger");
		const client = require("./client");
		expect(client.getDatabaseOpenError()).toBeInstanceOf(Error);
		expect(() => client.db.select).toThrow("not open");
		expect(entries().map((e: { event: string }) => e.event)).toEqual([
			"database.open_failed",
		]);
	});

	it("retry swaps in a working database for importers", () => {
		mockOpen.mockImplementationOnce(() => {
			throw new Error("SQLITE_CANTOPEN");
		});
		const client = require("./client");
		mockOpen.mockReturnValue({ id: "db" });
		client.retryOpenDatabase();
		expect(client.getDatabaseOpenError()).toBeNull();
		expect(client.expoDb).toEqual({ id: "db" });
	});
});
