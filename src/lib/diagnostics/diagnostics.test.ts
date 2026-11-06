import { clearLog, log } from "@/lib/logger/logger";

const mockCopyText = jest.fn();
jest.mock("@/lib/clipboard/clipboard", () => ({
	copyText: (...args: unknown[]) => mockCopyText(...args),
}));
jest.mock("./app-info", () => ({
	getAppInfo: () => ({
		version: "1.2.3",
		build: "45",
		schemaVersion: 11,
		platform: "iOS",
		osVersion: "26.0",
		device: "iPhone 17",
	}),
}));

import { buildDiagnosticsReport, copyDiagnostics } from "./diagnostics";

beforeEach(() => {
	jest.clearAllMocks();
	clearLog();
});

describe("buildDiagnosticsReport", () => {
	it("starts with version, build, schema and device", () => {
		const report = buildDiagnosticsReport();
		expect(report).toContain("App version: 1.2.3 (build 45)");
		expect(report).toContain("Database schema: 11");
		expect(report).toContain("Device: iPhone 17, iOS 26.0");
	});

	it("includes the recent log entries", () => {
		log.info("app.start", { schemaVersion: 11 });
		log.error("migration.failure", { error: new Error("boom") });
		const report = buildDiagnosticsReport();
		expect(report).toContain("Recent log (2 entries)");
		expect(report).toContain("INFO app.start");
		expect(report).toContain("ERROR migration.failure");
	});

	it("says so when nothing was logged", () => {
		expect(buildDiagnosticsReport()).toContain("(no log entries this session)");
	});

	it("carries no habit text that was kept out of the log", () => {
		log.info("t.m", { name: "Glass of water" });
		log.error("t.failed", {
			error: new Error('Habit "Glass of water" is missing'),
		});
		expect(buildDiagnosticsReport()).not.toContain("Glass of water");
	});
});

describe("copyDiagnostics", () => {
	it("copies the report and says how", async () => {
		mockCopyText.mockResolvedValue("copied");
		await expect(copyDiagnostics()).resolves.toBe("copied");
		expect(mockCopyText).toHaveBeenCalledWith(
			expect.stringContaining("Habits diagnostics"),
			"diagnostics.txt",
		);
	});

	it("reports the share fallback", async () => {
		mockCopyText.mockResolvedValue("shared");
		await expect(copyDiagnostics()).resolves.toBe("shared");
	});

	it("never rejects: a clipboard failure is logged and reported as failed", async () => {
		mockCopyText.mockRejectedValue(new Error("denied"));
		await expect(copyDiagnostics()).resolves.toBe("failed");
	});
});
