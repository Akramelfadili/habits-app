import { atIndex, present } from "./indexed";

describe("atIndex", () => {
	it("returns the item at the index", () => {
		expect(atIndex(["a", "b", "c"], 0)).toBe("a");
		expect(atIndex(["a", "b", "c"], 2)).toBe("c");
	});

	it("returns falsy items that are not undefined", () => {
		expect(atIndex([0, 1], 0)).toBe(0);
		expect(atIndex([null], 0)).toBeNull();
	});

	it("throws a RangeError naming the index and length when out of range", () => {
		expect(() => atIndex(["a"], 1)).toThrow(RangeError);
		expect(() => atIndex(["a"], -1)).toThrow(/index -1 \(length 1\)/);
	});
});

describe("present", () => {
	it("returns the value, including falsy ones", () => {
		expect(present("a", "name")).toBe("a");
		expect(present(0, "count")).toBe(0);
		expect(present(null, "nothing")).toBeNull();
	});

	it("throws naming what was expected when undefined", () => {
		expect(() => present(undefined, "the inserted row")).toThrow(
			"Expected the inserted row, got nothing.",
		);
	});
});
