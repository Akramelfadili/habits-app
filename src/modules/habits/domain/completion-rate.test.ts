import {
	addToTally,
	completionPercent,
	dayLevel,
	EMPTY_TALLY,
	isPerfectDay,
	mergeTallies,
	tallyOf,
} from "./completion-rate";
import type { HabitDayCell } from "./day-status";

const cell = (
	status: HabitDayCell["status"],
	isToday = false,
): HabitDayCell => ({ status, level: 0, isToday });

describe("tallyOf — the one rate rule", () => {
	it("counts done and missed, and leaves frozen, bonus and the rest out of due", () => {
		const tally = tallyOf([
			cell("done"),
			cell("done"),
			cell("missed"),
			cell("partial"),
			cell("frozen"),
			cell("bonus"),
			cell("not-due"),
			cell("before-start"),
			cell("future"),
			cell("nothing-logged"),
			cell("today"),
		]);
		expect(tally).toEqual({ done: 2, due: 4, frozen: 1, bonus: 1 });
	});

	it("joins today only once it is done", () => {
		expect(tallyOf([cell("today", true)]).due).toBe(0);
		expect(tallyOf([cell("partial", true)]).due).toBe(0);
		expect(tallyOf([cell("done", true)])).toMatchObject({ done: 1, due: 1 });
	});

	it("merges tallies", () => {
		const total = mergeTallies(
			{ ...EMPTY_TALLY },
			addToTally({ ...EMPTY_TALLY }, cell("done")),
		);
		expect(
			mergeTallies(total, { done: 0, due: 2, frozen: 1, bonus: 0 }),
		).toEqual({ done: 1, due: 3, frozen: 1, bonus: 0 });
	});
});

describe("completionPercent", () => {
	it("is a whole number, or null with nothing due", () => {
		expect(completionPercent(2, 3)).toBe(67);
		expect(completionPercent(1, 3)).toBe(33);
		expect(completionPercent(3, 3)).toBe(100);
		expect(completionPercent(0, 0)).toBeNull();
	});
});

describe("isPerfectDay", () => {
	it("needs something due, everything done and nothing frozen", () => {
		expect(isPerfectDay({ done: 3, due: 3, frozen: 0, bonus: 0 })).toBe(true);
		expect(isPerfectDay({ done: 3, due: 3, frozen: 1, bonus: 0 })).toBe(false);
		expect(isPerfectDay({ done: 2, due: 3, frozen: 0, bonus: 0 })).toBe(false);
		expect(isPerfectDay({ done: 0, due: 0, frozen: 0, bonus: 2 })).toBe(false);
	});
});

describe("dayLevel", () => {
	const level = (done: number, due: number) =>
		dayLevel({ done, due, frozen: 0, bonus: 0 });

	it("shades L0 nothing, L1 1–49 %, L2 50–99 %, L3 100 %", () => {
		expect(level(0, 4)).toBe(0);
		expect(level(1, 4)).toBe(1);
		expect(level(1, 3)).toBe(1);
		expect(level(2, 4)).toBe(2);
		expect(level(3, 4)).toBe(2);
		expect(level(4, 4)).toBe(3);
	});

	it("uses the exact fraction, so 199 of 200 is never full", () => {
		expect(level(199, 200)).toBe(2);
		expect(level(99, 200)).toBe(1);
	});

	it("is null when nothing was due", () => {
		expect(level(0, 0)).toBeNull();
	});
});
