import { BUILT_IN_CATEGORIES, CATEGORY_ROTATION } from "../constants";
import type { Category } from "../types";
import {
	findDuplicateCategory,
	nextCategoryAppearance,
} from "./category-rules";

const builtIns: Category[] = BUILT_IN_CATEGORIES.map((builtIn, index) => ({
	id: index + 1,
	...builtIn,
	builtIn: true,
}));

/** Customs on the given rotation slots (0-based), named after their slot. */
function customsOn(slots: number[]): Category[] {
	return slots.map((slot, index) => ({
		id: 100 + index,
		name: `Custom ${index}`,
		...CATEGORY_ROTATION[slot],
		builtIn: false,
	}));
}

describe("CATEGORY_ROTATION", () => {
	it("has ten slots with unique shape/hue pairs", () => {
		expect(CATEGORY_ROTATION).toHaveLength(10);
		const pairs = CATEGORY_ROTATION.map((slot) => `${slot.shape}/${slot.hue}`);
		expect(new Set(pairs).size).toBe(CATEGORY_ROTATION.length);
	});
});

describe("findDuplicateCategory", () => {
	const music: Category = {
		id: 11,
		name: "Music",
		shape: "diamond",
		hue: 175,
		builtIn: false,
	};
	const categories = [...builtIns, music];

	it("matches a built-in ignoring case and surrounding whitespace", () => {
		expect(findDuplicateCategory(categories, "health")?.name).toBe("Health");
		expect(findDuplicateCategory(categories, " Health ")?.name).toBe("Health");
		expect(findDuplicateCategory(categories, "FITNESS")?.name).toBe("Fitness");
	});

	it("matches a custom category the same way", () => {
		expect(findDuplicateCategory(categories, "  music")).toBe(music);
	});

	it("returns nothing for a new name, a partial match, or a blank name", () => {
		expect(findDuplicateCategory(categories, "Journaling")).toBeUndefined();
		expect(findDuplicateCategory(categories, "Heal")).toBeUndefined();
		expect(findDuplicateCategory(categories, "   ")).toBeUndefined();
	});

	it("ignores the category being renamed", () => {
		expect(
			findDuplicateCategory(categories, "music", music.id),
		).toBeUndefined();
	});
});

describe("nextCategoryAppearance", () => {
	it("gives the first custom slot 1, whatever the built-ins look like", () => {
		expect(nextCategoryAppearance(builtIns)).toEqual(CATEGORY_ROTATION[0]);
	});

	it("takes the next free slot in order", () => {
		expect(
			nextCategoryAppearance([...builtIns, ...customsOn([0, 1, 2])]),
		).toEqual(CATEGORY_ROTATION[3]);
	});

	it("reuses a freed slot before repeating any pair", () => {
		// Slot 2 (index 1) was deleted; slots after it are still in use.
		expect(
			nextCategoryAppearance([...builtIns, ...customsOn([0, 2, 3, 4])]),
		).toEqual(CATEGORY_ROTATION[1]);
	});

	it("wraps to the lowest slot once all ten are used once", () => {
		const allTen = customsOn([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(nextCategoryAppearance([...builtIns, ...allTen])).toEqual(
			CATEGORY_ROTATION[0],
		);
	});

	it("keeps wrapping evenly — fewest uses first, ties to the lowest slot", () => {
		const elevenThenTwelve = customsOn([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
		expect(nextCategoryAppearance([...builtIns, ...elevenThenTwelve])).toEqual(
			CATEGORY_ROTATION[1],
		);
	});

	it("counts a built-in sharing a rotation pair as no use (only customs count)", () => {
		const lookalike: Category = {
			id: 99,
			name: "Lookalike",
			...CATEGORY_ROTATION[0],
			builtIn: true,
		};
		expect(nextCategoryAppearance([...builtIns, lookalike])).toEqual(
			CATEGORY_ROTATION[0],
		);
	});
});
