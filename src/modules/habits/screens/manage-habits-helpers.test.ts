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

	it("labels an archived row with its archive date and kept logs", () => {
		expect(archivedRowSubtitle(new Date(2026, 8, 2), 41)).toBe(
			"Archived 2 Sep · 41 logs kept",
		);
		expect(archivedRowSubtitle(new Date(2026, 7, 18), 1)).toBe(
			"Archived 18 Aug · 1 log kept",
		);
	});

	it("counts the archived section", () => {
		expect(archivedSectionTitle(2)).toBe("Archived · 2");
	});
});
