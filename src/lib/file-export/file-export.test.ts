const mockPickDirectory = jest.fn();
const mockCopy = jest.fn();
const mockShare = jest.fn();
const mockCreate = jest.fn();
const mockWrite = jest.fn();

jest.mock("expo-file-system", () => {
	class File {
		uri: string;
		size = 3;
		exists = false;
		constructor(...parts: unknown[]) {
			this.uri = parts.map(String).join("/");
		}
		create = (...args: unknown[]) => mockCreate(...args);
		writeSync = (...args: unknown[]) => mockWrite(...args);
		copy = (...args: unknown[]) => mockCopy(...args);
	}
	class Directory {
		exists = true;
		uri = "cache/exports";
		static pickDirectoryAsync = (...args: unknown[]) =>
			mockPickDirectory(...args);
		constructor(..._parts: unknown[]) {}
		create() {}
		list() {
			return [];
		}
	}
	return { File, Directory, Paths: { cache: "cache" } };
});
jest.mock("expo-sharing", () => ({
	shareAsync: (...args: unknown[]) => mockShare(...args),
}));

import {
	isPickerCancellation,
	saveFileToFolder,
	shareFile,
	shareText,
} from "./file-export";

beforeEach(() => jest.clearAllMocks());

describe("isPickerCancellation", () => {
	it.each([
		[{ code: "ERR_FILE_PICKING_CANCELLED", message: "x" }],
		[{ message: "File picking was cancelled by the user" }],
	])("recognises the iOS cancel (%j)", (error) => {
		expect(isPickerCancellation(error)).toBe(true);
	});

	it.each([
		[new Error("No view controller available for presenting file picker")],
		[{ code: "ERR_FILE_PICKING_FAILED", message: "No view controller" }],
		["a string"],
		[null],
	])("does not mistake a real failure for a cancel (%j)", (error) => {
		expect(isPickerCancellation(error)).toBe(false);
	});
});

describe("saveFileToFolder", () => {
	it("copies the export into the picked folder", async () => {
		const folder = { uri: "picked" };
		mockPickDirectory.mockResolvedValue(folder);

		await expect(saveFileToFolder("file:///a.csv")).resolves.toBe(true);

		expect(mockCopy).toHaveBeenCalledWith(folder);
	});

	it("resolves false — not an error — when the person backs out of the picker", async () => {
		mockPickDirectory.mockRejectedValue(
			Object.assign(new Error("File picking was cancelled by the user"), {
				code: "ERR_FILE_PICKING_CANCELLED",
			}),
		);

		await expect(saveFileToFolder("file:///a.csv")).resolves.toBe(false);
		expect(mockCopy).not.toHaveBeenCalled();
	});

	it("rejects with the real error when the picker fails for another reason", async () => {
		const failure = new Error(
			"No view controller available for presenting file picker",
		);
		mockPickDirectory.mockRejectedValue(failure);

		await expect(saveFileToFolder("file:///a.csv")).rejects.toBe(failure);
	});

	it("rejects when the copy itself fails (out of space, permission)", async () => {
		mockPickDirectory.mockResolvedValue({ uri: "picked" });
		mockCopy.mockRejectedValue(new Error("No space left on device"));

		await expect(saveFileToFolder("file:///a.csv")).rejects.toThrow(
			"No space left",
		);
	});
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
