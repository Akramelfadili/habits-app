import { findDuplicateHabit } from "./habit-name-rules";

const habits = [
	{ id: 1, name: "Read 20 min" },
	{ id: 2, name: "Meditate" },
];

describe("findDuplicateHabit", () => {
	it("finds a habit with the same name, ignoring case and surrounding spaces", () => {
		expect(findDuplicateHabit(habits, "  read 20 MIN ")?.id).toBe(1);
	});

	it("finds nothing for a new name or an empty one", () => {
		expect(findDuplicateHabit(habits, "Read 30 min")).toBeUndefined();
		expect(findDuplicateHabit(habits, "   ")).toBeUndefined();
	});

	it("lets an edit keep its own name", () => {
		expect(findDuplicateHabit(habits, "Meditate", 2)).toBeUndefined();
		expect(findDuplicateHabit(habits, "Meditate", 1)?.id).toBe(2);
	});
});
