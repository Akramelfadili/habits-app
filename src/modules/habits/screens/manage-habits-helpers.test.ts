import { makeHabit } from "../test-support/habit-builder";
import {
	archivedRowSubtitle,
	archivedSectionTitle,
	manageRowSubtitle,
} from "./manage-habits-helpers";

describe("manage-habits-helpers", () => {
	it("labels an active row with its category and cadence", () => {
		expect(
			manageRowSubtitle(
				makeHabit({
					category: "Training",
					frequency: { type: "weekdays", days: [1, 3, 5] },
				}),
			),
		).toBe("Training · Mon, Wed, Fri");
		expect(manageRowSubtitle(makeHabit({ category: null }))).toBe(
			"Anytime · daily",
		);
	});

	it("labels an archived row with its archive date and days logged", () => {
		expect(archivedRowSubtitle(new Date(2026, 8, 2), 41)).toBe(
			"2 Sep · 41 days logged",
		);
		expect(archivedRowSubtitle(new Date(2026, 7, 18), 1)).toBe(
			"18 Aug · 1 day logged",
		); // The audit's "0 logs kept" — an archived habit with no history.
		expect(archivedRowSubtitle(new Date(2026, 8, 24), 0)).toBe(
			"24 Sep · nothing logged",
		);
	});

	it("counts the archived section", () => {
		expect(archivedSectionTitle(2)).toBe("Archived · 2");
	});
});
