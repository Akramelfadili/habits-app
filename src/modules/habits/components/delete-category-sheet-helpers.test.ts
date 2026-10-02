import {
	affectedHabitsLine,
	deleteCategoryBody,
	deleteCategoryConfirmLabel,
	deleteCategoryHeadline,
} from "./delete-category-sheet-helpers";

describe("delete-category copy (HAB-25)", () => {
	it("names the category in the headline", () => {
		expect(deleteCategoryHeadline("Garden")).toBe("Delete “Garden”?");
	});

	it("unused (F4a): no mention of a move", () => {
		expect(deleteCategoryBody(0)).toBe(
			"No habits use it, so nothing else changes. This can't be undone.",
		);
		expect(deleteCategoryBody(0)).not.toMatch(/Other|move/);
		expect(deleteCategoryConfirmLabel(0)).toBe("Delete category");
	});

	it("in use (F4b): names the exact count, plural", () => {
		expect(deleteCategoryBody(3)).toBe(
			"3 habits will move to Other and take its icon and colour. Their logs, streaks and reminders stay exactly as they are.",
		);
		expect(deleteCategoryConfirmLabel(3)).toBe("Delete and move 3 habits");
	});

	it("in use by one habit: singular", () => {
		expect(deleteCategoryBody(1)).toBe(
			"1 habit will move to Other and take its icon and colour. Its logs, streak and reminders stay exactly as they are.",
		);
		expect(deleteCategoryConfirmLabel(1)).toBe("Delete and move 1 habit");
	});

	it("lists every affected habit, never truncated", () => {
		const names = Array.from({ length: 25 }, (_, i) => `Habit ${i + 1}`);
		const line = affectedHabitsLine(names);
		for (const name of names) expect(line).toContain(name);
		expect(affectedHabitsLine(["Piano practice", "Guitar scales"])).toBe(
			"Piano practice · Guitar scales",
		);
	});
});
