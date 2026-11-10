import { oklch } from "./oklch";

export type ColorScheme = "light" | "dark";

export const surfaceColors = {
	light: {
		bg: "#F4F3F1",
		card: "#FFFFFF",
		inner: "#EFEEEC",
		ink: "#1A1A19",
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
		warnInk: "#946208",
		dangerBg: "#C7362F",
		frozenBg: "#EDE8F8",
		frozenInk: "#7858C3",
	},
	dark: {
		warnTint: "#3A2A0E",
		warnInk: "#E8A93A",
		dangerBg: "#E8716B",
		frozenBg: "#262036",
		frozenInk: "#A98FE0",
	},
} as const;

export const typeScale = {
	stat: 30,
	statCompact: 26,
	screenTitle: 24,
	section: 17,
	rowLabel: 15,
} as const;

export const letterSpacing = {
	label: 0.6,
	eyebrow: 1.2,
} as const;

export const iconSize = {
	xs: 12,
	s: 14,
	m: 16,
	l: 18,
} as const;

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

// subhead and footnote are 36 at AX3, not the mockup's 34 / 33, to sit on the iOS ramp.
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

// Keys are the mockup's names (value x 25); `space[400]` is for AX sizes only.
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

export const radius = {
	xs: 4,
	s: 8,
	m: 14,
	l: 20,
	xl: 28,
	pill: 999,
} as const;

export function cellRadius(size: number): number {
	return Math.floor(size / 3);
}

export function squareRadius(size: number): number {
	return Math.round(size * 0.31);
}

// Flat by default: E0 screen and E1 card never get a shadow. In dark, height reads as a lighter surface.
export const elevation = {
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
} as const;

export const minTouchTarget = 44;

// Like iOS's own bars, the inline bar and header pills hold their size beyond this Dynamic Type step.
export const barMaxFontMultiplier = 1.3;

const focusRing = {
	gap: 2,
	width: 2,
} as const;

export function focusRingShadow(surface: string, scheme: ColorScheme): string {
	const outer = focusRing.gap + focusRing.width;
	return `0 0 0 ${focusRing.gap}px ${surface}, 0 0 0 ${outer}px ${surfaceColors[scheme].accent}`;
}

type Bezier = readonly [number, number, number, number];

const EASE: Bezier = [0.25, 0.1, 0.25, 1];
const EASE_OUT: Bezier = [0, 0, 0.58, 1];

export const motion = {
	press: {
		duration: 100,
		easing: EASE_OUT,
		scale: { min: 0.92, max: 0.98 },
		reduced: { opacity: 0.7 },
	},
	state: { duration: 200, easing: EASE, reduced: { crossfade: 150 } },
	fill: { duration: 450, easing: [0.22, 1, 0.36, 1] as Bezier },
	daySwitch: { duration: 160, slide: 12 },
	sheet: { duration: 340 },
	// Errors have no `hold`: they stay until Retry or swipe.
	toast: {
		in: 200,
		out: 200,
		rise: 12,
		reduced: { crossfade: 150 },
		// Info and success are read at a glance (3 s); an Undo must stay reachable (5 s); a warning needs reading (6 s).
		hold: { undo: 5000, info: 3000, warning: 6000 },
		// A toast raised by an action that also navigates (archive, then back) survives that
		// navigation; one already up this long is dismissed on a screen change.
		navigationGrace: 600,
	},
	reorder: { duration: 160, liftScale: 1.02 },
	celebrate: { duration: 600 },
	skeleton: { loop: 1200, delay: 300, easing: [0.42, 0, 0.58, 1] as Bezier },
} as const;

export const interactionOpacity = {
	pressed: 0.7,
	disabled: 0.4,
	dimmed: 0.5,
} as const;

// A `null` hue (built-in "Other") renders with the monochrome chrome tokens, deliberately outside the color system.
export type AccentHue = number | null;

export function habitAccentInk(hue: AccentHue, scheme: ColorScheme): string {
	if (hue === null) return surfaceColors[scheme].sub;
	return scheme === "light" ? oklch(0.56, 0.18, hue) : oklch(0.78, 0.15, hue);
}

export function habitAccentTint(hue: AccentHue, scheme: ColorScheme): string {
	if (hue === null) return surfaceColors[scheme].inner;
	return scheme === "light" ? oklch(0.93, 0.045, hue) : oklch(0.3, 0.085, hue);
}

export type IntensityLevel = 0 | 1 | 2 | 3;

const intensityMix = [0, 0.28, 0.58, 1] as const;

export const notchShare = 0.22;

function hexChannels(hex: string): [number, number, number] {
	const value = Number.parseInt(hex.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mixHex(from: string, to: string, share: number): string {
	const [fromRed, fromGreen, fromBlue] = hexChannels(from);
	const [toRed, toGreen, toBlue] = hexChannels(to);
	const mix = (start: number, end: number) =>
		Math.round(start + (end - start) * share);
	return `rgb(${mix(fromRed, toRed)},${mix(fromGreen, toGreen)},${mix(fromBlue, toBlue)})`;
}

export function intensityColor(
	level: IntensityLevel,
	scheme: ColorScheme,
): string {
	const { track, accent } = surfaceColors[scheme];
	return mixHex(track, accent, intensityMix[level]);
}

function luminance([red, green, blue]: [number, number, number]): number {
	const linear = (channel: number) => {
		const unit = channel / 255;
		return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

export function contrastRatio(first: string, second: string): number {
	const parse = (color: string): [number, number, number] =>
		color.startsWith("rgb(")
			? (color.slice(4, -1).split(",").map(Number) as [number, number, number])
			: hexChannels(color);
	const firstLuminance = luminance(parse(first));
	const secondLuminance = luminance(parse(second));
	const lighter = Math.max(firstLuminance, secondLuminance);
	const darker = Math.min(firstLuminance, secondLuminance);
	return (lighter + 0.05) / (darker + 0.05);
}

export function readableInk(fill: string, scheme: ColorScheme): string {
	const { ink, onAccent } = surfaceColors[scheme];
	return contrastRatio(fill, ink) >= contrastRatio(fill, onAccent)
		? ink
		: onAccent;
}

// A `boxShadow`, so it hugs the cell's radius without taking layout space.
export function todayRingShadow(surface: string, scheme: ColorScheme): string {
	return `0 0 0 1.5px ${surface}, 0 0 0 3px ${surfaceColors[scheme].ink}`;
}

export type HeatmapLevel = 1 | 2 | 3;
