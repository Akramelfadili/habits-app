import { act, renderHook } from "@testing-library/react-native";
import { entries, frozenDays, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import {
	activeListenerCount,
	notifyTableChanged,
} from "@/lib/db/test-live-query";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as EntryRepository from "./entry-repository";
import type * as FrozenDayRepository from "./frozen-day-repository";

const mockDb = createTestDb({ onWrite: notifyTableChanged });
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));
jest.doMock("drizzle-orm/expo-sqlite", () => ({
	useLiveQuery: require("@/lib/db/test-live-query").useLiveQuery,
}));

const {
	useAllEntries,
	useEntriesInRange,
	useHabitEntries,
}: typeof EntryRepository = require("./entry-repository");
const {
	useFrozenDays,
}: typeof FrozenDayRepository = require("./frozen-day-repository");

const WEEK = { start: new Date(2026, 8, 14), end: new Date(2026, 8, 20) };

let habitIds: number[] = [];

async function addEntry(habitId: number, date: string) {
	await act(async () => {
		await mockDb
			.insert(entries)
			.values({ habitId, date, createdAt: new Date() });
	});
}

beforeEach(async () => {
	await mockDb.delete(entries);
	await mockDb.delete(frozenDays);
	await mockDb.delete(habits);
	const now = new Date();
	habitIds = [];
	for (const name of ["One", "Two"]) {
		const [habit] = await mockDb
			.insert(habits)
			.values({ ...makeHabitInput({ name }), createdAt: now, updatedAt: now })
			.returning();
		habitIds.push(habit.id);
	}
	await mockDb.insert(entries).values([
		{ habitId: habitIds[0], date: "2026-09-15", createdAt: now },
		{ habitId: habitIds[1], date: "2026-08-01", createdAt: now },
	]);
});

describe("the shared entry log", () => {
	it("is one listener for every entry and frozen-day consumer", async () => {
		const before = activeListenerCount();
		const mounted = [
			await renderHook(() => useAllEntries()),
			await renderHook(() => useAllEntries()),
			await renderHook(() => useEntriesInRange(WEEK.start, WEEK.end)),
			await renderHook(() => useHabitEntries(habitIds[0] ?? 0)),
			await renderHook(() => useFrozenDays()),
			await renderHook(() => useFrozenDays()),
		];
		await act(async () => {});

		expect(activeListenerCount() - before).toBe(2);
		expect(mounted[0]?.result.current).toHaveLength(2);
		expect(mounted[2]?.result.current.map((entry) => entry.date)).toEqual([
			"2026-09-15",
		]);

		for (const hook of mounted) await hook.unmount();
		expect(activeListenerCount() - before).toBe(0);
	});

	it("does not re-render a week or a habit that a write did not touch", async () => {
		let weekRenders = 0;
		let habitRenders = 0;
		const week = await renderHook(() => {
			weekRenders += 1;
			return useEntriesInRange(WEEK.start, WEEK.end);
		});
		const habit = await renderHook(() => {
			habitRenders += 1;
			return useHabitEntries(habitIds[0] ?? 0);
		});
		await act(async () => {});
		const [weekBefore, habitBefore] = [weekRenders, habitRenders];
		const weekSlice = week.result.current;

		await addEntry(habitIds[1] ?? 0, "2026-07-04");

		expect(weekRenders).toBe(weekBefore);
		expect(habitRenders).toBe(habitBefore);
		expect(week.result.current).toBe(weekSlice);

		await addEntry(habitIds[0] ?? 0, "2026-09-16");
		expect(week.result.current.map((entry) => entry.date)).toEqual([
			"2026-09-15",
			"2026-09-16",
		]);
		expect(habit.result.current).toHaveLength(2);
		await week.unmount();
		await habit.unmount();
	});
});
