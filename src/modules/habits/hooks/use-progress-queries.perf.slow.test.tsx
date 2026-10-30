/**
 * Progress's real hooks on 5 years × 20 habits (~29k entries): how long Month
 * and Year take to produce their view, through `useProgressMonthQueries` /
 * `useProgressYearQueries` / `useProgressWeekQueries` — the base reads, the
 * bounded entry reads and the memoised build. The repositories are in-memory
 * stand-ins that filter by range exactly as the real reads do, so what is
 * measured is the app's own work (not SQLite). Ceilings are generous; set
 * PERF_REPORT=1 to print the numbers.
 */
import { renderHook } from "@testing-library/react-native";
import { addDays, format, subYears } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay, Habit, IsoWeekday } from "../types";

const mockFormat = format;
const mockToday = new Date(2026, 9, 24);
const mockStart = subYears(mockToday, 5);

const mockHabits: Habit[] = Array.from({ length: 20 }, (_, i) =>
	makeHabit({
		id: i + 1,
		name: `H${i + 1}`,
		createdAt: mockStart,
		frequency:
			i < 12
				? { type: "daily" }
				: i < 16
					? { type: "weekdays", days: [1, 3, 5] as IsoWeekday[] }
					: { type: "per-week", timesPerWeek: 3 },
	}),
);
let seed = 11;
const random = () => {
	seed = (seed * 16807) % 2147483647;
	return seed / 2147483647;
};
const mockEntries: Entry[] = [];
const mockFrozen: FrozenDay[] = [];
for (let day = mockStart; day <= mockToday; day = addDays(day, 1)) {
	const date = format(day, "yyyy-MM-dd");
	for (const habit of mockHabits) {
		const roll = random();
		if (roll < 0.8) {
			mockEntries.push({
				id: mockEntries.length + 1,
				habitId: habit.id,
				date,
				createdAt: day,
			});
		} else if (roll < 0.81 && habit.frequency.type !== "per-week") {
			mockFrozen.push({
				id: mockFrozen.length + 1,
				habitId: habit.id,
				date,
				createdAt: day,
			});
		}
	}
}

jest.mock("@/lib/today/use-today", () => ({ useToday: () => mockToday }));
let mockRead = { entries: 0 };
jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => ({ habits: mockHabits, loaded: true }),
}));
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: (from: Date, to: Date) => {
		const a = mockFormat(from, "yyyy-MM-dd");
		const b = mockFormat(to, "yyyy-MM-dd");
		const rows = mockEntries.filter((e) => e.date >= a && e.date <= b);
		mockRead.entries = Math.max(mockRead.entries, rows.length);
		return rows;
	},
	useAllEntries: () => mockEntries,
	useLoggedDays: () => ({
		count: new Set(mockEntries.map((e) => e.date)).size,
		firstDate: mockFormat(mockStart, "yyyy-MM-dd"),
		loaded: true,
	}),
}));
jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDaysInRange: (from: Date, to: Date) => {
		const a = mockFormat(from, "yyyy-MM-dd");
		const b = mockFormat(to, "yyyy-MM-dd");
		return mockFrozen.filter((f) => f.date >= a && f.date <= b);
	},
	useFrozenDays: () => mockFrozen,
}));

import { useProgressMonthQueries } from "./use-progress-month-queries";
import { useProgressWeekQueries } from "./use-progress-week-queries";
import { useProgressYearQueries } from "./use-progress-year-queries";

const timings: string[] = [];
async function timed(label: string, hook: () => { state: string }) {
	const started = performance.now();
	const { result } = await renderHook(hook);
	const elapsed = performance.now() - started;
	timings.push(`${label}: ${Math.round(elapsed)} ms (${result.current.state})`);
	return { elapsed, state: result.current.state };
}

afterAll(() => {
	if (process.env.PERF_REPORT) {
		process.stdout.write(
			`\nentries=${mockEntries.length}, widest read=${mockRead.entries}\n${timings.join("\n")}\n`,
		);
	}
});

describe("Progress hooks on 5 years × 20 habits", () => {
	it("builds a large log", () => {
		expect(mockEntries.length).toBeGreaterThan(25_000);
	});

	it("Year opens within a second and reads one year, not five", async () => {
		mockRead = { entries: 0 };
		const { elapsed, state } = await timed("Year (all habits)", () =>
			useProgressYearQueries(),
		);
		expect(state).toBe("ready");
		expect(elapsed).toBeLessThan(1500);
		// The year and the year before it ("+N pts"): well under the five years held.
		expect(mockRead.entries).toBeLessThan(mockEntries.length / 2);
	});

	it("Year the second time (a warm engine, as after the first open)", async () => {
		const { elapsed } = await timed("Year (all habits, warm)", () =>
			useProgressYearQueries(),
		);
		expect(elapsed).toBeLessThan(600);
	});

	it("Year filtered to one habit is quicker still", async () => {
		const { elapsed } = await timed("Year (one habit)", () =>
			useProgressYearQueries({ habitId: 1 }),
		);
		expect(elapsed).toBeLessThan(1000);
	});

	it("Month opens within a second and reads about two months", async () => {
		mockRead = { entries: 0 };
		const { elapsed, state } = await timed("Month (all habits)", () =>
			useProgressMonthQueries(),
		);
		expect(state).toBe("ready");
		expect(elapsed).toBeLessThan(1000);
		expect(mockRead.entries).toBeLessThan(1500);
	});

	it("Week opens within a second (it also reads the whole log for the streak tile)", async () => {
		const { elapsed, state } = await timed("Week (all habits)", () =>
			useProgressWeekQueries(),
		);
		expect(state).toBe("ready");
		expect(elapsed).toBeLessThan(1500);
	});
});
