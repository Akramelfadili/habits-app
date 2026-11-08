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

/**
 * Development builds only: makes the app hold exactly the starter profile's
 * habits (docs/how-to/starter-habits.md). Applies when the stored version
 * marker differs from the profile's version, and does nothing when it matches,
 * so changes made in the app afterwards persist. With no marker yet it refuses
 * to replace a database that already holds check-ins, notes or frozen days,
 * unless the profile says `"replace": true` (logs `dev.starter_profile.refused`,
 * counts only). An invalid profile, a refusal or a failed write changes nothing. Never rejects; never logs a habit name.
 *
 * The caller owns the dev flag (`__DEV__`) and the raw value — this module has
 * no way to be reached from production code.
 */
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

		// The old habits' schedules would otherwise outlive them.
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
