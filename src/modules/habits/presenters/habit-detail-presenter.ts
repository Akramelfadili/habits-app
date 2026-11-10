import { format, parseISO, startOfDay } from "date-fns";
import type { CompletionCellState } from "@/components/ui/composite/completion-cell";
import type { LegendEntry } from "@/components/ui/composite/completion-legend";
import type { CompletionRowsCell } from "@/components/ui/composite/completion-rows";
import { formatDayMonth, formatDayMonthShort } from "@/utils/format";
import { atIndex } from "@/utils/indexed";
import type {
	CompletionRate,
	HeatmapDay,
	HistoryRow,
	LongestStreak,
	StreakReset,
} from "../domain/habit-history";
import { detailCopy } from "../messages";
import type { Habit, IsoWeekday, Reminder } from "../types";
import { scheduleLabel } from "./habit-schedule-label";
import type { StatTileData } from "./progress-presenter";
import { formatReminderTime, reminderDaysLabel } from "./reminders-helpers";

const fullDay = (day: IsoWeekday) => detailCopy.words.weekdays[day - 1];

const lowerFirst = (text: string) =>
	text.charAt(0).toLowerCase() + text.slice(1);

function targetLabel(habit: Habit): string | null {
	if (habit.targetType !== "quantity" || habit.targetAmount === null)
		return null;
	return `${habit.targetAmount} ${habit.targetUnit ?? ""}`.trim();
}

function cadenceLabel(habit: Habit): string {
	return habit.frequency.type === "daily"
		? detailCopy.words.daily
		: scheduleLabel(habit);
}

function spokenCadence(habit: Habit): string {
	const { frequency } = habit;
	if (frequency.type === "daily") return detailCopy.words.dailySpoken;
	if (frequency.type === "per-week") {
		return detailCopy.words.perWeekSpoken(frequency.timesPerWeek);
	}
	const names = [...frequency.days]
		.sort((a, b) => a - b)
		.map((day) => fullDay(day));
	if (names.length === 7) return detailCopy.words.dailySpoken;
	if (names.length <= 1) return names.join("");
	return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export function detailEyebrow(habit: Habit): string {
	const parts = [habit.category.name];
	if (habit.direction === "break") parts.push(detailCopy.words.break);
	parts.push(cadenceLabel(habit));
	const target = targetLabel(habit);
	if (target) parts.push(target);
	if (habit.archivedAt) parts.push(detailCopy.words.archived);
	return parts.join(" · ");
}

export function detailHeaderLabel(habit: Habit): string {
	const parts = [
		habit.category.name,
		habit.direction === "break" ? detailCopy.words.breakSpoken : null,
		spokenCadence(habit),
		targetLabel(habit),
		habit.archivedAt ? detailCopy.words.archivedSpoken : null,
	].filter(Boolean);
	return `${habit.name}. ${parts.join(", ")}.`;
}

type TileInput = {
	habit: Habit;
	currentStreak: number;
	longest: LongestStreak;
	rate: CompletionRate;
	/** The 90-day rate against the 90 days before, in whole points; null when there is nothing to compare. */
	rateDelta: number | null;
	freezesRemaining: number;
	/** Set only in the month a streak reset with the pool empty. */
	streakReset: StreakReset | null;
	hasEntries: boolean;
	/** Restored and not yet logged since: a 0 is a fresh start, not a lost streak. */
	freshStart: boolean;
};

/** Below this many due days the 90-day rate says when it starts instead. */
const RATE_MIN_DUE_DAYS = 7;

/**
 * The three tiles under the title. Build habits say streak and days; Break habits say
 * resisting and nights, and the rate says "resisted". New habits say when each tile starts,
 * an archived one that its streak is paused, a restored one that it starts fresh, and in the
 * month a streak reset with no freezes left the third tile is the amber freeze count.
 * Never "failed".
 */
export function detailTiles(input: TileInput): StatTileData[] {
	const { habit } = input;
	const isBreak = habit.direction === "break";
	const stats = detailCopy.stats;

	let streak: StatTileData;
	if (habit.archivedAt) {
		streak = tile("streak", "—", stats.paused, true);
	} else if (!input.hasEntries) {
		streak = tile("streak", "0", stats.startsWithFirstLog, true);
	} else if (input.freshStart) {
		streak = tile("streak", "0", stats.freshStart, true);
	} else {
		streak = tile(
			"streak",
			String(input.currentStreak),
			isBreak ? stats.nightsInARow : stats.inARow,
			input.currentStreak === 0,
		);
	}
	streak.label = isBreak ? stats.resisting : stats.streak;

	const longest =
		input.longest.days === 0
			? tile("longest", "—", stats.noneYet, true)
			: tile(
					"longest",
					String(input.longest.days),
					isBreak ? stats.nights : stats.days,
					false,
				);
	longest.label = stats.longest;

	let third: StatTileData;
	if (input.streakReset && !habit.archivedAt) {
		third = tile(
			"freezes",
			String(input.freezesRemaining),
			stats.freezesLeft(input.freezesRemaining),
			false,
		);
		third.label = stats.freezes;
		third.tone = "warning";
	} else {
		third = rateTile(input);
	}

	return [streak, longest, third];
}

function tile(
	key: string,
	value: string,
	caption: string,
	muted: boolean,
): StatTileData {
	return { key, label: "", value, caption, muted };
}

function rateTile(input: TileInput): StatTileData {
	const { habit, rate } = input;
	const stats = detailCopy.stats;
	const rateless = rate.fraction === null || rate.scheduled < RATE_MIN_DUE_DAYS;
	let result: StatTileData;
	if (rateless) {
		result = tile("rate", "—", stats.afterSevenDays, true);
	} else {
		const value = `${Math.round((rate.fraction ?? 0) * 100)}%`;
		const caption = habit.archivedAt
			? stats.untilArchive(formatDayMonthShort(habit.archivedAt))
			: rate.skippedPaused
				? stats.pausedDaysExcluded
				: habit.direction === "break"
					? stats.resisted
					: input.rateDelta !== null
						? stats.delta(input.rateDelta)
						: stats.ofDays(rate.completed, rate.scheduled);
		result = tile("rate", value, caption, false);
	}
	result.label = stats.rate;
	return result;
}

export function detailRemindersValue(
	habit: Habit,
	reminders: readonly Reminder[],
): string {
	if (habit.archivedAt) return detailCopy.reminders.paused;
	if (reminders.length === 0) return detailCopy.reminders.none;
	const on = reminders.filter((reminder) => reminder.enabled);
	if (on.length === 0) return detailCopy.reminders.allOff;
	if (on.length > 1) {
		return detailCopy.reminders.nOn(
			on.length,
			on.map(formatReminderTime).join(", "),
		);
	}
	const only = atIndex(on, 0); // exactly one is on: the two returns above cover 0 and 2+
	const days = reminderDaysLabel(only.weekdays);
	return detailCopy.reminders.timeDays(
		formatReminderTime(only),
		days === "Every day" ? detailCopy.words.dailySpoken : days,
	);
}

/**
 * What VoiceOver says for the Reminders row (08.3): "Reminders, 07:00, Tuesday
 * and Thursday." With none, several, all off or while archived it says the value
 * the row shows.
 */
export function detailRemindersLabel(
	habit: Habit,
	reminders: readonly Reminder[],
): string {
	const on = reminders.filter((reminder) => reminder.enabled);
	if (habit.archivedAt || on.length !== 1) {
		return `${detailCopy.reminders.label}, ${detailRemindersValue(habit, reminders)}`;
	}
	const only = atIndex(on, 0);
	const days = [...new Set(only.weekdays)].sort((a, b) => a - b);
	const spoken =
		days.length === 7
			? "daily"
			: days
					.map((day) => fullDay(day))
					.join(", ")
					.replace(/, ([^,]*)$/, " and $1");
	return detailCopy.reminders.spoken(formatReminderTime(only), spoken);
}

export function gridRangeLabel(habit: Habit, today: Date): string {
	return startOfDay(habit.createdAt).getTime() === startOfDay(today).getTime()
		? detailCopy.grid.createdToday
		: cadenceLabel(habit);
}

function cellState(day: HeatmapDay): CompletionCellState {
	switch (day.status) {
		case "logged":
			return { kind: "level", level: day.level ?? 3 };
		case "missed":
			return { kind: "level", level: 0 };
		case "bonus":
			return { kind: "bonus" };
		case "frozen":
			return { kind: "frozen" };
		case "paused":
			return { kind: "paused" };
		case "reset":
			return { kind: "reset" };
		case "pending":
			return { kind: "nothing-logged" };
		case "future":
			return { kind: "future" };
		case "before-start":
			return { kind: "before-start" };
		default:
			return { kind: "not-due" };
	}
}

function statusWord(habit: Habit, day: HeatmapDay): string | null {
	const words = detailCopy.grid.status;
	const isBreak = habit.direction === "break";
	switch (day.status) {
		case "logged":
			return day.level === 3 || day.level === undefined
				? isBreak
					? words.resisted
					: words.done
				: words.partial;
		case "missed":
			return isBreak ? words.slipped : words.missed;
		case "frozen":
			return words.frozen;
		case "bonus":
			return words.bonus;
		case "paused":
			return words.paused;
		case "reset":
			return words.reset;
		case "pending":
			return words.notLoggedYet;
		default:
			return null;
	}
}

export type WeekRow = {
	key: string;
	cells: CompletionRowsCell[];
	label: string;
	/** The day Edit this day opens for: the latest day this week that is due and unlogged, else the latest that can be edited. Null when none can. */
	targetDate: Date | null;
};

function isUnlogged(day: HeatmapDay) {
	return (
		day.selectable &&
		(day.status === "missed" ||
			day.status === "reset" ||
			day.status === "pending")
	);
}

/**
 * The five week rows of the grid: each one tap target with one VoiceOver label for the
 * whole week, its cells decorative. A week with nothing to edit (before the habit started,
 * or still to come) has no target.
 */
export function weekRows(habit: Habit, weeks: HeatmapDay[][]): WeekRow[] {
	return weeks.map((week) => {
		const monday = atIndex(week, 0).date;
		const spoken = week.flatMap((day) => {
			const word = statusWord(habit, day);
			return word
				? [`${fullDay((day.date.getDay() || 7) as IsoWeekday)} ${word}`]
				: [];
		});
		const editable = week.filter((day) => day.selectable);
		const target =
			[...week].reverse().find(isUnlogged) ?? editable.at(-1) ?? null;
		const start = formatDayMonth(monday);
		const label = detailCopy.grid.weekLabel(
			start,
			spoken.length > 0
				? spoken.join(", ")
				: detailCopy.grid.status.beforeStart,
		);
		return {
			key: format(monday, "yyyy-MM-dd"),
			label,
			targetDate: target?.date ?? null,
			cells: week.map((day) => ({
				key: format(day.date, "yyyy-MM-dd"),
				state: cellState(day),
				today: day.isToday,
				hidden: true,
			})),
		};
	});
}

/** The legend: one swatch and word for each state the grid actually shows (never a guess), in the habit's own words. */
export function gridLegend(habit: Habit, weeks: HeatmapDay[][]): LegendEntry[] {
	const present = new Set(weeks.flat().map((day) => day.status));
	const legend = detailCopy.grid.legend;
	const isBreak = habit.direction === "break";
	const entries: LegendEntry[] = [];
	if (weeks.flat().some((day) => day.status === "logged")) {
		entries.push({
			state: { kind: "level", level: 3 },
			label: isBreak ? legend.resisted : legend.done,
		});
	}
	if (present.has("missed")) {
		entries.push({
			state: { kind: "level", level: 0 },
			label: isBreak ? legend.slipped : legend.missed,
		});
	}
	if (present.has("frozen")) {
		entries.push({ state: { kind: "frozen" }, label: legend.frozen });
	}
	if (present.has("bonus")) {
		entries.push({ state: { kind: "bonus" }, label: legend.bonus });
	}
	if (present.has("reset")) {
		entries.push({ state: { kind: "reset" }, label: legend.reset });
	}
	if (present.has("paused")) {
		entries.push({ state: { kind: "paused" }, label: legend.paused });
	}
	if (present.has("not-scheduled")) {
		entries.push({ state: { kind: "not-due" }, label: legend.notDue });
	}
	return entries;
}

export function resetNotice(reset: StreakReset | null): string | null {
	return reset
		? detailCopy.grid.resetNotice(format(reset.missedDate, "EEE d MMM"))
		: null;
}

export type HistoryRowView = {
	key: string;
	date: string;
	status: string;
	tone: "default" | "frozen";
	tag?: string;
	note?: string;
	accessibilityLabel: string;
};

/** One line of history: the date and what the day was. A quantity day says how much. No time. */
export function historyRowView(habit: Habit, row: HistoryRow): HistoryRowView {
	const copy = detailCopy.history;
	const isBreak = habit.direction === "break";
	const day = parseISO(row.date);
	const quantity =
		habit.targetType === "quantity" && habit.targetAmount !== null
			? copy.partial(row.value ?? 0, habit.targetAmount, habit.targetUnit)
			: null;
	let status: string;
	let tone: "default" | "frozen" = "default";
	let tag: string | undefined;
	switch (row.kind) {
		case "done":
			status = isBreak ? copy.resisted : copy.done;
			break;
		case "partial":
			status = quantity ?? copy.done;
			break;
		case "missed":
			status = isBreak ? copy.slipped : copy.missed;
			break;
		case "frozen":
			status = copy.frozen;
			tone = "frozen";
			break;
		case "bonus":
			status = `${quantity ?? copy.done} · ${copy.bonus}`;
			tag = copy.bonusTag;
			break;
		default:
			status = copy.noted;
	}
	const spoken = `${format(day, "EEEE d MMMM")}, ${lowerFirst(status)}${row.note ? `. ${row.note}` : ""}`;
	return {
		key: row.date,
		date: format(day, "EEE d MMM"),
		status,
		tone,
		tag,
		note: row.note ?? undefined,
		accessibilityLabel: spoken,
	};
}
