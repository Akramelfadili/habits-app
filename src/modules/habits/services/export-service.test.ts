import {
	EXPORT_TODAY,
	makeExportSource,
} from "../test-support/export-fixtures";

jest.mock("../repositories/frozen-day-repository", () => ({}));

const mockFiles = new Map<string, string>();
const mockWriteScratch = jest.fn();
jest.mock("@/lib/file-export/file-export", () => ({
	clearExports: () => mockFiles.clear(),
	writeScratchFile: (content: string) => mockWriteScratch(content),
	promoteScratchFile: (
		scratch: { uri: string; sizeBytes: number },
		finalName: string,
	) => {
		const content = mockFiles.get(scratch.uri) ?? "";
		mockFiles.delete(scratch.uri);
		mockFiles.set(finalName, content);
		return { uri: finalName, name: finalName, sizeBytes: scratch.sizeBytes };
	},
	discardFile: (uri: string) => mockFiles.delete(uri),
}));

const mockSetSetting = jest.fn();
jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	setSetting: (...args: unknown[]) => mockSetSetting(...args),
}));

import {
	ExportCancelledError,
	ExportFailedError,
	exportFileName,
	runExport,
} from "./export-service";

const source = makeExportSource();
const csv = { format: "csv", includeArchived: true } as const;

beforeEach(() => {
	jest.clearAllMocks();
	mockFiles.clear();
	mockWriteScratch.mockImplementation((content: string) => {
		mockFiles.set("scratch", content);
		return {
			uri: "scratch",
			name: "scratch",
			sizeBytes: new TextEncoder().encode(content).length,
		};
	});
});

describe("runExport", () => {
	it("writes one dated file, leaves nothing else behind, and returns what it holds", async () => {
		const result = await runExport({
			source,
			options: csv,
			today: EXPORT_TODAY,
		});

		expect(result).toMatchObject({
			name: "habits-2026-09-16.csv",
			mimeType: "text/csv",
			habits: 3,
			logs: 4,
		});
		expect([...mockFiles.keys()]).toEqual(["habits-2026-09-16.csv"]);
		expect(mockFiles.get("habits-2026-09-16.csv")).toContain("Línea uno");
	});

	it("writes JSON with the right extension and type", async () => {
		const result = await runExport({
			source,
			options: { format: "json", includeArchived: false },
			today: EXPORT_TODAY,
		});
		expect(result).toMatchObject({
			name: "habits-2026-09-16.json",
			mimeType: "application/json",
			habits: 2,
			logs: 3,
		});
	});

	it("records the last export only after the file is in place", async () => {
		mockSetSetting.mockImplementation(() => {
			expect(mockFiles.has("habits-2026-09-16.csv")).toBe(true);
		});
		await runExport({ source, options: csv, today: EXPORT_TODAY });
		expect(mockSetSetting).toHaveBeenCalledWith(
			"habits.lastExport",
			"2026-09-16",
		);
	});

	it("reports progress up to the full log count", async () => {
		const seen: { done: number; total: number }[] = [];
		await runExport({
			source,
			options: csv,
			today: EXPORT_TODAY,
			onProgress: (progress) => seen.push(progress),
		});
		expect(seen[seen.length - 1]).toEqual({ done: 4, total: 4 });
	});

	it("clears earlier exports first", async () => {
		mockFiles.set("habits-2026-08-01.csv", "old");
		await runExport({ source, options: csv, today: EXPORT_TODAY });
		expect(mockFiles.has("habits-2026-08-01.csv")).toBe(false);
	});

	it("cancel mid-export leaves no file and no last-export date", async () => {
		const controller = new AbortController();
		await expect(
			runExport({
				source,
				options: csv,
				today: EXPORT_TODAY,
				signal: controller.signal,
				onProgress: ({ done }) => {
					if (done >= 2) controller.abort();
				},
			}),
		).rejects.toBeInstanceOf(ExportCancelledError);

		expect(mockFiles.size).toBe(0);
		expect(mockWriteScratch).not.toHaveBeenCalled();
		expect(mockSetSetting).not.toHaveBeenCalled();
	});

	it("cancel after the scratch file is written deletes it", async () => {
		const controller = new AbortController();
		mockWriteScratch.mockImplementation((content: string) => {
			mockFiles.set("scratch", content);
			controller.abort();
			return { uri: "scratch", name: "scratch", sizeBytes: 1 };
		});
		await expect(
			runExport({
				source,
				options: csv,
				today: EXPORT_TODAY,
				signal: controller.signal,
			}),
		).rejects.toBeInstanceOf(ExportCancelledError);
		expect(mockFiles.size).toBe(0);
		expect(mockSetSetting).not.toHaveBeenCalled();
	});

	it("an out-of-storage failure says how much was needed, and leaves nothing behind", async () => {
		mockWriteScratch.mockImplementation(() => {
			mockFiles.set("scratch", "partial");
			throw Object.assign(new Error("No space left on device"), {});
		});
		const failure = await runExport({
			source,
			options: csv,
			today: EXPORT_TODAY,
		}).catch((error) => error);

		expect(failure).toBeInstanceOf(ExportFailedError);
		expect(failure.reason.kind).toBe("storage");
		// Counted in UTF-8 bytes, not characters: accents cost two.
		expect(failure.reason.neededBytes).toBeGreaterThan(300);
		expect(mockSetSetting).not.toHaveBeenCalled();
	});

	it("any other failure is reported as unknown, and last export is untouched", async () => {
		mockWriteScratch.mockImplementation(() => {
			throw new Error("boom");
		});
		const failure = await runExport({
			source,
			options: csv,
			today: EXPORT_TODAY,
		}).catch((error) => error);
		expect(failure.reason).toEqual({ kind: "unknown" });
		expect(mockSetSetting).not.toHaveBeenCalled();
	});

	it("a failing last-export write fails the export and removes the file", async () => {
		mockSetSetting.mockRejectedValue(new Error("db locked"));
		await expect(
			runExport({ source, options: csv, today: EXPORT_TODAY }),
		).rejects.toBeInstanceOf(ExportFailedError);
		expect(mockFiles.size).toBe(0);
	});
});

describe("exportFileName", () => {
	it("is dated by day", () => {
		expect(exportFileName(EXPORT_TODAY, "json")).toBe("habits-2026-09-16.json");
	});
});
