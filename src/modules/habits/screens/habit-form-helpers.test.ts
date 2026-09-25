import { HABIT_COLORS } from "../constants";
import { makeHabit } from "../test-support/habit-builder";
import {
	filterCategorySuggestions,
	pickDefaultColor,
} from "./habit-form-helpers";

describe("pickDefaultColor", () => {
	it("picks the first color when there are no habits", () => {
		expect(pickDefaultColor([])).toBe(HABIT_COLORS[0]);
	});

	it("skips colors already used by another habit", () => {
		const habits = [
			makeHabit({ id: 1, color: "blue" }),
			makeHabit({ id: 2, color: "purple" }),
		];
		// HABIT_COLORS order is blue, purple, orange, ... — orange is first free.
		expect(pickDefaultColor(habits)).toBe("orange");
	});

	it("falls back to the first color once every color is taken", () => {
		const habits = HABIT_COLORS.map((color, index) =>
			makeHabit({ id: index + 1, color }),
		);
		expect(pickDefaultColor(habits)).toBe(HABIT_COLORS[0]);
	});
});

describe("filterCategorySuggestions", () => {
	const categories = ["Morning", "Evening", "Mornings out", "Work"];

	it("returns every category for an empty query", () => {
		expect(filterCategorySuggestions(categories, "  ")).toEqual(categories);
	});

	it("matches case-insensitively on a trimmed query", () => {
		expect(filterCategorySuggestions(categories, " MORN ")).toEqual([
			"Morning",
			"Mornings out",
		]);
	});

	it("excludes an exact match of the current value", () => {
		expect(filterCategorySuggestions(categories, "Morning ")).toEqual([
			"Mornings out",
		]);
	});

	it("caps the list at five suggestions", () => {
		const many = ["a1", "a2", "a3", "a4", "a5", "a6"];
		expect(filterCategorySuggestions(many, "a")).toHaveLength(5);
	});
});
