import { BUILT_IN_CATEGORIES, type BuiltInCategoryName } from "../constants";
import type {
	Category,
	CreateHabitInput,
	Entry,
	Frequency,
	FrozenDay,
	Habit,
	IsoWeekday,
} from "../types";

const BUILDER_DATE = new Date("2026-01-01");

// Same ids a freshly migrated database assigns, so repository tests and unit tests agree.
export const TEST_BUILT_IN_CATEGORIES: Category[] = BUILT_IN_CATEGORIES.map(
	(builtIn, index) => ({
		id: index + 1,
		name: builtIn.name,
		shape: builtIn.shape,
		hue: builtIn.hue,
		builtIn: true,
	}),
);

export function builtInCategory(name: BuiltInCategoryName): Category {
	const category = TEST_BUILT_IN_CATEGORIES.find((c) => c.name === name);
	if (!category) throw new Error(`No built-in "${name}"`);
	return category;
}

export function makeCategory(overrides: Partial<Category> = {}): Category {
	return {
		id: 11,
		name: "Morning",
		shape: "ring",
		hue: 330,
		builtIn: false,
		...overrides,
	};
}

export function makeHabitInput(
	overrides: Partial<CreateHabitInput> = {},
): CreateHabitInput {
	return {
		name: "Read",
		categoryId: builtInCategory("Other").id,
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "daily" },
		...overrides,
	};
}

export function makeHabit(overrides: Partial<Habit> = {}): Habit {
	const { categoryId: _categoryId, ...input } = makeHabitInput();
	return {
		id: 1,
		...input,
		category: builtInCategory("Other"),
		sortOrder: 1,
		archivedAt: null,
		pauses: [],
		createdAt: BUILDER_DATE,
		updatedAt: BUILDER_DATE,
		...overrides,
	};
}

export function makeEntry(overrides: Partial<Entry> = {}): Entry {
	return {
		id: 1,
		habitId: 1,
		date: "2026-01-01",
		createdAt: BUILDER_DATE,
		...overrides,
	};
}

export function makeFreeze(overrides: Partial<FrozenDay> = {}): FrozenDay {
	return {
		id: 1,
		habitId: 1,
		date: "2026-01-01",
		createdAt: BUILDER_DATE,
		...overrides,
	};
}

export function daily(): Frequency {
	return { type: "daily" };
}

export function weekdays(...days: IsoWeekday[]): Frequency {
	return { type: "weekdays", days };
}

export function perWeek(timesPerWeek: number): Frequency {
	return { type: "per-week", timesPerWeek };
}

const namedCustoms = new Map<string, Category>();

// A custom's id is stable per name across a test file, so grouping by id behaves.
export function categoryNamed(name: string): Category {
	const builtIn = TEST_BUILT_IN_CATEGORIES.find((c) => c.name === name);
	if (builtIn) return builtIn;
	let custom = namedCustoms.get(name);
	if (!custom) {
		custom = makeCategory({ id: 11 + namedCustoms.size, name });
		namedCustoms.set(name, custom);
	}
	return custom;
}
