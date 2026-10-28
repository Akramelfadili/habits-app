import {
	cellRadius,
	elevation,
	focusRingShadow,
	habitAccentInk,
	habitAccentTint,
	motion,
	radius,
	space,
	squareRadius,
	surfaceColors,
	textStyles,
	textStylesAx3,
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

describe("V3 type scale (F-03)", () => {
	it("has the nine styles at the spec's size / line height / weight", () => {
		const spec = Object.fromEntries(
			Object.entries(textStyles).map(([name, style]) => [
				name,
				`${style.fontSize}/${style.lineHeight}·${style.fontWeight}`,
			]),
		);
		expect(spec).toEqual({
			display: "32/38·500",
			stat: "26/30·500",
			title: "20/26·500",
			bodyLg: "17/22·400",
			body: "16/21·400",
			callout: "15/20·400",
			subhead: "14/19·500",
			footnote: "13/18·400",
			caption: "12/16·500",
		});
	});

	it("never goes below 12 pt and uses none of the retired sizes", () => {
		for (const { fontSize } of Object.values(textStyles)) {
			expect(fontSize).toBeGreaterThanOrEqual(12);
			expect([10, 10.5, 11, 11.5, 12.5]).not.toContain(fontSize);
		}
	});

	it("gives every style its AX3 size (subhead and footnote on the iOS ramp, T-30)", () => {
		expect(textStylesAx3).toEqual({
			display: 52,
			stat: 48,
			title: 43,
			bodyLg: 40,
			body: 38,
			callout: 36,
			subhead: 36,
			footnote: 36,
			caption: 32,
		});
	});
});

describe("spacing scale (F-04)", () => {
	it("names every step value × 25", () => {
		for (const [name, value] of Object.entries(space)) {
			expect(value * 25).toBe(Number(name));
		}
	});

	it("has exactly the spec's steps", () => {
		expect(Object.values(space)).toEqual([
			2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32,
		]);
	});
});

describe("radius scale (F-05)", () => {
	it("has the six named radii", () => {
		expect(radius).toEqual({ xs: 4, s: 8, m: 14, l: 20, xl: 28, pill: 999 });
	});

	it("cell rule is floor(size ÷ 3)", () => {
		expect([12, 16, 24, 40].map(cellRadius)).toEqual([4, 5, 8, 13]);
	});

	it("square rule is round(size × 0.31)", () => {
		expect([28, 32, 56].map(squareRadius)).toEqual([9, 10, 17]);
	});
});

describe("elevation and focus (F-06)", () => {
	it("gives the master file's three floating shadows per scheme", () => {
		expect(elevation).toEqual({
			light: {
				lifted: { boxShadow: "0 10px 28px rgba(26,26,25,0.14)" },
				toast: { boxShadow: "0 18px 44px rgba(26,26,25,0.18)" },
				pill: { boxShadow: "0 8px 24px rgba(26,26,25,0.10)" },
			},
			dark: {
				lifted: { boxShadow: "0 10px 28px rgba(0,0,0,0.50)" },
				toast: { boxShadow: "0 18px 44px rgba(0,0,0,0.55)" },
				pill: { boxShadow: "0 8px 24px rgba(0,0,0,0.45)" },
			},
		});
	});

	it("draws the focus ring as a 2 pt surface gap then 2 pt of accent", () => {
		expect(focusRingShadow("#FFFFFF", "light")).toBe(
			`0 0 0 2px #FFFFFF, 0 0 0 4px ${surfaceColors.light.accent}`,
		);
		expect(focusRingShadow(surfaceColors.dark.bg, "dark")).toBe(
			`0 0 0 2px ${surfaceColors.dark.bg}, 0 0 0 4px ${surfaceColors.dark.accent}`,
		);
	});
});

describe("motion (F-07)", () => {
	it("keeps the spec's durations", () => {
		expect({
			press: motion.press.duration,
			state: motion.state.duration,
			fill: motion.fill.duration,
			daySwitch: motion.daySwitch.duration,
			toastIn: motion.toast.in,
			toastOut: motion.toast.out,
			toastHold: motion.toast.hold,
			reorder: motion.reorder.duration,
			celebrate: motion.celebrate.duration,
			skeletonLoop: motion.skeleton.loop,
			skeletonDelay: motion.skeleton.delay,
		}).toEqual({
			press: 100,
			state: 200,
			fill: 450,
			daySwitch: 160,
			toastIn: 240,
			toastOut: 180,
			toastHold: { undo: 5000, info: 4000, warning: 6000 },
			reorder: 160,
			celebrate: 600,
			skeletonLoop: 1200,
			skeletonDelay: 300,
		});
	});

	it("press scales within 92–98 % and Reduce Motion flashes to 70 %", () => {
		expect(motion.press.scale).toEqual({ min: 0.92, max: 0.98 });
		expect(motion.press.reduced.opacity).toBe(0.7);
	});
});

describe("accent (F-01)", () => {
	it("is ink on paper in both schemes", () => {
		expect(surfaceColors.light.accent).toBe(surfaceColors.light.ink);
		expect(surfaceColors.dark.accent).toBe(surfaceColors.dark.ink);
	});
});
