import { quickAddChips } from "./quantity-log-sheet-helpers";

describe("quickAddChips", () => {
	it("returns +1, +2, +3 and a Fill chip", () => {
		expect(quickAddChips(8)).toEqual([
			{ kind: "add", amount: 1, label: "+1" },
			{ kind: "add", amount: 2, label: "+2" },
			{ kind: "add", amount: 3, label: "+3" },
			{ kind: "fill", amount: 8 },
		]);
	});

	it("omits a step that would duplicate the Fill chip", () => {
		expect(quickAddChips(1)).toEqual([{ kind: "fill", amount: 1 }]);
		expect(quickAddChips(3)).toEqual([
			{ kind: "add", amount: 1, label: "+1" },
			{ kind: "add", amount: 2, label: "+2" },
			{ kind: "fill", amount: 3 },
		]);
	});
});
