import type { HabitAccentKey } from "@/theme/theme";
import type { HabitIconKey } from "./constants";

export type HabitDirection = "build" | "break";
export type HabitTargetType = "simple" | "quantity";

/** ISO weekday — 1 = Monday … 7 = Sunday (matches date-fns `getISODay`). */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** How often a habit is scheduled (HAB-02). Each type has its own FrequencyStrategy. */
export type Frequency =
	| { type: "daily" }
	| { type: "weekdays"; days: IsoWeekday[] }
	| { type: "per-week"; timesPerWeek: number };

export type FrequencyType = Frequency["type"];

export type Habit = {
	id: number;
	name: string;
	icon: HabitIconKey;
	color: HabitAccentKey;
	category: string | null;
	direction: HabitDirection;
	targetType: HabitTargetType;
	frequency: Frequency;
	createdAt: Date;
	updatedAt: Date;
};

export type CreateHabitInput = {
	name: string;
	icon: HabitIconKey;
	color: HabitAccentKey;
	category: string | null;
	direction: HabitDirection;
	targetType: HabitTargetType;
	frequency: Frequency;
};

export type UpdateHabitInput = {
	name: string;
	icon: HabitIconKey;
	color: HabitAccentKey;
	category: string | null;
	targetType: HabitTargetType;
	frequency: Frequency;
	// direction is intentionally excluded — it's locked after creation (HAB-01).
};

/** One completed/resisted day for a habit (HAB-03). Presence is the signal. */
export type Entry = {
	id: number;
	habitId: number;
	/** Calendar day, "yyyy-MM-dd". */
	date: string;
	createdAt: Date;
};
