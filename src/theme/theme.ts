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
		faint: "#6E6E6B",
		border: "#E2E1DE",
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
		warnInk: "#9A6708",
		dangerBg: "#C9372F",
		frozenBg: "#EDE8F8",
		frozenInk: "#7A5AC4",
	},
	dark: {
		warnTint: "#3A2A0E",
		warnInk: "#E8A93A",
		dangerBg: "#D9544D",
		frozenBg: "#262036",
		frozenInk: "#A98FE0",
	},
} as const;

export const typeScale = {
	stat: 30,
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
} as const;

/** The 6 confirmed habit-accent hues, in fixed pick order (design-system.md). */
export const HABIT_ACCENT_HUES = {
	blue: 230,
	purple: 300,
	orange: 60,
	green: 150,
	red: 25,
	teal: 195,
} as const;

export type HabitAccentKey = keyof typeof HABIT_ACCENT_HUES;

export const HABIT_ACCENT_KEYS = Object.keys(
	HABIT_ACCENT_HUES,
) as HabitAccentKey[];

/** Base accent color (icon/dot fill) — `ink(hue)` from design-system.md. */
export function habitAccentInk(
	key: HabitAccentKey,
	scheme: ColorScheme,
): string {
	const hue = HABIT_ACCENT_HUES[key];
	return scheme === "light" ? oklch(0.56, 0.18, hue) : oklch(0.78, 0.15, hue);
}

/** Soft tint behind an accent icon — `tint(hue)` from design-system.md. */
export function habitAccentTint(
	key: HabitAccentKey,
	scheme: ColorScheme,
): string {
	const hue = HABIT_ACCENT_HUES[key];
	return scheme === "light" ? oklch(0.93, 0.045, hue) : oklch(0.3, 0.085, hue);
}
