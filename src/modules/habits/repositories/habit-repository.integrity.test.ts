import { eq, sql } from "drizzle-orm";
import {
	categories,
	entries,
	entryNotes,
	frozenDays,
	habits,
	reminders,
} from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as CategoryRepository from "./category-repository";
import type * as HabitRepository from "./habit-repository";

// Foreign keys are OFF on the device (expo-sqlite's default) and every key is NO ACTION, so only
// our own code prevents orphans; `PRAGMA foreign_key_check` asks SQLite whether a write left one.
const mockDb = createTestDb({ foreignKeys: false });
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const { createHabit, deleteHabitAndHistory }: typeof HabitRepository =
	require("./habit-repository");
const { createCategory, deleteCategory }: typeof CategoryRepository =
	require("./category-repository");

async function orphans() {
	return mockDb.all(sql`PRAGMA foreign_key_check`);
}

async function seedHabitWithEveryKindOfChild() {
	const habit = await createHabit(makeHabitInput({ name: "Water" }));
	const now = new Date();
	await mockDb
		.insert(entries)
		.values({ habitId: habit.id, date: "2026-09-01", createdAt: now });
	await mockDb.insert(entryNotes).values({
		habitId: habit.id,
		date: "2026-09-01",
		note: "x",
		updatedAt: now,
	});
	await mockDb
		.insert(frozenDays)
		.values({ habitId: habit.id, date: "2026-09-02", createdAt: now });
	await mockDb.insert(reminders).values({
		habitId: habit.id,
		hour: 9,
		minute: 0,
		weekdays: "[1]",
		enabled: true,
		createdAt: now,
	});
	return habit;
}

describe("orphan check with foreign keys off (the device)", () => {
	beforeEach(async () => {
		await mockDb.delete(reminders);
		await mockDb.delete(frozenDays);
		await mockDb.delete(entryNotes);
		await mockDb.delete(entries);
		await mockDb.delete(habits);
	});

	it("a fresh, fully migrated database has no orphans", async () => {
		expect(await orphans()).toEqual([]);
	});

	it("the check is real: a child row pointing at a missing habit is reported", async () => {
		await mockDb
			.insert(entries)
			.values({ habitId: 9999, date: "2026-09-01", createdAt: new Date() });
		expect((await orphans()).length).toBeGreaterThan(0);
		await mockDb.delete(entries).where(eq(entries.habitId, 9999));
		expect(await orphans()).toEqual([]);
	});

	it("deleting a habit removes every child row — no orphan entries, notes, freezes or reminders", async () => {
		const habit = await seedHabitWithEveryKindOfChild();
		const keeper = await seedHabitWithEveryKindOfChild();

		await deleteHabitAndHistory(habit.id);

		expect(await orphans()).toEqual([]);
		expect(await mockDb.select().from(entries)).toHaveLength(1);
		expect((await mockDb.select().from(entries))[0].habitId).toBe(keeper.id);
	});

	it("a failed delete changes nothing: it is one transaction, so every child row is still there", async () => {
		const habit = await seedHabitWithEveryKindOfChild();
		const children = async () => [
			(await mockDb.select().from(entries)).length,
			(await mockDb.select().from(entryNotes)).length,
			(await mockDb.select().from(frozenDays)).length,
			(await mockDb.select().from(reminders)).length,
		];
		const before = await children();
		expect(before.every((count) => count > 0)).toBe(true);

		await mockDb.run(
			sql`CREATE TRIGGER block_habit_delete BEFORE DELETE ON habits BEGIN SELECT RAISE(ABORT, 'blocked'); END`,
		);
		try {
			await expect(deleteHabitAndHistory(habit.id)).rejects.toThrow();
			expect(await children()).toEqual(before);
			expect(
				await mockDb.select().from(habits).where(eq(habits.id, habit.id)),
			).toHaveLength(1);
		} finally {
			await mockDb.run(sql`DROP TRIGGER block_habit_delete`);
		}

		await deleteHabitAndHistory(habit.id);
		expect(await children()).toEqual([0, 0, 0, 0]);
		expect(await orphans()).toEqual([]);
	});

	it("deleting a custom category re-homes its habits to Other first — no habit is left on a deleted category", async () => {
		const custom = await createCategory({
			name: "Garden",
			shape: "plus",
			hue: 120,
		});
		await createHabit(
			makeHabitInput({ name: "Water plants", categoryId: custom.id }),
		);

		await deleteCategory(custom.id);

		expect(await orphans()).toEqual([]);
		expect(
			await mockDb
				.select()
				.from(categories)
				.where(eq(categories.id, custom.id)),
		).toEqual([]);
	});
});
