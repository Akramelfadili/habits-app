import {
	dragTargetIndex,
	groupBounds,
	moveItem,
	offsetBetween,
} from "./reorderable-list-helpers";

const groups = ["Morning", "Morning", "Evening", "Training", "Training"];
const heights = [60, 60, 60, 60, 60];

describe("groupBounds", () => {
	it("spans the run of same-group items around an index", () => {
		expect(groupBounds(groups, 0)).toEqual([0, 1]);
		expect(groupBounds(groups, 1)).toEqual([0, 1]);
		expect(groupBounds(groups, 2)).toEqual([2, 2]);
		expect(groupBounds(groups, 4)).toEqual([3, 4]);
	});
});

describe("dragTargetIndex", () => {
	it("stays put until more than half a neighbour is covered", () => {
		expect(dragTargetIndex(3, 30, heights, [3, 4])).toBe(3);
		expect(dragTargetIndex(3, 31, heights, [3, 4])).toBe(4);
	});

	it("moves up past neighbours", () => {
		expect(dragTargetIndex(1, -31, heights, [0, 1])).toBe(0);
	});

	it("never leaves the row's own group", () => {
		expect(dragTargetIndex(1, 500, heights, [0, 1])).toBe(1);
		expect(dragTargetIndex(3, -500, heights, [3, 4])).toBe(3);
	});

	it("respects uneven row heights", () => {
		expect(dragTargetIndex(0, 70, [60, 100, 60], [0, 2])).toBe(1);
		expect(dragTargetIndex(0, 40, [60, 100, 60], [0, 2])).toBe(0);
	});
});

describe("offsetBetween", () => {
	it("is the heights of the rows passed over, signed by direction", () => {
		expect(offsetBetween(0, 2, [60, 70, 80])).toBe(150);
		expect(offsetBetween(2, 0, [60, 70, 80])).toBe(-130);
		expect(offsetBetween(1, 1, [60, 70, 80])).toBe(0);
	});
});

describe("moveItem", () => {
	it("moves one item without mutating the input", () => {
		const items = ["a", "b", "c"];
		expect(moveItem(items, 0, 2)).toEqual(["b", "c", "a"]);
		expect(moveItem(items, 2, 0)).toEqual(["c", "a", "b"]);
		expect(items).toEqual(["a", "b", "c"]);
	});
});
