const mockOpen = jest.fn();
const mockRename = jest.fn();
jest.mock("expo-sqlite", () => ({
	defaultDatabaseDirectory: "/data/SQLite",
	openDatabaseSync: (...args: unknown[]) => mockOpen(...args),
}));
jest.mock("./database-files", () => ({
	renameDatabaseFile: (...args: unknown[]) => mockRename(...args),
}));
jest.mock("drizzle-orm/expo-sqlite", () => ({
	drizzle: (sqlite: unknown) => ({ sqlite }),
}));

beforeEach(() => {
	jest.resetModules();
	mockOpen.mockReset();
	mockRename.mockReset();
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

	describe("setAsideDatabase", () => {
		const NOW = Date.UTC(2026, 10, 8, 10, 15, 0);

		it("closes, renames to habits.corrupt-<time>.db, and opens a new database", () => {
			const closeSync = jest.fn();
			mockOpen.mockReturnValueOnce({ id: "old", closeSync });
			const client = require("./client");
			mockOpen.mockReturnValue({ id: "new" });

			client.setAsideDatabase(NOW);

			expect(closeSync).toHaveBeenCalledTimes(1);
			expect(mockRename).toHaveBeenCalledWith(
				"/data/SQLite/habits.db",
				"habits.corrupt-20261108T101500Z.db",
			);
			expect(closeSync.mock.invocationCallOrder[0]).toBeLessThan(
				mockRename.mock.invocationCallOrder[0],
			);
			expect(client.expoDb).toEqual({ id: "new" });
			expect(client.getDatabaseOpenError()).toBeNull();
		});

		it("sets aside a database that never opened, and then opens", () => {
			mockOpen.mockImplementationOnce(() => {
				throw new Error("SQLITE_CORRUPT");
			});
			const client = require("./client");
			mockOpen.mockReturnValue({ id: "new" });

			client.setAsideDatabase(NOW);

			expect(mockRename).toHaveBeenCalledTimes(1);
			expect(client.getDatabaseOpenError()).toBeNull();
			expect(client.expoDb).toEqual({ id: "new" });
		});

		it("a rename failure reopens the original and rethrows: nothing changed", () => {
			mockOpen.mockReturnValueOnce({ id: "old", closeSync: jest.fn() });
			const client = require("./client");
			mockOpen.mockReturnValue({ id: "old-again" });
			mockRename.mockImplementation(() => {
				throw new Error("EIO");
			});

			expect(() => client.setAsideDatabase(NOW)).toThrow("EIO");

			expect(client.expoDb).toEqual({ id: "old-again" });
			expect(mockOpen).toHaveBeenLastCalledWith("habits.db", {
				enableChangeListener: true,
			});
		});

		it("a failing close is a failure too, and renames nothing", () => {
			mockOpen.mockReturnValueOnce({
				id: "old",
				closeSync: () => {
					throw new Error("busy");
				},
			});
			const client = require("./client");
			expect(() => client.setAsideDatabase(NOW)).toThrow("busy");
			expect(mockRename).not.toHaveBeenCalled();
			expect(client.expoDb).toMatchObject({ id: "old" });
		});
	});
});
