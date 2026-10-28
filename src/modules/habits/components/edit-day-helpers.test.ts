import { editDayTitle } from "./edit-day-helpers";

describe("editDayTitle", () => {
	it("formats the day like the mockup", () => {
		expect(editDayTitle(new Date(2026, 6, 14))).toBe("Tuesday, 14 July");
	});
});
