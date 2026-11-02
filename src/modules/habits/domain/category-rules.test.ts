import { BUILT_IN_CATEGORIES, CATEGORY_ROTATION } from "../constants";
import { makeHabit } from "../test-support/habit-builder";
import type { Category } from "../types";
import {
	categoryUsage,
	findDuplicateCategory,
	movableCategories,
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
	it("has six slots with unique shape/hue pairs (V3 dropped 15, 350, 175, 230)", () => {
		expect(CATEGORY_ROTATION).toHaveLength(6);
		const pairs = CATEGORY_ROTATION.map((slot) => `${slot.shape}/${slot.hue}`);
		expect(new Set(pairs).size).toBe(CATEGORY_ROTATION.length);
	});
});

describe("findDuplicateCategory", () => {
	const music: Category = {
		id: 11,
		name: "Music",
		shape: "ring",
		hue: 330,
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

	it("wraps to the lowest slot once all six are used once", () => {
		const allSix = customsOn([0, 1, 2, 3, 4, 5]);
		expect(nextCategoryAppearance([...builtIns, ...allSix])).toEqual(
			CATEGORY_ROTATION[0],
		);
	});

	it("keeps wrapping evenly — fewest uses first, ties to the lowest slot", () => {
		const sevenThenEight = customsOn([0, 1, 2, 3, 4, 5, 0]);
		expect(nextCategoryAppearance([...builtIns, ...sevenThenEight])).toEqual(
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

describe("categoryUsage (HAB-25)", () => {
	const [music, garden] = customsOn([0, 1]);

	it("lists each category's habits — archived ones included — in category order", () => {
		const usage = categoryUsage(
			[music, garden],
			[
				makeHabit({ id: 1, name: "Piano", category: music }),
				makeHabit({
					id: 2,
					name: "Scales",
					category: music,
					archivedAt: new Date(2026, 8, 1),
				}),
			],
		);
		expect(usage).toEqual([
			{
				category: music,
				habitNames: ["Piano", "Scales"],
				activeCount: 1,
				archivedCount: 1,
			},
			{ category: garden, habitNames: [], activeCount: 0, archivedCount: 0 },
		]);
	});
});

describe("movableCategories (C2)", () => {
	it("is every category but the built-in Other, in the order given", () => {
		const [custom] = customsOn([0]);
		const stored = [builtIns[3], custom, ...builtIns.slice(0, 3), builtIns[9]];
		expect(movableCategories(stored)).toEqual([
			builtIns[3],
			custom,
			...builtIns.slice(0, 3),
		]);
		expect(movableCategories(stored).some((c) => c.name === "Other")).toBe(
			false,
		);
	});

	it("keeps a custom category that is called Other-like but is not the built-in", () => {
		const [custom] = customsOn([0]);
		const lookalike = { ...custom, name: "Other" };
		expect(movableCategories([lookalike])).toEqual([lookalike]);
	});
});
