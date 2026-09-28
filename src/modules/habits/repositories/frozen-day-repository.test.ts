import { frozenDays, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as FrozenDayRepository from "./frozen-day-repository";

const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const {
	getFreezesUsedInMonth,
	freezeHabitDay,
}: typeof FrozenDayRepository = require("./frozen-day-repository");

const DAY = new Date("2026-09-15T00:00:00Z");
const MONTH_START = new Date("2026-09-01T00:00:00Z");
const MONTH_END = new Date("2026-09-30T00:00:00Z");

async function seedHabit(): Promise<number> {
	const now = new Date();
	const [row] = await mockDb
		.insert(habits)
		.values({ ...makeHabitInput(), createdAt: now, updatedAt: now })
		.returning();
	return row.id;
}

describe("frozen-day-repository", () => {
	beforeEach(async () => {
		await mockDb.delete(frozenDays);
		await mockDb.delete(habits);
	});

	it("freezing a day inserts one row keyed by calendar day", async () => {
		const habitId = await seedHabit();
		await freezeHabitDay(habitId, DAY);

		const rows = await mockDb.select().from(frozenDays);
		expect(rows).toEqual([
			expect.objectContaining({ habitId, date: "2026-09-15" }),
		]);
	});

	it("freezing the same day twice is a no-op, not a duplicate row", async () => {
		const habitId = await seedHabit();
		await freezeHabitDay(habitId, DAY);
		await expect(freezeHabitDay(habitId, DAY)).resolves.not.toThrow();

		const rows = await mockDb.select().from(frozenDays);
		expect(rows).toHaveLength(1);
	});

	it("counts freezes used in a month across every habit — the pool is shared", async () => {
		const habitA = await seedHabit();
		const habitB = await seedHabit();
		await freezeHabitDay(habitA, DAY);
		await freezeHabitDay(habitB, new Date("2026-09-20T00:00:00Z"));

		const used = await getFreezesUsedInMonth(MONTH_START, MONTH_END);
		expect(used).toBe(2);
	});

	it("excludes freezes outside the given month", async () => {
		const habitId = await seedHabit();
		await freezeHabitDay(habitId, new Date("2026-08-31T00:00:00Z"));

		const used = await getFreezesUsedInMonth(MONTH_START, MONTH_END);
		expect(used).toBe(0);
	});
});
