import {
	archiveInsteadBody,
	deleteConsequence,
	deleteHeadline,
} from "./delete-habit-sheet-helpers";

describe("delete-habit-sheet-helpers", () => {
	it("quotes the habit's name in the headline", () => {
		expect(deleteHeadline("Glass of water")).toBe("Delete “Glass of water”?");
	});

	it("spells out how many logged days go with it", () => {
		expect(deleteConsequence(218)).toBe(
			"This removes the habit and all 218 logged days permanently. It cannot be undone.",
		);
		expect(deleteConsequence(1)).toBe(
			"This removes the habit and its 1 logged day permanently. It cannot be undone.",
		);
		expect(deleteConsequence(0)).toBe(
			"This removes the habit permanently. It cannot be undone.",
		);
	});

	it("mentions the streak archiving would keep, when there is one", () => {
		expect(archiveInsteadBody(24)).toBe(
			"Hides it from Today, keeps every log and the 24-day streak. Reversible any time.",
		);
		expect(archiveInsteadBody(0)).toBe(
			"Hides it from Today, keeps every log. Reversible any time.",
		);
	});
});
