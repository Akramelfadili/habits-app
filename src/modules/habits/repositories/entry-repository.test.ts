import { entries, entryNotes, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as EntryRepository from "./entry-repository";

const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const {
	saveDayLog,
	setHabitCompletedOn,
	setHabitQuantityOn,
}: typeof EntryRepository = require("./entry-repository");

const DAY_1 = new Date(2026, 8, 14);

async function seedHabit(): Promise<number> {
	const now = new Date();
	const [row] = await mockDb
		.insert(habits)
		.values({ ...makeHabitInput(), createdAt: now, updatedAt: now })
		.returning();
	return row.id;
}

// useLiveQuery hooks aren't exercised: their change listener needs real expo-sqlite, which the
// node:sqlite test db doesn't provide, so assertions read the table directly.
describe("entry-repository", () => {
	beforeEach(async () => {
		await mockDb.delete(entries);
		await mockDb.delete(entryNotes);
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

	describe("un-tick then Undo", () => {
		async function seedNote(habitId: number) {
			await saveDayLog(DAY_1, {
				values: [],
				note: "Slept badly, did it anyway",
				noteHabitId: habitId,
			});
		}

		it("a check habit comes back, and its day note was never touched", async () => {
			const habitId = await seedHabit();
			await setHabitCompletedOn(habitId, DAY_1, true);
			await seedNote(habitId);

			await setHabitCompletedOn(habitId, DAY_1, false);
			expect(await mockDb.select().from(entries)).toEqual([]);

			await setHabitCompletedOn(habitId, DAY_1, true);
			expect(await mockDb.select().from(entries)).toEqual([
				expect.objectContaining({ habitId, date: "2026-09-14", value: null }),
			]);
			expect(await mockDb.select().from(entryNotes)).toEqual([
				expect.objectContaining({ note: "Slept badly, did it anyway" }),
			]);
		});

		it("a quantity habit comes back at the exact amount, with its note", async () => {
			const habitId = await seedHabit();
			await setHabitQuantityOn(habitId, DAY_1, 10);
			await seedNote(habitId);

			await setHabitQuantityOn(habitId, DAY_1, 3);
			await setHabitQuantityOn(habitId, DAY_1, 10);

			expect(await mockDb.select().from(entries)).toEqual([
				expect.objectContaining({ habitId, date: "2026-09-14", value: 10 }),
			]);
			expect(await mockDb.select().from(entryNotes)).toEqual([
				expect.objectContaining({ note: "Slept badly, did it anyway" }),
			]);
		});

		it("zeroing a quantity habit then Undo restores it too", async () => {
			const habitId = await seedHabit();
			await setHabitQuantityOn(habitId, DAY_1, 8);
			await setHabitQuantityOn(habitId, DAY_1, 0);
			expect(await mockDb.select().from(entries)).toEqual([]);

			await setHabitQuantityOn(habitId, DAY_1, 8);
			expect(await mockDb.select().from(entries)).toEqual([
				expect.objectContaining({ value: 8 }),
			]);
		});
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

	describe("saveDayLog", () => {
		it("applies every value change for the day together", async () => {
			const checkId = await seedHabit();
			const quantityId = await seedHabit();
			const clearedId = await seedHabit();
			await setHabitCompletedOn(clearedId, DAY_1, true);

			await saveDayLog(DAY_1, {
				values: [
					{ habitId: checkId, value: true },
					{ habitId: quantityId, value: 6 },
					{ habitId: clearedId, value: false },
				],
				noteHabitId: checkId,
				note: "",
			});

			const rows = await mockDb.select().from(entries);
			expect(rows).toHaveLength(2);
			expect(rows).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						habitId: checkId,
						date: "2026-09-14",
						value: null,
					}),
					expect.objectContaining({
						habitId: quantityId,
						date: "2026-09-14",
						value: 6,
					}),
				]),
			);
		});

		it("updates an existing quantity and deletes one set to 0", async () => {
			const adjustedId = await seedHabit();
			const zeroedId = await seedHabit();
			await setHabitQuantityOn(adjustedId, DAY_1, 3);
			await setHabitQuantityOn(zeroedId, DAY_1, 3);

			await saveDayLog(DAY_1, {
				values: [
					{ habitId: adjustedId, value: 8 },
					{ habitId: zeroedId, value: 0 },
				],
				noteHabitId: adjustedId,
				note: "",
			});

			const rows = await mockDb.select().from(entries);
			expect(rows).toEqual([
				expect.objectContaining({ habitId: adjustedId, value: 8 }),
			]);
		});

		it("attaches a trimmed note without touching the day's value", async () => {
			const habitId = await seedHabit();
			await setHabitQuantityOn(habitId, DAY_1, 8);

			await saveDayLog(DAY_1, {
				values: [],
				noteHabitId: habitId,
				note: "  Travel day  ",
			});

			expect(await mockDb.select().from(entryNotes)).toEqual([
				expect.objectContaining({
					habitId,
					date: "2026-09-14",
					note: "Travel day",
				}),
			]);
			expect(await mockDb.select().from(entries)).toEqual([
				expect.objectContaining({ habitId, value: 8 }),
			]);
		});

		it("a note on an unlogged day doesn't create an entry", async () => {
			const habitId = await seedHabit();
			await saveDayLog(DAY_1, {
				values: [],
				noteHabitId: habitId,
				note: "Sick",
			});

			expect(await mockDb.select().from(entries)).toEqual([]);
			expect(await mockDb.select().from(entryNotes)).toHaveLength(1);
		});

		it("replaces an existing note, and an empty note deletes it", async () => {
			const habitId = await seedHabit();
			await saveDayLog(DAY_1, {
				values: [],
				noteHabitId: habitId,
				note: "First",
			});
			await saveDayLog(DAY_1, {
				values: [],
				noteHabitId: habitId,
				note: "Second",
			});

			expect(await mockDb.select().from(entryNotes)).toEqual([
				expect.objectContaining({ note: "Second" }),
			]);

			await saveDayLog(DAY_1, {
				values: [],
				noteHabitId: habitId,
				note: "   ",
			});
			expect(await mockDb.select().from(entryNotes)).toEqual([]);
		});
	});
});
