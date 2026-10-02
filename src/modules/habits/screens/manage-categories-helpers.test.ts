import { habitCountLabel } from "./manage-categories-helpers";

describe("habitCountLabel (HAB-25)", () => {
	it("reads Not used, singular, plural", () => {
		expect(habitCountLabel(0)).toBe("Not used");
		expect(habitCountLabel(1)).toBe("1 habit");
		expect(habitCountLabel(3)).toBe("3 habits");
	});
});
