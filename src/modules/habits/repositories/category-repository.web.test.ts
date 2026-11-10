import { EVENING_FIXTURE, OTHER_FIXTURE } from "../dev/category-fixtures";
import type * as WebCategoryRepository from "./category-repository.web";
import type * as WebHabitRepository from "./habit-repository.web";

// Same reasoning as habit-repository.web.test.ts: require the web files
// explicitly, fresh per test — both from one registry, since a category
// change has to reach the habit store it embeds into.
function loadRepositories() {
	let categoriesRepo!: typeof WebCategoryRepository;
	let habitsRepo!: typeof WebHabitRepository;
	const react = jest.requireActual("react");
	jest.isolateModules(() => {
		jest.doMock("react", () => react);
		categoriesRepo = require("./category-repository.web");
		habitsRepo = require("./habit-repository.web");
	});
	return { ...categoriesRepo, ...habitsRepo };
}

// Default fixtures: "Evening walk" and "Read before bed" are in Evening.
const EVENING_HABIT_IDS = [1, 2];

describe("category-repository.web", () => {
	it("starts in the order migration 0011 would store: first appearance among the fixture habits, Other last", async () => {
		const { getCategories, getAllHabits } = loadRepositories();
		const habits = await getAllHabits();
		const categories = await getCategories();

		const firstSeen: string[] = [];
		for (const habit of [...habits]
			.filter((h) => h.archivedAt === null)
			.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)) {
			if (!firstSeen.includes(habit.category.name))
				firstSeen.push(habit.category.name);
		}
		const used = firstSeen.filter((name) => name !== OTHER_FIXTURE.name);
		expect(categories.slice(0, used.length).map((c) => c.name)).toEqual(used);
		expect(categories.at(-1)?.name).toBe(OTHER_FIXTURE.name);
	});

	it("appends a new category at the end of the stored order", async () => {
		const { createCategory, getCategories } = loadRepositories();
		await createCategory({ name: "Music", shape: "ring", hue: 330 });
		expect((await getCategories()).at(-1)?.name).toBe("Music");
	});

	it("renames a custom and every habit in it shows the new name", async () => {
		const { renameCategory, getCategories, getHabit } = loadRepositories();

		await renameCategory(EVENING_FIXTURE.id, " Night ");

		const renamed = (await getCategories()).find(
			(c) => c.id === EVENING_FIXTURE.id,
		);
		expect(renamed?.name).toBe("Night");
		for (const id of EVENING_HABIT_IDS) {
			expect((await getHabit(id))?.category.name).toBe("Night");
		}
	});

	it("deletes a custom, moving its habits to the end of Other in their own order", async () => {
		const { deleteCategory, getCategories, getHabit } = loadRepositories();

		await deleteCategory(EVENING_FIXTURE.id);

		expect(
			(await getCategories()).some((c) => c.id === EVENING_FIXTURE.id),
		).toBe(false);
		const [walk, read] = await Promise.all(EVENING_HABIT_IDS.map(getHabit));
		expect(walk?.category).toEqual(OTHER_FIXTURE);
		expect(read?.category).toEqual(OTHER_FIXTURE);
		// Fixture sort orders are 1–4, so the moved two take 5 and 6.
		expect([walk?.sortOrder, read?.sortOrder]).toEqual([5, 6]);
	});

	it("refuses to rename or delete a built-in", async () => {
		const { renameCategory, deleteCategory, getCategories } =
			loadRepositories();

		await expect(renameCategory(OTHER_FIXTURE.id, "Misc")).rejects.toThrow(
			"built-in",
		);
		await expect(deleteCategory(OTHER_FIXTURE.id)).rejects.toThrow("built-in");
		expect(
			(await getCategories()).find((c) => c.id === OTHER_FIXTURE.id)?.name,
		).toBe("Other");
	});

	it("reorders every movable category and keeps Other last (C2)", async () => {
		const { createCategory, getCategories, reorderCategories } =
			loadRepositories();
		const music = await createCategory({
			name: "Music",
			shape: "ring",
			hue: 330,
		});
		const all = await getCategories();
		const movable = all.filter((c) => c.name !== OTHER_FIXTURE.name);
		await reorderCategories([
			music.id,
			...movable.filter((c) => c.id !== music.id).map((c) => c.id),
		]);
		const after = await getCategories();
		expect(after[0].name).toBe("Music");
		expect(after.at(-1)?.name).toBe(OTHER_FIXTURE.name);
		expect(after).toHaveLength(all.length);
	});

	it("deletes an unused custom and restores it where it stood (DC6)", async () => {
		const { createCategory, deleteCategory, restoreCategory, getCategories } =
			loadRepositories();
		const music = await createCategory({
			name: "Music",
			shape: "ring",
			hue: 330,
		});
		await createCategory({ name: "Garden", shape: "square", hue: 95 });
		const before = (await getCategories()).map((c) => c.name);

		const deleted = await deleteCategory(music.id);
		expect(deleted.category.name).toBe("Music");
		expect((await getCategories()).map((c) => c.name)).not.toContain("Music");

		await restoreCategory(deleted);
		expect((await getCategories()).map((c) => c.name)).toEqual(before);
	});
});
