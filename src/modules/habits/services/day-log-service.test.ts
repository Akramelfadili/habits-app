import { entries, entryNotes, frozenDays, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as DayLogService from "./day-log-service";

// Foreign keys ON, as the migration safety tests run, so a bad write really fails.
const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const {
	freezesLeftIn,
	restoreDay,
	setCheckOnDay,
	setQuantityOnDay,
}: typeof DayLogService = require("./day-log-service");

const SEPT_22 = new Date(2026, 8, 22);
const FROZEN_AT = new Date("2026-09-23T07:00:00Z");

async function seedHabit(name = "Read"): Promise<number> {
	const now = new Date();
	const [row] = await mockDb
		.insert(habits)
		.values({ ...makeHabitInput({ name }), createdAt: now, updatedAt: now })
		.returning();
	return row.id;
}

async function freeze(habitId: number, date = "2026-09-22") {
	await mockDb
		.insert(frozenDays)
		.values({ habitId, date, createdAt: FROZEN_AT });
}

const frozenRows = () => mockDb.select().from(frozenDays);
const entryRows = () => mockDb.select().from(entries);

describe("day-log-service", () => {
	beforeEach(async () => {
		await mockDb.delete(entryNotes);
		await mockDb.delete(frozenDays);
		await mockDb.delete(entries);
		await mockDb.delete(habits);
	});

	describe("pool counting", () => {
		it("counts by missed date within the calendar month, shared by every habit", async () => {
			const a = await seedHabit("A");
			const b = await seedHabit("B");
			expect(await freezesLeftIn(SEPT_22)).toBe(2);
			await freeze(a, "2026-09-01");
			await freeze(b, "2026-09-30");
			await freeze(a, "2026-08-31");
			expect(await freezesLeftIn(SEPT_22)).toBe(0);
			expect(await freezesLeftIn(new Date(2026, 7, 10))).toBe(1);
			expect(await freezesLeftIn(new Date(2026, 9, 1))).toBe(2);
		});
	});

	describe("logging a frozen day returns the freeze", () => {
		it("ticking a frozen check habit writes the entry and deletes the freeze, reporting it", async () => {
			const id = await seedHabit();
			await freeze(id);

			const write = await setCheckOnDay(id, SEPT_22, true);

			expect(await entryRows()).toEqual([
				expect.objectContaining({ habitId: id, date: "2026-09-22" }),
			]);
			expect(await frozenRows()).toEqual([]);
			expect(write.returnedFreeze).toMatchObject({
				habitId: id,
				date: "2026-09-22",
				createdAt: FROZEN_AT,
			});
			expect(write.freezesLeft).toBe(2);
		});

		it("ticking a day that is not frozen leaves other freezes alone and returns none", async () => {
			const id = await seedHabit();
			await freeze(id, "2026-09-21");

			const write = await setCheckOnDay(id, SEPT_22, true);

			expect(write.returnedFreeze).toBeNull();
			expect(write.freezesLeft).toBe(1);
			expect(await frozenRows()).toHaveLength(1);
		});

		it("un-ticking never returns or takes a freeze", async () => {
			const id = await seedHabit();
			await freeze(id);
			const write = await setCheckOnDay(id, SEPT_22, false);
			expect(write.returnedFreeze).toBeNull();
			expect(await frozenRows()).toHaveLength(1);
		});

		it("only an amount that reaches the target returns a quantity habit's freeze", async () => {
			const id = await seedHabit();
			await freeze(id);

			const partial = await setQuantityOnDay(id, SEPT_22, 5, 8);
			expect(partial.returnedFreeze).toBeNull();
			expect(await frozenRows()).toHaveLength(1);

			const full = await setQuantityOnDay(id, SEPT_22, 8, 8);
			expect(full.returnedFreeze).not.toBeNull();
			expect(await frozenRows()).toEqual([]);
			expect(await entryRows()).toEqual([
				expect.objectContaining({ value: 8 }),
			]);
		});

		it("returns only the habit that was frozen; another habit's freeze that day stays", async () => {
			const a = await seedHabit("A");
			const b = await seedHabit("B");
			await freeze(a);
			await freeze(b);
			await setCheckOnDay(a, SEPT_22, true);
			expect(await frozenRows()).toEqual([
				expect.objectContaining({ habitId: b }),
			]);
		});
	});

	describe("Undo restores the freeze and the day exactly", () => {
		it("a check: the entry goes, the freeze comes back with its original created_at", async () => {
			const id = await seedHabit();
			await freeze(id);
			const before = await freezesLeftIn(SEPT_22);

			const write = await setCheckOnDay(id, SEPT_22, true);
			expect(await freezesLeftIn(SEPT_22)).toBe(before + 1);
			await restoreDay(id, SEPT_22, false, write.returnedFreeze);

			expect(await entryRows()).toEqual([]);
			expect(await frozenRows()).toEqual([
				expect.objectContaining({
					habitId: id,
					date: "2026-09-22",
					createdAt: FROZEN_AT,
				}),
			]);
			expect(await freezesLeftIn(SEPT_22)).toBe(before);
		});

		it("a quantity: the previous amount is back and so is the freeze", async () => {
			const id = await seedHabit();
			await freeze(id);
			await setQuantityOnDay(id, SEPT_22, 3, 8);
			const write = await setQuantityOnDay(id, SEPT_22, 8, 8);
			expect(await frozenRows()).toEqual([]);

			await restoreDay(id, SEPT_22, 3, write.returnedFreeze);

			expect(await entryRows()).toEqual([
				expect.objectContaining({ value: 3 }),
			]);
			expect(await frozenRows()).toHaveLength(1);
		});

		it("an Undo with no returned freeze touches no freeze", async () => {
			const id = await seedHabit();
			await freeze(id, "2026-09-21");
			const write = await setCheckOnDay(id, SEPT_22, true);
			await restoreDay(id, SEPT_22, false, write.returnedFreeze);
			expect(await frozenRows()).toHaveLength(1);
			expect(await entryRows()).toEqual([]);
		});
	});

	it("a failed single write is atomic too: the entry is rolled back when the freeze cannot be written", async () => {
		const id = await seedHabit();
		// An invalid created_at fails the freeze insert (NOT NULL) after the entry was written.
		const broken = {
			id: 1,
			habitId: id,
			date: "2026-09-22",
			createdAt: new Date(Number.NaN),
		};

		await expect(restoreDay(id, SEPT_22, true, broken)).rejects.toThrow();

		expect(await entryRows()).toEqual([]);
		expect(await frozenRows()).toEqual([]);
	});

	it("a write after a failed one still works (the failed transaction was closed)", async () => {
		const id = await seedHabit();
		await restoreDay(id, SEPT_22, true, {
			id: 1,
			habitId: id,
			date: "2026-09-22",
			createdAt: new Date(Number.NaN),
		}).catch(() => undefined);
		await setCheckOnDay(id, SEPT_22, true);
		expect(await entryRows()).toHaveLength(1);
	});
});
