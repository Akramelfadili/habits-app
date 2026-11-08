import { errorMessageOf, errorNameOf } from "./error-name";

describe("errorNameOf", () => {
	it("is the lower-cased name, and only the name", () => {
		expect(errorNameOf(new RangeError("/private/path"))).toBe("rangeerror");
	});

	it("works for an error-like value from another realm", () => {
		expect(errorNameOf({ name: "Error", message: "x" })).toBe("error");
	});

	it("never echoes a free-text name or a non-error", () => {
		expect(errorNameOf({ name: "disk /private/habits.db" })).toBe("nonerror");
		expect(errorNameOf("boom")).toBe("nonerror");
		expect(errorNameOf(null)).toBe("nonerror");
	});
});

describe("errorMessageOf", () => {
	it("reads a message or gives an empty string", () => {
		expect(errorMessageOf(new Error("no such table"))).toBe("no such table");
		expect(errorMessageOf(undefined)).toBe("");
		expect(errorMessageOf({ message: 4 })).toBe("");
	});
});
