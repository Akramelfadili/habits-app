// The pre-bucketing and shared parsed history must not change a single answer, so the original
// scanning versions are kept here, and only here, as the reference.
import {
	addDays,
	endOfWeek,
	format,
	isAfter,
	isBefore,
	isSameDay,
	isSameWeek,
	startOfDay,
	subDays,
} from "date-fns";
import { WEEK_STARTS_ON } from "../constants";
import { makeHabit } from "../test-support/habit-builder";
import type {
	DayRange,
	Entry,
	Frequency,
	FrozenDay,
	Habit,
	IsoWeekday,
} from "../types";
import type { FrequencyStrategy } from "./frequency-strategy";

function referenceCreatePerWeekFrequency(
	frequency: Extract<Frequency, { type: "per-week" }>,
): FrequencyStrategy {
	return {
		canFallOn: () => true,
		isDueOn: (date, { completedDates }) => {
			const dayStart = startOfDay(date);
			const completedEarlierThisWeek = completedDates.filter(
				(completed) =>
					isSameWeek(completed, date, { weekStartsOn: WEEK_STARTS_ON }) &&
					isBefore(completed, dayStart),
			).length;
			return completedEarlierThisWeek < frequency.timesPerWeek;
		},
		wasScheduledOn: (date, { completedDates }) => {
			const completedThisWeek = completedDates.filter((completed) =>
				isSameWeek(completed, date, { weekStartsOn: WEEK_STARTS_ON }),
			);
			const isCompleted = (day: Date) =>
				completedThisWeek.some((completed) => isSameDay(completed, day));
			if (isCompleted(date)) return true;

			const distinctCompletions = new Set(
				completedThisWeek.map((completed) => startOfDay(completed).getTime()),
			).size;
			const stillNeeded = frequency.timesPerWeek - distinctCompletions;
			if (stillNeeded <= 0) return false;

			const weekEnd = endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
			let openDaysAfter = 0;
			for (
				let day = addDays(startOfDay(date), 1);
				!isAfter(day, weekEnd);
				day = addDays(day, 1)
			) {
				if (!isCompleted(day)) openDaysAfter += 1;
			}
			return openDaysAfter < stillNeeded;
		},
	};
}

function referenceWithPauses(
	strategy: FrequencyStrategy,
	pauses: readonly DayRange[],
): FrequencyStrategy {
	const { isPausedOn } = jest.requireActual("./paused-schedule");
	if (pauses.length === 0) return strategy;
	return {
		canFallOn: (weekday) => strategy.canFallOn(weekday),
		isDueOn: (date, context) =>
			!isPausedOn(date, pauses) && strategy.isDueOn(date, context),
		wasScheduledOn: (date, context) =>
			isPausedOn(date, pauses)
				? context.completedDates.some((completed) => isSameDay(completed, date))
				: strategy.wasScheduledOn(date, context),
	};
}

function referenceDomain() {
	const { getHabitStrategy } = require("./frequency-strategy");
	const { restartDays } = require("./paused-schedule");
	const { toDayKey } = require("@/utils/day-key");
	const { isEntryComplete } = jest.requireActual("../domain/streaks");
	const { parseISO } = jest.requireActual("date-fns");

	function calculateCurrentStreak(
		habit: Habit,
		entries: readonly Entry[],
		frozenDates: ReadonlySet<string>,
		asOf: Date,
	): number {
		const strategy = getHabitStrategy(habit);
		const completedEntries = entries.filter((entry) =>
			isEntryComplete(habit, entry),
		);
		const completedDates = completedEntries.map((entry) =>
			parseISO(entry.date),
		);
		const completedSet = new Set(completedEntries.map((entry) => entry.date));
		const lastRestart = restartDays(habit.pauses).at(-1);
		const floor = startOfDay(
			lastRestart && lastRestart > toDayKey(habit.createdAt)
				? parseISO(lastRestart)
				: habit.createdAt,
		);

		let streak = 0;
		let cursor = startOfDay(asOf);
		while (!isBefore(cursor, floor)) {
			const dateString = toDayKey(cursor);
			if (strategy.wasScheduledOn(cursor, { completedDates })) {
				if (completedSet.has(dateString) || frozenDates.has(dateString)) {
					streak += 1;
				} else {
					break;
				}
			}
			cursor = subDays(cursor, 1);
		}
		return streak;
	}

	// Verbatim, except the pool check (at-risk no longer depends on the pool) and the per-week
	// gate (per-week habits are never at risk by day).
	function getStreakAtRisk(
		habit: Habit,
		entries: readonly Entry[],
		frozenDates: ReadonlySet<string>,
		today: Date,
	) {
		if (habit.frequency.type === "per-week") return null;
		const yesterday = subDays(startOfDay(today), 1);
		const yesterdayString = toDayKey(yesterday);
		if (frozenDates.has(yesterdayString)) return null;

		const strategy = getHabitStrategy(habit);
		const completedEntries = entries.filter((entry) =>
			isEntryComplete(habit, entry),
		);
		const completedDates = completedEntries.map((entry) =>
			parseISO(entry.date),
		);
		if (!strategy.isDueOn(yesterday, { completedDates })) return null;
		if (completedEntries.some((entry) => entry.date === yesterdayString))
			return null;

		const currentStreak = calculateCurrentStreak(
			habit,
			entries,
			frozenDates,
			subDays(yesterday, 1),
		);
		if (currentStreak <= 0) return null;

		return { missedDate: yesterday, currentStreak };
	}

	function isOffScheduleEntry(
		habit: Habit,
		entry: Entry,
		habitEntries: readonly Entry[],
	): boolean {
		const completedDates = habitEntries
			.filter((other) => isEntryComplete(habit, other))
			.map((other) => parseISO(other.date));
		if (
			!completedDates.some(
				(date) => date.getTime() === parseISO(entry.date).getTime(),
			)
		) {
			completedDates.push(parseISO(entry.date));
		}
		return !getHabitStrategy(habit).wasScheduledOn(parseISO(entry.date), {
			completedDates,
		});
	}

	return { calculateCurrentStreak, getStreakAtRisk, isOffScheduleEntry };
}

type Graph = {
	strategy: typeof import("./frequency-strategy");
	streaks: typeof import("../domain/streaks");
	history: typeof import("../domain/habit-history");
	offSchedule: typeof import("../domain/off-schedule");
	weekly: typeof import("../domain/weekly-summary");
	monthly: typeof import("../domain/monthly-summary");
	yearly: typeof import("../domain/yearly-summary");
};

function loadGraph(): Graph {
	return {
		strategy: require("./frequency-strategy"),
		streaks: require("../domain/streaks"),
		history: require("../domain/habit-history"),
		offSchedule: require("../domain/off-schedule"),
		weekly: require("../domain/weekly-summary"),
		monthly: require("../domain/monthly-summary"),
		yearly: require("../domain/yearly-summary"),
	};
}

let current: Graph;
let reference: Graph;
jest.isolateModules(() => {
	current = loadGraph();
});
jest.isolateModules(() => {
	jest.doMock("./per-week-frequency", () => ({
		createPerWeekFrequency: referenceCreatePerWeekFrequency,
	}));
	jest.doMock("./paused-schedule", () => ({
		...jest.requireActual("./paused-schedule"),
		withPauses: referenceWithPauses,
	}));
	jest.doMock("../domain/streaks", () => {
		const { calculateCurrentStreak, getStreakAtRisk } = referenceDomain();
		return {
			...jest.requireActual("../domain/streaks"),
			calculateCurrentStreak,
			getStreakAtRisk,
		};
	});
	jest.doMock("../domain/off-schedule", () => {
		const { isOffScheduleEntry } = referenceDomain();
		return {
			...jest.requireActual("../domain/off-schedule"),
			isOffScheduleEntry,
			offScheduleChecker:
				(habit: Habit, habitEntries: readonly Entry[]) => (entry: Entry) =>
					isOffScheduleEntry(habit, entry, habitEntries),
		};
	});
	reference = loadGraph();
});

function mulberry32(seed: number) {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const KEY = "yyyy-MM-dd";
const HISTORIES = 200;
const FREQUENCY_TYPES = ["daily", "weekdays", "per-week"] as const;

type History = {
	habit: Habit;
	entries: Entry[];
	frozenDays: FrozenDay[];
	today: Date;
};

function randomHistory(index: number): History {
	const rand = mulberry32(1000 + index);
	const int = (min: number, max: number) =>
		min + Math.floor(rand() * (max - min + 1));
	const chance = (p: number) => rand() < p;

	const today = startOfDay(addDays(new Date(2025, 0, 1), int(0, 660)));
	// Short enough that the quadratic reference keeps this suite fast.
	const length = int(20, 180);
	const createdAt = new Date(
		subDays(today, length).getTime() + int(0, 20) * 3_600_000,
	);

	const type = FREQUENCY_TYPES[index % FREQUENCY_TYPES.length];
	const frequency: Frequency =
		type === "daily"
			? { type }
			: type === "weekdays"
				? {
						type,
						days: ([1, 2, 3, 4, 5, 6, 7] as IsoWeekday[]).filter(() =>
							chance(0.5),
						),
					}
				: { type, timesPerWeek: int(1, 7) };
	if (frequency.type === "weekdays" && frequency.days.length === 0)
		frequency.days.push(3);

	const quantity = chance(0.3);
	const target = int(2, 8);

	const pauses: DayRange[] = [];
	let cursor = int(3, Math.max(4, Math.floor(length / 3)));
	for (let p = int(0, 2); p > 0 && cursor < length - 4; p--) {
		const span = int(1, 25);
		const from = addDays(startOfDay(createdAt), cursor);
		const to = addDays(from, span);
		if (!isBefore(to, today)) break;
		pauses.push({ from: format(from, KEY), to: format(to, KEY) });
		cursor += span + int(2, 40);
	}
	const archivedAt =
		chance(0.2) && cursor < length - 1
			? addDays(startOfDay(createdAt), int(cursor, length - 1))
			: null;

	const habit = makeHabit({
		id: index + 1,
		name: `H${index}`,
		direction: chance(0.25) ? "break" : "build",
		targetType: quantity ? "quantity" : "simple",
		targetAmount: quantity ? target : null,
		targetUnit: quantity ? "times" : null,
		frequency,
		pauses,
		archivedAt,
		createdAt,
	});

	const density = 0.15 + rand() * 0.8;
	const entries: Entry[] = [];
	const frozenDays: FrozenDay[] = [];
	for (
		let day = subDays(startOfDay(createdAt), 3);
		!isAfter(day, today);
		day = addDays(day, 1)
	) {
		const date = format(day, KEY);
		if (chance(density)) {
			entries.push({
				id: entries.length + 1,
				habitId: habit.id,
				date,
				value: quantity ? int(1, target + 2) : undefined,
				createdAt: day,
			});
		} else if (chance(0.06)) {
			frozenDays.push({
				id: frozenDays.length + 1,
				habitId: habit.id,
				date,
				createdAt: day,
			});
		}
	}
	entries.sort(() => rand() - 0.5);
	return { habit, entries, frozenDays, today };
}

const histories = Array.from({ length: HISTORIES }, (_, i) => randomHistory(i));

function frozenSetOf({ frozenDays }: History): Set<string> {
	return new Set(frozenDays.map((frozen) => frozen.date));
}

describe("per-week pre-bucketing is equivalent to the original scans", () => {
	it(`covers ${HISTORIES} histories across every frequency type`, () => {
		const types = new Set(histories.map(({ habit }) => habit.frequency.type));
		expect([...types].sort()).toEqual(["daily", "per-week", "weekdays"]);
		expect(
			histories.filter(({ habit }) => habit.pauses.length > 0).length,
		).toBeGreaterThan(30);
		expect(
			histories.filter(({ habit }) => habit.archivedAt).length,
		).toBeGreaterThan(20);
		expect(
			histories.filter(({ frozenDays }) => frozenDays.length > 0).length,
		).toBeGreaterThan(100);
	});

	it("answers isDueOn and wasScheduledOn identically on every day", () => {
		for (const { habit, entries, today } of histories) {
			const completedDates = entries
				.filter((entry) => current.streaks.isEntryComplete(habit, entry))
				.map((entry) => new Date(`${entry.date}T00:00:00`));
			const ours = current.strategy.getHabitStrategy(habit);
			const theirs = reference.strategy.getHabitStrategy(habit);
			const context = { completedDates };
			const days: Date[] = [];
			for (
				let day = subDays(startOfDay(habit.createdAt), 2);
				!isAfter(day, addDays(today, 7));
				day = addDays(day, 1)
			) {
				days.push(day);
			}
			const answers = (strategy: FrequencyStrategy) =>
				days.map(
					(day) =>
						`${format(day, KEY)} ${strategy.isDueOn(day, context)} ${strategy.wasScheduledOn(day, context)}`,
				);
			expect([habit.name, answers(ours)]).toEqual([
				habit.name,
				answers(theirs),
			]);
		}
	});

	it("gives the same streaks, rate, heatmap, at-risk and reset per habit", () => {
		for (const h of histories) {
			const frozenDates = frozenSetOf(h);
			const input = {
				habit: h.habit,
				entries: h.entries,
				frozenDates,
				today: h.today,
			};
			const yesterday = subDays(h.today, 1);
			// 40 sampled entries cover off-schedule logs without making this check quadratic.
			const sampled = h.entries.slice(0, 40);
			const run = (g: Graph) => ({
				current: g.streaks.calculateCurrentStreak(
					h.habit,
					h.entries,
					frozenDates,
					yesterday,
				),
				currentAsOf: g.history.currentStreakAsOf(input),
				longest: g.history.calculateLongestStreak(input),
				rate: g.history.calculateCompletionRate(input),
				heatmap: g.history.buildHeatmapWeeks(input),
				atRisk: g.streaks.getStreakAtRisk(
					h.habit,
					h.entries,
					frozenDates,
					h.today,
				),
				reset: g.history.streakResetInfo(input, 0),
				offSchedule: sampled.map((entry) =>
					g.offSchedule.isOffScheduleEntry(h.habit, entry, h.entries),
				),
			});
			expect([h.habit.name, run(current)]).toEqual([
				h.habit.name,
				run(reference),
			]);
		}
	});

	it("gives the same weekly, monthly and yearly summaries over groups of habits", () => {
		const GROUP = 6;
		for (let start = 0; start < histories.length; start += GROUP) {
			const group = histories.slice(start, start + GROUP);
			const today = group[0].today;
			const habits = group.map((h) => h.habit);
			const entries = group.flatMap((h) => h.entries);
			const frozenDays = group.flatMap((h) => h.frozenDays);
			const run = (g: Graph) => ({
				weekThis: g.weekly.buildWeeklySummary({
					habits,
					entries,
					today,
					week: "this",
				}),
				weekLast: g.weekly.buildWeeklySummary({
					habits,
					entries,
					today,
					week: "last",
				}),
				month: g.monthly.buildMonthlySummary({
					habits,
					entries,
					frozenDays,
					today,
					month: g.monthly.monthWindowFor(today),
				}),
				year: g.yearly.buildYearlySummary({
					habits,
					entries,
					frozenDays,
					today,
					year: g.yearly.yearWindowFor(today),
				}),
			});
			expect([start, run(current)]).toEqual([start, run(reference)]);
		}
	});
});
