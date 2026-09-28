import {
	index,
	integer,
	sqliteTable,
	text,
	unique,
} from "drizzle-orm/sqlite-core";

/**
 * Generic app-level key-value store (`lib/app-settings`) — not scoped to any
 * one module. HAB-06's "seen first run" flag is the first consumer; future
 * app-level preferences reuse this same table instead of inventing their own.
 */
export const appSettings = sqliteTable("app_settings", {
	key: text("key").primaryKey(),
	value: text("value").notNull(),
});

export const habits = sqliteTable("habits", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	icon: text("icon").notNull(),
	color: text("color").notNull(),
	category: text("category"),
	direction: text("direction", { enum: ["build", "break"] })
		.notNull()
		.default("build"),
	targetType: text("target_type", { enum: ["simple", "quantity"] })
		.notNull()
		.default("simple"),
	/** Set only when targetType is "quantity" (HAB-07) — null for simple-check habits. */
	targetAmount: integer("target_amount"),
	targetUnit: text("target_unit"),
	frequencyType: text("frequency_type", {
		enum: ["daily", "weekdays", "per-week"],
	})
		.notNull()
		.default("daily"),
	/** Comma-separated ISO weekdays ("1,3,5"); set only for "weekdays". */
	frequencyWeekdays: text("frequency_weekdays"),
	/** 1–7; set only for "per-week". */
	frequencyTimesPerWeek: integer("frequency_times_per_week"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/**
 * One row = that habit was completed/resisted on that calendar day (HAB-03).
 * Presence is the signal — un-checking (always allowed, no confirmation)
 * deletes the row rather than flipping a boolean.
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
		/** Logged amount for a quantity habit (HAB-07) — null for simple-check entries. */
		value: integer("value"),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		unique("entries_habit_date_unique").on(table.habitId, table.date),
		index("entries_date_idx").on(table.date),
	],
);

/**
 * One row = that habit's missed day was covered by a freeze (HAB-08). The
 * shared monthly pool is derived by counting rows here whose `date` falls in
 * a given calendar month — across every habit, since the pool isn't per-habit.
 */
export const frozenDays = sqliteTable(
	"frozen_days",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		habitId: integer("habit_id")
			.notNull()
			.references(() => habits.id),
		/** The missed calendar day this freeze covers, "yyyy-MM-dd". */
		date: text("date").notNull(),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		unique("frozen_days_habit_date_unique").on(table.habitId, table.date),
		index("frozen_days_date_idx").on(table.date),
	],
);

/**
 * A free-text note on one habit's day (HAB-10). Separate from `entries` on
 * purpose: an entry's presence *is* the completion signal, so a note on a day
 * that wasn't completed can't live there without faking a completion.
 */
export const entryNotes = sqliteTable(
	"entry_notes",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		habitId: integer("habit_id")
			.notNull()
			.references(() => habits.id),
		/** Calendar day, "yyyy-MM-dd" — same keying as `entries`. */
		date: text("date").notNull(),
		note: text("note").notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		unique("entry_notes_habit_date_unique").on(table.habitId, table.date),
	],
);
