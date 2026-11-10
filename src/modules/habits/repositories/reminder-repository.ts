import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reminders } from "@/lib/db/schema";
import { useLiveRows } from "@/lib/db/use-live-rows";
import { present } from "@/utils/indexed";
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
		createdAt: row.createdAt,
	};
}

function weekdaysToColumn(weekdays: readonly IsoWeekday[]): string {
	return [...new Set(weekdays)].sort((a, b) => a - b).join(",");
}

function habitRemindersQuery(habitId: number) {
	return db
		.select()
		.from(reminders)
		.where(eq(reminders.habitId, habitId))
		.orderBy(asc(reminders.hour), asc(reminders.minute), asc(reminders.id));
}

export function useHabitReminders(habitId: number): Reminder[] {
	const { data } = useLiveRows<ReminderRow>(
		() => habitRemindersQuery(habitId),
		[habitId],
		{ resetOnDepsChange: true },
	);
	return data.map(rowToReminder);
}

export function useAllReminders(): Reminder[] {
	const { data } = useLiveRows<ReminderRow>(() =>
		db
			.select()
			.from(reminders)
			.orderBy(asc(reminders.hour), asc(reminders.minute), asc(reminders.id)),
	);
	return data.map(rowToReminder);
}

// The cap check and re-sync need what's stored now, not what a hook last rendered.
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
	return rowToReminder(present(row, "the reminder row"));
}

// Ids are autoincrement and never reused, so the insert fails rather than duplicating a live row.
export async function restoreReminder(reminder: Reminder): Promise<Reminder> {
	const [row] = await db
		.insert(reminders)
		.values({
			id: reminder.id,
			habitId: reminder.habitId,
			hour: reminder.hour,
			minute: reminder.minute,
			weekdays: weekdaysToColumn(reminder.weekdays),
			enabled: reminder.enabled,
			createdAt: reminder.createdAt ?? new Date(),
		})
		.returning();
	return rowToReminder(present(row, "the reminder row"));
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
	return rowToReminder(present(row, "the reminder row"));
}

export async function deleteReminder(id: number): Promise<void> {
	await db.delete(reminders).where(eq(reminders.id, id));
}
