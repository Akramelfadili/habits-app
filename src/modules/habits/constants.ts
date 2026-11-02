import type { SFSymbol } from "sf-symbols-typescript";
import type {
	Category,
	CategoryAppearance,
	CategoryShape,
	CreateHabitInput,
	HabitDirection,
	IsoWeekday,
} from "./types";

/**
 * The ten built-in categories (HAB-24), in their fixed display order. The
 * HAB-24 migration seeds these rows and 0011 moves Health and Social off red
 * (T-16); a test keeps the migrated rows and this list in step.
 * "Other" has no hue on purpose — it's the neutral catch-all, not an identity.
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
 * Custom categories' icon/color, never user-chosen (HAB-24): each new one takes
 * the slot with the fewest custom categories already on it, ties going to the
 * lowest slot — see `nextCategoryAppearance`. Every pair is unique. V3 (T-16,
 * migration 0011) dropped the red hues 15 and 350 and the hues Health (175)
 * and Social (230) now use; 0011 moved customs on them to these slots.
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
 * Habit-name field cap (HAB-22) — counter shows from 80% (26/32). V1 allowed
 * 40, so older habits may still carry a longer name; it stays valid on edit
 * only while unchanged (see `makeHabitFormSchema`).
 */
export const MAX_HABIT_NAME_LENGTH = 32;

/** Category-name field cap (HAB-24) — counter shows from 80% (16/20). */
export const MAX_CATEGORY_NAME_LENGTH = 20;

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

export const MIN_TARGET_AMOUNT = 1;
export const MAX_TARGET_AMOUNT = 999;
export const DEFAULT_TARGET_AMOUNT = 8;
export const MAX_TARGET_UNIT_LENGTH = 20;

/** The small +1/+2 quick-add chips shown alongside "Full {target}" (HAB-07). */
export const QUICK_ADD_STEPS = [1, 2, 3] as const;

/** The Quantity Log stepper's ceiling — high enough that over-logging (HAB-07) is never capped in practice. */
export const MAX_QUANTITY_VALUE = 9999;

/** Shared monthly freeze pool size (HAB-08) — across every habit, not per-habit; resets on the 1st, no rollover. */
export const FREEZE_POOL_SIZE = 2;

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

/**
 * The app-settings key gating First Run (HAB-06) — owned by this module, but
 * stored through the generic `lib/app-settings` KV store, not a habits-only
 * mechanism, so other modules can add their own flags the same way later.
 */
export const SEEN_FIRST_RUN_SETTING_KEY = "habits.seenFirstRun";

export type FirstRunSuggestion = {
	id: string;
	name: string;
	direction: HabitDirection;
	/** The built-in category it's created in — which also gives it its icon and color. */
	category: BuiltInCategoryName;
	/** A quantity target (HAB-07), or null for a simple check. */
	target: { amount: number; unit: string } | null;
	/**
	 * The row's promise. Must describe what's actually created — its category
	 * or its target — never a detail the created habit doesn't have.
	 */
	subtitle: string;
	preselected: boolean;
};

/** The 6 fixed suggestions offered on First Run (HAB-06), in display order. */
export const FIRST_RUN_SUGGESTIONS: FirstRunSuggestion[] = [
	{
		id: "glass-of-water",
		name: "Glass of water",
		direction: "build",
		category: "Health",
		target: null,
		subtitle: "Health",
		preselected: true,
	},
	{
		id: "walk-20-minutes",
		name: "Walk 20 minutes",
		direction: "build",
		category: "Fitness",
		target: null,
		subtitle: "Fitness",
		preselected: true,
	},
	{
		id: "read-before-bed",
		name: "Read before bed",
		direction: "build",
		category: "Learning",
		target: { amount: 10, unit: "pages" },
		subtitle: "Learning · 10 pages",
		preselected: false,
	},
	{
		id: "lights-out-by-23-00",
		name: "Lights out by 23:00",
		direction: "break",
		category: "Health",
		target: null,
		subtitle: "Break habit",
		preselected: false,
	},
	{
		id: "stretch",
		name: "Stretch",
		direction: "build",
		category: "Fitness",
		target: { amount: 5, unit: "min" },
		subtitle: "5 minutes",
		preselected: false,
	},
	{
		id: "three-lines-journal",
		name: "Three lines journal",
		direction: "build",
		category: "Mindfulness",
		target: null,
		subtitle: "Mindfulness",
		preselected: false,
	},
];

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
 * Maps a selected suggestion to the same shape Feature 01's create-habit path
 * takes — with the category and target its subtitle promises, so the first
 * Today is grouped and "10 pages" really is 10 pages. Built-in ids come from
 * the database (autoincrement), so they're resolved by name here.
 */
export function suggestionToCreateHabitInput(
	suggestion: FirstRunSuggestion,
	categories: readonly Category[],
): CreateHabitInput {
	const category = findBuiltInCategory(categories, suggestion.category);
	if (!category) {
		throw new Error(`Built-in category "${suggestion.category}" is missing`);
	}
	return {
		name: suggestion.name,
		categoryId: category.id,
		direction: suggestion.direction,
		targetType: suggestion.target ? "quantity" : "simple",
		targetAmount: suggestion.target?.amount ?? null,
		targetUnit: suggestion.target?.unit ?? null,
		frequency: { type: "daily" },
	};
}

/**
 * A retro-log note's cap (HAB-10) — "a short note, not a journal entry". The
 * field stops accepting input here rather than truncating on save.
 */
export const MAX_NOTE_LENGTH = 280;

/** Reminder times per habit (HAB-12) — adding a 5th is blocked with an explanation. */
export const REMINDER_CAP = 4;

/** A newly added reminder time starts here; the user edits it right after. */
export const DEFAULT_REMINDER_TIME = { hour: 9, minute: 0 };

/** The Evening review's time until the user picks one (HAB-12; kept at 21:30 in HAB-44). */
export const EVENING_REVIEW_TIME = { hour: 21, minute: 30 };

/** `app_settings` key for the Evening review's time, "HH:mm" — absent means the default. */
export const EVENING_REVIEW_TIME_SETTING_KEY = "habits.eveningReviewTime";

/** `app_settings` key for the app-wide Evening review toggle — "true" when on. */
export const EVENING_REVIEW_SETTING_KEY = "habits.eveningReview";

/** `app_settings` key for the day of the last successful data export (HAB-15), "yyyy-MM-dd". */
export const LAST_EXPORT_SETTING_KEY = "habits.lastExport";

/**
 * From this local hour a Break habit that is still open reads "Resist tonight"
 * instead of "Resisting" (HAB-31, T5). The spec gives no hour: 18:00 is our
 * choice, and this is the only place it is written.
 */
export const EVENING_STARTS_AT_HOUR = 18;
