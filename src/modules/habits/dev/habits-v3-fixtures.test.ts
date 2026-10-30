import {
	calculateLongestStreak,
	currentStreakAsOf,
	streakResetInfo,
} from "../domain/habit-history";
import { freezesRemainingInMonth } from "../domain/streaks";
import type { Habit } from "../types";
import {
	HABITS_V3_SCENARIOS,
	habitsV3Entries,
	habitsV3FrozenDays,
	habitsV3Habits,
	habitsV3Reminders,
} from "./habits-v3-fixtures";

const FRIDAY = new Date(2026, 9, 23, 9);

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(FRIDAY);
});
afterEach(() => {
	jest.useRealTimers();
});

function habit(scenario: (typeof HABITS_V3_SCENARIOS)[number], id: number) {
	const found = habitsV3Habits(scenario).find(
		(candidate) => candidate.id === id,
	);
	if (!found) throw new Error(`no habit ${id}`);
	return {
		sortOrder: found.id,
		archivedAt: null,
		pauses: [],
		...found,
	} as Habit;
}

function historyOf(scenario: (typeof HABITS_V3_SCENARIOS)[number], id: number) {
	return {
		habit: habit(scenario, id),
		entries: habitsV3Entries(scenario).filter((entry) => entry.habitId === id),
		frozenDates: new Set(
			habitsV3FrozenDays(scenario)
				.filter((day) => day.habitId === id)
				.map((day) => day.date),
		),
		today: FRIDAY,
	};
}

describe("the Habits tab and Detail frames' fixtures", () => {
	it("has no two entries sharing an id, and none after today", () => {
		for (const scenario of HABITS_V3_SCENARIOS) {
			const entries = habitsV3Entries(scenario);
			expect(new Set(entries.map((entry) => entry.id)).size).toBe(
				entries.length,
			);
			expect(entries.every((entry) => entry.date <= "2026-10-23")).toBe(true);
		}
	});

	it("H1: seven active habits and two archived", () => {
		const habits = habitsV3Habits("habits-v3");
		expect(habits.filter((candidate) => !candidate.archivedAt)).toHaveLength(7);
		expect(habits.filter((candidate) => candidate.archivedAt)).toHaveLength(2);
	});

	it("DC1: Read 20 min has exactly 214 logs", () => {
		expect(
			habitsV3Entries("habits-v3").filter((entry) => entry.habitId === 5),
		).toHaveLength(214);
	});

	it("H1: Meditate runs 13 days and Read 20 min 12, as the rows say", () => {
		expect(currentStreakAsOf(historyOf("habits-v3", 4))).toBe(13);
		expect(currentStreakAsOf(historyOf("habits-v3", 5))).toBe(12);
	});

	it("H5: Morning run's best streak is 41", () => {
		const run = {
			...historyOf("habits-v3", 8),
			habit: { ...habit("habits-v3", 8) },
		};
		expect(calculateLongestStreak(run).days).toBe(41);
	});

	it("D7: No phone in bed is resisting nine nights", () => {
		expect(currentStreakAsOf(historyOf("habits-v3", 7))).toBe(9);
	});

	it("D1: one freeze used this month leaves one, so Upper body shows no reset notice", () => {
		const frozen = habitsV3FrozenDays("habits-v3");
		expect(freezesRemainingInMonth(frozen, FRIDAY)).toBe(1);
		expect(streakResetInfo(historyOf("habits-v3", 3), 1)).toBeNull();
	});

	it("D6: the reset scenario spends the pool, and Meditate's missed Wed 14 Oct is the reset", () => {
		const frozen = habitsV3FrozenDays("habits-v3-reset");
		expect(freezesRemainingInMonth(frozen, FRIDAY)).toBe(0);
		const reset = streakResetInfo(historyOf("habits-v3-reset", 4), 0);
		expect(reset?.missedDate.getDate()).toBe(14);
	});

	it("D3: the new scenario is Drink water created today with nothing logged", () => {
		const [water, ...rest] = habitsV3Habits("habits-v3-new");
		expect(rest).toHaveLength(0);
		expect(water.createdAt.toDateString()).toBe(FRIDAY.toDateString());
		expect(habitsV3Entries("habits-v3-new")).toHaveLength(0);
	});

	it("D4/D5: Morning run's reminder is 06:30 on Mon, Wed, Fri", () => {
		expect(
			habitsV3Reminders("habits-v3").find((reminder) => reminder.habitId === 8),
		).toMatchObject({ hour: 6, minute: 30, weekdays: [1, 3, 5] });
	});
});
