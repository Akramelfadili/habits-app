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

/**
 * A category's icon (HAB-24). Drawn as SF Symbols via `CATEGORY_SHAPE_SYMBOLS`
 * — a known approximation of the mockup's hand-drawn shapes.
 */
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

/** What a category looks like — and so what every habit in it looks like. */
export type CategoryAppearance = {
	shape: CategoryShape;
	/** OKLCH hue; null only for the neutral built-in "Other". */
	hue: number | null;
};

/**
 * One of the managed set (HAB-24): ten fixed built-ins, then the user's own in
 * creation order. Supplies its habits' icon and color.
 */
export type Category = CategoryAppearance & {
	id: number;
	name: string;
	builtIn: boolean;
};

/**
 * A category with the habits in it (HAB-25's Manage Categories) — archived
 * habits included, since deleting the category moves those too.
 */
export type CategoryUsage = {
	category: Category;
	/** Every habit in the category, in manual order. */
	habitNames: string[];
	/** How many of them are active; the rest are archived (the count line says both). */
	activeCount: number;
	archivedCount: number;
};

/** A deleted custom category and where it stood in the stored order, so Undo can put it back exactly (DC6). */
export type DeletedCategory = {
	category: Category;
	sortOrder: number;
};

/** Icon and color are never user-chosen — the caller passes the rotation's pick. */
export type CreateCategoryInput = CategoryAppearance & { name: string };

/** What the habit live-query hooks return: `loaded` is false until the first result (audit A5-04). */
export type HabitsResult = { habits: Habit[]; loaded: boolean };

export type Habit = {
	id: number;
	name: string;
	/** Always exactly one (HAB-24) — also the source of the habit's icon and color. */
	category: Category;
	direction: HabitDirection;
	targetType: HabitTargetType;
	/** Set only when targetType is "quantity" (HAB-07) — null for simple-check habits. */
	targetAmount: number | null;
	targetUnit: string | null;
	frequency: Frequency;
	/** Manual order within its category group (HAB-13) — lower first. */
	sortOrder: number;
	/** Set while archived (HAB-13); null for an active habit. */
	archivedAt: Date | null;
	/** Past archive periods — days streak math skips rather than counts as missed. */
	pauses: DayRange[];
	createdAt: Date;
	updatedAt: Date;
};

/** An inclusive run of calendar days, both ends "yyyy-MM-dd". */
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
	// direction is intentionally excluded — it's locked after creation (HAB-01).
};

/**
 * One completed/resisted day for a habit (HAB-03). For a simple-check habit,
 * presence is the whole signal. For a quantity habit (HAB-07), `value` holds
 * the logged amount — completion is `value >= habit.targetAmount`, computed
 * where it's needed rather than stored.
 */
export type Entry = {
	id: number;
	habitId: number;
	/** Calendar day, "yyyy-MM-dd". */
	date: string;
	/** Logged amount for a quantity habit — absent for simple-check entries. */
	value?: number;
	createdAt: Date;
};

/** How much has been logged, for Progress's "7 days of logs" gate (V3-3a). */
export type LoggedDays = {
	/** Distinct calendar days with at least one entry, any habit, bonus included. */
	count: number;
	/** The earliest such day, "yyyy-MM-dd"; null when nothing was ever logged. */
	firstDate: string | null;
	/** False until the first result: the gate must not flash "nothing logged". */
	loaded: boolean;
};

/**
 * One habit's missed day covered by a freeze (HAB-08) — drawn from the
 * shared monthly pool, not a per-habit allowance.
 */
export type FrozenDay = {
	id: number;
	habitId: number;
	/** The missed calendar day this freeze covers, "yyyy-MM-dd". */
	date: string;
	createdAt: Date;
};

/**
 * A free-text note on one habit's day (HAB-10) — independent of whether that
 * day has an entry, so a note never implies a completion.
 */
export type EntryNote = {
	habitId: number;
	/** Calendar day, "yyyy-MM-dd". */
	date: string;
	note: string;
};

/**
 * One habit's value for a retro-logged day (HAB-10): `false`/`true` for a
 * simple-check habit, a logged amount for a quantity habit (0 = nothing logged).
 */
export type DayLogValue = boolean | number;

/** What a retro log save writes for one day, in one go. */
export type DayLog = {
	/** Only the habits whose value actually changed. */
	values: { habitId: number; value: DayLogValue }[];
	/** The note's owner — the habit the sheet was opened from. */
	noteHabitId: number;
	/** Empty clears the note. */
	note: string;
};

/**
 * One reminder time on a habit (HAB-12). Each owns its weekday set — there is
 * no shared "repeat on" across a habit's reminders.
 */
export type Reminder = {
	id: number;
	habitId: number;
	/** 0–23, local time. */
	hour: number;
	/** 0–59. */
	minute: number;
	/** Sorted Mon → Sun. */
	weekdays: IsoWeekday[];
	enabled: boolean;
};

export type CreateReminderInput = Omit<Reminder, "id">;

/** A reminder queued on the New habit form, written with the habit when Save is tapped (F7). */
export type ReminderDraft = Pick<Reminder, "hour" | "minute" | "weekdays">;

/** Any subset of a reminder's editable fields. */
export type ReminderPatch = Partial<
	Pick<Reminder, "hour" | "minute" | "weekdays" | "enabled">
>;

/** The file format of a data export (HAB-15). */
export type ExportFormat = "csv" | "json";

/** Why an export failed, as far as the person needs to know (the cause goes to the log). */
export type ExportFailureReason =
	| { kind: "storage"; neededBytes: number }
	| { kind: "unknown" };

/** What the export confirm sheet lets the person choose. */
export type ExportOptions = {
	format: ExportFormat;
	includeArchived: boolean;
};
