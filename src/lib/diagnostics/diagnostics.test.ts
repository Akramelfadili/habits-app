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
	getLocaleInfo: () => ({ locale: "en-GB", timeZone: "Europe/London" }),
}));

import { buildDiagnosticsReport, copyDiagnostics } from "./diagnostics";

beforeEach(() => {
	jest.clearAllMocks();
	clearLog();
});

describe("buildDiagnosticsReport", () => {
	it("starts with version, build, OS, device, schema, locale and time zone", async () => {
		const report = await buildDiagnosticsReport();
		expect(report).toContain("App version: 1.2.3 (build 45)");
		expect(report).toContain("OS: iOS 26.0");
		expect(report).toContain("Device: iPhone 17");
		expect(report).toContain("Database schema: 11");
		expect(report).toContain("Locale: en-GB");
		expect(report).toContain("Time zone: Europe/London");
	});

	it("includes the recent log entries, newest last", async () => {
		log.info("app.start", { schemaVersion: 11 });
		log.error("migration.failure", { error: new Error("boom") });
		const report = await buildDiagnosticsReport();
		expect(report).toContain("Recent log (2 entries, newest last)");
		expect(report.indexOf("INFO app.start")).toBeGreaterThan(-1);
		expect(report.indexOf("ERROR migration.failure")).toBeGreaterThan(
			report.indexOf("INFO app.start"),
		);
	});

	it("says so when nothing was logged", async () => {
		expect(await buildDiagnosticsReport()).toContain(
			"(no log entries recorded)",
		);
	});

	it("carries no habit text that was kept out of the log", async () => {
		log.info("t.m", { name: "Glass of water", note: "felt great" });
		log.error("t.failed", {
			error: new Error('Habit "Glass of water" is missing'),
		});
		const report = await buildDiagnosticsReport();
		expect(report).not.toContain("Glass of water");
		expect(report).not.toContain("felt great");
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
