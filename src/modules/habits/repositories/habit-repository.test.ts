import { eq } from "drizzle-orm";
import { habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { makeHabitInput } from "../test-support/habit-builder";
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
}: typeof HabitRepository = require("./habit-repository");

const baseInput = makeHabitInput({ category: "Morning" });

describe("habit-repository", () => {
	it("creates a habit and returns the mapped domain type", async () => {
		const habit = await createHabit(baseInput);

		expect(habit).toMatchObject({
			name: "Read",
			icon: "book",
			color: "blue",
			category: "Morning",
			direction: "build",
			targetType: "simple",
			frequency: { type: "daily" },
		});
		expect(habit.id).toEqual(expect.any(Number));
		expect(habit.createdAt).toBeInstanceOf(Date);
		expect(habit.updatedAt).toBeInstanceOf(Date);
	});

	it("persists a null category as null, not an empty string", async () => {
		const habit = await createHabit({ ...baseInput, category: null });
		expect(habit.category).toBeNull();
	});

	it("updates a habit's editable fields but leaves direction unchanged", async () => {
		const created = await createHabit(baseInput);

		const updated = await updateHabit(created.id, {
			name: "Read more",
			icon: "leaf",
			color: "green",
			category: null,
			targetType: "quantity",
			frequency: { type: "daily" },
		});

		expect(updated).toMatchObject({
			id: created.id,
			name: "Read more",
			icon: "leaf",
			color: "green",
			category: null,
			targetType: "quantity",
			frequency: { type: "daily" },
			direction: "build",
		});
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

		const { name, icon, color, category, targetType } = baseInput;
		const updated = await updateHabit(created.id, {
			name,
			icon,
			color,
			category,
			targetType,
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

	it("refuses to delete anything outside __DEV__", async () => {
		await createHabit(baseInput);
		const before = await mockDb.select().from(habits);

		await inProduction(async () => {
			await expect(deleteAllHabits()).rejects.toThrow("dev-only");
		});

		const after = await mockDb.select().from(habits);
		expect(after).toHaveLength(before.length);
	});
});
