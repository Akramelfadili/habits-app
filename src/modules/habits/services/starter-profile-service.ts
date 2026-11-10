import { getSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { log } from "@/lib/logger/logger";
import {
	parseStarterProfile,
	STARTER_PROFILE_SETTING_KEY,
} from "../dev/starter-profile";
import { getAllHabits } from "../repositories/habit-repository";
import {
	countUserData,
	replaceHabitsWithStarterProfile,
} from "../repositories/starter-profile-repository";
import { cancelHabitNotifications, syncAfterWrite } from "./reminder-service";

export type StarterProfileResult =
	| "absent"
	| "invalid"
	| "unchanged"
	| "refused"
	| "applied"
	| "failed";

// Applies only when the stored version marker differs, so later in-app changes persist. With no
// marker it refuses to replace a database holding real logs unless the profile says
// `"replace": true`. Never logs a habit name. The caller owns the dev flag.
export async function applyStarterProfile(
	raw: string | undefined,
): Promise<StarterProfileResult> {
	const parsed = parseStarterProfile(raw);
	if (parsed.status === "absent") return "absent";
	if (parsed.status === "invalid") {
		log.warn("dev.starter_profile.invalid", { reason: parsed.reason });
		return "invalid";
	}

	const { profile } = parsed;
	try {
		const marker = await getSetting(STARTER_PROFILE_SETTING_KEY);
		if (marker === String(profile.version)) return "unchanged";

		if (marker === null) {
			const counts = await countUserData();
			if (
				!profile.replace &&
				counts.entries + counts.notes + counts.frozenDays > 0
			) {
				log.warn("dev.starter_profile.refused", counts);
				return "refused";
			}
		}

		const previousIds = (await getAllHabits()).map((habit) => habit.id);
		const applied = await replaceHabitsWithStarterProfile(profile);

		for (const id of previousIds) {
			try {
				await cancelHabitNotifications(id);
			} catch (error) {
				log.error("dev.starter_profile.cancel_failed", { error });
			}
		}

		const withReminders = applied.filter((entry) => entry.hasReminders);
		for (const { habit } of withReminders) await syncAfterWrite(habit);

		log.info("dev.starter_profile.applied", {
			version: profile.version,
			count: applied.length,
			withReminders: withReminders.length,
		});
		return "applied";
	} catch (error) {
		log.error("dev.starter_profile.failed", { error });
		return "failed";
	}
}
