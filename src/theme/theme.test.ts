import {
	habitAccentInk,
	habitAccentTint,
	heatmapLevelColor,
	surfaceColors,
} from "./theme";

const HUES = [25, 150, 300, 255, 75];

describe("habit accent colors", () => {
	it("produces a distinct ink color per hue, per scheme", () => {
		const light = HUES.map((hue) => habitAccentInk(hue, "light"));
		expect(new Set(light).size).toBe(HUES.length);

		const dark = HUES.map((hue) => habitAccentInk(hue, "dark"));
		expect(new Set(dark).size).toBe(HUES.length);
	});

	it("produces a tint distinct from the base ink for the same hue", () => {
		for (const hue of HUES) {
			expect(habitAccentTint(hue, "light")).not.toBe(
				habitAccentInk(hue, "light"),
			);
			expect(habitAccentTint(hue, "dark")).not.toBe(
				habitAccentInk(hue, "dark"),
			);
		}
	});

	it("renders the null hue (Other) with the neutral chrome tokens", () => {
		expect(habitAccentInk(null, "light")).toBe(surfaceColors.light.sub);
		expect(habitAccentTint(null, "light")).toBe(surfaceColors.light.inner);
		expect(habitAccentInk(null, "dark")).toBe(surfaceColors.dark.sub);
		expect(habitAccentTint(null, "dark")).toBe(surfaceColors.dark.inner);
	});
});

describe("heatmap ramp", () => {
	it("gives three distinct steps per hue", () => {
		const levels = ([1, 2, 3] as const).map((level) =>
			heatmapLevelColor(230, level, "light"),
		);
		expect(new Set(levels).size).toBe(3);
	});

	it("differs between light and dark for the same step", () => {
		expect(heatmapLevelColor(195, 2, "light")).not.toBe(
			heatmapLevelColor(195, 2, "dark"),
		);
	});

	it("gives the neutral hue three distinct grey steps", () => {
		const levels = ([1, 2, 3] as const).map((level) =>
			heatmapLevelColor(null, level, "light"),
		);
		expect(new Set(levels).size).toBe(3);
	});
});
