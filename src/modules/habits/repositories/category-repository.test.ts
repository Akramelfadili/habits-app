import { eq } from "drizzle-orm";
import { categories, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { BUILT_IN_CATEGORIES } from "../constants";
import { builtInCategory, makeHabitInput } from "../test-support/habit-builder";
import type * as CategoryRepository from "./category-repository";
import type * as HabitRepository from "./habit-repository";

// Same doMock + require ordering as habit-repository.test.ts.
const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const {
	createCategory,
	getCategories,
	renameCategory,
	deleteCategory,
	reorderCategories,
	restoreCategory,
}: typeof CategoryRepository = require("./category-repository");
const { createHabit, getHabit, setHabitArchived }: typeof HabitRepository =
	require("./habit-repository");

const OTHER = builtInCategory("Other");
const HEALTH = builtInCategory("Health");

async function newCustom(name: string) {
	return createCategory({ name, shape: "square", hue: 95 });
}

async function habitRows() {
	return mockDb
		.select({
			id: habits.id,
			categoryId: habits.categoryId,
			sortOrder: habits.sortOrder,
		})
		.from(habits);
}

describe("category-repository", () => {
	beforeEach(async () => {
		await mockDb.delete(habits);
		await mockDb.delete(categories).where(eq(categories.builtIn, false));
	});

	it("starts with exactly the ten built-ins, in their fixed order", async () => {
		const all = await getCategories();
		expect(all.map((c) => c.name)).toEqual(
			BUILT_IN_CATEGORIES.map((c) => c.name),
		);
		expect(all.every((c) => c.builtIn)).toBe(true);
	});

	it("creates a custom with the given look, trimmed, after every built-in", async () => {
		const created = await createCategory({
			name: "  Journaling ",
			shape: "square",
			hue: 95,
		});
		expect(created).toMatchObject({
			name: "Journaling",
			shape: "square",
			hue: 95,
			builtIn: false,
		});

		const second = await createCategory({
			name: "Music",
			shape: "ring",
			hue: 330,
		});
		const names = (await getCategories()).map((c) => c.name);
		expect(names.slice(-2)).toEqual(["Journaling", "Music"]);
		expect(second.id).toBeGreaterThan(created.id);
	});

	describe("stored order", () => {
		it("puts a new category last (max + 1), after Other", async () => {
			await newCustom("Music");
			await newCustom("Garden");
			const names = (await getCategories()).map((c) => c.name);
			expect(names.slice(-3)).toEqual(["Other", "Music", "Garden"]);
			const rows = await mockDb
				.select({ name: categories.name, sortOrder: categories.sortOrder })
				.from(categories);
			const orderOf = (name: string) =>
				rows.find((row) => row.name === name)?.sortOrder;
			expect(orderOf("Music")).toBe(BUILT_IN_CATEGORIES.length + 1);
			expect(orderOf("Garden")).toBe(BUILT_IN_CATEGORIES.length + 2);
		});

		it("reads categories in sort_order, not id order", async () => {
			const music = await newCustom("Music");
			await mockDb
				.update(categories)
				.set({ sortOrder: 0 })
				.where(eq(categories.id, music.id));
			expect((await getCategories())[0].name).toBe("Music");
		});
	});

	describe("renameCategory", () => {
		it("renames a custom, trimmed, keeping its id, look and position", async () => {
			const music = await newCustom("Music");
			await newCustom("Garden");

			const renamed = await renameCategory(music.id, "  Piano ");

			expect(renamed).toEqual({ ...music, name: "Piano" });
			const customs = (await getCategories()).filter((c) => !c.builtIn);
			expect(customs.map((c) => c.name)).toEqual(["Piano", "Garden"]);
		});

		it("allows the category's own name in a different case", async () => {
			const music = await newCustom("Music");
			expect((await renameCategory(music.id, "music")).name).toBe("music");
		});

		it("refuses to rename a built-in", async () => {
			await expect(renameCategory(HEALTH.id, "Wellbeing")).rejects.toThrow(
				"built-in",
			);
			const health = (await getCategories()).find((c) => c.id === HEALTH.id);
			expect(health?.name).toBe("Health");
		});
	});

	describe("deleteCategory", () => {
		it("deletes an unused custom and touches no habit", async () => {
			const garden = await newCustom("Garden");
			const habit = await createHabit(
				makeHabitInput({ categoryId: HEALTH.id }),
			);
			const before = await habitRows();

			await deleteCategory(garden.id);

			expect((await getCategories()).some((c) => c.id === garden.id)).toBe(
				false,
			);
			expect(await habitRows()).toEqual(before);
			expect((await getHabit(habit.id))?.category).toEqual(HEALTH);
		});

		it("moves every habit in it to Other — archived ones too", async () => {
			const music = await newCustom("Music");
			const piano = await createHabit(
				makeHabitInput({ name: "Piano", categoryId: music.id }),
			);
			const scales = await createHabit(
				makeHabitInput({ name: "Scales", categoryId: music.id }),
			);
			await setHabitArchived(scales.id, new Date(2026, 8, 1));

			await deleteCategory(music.id);

			expect((await getHabit(piano.id))?.category).toEqual(OTHER);
			const archived = await getHabit(scales.id);
			expect(archived?.category).toEqual(OTHER);
			expect(archived?.archivedAt).toEqual(new Date(2026, 8, 1));
		});

		it("appends moved habits to the end of the manual order, in their own order, with no slot collisions", async () => {
			const music = await newCustom("Music");
			const inOther = await createHabit(
				makeHabitInput({ name: "Inbox zero", categoryId: OTHER.id }),
			);
			const piano = await createHabit(
				makeHabitInput({ name: "Piano", categoryId: music.id }),
			);
			const health = await createHabit(
				makeHabitInput({ name: "Vitamins", categoryId: HEALTH.id }),
			);
			const scales = await createHabit(
				makeHabitInput({ name: "Scales", categoryId: music.id }),
			);
			const highest = Math.max(...(await habitRows()).map((r) => r.sortOrder));

			await deleteCategory(music.id);

			const rows = await habitRows();
			const order = (id: number) =>
				rows.find((row) => row.id === id)?.sortOrder;
			expect(order(inOther.id)).toBe(inOther.sortOrder);
			expect(order(health.id)).toBe(health.sortOrder);
			expect(order(piano.id)).toBe(highest + 1);
			expect(order(scales.id)).toBe(highest + 2);
			expect(new Set(rows.map((r) => r.sortOrder)).size).toBe(rows.length);
		});

		it("is atomic: a failure after the habits moved leaves habits and category unchanged", async () => {
			const music = await newCustom("Music");
			await createHabit(
				makeHabitInput({ name: "Piano", categoryId: music.id }),
			);
			await createHabit(
				makeHabitInput({ name: "Scales", categoryId: music.id }),
			);
			const before = await habitRows();
			// The category delete is the transaction's last write, after every
			// habit has been reassigned.
			const spy = jest.spyOn(mockDb, "delete").mockImplementationOnce(() => {
				throw new Error("disk full");
			});

			await expect(deleteCategory(music.id)).rejects.toThrow("disk full");
			spy.mockRestore();

			expect(await habitRows()).toEqual(before);
			expect((await getCategories()).some((c) => c.id === music.id)).toBe(true);
		});

		it("refuses to delete a built-in, leaving its habits where they are", async () => {
			const habit = await createHabit(
				makeHabitInput({ categoryId: HEALTH.id }),
			);
			await expect(deleteCategory(HEALTH.id)).rejects.toThrow("built-in");
			await expect(deleteCategory(OTHER.id)).rejects.toThrow("built-in");
			expect((await getHabit(habit.id))?.category).toEqual(HEALTH);
			expect(await getCategories()).toHaveLength(BUILT_IN_CATEGORIES.length);
		});
	});

	describe("reorderCategories (C2)", () => {
		const names = async () => (await getCategories()).map((c) => c.name);

		it("stores the new order for custom and built-in alike, with Other kept last", async () => {
			const music = await newCustom("Music");
			const garden = await newCustom("Garden");
			const all = await getCategories();
			const movable = all.filter((c) => c.name !== "Other").map((c) => c.id);
			// Garden first, Music second, then the built-ins as they were.
			const reordered = [
				garden.id,
				music.id,
				...movable.filter((id) => id !== music.id && id !== garden.id),
			];

			await reorderCategories(reordered);

			expect((await names()).slice(0, 4)).toEqual([
				"Garden",
				"Music",
				"Health",
				"Fitness",
			]);
			expect((await names()).at(-1)).toBe("Other");
		});

		it("lets Health move below a custom category, and a later new category still lands after Other", async () => {
			const music = await newCustom("Music");
			const all = await getCategories();
			const movable = all.filter((c) => c.name !== "Other").map((c) => c.id);
			await reorderCategories([
				music.id,
				...movable.filter((id) => id !== music.id),
			]);
			expect((await names())[0]).toBe("Music");

			await newCustom("Garden");
			const after = await names();
			expect(after.at(-1)).toBe("Garden");
			expect(after.indexOf("Other")).toBe(after.length - 2);
		});

		it("is atomic: a failure part-way leaves the order unchanged", async () => {
			const music = await newCustom("Music");
			const before = await names();
			const movable = (await getCategories())
				.filter((c) => c.name !== "Other")
				.map((c) => c.id);
			const spy = jest.spyOn(mockDb, "update").mockImplementationOnce(() => {
				throw new Error("disk full");
			});
			await expect(
				reorderCategories([
					music.id,
					...movable.filter((id) => id !== music.id),
				]),
			).rejects.toThrow("disk full");
			spy.mockRestore();
			expect(await names()).toEqual(before);
		});
	});

	describe("deleting an unused category and undoing it (DC6)", () => {
		it("hands back what it removed, and restoreCategory puts it back in the same place", async () => {
			const music = await newCustom("Music");
			const garden = await newCustom("Garden");
			const before = (await getCategories()).map((c) => c.name);

			const deleted = await deleteCategory(music.id);
			expect(deleted.category).toEqual(music);
			expect((await getCategories()).some((c) => c.id === music.id)).toBe(
				false,
			);

			const restored = await restoreCategory(deleted);
			expect(restored).toEqual(music);
			const after = await getCategories();
			expect(after.map((c) => c.name)).toEqual(before);
			expect(after.find((c) => c.id === garden.id)).toBeDefined();
		});
	});
});
