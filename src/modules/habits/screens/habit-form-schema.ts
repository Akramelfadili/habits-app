import { z } from "zod";
import type { HabitAccentKey } from "@/theme/theme";
import {
	DEFAULT_TIMES_PER_WEEK,
	HABIT_COLORS,
	HABIT_ICONS,
	type HabitIconKey,
	MAX_TARGET_AMOUNT,
	MAX_TARGET_UNIT_LENGTH,
	MAX_TIMES_PER_WEEK,
	MIN_TARGET_AMOUNT,
	MIN_TIMES_PER_WEEK,
} from "../constants";
import type { Frequency, IsoWeekday } from "../types";

const iconKeys = HABIT_ICONS.map((entry) => entry.key) as [
	HabitIconKey,
	...HabitIconKey[],
];
const colorKeys = HABIT_COLORS as [HabitAccentKey, ...HabitAccentKey[]];

export const NO_WEEKDAYS_MESSAGE = "Pick at least one day.";
export const NO_TARGET_UNIT_MESSAGE =
	'Give this target a unit, e.g. "glasses".';

/**
 * Frequency is kept as three flat fields rather than the `Frequency` union so
 * switching modes doesn't throw away what was picked in the other modes; only
 * the active mode's field is saved (see `toFrequency`).
 */
export const habitFormSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, "Give this habit a name.")
			.max(40, "Keep the name under 40 characters."),
		icon: z.enum(iconKeys),
		color: z.enum(colorKeys),
		category: z
			.string()
			.trim()
			.max(40, "Keep the category under 40 characters."),
		direction: z.enum(["build", "break"]),
		targetType: z.enum(["simple", "quantity"]),
		targetAmount: z
			.number()
			.int()
			.min(MIN_TARGET_AMOUNT)
			.max(MAX_TARGET_AMOUNT),
		targetUnit: z
			.string()
			.trim()
			.max(
				MAX_TARGET_UNIT_LENGTH,
				`Keep the unit under ${MAX_TARGET_UNIT_LENGTH} characters.`,
			),
		frequencyType: z.enum(["daily", "weekdays", "per-week"]),
		weekdays: z.array(z.number().int().min(1).max(7)),
		timesPerWeek: z
			.number()
			.int()
			.min(MIN_TIMES_PER_WEEK)
			.max(MAX_TIMES_PER_WEEK),
	})
	.superRefine((values, ctx) => {
		if (values.frequencyType === "weekdays" && values.weekdays.length === 0) {
			ctx.addIssue({
				code: "custom",
				path: ["weekdays"],
				message: NO_WEEKDAYS_MESSAGE,
			});
		}
		if (values.targetType === "quantity" && values.targetUnit.trim() === "") {
			ctx.addIssue({
				code: "custom",
				path: ["targetUnit"],
				message: NO_TARGET_UNIT_MESSAGE,
			});
		}
	});

export type HabitFormValues = z.infer<typeof habitFormSchema>;

type FrequencyFormValues = Pick<
	HabitFormValues,
	"frequencyType" | "weekdays" | "timesPerWeek"
>;

export const DEFAULT_FREQUENCY_FORM_VALUES: FrequencyFormValues = {
	frequencyType: "daily",
	weekdays: [],
	timesPerWeek: DEFAULT_TIMES_PER_WEEK,
};

export function toFrequency(values: FrequencyFormValues): Frequency {
	switch (values.frequencyType) {
		case "weekdays":
			return {
				type: "weekdays",
				days: [...values.weekdays].sort((a, b) => a - b) as IsoWeekday[],
			};
		case "per-week":
			return { type: "per-week", timesPerWeek: values.timesPerWeek };
		default:
			return { type: "daily" };
	}
}

export function toFrequencyFormValues(
	frequency: Frequency,
): FrequencyFormValues {
	return {
		...DEFAULT_FREQUENCY_FORM_VALUES,
		frequencyType: frequency.type,
		...(frequency.type === "weekdays" && { weekdays: [...frequency.days] }),
		...(frequency.type === "per-week" && {
			timesPerWeek: frequency.timesPerWeek,
		}),
	};
}
