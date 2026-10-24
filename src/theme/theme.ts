import { oklch } from "./oklch";

export type ColorScheme = "light" | "dark";

export const surfaceColors = {
	light: {
		bg: "#F4F3F1",
		card: "#FFFFFF",
		inner: "#EFEEEC",
		ink: "#1A1A19",
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
	},
	dark: {
		bg: "#1A1A1C",
		card: "#242427",
		inner: "#2E2E32",
		ink: "#EDEDEA",
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
	/** The 10px eyebrow label on a stat card. */
	micro: 10,
	screenTitle: 24,
	section: 17,
	rowLabel: 15,
	subtitle: 12.5,
	caption: 11,
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

/** Heatmap shading steps for a completed/partial day — level 0 is the neutral `track`, not a hue. */
export type HeatmapLevel = 1 | 2 | 3;

const HEATMAP_RAMP = {
	light: { l: [0.88, 0.76, 0.6], c: [0.05, 0.09, 0.15] },
	dark: { l: [0.4, 0.52, 0.66], c: [0.09, 0.12, 0.16] },
} as const;

const INK_RAMP = {
	light: [0.8, 0.62, 0.2],
	dark: [0.38, 0.55, 0.95],
} as const;

/**
 * The monochrome ramp for grids that aren't one habit's (the Monthly
 * calendar, HAB-16): light grey → near-ink, so a perfect day is the darkest
 * (lightest in dark mode) cell on the page.
 */
export function inkLevelColor(
	level: HeatmapLevel,
	scheme: ColorScheme,
): string {
	return oklch(INK_RAMP[scheme][level - 1], 0, 0);
}

/** One step of an accent's 3-level heatmap ramp (design-system.md). */
export function heatmapLevelColor(
	hue: AccentHue,
	level: HeatmapLevel,
	scheme: ColorScheme,
): string {
	const ramp = HEATMAP_RAMP[scheme];
	// The neutral accent keeps the same lightness steps with no chroma — grey.
	const chroma = hue === null ? 0 : ramp.c[level - 1];
	return oklch(ramp.l[level - 1], chroma, hue ?? 0);
}
