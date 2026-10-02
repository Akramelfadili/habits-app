import { renderHook } from "@testing-library/react-native";
import { format } from "date-fns";
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

import { useYearlySummaryQueries } from "./use-yearly-summary-queries";

const date = (value: Date) => format(value, "yyyy-MM-dd");

beforeEach(() => {
	mockHabits = [];
	mockEntries = [];
	mockFrozen = [];
	mockUseEntriesInRange.mockClear();
});
afterEach(() => jest.useRealTimers());

describe("useYearlySummaryQueries (HAB-17)", () => {
	it("is empty with no habits at all", async () => {
		jest.useFakeTimers().setSystemTime(new Date(2026, 8, 16, 9));
		const { result } = await renderHook(() => useYearlySummaryQueries());
		expect(result.current).toEqual({ state: "empty" });
	});

	it("opens on the current calendar year and reads from the Monday on or before 1 Jan to the last week's Sunday", async () => {
		jest.useFakeTimers().setSystemTime(new Date(2026, 8, 16, 9));
		mockHabits = [makeHabit({ id: 1, createdAt: new Date(2026, 0, 1) })];
		const { result } = await renderHook(() => useYearlySummaryQueries());
		expect(result.current.state).toBe("ready");
		if (result.current.state !== "ready") return;
		expect(date(result.current.summary.year.start)).toBe("2026-01-01");
		const [start, end] = mockUseEntriesInRange.mock.calls[0];
		// 1 Jan 2026 is a Thursday → Monday 29 Dec 2025; 31 Dec 2026 is a Thursday → Sunday 3 Jan 2027.
		expect(date(start)).toBe("2025-12-29");
		expect(date(end)).toBe("2027-01-03");
	});

	it("shows the partial chart, progress and the week while under three months of history", async () => {
		jest.useFakeTimers().setSystemTime(new Date(2026, 8, 16, 9));
		mockHabits = [makeHabit({ id: 1, createdAt: new Date(2026, 8, 4, 8) })];
		const { result } = await renderHook(() => useYearlySummaryQueries());
		expect(result.current.state).toBe("too-early");
		if (result.current.state !== "too-early") return;
		expect(result.current.unlock.trackedDays).toBe(12);
		expect(date(result.current.unlock.unlockDate)).toBe("2026-12-04");
		expect(result.current.summary.months[8].kind).toBe("counted");
		expect(date(result.current.week.week.start)).toBe("2026-09-14");
	});

	it("unlocks on the unlock date itself", async () => {
		mockHabits = [makeHabit({ id: 1, createdAt: new Date(2026, 8, 4, 8) })];
		jest.useFakeTimers().setSystemTime(new Date(2026, 11, 3, 9));
		expect(
			(await renderHook(() => useYearlySummaryQueries())).result.current.state,
		).toBe("too-early");
		jest.setSystemTime(new Date(2026, 11, 4, 9));
		expect(
			(await renderHook(() => useYearlySummaryQueries())).result.current.state,
		).toBe("ready");
	});

	it("early January on older history is ready, not empty, and rolls over with the year", async () => {
		mockHabits = [makeHabit({ id: 1, createdAt: new Date(2026, 3, 1) })];
		jest.useFakeTimers().setSystemTime(new Date(2026, 11, 31, 22));
		const before = await renderHook(() => useYearlySummaryQueries());
		if (before.result.current.state !== "ready") throw new Error("not ready");
		expect(date(before.result.current.summary.year.start)).toBe("2026-01-01");

		jest.setSystemTime(new Date(2027, 0, 2, 9));
		const after = await renderHook(() => useYearlySummaryQueries());
		if (after.result.current.state !== "ready") throw new Error("not ready");
		expect(date(after.result.current.summary.year.start)).toBe("2027-01-01");
		// 1 Jan was a missed day, so 0% — a real number, not NaN or a divide-by-zero.
		expect(after.result.current.summary.rate).toBe(0);
		expect(after.result.current.summary.insights).toEqual([{ type: "early" }]);
	});

	it("widens the read to a shown week that starts last December", async () => {
		jest.useFakeTimers().setSystemTime(new Date(2027, 0, 2, 9));
		mockHabits = [makeHabit({ id: 1, createdAt: new Date(2026, 11, 20) })];
		await renderHook(() => useYearlySummaryQueries());
		// Saturday 2 Jan → "this week" is Mon 28 Dec; the year's own range starts Mon 28 Dec too (1 Jan 2027 is a Friday).
		const [start] = mockUseEntriesInRange.mock.calls[0];
		expect(date(start)).toBe("2026-12-28");
	});
});
