import type { SFSymbol } from "sf-symbols-typescript";
import type {
	Category,
	CategoryAppearance,
	CategoryShape,
	IsoWeekday,
} from "./types";

// A test keeps these in step with the migrated rows. "Other" has no hue on purpose.
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

export function builtInAppearance(
	name: BuiltInCategoryName,
): CategoryAppearance {
	const builtIn = BUILT_IN_CATEGORIES.find((entry) => entry.name === name);
	if (!builtIn) throw new Error(`No built-in category "${name}"`);
	return { shape: builtIn.shape, hue: builtIn.hue };
}

export const OTHER_CATEGORY_NAME: BuiltInCategoryName = "Other";

// Red hues (15, 350) and the Health (175) and Social (230) hues are left out so a custom
// category never collides with a built-in or reads as an error.
export const CATEGORY_ROTATION: readonly CategoryAppearance[] = [
	{ shape: "ring", hue: 330 },
	{ shape: "square", hue: 95 },
	{ shape: "bars", hue: 220 },
	{ shape: "plus", hue: 265 },
	{ shape: "half", hue: 130 },
	{ shape: "archive", hue: 290 },
];

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

// Older habits may carry a name up to the former cap of 40; it stays valid on edit only
// while unchanged (see `makeHabitFormSchema`).
export const MAX_HABIT_NAME_LENGTH = 32;

export const MAX_CATEGORY_NAME_LENGTH = 20;

export { WEEK_STARTS_ON } from "@/utils/week-window";

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

export const QUICK_ADD_STEPS = [1, 2, 3] as const;

export const MAX_QUANTITY_VALUE = 9999;

// One pool across every habit, not per habit; resets on the 1st with no rollover.
export const FREEZE_POOL_SIZE = 2;

export const SEEN_FIRST_RUN_SETTING_KEY = "habits.seenFirstRun";

export function findBuiltInCategory(
	categories: readonly Category[],
	name: BuiltInCategoryName,
): Category | undefined {
	return categories.find(
		(category) => category.builtIn && category.name === name,
	);
}

export const MAX_NOTE_LENGTH = 280;

export const REMINDER_CAP = 4;

export const DEFAULT_REMINDER_TIME = { hour: 9, minute: 0 };

export const EVENING_REVIEW_TIME = { hour: 21, minute: 30 };

export const EVENING_REVIEW_TIME_SETTING_KEY = "habits.eveningReviewTime";

export const EVENING_REVIEW_SETTING_KEY = "habits.eveningReview";

// The only web address in the app: the no-network guard allows it here and nowhere else.
export const PRIVACY_POLICY_URL =
	"https://akramelfadili.github.io/habits-app/privacy.html";

// Absent means hidden: habit names can be health-related and the lock screen shows titles.
export const HIDE_HABIT_NAMES_SETTING_KEY = "habits.hideHabitNames";

// The launch reconcile compares identifiers, not titles, so this is how it knows the OS
// still holds titles from the other mode and must rebuild them once.
export const REMINDER_TITLES_APPLIED_SETTING_KEY =
	"habits.reminderTitlesHidden";

export const LAST_EXPORT_SETTING_KEY = "habits.lastExport";

// The spec gives no hour; 18:00 is our choice.
export const EVENING_STARTS_AT_HOUR = 18;
