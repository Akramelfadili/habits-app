import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
