import { oklch } from "./oklch";

describe("oklch", () => {
	it("converts L=0 to black", () => {
		expect(oklch(0, 0, 0)).toBe("#000000");
	});

	it("converts L=1, C=0 to white", () => {
		expect(oklch(1, 0, 0)).toBe("#ffffff");
	});

	it("produces a valid 7-character hex string for a chromatic color", () => {
		const result = oklch(0.56, 0.18, 230);
		expect(result).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("produces different colors for different hues at the same lightness/chroma", () => {
		const blue = oklch(0.56, 0.18, 230);
		const orange = oklch(0.56, 0.18, 60);
		expect(blue).not.toBe(orange);
	});
});
