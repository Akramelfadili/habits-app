import { asc, eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "@/lib/db/client";
import { habits } from "@/lib/db/schema";
import type { HabitAccentKey } from "@/theme/theme";
import type { HabitIconKey } from "../constants";
import type {
	CreateHabitInput,
	Frequency,
	Habit,
	IsoWeekday,
	UpdateHabitInput,
} from "../types";

type HabitRow = typeof habits.$inferSelect;

function rowToFrequency(row: HabitRow): Frequency {
	switch (row.frequencyType) {
		case "weekdays":
			return {
				type: "weekdays",
				days: (row.frequencyWeekdays ?? "")
					.split(",")
					.filter(Boolean)
					.map((day) => Number(day) as IsoWeekday),
			};
		case "per-week":
			return {
				type: "per-week",
				timesPerWeek: row.frequencyTimesPerWeek ?? 1,
			};
		default:
			return { type: "daily" };
	}
}

/** Only the column for the active type is set; the others are cleared to null. */
function frequencyToColumns(frequency: Frequency) {
	return {
		frequencyType: frequency.type,
		frequencyWeekdays:
			frequency.type === "weekdays"
				? [...frequency.days].sort((a, b) => a - b).join(",")
				: null,
		frequencyTimesPerWeek:
			frequency.type === "per-week" ? frequency.timesPerWeek : null,
	};
}

function rowToHabit(row: HabitRow): Habit {
	return {
		id: row.id,
		name: row.name,
		icon: row.icon as HabitIconKey,
		color: row.color as HabitAccentKey,
		category: row.category,
		direction: row.direction,
		targetType: row.targetType,
		frequency: rowToFrequency(row),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
	const now = new Date();
	const [row] = await db
		.insert(habits)
		.values({
			name: input.name,
			icon: input.icon,
			color: input.color,
			category: input.category,
			direction: input.direction,
			targetType: input.targetType,
			...frequencyToColumns(input.frequency),
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	return rowToHabit(row);
}

export async function updateHabit(
	id: number,
	input: UpdateHabitInput,
): Promise<Habit> {
	const [row] = await db
		.update(habits)
		.set({
			name: input.name,
			icon: input.icon,
			color: input.color,
			category: input.category,
			targetType: input.targetType,
			...frequencyToColumns(input.frequency),
			updatedAt: new Date(),
		})
		.where(eq(habits.id, id))
		.returning();

	return rowToHabit(row);
}

/** Live-query hook — the only place outside this file that ever sees habit data. */
export function useHabitsList(): Habit[] {
	const { data } = useLiveQuery(
		db.select().from(habits).orderBy(asc(habits.createdAt)),
	);
	return (data ?? []).map(rowToHabit);
}

/** Dev-only escape hatch for clearing out test data — refuses to run outside `__DEV__`. */
export async function deleteAllHabits(): Promise<void> {
	if (!__DEV__) {
		throw new Error("deleteAllHabits is dev-only");
	}
	await db.delete(habits);
}
