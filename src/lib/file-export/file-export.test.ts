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
	}
	class Directory {
		exists = true;
		uri = "cache/exports";
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

import { shareFile, shareText } from "./file-export";

beforeEach(() => jest.clearAllMocks());

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
