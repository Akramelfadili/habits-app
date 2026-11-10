import {
	index,
	integer,
	sqliteTable,
	text,
	unique,
} from "drizzle-orm/sqlite-core";

export const appSettings = sqliteTable("app_settings", {
	key: text("key").primaryKey(),
	value: text("value").notNull(),
});

// Autoincrement ids give the order for free: built-ins first, then customs in creation order.
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
	hue: integer("hue"),
	builtIn: integer("built_in", { mode: "boolean" }).notNull().default(false),
	sortOrder: integer("sort_order").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const habits = sqliteTable("habits", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	// Legacy, never read or written; kept nullable so the category migration stays reversible.
	icon: text("icon"),
	color: text("color"),
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
	targetAmount: integer("target_amount"),
	targetUnit: text("target_unit"),
	frequencyType: text("frequency_type", {
		enum: ["daily", "weekdays", "per-week"],
	})
		.notNull()
		.default("daily"),
	frequencyWeekdays: text("frequency_weekdays"),
	frequencyTimesPerWeek: integer("frequency_times_per_week"),
	// Reordering permutes a category's existing values among its habits, so the category's first-appearance position never shifts.
	sortOrder: integer("sort_order").notNull().default(0),
	archivedAt: integer("archived_at", { mode: "timestamp" }),
	// "from..to" day ranges joined by commas ("2026-09-02..2026-09-10"); streak math skips them so a
	// restored habit resumes its streak instead of reading archived days as missed.
	pausedRanges: text("paused_ranges"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Presence is the signal: un-checking deletes the row rather than flipping a boolean.
export const entries = sqliteTable(
	"entries",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		habitId: integer("habit_id")
			.notNull()
			.references(() => habits.id),
		// "yyyy-MM-dd", not a timestamp, so timezone can't shift which day a completion lands on.
		date: text("date").notNull(),
		value: integer("value"),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		unique("entries_habit_date_unique").on(table.habitId, table.date),
		index("entries_date_idx").on(table.date),
	],
);

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

// Separate from `entries` because an entry's presence is the completion signal; a note on an
// uncompleted day can't live there without faking a completion.
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

export const reminders = sqliteTable(
	"reminders",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		habitId: integer("habit_id")
			.notNull()
			.references(() => habits.id),
		hour: integer("hour").notNull(),
		minute: integer("minute").notNull(),
		weekdays: text("weekdays").notNull(),
		enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [index("reminders_habit_idx").on(table.habitId)],
);
