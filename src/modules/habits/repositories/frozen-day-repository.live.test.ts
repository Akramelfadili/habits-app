import { renderHook, waitFor } from "@testing-library/react-native";
import { frozenDays, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as FrozenDayRepository from "./frozen-day-repository";

/** `useFrozenDaysInRange` reads only its range and re-queries when the range changes. */
const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));
jest.doMock("drizzle-orm/expo-sqlite", () => ({
	useLiveQuery: require("@/lib/db/test-live-query").useLiveQuery,
}));

const {
	useFrozenDaysInRange,
}: typeof FrozenDayRepository = require("./frozen-day-repository");

describe("useFrozenDaysInRange", () => {
	beforeEach(async () => {
		await mockDb.delete(frozenDays);
		await mockDb.delete(habits);
		const now = new Date();
		const [habit] = await mockDb
			.insert(habits)
			.values({ ...makeHabitInput(), createdAt: now, updatedAt: now })
			.returning();
		await mockDb.insert(frozenDays).values(
			["2026-08-30", "2026-09-02", "2026-09-30", "2026-10-01"].map((date) => ({
				habitId: habit.id,
				date,
				createdAt: now,
			})),
		);
	});

	it("returns the freezes in the range, inclusive, and follows a range change", async () => {
		const { result, rerender } = await renderHook(
			(range: { start: Date; end: Date }) =>
				useFrozenDaysInRange(range.start, range.end),
			{
				initialProps: {
					start: new Date(2026, 8, 1),
					end: new Date(2026, 8, 30),
				},
			},
		);
		await waitFor(() =>
			expect(result.current.map((f) => f.date)).toEqual([
				"2026-09-02",
				"2026-09-30",
			]),
		);
		await rerender({ start: new Date(2026, 9, 1), end: new Date(2026, 9, 31) });
		await waitFor(() =>
			expect(result.current.map((f) => f.date)).toEqual(["2026-10-01"]),
		);
	});
});
