import { z } from "zod";
import {
	BUILT_IN_CATEGORIES,
	MAX_HABIT_NAME_LENGTH,
	MAX_TARGET_AMOUNT,
	MAX_TARGET_UNIT_LENGTH,
	MAX_TIMES_PER_WEEK,
	MIN_TARGET_AMOUNT,
	MIN_TIMES_PER_WEEK,
} from "../constants";
import type { IsoWeekday } from "../types";

export const STARTER_PROFILE_SETTING_KEY = "dev.starterProfile";

const BUILT_IN_NAMES = BUILT_IN_CATEGORIES.map((category) => category.name) as [
	string,
	...string[],
];

const isoWeekday = z.number().int().min(1).max(7);

const reminderSchema = z.object({
	hour: z.number().int().min(0).max(23),
	minute: z.number().int().min(0).max(59),
	weekdays: z.array(isoWeekday).min(1).max(7).optional(),
});

const habitSchema = z.object({
	name: z.string().trim().min(1).max(MAX_HABIT_NAME_LENGTH),
	category: z.enum(BUILT_IN_NAMES),
	perWeek: z
		.number()
		.int()
		.min(MIN_TIMES_PER_WEEK)
		.max(MAX_TIMES_PER_WEEK)
		.optional(),
	target: z
		.object({
			amount: z.number().int().min(MIN_TARGET_AMOUNT).max(MAX_TARGET_AMOUNT),
			unit: z.string().trim().min(1).max(MAX_TARGET_UNIT_LENGTH),
		})
		.optional(),
	reminders: z.array(reminderSchema).max(5).optional(),
});

const starterProfileSchema = z
	.object({
		version: z.number().int().min(1),
		// Opt-in guard against wiping real check-ins, notes or frozen days on a first apply.
		replace: z.boolean().optional(),
		habits: z.array(habitSchema).min(1).max(100),
	})
	.refine(
		(profile) =>
			new Set(profile.habits.map((habit) => habit.name.toLowerCase())).size ===
			profile.habits.length,
		{ message: "duplicate habit name" },
	);

export type StarterProfile = z.infer<typeof starterProfileSchema>;
export type StarterHabit = StarterProfile["habits"][number];

export type ParsedStarterProfile =
	| { status: "absent" }
	| { status: "invalid"; reason: "invalid_json" | "invalid_shape" }
	| { status: "ok"; profile: StarterProfile };

// Never echoes the content: the reason is a code, because it holds personal habit names.
export function parseStarterProfile(
	raw: string | undefined,
): ParsedStarterProfile {
	if (raw === undefined || raw.trim() === "") return { status: "absent" };
	let json: unknown;
	try {
		json = JSON.parse(raw);
	} catch {
		return { status: "invalid", reason: "invalid_json" };
	}
	const result = starterProfileSchema.safeParse(json);
	if (!result.success) return { status: "invalid", reason: "invalid_shape" };
	return { status: "ok", profile: result.data };
}

export function reminderWeekdays(
	weekdays: readonly number[] | undefined,
): IsoWeekday[] {
	return (weekdays ?? [1, 2, 3, 4, 5, 6, 7]) as IsoWeekday[];
}
