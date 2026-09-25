import { makeHabit } from "../test-support/habit-builder";
import { computeProgress, groupHabitsByCategory } from "./today-screen-helpers";

describe("groupHabitsByCategory", () => {
	it("groups habits under the category they share", () => {
		const morningHabit = makeHabit({ id: 1, category: "Morning" });
		const anotherMorningHabit = makeHabit({ id: 2, category: "Morning" });

		const groups = groupHabitsByCategory([morningHabit, anotherMorningHabit]);

		expect(groups).toEqual([
			{ category: "Morning", habits: [morningHabit, anotherMorningHabit] },
		]);
	});

	it("orders groups by first-appearance in the given (creation-ordered) list", () => {
		const evening = makeHabit({ id: 1, category: "Evening" });
		const morning = makeHabit({ id: 2, category: "Morning" });
		const secondEvening = makeHabit({ id: 3, category: "Evening" });

		const groups = groupHabitsByCategory([evening, morning, secondEvening]);

		expect(groups.map((group) => group.category)).toEqual([
			"Evening",
			"Morning",
		]);
	});

	it("puts no-category habits under Anytime, last, regardless of creation order", () => {
		const noCategory = makeHabit({ id: 1, category: null });
		const morning = makeHabit({ id: 2, category: "Morning" });

		const groups = groupHabitsByCategory([noCategory, morning]);

		expect(groups.map((group) => group.category)).toEqual([
			"Morning",
			"Anytime",
		]);
	});

	it("returns an empty array for no habits", () => {
		expect(groupHabitsByCategory([])).toEqual([]);
	});
});

describe("computeProgress", () => {
	it("counts completed habits among those due", () => {
		const habits = [
			makeHabit({ id: 1 }),
			makeHabit({ id: 2 }),
			makeHabit({ id: 3 }),
		];
		const progress = computeProgress(habits, new Set([1, 3]));

		expect(progress).toEqual({ completed: 2, total: 3, fraction: 2 / 3 });
	});

	it("returns a 0 fraction, not NaN, when nothing is due", () => {
		expect(computeProgress([], new Set())).toEqual({
			completed: 0,
			total: 0,
			fraction: 0,
		});
	});
});
