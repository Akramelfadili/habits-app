import { formatCount } from "@/utils/format";
import { settingsCopy } from "../messages";
import type { Habit, Reminder } from "../types";

export function kilobytesLabel(bytes: number): string {
	return `${formatCount(Math.max(1, Math.ceil(bytes / 1024)))} KB`;
}

/** "3.0 (412)" — the About row's value (S6). */
export function versionLabel(info: { version: string; build: string }): string {
	return `${info.version} (${info.build})`;
}

/** What a denied iOS permission holds back (SY6): the enabled times and the active habits they belong to. */
export function notificationImpact(
	reminders: readonly Pick<Reminder, "habitId" | "enabled">[],
	habits: readonly Pick<Habit, "id" | "archivedAt">[],
): { times: number; habits: number } {
	const active = new Set(
		habits
			.filter((habit) => habit.archivedAt === null)
			.map((habit) => habit.id),
	);
	const live = reminders.filter(
		(reminder) => reminder.enabled && active.has(reminder.habitId),
	);
	return {
		times: live.length,
		habits: new Set(live.map((reminder) => reminder.habitId)).size,
	};
}

/** The Notifications row's value: Allowed, Off or Not asked yet (nothing while it is still being read). */
export function notificationValue(
	permission: "granted" | "denied" | "undetermined" | undefined,
): string {
	return permission === "granted"
		? settingsCopy.reminders.allowed
		: permission === "denied"
			? settingsCopy.reminders.off
			: settingsCopy.reminders.notAsked;
}
