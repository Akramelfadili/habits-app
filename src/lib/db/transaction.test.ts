import { clearLog, getLogEntries } from "@/lib/logger/logger";

const mockRun = jest.fn();
jest.mock("./client", () => ({
	db: { run: (...args: unknown[]) => mockRun(...args) },
}));

import { rollbackQuietly, runInTransaction } from "./transaction";

beforeEach(() => {
	jest.resetAllMocks();
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

describe("runInTransaction", () => {
	const statements = () =>
		mockRun.mock.calls.map(([query]) =>
			String(query.queryChunks?.[0]?.value?.[0] ?? query),
		);

	it("begins, runs the work and commits", async () => {
		mockRun.mockResolvedValue(undefined);
		await expect(runInTransaction(async () => 42)).resolves.toBe(42);
		expect(statements()).toEqual(["begin", "commit"]);
	});

	it("rolls back and rethrows the work's own error", async () => {
		mockRun.mockResolvedValue(undefined);
		await expect(
			runInTransaction(async () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");
		expect(statements()).toEqual(["begin", "rollback"]);
	});

	it("runs two overlapping transactions one after the other", async () => {
		mockRun.mockResolvedValue(undefined);
		const order: string[] = [];
		const slow = runInTransaction(async () => {
			order.push("slow start");
			await new Promise((resolve) => setTimeout(resolve, 20));
			order.push("slow end");
		});
		const fast = runInTransaction(async () => {
			order.push("fast");
		});
		await Promise.all([slow, fast]);
		expect(order).toEqual(["slow start", "slow end", "fast"]);
		expect(statements()).toEqual(["begin", "commit", "begin", "commit"]);
	});

	it("a failed transaction does not stop the next one", async () => {
		mockRun.mockResolvedValue(undefined);
		await runInTransaction(async () => {
			throw new Error("first");
		}).catch(() => undefined);
		await expect(runInTransaction(async () => "second")).resolves.toBe(
			"second",
		);
	});
});
