import type { HabitDayCell } from "./day-status";

// The one rate rule for every view: done / due. Frozen days leave both sides, bonus logs never
// count, and today joins only once done (a half-logged quantity day isn't a verdict yet).
export type Tally = {
	done: number;
	due: number;
	frozen: number;
	bonus: number;
};

export const EMPTY_TALLY: Tally = { done: 0, due: 0, frozen: 0, bonus: 0 };

// Mutates `tally`: hot loop over a year.
export function addToTally(tally: Tally, cell: HabitDayCell): Tally {
	switch (cell.status) {
		case "done":
			tally.done += 1;
			tally.due += 1;
			break;
		case "partial":
		case "missed":
			if (!cell.isToday) tally.due += 1;
			break;
		case "frozen":
			tally.frozen += 1;
			break;
		case "bonus":
			tally.bonus += 1;
			break;
		default:
			break;
	}
	return tally;
}

export function tallyOf(cells: Iterable<HabitDayCell>): Tally {
	const tally = { ...EMPTY_TALLY };
	for (const cell of cells) addToTally(tally, cell);
	return tally;
}

export function mergeTallies(into: Tally, from: Tally): Tally {
	into.done += from.done;
	into.due += from.due;
	into.frozen += from.frozen;
	into.bonus += from.bonus;
	return into;
}

export function completionPercent(done: number, due: number): number | null {
	return due > 0 ? Math.round((done / due) * 100) : null;
}

export function percentOf(tally: Tally): number | null {
	return completionPercent(tally.done, tally.due);
}

export function isPerfectDay(tally: Tally): boolean {
	return tally.due > 0 && tally.done === tally.due && tally.frozen === 0;
}

export type DayLevel = 0 | 1 | 2 | 3;

// Exact fractions, not the rounded %, so 99.6 % never shades as full.
export function dayLevel(tally: Tally): DayLevel | null {
	if (tally.due === 0) return null;
	const fraction = tally.done / tally.due;
	if (fraction >= 1) return 3;
	if (fraction >= 0.5) return 2;
	return fraction > 0 ? 1 : 0;
}
