import { asc, eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "@/lib/db/client";
import { reminders } from "@/lib/db/schema";
import type {
	CreateReminderInput,
	IsoWeekday,
	Reminder,
	ReminderPatch,
} from "../types";

type ReminderRow = typeof reminders.$inferSelect;

function rowToReminder(row: ReminderRow): Reminder {
	return {
		id: row.id,
		habitId: row.habitId,
		hour: row.hour,
		minute: row.minute,
		weekdays: row.weekdays
			.split(",")
			.filter(Boolean)
			.map((day) => Number(day) as IsoWeekday),
		enabled: row.enabled,
	};
}

function weekdaysToColumn(weekdays: readonly IsoWeekday[]): string {
	return [...new Set(weekdays)].sort((a, b) => a - b).join(",");
}

/** Earliest time first — the order the Reminders screen lists them in. */
function habitRemindersQuery(habitId: number) {
	return db
		.select()
		.from(reminders)
		.where(eq(reminders.habitId, habitId))
		.orderBy(asc(reminders.hour), asc(reminders.minute), asc(reminders.id));
}

/** Live-query hook — one habit's reminder times, earliest first. */
export function useHabitReminders(habitId: number): Reminder[] {
	const { data } = useLiveQuery(habitRemindersQuery(habitId), [habitId]);
	return (data ?? []).map(rowToReminder);
}

/** Live-query hook — every habit's reminders (Today's tomorrow preview, HAB-14). */
export function useAllReminders(): Reminder[] {
	const { data } = useLiveQuery(
		db
			.select()
			.from(reminders)
			.orderBy(asc(reminders.hour), asc(reminders.minute), asc(reminders.id)),
	);
	return (data ?? []).map(rowToReminder);
}

/**
 * A one-off (non-reactive) read of one habit's reminders — the service's
 * cap check and notification re-sync need what's stored right now, not what
 * a hook last rendered.
 */
export async function getHabitReminders(habitId: number): Promise<Reminder[]> {
	const rows = await habitRemindersQuery(habitId);
	return rows.map(rowToReminder);
}

export async function createReminder(
	input: CreateReminderInput,
): Promise<Reminder> {
	const [row] = await db
		.insert(reminders)
		.values({
			habitId: input.habitId,
			hour: input.hour,
			minute: input.minute,
			weekdays: weekdaysToColumn(input.weekdays),
			enabled: input.enabled,
			createdAt: new Date(),
		})
		.returning();
	return rowToReminder(row);
}

export async function updateReminder(
	id: number,
	patch: ReminderPatch,
): Promise<Reminder> {
	const [row] = await db
		.update(reminders)
		.set({
			...patch,
			weekdays: patch.weekdays ? weekdaysToColumn(patch.weekdays) : undefined,
		})
		.where(eq(reminders.id, id))
		.returning();
	return rowToReminder(row);
}

export async function deleteReminder(id: number): Promise<void> {
	await db.delete(reminders).where(eq(reminders.id, id));
}
