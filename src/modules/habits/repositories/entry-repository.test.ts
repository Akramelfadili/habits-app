import { entries, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as EntryRepository from "./entry-repository";

// Same jest.doMock + same-order require() sequencing as habit-repository.test.ts.
const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const {
	setHabitCompletedOn,
	setHabitQuantityOn,
}: typeof EntryRepository = require("./entry-repository");

const DAY_1 = new Date("2026-09-14T00:00:00Z"); // Monday

async function seedHabit(): Promise<number> {
	const now = new Date();
	const [row] = await mockDb
		.insert(habits)
		.values({ ...makeHabitInput(), createdAt: now, updatedAt: now })
		.returning();
	return row.id;
}

// `useEntriesInRange` (useLiveQuery) isn't exercised here for the same reason
// habit-repository.test.ts never calls `useHabitsList`: the change-listener
// reactivity behind useLiveQuery needs real expo-sqlite, which the node:sqlite
// test db doesn't provide. Assertions read the table directly instead —
// exactly the pattern habit-repository.test.ts already uses for a write's effect.
describe("entry-repository", () => {
	beforeEach(async () => {
		await mockDb.delete(entries);
		await mockDb.delete(habits);
	});

	it("completing a habit inserts one row keyed by calendar day", async () => {
		const habitId = await seedHabit();
		await setHabitCompletedOn(habitId, DAY_1, true);

		const rows = await mockDb.select().from(entries);
		expect(rows).toEqual([
			expect.objectContaining({ habitId, date: "2026-09-14" }),
		]);
	});

	it("completing twice is a no-op, not a duplicate row or an error", async () => {
		const habitId = await seedHabit();
		await setHabitCompletedOn(habitId, DAY_1, true);
		await expect(
			setHabitCompletedOn(habitId, DAY_1, true),
		).resolves.not.toThrow();

		const rows = await mockDb.select().from(entries);
		expect(rows).toHaveLength(1);
	});

	it("un-completing deletes the row — always allowed, no confirmation", async () => {
		const habitId = await seedHabit();
		await setHabitCompletedOn(habitId, DAY_1, true);
		await setHabitCompletedOn(habitId, DAY_1, false);

		const rows = await mockDb.select().from(entries);
		expect(rows).toEqual([]);
	});

	it("un-completing a day with no entry is also a no-op", async () => {
		const habitId = await seedHabit();
		await expect(
			setHabitCompletedOn(habitId, DAY_1, false),
		).resolves.not.toThrow();

		const rows = await mockDb.select().from(entries);
		expect(rows).toEqual([]);
	});

	it("keeps each habit's entries independent", async () => {
		const habitA = await seedHabit();
		const habitB = await seedHabit();
		await setHabitCompletedOn(habitA, DAY_1, true);
		await setHabitCompletedOn(habitB, DAY_1, true);

		const rows = await mockDb.select().from(entries);
		expect(rows).toHaveLength(2);
	});

	describe("setHabitQuantityOn", () => {
		it("logs a value keyed by calendar day", async () => {
			const habitId = await seedHabit();
			await setHabitQuantityOn(habitId, DAY_1, 6);

			const rows = await mockDb.select().from(entries);
			expect(rows).toEqual([
				expect.objectContaining({
					habitId,
					date: "2026-09-14",
					value: 6,
				}),
			]);
		});

		it("updates the same day's value instead of inserting a second row", async () => {
			const habitId = await seedHabit();
			await setHabitQuantityOn(habitId, DAY_1, 3);
			await setHabitQuantityOn(habitId, DAY_1, 8);

			const rows = await mockDb.select().from(entries);
			expect(rows).toHaveLength(1);
			expect(rows[0].value).toBe(8);
		});

		it("allows logging past the habit's own target — over-logging is not capped", async () => {
			const habitId = await seedHabit();
			await setHabitQuantityOn(habitId, DAY_1, 999);

			const rows = await mockDb.select().from(entries);
			expect(rows[0].value).toBe(999);
		});

		it("deletes the row when the value is set to 0 — no entry means nothing logged", async () => {
			const habitId = await seedHabit();
			await setHabitQuantityOn(habitId, DAY_1, 6);
			await setHabitQuantityOn(habitId, DAY_1, 0);

			const rows = await mockDb.select().from(entries);
			expect(rows).toEqual([]);
		});

		it("deletes the row when the value is set negative", async () => {
			const habitId = await seedHabit();
			await setHabitQuantityOn(habitId, DAY_1, 6);
			await setHabitQuantityOn(habitId, DAY_1, -1);

			const rows = await mockDb.select().from(entries);
			expect(rows).toEqual([]);
		});

		it("setting 0 with no existing entry is a no-op", async () => {
			const habitId = await seedHabit();
			await expect(
				setHabitQuantityOn(habitId, DAY_1, 0),
			).resolves.not.toThrow();

			const rows = await mockDb.select().from(entries);
			expect(rows).toEqual([]);
		});
	});
});
