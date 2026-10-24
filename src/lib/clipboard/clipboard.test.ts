const mockShareText = jest.fn();

/** A fresh `clipboard` module; `expo-clipboard` is either a stub or absent from the build. */
function load(clipboard: { setStringAsync: jest.Mock } | "missing") {
	jest.resetModules();
	jest.doMock("@/lib/file-export/file-export", () => ({
		shareText: (...args: unknown[]) => mockShareText(...args),
	}));
	jest.doMock(
		"expo-clipboard",
		() => {
			if (clipboard === "missing") {
				throw new Error("Cannot find module 'expo-clipboard'");
			}
			return clipboard;
		},
		{ virtual: true },
	);
	return require("./clipboard") as typeof import("./clipboard");
}

beforeEach(() => jest.clearAllMocks());

describe("copyText", () => {
	it("puts the text on the clipboard when the native module is present", async () => {
		const setStringAsync = jest.fn().mockResolvedValue(true);
		const { copyText } = load({ setStringAsync });

		await expect(copyText("hello", "d.txt")).resolves.toBe("copied");

		expect(setStringAsync).toHaveBeenCalledWith("hello");
		expect(mockShareText).not.toHaveBeenCalled();
	});

	it("falls back to sharing a text file when the module isn't in this build", async () => {
		const { copyText } = load("missing");

		await expect(copyText("hello", "d.txt")).resolves.toBe("shared");

		expect(mockShareText).toHaveBeenCalledWith("hello", "d.txt");
	});

	it("a failing clipboard write rejects (the caller reports it)", async () => {
		const { copyText } = load({
			setStringAsync: jest.fn().mockRejectedValue(new Error("denied")),
		});
		await expect(copyText("x", "d.txt")).rejects.toThrow("denied");
	});
});
