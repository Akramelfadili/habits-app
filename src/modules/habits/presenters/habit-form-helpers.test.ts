import { formIssues } from "./habit-form-helpers";

const ok = {
	name: "Read",
	duplicate: false,
	noWeekdays: false,
	unitBlank: false,
	unitTouched: false,
};

describe("formIssues", () => {
	it("asks for a name first, and treats whitespace as no name", () => {
		expect(formIssues({ ...ok, name: "" }).reason).toBe("Add a name to save");
		expect(formIssues({ ...ok, name: "   " }).reason).toBe(
			"Add a name to save",
		);
	});

	it("gives no reason when nothing blocks", () => {
		expect(formIssues(ok)).toEqual({ count: 0, reason: undefined, fields: [] });
	});

	it("counts a duplicate name and no days as two issues (F8)", () => {
		const result = formIssues({ ...ok, duplicate: true, noWeekdays: true });
		expect(result.reason).toBe("Fix 2 issues to save");
		expect(result.fields).toEqual(["name", "weekdays"]);
	});

	it("says '1 issue' for one, once the blank unit has been left", () => {
		expect(
			formIssues({ ...ok, unitBlank: true, unitTouched: true }).reason,
		).toBe("Fix 1 issue to save");
	});

	it("asks for the unit, without counting an error, until it has been left", () => {
		const result = formIssues({ ...ok, unitBlank: true });
		expect(result.reason).toBe("Add a unit to save");
		expect(result.count).toBe(0);
	});

	it("keeps the name reason while the name is empty, even with other errors on screen", () => {
		const result = formIssues({ ...ok, name: "", noWeekdays: true });
		expect(result.reason).toBe("Add a name to save");
		expect(result.fields).toEqual(["weekdays"]);
	});

	it("blocks an edited V1 name still over 32, and lets an unchanged one through", () => {
		const legacy = "a".repeat(38);
		expect(formIssues({ ...ok, name: `${legacy}b` }).fields).toEqual(["name"]);
		expect(
			formIssues({ ...ok, name: legacy, originalName: legacy }).fields,
		).toEqual([]);
	});
});
