import { eq } from "drizzle-orm";
import {
	entries,
	entryNotes,
	frozenDays,
	habits,
	reminders,
} from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { builtInCategory, makeHabitInput } from "../test-support/habit-builder";
import { inProduction } from "../test-support/in-production";
import type { Frequency } from "../types";
import type * as HabitRepository from "./habit-repository";

// jest.mock(...) is hoisted above imports, which would run this before mockDb
// exists — jest.doMock + a same-order require() keeps this file's own
// sequencing (create the test db, register the mock, then load the module
// under test) instead of relying on Jest/Babel's hoisting to get it right.
const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const {
	createHabit,
	updateHabit,
	deleteAllHabits,
	createHabitAt,
	getHabit,
	reorderHabits,
	setHabitArchived,
	setHabitRestored,
	deleteHabitAndHistory,
}: typeof HabitRepository = require("./habit-repository");

// Fresh-database ids: built-ins are seeded 1–10 in BUILT_IN_CATEGORIES order.
const LEARNING = builtInCategory("Learning");
const FITNESS = builtInCategory("Fitness");
const baseInput = makeHabitInput({ categoryId: LEARNING.id });

describe("habit-repository", () => {
	it("creates a habit and returns the mapped domain type", async () => {
		const habit = await createHabit(baseInput);

		expect(habit).toMatchObject({
			name: "Read",
			category: LEARNING,
			direction: "build",
			targetType: "simple",
			frequency: { type: "daily" },
		});
		expect(habit.id).toEqual(expect.any(Number));
		expect(habit.createdAt).toBeInstanceOf(Date);
		expect(habit.updatedAt).toBeInstanceOf(Date);
	});

	it("maps the habit's category — its icon and color come from there (HAB-24)", async () => {
		const habit = await createHabit({ ...baseInput, categoryId: FITNESS.id });
		expect(habit.category).toEqual(FITNESS);
		expect((await getHabit(habit.id))?.category).toEqual(FITNESS);
	});

	it("writes nothing to the legacy icon/color/category columns", async () => {
		const habit = await createHabit(baseInput);
		const [row] = await mockDb
			.select()
			.from(habits)
			.where(eq(habits.id, habit.id));
		expect(row).toMatchObject({ icon: null, color: null, category: null });
	});

	it("updates a habit's editable fields but leaves direction unchanged", async () => {
		const created = await createHabit(baseInput);

		const updated = await updateHabit(created.id, {
			name: "Read more",
			categoryId: FITNESS.id,
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
			frequency: { type: "daily" },
		});

		expect(updated).toMatchObject({
			id: created.id,
			name: "Read more",
			category: FITNESS,
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
			frequency: { type: "daily" },
			direction: "build",
		});
	});

	it("round-trips a quantity habit's target amount and unit", async () => {
		const habit = await createHabit({
			...baseInput,
			targetType: "quantity",
			targetAmount: 20,
			targetUnit: "pages",
		});
		expect(habit.targetAmount).toBe(20);
		expect(habit.targetUnit).toBe("pages");
	});

	it("stores a simple-check habit's target amount and unit as null", async () => {
		const habit = await createHabit(baseInput);
		expect(habit.targetAmount).toBeNull();
		expect(habit.targetUnit).toBeNull();
	});

	it.each<Frequency>([
		{ type: "daily" },
		{ type: "weekdays", days: [1, 3, 5] },
		{ type: "per-week", timesPerWeek: 4 },
	])("round-trips a %j frequency", async (frequency) => {
		const habit = await createHabit({ ...baseInput, frequency });
		expect(habit.frequency).toEqual(frequency);
	});

	it("stores weekdays in Mon→Sun order regardless of pick order", async () => {
		const habit = await createHabit({
			...baseInput,
			frequency: { type: "weekdays", days: [7, 1, 3] },
		});
		expect(habit.frequency).toEqual({ type: "weekdays", days: [1, 3, 7] });
	});

	it("changing frequency clears the previous type's stored values", async () => {
		const created = await createHabit({
			...baseInput,
			frequency: { type: "weekdays", days: [1, 3, 5] },
		});

		const { name, categoryId, targetType, targetAmount, targetUnit } =
			baseInput;
		const updated = await updateHabit(created.id, {
			name,
			categoryId,
			targetType,
			targetAmount,
			targetUnit,
			frequency: { type: "per-week", timesPerWeek: 2 },
		});

		expect(updated.frequency).toEqual({ type: "per-week", timesPerWeek: 2 });
		const [row] = await mockDb
			.select()
			.from(habits)
			.where(eq(habits.id, created.id));
		expect(row.frequencyWeekdays).toBeNull();
	});

	it("deletes every habit", async () => {
		await createHabit(baseInput);
		await createHabit({ ...baseInput, name: "Stretch" });

		await deleteAllHabits();

		const remaining = await mockDb.select().from(habits);
		expect(remaining).toHaveLength(0);
	});

	describe("createHabitAt", () => {
		it("stores the given createdAt instead of the current time", async () => {
			const backdate = new Date("2026-09-01T00:00:00Z");
			const habit = await createHabitAt(baseInput, backdate);
			expect(habit.createdAt).toEqual(backdate);
		});

		it("refuses to run outside __DEV__", async () => {
			await inProduction(async () => {
				await expect(
					createHabitAt(baseInput, new Date("2026-09-01")),
				).rejects.toThrow("dev-only");
			});
		});
	});

	it("refuses to delete anything outside __DEV__", async () => {
		await createHabit(baseInput);
		const before = await mockDb.select().from(habits);

		await inProduction(async () => {
			await expect(deleteAllHabits()).rejects.toThrow("dev-only");
		});

		const after = await mockDb.select().from(habits);
		expect(after).toHaveLength(before.length);
	});

	describe("manual order (HAB-13)", () => {
		it("puts each new habit after every existing one", async () => {
			const first = await createHabit(baseInput);
			const second = await createHabit({ ...baseInput, name: "Stretch" });
			expect(second.sortOrder).toBeGreaterThan(first.sortOrder);
		});

		it("redistributes the reordered habits' own sort values", async () => {
			const a = await createHabit(baseInput);
			const other = await createHabit({ ...baseInput, categoryId: FITNESS.id });
			const b = await createHabit(baseInput);

			await reorderHabits([b.id, a.id]);

			expect((await getHabit(b.id))?.sortOrder).toBe(a.sortOrder);
			expect((await getHabit(a.id))?.sortOrder).toBe(b.sortOrder);
			// A habit outside the reordered set keeps its slot, so category
			// groups never shift relative to each other.
			expect((await getHabit(other.id))?.sortOrder).toBe(other.sortOrder);
		});

		it("rejects a reorder naming a habit that doesn't exist", async () => {
			const a = await createHabit(baseInput);
			await expect(reorderHabits([a.id, 999_999])).rejects.toThrow();
		});
	});

	describe("archive and restore (HAB-13)", () => {
		it("starts active with no pauses", async () => {
			const habit = await createHabit(baseInput);
			expect(habit.archivedAt).toBeNull();
			expect(habit.pauses).toEqual([]);
		});

		it("archives without touching anything else", async () => {
			const habit = await createHabit(baseInput);
			const archivedAt = new Date("2026-09-02T09:00:00Z");

			const archived = await setHabitArchived(habit.id, archivedAt);

			expect(archived).toEqual({ ...habit, archivedAt });
		});

		it("restores with the given pauses, round-tripped", async () => {
			const habit = await createHabit(baseInput);
			await setHabitArchived(habit.id, new Date());
			const pauses = [
				{ from: "2026-08-01", to: "2026-08-03" },
				{ from: "2026-09-02", to: "2026-09-09" },
			];

			const restored = await setHabitRestored(habit.id, pauses);

			expect(restored.archivedAt).toBeNull();
			expect(restored.pauses).toEqual(pauses);
			expect((await getHabit(habit.id))?.pauses).toEqual(pauses);
		});
	});

	describe("sort positions across reorder, archive and restore (HAB-19)", () => {
		it("keeps every habit's sort position unique and unchanged through archive → restore", async () => {
			const a = await createHabit(baseInput);
			const b = await createHabit({ ...baseInput, name: "B" });
			const c = await createHabit({ ...baseInput, name: "C" });
			await reorderHabits([c.id, a.id]);
			const before = await Promise.all([a, b, c].map((h) => getHabit(h.id)));

			await setHabitArchived(a.id, new Date());
			await setHabitRestored(a.id, []);

			const after = await Promise.all([a, b, c].map((h) => getHabit(h.id)));
			expect(after.map((h) => h?.sortOrder)).toEqual(
				before.map((h) => h?.sortOrder),
			);
			expect(new Set(after.map((h) => h?.sortOrder)).size).toBe(3);
		});

		it("persists a reorder as the order every reader sees", async () => {
			const a = await createHabit(baseInput);
			const b = await createHabit({ ...baseInput, name: "B" });

			await reorderHabits([b.id, a.id]);

			const [first, second] = await Promise.all([
				getHabit(b.id),
				getHabit(a.id),
			]);
			expect(first?.sortOrder).toBeLessThan(second?.sortOrder ?? 0);
		});
	});

	describe("deleteHabitAndHistory (HAB-13)", () => {
		it("deletes the habit and every row that references it, leaving others alone", async () => {
			const habit = await createHabit(baseInput);
			const other = await createHabit({ ...baseInput, name: "Keep me" });
			const now = new Date();
			for (const habitId of [habit.id, other.id]) {
				await mockDb
					.insert(entries)
					.values({ habitId, date: "2026-09-01", createdAt: now });
				await mockDb
					.insert(entryNotes)
					.values({ habitId, date: "2026-09-01", note: "n", updatedAt: now });
				await mockDb
					.insert(frozenDays)
					.values({ habitId, date: "2026-09-02", createdAt: now });
				await mockDb.insert(reminders).values({
					habitId,
					hour: 7,
					minute: 0,
					weekdays: "1",
					createdAt: now,
				});
			}

			await deleteHabitAndHistory(habit.id);

			expect(await getHabit(habit.id)).toBeUndefined();
			for (const table of [entries, entryNotes, frozenDays, reminders]) {
				const rows = await mockDb
					.select()
					.from(table)
					.where(eq(table.habitId, habit.id));
				expect(rows).toHaveLength(0);
				const kept = await mockDb
					.select()
					.from(table)
					.where(eq(table.habitId, other.id));
				expect(kept).toHaveLength(1);
			}
			expect(await getHabit(other.id)).toBeDefined();
		});
	});
});
