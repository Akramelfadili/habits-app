import { renderHook } from "@testing-library/react-native";
import { endOfWeek, startOfWeek } from "date-fns";
import { toDayKey } from "@/utils/day-key";
import { WEEK_STARTS_ON } from "../constants";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry } from "../types";

// Mon–Fri habit (due on a weekday), a daily habit, a Break habit and an archived one.
const mockWeekdayHabit = makeHabit({
	id: 1,
	name: "Gym",
	frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
});
const mockDailyHabit = makeHabit({ id: 2, name: "Walk" });
const mockBreakHabit = makeHabit({
	id: 3,
	name: "No sugar",
	direction: "break",
});
const mockArchivedHabit = makeHabit({
	id: 4,
	name: "Old",
	archivedAt: new Date(2026, 8, 1),
});

let mockEntries: Entry[] = [];
const mockUseEntriesInRange = jest.fn(
	(_start: Date, _end: Date) => mockEntries,
);

jest.mock("../repositories/habit-repository", () => ({
	useActiveHabits: () => ({
		habits: [
			mockWeekdayHabit,
			mockDailyHabit,
			mockBreakHabit,
			mockArchivedHabit,
		],
		loaded: true,
	}),
}));
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: (start: Date, end: Date) =>
		mockUseEntriesInRange(start, end),
}));

import { useOffScheduleQueries } from "./use-off-schedule-queries";

// Sunday 4 Oct 2026: Gym (Mon–Fri) is off-schedule, Walk (daily) is not.
const SUNDAY = new Date(2026, 9, 4, 15, 30);

function entry(id: number, habitId: number, date: string): Entry {
	return { id, habitId, date, createdAt: new Date(2026, 9, 4, 10, 42) };
}

beforeEach(() => {
	jest.useFakeTimers({
		now: SUNDAY,
		doNotFake: [
			"nextTick",
			"setImmediate",
			"setTimeout",
			"clearTimeout",
			"setInterval",
			"clearInterval",
			"queueMicrotask",
		],
	});
	mockEntries = [];
	mockUseEntriesInRange.mockClear();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("useOffScheduleQueries", () => {
	it("offers only active build habits to the picker", async () => {
		const { result } = await renderHook(() => useOffScheduleQueries(SUNDAY));

		expect(result.current.eligibleHabits.map((habit) => habit.id)).toEqual([
			1, 2,
		]);
	});

	it("reads the entries of the current week, starting at midnight on the week start", async () => {
		await renderHook(() => useOffScheduleQueries(SUNDAY));

		const [start, end] = mockUseEntriesInRange.mock.calls[0];
		expect(start).toEqual(
			startOfWeek(SUNDAY, { weekStartsOn: WEEK_STARTS_ON }),
		);
		expect(start.getHours()).toBe(0);
		// The last day itself, inclusive (utils/week-window): the Sunday's key.
		expect(toDayKey(end)).toBe(
			toDayKey(endOfWeek(SUNDAY, { weekStartsOn: WEEK_STARTS_ON })),
		);
		expect(end.getHours()).toBe(0);
	});

	it("lists today's bonus logs only for habits not due today", async () => {
		mockEntries = [
			entry(1, 1, "2026-10-04"),
			entry(2, 2, "2026-10-04"),
			entry(3, 1, "2026-10-02"),
		];
		const { result } = await renderHook(() => useOffScheduleQueries(SUNDAY));

		expect(result.current.loggedToday.map((log) => log.habit.id)).toEqual([1]);
		expect(result.current.loggedToday[0].entry.id).toBe(1);
	});

	it("has no bonus logs when nothing was logged today", async () => {
		const { result } = await renderHook(() => useOffScheduleQueries(SUNDAY));

		expect(result.current.loggedToday).toEqual([]);
	});
});
