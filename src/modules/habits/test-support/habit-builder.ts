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

/**
 * Shared test builders — every test that needs a habit starts from these and
 * overrides only the fields it actually cares about, so adding a field to
 * `Habit` means updating one place instead of every test file.
 */
const BUILDER_DATE = new Date("2026-01-01");

/**
 * The built-ins as a freshly migrated database stores them — autoincrement
 * ids 1–10 in BUILT_IN_CATEGORIES order — so repository tests against the
 * real test db and plain unit tests agree on ids.
 */
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

/** A custom category — rotation slot 1's look (ring/330) unless overridden. */
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

/** A logged day. Override `habitId`, `date` and `value` as the test needs. */
export function makeEntry(overrides: Partial<Entry> = {}): Entry {
	return {
		id: 1,
		habitId: 1,
		date: "2026-01-01",
		createdAt: BUILDER_DATE,
		...overrides,
	};
}

/** A freeze on one missed day (HAB-08). */
export function makeFreeze(overrides: Partial<FrozenDay> = {}): FrozenDay {
	return {
		id: 1,
		habitId: 1,
		date: "2026-01-01",
		createdAt: BUILDER_DATE,
		...overrides,
	};
}

/** Frequency literals — `frequency: daily()` instead of `{ type: "daily" }`. */
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

/**
 * A category by name — the built-in if it is one, otherwise a custom with an
 * id stable for that name across a test file, so grouping by id behaves.
 */
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
