import type { SFSymbol } from "sf-symbols-typescript";
import { HABIT_ACCENT_KEYS, type HabitAccentKey } from "@/theme/theme";
import type { HabitDirection, IsoWeekday } from "./types";

export type HabitIconKey =
	| "dot"
	| "flame"
	| "book"
	| "walk"
	| "drop"
	| "moon"
	| "heart"
	| "leaf";

/** The fixed set of 8 selectable habit icons (HAB-01). "dot" is the default. */
export const HABIT_ICONS: { key: HabitIconKey; symbol: SFSymbol }[] = [
	{ key: "dot", symbol: "circle.fill" },
	{ key: "flame", symbol: "flame.fill" },
	{ key: "book", symbol: "book.fill" },
	{ key: "walk", symbol: "figure.walk" },
	{ key: "drop", symbol: "drop.fill" },
	{ key: "moon", symbol: "moon.stars.fill" },
	{ key: "heart", symbol: "heart.fill" },
	{ key: "leaf", symbol: "leaf.fill" },
];

export const DEFAULT_HABIT_ICON: HabitIconKey = "dot";

/** The fixed set of 6 selectable habit colors (HAB-01), in default-pick order. */
export const HABIT_COLORS: HabitAccentKey[] = HABIT_ACCENT_KEYS;

/**
 * Weeks run Monday → Sunday (HAB-02). The Weekly Summary (HAB-11) must use this
 * same constant so scheduling and summaries never disagree on a week's bounds.
 */
export const WEEK_STARTS_ON = 1;

/** Days pre-filled by the "Weekdays shortcut" chip — Mon–Fri, still editable after. */
export const WEEKDAY_SHORTCUT: IsoWeekday[] = [1, 2, 3, 4, 5];

/** Mon → Sun, with the single-letter labels shown in the weekday picker. */
export const WEEKDAYS: { day: IsoWeekday; letter: string; name: string }[] = [
	{ day: 1, letter: "M", name: "Monday" },
	{ day: 2, letter: "T", name: "Tuesday" },
	{ day: 3, letter: "W", name: "Wednesday" },
	{ day: 4, letter: "T", name: "Thursday" },
	{ day: 5, letter: "F", name: "Friday" },
	{ day: 6, letter: "S", name: "Saturday" },
	{ day: 7, letter: "S", name: "Sunday" },
];

export const MIN_TIMES_PER_WEEK = 1;
export const MAX_TIMES_PER_WEEK = 7;
export const DEFAULT_TIMES_PER_WEEK = 3;

/** Label for a habit with no category — also its group name on Today (HAB-01, HAB-03). */
export const NO_CATEGORY_LABEL = "Anytime";

const DIRECTION_LOCK_NOTE =
	"This is the only moment you can choose — it is locked after saving, because a build streak and a break streak mean opposite things.";

/** Caption under the Build/Break control on the New Habit form (HAB-01). */
export const DIRECTION_CAPTIONS: Record<HabitDirection, string> = {
	build: `Build — checking it off means you did it. ${DIRECTION_LOCK_NOTE}`,
	break: `Break — checking it off means you resisted. ${DIRECTION_LOCK_NOTE}`,
};

/** Caption under Target type when Direction = Break locks it to Simple check (HAB-04). */
export const QUANTITY_UNAVAILABLE_FOR_BREAK_CAPTION =
	"Break habits are simple check-ins only — quantity targets aren't available for Break in V1.";
