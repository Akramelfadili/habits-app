import { formatCount } from "@/utils/format";
import type { Habit, Reminder } from "../types";

export function kilobytesLabel(bytes: number): string {
	return `${formatCount(Math.max(1, Math.ceil(bytes / 1024)))} KB`;
}

/** "1.0.0 (build 12)" — the About row's value. */
export function versionLabel(info: { version: string; build: string }): string {
	return `${info.version} (build ${info.build})`;
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
