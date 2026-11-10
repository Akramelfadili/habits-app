import { frozenDays, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { FREEZE_POOL_SIZE } from "../constants";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as FreezeService from "./freeze-service";

// The unit test (`freeze-service.test.ts`) mocks the count and never sees a date, so the
// month edge goes through the real repository here.
const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const { applyFreeze }: typeof FreezeService = require("./freeze-service");

async function seedHabit(): Promise<number> {
	const now = new Date();
	const [row] = await mockDb
		.insert(habits)
		.values({ ...makeHabitInput(), createdAt: now, updatedAt: now })
		.returning();
	return row.id;
}

describe("applyFreeze at a month's edge", () => {
	beforeEach(async () => {
		await mockDb.delete(frozenDays);
		await mockDb.delete(habits);
	});

	it("counts 1 and 30 September for September, not 31 August or 1 October", async () => {
		expect(FREEZE_POOL_SIZE).toBe(2);
		const habitId = await seedHabit();
		await applyFreeze(habitId, new Date(2026, 7, 31));
		await applyFreeze(habitId, new Date(2026, 9, 1));

		await expect(applyFreeze(habitId, new Date(2026, 8, 1))).resolves.toEqual({
			freezesLeft: 1,
		});
		await expect(applyFreeze(habitId, new Date(2026, 8, 30))).resolves.toEqual({
			freezesLeft: 0,
		});
	});

	it("refuses a third September freeze on the month's last day, late at night", async () => {
		const habitId = await seedHabit();
		await applyFreeze(habitId, new Date(2026, 8, 1));
		await applyFreeze(habitId, new Date(2026, 8, 15));

		await expect(
			applyFreeze(habitId, new Date(2026, 8, 30, 23, 59)),
		).rejects.toThrow("No freezes remaining this month");
		await expect(
			applyFreeze(habitId, new Date(2026, 9, 1, 0, 0)),
		).resolves.toEqual({ freezesLeft: 1 });
		const rows = await mockDb.select().from(frozenDays);
		expect(rows.map((row) => row.date).sort()).toEqual([
			"2026-09-01",
			"2026-09-15",
			"2026-10-01",
		]);
	});
});
