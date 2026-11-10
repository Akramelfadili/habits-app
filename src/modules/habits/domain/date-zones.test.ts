import { eachDayOfInterval } from "date-fns";
import {
	dstTransitionDays,
	inTimeZoneEachTest,
	TEST_ZONES,
} from "@/test-support/time-zone";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { weekWindow } from "@/utils/week-window";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay, Habit, IsoWeekday } from "../types";
import { aggregateDays, classifyHabits, daysIn } from "./day-grid";
import { calculateLongestStreak } from "./habit-history";
import { calculateCurrentStreak } from "./streaks";
import { dayAfterWeekSwipe, weekDaysOf, weekStripDays } from "./week-strip";
import { buildYearMap } from "./year-map";
import { yearWindowFor } from "./yearly-summary";

// DST days are read from Intl, never typed from memory. Sao_Paulo covers a negative offset
// without DST and 2018 changes at midnight. Expected keys come from a zone-free UTC oracle.

const DAY_MS = 86_400_000;

function shift(key: string, days: number): string {
	const [y, m, d] = key.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS)
		.toISOString()
		.slice(0, 10);
}

function isoWeekday(key: string): IsoWeekday {
	const [y, m, d] = key.split("-").map(Number);
	return (((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) +
		1) as IsoWeekday;
}

function run(from: string, to: string): string[] {
	const keys: string[] = [];
	for (let key = from; key <= to; key = shift(key, 1)) keys.push(key);
	return keys;
}

function probesFor(zone: string): string[] {
	const now = dstTransitionDays(zone, 2026);
	const history = now.length === 0 ? dstTransitionDays(zone, 2018) : [];
	return [...now, ...history, "2026-01-01", "2026-12-31"];
}

const entry = (habitId: number, date: string): Entry => ({
	id: 0,
	habitId,
	date,
	createdAt: fromDayKey(date),
});

describe.each(TEST_ZONES)("dates in %s", (zone) => {
	inTimeZoneEachTest(zone);

	describe.each(probesFor(zone))("around %s", (probe) => {
		const around = [-1, 0, 1].map((offset) => shift(probe, offset));

		const daily = (): Habit =>
			makeHabit({ id: 1, createdAt: fromDayKey(shift(probe, -60)) });

		describe("streaks", () => {
			it.each(around)("counts a daily run up to %s", (day) => {
				const habit = daily();
				const done = run(shift(probe, -30), shift(probe, 1));
				const entries = done.map((key) => entry(1, key));
				const expected = run(shift(probe, -30), day).length;
				expect(
					calculateCurrentStreak(habit, entries, new Set(), fromDayKey(day)),
				).toBe(expected);
				expect(
					calculateLongestStreak({
						habit,
						entries,
						frozenDates: new Set(),
						today: fromDayKey(day),
					}).days,
				).toBe(expected);
			});

			it.each(around)("breaks on a missed %s and keeps a frozen one", (day) => {
				const habit = daily();
				const done = run(shift(probe, -30), shift(probe, 2)).filter(
					(key) => key !== day,
				);
				const entries = done.map((key) => entry(1, key));
				const asOf = fromDayKey(shift(day, 1));
				expect(calculateCurrentStreak(habit, entries, new Set(), asOf)).toBe(1);
				expect(
					calculateCurrentStreak(habit, entries, new Set([day]), asOf),
				).toBe(run(shift(probe, -30), shift(day, 1)).length);
			});

			it("counts a once-a-week habit on the probe's weekday", () => {
				const habit = makeHabit({
					id: 1,
					frequency: { type: "weekdays", days: [isoWeekday(probe)] },
					createdAt: fromDayKey(shift(probe, -60)),
				});
				const entries = [0, 7, 14, 21, 28].map((back) =>
					entry(1, shift(probe, -back)),
				);
				for (const day of around) {
					expect(
						calculateCurrentStreak(habit, entries, new Set(), fromDayKey(day)),
					).toBe(day < probe ? 4 : 5);
				}
			});
		});

		describe("day grid", () => {
			it("walks every calendar day once, in order", () => {
				const from = shift(probe, -3);
				const to = shift(probe, 3);
				expect(daysIn(fromDayKey(from), fromDayKey(to)).map(toDayKey)).toEqual(
					run(from, to),
				);
			});

			it("classifies each of the days on its own key", () => {
				const keys = run(shift(probe, -3), shift(probe, 3));
				const dates = keys.map(fromDayKey);
				const habits = [daily()];
				const entries = keys.map((key) => entry(1, key));
				const frozenDays: FrozenDay[] = [];
				const today = fromDayKey(shift(probe, 10));
				const perHabit = classifyHabits({
					habits,
					entries,
					frozenDays,
					today,
					dates,
				});
				const days = aggregateDays(perHabit, dates, today);
				expect(days.map((day) => day.key)).toEqual(keys);
				expect(days.map((day) => day.tally.done)).toEqual(keys.map(() => 1));
				expect(days.map((day) => day.tally.due)).toEqual(keys.map(() => 1));
			});
		});

		describe("week strip", () => {
			it.each(around)("shows %s's Monday-first week", (day) => {
				const monday = shift(day, 1 - isoWeekday(day));
				expect(weekDaysOf(fromDayKey(day)).map(toDayKey)).toEqual(
					run(monday, shift(monday, 6)),
				);
			});

			it.each(around)(
				"marks %s's week done and swipes a week each way",
				(day) => {
					const monday = shift(day, 1 - isoWeekday(day));
					const keys = run(monday, shift(monday, 6));
					const today = fromDayKey(shift(probe, 30));
					const strip = weekStripDays(
						[daily()],
						keys.map((key) => entry(1, key)),
						fromDayKey(day),
						today,
					);
					expect(strip.map((cell) => cell.key)).toEqual(keys);
					expect(strip.every((cell) => cell.allDone)).toBe(true);
					const back = dayAfterWeekSwipe(fromDayKey(day), today, -1);
					const ahead = dayAfterWeekSwipe(fromDayKey(day), today, 1);
					expect(back && toDayKey(back)).toBe(shift(day, -7));
					expect(ahead && toDayKey(ahead)).toBe(shift(day, 7));
				},
			);
		});

		describe("week window", () => {
			it.each(around)("is the Monday → Sunday of %s", (day) => {
				const monday = shift(day, 1 - isoWeekday(day));
				const { start, end } = weekWindow(fromDayKey(day));
				expect(toDayKey(start)).toBe(monday);
				expect(toDayKey(end)).toBe(shift(monday, 6));
				expect(eachDayOfInterval({ start, end }).map(toDayKey)).toEqual(
					run(monday, shift(monday, 6)),
				);
				expect(daysIn(start, end).map(toDayKey)).toEqual(
					run(monday, shift(monday, 6)),
				);
			});
		});
	});

	describe.each([
		...new Set(probesFor(zone).map((probe) => Number(probe.slice(0, 4)))),
	])("year map %s", (year) => {
		it("has one cell per calendar day, each on its own key", () => {
			const keys = run(`${year}-01-01`, `${year}-12-31`);
			const habit = makeHabit({
				id: 1,
				createdAt: fromDayKey(`${year - 1}-12-01`),
			});
			const map = buildYearMap({
				habits: [habit],
				entries: keys.map((key) => entry(1, key)),
				frozenDays: [],
				today: fromDayKey(`${year + 1}-01-10`),
				year: yearWindowFor(fromDayKey(`${year}-06-15`)),
			});
			expect(map.days.map((day) => day.key)).toEqual(keys);
			expect(map.days.every((day) => day.done === 1 && day.due === 1)).toBe(
				true,
			);
			expect(map.months.map((month) => month.days.length)).toEqual(
				Array.from({ length: 12 }, (_, index) => {
					const prefix = `${year}-${String(index + 1).padStart(2, "0")}`;
					return keys.filter((key) => key.startsWith(prefix)).length;
				}),
			);
		});
	});
});
