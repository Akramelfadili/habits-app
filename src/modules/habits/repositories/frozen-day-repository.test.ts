import { frozenDays, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as FrozenDayRepository from "./frozen-day-repository";

const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const {
	getFreezesUsedInMonth,
	freezeHabitDay,
	unfreezeHabitDay,
}: typeof FrozenDayRepository = require("./frozen-day-repository");

const DAY = new Date(2026, 8, 15);
// Local dates: the repository keys by the local calendar day (toDayKey), so a UTC midnight
// would make "September" 31 Aug - 29 Sep west of UTC.
const MONTH_START = new Date(2026, 8, 1);
const MONTH_END = new Date(2026, 8, 30);

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

	it("freezing can put a returned freeze back with its original created_at", async () => {
		const habitId = await seedHabit();
		const original = new Date("2026-09-16T07:00:00Z");
		await freezeHabitDay(habitId, DAY, original);
		const [row] = await mockDb.select().from(frozenDays);
		expect(row.createdAt).toEqual(original);
	});

	it("unfreezing removes just that habit's frozen day, returning it to the pool", async () => {
		const habitId = await seedHabit();
		const otherId = await seedHabit();
		await freezeHabitDay(habitId, DAY);
		await freezeHabitDay(otherId, DAY);
		expect(await getFreezesUsedInMonth(MONTH_START, MONTH_END)).toBe(2);

		await unfreezeHabitDay(habitId, DAY);

		const rows = await mockDb.select().from(frozenDays);
		expect(rows).toEqual([expect.objectContaining({ habitId: otherId })]);
		expect(await getFreezesUsedInMonth(MONTH_START, MONTH_END)).toBe(1);
	});

	it("unfreezing a day that isn't frozen is a no-op", async () => {
		const habitId = await seedHabit();
		await expect(unfreezeHabitDay(habitId, DAY)).resolves.not.toThrow();
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
		await freezeHabitDay(habitB, new Date(2026, 8, 20));

		const used = await getFreezesUsedInMonth(MONTH_START, MONTH_END);
		expect(used).toBe(2);
	});

	it("excludes freezes outside the given month", async () => {
		const habitId = await seedHabit();
		await freezeHabitDay(habitId, new Date(2026, 7, 31));

		const used = await getFreezesUsedInMonth(MONTH_START, MONTH_END);
		expect(used).toBe(0);
	});

	describe("the month's edges (the pool resets on the 1st)", () => {
		it.each([
			["2026-08-31", 0],
			["2026-09-01", 1],
			["2026-09-30", 1],
			["2026-10-01", 0],
		])("a freeze on %s counts %i for September", async (key, counted) => {
			const habitId = await seedHabit();
			const [y, m, d] = key.split("-").map(Number);
			await freezeHabitDay(habitId, new Date(y, m - 1, d));
			await expect(getFreezesUsedInMonth(MONTH_START, MONTH_END)).resolves.toBe(
				counted,
			);
		});

		it("counts exactly 1 and 30 September out of 31 Aug, 1 Sep, 30 Sep, 1 Oct", async () => {
			const habitId = await seedHabit();
			for (const day of [
				new Date(2026, 7, 31),
				new Date(2026, 8, 1),
				new Date(2026, 8, 30),
				new Date(2026, 9, 1),
			]) {
				await freezeHabitDay(habitId, day);
			}
			await expect(getFreezesUsedInMonth(MONTH_START, MONTH_END)).resolves.toBe(
				2,
			);
		});
	});
});
