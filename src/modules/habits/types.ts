export type HabitDirection = "build" | "break";
export type HabitTargetType = "simple" | "quantity";

export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Frequency =
	| { type: "daily" }
	| { type: "weekdays"; days: IsoWeekday[] }
	| { type: "per-week"; timesPerWeek: number };

export type FrequencyType = Frequency["type"];

export type CategoryShape =
	| "plus"
	| "bars"
	| "diamond"
	| "square"
	| "lines"
	| "grid"
	| "half"
	| "archive"
	| "dot"
	| "ring";

export type CategoryAppearance = {
	shape: CategoryShape;
	hue: number | null;
};

export type Category = CategoryAppearance & {
	id: number;
	name: string;
	builtIn: boolean;
};

// Archived habits are counted too, since deleting the category moves them as well.
export type CategoryUsage = {
	category: Category;
	habitNames: string[];
	activeCount: number;
	archivedCount: number;
};

export type DeletedCategory = {
	category: Category;
	sortOrder: number;
};

export type CreateCategoryInput = CategoryAppearance & { name: string };

export type HabitsResult = { habits: Habit[]; loaded: boolean };

export type Habit = {
	id: number;
	name: string;
	category: Category;
	direction: HabitDirection;
	targetType: HabitTargetType;
	targetAmount: number | null;
	targetUnit: string | null;
	frequency: Frequency;
	sortOrder: number;
	archivedAt: Date | null;
	// Streak math skips these days rather than counting them as missed.
	pauses: DayRange[];
	createdAt: Date;
	updatedAt: Date;
};

export type DayRange = {
	from: string;
	to: string;
};

export type CreateHabitInput = {
	name: string;
	categoryId: number;
	direction: HabitDirection;
	targetType: HabitTargetType;
	targetAmount: number | null;
	targetUnit: string | null;
	frequency: Frequency;
};

export type UpdateHabitInput = {
	name: string;
	categoryId: number;
	targetType: HabitTargetType;
	targetAmount: number | null;
	targetUnit: string | null;
	frequency: Frequency;
	// direction is excluded: it's locked after creation.
};

// Quantity completion (`value >= habit.targetAmount`) is computed where needed, not stored.
export type Entry = {
	id: number;
	habitId: number;
	date: string;
	value?: number;
	createdAt: Date;
};

export type LoggedDays = {
	count: number;
	firstDate: string | null;
	// False until the first result, so the gate doesn't flash "nothing logged".
	loaded: boolean;
};

export type FrozenDay = {
	id: number;
	habitId: number;
	date: string;
	createdAt: Date;
};

// Independent of any entry, so a note never implies a completion.
export type EntryNote = {
	habitId: number;
	date: string;
	note: string;
	updatedAt?: Date;
};

export type DayLogValue = boolean | number;

export type DayLog = {
	values: { habitId: number; value: DayLogValue }[];
	noteHabitId: number;
	note: string;
};

export type Reminder = {
	id: number;
	habitId: number;
	hour: number;
	minute: number;
	weekdays: IsoWeekday[];
	enabled: boolean;
	createdAt?: Date;
};

export type CreateReminderInput = Omit<Reminder, "id">;

export type ReminderDraft = Pick<Reminder, "hour" | "minute" | "weekdays">;

export type ReminderPatch = Partial<
	Pick<Reminder, "hour" | "minute" | "weekdays" | "enabled">
>;

export type ExportFormat = "csv" | "json";

export type ExportFailureReason =
	| { kind: "storage"; neededBytes: number }
	| { kind: "unknown" };

export type ExportOptions = {
	format: ExportFormat;
	includeArchived: boolean;
	includeNotes: boolean;
};
