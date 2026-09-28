import {
	HABIT_ACCENT_KEYS,
	habitAccentInk,
	habitAccentTint,
	heatmapLevelColor,
} from "./theme";

describe("habit accent colors", () => {
	it("has exactly 6 confirmed accent keys", () => {
		expect(HABIT_ACCENT_KEYS).toHaveLength(6);
	});

	it("produces a distinct ink color per accent, per scheme", () => {
		const light = HABIT_ACCENT_KEYS.map((key) => habitAccentInk(key, "light"));
		expect(new Set(light).size).toBe(HABIT_ACCENT_KEYS.length);

		const dark = HABIT_ACCENT_KEYS.map((key) => habitAccentInk(key, "dark"));
		expect(new Set(dark).size).toBe(HABIT_ACCENT_KEYS.length);
	});

	it("produces a tint distinct from the base ink for the same accent", () => {
		for (const key of HABIT_ACCENT_KEYS) {
			expect(habitAccentTint(key, "light")).not.toBe(
				habitAccentInk(key, "light"),
			);
			expect(habitAccentTint(key, "dark")).not.toBe(
				habitAccentInk(key, "dark"),
			);
		}
	});
});

describe("heatmap ramp", () => {
	it("gives three distinct steps per accent", () => {
		const levels = ([1, 2, 3] as const).map((level) =>
			heatmapLevelColor("blue", level, "light"),
		);
		expect(new Set(levels).size).toBe(3);
	});

	it("differs between light and dark for the same step", () => {
		expect(heatmapLevelColor("teal", 2, "light")).not.toBe(
			heatmapLevelColor("teal", 2, "dark"),
		);
	});
});
