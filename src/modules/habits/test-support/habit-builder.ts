import type { CreateHabitInput, Habit } from "../types";

/**
 * Shared test builders — every test that needs a habit starts from these and
 * overrides only the fields it actually cares about, so adding a field to
 * `Habit` means updating one place instead of every test file.
 */
const BUILDER_DATE = new Date("2026-01-01");

export function makeHabitInput(
	overrides: Partial<CreateHabitInput> = {},
): CreateHabitInput {
	return {
		name: "Read",
		icon: "book",
		color: "blue",
		category: null,
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "daily" },
		...overrides,
	};
}

export function makeHabit(overrides: Partial<Habit> = {}): Habit {
	return {
		id: 1,
		...makeHabitInput(),
		createdAt: BUILDER_DATE,
		updatedAt: BUILDER_DATE,
		...overrides,
	};
}
