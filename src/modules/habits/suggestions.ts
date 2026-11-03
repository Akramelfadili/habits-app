import type { BuiltInCategoryName } from "./constants";
import type { Frequency, HabitDirection } from "./types";

/**
 * The bundled suggestions (HAB-46, D10): ready-made habits kept in the app,
 * shown on Browse suggestions (BS1) and as First Run's quick picks (FR2). One
 * typed list, in display order; the copy around it lives in `messages.ts`.
 *
 * Each one carries every field the New habit form can be prefilled with (BS2),
 * so picking it never leaves a field to guess. A Break habit is always a check.
 */
export type Suggestion = {
	/** Stable id for keys and tests; never shown. */
	id: string;
	name: string;
	/** A built-in's name: it supplies the icon and colour, and the BS1 group. */
	category: BuiltInCategoryName;
	direction: HabitDirection;
	/** A daily quantity target, or null for a check. */
	target: { amount: number; unit: string } | null;
	frequency: Frequency;
};

export const SUGGESTIONS: readonly Suggestion[] = [
	{
		id: "drink-water",
		name: "Drink water",
		category: "Health",
		direction: "build",
		target: { amount: 8, unit: "glasses" },
		frequency: { type: "daily" },
	},
	{
		id: "cold-shower",
		name: "Cold shower",
		category: "Health",
		direction: "build",
		target: null,
		frequency: { type: "per-week", timesPerWeek: 3 },
	},
	{
		id: "meditate",
		name: "Meditate",
		category: "Mindfulness",
		direction: "build",
		target: null,
		frequency: { type: "daily" },
	},
	{
		id: "journal-5-min",
		name: "Journal 5 min",
		category: "Mindfulness",
		direction: "build",
		target: null,
		frequency: { type: "daily" },
	},
	{
		id: "morning-run",
		name: "Morning run",
		category: "Fitness",
		direction: "build",
		target: null,
		frequency: { type: "weekdays", days: [1, 3, 5] },
	},
	{
		id: "upper-body",
		name: "Upper body",
		category: "Fitness",
		direction: "build",
		target: null,
		frequency: { type: "weekdays", days: [2, 4] },
	},
	{
		id: "read-20-min",
		name: "Read 20 min",
		category: "Learning",
		direction: "build",
		target: null,
		frequency: { type: "daily" },
	},
	{
		// Productivity, as SY5 draws it ("No social media" under PRODUCTIVITY).
		id: "no-social-media",
		name: "No social media",
		category: "Productivity",
		direction: "break",
		target: null,
		frequency: { type: "daily" },
	},
	{
		id: "no-phone-in-bed",
		name: "No phone in bed",
		category: "Health",
		direction: "break",
		target: null,
		frequency: { type: "daily" },
	},
];

/** FR2's "Or pick one": five of the bundle, in the frame's order. */
export const FIRST_RUN_QUICK_PICK_IDS: readonly string[] = [
	"drink-water",
	"read-20-min",
	"meditate",
	"morning-run",
	"no-phone-in-bed",
];

export function findSuggestion(id: string): Suggestion | undefined {
	return SUGGESTIONS.find((suggestion) => suggestion.id === id);
}
