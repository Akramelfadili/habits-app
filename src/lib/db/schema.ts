import {
	index,
	integer,
	sqliteTable,
	text,
	unique,
} from "drizzle-orm/sqlite-core";

/**
 * Generic app-level key-value store (`lib/app-settings`), not scoped to any one module. The
 * "seen first run" flag is the first consumer; future app-level preferences reuse this table
 * instead of inventing their own.
 */
export const appSettings = sqliteTable("app_settings", {
	key: text("key").primaryKey(),
	value: text("value").notNull(),
});

/**
 * The managed category set: the ten built-ins, seeded by migration in their fixed order, then
 * the user's custom ones. Autoincrement ids give that order for free (built-ins first, customs in
 * creation order). A category supplies its habits' icon (`shape`) and color (`hue`).
 */
export const categories = sqliteTable("categories", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	shape: text("shape", {
		enum: [
			"plus",
			"bars",
			"diamond",
			"square",
			"lines",
			"grid",
			"half",
			"archive",
			"dot",
			"ring",
		],
	}).notNull(),
	/** OKLCH hue; null only for the neutral built-in "Other". */
	hue: integer("hue"),
	builtIn: integer("built_in", { mode: "boolean" }).notNull().default(false),
	/**
	 * Group order on Today and Manage. Backfilled by 0011; a new category takes max + 1. The picker
	 * keeps creation (id) order.
	 */
	sortOrder: integer("sort_order").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const habits = sqliteTable("habits", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	/**
	 * Legacy: no longer read or written. A habit's icon and color come from its category; kept
	 * nullable for one release so the category migration stays reversible, dropped by a later
	 * cleanup migration.
	 */
	icon: text("icon"),
	/** Legacy, see `icon`. */
	color: text("color"),
	/** Legacy free-text category, see `icon`; replaced by `categoryId`. */
	category: text("category"),
	categoryId: integer("category_id")
		.notNull()
		.references(() => categories.id),
	direction: text("direction", { enum: ["build", "break"] })
		.notNull()
		.default("build"),
	targetType: text("target_type", { enum: ["simple", "quantity"] })
		.notNull()
		.default("simple"),
	/** Set only when targetType is "quantity"; null for simple-check habits. */
	targetAmount: integer("target_amount"),
	targetUnit: text("target_unit"),
	frequencyType: text("frequency_type", {
		enum: ["daily", "weekdays", "per-week"],
	})
		.notNull()
		.default("daily"),
	/** Comma-separated ISO weekdays ("1,3,5"); set only for "weekdays". */
	frequencyWeekdays: text("frequency_weekdays"),
	frequencyTimesPerWeek: integer("frequency_times_per_week"),
	/**
	 * Manual order on Manage; Today respects it within each category group. Reordering permutes a
	 * category's existing values among its habits, so a category's first-appearance position never
	 * shifts.
	 */
	sortOrder: integer("sort_order").notNull().default(0),
	/** Set while archived; null for an active habit. */
	archivedAt: integer("archived_at", { mode: "timestamp" }),
	/**
	 * Past archive periods, "from..to" calendar-day ranges joined by commas
	 * ("2026-09-02..2026-09-10"). Streak math skips these days so a restored
	 * habit resumes its streak instead of reading every archived day as missed.
	 */
	pausedRanges: text("paused_ranges"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/**
 * One row = that habit was completed/resisted on that calendar day. Presence is the signal:
 * un-checking (always allowed, no confirmation) deletes the row rather than flipping a boolean.
 */
export const entries = sqliteTable(
	"entries",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		habitId: integer("habit_id")
			.notNull()
			.references(() => habits.id),
		/** Calendar day, "yyyy-MM-dd" — not a timestamp, so timezone can't shift which day a completion lands on. */
		date: text("date").notNull(),
		/** Logged amount for a quantity habit; null for simple-check entries. */
		value: integer("value"),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		unique("entries_habit_date_unique").on(table.habitId, table.date),
		index("entries_date_idx").on(table.date),
	],
);

/**
 * One row = that habit's missed day was covered by a freeze. The shared monthly pool is derived
 * by counting rows here whose `date` falls in a given calendar month, across every habit, since
 * the pool isn't per-habit.
 */
export const frozenDays = sqliteTable(
	"frozen_days",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		habitId: integer("habit_id")
			.notNull()
			.references(() => habits.id),
		date: text("date").notNull(),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		unique("frozen_days_habit_date_unique").on(table.habitId, table.date),
		index("frozen_days_date_idx").on(table.date),
	],
);

/**
 * A free-text note on one habit's day. Separate from `entries` on purpose: an entry's presence
 * *is* the completion signal, so a note on a day that wasn't completed can't live there without
 * faking a completion.
 */
export const entryNotes = sqliteTable(
	"entry_notes",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		habitId: integer("habit_id")
			.notNull()
			.references(() => habits.id),
		date: text("date").notNull(),
		note: text("note").notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		unique("entry_notes_habit_date_unique").on(table.habitId, table.date),
	],
);

/**
 * One reminder time on a habit, up to 4 per habit, each with its own weekday set and on/off
 * toggle. Purely a notification layer: nothing here affects whether a habit is due or counts on
 * Today.
 */
export const reminders = sqliteTable(
	"reminders",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		habitId: integer("habit_id")
			.notNull()
			.references(() => habits.id),
		hour: integer("hour").notNull(),
		minute: integer("minute").notNull(),
		/** Comma-separated ISO weekdays ("1,2,3,4,5") — this reminder's own days, never shared. */
		weekdays: text("weekdays").notNull(),
		enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [index("reminders_habit_idx").on(table.habitId)],
);
