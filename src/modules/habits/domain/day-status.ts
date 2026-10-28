import { parseISO, startOfDay } from "date-fns";
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
	const entryByDay = new Map<string, Entry>();
	// One parse per completed entry, shared by the strategy's context and the bonus check.
	const completedDates: Date[] = [];
	const completedDateByDay = new Map<string, Date>();
	for (const entry of entries) {
		entryByDay.set(entry.date, entry);
		if (!isEntryComplete(habit, entry)) continue;
		const day = parseISO(entry.date);
		completedDates.push(day);
		completedDateByDay.set(entry.date, day);
	}
	const context = { completedDates };
	// Only a half-logged day needs the full off-schedule check (the entry counts
	// as done for its own day); built on first use.
	let partialChecker: ((entry: Entry) => boolean) | undefined;
	const isPartialOffSchedule = (entry: Entry) => {
		partialChecker ??= offScheduleChecker(habit, entries);
		return partialChecker(entry);
	};
	const todayKey = fastDayKey(today);
	const todayTime = startOfDay(today).getTime();
	const createdTime = startOfDay(habit.createdAt).getTime();

	return (date) => {
		const time = date.getTime();
		const key = fastDayKey(date);
		const isToday = key === todayKey;

		if (time < createdTime) return makeCell("before-start", 0, isToday);
		if (time > todayTime) return makeCell("future", 0, isToday);

		const entry = entryByDay.get(key);
		const frozen = frozenDates.has(key);

		if (entry) {
			const completedOn = completedDateByDay.get(key);
			if (completedOn) {
				// A frozen day is never a bonus: the freeze says it was owed. A
				// completed day is already in the context, so one strategy call says
				// whether it was owed.
				const bonus = !frozen && !strategy.wasScheduledOn(completedOn, context);
				return makeCell(bonus ? "bonus" : "done", 3, isToday, entry.value);
			}
			if (frozen) return makeCell("frozen", 0, isToday, entry.value);
			return isPartialOffSchedule(entry)
				? makeCell("bonus", 0, isToday, entry.value)
				: makeCell("partial", partialLevel(habit, entry), isToday, entry.value);
		}
		if (frozen) return makeCell("frozen", 0, isToday);
		if (isToday) {
			return makeCell(
				strategy.isDueOn(date, context) ? "today" : "not-due",
				0,
				true,
			);
		}
		if (!strategy.wasScheduledOn(date, context)) {
			return makeCell("not-due", 0, false);
		}
		return makeCell(nothingLogged ? "nothing-logged" : "missed", 0, false);
	};
}

function makeCell(
	status: CellStatus,
	level: HabitDayCell["level"],
	isToday: boolean,
	value?: number,
): HabitDayCell {
	return value === undefined
		? { status, level, isToday }
		: { status, level, isToday, value };
}

/**
 * `toDayKey` without date-fns' formatter: the classifier keys every day of
 * every habit, and formatting dominated its cost on a five-year grid. Same
 * "yyyy-MM-dd" local calendar day (`day-status.test.ts` pins the equivalence).
 */
export function fastDayKey(date: Date): string {
	const month = date.getMonth() + 1;
	const day = date.getDate();
	return `${date.getFullYear()}-${month < 10 ? "0" : ""}${month}-${day < 10 ? "0" : ""}${day}`;
}

/** Under half the target is level 1, at least half (but not all) level 2 — Detail's heatmap rule. */
function partialLevel(habit: Habit, entry: Entry): 1 | 2 {
	if (!habit.targetAmount) return 1;
	return (entry.value ?? 0) / habit.targetAmount >= 0.5 ? 2 : 1;
}
