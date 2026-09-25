import { frequencySummary, quickAddChips } from "./quantity-log-sheet-helpers";

describe("frequencySummary", () => {
	it("describes a daily frequency", () => {
		expect(frequencySummary({ type: "daily" })).toBe("daily");
	});

	it("describes a specific-weekdays frequency", () => {
		expect(frequencySummary({ type: "weekdays", days: [1, 3, 5] })).toBe(
			"on selected weekdays",
		);
	});

	it("describes a per-week frequency using its own count", () => {
		expect(frequencySummary({ type: "per-week", timesPerWeek: 4 })).toBe(
			"4x per week",
		);
	});
});

describe("quickAddChips", () => {
	it("returns the small steps plus a Full-target chip", () => {
		expect(quickAddChips(8)).toEqual([
			{ kind: "add", amount: 1, label: "+1" },
			{ kind: "add", amount: 2, label: "+2" },
			{ kind: "set", amount: 8, label: "Full 8" },
		]);
	});

	it("omits a step that would duplicate the Full-target chip", () => {
		expect(quickAddChips(1)).toEqual([
			{ kind: "set", amount: 1, label: "Full 1" },
		]);
		expect(quickAddChips(2)).toEqual([
			{ kind: "add", amount: 1, label: "+1" },
			{ kind: "set", amount: 2, label: "Full 2" },
		]);
	});
});
