import { renderHook } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay, Habit } from "../types";

let mockHabits: Habit[] = [];
let mockEntries: Entry[] = [];
let mockFrozen: FrozenDay[] = [];
const mockUseEntriesInRange = jest.fn(
	(_start: Date, _end: Date) => mockEntries,
);
jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => mockHabits,
}));
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: (start: Date, end: Date) =>
		mockUseEntriesInRange(start, end),
}));
jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDays: () => mockFrozen,
}));

import { format } from "date-fns";
import { useMonthlySummaryQueries } from "./use-monthly-summary-queries";

const date = (value: Date) => format(value, "yyyy-MM-dd");

beforeEach(() => {
	mockHabits = [];
	mockEntries = [];
	mockFrozen = [];
	mockUseEntriesInRange.mockClear();
});
afterEach(() => jest.useRealTimers());

describe("useMonthlySummaryQueries (HAB-16)", () => {
	it("is empty with no habits at all", async () => {
		jest.useFakeTimers().setSystemTime(new Date(2026, 8, 2, 9));
		const { result } = await renderHook(() => useMonthlySummaryQueries());
		expect(result.current).toEqual({ state: "empty" });
	});

	it("opens on the last complete month and reads from the previous one's first Monday to the month's last Sunday", async () => {
		jest.useFakeTimers().setSystemTime(new Date(2026, 8, 2, 9));
		mockHabits = [makeHabit({ id: 1, createdAt: new Date(2026, 0, 1) })];
		const { result } = await renderHook(() => useMonthlySummaryQueries());
		expect(result.current.state).toBe("ready");
		if (result.current.state !== "ready") return;
		expect(date(result.current.summary.month.start)).toBe("2026-08-01");
		const [start, end] = mockUseEntriesInRange.mock.calls[0];
		// 1 Jul 2026 is a Wednesday → Monday 29 Jun; 31 Aug is a Monday → Sunday 6 Sep.
		expect(date(start)).toBe("2026-06-29");
		expect(date(end)).toBe("2026-09-06");
	});

	it("shows the partial current month, progress and the week while under 30 days of history", async () => {
		jest.useFakeTimers().setSystemTime(new Date(2026, 8, 16, 9));
		mockHabits = [makeHabit({ id: 1, createdAt: new Date(2026, 8, 4, 8) })];
		const { result } = await renderHook(() => useMonthlySummaryQueries());
		expect(result.current.state).toBe("too-early");
		if (result.current.state !== "too-early") return;
		expect(result.current.unlock.trackedDays).toBe(12);
		expect(date(result.current.summary.month.start)).toBe("2026-09-01");
		expect(date(result.current.week.week.start)).toBe("2026-09-14");
	});

	it("leaves archived habits out of the too-early week but keeps them in the month's history", async () => {
		jest.useFakeTimers().setSystemTime(new Date(2026, 8, 16, 9));
		mockHabits = [
			makeHabit({ id: 1, createdAt: new Date(2026, 8, 4, 8) }),
			makeHabit({
				id: 2,
				createdAt: new Date(2026, 8, 4, 8),
				archivedAt: new Date(2026, 8, 10),
			}),
		];
		mockEntries = [
			{ id: 1, habitId: 2, date: "2026-09-05", createdAt: new Date() },
		];
		const { result } = await renderHook(() => useMonthlySummaryQueries());
		if (result.current.state !== "too-early") throw new Error("state");
		expect(
			result.current.summary.rows.map((row) => row.habit.id).sort(),
		).toEqual([1, 2]);
		expect(result.current.week.rows.map((row) => row.habit.id)).toEqual([1]);
	});

	it("counts the shared freeze pool's days in the month", async () => {
		jest.useFakeTimers().setSystemTime(new Date(2026, 8, 2, 9));
		mockHabits = [makeHabit({ id: 1, createdAt: new Date(2026, 0, 1) })];
		mockFrozen = [
			{ id: 1, habitId: 1, date: "2026-08-07", createdAt: new Date() },
		];
		const { result } = await renderHook(() => useMonthlySummaryQueries());
		if (result.current.state !== "ready") throw new Error("state");
		expect(result.current.summary.freezeDates).toHaveLength(1);
	});
});
