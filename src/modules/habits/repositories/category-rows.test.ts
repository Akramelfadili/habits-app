jest.mock("@/lib/db/client", () => ({ db: {} }));

import type { Category } from "../types";
import { resolveHabitCategory, rowToCategory } from "./category-rows";

const health: Category = {
	id: 1,
	name: "Health",
	shape: "plus",
	hue: 25,
	builtIn: true,
};
const other: Category = {
	id: 10,
	name: "Other",
	shape: "ring",
	hue: null,
	builtIn: true,
};
const music: Category = {
	id: 11,
	name: "Music",
	shape: "dot",
	hue: 175,
	builtIn: false,
};

describe("rowToCategory", () => {
	it("keeps only the module's own fields", () => {
		const row = {
			id: 11,
			name: "Music",
			shape: "dot",
			hue: 175,
			builtIn: false,
			createdAt: new Date(),
		};

		expect(rowToCategory(row as never)).toEqual(music);
	});
});

describe("resolveHabitCategory", () => {
	const loaded = new Map([health, other, music].map((c) => [c.id, c]));

	it("returns the habit's own category when it exists", () => {
		expect(resolveHabitCategory(11, loaded)).toBe(music);
	});

	it("falls back to the built-in Other for a dangling id", () => {
		expect(resolveHabitCategory(999, loaded)).toBe(other);
	});

	it("still returns an Other when the set has none (a guard, not a path)", () => {
		const result = resolveHabitCategory(999, new Map([[1, health]]));

		expect(result).toMatchObject({ id: 0, name: "Other", builtIn: true });
		expect(result.hue).toBeNull();
	});

	it("does not mistake a custom category named Other for the built-in", () => {
		const custom: Category = {
			id: 12,
			name: "Other",
			shape: "dot",
			hue: 5,
			builtIn: false,
		};

		const result = resolveHabitCategory(999, new Map([[12, custom]]));

		expect(result.builtIn).toBe(true);
		expect(result.id).toBe(0);
	});
});
