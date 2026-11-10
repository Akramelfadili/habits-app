import { oklch } from "./oklch";

export type ColorScheme = "light" | "dark";

export const surfaceColors = {
	light: {
		bg: "#F4F3F1",
		card: "#FFFFFF",
		inner: "#EFEEEC",
		ink: "#1A1A19",
		/** The one accent (F-01): fills, selection, focus ring, intensity. Ink on paper. */
		accent: "#1A1A19",
		onAccent: "#FFFFFF",
		sub: "#5E5E5C",
		faint: "#6C6C69",
		border: "#E2E1DE",
		outline: "#898987",
		track: "#DEDDDA",
		toast: "#1A1A19",
		toastInk: "#FFFFFF",
		toastBtn: "rgba(255,255,255,0.14)",
		scrim: "rgba(26,26,25,0.32)",
		/** The floating tab-bar pill's fill (V3-01 bar B), under a blur; solid `card` with Reduce Transparency. */
		pillBg: "rgba(255,255,255,0.88)",
	},
	dark: {
		bg: "#1A1A1C",
		card: "#242427",
		inner: "#2E2E32",
		ink: "#EDEDEA",
		accent: "#EDEDEA",
		onAccent: "#1A1A1C",
		sub: "#A5A5A2",
		faint: "#9A9A97",
		border: "#343438",
		outline: "#777778",
		track: "#3A3A3E",
		toast: "#35353A",
		toastInk: "#EDEDEA",
		toastBtn: "rgba(255,255,255,0.14)",
		scrim: "rgba(0,0,0,0.60)",
		pillBg: "rgba(36,36,39,0.94)",
	},
} as const;

export const semanticColors = {
	light: {
		warnTint: "#FDF0D5",
		warnInk: "#966408",
		dangerBg: "#C9372F",
		frozenBg: "#EDE8F8",
		frozenInk: "#7A5AC4",
	},
	dark: {
		warnTint: "#3A2A0E",
		warnInk: "#E8A93A",
		dangerBg: "#E56059",
		frozenBg: "#262036",
		frozenInk: "#A98FE0",
	},
} as const;

export const typeScale = {
	stat: 30,
	/** VAR-14's single stat-card numeral (V2 consolidated V1's 28/30 sizes). */
	statCompact: 26,
	screenTitle: 24,
	section: 17,
	rowLabel: 15,
} as const;

/** Tracking (pt) for uppercase eyebrow text: `label` on stat cards, `eyebrow` on section labels and headers. */
export const letterSpacing = {
	label: 0.6,
	eyebrow: 1.2,
} as const;

/** SF Symbol sizes (pt): 12 badge and chip glyphs, 14 chevrons and small actions, 16 bar and field glyphs, 18 large header glyphs. */
export const iconSize = {
	xs: 12,
	s: 14,
	m: 16,
	l: 18,
} as const;

/**
 * The V3 type scale (F-03): nine styles, two weights (600 only for the
 * selected tab and today's weekday letter, applied at the call site). Lives
 * alongside the V1/V2 `typeScale` until each screen moves to it in its V3
 * batch. Nothing renders below 12 pt.
 * Numbers use tabular figures at the call site.
 */
export const textStyles = {
	display: { fontSize: 32, lineHeight: 38, fontWeight: "500" },
	stat: { fontSize: 26, lineHeight: 30, fontWeight: "500" },
	title: { fontSize: 20, lineHeight: 26, fontWeight: "500" },
	bodyLg: { fontSize: 17, lineHeight: 22, fontWeight: "400" },
	body: { fontSize: 16, lineHeight: 21, fontWeight: "400" },
	callout: { fontSize: 15, lineHeight: 20, fontWeight: "400" },
	subhead: { fontSize: 14, lineHeight: 19, fontWeight: "500" },
	footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
	caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
} as const;

export type TextStyleName = keyof typeof textStyles;

/**
 * Each style's size at Dynamic Type AX3, on the iOS text-style ramp (F-03).
 * subhead and footnote are 36, not the mockup's 34 / 33: T-30 moves them onto
 * the iOS ramp.
 */
export const textStylesAx3: Record<TextStyleName, number> = {
	display: 52,
	stat: 48,
	title: 43,
	bodyLg: 40,
	body: 38,
	callout: 36,
	subhead: 36,
	footnote: 36,
	caption: 32,
};

/**
 * Spacing scale (F-04), in pt. Keys follow the mockup's names (value × 25):
 * its `space-350` is `space[350]`, 14 pt. Odd one-offs (9, 11, 18, 22) snap to the
 * nearest step. `space[400]` is for AX sizes only (card padding and gaps).
 */
export const space = {
	50: 2,
	100: 4,
	150: 6,
	200: 8,
	250: 10,
	300: 12,
	350: 14,
	400: 16,
	500: 20,
	600: 24,
	800: 32,
} as const;

/**
 * Radius scale (F-05). `l` is every card, banner and field; `xl` the sheet's
 * top corners; `pill` buttons, chips, segmented, toggle, toast and circles.
 * Completion cells and icon squares use the size rules below instead.
 */
export const radius = {
	xs: 4,
	s: 8,
	m: 14,
	l: 20,
	xl: 28,
	pill: 999,
} as const;

/** F-05 cell rule: a completion cell's radius is floor(size ÷ 3) — 12→4, 16→5, 24→8, 40→13. */
export function cellRadius(size: number): number {
	return Math.floor(size / 3);
}

/** F-05 square rule: an icon square's radius is round(size × 0.31) — 28→9, 32→10, 56→17. */
export function squareRadius(size: number): number {
	return Math.round(size * 0.31);
}

/**
 * Elevation (F-06) for the things that float. Flat by default: E0 screen and
 * E1 card (a surface step plus a hairline) never get a shadow, and E4 sheet is
 * the bg surface over the scrim. In dark, height mostly reads as a lighter
 * surface; the shadows are kept but do little.
 */
export const elevation = {
	light: {
		/** E2: a lifted (reordering) row, a menu. */
		lifted: { boxShadow: "0 10px 28px rgba(26,26,25,0.14)" },
		/** E3: a toast floating above the tab bar. */
		toast: { boxShadow: "0 18px 44px rgba(26,26,25,0.18)" },
		/** The floating tab-bar pill (V3-01 bar B). */
		pill: { boxShadow: "0 8px 24px rgba(26,26,25,0.10)" },
	},
	dark: {
		lifted: { boxShadow: "0 10px 28px rgba(0,0,0,0.50)" },
		toast: { boxShadow: "0 18px 44px rgba(0,0,0,0.55)" },
		pill: { boxShadow: "0 8px 24px rgba(0,0,0,0.45)" },
	},
} as const;

/** Every tappable element's hit area is at least this square, even when the visual is smaller (F-06, T-11). */
export const minTouchTarget = 44;

/** How far Dynamic Type may grow text in the 44 pt inline bar and the header pills; like iOS's own bars they hold their size beyond it (08.6). */
export const barMaxFontMultiplier = 1.3;

/** Focus ring (F-06, T-13): a gap in the surface colour, then the accent; follows the element's radius. */
export const focusRing = {
	gap: 2,
	width: 2,
} as const;

/** The focus ring as a `boxShadow`, drawn on `surface` (the colour the element sits on). */
export function focusRingShadow(surface: string, scheme: ColorScheme): string {
	const outer = focusRing.gap + focusRing.width;
	return `0 0 0 ${focusRing.gap}px ${surface}, 0 0 0 ${outer}px ${surfaceColors[scheme].accent}`;
}

/** A CSS-style cubic-bezier, as `Easing.bezier(...)` takes it. */
type Bezier = readonly [number, number, number, number];

const EASE: Bezier = [0.25, 0.1, 0.25, 1];
const EASE_OUT: Bezier = [0, 0, 0.58, 1];

/**
 * Motion (F-07): motion confirms an action, it never decorates. Durations in
 * ms. `reduced` is what Reduce Motion does instead; Undo timings never change.
 */
export const motion = {
	/** Buttons, rows, circles scale to 92–98 %. */
	press: {
		duration: 100,
		easing: EASE_OUT,
		scale: { min: 0.92, max: 0.98 },
		reduced: { opacity: 0.7 },
	},
	/** Circle fill, chip select, toggle, segmented. */
	state: { duration: 200, easing: EASE, reduced: { crossfade: 150 } },
	/** Bar, ring and pie fills; Reduce Motion jumps to the value. */
	fill: { duration: 450, easing: [0.22, 1, 0.36, 1] as Bezier },
	/** Today's day switch: crossfade + slide; Reduce Motion crossfades only. */
	daySwitch: { duration: 160, slide: 12 },
	/** Sheet / push: the iOS spring (≈ 340 ms) and the iOS default; Reduce Motion uses the system crossfade. */
	sheet: { duration: 340 },
	/**
	 * Rise + fade; Reduce Motion fades only. `hold` is how long each tone stays
	 * up (V3-26); errors stay until Retry or swipe, so they have none.
	 */
	toast: {
		in: 200,
		out: 200,
		rise: 12,
		/** Reduce Motion: a crossfade, no rise. */
		reduced: { crossfade: 150 },
		/**
		 * Info and success are read in a glance, so they go quickly (3 s); an Undo
		 * has to be reachable (5 s, the spec); a warning needs reading (6 s).
		 */
		hold: { undo: 5000, info: 3000, warning: 6000 },
		/**
		 * A toast raised by the action that also changes screen (archive, then
		 * back) survives that navigation; one already up this long is dismissed
		 * when the screen changes.
		 */
		navigationGrace: 600,
	},
	/** Reorder lift (+ `elevation.lifted`); Reduce Motion keeps the shadow only. */
	reorder: { duration: 160, liftScale: 1.02 },
	/** Runs once; Reduce Motion shows a static check. */
	celebrate: { duration: 600 },
	/** Loops, and only appears after `delay`; Reduce Motion is static. */
	skeleton: { loop: 1200, delay: 300, easing: [0.42, 0, 0.58, 1] as Bezier },
} as const;

/**
 * Shared press/disabled feedback for every interactive primitive, so the same
 * state reads identically across Button, Chip, Stepper, etc.
 */
export const interactionOpacity = {
	pressed: 0.7,
	disabled: 0.4,
	/** A row that's present but not the focus — e.g. Retro log's not-yet-done habits (HAB-10). */
	dimmed: 0.5,
} as const;

/**
 * A habit's accent hue — its category's (HAB-24). `null` is the neutral
 * accent (built-in "Other"): it renders with the monochrome chrome tokens
 * (`sub`/`inner`), deliberately outside the color system.
 */
export type AccentHue = number | null;

/** Base accent color (icon/dot fill) — `ink(hue)` from design-system.md. */
export function habitAccentInk(hue: AccentHue, scheme: ColorScheme): string {
	if (hue === null) return surfaceColors[scheme].sub;
	return scheme === "light" ? oklch(0.56, 0.18, hue) : oklch(0.78, 0.15, hue);
}

/** Soft tint behind an accent icon — `tint(hue)` from design-system.md. */
export function habitAccentTint(hue: AccentHue, scheme: ColorScheme): string {
	if (hue === null) return surfaceColors[scheme].inner;
	return scheme === "light" ? oklch(0.93, 0.045, hue) : oklch(0.3, 0.085, hue);
}

/** A completion level, 0 (nothing / missed) to 3 (complete) — V3-05's intensity steps. */
export type IntensityLevel = 0 | 1 | 2 | 3;

/** T-05 / F-02: the accent mixed into the track at 0 / 28 / 58 / 100 %. */
export const intensityMix = [0, 0.28, 0.58, 1] as const;

/** Edge length of a partial cell's corner notch, as a share of the cell (T-24). */
export const notchShare = 0.22;

function hexChannels(hex: string): [number, number, number] {
	const value = Number.parseInt(hex.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mixHex(from: string, to: string, share: number): string {
	const [a, b] = [hexChannels(from), hexChannels(to)];
	const mixed = a.map((channel, index) =>
		Math.round(channel + (b[index] - channel) * share),
	);
	return `rgb(${mixed.join(",")})`;
}

/**
 * The fill of a completion cell at `level` (V3-05): the one accent mixed into
 * the track. One meaning for colour — never a habit or category hue (T-05).
 */
export function intensityColor(
	level: IntensityLevel,
	scheme: ColorScheme,
): string {
	const { track, accent } = surfaceColors[scheme];
	return mixHex(track, accent, intensityMix[level]);
}

function luminance([red, green, blue]: [number, number, number]): number {
	const [r, g, b] = [red, green, blue].map((channel) => {
		const unit = channel / 255;
		return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio of two `#rrggbb` / `rgb(r,g,b)` colours. */
export function contrastRatio(first: string, second: string): number {
	const parse = (color: string): [number, number, number] =>
		color.startsWith("rgb(")
			? (color.slice(4, -1).split(",").map(Number) as [number, number, number])
			: hexChannels(color);
	const [a, b] = [luminance(parse(first)), luminance(parse(second))].sort(
		(x, y) => y - x,
	);
	return (a + 0.05) / (b + 0.05);
}

/** The text colour that reads best on `fill`: ink or onAccent, whichever contrasts more. */
export function readableInk(fill: string, scheme: ColorScheme): string {
	const { ink, onAccent } = surfaceColors[scheme];
	return contrastRatio(fill, ink) >= contrastRatio(fill, onAccent)
		? ink
		: onAccent;
}

/**
 * Today's ring on a cell (V3-05): a gap in the surface colour, then the ink.
 * A `boxShadow`, so it hugs the cell's radius without taking layout space.
 */
export function todayRingShadow(surface: string, scheme: ColorScheme): string {
	return `0 0 0 1.5px ${surface}, 0 0 0 3px ${surfaceColors[scheme].ink}`;
}

/** A completed or partial day's level in a habit's own history grid (1 partial under half … 3 complete). */
export type HeatmapLevel = 1 | 2 | 3;
