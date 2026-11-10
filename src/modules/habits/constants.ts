import type { SFSymbol } from "sf-symbols-typescript";
import type {
	Category,
	CategoryAppearance,
	CategoryShape,
	IsoWeekday,
} from "./types";

/**
 * The ten built-in categories, in their fixed display order. A migration seeds these
 * rows and a later one moves Health and Social off red; a test keeps the migrated rows and
 * this list in step.
 * "Other" has no hue on purpose: it is the neutral catch-all, not an identity.
 */
export const BUILT_IN_CATEGORIES = [
	{ name: "Health", shape: "plus", hue: 175 },
	{ name: "Fitness", shape: "bars", hue: 150 },
	{ name: "Mindfulness", shape: "diamond", hue: 300 },
	{ name: "Productivity", shape: "square", hue: 255 },
	{ name: "Learning", shape: "lines", hue: 75 },
	{ name: "Finance", shape: "grid", hue: 110 },
	{ name: "Social", shape: "half", hue: 230 },
	{ name: "Home", shape: "archive", hue: 45 },
	{ name: "Creativity", shape: "dot", hue: 200 },
	{ name: "Other", shape: "ring", hue: null },
] as const satisfies readonly (CategoryAppearance & { name: string })[];

export type BuiltInCategoryName = (typeof BUILT_IN_CATEGORIES)[number]["name"];

/** A built-in's fixed look — static, so it's known without reading the database. */
export function builtInAppearance(
	name: BuiltInCategoryName,
): CategoryAppearance {
	const builtIn = BUILT_IN_CATEGORIES.find((entry) => entry.name === name);
	if (!builtIn) throw new Error(`No built-in category "${name}"`);
	return { shape: builtIn.shape, hue: builtIn.hue };
}

export const OTHER_CATEGORY_NAME: BuiltInCategoryName = "Other";

/**
 * Custom categories' icon/color, never user-chosen: each new one takes the slot with the
 * fewest custom categories already on it, ties going to the lowest slot (see
 * `nextCategoryAppearance`). Every pair is unique. The red hues 15 and 350 and the hues
 * Health (175) and Social (230) use are left out; migration 0011 moved customs on them here.
 */
export const CATEGORY_ROTATION: readonly CategoryAppearance[] = [
	{ shape: "ring", hue: 330 },
	{ shape: "square", hue: 95 },
	{ shape: "bars", hue: 220 },
	{ shape: "plus", hue: 265 },
	{ shape: "half", hue: 130 },
	{ shape: "archive", hue: 290 },
];

/**
 * The one place a category shape becomes an icon. SF Symbols are the closest
 * system glyphs, not the mockup's hand-drawn shapes — a known, accepted
 * deviation (design-system.md draws its own).
 */
export const CATEGORY_SHAPE_SYMBOLS: Record<CategoryShape, SFSymbol> = {
	plus: "plus",
	bars: "chart.bar.fill",
	diamond: "diamond.fill",
	square: "square",
	lines: "line.3.horizontal",
	grid: "square.grid.2x2.fill",
	half: "circle.lefthalf.filled",
	archive: "archivebox",
	dot: "circle.fill",
	ring: "circle",
};

/**
 * Habit-name field cap; the counter shows from 80% (26/32). An earlier cap was 40, so
 * older habits may still carry a longer name; it stays valid on edit only while unchanged
 * (see `makeHabitFormSchema`).
 */
export const MAX_HABIT_NAME_LENGTH = 32;

/** Category-name field cap; the counter shows from 80% (16/20). */
export const MAX_CATEGORY_NAME_LENGTH = 20;

/**
 * Weeks run Monday to Sunday. Defined once in `utils/week-window.ts` (with the
 * week-bound helpers) so scheduling and summaries never disagree.
 */
export { WEEK_STARTS_ON } from "@/utils/week-window";

/** Days pre-filled by the "Weekdays shortcut" chip — Mon–Fri, still editable after. */
export const WEEKDAY_SHORTCUT: IsoWeekday[] = [1, 2, 3, 4, 5];

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

export const MIN_TARGET_AMOUNT = 1;
export const MAX_TARGET_AMOUNT = 999;
export const DEFAULT_TARGET_AMOUNT = 8;
export const MAX_TARGET_UNIT_LENGTH = 20;

/** The small +1/+2 quick-add chips shown alongside "Full {target}". */
export const QUICK_ADD_STEPS = [1, 2, 3] as const;

/** The Quantity Log stepper's ceiling: high enough that over-logging is never capped in practice. */
export const MAX_QUANTITY_VALUE = 9999;

/** Shared monthly freeze pool size: across every habit, not per habit; resets on the 1st, no rollover. */
export const FREEZE_POOL_SIZE = 2;

/**
 * The app-settings key gating First Run. Owned by this module, but stored through the
 * generic `lib/app-settings` KV store so other modules can add their own flags the same way.
 */
export const SEEN_FIRST_RUN_SETTING_KEY = "habits.seenFirstRun";

/** A built-in's stored row, by name — built-ins are always present (seeded by migration). */
export function findBuiltInCategory(
	categories: readonly Category[],
	name: BuiltInCategoryName,
): Category | undefined {
	return categories.find(
		(category) => category.builtIn && category.name === name,
	);
}

/**
 * A retro-log note's cap: "a short note, not a journal entry". The field stops accepting
 * input here rather than truncating on save.
 */
export const MAX_NOTE_LENGTH = 280;

/** Reminder times per habit: adding a 5th is blocked with an explanation. */
export const REMINDER_CAP = 4;

export const DEFAULT_REMINDER_TIME = { hour: 9, minute: 0 };

/** The Evening review's time until the user picks one. */
export const EVENING_REVIEW_TIME = { hour: 21, minute: 30 };

/** `app_settings` key for the Evening review's time, "HH:mm" — absent means the default. */
export const EVENING_REVIEW_TIME_SETTING_KEY = "habits.eveningReviewTime";

/** `app_settings` key for the app-wide Evening review toggle — "true" when on. */
export const EVENING_REVIEW_SETTING_KEY = "habits.eveningReview";

/**
 * Where the hosted privacy policy lives (GitHub Pages, from `site/`). The only
 * web address in the app: the no-network guard allows it here and nowhere else.
 */
export const PRIVACY_POLICY_URL =
	"https://akramelfadili.github.io/habits-app/privacy.html";

/**
 * `app_settings` key for "Hide habit names" in reminders: "true" or "false"; absent means
 * the default, which is hidden (habit names can be health-related, and the lock screen
 * shows a notification's title).
 */
export const HIDE_HABIT_NAMES_SETTING_KEY = "habits.hideHabitNames";

/**
 * `app_settings` key recording which "Hide habit names" value the scheduled
 * reminders were last built with ("true" / "false"; absent = never recorded).
 * Not user-facing. The launch reconcile compares identifiers, not titles, so
 * this is how it knows the OS still holds titles from the other mode and has
 * to rebuild them once.
 */
export const REMINDER_TITLES_APPLIED_SETTING_KEY =
	"habits.reminderTitlesHidden";

/** `app_settings` key for the day of the last successful data export, "yyyy-MM-dd". */
export const LAST_EXPORT_SETTING_KEY = "habits.lastExport";

/**
 * From this local hour a Break habit that is still open reads "Resist tonight" instead
 * of "Resisting". The spec gives no hour: 18:00 is our choice, and this is the only place
 * it is written.
 */
export const EVENING_STARTS_AT_HOUR = 18;
