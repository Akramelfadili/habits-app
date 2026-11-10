import { act, renderHook, waitFor } from "@testing-library/react-native";
import { entries, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as EntryRepository from "./entry-repository";

/**
 * `useEntriesInRange` must re-query when its range changes (Weekly Summary's
 * Last/This week toggle, a week rolling over while a screen is mounted). The
 * stand-in honours `useLiveQuery`'s `deps` contract, so a hook that doesn't
 * pass its range as deps keeps showing the first range — and fails here.
 */
const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));
jest.doMock("drizzle-orm/expo-sqlite", () => ({
	useLiveQuery: require("@/lib/db/test-live-query").useLiveQuery,
}));

const {
	useEntriesInRange,
	useLoggedDays,
}: typeof EntryRepository = require("./entry-repository");

const LAST_WEEK = { start: new Date(2026, 8, 7), end: new Date(2026, 8, 13) };
const THIS_WEEK = { start: new Date(2026, 8, 14), end: new Date(2026, 8, 20) };

async function seedEntries() {
	const now = new Date();
	const [habit] = await mockDb
		.insert(habits)
		.values({ ...makeHabitInput(), createdAt: now, updatedAt: now })
		.returning();
	await mockDb.insert(entries).values(
		["2026-09-08", "2026-09-15", "2026-09-16"].map((date) => ({
			habitId: habit.id,
			date,
			createdAt: now,
		})),
	);
}

describe("useEntriesInRange", () => {
	beforeEach(async () => {
		await mockDb.delete(entries);
		await mockDb.delete(habits);
		await seedEntries();
	});

	it("re-queries when the range changes", async () => {
		const { result, rerender } = await renderHook(
			(range: { start: Date; end: Date }) =>
				useEntriesInRange(range.start, range.end),
			{ initialProps: LAST_WEEK },
		);
		await waitFor(() =>
			expect(result.current.map((entry) => entry.date)).toEqual(["2026-09-08"]),
		);

		await rerender(THIS_WEEK);

		await waitFor(() =>
			expect(result.current.map((entry) => entry.date)).toEqual([
				"2026-09-15",
				"2026-09-16",
			]),
		);
	});

	it("does not re-query when re-rendered with the same range on new Date objects", async () => {
		const { result, rerender } = await renderHook(
			(range: { start: Date; end: Date }) =>
				useEntriesInRange(range.start, range.end),
			{ initialProps: THIS_WEEK },
		);
		await waitFor(() => expect(result.current).toHaveLength(2));

		await rerender({
			start: new Date(THIS_WEEK.start),
			end: new Date(THIS_WEEK.end),
		});
		await act(async () => {});

		expect(result.current).toHaveLength(2);
	});
});

describe("useLoggedDays", () => {
	beforeEach(async () => {
		await mockDb.delete(entries);
		await mockDb.delete(habits);
	});

	it("reports nothing logged on an empty log", async () => {
		const { result } = await renderHook(() => useLoggedDays());
		await waitFor(() => expect(result.current.loaded).toBe(true));
		expect(result.current).toEqual({
			count: 0,
			firstDate: null,
			loaded: true,
		});
	});

	it("counts distinct days across habits, bonus included, and names the first", async () => {
		const now = new Date();
		const inserted = await mockDb
			.insert(habits)
			.values([
				{ ...makeHabitInput(), createdAt: now, updatedAt: now },
				{ ...makeHabitInput({ name: "Two" }), createdAt: now, updatedAt: now },
			])
			.returning();
		await mockDb.insert(entries).values(
			[
				[inserted[0].id, "2026-09-15"],
				[inserted[1].id, "2026-09-15"],
				[inserted[0].id, "2026-09-08"],
				[inserted[1].id, "2026-09-16"],
			].map(([habitId, date]) => ({
				habitId: habitId as number,
				date: date as string,
				createdAt: now,
			})),
		);
		const { result } = await renderHook(() => useLoggedDays());
		await waitFor(() => expect(result.current.loaded).toBe(true));
		expect(result.current).toEqual({
			count: 3,
			firstDate: "2026-09-08",
			loaded: true,
		});
	});
});
