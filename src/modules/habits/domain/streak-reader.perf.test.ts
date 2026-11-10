/**
 * Performance smoke for Today's derivation (audit B-04) on a large log: 20
 * habits (12 daily, 4 on specific days, 4 at 3× per week) over 5 years, ~29k
 * entries. It does what `useTodayQueries` does when the log changes — group the
 * entries by habit, then the current streak and the at-risk check for every due
 * habit — and then what a re-render does, which must be a lookup. The ceiling is
 * about four times the time measured in Node, so a slow CI box does not flake
 * but a return to walking every habit's history per render fails. Set
 * PERF_REPORT=1 to print the measured times.
 */
import { addDays, format, subDays, subYears } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay, Habit, IsoWeekday } from "../types";
import { isHabitListedOn } from "./selected-day";
import {
	createStreakReader,
	groupEntriesByHabit,
	groupFrozenDatesByHabit,
} from "./streak-reader";

const today = new Date(2026, 9, 24);
const start = subYears(today, 5);

const habits: Habit[] = Array.from({ length: 20 }, (_, i) =>
	makeHabit({
		id: i + 1,
		name: `H${i + 1}`,
		createdAt: start,
		frequency:
			i < 12
				? { type: "daily" }
				: i < 16
					? { type: "weekdays", days: [1, 3, 5] as IsoWeekday[] }
					: { type: "per-week", timesPerWeek: 3 },
	}),
);

let seed = 7;
const random = () => {
	seed = (seed * 16807) % 2147483647;
	return seed / 2147483647;
};
const entries: Entry[] = [];
const frozenDays: FrozenDay[] = [];
for (let day = start; day <= today; day = addDays(day, 1)) {
	const date = format(day, "yyyy-MM-dd");
	for (const habit of habits) {
		const roll = random();
		if (roll < 0.8) {
			entries.push({
				id: entries.length + 1,
				habitId: habit.id,
				date,
				createdAt: day,
			});
		} else if (roll < 0.81 && habit.frequency.type !== "per-week") {
			frozenDays.push({
				id: frozenDays.length + 1,
				habitId: habit.id,
				date,
				createdAt: day,
			});
		}
	}
}

const timings: string[] = [];
function timed<T>(label: string, work: () => T): { result: T; ms: number } {
	const started = performance.now();
	const result = work();
	const ms = performance.now() - started;
	timings.push(`${label}: ${ms.toFixed(1)} ms`);
	return { result, ms };
}

afterAll(() => {
	if (process.env.PERF_REPORT) {
		process.stdout.write(
			`\nentries=${entries.length}\n${timings.join("\n")}\n`,
		);
	}
});

function deriveToday() {
	const entriesByHabit = groupEntriesByHabit(entries);
	const frozenByHabit = groupFrozenDatesByHabit(frozenDays);
	const reader = createStreakReader(entriesByHabit, frozenByHabit);
	const due = habits.filter((habit) => isHabitListedOn(habit, today, []));
	const compute = () => {
		let answers = 0;
		for (const habit of due) {
			if (reader.atRisk(habit, today)) answers += 1;
			if (habit.frequency.type === "per-week") continue;
			answers += reader.streakAsOf(habit, subDays(today, 1));
		}
		return answers;
	};
	return { compute };
}

describe("Today's derivation on 5 years × 20 habits", () => {
	it("builds a large log", () => {
		expect(entries.length).toBeGreaterThan(25_000);
	});

	it("groups the log and computes every streak and at-risk check", () => {
		const { result: derived } = timed("derive (cold)", deriveToday);
		expect(
			timed("streaks and at-risk (cold)", derived.compute).ms,
		).toBeLessThan(400);
	});

	it("answers a re-render from the reader's memory", () => {
		const derived = deriveToday();
		const first = derived.compute();
		const again = timed("streaks and at-risk (again)", derived.compute);
		expect(again.result).toBe(first);
		expect(again.ms).toBeLessThan(25);
	});

	it("groups the whole log in one pass", () => {
		expect(
			timed("groupEntriesByHabit", () => groupEntriesByHabit(entries)).ms,
		).toBeLessThan(100);
	});
});
