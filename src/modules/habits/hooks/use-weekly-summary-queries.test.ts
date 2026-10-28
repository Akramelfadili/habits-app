import { renderHook } from "@testing-library/react-native";
import { format } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, Habit } from "../types";

// Pinned so "today" (computed inside the hook) is deterministic.
const TODAY = new Date(2026, 8, 16, 12); // Wednesday 16 Sep 2026

function entry(habitId: number, date: string): Entry {
	return { id: 0, habitId, date, createdAt: new Date(date) };
}

let mockLoaded = true;
let mockHabits: Habit[] = [];
let mockEntries: Entry[] = [];
const mockRange = jest.fn();

jest.mock("../repositories/habit-repository", () => ({
	useActiveHabits: () => ({ habits: mockHabits, loaded: mockLoaded }),
}));
let mockFrozen: {
	id: number;
	habitId: number;
	date: string;
	createdAt: Date;
}[] = [];
jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDaysInRange: () => mockFrozen,
}));
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: (start: Date, end: Date) => {
		mockRange(start, end);
		return mockEntries;
	},
}));

import { useWeeklySummaryQueries } from "./use-weekly-summary-queries";

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(TODAY);
	mockLoaded = true;
	mockHabits = [makeHabit({ id: 1, createdAt: new Date(2026, 0, 1) })];
	mockEntries = [];
	mockFrozen = [];
	mockRange.mockReset();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("useWeeklySummaryQueries", () => {
	it("reads only this Mon–Sun week's entries", async () => {
		await renderHook(() => useWeeklySummaryQueries());
		const [start, end] = mockRange.mock.calls[0];
		expect(format(start, "yyyy-MM-dd")).toBe("2026-09-14");
		expect(format(end, "yyyy-MM-dd")).toBe("2026-09-20");
	});

	it("summarizes the week so far", async () => {
		mockEntries = [entry(1, "2026-09-14"), entry(1, "2026-09-16")];
		const { result } = await renderHook(() => useWeeklySummaryQueries());
		expect(result.current).toMatchObject({
			completed: 2,
			scheduled: 3,
			hasHabits: true,
		});
		expect(result.current.rows).toHaveLength(1);
	});

	it("leaves a frozen day out of the week's counts (D14)", async () => {
		mockEntries = [entry(1, "2026-09-14"), entry(1, "2026-09-16")];
		mockFrozen = [{ id: 1, habitId: 1, date: "2026-09-15", createdAt: TODAY }];
		const { result } = await renderHook(() => useWeeklySummaryQueries());
		expect(result.current).toMatchObject({ completed: 2, scheduled: 2 });
	});

	it("reports when there are no habits at all", async () => {
		mockHabits = [];
		const { result } = await renderHook(() => useWeeklySummaryQueries());
		expect(result.current.hasHabits).toBe(false);
		expect(result.current.rows).toEqual([]);
	});

	it("reports not loaded until the habit list has loaded (A5-04)", async () => {
		mockLoaded = false;
		mockHabits = [];
		const { result } = await renderHook(() => useWeeklySummaryQueries());
		expect(result.current.isLoaded).toBe(false);
	});
});
