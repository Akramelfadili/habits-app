import { isSlippingVsPrevious, SLIPPING_MIN_DROP_POINTS } from "./slipping";

describe("isSlippingVsPrevious", () => {
	const row = (
		due: number,
		rate: number | null,
		previousRate: number | null,
	) => ({
		due,
		rate,
		previousRate,
	});

	it("flags a fall of at least the minimum points on the previous range", () => {
		expect(SLIPPING_MIN_DROP_POINTS).toBe(25);
		expect(isSlippingVsPrevious("week", row(5, 60, 100))).toBe(true);
		expect(isSlippingVsPrevious("week", row(5, 75, 100))).toBe(true);
		expect(isSlippingVsPrevious("week", row(5, 76, 100))).toBe(false);
	});

	it("needs enough due days in the range for its scale", () => {
		expect(isSlippingVsPrevious("week", row(2, 0, 100))).toBe(false);
		expect(isSlippingVsPrevious("year", row(29, 0, 100))).toBe(false);
		expect(isSlippingVsPrevious("year", row(30, 0, 100))).toBe(true);
	});

	it("has nothing to compare without a rate in both ranges", () => {
		expect(isSlippingVsPrevious("week", row(5, null, 100))).toBe(false);
		expect(isSlippingVsPrevious("week", row(5, 40, null))).toBe(false);
	});
});
