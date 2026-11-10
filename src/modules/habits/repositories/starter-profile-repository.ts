import { count } from "drizzle-orm";
import { setSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { db } from "@/lib/db/client";
import {
	entries,
	entryNotes,
	frozenDays,
	habits,
	reminders,
} from "@/lib/db/schema";
import { runInTransaction } from "@/lib/db/transaction";
import { present } from "@/utils/indexed";
import { SEEN_FIRST_RUN_SETTING_KEY } from "../constants";
import {
	reminderWeekdays,
	STARTER_PROFILE_SETTING_KEY,
	type StarterProfile,
} from "../dev/starter-profile";
import type { Habit } from "../types";
import { getCategories } from "./category-repository";
import { createHabit } from "./habit-repository";
import { createReminder } from "./reminder-repository";

export type UserDataCounts = {
	entries: number;
	notes: number;
	frozenDays: number;
};

export async function countUserData(): Promise<UserDataCounts> {
	const [[e], [n], [f]] = await Promise.all([
		db.select({ n: count() }).from(entries),
		db.select({ n: count() }).from(entryNotes),
		db.select({ n: count() }).from(frozenDays),
	]);
	return {
		entries: present(e, "an entries count").n,
		notes: present(n, "a notes count").n,
		frozenDays: present(f, "a frozen-days count").n,
	};
}

export type AppliedStarterHabit = {
	habit: Habit;
	hasReminders: boolean;
};

// One transaction: a failure leaves the old data and marker untouched. Habits go through
// `createHabit`/`createReminder`, not raw SQL, so ordering and frequency columns are the app's own.
// The caller checks the dev flag; this only writes.
export async function replaceHabitsWithStarterProfile(
	profile: StarterProfile,
): Promise<AppliedStarterHabit[]> {
	return runInTransaction(async () => {
		// None of these foreign keys cascade: children first.
		await db.delete(entries);
		await db.delete(entryNotes);
		await db.delete(frozenDays);
		await db.delete(reminders);
		await db.delete(habits);

		const categoryIdByName = new Map(
			(await getCategories()).map((category) => [category.name, category.id]),
		);

		const applied: AppliedStarterHabit[] = [];
		for (const spec of profile.habits) {
			const categoryId = categoryIdByName.get(spec.category);
			if (categoryId === undefined) {
				throw new Error("Starter profile names a category that is missing");
			}
			const habit = await createHabit({
				name: spec.name,
				categoryId,
				direction: "build",
				targetType: spec.target ? "quantity" : "simple",
				targetAmount: spec.target?.amount ?? null,
				targetUnit: spec.target?.unit ?? null,
				frequency: spec.perWeek
					? { type: "per-week", timesPerWeek: spec.perWeek }
					: { type: "daily" },
			});
			for (const reminder of spec.reminders ?? []) {
				await createReminder({
					habitId: habit.id,
					hour: reminder.hour,
					minute: reminder.minute,
					weekdays: reminderWeekdays(reminder.weekdays),
					enabled: true,
				});
			}
			applied.push({ habit, hasReminders: (spec.reminders ?? []).length > 0 });
		}

		await setSetting(SEEN_FIRST_RUN_SETTING_KEY, "true");
		await setSetting(STARTER_PROFILE_SETTING_KEY, String(profile.version));
		return applied;
	});
}
