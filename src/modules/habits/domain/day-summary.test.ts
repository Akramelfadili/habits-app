import { makeHabit } from "../test-support/habit-builder";
import type { Entry } from "../types";
import { daySummary } from "./day-summary";

const created = new Date(2026, 8, 1);
const habit = (id: number, over = {}) =>
	makeHabit({ id, createdAt: created, ...over });
const done = (habitId: number, date: string): Entry =>
	({ id: habitId * 100, habitId, date, createdAt: new Date() }) as Entry;

const friday = new Date(2026, 9, 23);

describe("daySummary", () => {
	it("counts what was due and what was done that day", () => {
		const habits = [habit(1), habit(2), habit(3)];
		const entries = [
			done(1, "2026-10-23"),
			done(2, "2026-10-23"),
			done(3, "2026-10-22"),
		];
		expect(daySummary(habits, entries, friday)).toEqual({
			completed: 2,
			total: 3,
		});
	});

	it("is 0 of 0 when nothing was due", () => {
		const habits = [habit(1, { frequency: { type: "weekdays", days: [1] } })];
		expect(daySummary(habits, [], friday)).toEqual({ completed: 0, total: 0 });
	});

	it("leaves out a habit that had not been created yet", () => {
		const habits = [habit(1), habit(2, { createdAt: new Date(2026, 9, 24) })];
		expect(daySummary(habits, [], friday).total).toBe(1);
	});

	it("an entry on another day does not count", () => {
		expect(
			daySummary([habit(1)], [done(1, "2026-10-22")], friday).completed,
		).toBe(0);
	});
});
