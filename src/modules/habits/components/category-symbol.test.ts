import { BUILT_IN_CATEGORIES, CATEGORY_ROTATION } from "../constants";
import { categorySymbol } from "./category-symbol";

describe("categorySymbol", () => {
	it("maps each of the ten shapes to its own symbol", () => {
		const symbols = BUILT_IN_CATEGORIES.map(categorySymbol);
		expect(new Set(symbols).size).toBe(10);
		expect(new Set(CATEGORY_ROTATION.map(categorySymbol)).size).toBe(
			CATEGORY_ROTATION.length,
		);
	});

	it("draws Other as a ring", () => {
		expect(categorySymbol({ shape: "ring", hue: null })).toBe("circle");
	});
});
