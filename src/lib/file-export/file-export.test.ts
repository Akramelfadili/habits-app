const mockShare = jest.fn();
const mockWrite = jest.fn();

const mockDisk = new Set<string>();
const mockStuck = new Set<string>();
const mockEvents: string[] = [];

jest.mock("expo-file-system", () => {
	class File {
		uri: string;
		size = 3;
		constructor(...parts: unknown[]) {
			this.uri = parts.map(String).join("/");
		}
		get exists() {
			return mockDisk.has(this.uri);
		}
		create() {
			mockDisk.add(this.uri);
		}
		writeSync = (...args: unknown[]) => mockWrite(...args);
		/** Like expo-file-system: the file keeps existing, at the target's uri. */
		moveSync(target: File) {
			mockDisk.delete(this.uri);
			this.uri = target.uri;
			mockDisk.add(this.uri);
		}
		delete() {
			if (mockStuck.has(this.uri)) throw new Error("Operation not permitted");
			mockEvents.push(`delete ${this.uri}`);
			mockDisk.delete(this.uri);
		}
	}
	class Directory {
		uri: string;
		constructor(...parts: unknown[]) {
			this.uri = parts.map(String).join("/");
		}
		toString() {
			return this.uri;
		}
		get exists() {
			return true;
		}
		create() {}
		list() {
			return [...mockDisk]
				.filter((uri) => uri.startsWith(`${this.uri}/`))
				.map((uri) => new File(uri));
		}
	}
	return { File, Directory, Paths: { cache: "cache" } };
});
jest.mock("expo-sharing", () => ({
	shareAsync: (...args: unknown[]) => mockShare(...args),
}));

import { clearLog, getLogEntries } from "@/lib/logger/logger";
import {
	clearExports,
	discardFile,
	promoteScratchFile,
	shareFile,
	shareText,
	writeScratchFile,
} from "./file-export";

beforeEach(() => {
	jest.clearAllMocks();
	mockDisk.clear();
	mockStuck.clear();
	mockEvents.length = 0;
	mockShare.mockReset().mockImplementation(async () => {
		mockEvents.push("share");
	});
	clearLog();
});

describe("shareFile / shareText", () => {
	it("shares with the file's type", async () => {
		await shareFile("file:///a.json", "application/json");
		expect(mockShare).toHaveBeenCalledWith("file:///a.json", {
			mimeType: "application/json",
			UTI: "public.json",
		});
	});

	it("shareText writes a .txt file and shares it", async () => {
		await shareText("hello", "diagnostics.txt");
		expect(mockWrite).toHaveBeenCalledWith("hello", { encoding: "utf8" });
		expect(mockShare).toHaveBeenCalledWith(
			expect.stringContaining("diagnostics.txt"),
			{
				mimeType: "text/plain",
				UTI: "public.plain-text",
			},
		);
	});

	it("a share failure rejects with the real error", async () => {
		mockShare.mockRejectedValue(new Error("no activity"));
		await expect(shareFile("file:///a.csv", "text/csv")).rejects.toThrow(
			"no activity",
		);
	});
});

describe("the shared file is deleted", () => {
	it("deletes an export after the share sheet resolves, not before", async () => {
		mockDisk.add("file:///exports/habits.json");
		await shareFile("file:///exports/habits.json", "application/json");
		expect(mockEvents).toEqual(["share", "delete file:///exports/habits.json"]);
		expect(mockDisk.has("file:///exports/habits.json")).toBe(false);
	});

	it("keeps the file when the share fails, so Retry has something to send", async () => {
		mockDisk.add("file:///exports/habits.csv");
		mockShare.mockRejectedValue(new Error("no activity"));
		await expect(
			shareFile("file:///exports/habits.csv", "text/csv"),
		).rejects.toThrow();
		expect(mockDisk.has("file:///exports/habits.csv")).toBe(true);
	});

	it("deletes diagnostics.txt after it is shared", async () => {
		await shareText("hello", "diagnostics.txt");
		expect(mockEvents[0]).toBe("share");
		expect(mockEvents[1]).toMatch(/^delete .*diagnostics\.txt$/);
		expect([...mockDisk]).toEqual([]);
	});

	it("a failed delete is logged, never thrown", async () => {
		mockDisk.add("file:///exports/stuck.json");
		mockStuck.add("file:///exports/stuck.json");
		await expect(
			shareFile("file:///exports/stuck.json", "application/json"),
		).resolves.toBeUndefined();
		const logged = getLogEntries().filter(
			(entry) => entry.event === "export.cleanup_failed",
		);
		expect(logged).toHaveLength(1);
		expect(logged[0].level).toBe("warn");
	});

	it("a file that is already gone is not an error", async () => {
		await expect(
			shareFile("file:///exports/gone.json", "application/json"),
		).resolves.toBeUndefined();
		expect(
			getLogEntries().some((e) => e.event === "export.cleanup_failed"),
		).toBe(false);
	});
});

describe("clearExports", () => {
	it("removes every file left in the exports folder", () => {
		mockDisk.add("cache/exports/habits-2026-09-16.json");
		mockDisk.add("cache/exports/diagnostics.txt");
		mockDisk.add("cache/exports/export-1.partial");
		clearExports();
		expect([...mockDisk]).toEqual([]);
	});
});

describe("scratch files", () => {
	it("writes the text to a .partial file in the exports folder", () => {
		const scratch = writeScratchFile("{}");
		expect(mockWrite).toHaveBeenCalledWith("{}", { encoding: "utf8" });
		expect(scratch.name).toMatch(/^export-\d+\.partial$/);
		expect(scratch.uri).toBe(`cache/exports/${scratch.name}`);
		expect(scratch.sizeBytes).toBe(3);
		expect(mockDisk.has(scratch.uri)).toBe(true);
	});

	it("promotes a scratch file to its final name and leaves no .partial behind", () => {
		const scratch = writeScratchFile("{}");
		const done = promoteScratchFile(scratch, "habits-2026-11-10.json");
		expect(done).toEqual({
			uri: "cache/exports/habits-2026-11-10.json",
			name: "habits-2026-11-10.json",
			sizeBytes: 3,
		});
		expect([...mockDisk]).toEqual(["cache/exports/habits-2026-11-10.json"]);
	});

	it("replaces an earlier export of the same name when promoting", () => {
		mockDisk.add("cache/exports/habits-2026-11-10.json");
		const scratch = writeScratchFile("{}");
		promoteScratchFile(scratch, "habits-2026-11-10.json");
		expect(mockEvents).toEqual(["delete cache/exports/habits-2026-11-10.json"]);
		expect([...mockDisk]).toEqual(["cache/exports/habits-2026-11-10.json"]);
	});
});

describe("discardFile", () => {
	it("deletes a file that exists", () => {
		mockDisk.add("file:///exports/a.json");
		discardFile("file:///exports/a.json");
		expect(mockDisk.has("file:///exports/a.json")).toBe(false);
	});

	it("does nothing for a file that is already gone", () => {
		expect(() => discardFile("file:///exports/gone.json")).not.toThrow();
		expect(mockEvents).toEqual([]);
	});

	it("swallows a delete that throws, and says nothing", () => {
		mockDisk.add("file:///exports/stuck.json");
		mockStuck.add("file:///exports/stuck.json");
		expect(() => discardFile("file:///exports/stuck.json")).not.toThrow();
		expect(mockDisk.has("file:///exports/stuck.json")).toBe(true);
	});
});
