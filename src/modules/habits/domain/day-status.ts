import { parseISO, startOfDay } from "date-fns";
import { getHabitStrategy } from "../strategies/frequency-strategy";
import type { Entry, Habit } from "../types";
import { offScheduleChecker } from "./off-schedule";
import { isEntryComplete } from "./streaks";

// The single answer to "what was this habit's day", shared by every Progress view, Monthly,
// Yearly and Habit Detail so none can disagree. `nothing-logged` is a would-be `missed` on a
// habit never logged: a fresh week isn't a failed week.
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
	level: 0 | 1 | 2 | 3;
	isToday: boolean;
	value?: number;
};

type DayStatusInput = {
	habit: Habit;
	entries: readonly Entry[];
	frozenDates: ReadonlySet<string>;
	today: Date;
	nothingLogged?: boolean;
};

export function habitDayClassifier({
	habit,
	entries,
	frozenDates,
	today,
	nothingLogged = false,
}: DayStatusInput): (date: Date) => HabitDayCell {
	const strategy = getHabitStrategy(habit);
	const entryByDay = new Map<string, Entry>();
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
	// Built lazily: only a half-logged day needs the full off-schedule check.
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
				// A frozen day is never a bonus: the freeze says it was owed.
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

// `toDayKey` without date-fns' formatter, which dominated the cost on a five-year grid;
// `day-status.test.ts` pins the equivalence.
export function fastDayKey(date: Date): string {
	const month = date.getMonth() + 1;
	const day = date.getDate();
	return `${date.getFullYear()}-${month < 10 ? "0" : ""}${month}-${day < 10 ? "0" : ""}${day}`;
}

function partialLevel(habit: Habit, entry: Entry): 1 | 2 {
	if (!habit.targetAmount) return 1;
	return (entry.value ?? 0) / habit.targetAmount >= 0.5 ? 2 : 1;
}
