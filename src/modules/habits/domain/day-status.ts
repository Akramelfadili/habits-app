import { isAfter, isBefore, isSameDay, parseISO, startOfDay } from "date-fns";
import { toDayKey } from "@/utils/day-key";
import { getHabitStrategy } from "../strategies/frequency-strategy";
import type { Entry, Habit } from "../types";
import { offScheduleChecker } from "./off-schedule";
import { isEntryComplete } from "./streaks";

/**
 * What one habit's one day *is* — the single answer behind Progress's rates,
 * week matrix, month calendar, year map and day detail (V3-3a), and behind
 * Monthly, Yearly and Habit Detail's 90-day rate. A cell is exactly one status:
 *
 * - `done` — completed (a Break habit's resisted day is a completed entry, D8).
 * - `partial` — a quantity habit logged below its target (`level` 1 or 2).
 * - `missed` — due, past, nothing logged.
 * - `frozen` — covered by a freeze (D13): excused, outside every rate.
 * - `bonus` — logged on a day that wasn't owed (D11): shown, never counted.
 * - `not-due` — a rest day, a × per week habit's day it doesn't need, or a
 *   paused (archived) day: never missed.
 * - `before-start` — before the habit existed.
 * - `nothing-logged` — would be `missed`, but nothing has ever been logged
 *   (the "fresh week isn't a failed week" state, P4).
 * - `future` — after today.
 * - `today` — today, due, not logged yet: still open.
 *
 * Whether a day was owed always comes from the habit's FrequencyStrategy
 * (`wasScheduledOn` looking back, `isDueOn` for today), so × per week habits
 * are due on open days only — exactly the answers Detail's heatmap and the
 * streaks use.
 */
export type CellStatus =
	| "done"
	| "partial"
	| "missed"
	| "frozen"
	| "bonus"
	| "not-due"
	| "before-start"
	| "nothing-logged"
	| "future"
	| "today";

export type HabitDayCell = {
	status: CellStatus;
	/** How much of the target: 3 done, 1–2 partial (under / over half), 0 otherwise. */
	level: 0 | 1 | 2 | 3;
	/** The cell is today — it is ringed whatever its status. */
	isToday: boolean;
	/** The logged amount, when there is an entry (bonus and partial included). */
	value?: number;
};

type DayStatusInput = {
	habit: Habit;
	/** This habit's entries only. */
	entries: readonly Entry[];
	/** This habit's frozen days, "yyyy-MM-dd". */
	frozenDates: ReadonlySet<string>;
	today: Date;
	/** Nothing has ever been logged: a due past day reads `nothing-logged`, not `missed`. */
	nothingLogged?: boolean;
};

/**
 * Builds the habit's context once — completions bucketed, entries and freezes
 * keyed by day — and returns an O(1)-per-day classifier. Callers walk days
 * with it; nothing scans entries per day.
 */
export function habitDayClassifier({
	habit,
	entries,
	frozenDates,
	today,
	nothingLogged = false,
}: DayStatusInput): (date: Date) => HabitDayCell {
	const strategy = getHabitStrategy(habit);
	const entryByDay = new Map(entries.map((entry) => [entry.date, entry]));
	const completedDates = entries
		.filter((entry) => isEntryComplete(habit, entry))
		.map((entry) => parseISO(entry.date));
	const context = { completedDates };
	const isOffSchedule = offScheduleChecker(habit, entries);
	const todayStart = startOfDay(today);
	const createdStart = startOfDay(habit.createdAt);

	return (date) => {
		const isToday = isSameDay(date, todayStart);
		const cell = (
			status: CellStatus,
			level: HabitDayCell["level"] = 0,
			value?: number,
		): HabitDayCell => ({
			status,
			level,
			isToday,
			...(value === undefined ? {} : { value }),
		});

		if (isBefore(date, createdStart)) return cell("before-start");
		if (isAfter(date, todayStart)) return cell("future");

		const key = toDayKey(date);
		const entry = entryByDay.get(key);
		const frozen = frozenDates.has(key);

		if (entry && isEntryComplete(habit, entry)) {
			// A frozen day is never a bonus: the freeze says it was owed.
			return !frozen && isOffSchedule(entry)
				? cell("bonus", 3, entry.value)
				: cell("done", 3, entry.value);
		}
		if (frozen) return cell("frozen", 0, entry?.value);
		if (entry) {
			return isOffSchedule(entry)
				? cell("bonus", 0, entry.value)
				: cell("partial", partialLevel(habit, entry), entry.value);
		}
		if (isToday) {
			return strategy.isDueOn(date, context) ? cell("today") : cell("not-due");
		}
		if (!strategy.wasScheduledOn(date, context)) return cell("not-due");
		return cell(nothingLogged ? "nothing-logged" : "missed");
	};
}

/** Under half the target is level 1, at least half (but not all) level 2 — Detail's heatmap rule. */
function partialLevel(habit: Habit, entry: Entry): 1 | 2 {
	if (!habit.targetAmount) return 1;
	return (entry.value ?? 0) / habit.targetAmount >= 0.5 ? 2 : 1;
}
