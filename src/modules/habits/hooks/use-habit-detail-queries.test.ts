import { renderHook } from "@testing-library/react-native";
import { format } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, EntryNote, FrozenDay } from "../types";

// Pinned so "today" (computed inside the hook) is deterministic.
const TODAY = new Date(2026, 8, 23, 12); // Wednesday 23 Sep 2026

const habit = makeHabit({
	id: 1,
	frequency: { type: "daily" },
	createdAt: new Date(2026, 8, 1),
});
const otherHabit = makeHabit({ id: 2, createdAt: new Date(2026, 8, 1) });

function entry(habitId: number, date: string): Entry {
	return { id: 0, habitId, date, createdAt: new Date(date) };
}

let mockHabits = [habit, otherHabit];
let mockEntries: Entry[] = [];
let mockFrozenDays: FrozenDay[] = [];
let mockNotes: EntryNote[] = [];

jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => mockHabits,
}));
jest.mock("../repositories/entry-repository", () => ({
	useAllEntries: () => mockEntries,
	useEntryNotes: () => mockNotes,
}));
jest.mock("../repositories/reminder-repository", () => ({
	useHabitReminders: () => [],
}));
jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDays: () => mockFrozenDays,
}));

import { useHabitDetailQueries } from "./use-habit-detail-queries";

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(TODAY);
	mockHabits = [habit, otherHabit];
	mockEntries = [];
	mockFrozenDays = [];
	mockNotes = [];
});

afterEach(() => {
	jest.useRealTimers();
});

describe("useHabitDetailQueries", () => {
	it("returns null for an id that doesn't resolve", async () => {
		const { result } = await renderHook(() => useHabitDetailQueries(99));
		expect(result.current).toBeNull();
	});

	it("scopes entries and freezes to this habit only", async () => {
		mockEntries = [
			entry(1, "2026-09-21"),
			entry(1, "2026-09-22"),
			entry(2, "2026-09-20"),
		];
		mockFrozenDays = [
			{ id: 1, habitId: 1, date: "2026-09-20", createdAt: TODAY },
			{ id: 2, habitId: 2, date: "2026-09-19", createdAt: TODAY },
		];
		const { result } = await renderHook(() => useHabitDetailQueries(1));

		expect(result.current?.currentStreak).toBe(3); // 20 frozen + 21 + 22
		expect(result.current?.recentEntries.map((e) => e.date)).toEqual([
			"2026-09-22",
			"2026-09-21",
		]);
		expect(result.current?.hasEntries).toBe(true);
		const statuses = result.current?.heatmapWeeks.flat().map((d) => d.status);
		expect(statuses?.filter((s) => s === "frozen")).toHaveLength(1);
	});

	it("reports an empty history for a habit with no logs", async () => {
		const { result } = await renderHook(() => useHabitDetailQueries(1));
		expect(result.current).toMatchObject({
			currentStreak: 0,
			longestStreak: { days: 0, endedOn: null },
			recentEntries: [],
			hasEntries: false,
		});
	});

	it("merges this habit's notes into recent entries — including note-only days — but not other habits'", async () => {
		mockEntries = [entry(1, "2026-09-22")];
		mockNotes = [
			{ habitId: 1, date: "2026-09-22", note: "Easy day" },
			{ habitId: 1, date: "2026-09-21", note: "Skipped, sick" },
			{ habitId: 2, date: "2026-09-20", note: "Not mine" },
		];
		const { result } = await renderHook(() => useHabitDetailQueries(1));
		expect(
			result.current?.recentEntries.map((row) => [
				row.date,
				row.entry !== null,
				row.note,
			]),
		).toEqual([
			["2026-09-22", true, "Easy day"],
			["2026-09-21", false, "Skipped, sick"],
		]);
	});

	it("a retro-logged past day updates the heatmap and 90-day rate on the next render (HAB-10)", async () => {
		mockEntries = [entry(1, "2026-09-22")];
		const { result, rerender } = await renderHook(() =>
			useHabitDetailQueries(1),
		);
		const cellFor = (date: string) =>
			result.current?.heatmapWeeks
				.flat()
				.find((day) => format(day.date, "yyyy-MM-dd") === date);
		const before = result.current?.completionRate;
		expect(cellFor("2026-09-21")?.status).toBe("missed");

		// What saveDayLog's write looks like to the live query.
		mockEntries = [...mockEntries, entry(1, "2026-09-21")];
		await rerender({});

		expect(cellFor("2026-09-21")?.status).toBe("logged");
		expect(result.current?.completionRate.completed).toBe(
			(before?.completed ?? 0) + 1,
		);
		expect(result.current?.completionRate.scheduled).toBe(before?.scheduled);
	});
});
