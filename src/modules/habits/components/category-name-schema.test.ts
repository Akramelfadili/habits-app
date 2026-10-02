import {
	makeCategory,
	TEST_BUILT_IN_CATEGORIES,
} from "../test-support/habit-builder";
import {
	duplicateRenameMessage,
	makeCategoryNameSchema,
	NO_CATEGORY_NAME_MESSAGE,
} from "./category-name-schema";

const music = makeCategory({ id: 11, name: "Music" });
const schema = makeCategoryNameSchema([...TEST_BUILT_IN_CATEGORIES, music]);

function messageFor(name: string): string | undefined {
	const result = schema.safeParse({ name });
	return result.success ? undefined : result.error.issues[0]?.message;
}

describe("makeCategoryNameSchema", () => {
	it("accepts a new name and trims it", () => {
		expect(schema.parse({ name: "  Journaling " })).toEqual({
			name: "Journaling",
		});
	});

	it("blocks an empty or whitespace-only name", () => {
		expect(messageFor("   ")).toBe(NO_CATEGORY_NAME_MESSAGE);
	});

	it("names the built-in a duplicate clashes with", () => {
		expect(messageFor(" fitness ")).toBe(
			"You already have Fitness. Pick it from the list instead.",
		);
	});

	it("catches a custom duplicate too, but not when renaming that same category", () => {
		expect(messageFor("MUSIC")).toMatch(/You already have Music/);
		const renaming = makeCategoryNameSchema(
			[...TEST_BUILT_IN_CATEGORIES, music],
			music.id,
		);
		expect(renaming.safeParse({ name: "music" }).success).toBe(true);
	});

	it("rejects more than 20 characters", () => {
		expect(schema.safeParse({ name: "x".repeat(21) }).success).toBe(false);
		expect(schema.safeParse({ name: "x".repeat(20) }).success).toBe(true);
	});
});

describe("makeCategoryNameSchema — rename (HAB-25)", () => {
	const garden = makeCategory({ id: 12, name: "Garden" });
	const all = [...TEST_BUILT_IN_CATEGORIES, music, garden];
	const renameMusic = makeCategoryNameSchema(all, music.id);

	it("rejects a built-in's name, ignoring case and spaces", () => {
		const result = renameMusic.safeParse({ name: " health " });
		expect(result.success).toBe(false);
	});

	it("rejects another custom's name", () => {
		expect(renameMusic.safeParse({ name: "GARDEN" }).success).toBe(false);
	});

	it("allows the category's own name in a different case", () => {
		expect(renameMusic.parse({ name: "music" })).toEqual({ name: "music" });
	});
});

describe("duplicateRenameMessage", () => {
	it("names the clash without pointing at a list", () => {
		expect(duplicateRenameMessage(music)).toBe(
			"You already have Music. Choose a different name.",
		);
	});
});
