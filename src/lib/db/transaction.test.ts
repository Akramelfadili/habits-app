import { clearLog, getLogEntries } from "@/lib/logger/logger";

const mockRun = jest.fn();
jest.mock("./client", () => ({
	db: { run: (...args: unknown[]) => mockRun(...args) },
}));

import { rollbackQuietly } from "./transaction";

beforeEach(() => {
	jest.clearAllMocks();
	clearLog();
});

describe("rollbackQuietly", () => {
	it("rolls back", async () => {
		mockRun.mockResolvedValue(undefined);
		await rollbackQuietly();
		expect(mockRun).toHaveBeenCalledTimes(1);
		expect(getLogEntries()).toHaveLength(0);
	});

	it("never throws: a failing rollback is logged so the caller's own error survives", async () => {
		mockRun.mockRejectedValue(
			new Error("cannot rollback - no transaction is active"),
		);

		await expect(rollbackQuietly()).resolves.toBeUndefined();

		expect(getLogEntries()[0]).toMatchObject({
			level: "error",
			scope: "db",
			message: "rollback failed",
		});
	});
});
