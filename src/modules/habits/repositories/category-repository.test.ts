import { createTestDb } from "@/lib/db/test-db";
import { BUILT_IN_CATEGORIES } from "../constants";
import type * as CategoryRepository from "./category-repository";

// Same doMock + require ordering as habit-repository.test.ts.
const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const { createCategory, getCategories }: typeof CategoryRepository =
	require("./category-repository");

describe("category-repository", () => {
	it("starts with exactly the ten built-ins, in their fixed order", async () => {
		const categories = await getCategories();
		expect(categories.map((c) => c.name)).toEqual(
			BUILT_IN_CATEGORIES.map((c) => c.name),
		);
		expect(categories.every((c) => c.builtIn)).toBe(true);
	});

	it("creates a custom with the given look, trimmed, after every built-in", async () => {
		const created = await createCategory({
			name: "  Journaling ",
			shape: "diamond",
			hue: 175,
		});
		expect(created).toMatchObject({
			name: "Journaling",
			shape: "diamond",
			hue: 175,
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
});
