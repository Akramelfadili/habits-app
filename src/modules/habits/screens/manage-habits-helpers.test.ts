import { categoryNamed, makeHabit } from "../test-support/habit-builder";
import {
	archivedRowSubtitle,
	archivedSectionTitle,
	manageRowSubtitle,
	noActiveMessage,
	reorderingTag,
} from "./manage-habits-helpers";

describe("manage-habits-helpers", () => {
	it("labels an active row with its category and cadence", () => {
		expect(
			manageRowSubtitle(
				makeHabit({
					category: categoryNamed("Training"),
					frequency: { type: "weekdays", days: [1, 3, 5] },
				}),
			),
		).toBe("Training · Mon, Wed, Fri");
		expect(
			manageRowSubtitle(makeHabit({ category: categoryNamed("Other") })),
		).toBe("Other · daily");
	});

	it("labels an archived row with its archive date and logs kept", () => {
		expect(archivedRowSubtitle(new Date(2026, 8, 2), 41)).toBe(
			"Archived 2 Sep · 41 logs kept",
		);
		expect(archivedRowSubtitle(new Date(2026, 7, 18), 1)).toBe(
			"Archived 18 Aug · 1 log kept",
		); // The audit's "0 logs kept" — an archived habit with no history.
		expect(archivedRowSubtitle(new Date(2026, 8, 24), 0)).toBe(
			"Archived 24 Sep · no logs",
		);
	});

	it("names the lifted category in the reordering tag", () => {
		expect(reorderingTag("Training")).toBe("Reordering within Training");
	});

	it("explains an empty Today by what's true: archived, or never added", () => {
		expect(noActiveMessage(3)).toMatch(/Everything is archived/);
		expect(noActiveMessage(0)).not.toMatch(/archived/);
	});

	it("counts the archived section", () => {
		expect(archivedSectionTitle(2)).toBe("Archived · 2");
	});
});
