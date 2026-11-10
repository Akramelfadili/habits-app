import { BUILT_IN_CATEGORIES } from "./constants";
import {
	FIRST_RUN_QUICK_PICK_IDS,
	findSuggestion,
	SUGGESTIONS,
} from "./suggestions";

describe("SUGGESTIONS (D10)", () => {
	it("bundles nine, within the 8 to 10 range", () => {
		expect(SUGGESTIONS).toHaveLength(9);
	});

	it("has unique ids and unique names", () => {
		expect(new Set(SUGGESTIONS.map((s) => s.id)).size).toBe(SUGGESTIONS.length);
		expect(new Set(SUGGESTIONS.map((s) => s.name.toLowerCase())).size).toBe(
			SUGGESTIONS.length,
		);
	});

	it("only names built-in categories, which supply the icon and colour", () => {
		const names: string[] = BUILT_IN_CATEGORIES.map((c) => c.name);
		for (const suggestion of SUGGESTIONS) {
			expect(names).toContain(suggestion.category);
		}
	});

	it("never gives a Break habit a quantity target (Break is yes or no)", () => {
		for (const suggestion of SUGGESTIONS) {
			if (suggestion.direction === "break")
				expect(suggestion.target).toBeNull();
		}
	});

	it("keeps names within the habit name limit", () => {
		for (const suggestion of SUGGESTIONS) {
			expect(suggestion.name.length).toBeLessThanOrEqual(32);
		}
	});

	it("draws its five quick picks from the bundle, in the frame's order", () => {
		expect(
			FIRST_RUN_QUICK_PICK_IDS.map((id) => findSuggestion(id)?.name),
		).toEqual([
			"Drink water",
			"Read 20 min",
			"Meditate",
			"Morning run",
			"No phone in bed",
		]);
	});

	it("finds a suggestion by id, and none for an unknown id", () => {
		expect(findSuggestion("drink-water")?.name).toBe("Drink water");
		expect(findSuggestion("nope")).toBeUndefined();
	});
});
